import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { classHasNoExpiry, displayLicenseClass } from "../../common/license-class"
import { StudentLicense } from "../../entities/student-license.entity"
import { StudentProfile } from "../../entities/student-profile.entity"
import { User } from "../../entities/user.entity"
import { NotificationsService } from "../notifications/notifications.service"

type LicenseInput = {
  licenseNumber?: string | null
  licenseClass?: string
  regulationVersion?: string
  issuedAt?: string | null
  expiresAt?: string | null
  issuingAuthority?: string | null
}

@Injectable()
export class LicensesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LicensesService.name)
  private reminderTimer?: ReturnType<typeof setInterval>
  constructor(
    @InjectRepository(StudentLicense) private readonly repo: Repository<StudentLicense>,
    @InjectRepository(StudentProfile) private readonly profiles: Repository<StudentProfile>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    const run = () => this.runReminders().catch((error) => this.logger.error("License reminder scan failed", error))
    void run()
    this.reminderTimer = setInterval(run, 6 * 60 * 60 * 1000)
    this.reminderTimer.unref?.()
  }

  onModuleDestroy() {
    if (this.reminderTimer) clearInterval(this.reminderTimer)
  }

  private normalize(input: LicenseInput) {
    const licenseClass = displayLicenseClass(input.licenseClass)
    if (!["A1", "A", "B1", "B", "C", "D", "E", "F"].includes(licenseClass)) {
      throw new BadRequestException("Hạng GPLX không hợp lệ")
    }
    const regulationVersion = input.regulationVersion === "legacy" ? "legacy" : "from_2025"
    let expiresAt = input.expiresAt || null
    if (regulationVersion === "from_2025" && classHasNoExpiry(licenseClass)) expiresAt = null
    if (regulationVersion === "from_2025" && !expiresAt && input.issuedAt) {
      const issued = new Date(`${input.issuedAt}T00:00:00Z`)
      const validityYears = licenseClass === "B" ? 10 : 5
      issued.setUTCFullYear(issued.getUTCFullYear() + validityYears)
      expiresAt = issued.toISOString().slice(0, 10)
    }
    if (regulationVersion === "legacy" && !expiresAt) {
      throw new BadRequestException("GPLX cấp trước 01/01/2025 cần nhập hạn sử dụng in trên giấy phép")
    }
    return {
      licenseNumber: input.licenseNumber?.trim() || null,
      licenseClass,
      regulationVersion,
      legacyClassCode: input.licenseClass === "A2" || input.licenseClass === "B2" ? input.licenseClass : null,
      issuedAt: input.issuedAt || null,
      expiresAt,
      issuingAuthority: input.issuingAuthority?.trim() || null,
    }
  }

  async listMine(userId: string) {
    await this.runReminders(userId)
    return this.repo.find({ where: { userId }, order: { createdAt: "DESC" } })
  }

  async createMine(userId: string, input: LicenseInput) {
    const profile = await this.profiles.findOne({ where: { userId } })
    const row = this.repo.create({
      userId,
      centerId: profile?.centerId ?? null,
      ...this.normalize(input),
      verificationStatus: "pending",
      verificationSource: "manual",
    })
    return this.repo.save(row)
  }

  async updateMine(userId: string, id: string, input: LicenseInput) {
    const row = await this.repo.findOne({ where: { id, userId } })
    if (!row) throw new NotFoundException("Không tìm thấy GPLX")
    Object.assign(row, this.normalize({ ...row, ...input }))
    row.verificationStatus = "pending"
    row.verifiedAt = null
    row.verifiedBy = null
    return this.repo.save(row)
  }

  async listAdmin(centerId: string | null, query?: string) {
    await this.runReminders(undefined, centerId)
    const qb = this.repo
      .createQueryBuilder("l")
      .innerJoin(User, "u", "u.id = l.user_id")
      .leftJoin(StudentProfile, "p", "p.user_id = l.user_id")
      .select(["l", "u.email AS student_email", "p.full_name AS student_name"])
      .orderBy("l.expires_at", "ASC", "NULLS LAST")
    if (centerId) qb.andWhere("l.center_id = :centerId", { centerId })
    if (query?.trim()) {
      qb.andWhere("(u.email ILIKE :q OR p.full_name ILIKE :q OR l.license_number ILIKE :q)", { q: `%${query.trim()}%` })
    }
    const { entities, raw } = await qb.getRawAndEntities()
    return entities.map((row, index) => ({
      ...row,
      studentEmail: raw[index]?.student_email,
      studentName: raw[index]?.student_name,
      expiryState: this.expiryState(row.expiresAt),
    }))
  }

  async review(adminId: string, centerId: string | null, id: string, input: { status?: string; adminNote?: string }) {
    const row = await this.repo.findOne({ where: { id } })
    if (!row || (centerId && row.centerId !== centerId)) throw new NotFoundException("Không tìm thấy GPLX")
    if (!["verified", "rejected", "pending"].includes(input.status ?? "")) {
      throw new BadRequestException("Trạng thái xác minh không hợp lệ")
    }
    row.verificationStatus = input.status!
    row.adminNote = input.adminNote?.trim() || null
    row.verifiedAt = input.status === "verified" ? new Date() : null
    row.verifiedBy = input.status === "verified" ? adminId : null
    await this.repo.save(row)
    await this.notifications.createForUser(row.userId, {
      type: "license_verification",
      title: input.status === "verified" ? "GPLX đã được xác minh" : "GPLX cần cập nhật",
      body: input.adminNote || (input.status === "verified" ? "Thông tin GPLX của bạn đã được trung tâm xác nhận." : "Vui lòng kiểm tra và cập nhật lại thông tin GPLX."),
      actionUrl: "/profile",
    })
    return row
  }

  private expiryState(expiresAt?: string | null) {
    if (!expiresAt) return { stage: "no_expiry", days: null }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const days = Math.ceil((new Date(`${expiresAt}T00:00:00`).getTime() - today.getTime()) / 86400000)
    const stage = days < 0 ? "expired" : days <= 7 ? "7_days" : days <= 30 ? "30_days" : days <= 90 ? "90_days" : "valid"
    return { stage, days }
  }

  async runReminders(userId?: string, centerId?: string | null) {
    const qb = this.repo.createQueryBuilder("l").where("l.expires_at IS NOT NULL")
    if (userId) qb.andWhere("l.user_id = :userId", { userId })
    if (centerId) qb.andWhere("l.center_id = :centerId", { centerId })
    const rows = await qb.getMany()
    let created = 0
    for (const row of rows) {
      const state = this.expiryState(row.expiresAt)
      if (!["90_days", "30_days", "7_days", "expired"].includes(state.stage) || row.lastNotifiedStage === state.stage) continue
      const title = state.stage === "expired" ? `GPLX hạng ${row.licenseClass} đã hết hạn` : `GPLX hạng ${row.licenseClass} sắp hết hạn`
      const body = state.stage === "expired"
        ? `GPLX đã hết hạn. Hãy liên hệ trung tâm để được hướng dẫn học lại hoặc cấp đổi.`
        : `GPLX còn ${state.days} ngày. Hãy chủ động liên hệ trung tâm để lên lịch xử lý.`
      await this.notifications.createForUser(row.userId, { type: "license_expiry", title, body, actionUrl: "/profile" })
      const profile = await this.profiles.findOne({ where: { userId: row.userId } })
      const adminsQb = this.users
        .createQueryBuilder("u")
        .where("u.role = :systemRole", { systemRole: "system_admin" })
      if (row.centerId) {
        adminsQb.orWhere("(u.role = :centerRole AND u.center_id = :centerId)", {
          centerRole: "center_admin",
          centerId: row.centerId,
        })
      }
      const admins = await adminsQb.getMany()
      for (const admin of admins) {
        await this.notifications.createForUser(admin.id, {
          type: "license_expiry_admin",
          title,
          body: `${profile?.fullName || "Học viên"}: ${body}`,
          actionUrl: "/admin/licenses",
        })
      }
      row.lastNotifiedStage = state.stage
      await this.repo.save(row)
      created++
    }
    return { scanned: rows.length, created }
  }
}
