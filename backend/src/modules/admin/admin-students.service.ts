import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { fallbackEnrollmentFee } from "../../common/pricing.constants"
import { CourseEnrollment } from "../../entities/course-enrollment.entity"
import { ExamAttempt } from "../../entities/exam-attempt.entity"
import { LicenseApplication } from "../../entities/license-application.entity"
import { LicenseClass } from "../../entities/license-class.entity"
import { Payment } from "../../entities/payment.entity"
import { StudentProfile } from "../../entities/student-profile.entity"
import { User } from "../../entities/user.entity"
import { AuthUser } from "../auth/jwt.strategy"
import { AdminScopeService } from "./admin-scope.service"

@Injectable()
export class AdminStudentsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(StudentProfile)
    private readonly profilesRepo: Repository<StudentProfile>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentsRepo: Repository<CourseEnrollment>,
    @InjectRepository(ExamAttempt)
    private readonly attemptsRepo: Repository<ExamAttempt>,
    @InjectRepository(LicenseApplication)
    private readonly appsRepo: Repository<LicenseApplication>,
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(LicenseClass)
    private readonly licenseRepo: Repository<LicenseClass>,
    private readonly scope: AdminScopeService,
  ) {}

  private async centerFilter(admin: AuthUser) {
    const centerId = await this.scope.getCenterIdForAdmin(admin)
    return centerId
  }

  async list(
    admin: AuthUser,
    filters: { premium?: string; enrolled?: string; licenseClass?: string },
  ) {
    const centerId = await this.centerFilter(admin)
    const qb = this.usersRepo
      .createQueryBuilder("u")
      .innerJoin(StudentProfile, "p", "p.user_id = u.id")
      .where("u.role = :role", { role: "student" })
      .orderBy("u.email", "ASC")

    if (centerId) {
      qb.andWhere("p.center_id = :centerId", { centerId })
    }

    if (filters.premium === "true") {
      qb.andWhere("p.premium_until > NOW()")
    } else if (filters.premium === "false") {
      qb.andWhere("(p.premium_until IS NULL OR p.premium_until <= NOW())")
    }

    const users = await qb
      .select([
        "u.id AS id",
        "u.email AS email",
        "p.full_name AS full_name",
        "p.premium_until AS premium_until",
        "p.license_class AS license_class",
        "p.center_id AS center_id",
      ])
      .getRawMany<{
        id: string
        email: string
        full_name: string | null
        premium_until: Date | null
        license_class: string | null
        center_id: string | null
      }>()

    const userIds = users.map((u) => u.id)
    let enrollments: CourseEnrollment[] = []
    if (userIds.length > 0) {
      const eq = this.enrollmentsRepo
        .createQueryBuilder("e")
        .where("e.user_id IN (:...userIds)", { userIds })
        .andWhere("e.status = :status", { status: "active" })
      if (filters.licenseClass) {
        eq.andWhere("e.license_class = :licenseClass", {
          licenseClass: filters.licenseClass,
        })
      }
      enrollments = await eq.getMany()
    }

    const enrollmentsByUser = new Map<string, CourseEnrollment[]>()
    for (const e of enrollments) {
      const list = enrollmentsByUser.get(e.userId) ?? []
      list.push(e)
      enrollmentsByUser.set(e.userId, list)
    }

    let rows = users.map((u) => {
      const activeEnrollments = enrollmentsByUser.get(u.id) ?? []
      return {
        userId: u.id,
        email: u.email,
        fullName: u.full_name,
        licenseClass: u.license_class,
        centerId: u.center_id,
        premiumUntil: u.premium_until,
        isPremium: Boolean(u.premium_until && new Date(u.premium_until) > new Date()),
        enrollments: activeEnrollments.map((e) => ({
          licenseClass: e.licenseClass,
          enrolledAt: e.enrolledAt,
        })),
        isEnrolled: activeEnrollments.length > 0,
      }
    })

    if (filters.enrolled === "true") {
      rows = rows.filter((r) => r.isEnrolled)
    } else if (filters.enrolled === "false") {
      rows = rows.filter((r) => !r.isEnrolled)
    }

    return rows
  }

  async getOne(admin: AuthUser, userId: string) {
    const centerId = await this.centerFilter(admin)
    const profile = await this.profilesRepo.findOne({ where: { userId } })
    if (!profile) throw new NotFoundException("Không tìm thấy học viên")
    if (centerId && profile.centerId !== centerId) {
      throw new NotFoundException("Không tìm thấy học viên")
    }

    const user = await this.usersRepo.findOne({ where: { id: userId } })
    if (!user || user.role !== "student") {
      throw new NotFoundException("Không tìm thấy học viên")
    }

    const enrollments = await this.enrollmentsRepo.find({
      where: { userId },
      order: { enrolledAt: "DESC" },
    })

    const attempts = await this.attemptsRepo.find({
      where: { userId },
      order: { startedAt: "DESC" },
      take: 10,
    })

    const application = await this.appsRepo.findOne({
      where: { userId },
      order: { createdAt: "DESC" },
    })
    const payments = await this.paymentsRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: 20,
    })

    return {
      userId: user.id,
      email: user.email,
      fullName: profile.fullName,
      phone: profile.phone,
      licenseClass: profile.licenseClass,
      premiumUntil: profile.premiumUntil,
      adminNote: profile.adminNote,
      centerId: profile.centerId,
      enrollments,
      recentAttempts: attempts.map((a) => ({
        id: a.id,
        score: a.score,
        passed: a.passed,
        finishedAt: a.finishedAt,
        paperId: a.paperId,
      })),
      application: application
        ? {
            id: application.id,
            status: application.status,
            licenseClass: application.licenseClass,
            submittedAt: application.submittedAt,
            dossierRequestedAt: application.dossierRequestedAt,
            dossierDeadline: application.dossierDeadline,
            adminNote: application.adminNote,
          }
        : null,
      payments: payments.map((payment) => ({
        id: payment.id,
        paymentType: payment.paymentType,
        licenseClass: payment.licenseClass,
        amount: Number(payment.amount),
        method: payment.method,
        status: payment.status,
        createdAt: payment.createdAt,
        paidAt: payment.customerInfo?.paidAt ?? null,
        source: payment.customerInfo?.source ?? null,
        note: payment.customerInfo?.note ?? null,
        paymentCode: payment.customerInfo?.paymentCode ?? null,
      })),
    }
  }

  async updateNote(admin: AuthUser, userId: string, adminNote: string) {
    await this.getOne(admin, userId)
    await this.profilesRepo.update({ userId }, { adminNote })
    return this.getOne(admin, userId)
  }

  async unlockCourse(admin: AuthUser, userId: string, input: { licenseClass: string; note?: string }) {
    await this.getOne(admin, userId)
    const code = input.licenseClass
    const license = await this.licenseRepo.findOne({ where: { code } })
    const amount = Number(license?.enrollmentFee ?? fallbackEnrollmentFee(code))
    const now = new Date()

    const existing = await this.enrollmentsRepo.findOne({
      where: { userId, licenseClass: code, status: "active" },
    })
    if (existing) return this.getOne(admin, userId)

    const payment = await this.paymentsRepo.save(
      this.paymentsRepo.create({
        userId,
        paymentType: "enrollment",
        licenseClass: code,
        amount: String(amount),
        method: "direct",
        status: "paid",
        customerInfo: {
          source: "admin_direct_unlock",
          paidAt: now.toISOString(),
          adminUserId: admin.userId,
          note: input.note?.trim() || "Admin mở khóa học do học viên đã đóng tiền trực tiếp.",
          paymentEvents: [
            {
              type: "admin_direct_unlock",
              at: now.toISOString(),
              adminUserId: admin.userId,
              note: input.note?.trim() || null,
            },
          ],
        },
      }),
    )

    let enrollment = await this.enrollmentsRepo.findOne({
      where: { userId, licenseClass: code },
    })
    if (!enrollment) {
      enrollment = this.enrollmentsRepo.create({
        userId,
        licenseClass: code,
        status: "active",
        paymentId: payment.id,
        enrolledAt: now,
      })
    } else {
      enrollment.status = "active"
      enrollment.paymentId = payment.id
      enrollment.enrolledAt = enrollment.enrolledAt ?? now
    }
    await this.enrollmentsRepo.save(enrollment)
    return this.getOne(admin, userId)
  }
}
