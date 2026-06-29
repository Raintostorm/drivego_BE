import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { In, Repository } from "typeorm"
import { ExamRulesService } from "../../common/exam-rules.service"
import {
  DEFAULT_LICENSE_CLASS,
  LICENSE_LABELS,
  STUDY_LICENSE_CODES,
} from "../../common/license-class.constants"
import { ExamPaper } from "../../entities/exam-paper.entity"
import { LicenseClass } from "../../entities/license-class.entity"
import { ScheduleSlot } from "../../entities/schedule-slot.entity"
import { StudyChapter } from "../../entities/study-chapter.entity"

@Injectable()
export class LicenseClassesService {
  constructor(
    private readonly examRules: ExamRulesService,
    @InjectRepository(LicenseClass)
    private readonly licenseRepo: Repository<LicenseClass>,
    @InjectRepository(StudyChapter)
    private readonly chaptersRepo: Repository<StudyChapter>,
    @InjectRepository(ExamPaper)
    private readonly papersRepo: Repository<ExamPaper>,
    @InjectRepository(ScheduleSlot)
    private readonly slotsRepo: Repository<ScheduleSlot>,
  ) {}

  async listCatalog() {
    const licenses = await this.licenseRepo.find({
      where: { code: In([...STUDY_LICENSE_CODES]) },
      order: { code: "ASC" },
    })

    const chapterCounts = await this.chaptersRepo
      .createQueryBuilder("c")
      .select("c.license_class_id", "licenseClassId")
      .addSelect("COUNT(*)::int", "count")
      .where("c.video_url IS NOT NULL AND c.video_url <> ''")
      .groupBy("c.license_class_id")
      .getRawMany<{ licenseClassId: string; count: string }>()

    const chapterCountByLicenseId = new Map(
      chapterCounts.map((r) => [r.licenseClassId, Number(r.count)]),
    )

    const paperCounts = await this.papersRepo
      .createQueryBuilder("p")
      .select("p.license_class", "code")
      .addSelect("COUNT(*)::int", "count")
      .where("p.license_class IN (:...codes)", { codes: [...STUDY_LICENSE_CODES] })
      .groupBy("p.license_class")
      .getRawMany<{ code: string; count: string }>()

    const paperCountByCode = new Map(paperCounts.map((r) => [r.code, Number(r.count)]))

    const slotCounts = await this.slotsRepo
      .createQueryBuilder("s")
      .select("s.license_class", "code")
      .addSelect("COUNT(*)::int", "count")
      .where("s.license_class IN (:...codes)", { codes: [...STUDY_LICENSE_CODES] })
      .groupBy("s.license_class")
      .getRawMany<{ code: string; count: string }>()

    const slotCountByCode = new Map(slotCounts.map((r) => [r.code, Number(r.count)]))

    const formatPrice = (value: string | number | null | undefined) => {
      const n = Number(value ?? 0)
      return `${n.toLocaleString("vi-VN")}đ`
    }
    const fallbackFees: Record<string, number> = {
      A1: 755000,
      A2: 1800000,
      B1: 12000000,
      B2: 15000000,
    }

    const byCode = new Map(licenses.map((l) => [l.code, l]))

    return STUDY_LICENSE_CODES.map((code) => {
      const row = byCode.get(code)
      const chapterCount = row ? (chapterCountByLicenseId.get(row.id) ?? 0) : 0
      const examCount = paperCountByCode.get(code) ?? 0
      const scheduleCount = slotCountByCode.get(code) ?? 0
      const contentReady = chapterCount > 0 && examCount > 0

      return {
        code,
        label: LICENSE_LABELS[code] ?? code,
        description: row?.description ?? null,
        price: formatPrice(row?.price),
        priceRaw: Number(row?.price ?? 0),
        enrollmentFee: formatPrice(row?.enrollmentFee ?? fallbackFees[code] ?? 0),
        enrollmentFeeRaw: Number(row?.enrollmentFee ?? fallbackFees[code] ?? 0),
        contentStatus: contentReady ? "ready" : "coming_soon",
        contentReady,
        hasStudyChapters: chapterCount > 0,
        hasExamPapers: examCount > 0,
        hasScheduleSlots: scheduleCount > 0,
        featured: code === DEFAULT_LICENSE_CLASS,
        examRules: row ? this.examRules.toCatalogPayload(row) : null,
      }
    })
  }
}
