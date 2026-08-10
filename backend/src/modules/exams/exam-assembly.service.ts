import { BadRequestException, Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { In, Repository } from "typeorm"
import { BankQuestion } from "../../entities/bank-question.entity"
import { ExamAttempt } from "../../entities/exam-attempt.entity"
import { ExamPaper } from "../../entities/exam-paper.entity"
import { LicenseExamStructure } from "../../entities/license-exam-structure.entity"
import { LicenseQuestionPool } from "../../entities/license-question-pool.entity"
import { Question } from "../../entities/question.entity"

/**
 * Assembles a random exam paper following the official per-chapter quota
 * (VB 2262/CSGT-P5). The CRITICAL slot is drawn from điểm-liệt questions;
 * each chapter slot is drawn from non-critical questions of that category so
 * no question is selected twice. The result is persisted as a generated
 * exam_papers row + questions rows, reusing the existing submit/score flow.
 */
@Injectable()
export class ExamAssemblyService {
  constructor(
    @InjectRepository(BankQuestion)
    private readonly bankRepo: Repository<BankQuestion>,
    @InjectRepository(LicenseQuestionPool)
    private readonly poolRepo: Repository<LicenseQuestionPool>,
    @InjectRepository(LicenseExamStructure)
    private readonly structureRepo: Repository<LicenseExamStructure>,
    @InjectRepository(ExamPaper)
    private readonly papersRepo: Repository<ExamPaper>,
    @InjectRepository(Question)
    private readonly questionsRepo: Repository<Question>,
    @InjectRepository(ExamAttempt)
    private readonly attemptsRepo: Repository<ExamAttempt>,
  ) {}

  private pick<T>(items: T[], n: number): T[] {
    if (n <= 0) return []
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy.slice(0, n)
  }

  private pickPrioritizingMistakes(items: BankQuestion[], n: number, wrongBodies: Set<string>): BankQuestion[] {
    if (n <= 0) return []
    const pool = [...items]
    const selected: BankQuestion[] = []
    while (selected.length < n && pool.length > 0) {
      const totalWeight = pool.reduce((sum, question) => sum + (wrongBodies.has(question.body) ? 4 : 1), 0)
      let cursor = Math.random() * totalWeight
      let index = pool.length - 1
      for (let i = 0; i < pool.length; i += 1) {
        cursor -= wrongBodies.has(pool[i].body) ? 4 : 1
        if (cursor <= 0) {
          index = i
          break
        }
      }
      selected.push(pool[index])
      pool.splice(index, 1)
    }
    return selected
  }

  private async getWrongQuestionBodies(userId: string): Promise<Set<string>> {
    const attempts = await this.attemptsRepo.find({
      where: { userId },
      order: { finishedAt: "DESC" },
      take: 20,
    })
    const wrongBodies = new Set<string>()
    for (const attempt of attempts) {
      const review = (attempt.answers as { review?: Array<{ body?: string; isCorrect?: boolean }> } | null)?.review
      if (!Array.isArray(review)) continue
      for (const item of review) {
        if (!item.isCorrect && item.body) wrongBodies.add(item.body)
      }
    }
    return wrongBodies
  }

  /** Build and persist a random paper for the class. Returns the new paper id. */
  async generate(licenseClass: string, userId: string): Promise<string> {
    const poolRows = await this.poolRepo.find({ where: { licenseClass } })
    if (poolRows.length === 0) {
      throw new BadRequestException(
        `Chưa có ngân hàng câu hỏi cho hạng ${licenseClass}. Hãy chạy seed:bank.`,
      )
    }
    const structure = await this.structureRepo.find({
      where: { licenseClass },
      order: { sortOrder: "ASC" },
    })
    if (structure.length === 0) {
      throw new BadRequestException(
        `Chưa cấu hình cấu trúc đề cho hạng ${licenseClass} (license_exam_structure).`,
      )
    }

    const numbers = poolRows.map((p) => p.bankNumber)
    const bank = await this.bankRepo.find({ where: { bankNumber: In(numbers) } })

    const criticalPool = bank.filter((q) => q.isCritical)
    const wrongBodies = await this.getWrongQuestionBodies(userId)
    const byCategory = new Map<string, BankQuestion[]>()
    for (const q of bank) {
      if (q.isCritical) continue // chapter slots draw from non-critical only
      const list = byCategory.get(q.category) ?? []
      list.push(q)
      byCategory.set(q.category, list)
    }

    const selected: BankQuestion[] = []
    for (const slot of structure) {
      if (slot.quota <= 0) continue
      const source = slot.slotType === "CRITICAL" ? criticalPool : byCategory.get(slot.slotType) ?? []
      const drawn = this.pickPrioritizingMistakes(source, slot.quota, wrongBodies)
      if (drawn.length < slot.quota) {
        throw new BadRequestException(
          `Không đủ câu hỏi cho nhóm ${slot.slotType} của hạng ${licenseClass} ` +
            `(cần ${slot.quota}, có ${source.length}).`,
        )
      }
      selected.push(...drawn)
    }

    const shuffled = this.pick(selected, selected.length)

    const paper = await this.papersRepo.save(
      this.papersRepo.create({
        licenseClass,
        paperNumber: 0,
        questionCount: shuffled.length,
        isMock: true,
        isGenerated: true,
      }),
    )

    await this.questionsRepo.insert(
      shuffled.map((q) => ({
        paperId: paper.id,
        body: q.body,
        imageUrl: q.imageUrl ?? null,
        answers: q.answers,
        correctIndex: q.correctIndex,
        isCritical: q.isCritical,
      })),
    )

    return paper.id
  }
}
