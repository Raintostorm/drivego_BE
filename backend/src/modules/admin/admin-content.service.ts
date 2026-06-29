import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { LicenseClass } from "../../entities/license-class.entity"
import { StudyChapter } from "../../entities/study-chapter.entity"
import { SubscriptionPlan } from "../../entities/subscription-plan.entity"
import { SiteContentService } from "../site-content/site-content.service"

@Injectable()
export class AdminContentService {
  constructor(
    @InjectRepository(StudyChapter)
    private readonly chaptersRepo: Repository<StudyChapter>,
    @InjectRepository(LicenseClass)
    private readonly classesRepo: Repository<LicenseClass>,
    @InjectRepository(SubscriptionPlan)
    private readonly plansRepo: Repository<SubscriptionPlan>,
    private readonly siteContentService: SiteContentService,
  ) {}

  async listLicenseClasses() {
    return this.classesRepo.find({ order: { code: "ASC" } })
  }

  async listPricing() {
    const [licenseClasses, subscriptionPlans] = await Promise.all([
      this.classesRepo.find({ order: { code: "ASC" } }),
      this.plansRepo.find({ order: { priceMonthly: "ASC" } }),
    ])

    return { licenseClasses, subscriptionPlans }
  }

  async listChapters(licenseClassCode: string) {
    const lc = await this.classesRepo.findOne({ where: { code: licenseClassCode } })
    if (!lc) throw new NotFoundException("Không tìm thấy hạng")
    return this.chaptersRepo.find({
      where: { licenseClassId: lc.id },
      order: { sortOrder: "ASC" },
    })
  }

  async patchChapter(
    chapterId: string,
    dto: Partial<{
      title: string
      videoUrl: string
      description: string
      sortOrder: number
      durationMinutes: number
      isPublished: boolean
    }>,
  ) {
    const ch = await this.chaptersRepo.findOne({ where: { id: chapterId } })
    if (!ch) throw new NotFoundException("Không tìm thấy chương")
    if (dto.title !== undefined) ch.title = dto.title
    if (dto.videoUrl !== undefined) ch.videoUrl = dto.videoUrl
    if (dto.description !== undefined) ch.description = dto.description
    if (dto.sortOrder !== undefined) ch.sortOrder = dto.sortOrder
    if (dto.durationMinutes !== undefined) ch.durationMinutes = dto.durationMinutes
    if (dto.isPublished !== undefined) ch.isPublished = dto.isPublished
    await this.chaptersRepo.save(ch)
    return ch
  }

  async getHomeSiteContent() {
    return this.siteContentService.getHomeContent()
  }

  async patchHomeSiteContent(value: unknown) {
    return this.siteContentService.updateHomeContent(value)
  }
}
