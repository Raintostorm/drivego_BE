import { BadRequestException, Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { In, Repository } from "typeorm"
import { BankQuestion } from "../../entities/bank-question.entity"
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

  /** Build and persist a random paper for the class. Returns the new paper id. */
  async generate(licenseClass: string): Promise<string> {
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
      const drawn = this.pick(source, slot.quota)
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
