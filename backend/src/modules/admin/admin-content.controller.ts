import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common"
import { Roles } from "../../common/decorators/roles.decorator"
import { RolesGuard } from "../../common/guards/roles.guard"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { LicenseClass } from "../../entities/license-class.entity"
import { SubscriptionPlan } from "../../entities/subscription-plan.entity"
import { AdminContentService } from "./admin-content.service"

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminContentController {
  constructor(
    private readonly service: AdminContentService,
    @InjectRepository(LicenseClass)
    private readonly classesRepo: Repository<LicenseClass>,
    @InjectRepository(SubscriptionPlan)
    private readonly plansRepo: Repository<SubscriptionPlan>,
  ) {}

  @Get("license-classes/manage")
  @Roles("center_admin", "system_admin")
  listClasses() {
    return this.service.listLicenseClasses()
  }

  @Get("pricing/manage")
  @Roles("center_admin", "system_admin")
  pricing() {
    return this.service.listPricing()
  }

  @Patch("license-classes/:code")
  @Roles("system_admin")
  async patchClass(
    @Param("code") code: string,
    @Body() body: { price?: number; enrollmentFee?: number; description?: string },
  ) {
    const lc = await this.classesRepo.findOne({ where: { code } })
    if (!lc) return { error: "not found" }
    if (body.price !== undefined) lc.price = String(body.price)
    if (body.enrollmentFee !== undefined) lc.enrollmentFee = String(body.enrollmentFee)
    if (body.description !== undefined) lc.description = body.description
    await this.classesRepo.save(lc)
    return lc
  }

  @Patch("subscription-plans/:code")
  @Roles("system_admin")
  async patchSubscriptionPlan(
    @Param("code") code: string,
    @Body() body: { priceMonthly?: number; features?: string[] },
  ) {
    const plan = await this.plansRepo.findOne({ where: { code } })
    if (!plan) return { error: "not found" }
    if (body.priceMonthly !== undefined) plan.priceMonthly = String(body.priceMonthly)
    if (Array.isArray(body.features)) plan.features = body.features
    await this.plansRepo.save(plan)
    return plan
  }

  @Get("chapters/by-class/:code")
  @Roles("center_admin", "system_admin")
  chaptersByClass(@Param("code") code: string) {
    return this.service.listChapters(code)
  }

  @Patch("chapters/:id")
  @Roles("system_admin")
  patchChapter(
    @Param("id") id: string,
    @Body()
    body: {
      title?: string
      videoUrl?: string
      description?: string
      sortOrder?: number
      durationMinutes?: number
      isPublished?: boolean
    },
  ) {
    return this.service.patchChapter(id, body)
  }
}
