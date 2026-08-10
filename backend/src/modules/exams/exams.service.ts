import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"
import {
  DEFAULT_LICENSE_CLASS,
  isStudyLicenseCode,
} from "../../common/license-class.constants"
import { InjectRepository } from "@nestjs/typeorm"
import { IsNull, Not, Repository } from "typeorm"
import { EnrollmentService } from "../../common/enrollment.service"
import { ExamRulesService } from "../../common/exam-rules.service"
import { PremiumService } from "../../common/premium.service"
import { ExamAttempt } from "../../entities/exam-attempt.entity"
import { ExamPaper } from "../../entities/exam-paper.entity"
import { LicenseQuestionPool } from "../../entities/license-question-pool.entity"
import { Question } from "../../entities/question.entity"
import { ExamAssemblyService } from "./exam-assembly.service"
import { SubmitAttemptDto } from "./dto/submit-attempt.dto"

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(ExamPaper)
    private readonly papersRepo: Repository<ExamPaper>,
    @InjectRepository(Question)
    private readonly questionsRepo: Repository<Question>,
    @InjectRepository(ExamAttempt)
    private readonly attemptsRepo: Repository<ExamAttempt>,
    @InjectRepository(LicenseQuestionPool)
    private readonly poolRepo: Repository<LicenseQuestionPool>,
    private readonly premium: PremiumService,
    private readonly enrollment: EnrollmentService,
    private readonly examRules: ExamRulesService,
    private readonly assembly: ExamAssemblyService,
  ) {}

  /** Generate a random exam paper (official quota) and return it ready to take. */
  async generateRandomPaper(userId: string, licenseClass?: string) {
    const code = licenseClass && isStudyLicenseCode(licenseClass) ? licenseClass : DEFAULT_LICENSE_CLASS
    await this.enrollment.assertEnrolled(userId, code)
    if (!(await this.premium.isPremium(userId))) {
      throw new ForbiddenException("Đề thi ngẫu nhiên chỉ dành cho tài khoản Premium.")
    }
    const paperId = await this.assembly.generate(code, userId)
    return this.getPaper(paperId, userId)
  }

  async listPapers(userId: string, licenseClass?: string) {
    const code = licenseClass && isStudyLicenseCode(licenseClass) ? licenseClass : DEFAULT_LICENSE_CLASS
    await this.enrollment.assertEnrolled(userId, code)

    const papers = await this.papersRepo.find({
      where: { licenseClass: code, isGenerated: false },
      order: { paperNumber: "ASC" },
    })
    const randomPoolCount = await this.poolRepo.count({ where: { licenseClass: code } })
    const isPremium = await this.premium.isPremium(userId)

    const rules = await this.examRules.getRules(code)

    const mapped = papers.map((paper) => ({
      id: paper.id,
      licenseClass: paper.licenseClass,
      paperNumber: paper.paperNumber,
      questionCount: paper.questionCount,
      isMock: paper.isMock,
      title: `Đề thi số ${String(paper.paperNumber).padStart(2, "0")}`,
    }))

    return {
      licenseClass: code,
      contentReady: mapped.length > 0 || (isPremium && randomPoolCount > 0),
      randomReady: isPremium && randomPoolCount > 0,
      fixedReady: mapped.length > 0,
      examRules: rules,
      papers: mapped,
      fixedPapers: mapped,
      randomExam: {
        available: isPremium && randomPoolCount > 0,
        premiumRequired: !isPremium,
        title: "Đề thi ngẫu nhiên",
      },
    }
  }

  async getPaper(paperId: string, userId: string) {
    const paper = await this.papersRepo.findOne({ where: { id: paperId } })
    if (!paper) {
      throw new NotFoundException("Không tìm thấy đề thi")
    }

    await this.enrollment.assertEnrolled(userId, paper.licenseClass)

    const questions = await this.questionsRepo.find({
      where: { paperId },
      order: { id: "ASC" },
    })

    const rules = await this.examRules.getRules(paper.licenseClass)

    return {
      id: paper.id,
      licenseClass: paper.licenseClass,
      paperNumber: paper.paperNumber,
      questionCount: paper.questionCount,
      isMock: paper.isMock,
      title: paper.isGenerated
        ? "Đề thi ngẫu nhiên"
        : `Đề thi số ${String(paper.paperNumber).padStart(2, "0")}`,
      examRules: rules,
      questions: questions.map((q, index) => ({
        id: q.id,
        index: index + 1,
        body: q.body,
        imageUrl: q.imageUrl,
        answers: q.answers,
        isCritical: q.isCritical,
      })),
    }
  }

  async submitAttempt(userId: string, paperId: string, dto: SubmitAttemptDto) {
    const paper = await this.papersRepo.findOne({ where: { id: paperId } })
    if (!paper) {
      throw new NotFoundException("Không tìm thấy đề thi")
    }

    await this.enrollment.assertEnrolled(userId, paper.licenseClass)

    const questions = await this.questionsRepo.find({
      where: { paperId },
      order: { id: "ASC" },
    })
    if (questions.length === 0) {
      throw new NotFoundException("Đề thi chưa có câu hỏi")
    }

    const answeredCount = questions.filter(
      (q) => typeof dto.answers[q.id] === "number",
    ).length
    if (answeredCount < questions.length) {
      throw new BadRequestException(
        `Vui lòng trả lời đủ ${questions.length} câu trước khi nộp bài (đã trả lời ${answeredCount}).`,
      )
    }

    const rules = await this.examRules.getRules(paper.licenseClass)

    if (!dto.startedAt?.trim()) {
      throw new BadRequestException("Thiếu thời gian bắt đầu bài thi (startedAt)")
    }
    const startedAt = new Date(dto.startedAt)
    if (Number.isNaN(startedAt.getTime())) {
      throw new BadRequestException("startedAt không hợp lệ")
    }
    const finishedAt = new Date()
    const elapsedMs = finishedAt.getTime() - startedAt.getTime()
    const maxMs = rules.durationMinutes * 60 * 1000
    const graceMs = 5_000
    if (elapsedMs < 0) {
      throw new BadRequestException("startedAt không hợp lệ")
    }
    if (elapsedMs > maxMs + graceMs) {
      throw new BadRequestException(
        `Hết thời gian làm bài (${rules.durationMinutes} phút). Vui lòng làm đề mới.`,
      )
    }

    let correct = 0
    let wrong = 0
    let failedCritical = false
    const detail: Record<string, { selected: number; correct: number; isCorrect: boolean }> = {}
    // Self-contained snapshot so the attempt can be reviewed later even after a
    // generated paper's question rows are deleted below.
    const review: Array<{
      index: number
      body: string
      imageUrl: string | null
      isCritical: boolean
      answers: string[]
      correctIndex: number
      selected: number
      isCorrect: boolean
    }> = []

    questions.forEach((question, i) => {
      const selected = dto.answers[question.id]
      if (typeof selected !== "number" || !Number.isInteger(selected)) {
        throw new BadRequestException(
          `Câu hỏi chưa có đáp án hợp lệ (id: ${question.id})`,
        )
      }
      const choices = Array.isArray(question.answers) ? question.answers.length : 0
      if (choices === 0 || selected < 0 || selected >= choices) {
        throw new BadRequestException(`Đáp án không hợp lệ cho câu hỏi ${question.id}`)
      }
      const isCorrect = selected === question.correctIndex

      detail[question.id] = {
        selected: selected ?? -1,
        correct: question.correctIndex,
        isCorrect,
      }
      review.push({
        index: i + 1,
        body: question.body,
        imageUrl: question.imageUrl ?? null,
        isCritical: question.isCritical,
        answers: Array.isArray(question.answers) ? question.answers : [],
        correctIndex: question.correctIndex,
        selected,
        isCorrect,
      })
      if (isCorrect) {
        correct += 1
      } else {
        wrong += 1
        if (question.isCritical) {
          failedCritical = true
        }
      }
    })

    const total = questions.length
    const passThreshold = rules.passMinCorrect
    const passed = !failedCritical && correct >= passThreshold

    if (paper.questionCount !== total) {
      paper.questionCount = total
      await this.papersRepo.save(paper)
    }

    const attempt = this.attemptsRepo.create({
      userId,
      paperId,
      startedAt,
      finishedAt,
      score: correct,
      passed,
      answers: { correct, wrong, detail, failedCritical, review },
    })
    await this.attemptsRepo.save(attempt)

    // Generated papers are single-use: drop their question rows to avoid
    // unbounded growth. The paper stub stays for history (questionCount kept).
    if (paper.isGenerated) {
      await this.questionsRepo.delete({ paperId })
    }

    return {
      attemptId: attempt.id,
      score: correct,
      total,
      correct,
      wrong,
      passed,
      passThreshold,
      failedCritical,
      durationSeconds: Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000),
    }
  }

  async getAttemptDetail(userId: string, attemptId: string) {
    if (!(await this.premium.isPremium(userId))) {
      const visibleAttempts = await this.attemptsRepo.find({
        where: { userId, finishedAt: Not(IsNull()) },
        select: { id: true },
        order: { finishedAt: "DESC" },
        take: 3,
      })
      if (!visibleAttempts.some((attempt) => attempt.id === attemptId)) {
        throw new ForbiddenException("Tài khoản miễn phí chỉ xem lại 3 đề gần nhất.")
      }
    }
    const attempt = await this.attemptsRepo.findOne({
      where: { id: attemptId },
      relations: { paper: true },
    })
    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException("Không tìm thấy bài thi")
    }

    const data = (attempt.answers ?? {}) as {
      correct?: number
      wrong?: number
      failedCritical?: boolean
      review?: Array<{
        index: number
        body: string
        imageUrl: string | null
        isCritical: boolean
        answers: string[]
        correctIndex: number
        selected: number
        isCorrect: boolean
      }>
    }
    const review = Array.isArray(data.review) ? data.review : []
    const total = review.length || attempt.paper?.questionCount || attempt.score || 0
    const rules = await this.examRules.getRules(attempt.paper?.licenseClass)
    const finished = attempt.finishedAt ?? attempt.startedAt
    const durationSeconds = Math.max(
      0,
      Math.round((finished.getTime() - attempt.startedAt.getTime()) / 1000),
    )

    return {
      id: attempt.id,
      date: finished.toISOString(),
      licenseClass: attempt.paper?.licenseClass ?? null,
      title: attempt.paper
        ? attempt.paper.isGenerated
          ? "Đề thi ngẫu nhiên"
          : `Đề thi số ${String(attempt.paper.paperNumber).padStart(2, "0")}`
        : "Đề thi",
      score: attempt.score ?? data.correct ?? 0,
      total,
      passThreshold: rules.passMinCorrect,
      passed: Boolean(attempt.passed),
      failedCritical: Boolean(data.failedCritical),
      durationSeconds,
      hasReview: review.length > 0,
      questions: review,
    }
  }

  async getHistory(userId: string) {
    const isPremium = await this.premium.isPremium(userId)
    const totalAvailable = await this.attemptsRepo.count({
      where: { userId, finishedAt: Not(IsNull()) },
    })
    const attempts = await this.attemptsRepo.find({
      where: { userId, finishedAt: Not(IsNull()) },
      relations: { paper: true },
      order: { finishedAt: "DESC" },
      ...(isPremium ? {} : { take: 3 }),
    })

    const rows = await Promise.all(
      attempts.map(async (attempt) => {
        const questionTotal = attempt.paperId
          ? await this.questionsRepo.count({ where: { paperId: attempt.paperId } })
          : 0
        const total =
          questionTotal > 0
            ? questionTotal
            : (attempt.paper?.questionCount ?? attempt.score ?? 0)
        const finished = attempt.finishedAt ?? attempt.startedAt
        const durationMs = finished.getTime() - attempt.startedAt.getTime()
        const minutes = Math.floor(durationMs / 60000)
        const seconds = Math.floor((durationMs % 60000) / 1000)

        return {
          id: attempt.id,
          date: finished.toISOString(),
          exam: attempt.paper
            ? attempt.paper.isGenerated
              ? "Đề thi ngẫu nhiên"
              : `Đề thi số ${String(attempt.paper.paperNumber).padStart(2, "0")}`
            : "Đề thi",
          rank: attempt.paper?.licenseClass ?? "B2",
          score: `${attempt.score ?? 0}/${total}`,
          pass: Boolean(attempt.passed),
          time: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
        }
      }),
    )

    const totalExams = rows.length
    const passCount = rows.filter((r) => r.pass).length
    const passRate = totalExams ? Math.round((passCount / totalExams) * 100) : 0
    const bestScore = rows.reduce(
      (best, row) => {
        const [got, of] = row.score.split("/").map(Number)
        const pct = of ? got / of : 0
        return pct > best.pct ? { text: row.score, pct } : best
      },
      { text: "0/0", pct: 0 },
    )

    return {
      stats: {
        totalExams,
        passRate: `${passRate}%`,
        bestScore: bestScore.text,
      },
      rows,
      isPremium,
      historyLimit: isPremium ? null : 3,
      totalAvailable,
      hasMore: !isPremium && totalAvailable > rows.length,
    }
  }
}
