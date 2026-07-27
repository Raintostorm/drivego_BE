import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { ApplicationDocument } from "../../entities/application-document.entity"
import { LicenseApplication } from "../../entities/license-application.entity"
import { Payment } from "../../entities/payment.entity"
import { StudentProfile } from "../../entities/student-profile.entity"
import { AuthUser } from "../auth/jwt.strategy"
import { AdminApplicationsService } from "./admin-applications.service"
import { AdminClassSessionsService } from "./admin-class-sessions.service"
import { AdminSchedulesService } from "./admin-schedules.service"
import { AdminScopeService } from "./admin-scope.service"

const REQUIRED_DOCUMENT_COUNT = 8

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(LicenseApplication)
    private readonly appsRepo: Repository<LicenseApplication>,
    @InjectRepository(ApplicationDocument)
    private readonly docsRepo: Repository<ApplicationDocument>,
    @InjectRepository(StudentProfile)
    private readonly profilesRepo: Repository<StudentProfile>,
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    private readonly applications: AdminApplicationsService,
    private readonly schedules: AdminSchedulesService,
    private readonly sessions: AdminClassSessionsService,
    private readonly scope: AdminScopeService,
  ) {}

  async getSummary(admin: AuthUser) {
    const [
      pendingApplications,
      draftApplications,
      pendingRegistrations,
      attendance,
      applicationStatus,
      studentsByClass,
      paymentStatus,
      revenue30Days,
      missingDocuments,
      deadlines,
    ] = await Promise.all([
      this.applications.countByStatus(admin, "submitted"),
      this.applications.countByStatus(admin, "draft"),
      this.schedules.countPendingRegistrations(admin),
      this.sessions.attendanceReport(admin),
      this.applicationStatusBreakdown(admin),
      this.studentsByLicenseClass(admin),
      this.paymentStatusBreakdown(admin),
      this.revenueLast30Days(admin),
      this.missingDocumentSummary(admin),
      this.dossierDeadlineSummary(admin),
    ])

    const totalApplications = applicationStatus.reduce((sum, row) => sum + row.count, 0)
    const totalStudents = studentsByClass.reduce((sum, row) => sum + row.count, 0)
    const totalPayments = paymentStatus.reduce((sum, row) => sum + row.count, 0)

    return {
      pendingApplications,
      draftApplications,
      submittedApplications: pendingApplications,
      totalApplications,
      totalStudents,
      totalPayments,
      pendingRegistrations,
      upcomingSessions: attendance.upcomingSessions,
      attendanceRate: attendance.attendanceRate,
      checkInsLast30Days: attendance.checkInsLast30Days,
      applicationStatus,
      studentsByClass,
      paymentStatus,
      revenue30Days,
      missingDocuments,
      deadlines,
    }
  }

  private async scopedCenterId(admin: AuthUser) {
    return this.scope.getCenterIdForAdmin(admin)
  }

  private scopeApplicationQuery<T>(qb: T, centerId: string | null): T {
    if (!centerId) return qb
    const query = qb as {
      leftJoin: (entity: typeof StudentProfile, alias: string, condition: string) => unknown
      andWhere: (condition: string, params: Record<string, unknown>) => unknown
    }
    query.leftJoin(StudentProfile, "scope_profile", "scope_profile.user_id = a.user_id")
    query.andWhere(
      "(a.center_id = :centerId OR (a.center_id IS NULL AND scope_profile.center_id = :centerId))",
      { centerId },
    )
    return qb
  }

  private scopeProfileQuery<T>(qb: T, centerId: string | null): T {
    if (!centerId) return qb
    const query = qb as {
      andWhere: (condition: string, params: Record<string, unknown>) => unknown
    }
    query.andWhere("p.center_id = :centerId", { centerId })
    return qb
  }

  private scopePaymentQuery<T>(qb: T, centerId: string | null): T {
    if (!centerId) return qb
    const query = qb as {
      leftJoin: (entity: typeof StudentProfile, alias: string, condition: string) => unknown
      andWhere: (condition: string, params: Record<string, unknown>) => unknown
    }
    query.leftJoin(StudentProfile, "pay_profile", "pay_profile.user_id = pay.user_id")
    query.andWhere("pay_profile.center_id = :centerId", { centerId })
    return qb
  }

  private async applicationStatusBreakdown(admin: AuthUser) {
    const centerId = await this.scopedCenterId(admin)
    const qb = this.appsRepo
      .createQueryBuilder("a")
      .select("a.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("a.status")
      .orderBy("a.status", "ASC")
    this.scopeApplicationQuery(qb, centerId)
    const rows = await qb.getRawMany<{ status: string; count: string }>()
    return rows.map((row) => ({ status: row.status, count: Number(row.count) }))
  }

  private async studentsByLicenseClass(admin: AuthUser) {
    const centerId = await this.scopedCenterId(admin)
    const qb = this.profilesRepo
      .createQueryBuilder("p")
      .select("COALESCE(p.license_class, 'unknown')", "licenseClass")
      .addSelect("COUNT(*)", "count")
      .groupBy("COALESCE(p.license_class, 'unknown')")
      .orderBy("COALESCE(p.license_class, 'unknown')", "ASC")
    this.scopeProfileQuery(qb, centerId)
    const rows = await qb.getRawMany<{ licenseClass: string; count: string }>()
    return rows.map((row) => ({
      licenseClass: row.licenseClass,
      count: Number(row.count),
    }))
  }

  private async paymentStatusBreakdown(admin: AuthUser) {
    const centerId = await this.scopedCenterId(admin)
    const qb = this.paymentsRepo
      .createQueryBuilder("pay")
      .select("pay.status", "status")
      .addSelect("COUNT(*)", "count")
      .addSelect("COALESCE(SUM(pay.amount), 0)", "amount")
      .groupBy("pay.status")
      .orderBy("pay.status", "ASC")
    this.scopePaymentQuery(qb, centerId)
    const rows = await qb.getRawMany<{ status: string; count: string; amount: string }>()
    return rows.map((row) => ({
      status: row.status,
      count: Number(row.count),
      amount: Number(row.amount),
    }))
  }

  private async revenueLast30Days(admin: AuthUser) {
    const centerId = await this.scopedCenterId(admin)
    const qb = this.paymentsRepo
      .createQueryBuilder("pay")
      .select("COALESCE(SUM(pay.amount), 0)", "amount")
      .where("pay.status = :status", { status: "paid" })
      .andWhere("pay.created_at >= NOW() - INTERVAL '30 days'")
    this.scopePaymentQuery(qb, centerId)
    const row = await qb.getRawOne<{ amount: string }>()
    return Number(row?.amount ?? 0)
  }

  private async missingDocumentSummary(admin: AuthUser) {
    const centerId = await this.scopedCenterId(admin)
    const qb = this.appsRepo
      .createQueryBuilder("a")
      .leftJoin(ApplicationDocument, "d", "d.application_id = a.id")
      .select("a.id", "id")
      .addSelect("a.status", "status")
      .addSelect("COUNT(d.id)", "documents")
      .where("a.status IN (:...statuses)", {
        statuses: ["draft", "submitted", "reviewing", "rejected"],
      })
      .groupBy("a.id")
      .addGroupBy("a.status")
    this.scopeApplicationQuery(qb, centerId)
    const rows = await qb.getRawMany<{ id: string; status: string; documents: string }>()
    const incomplete = rows.filter((row) => Number(row.documents) < REQUIRED_DOCUMENT_COUNT)
    return {
      incompleteApplications: incomplete.length,
      checkedApplications: rows.length,
      requiredDocuments: REQUIRED_DOCUMENT_COUNT,
    }
  }

  private async dossierDeadlineSummary(admin: AuthUser) {
    const centerId = await this.scopedCenterId(admin)
    const qb = this.appsRepo
      .createQueryBuilder("a")
      .select("COUNT(*)", "dueSoon")
      .where("a.dossier_deadline IS NOT NULL")
      .andWhere("a.dossier_deadline >= NOW()")
      .andWhere("a.dossier_deadline <= NOW() + INTERVAL '7 days'")
    this.scopeApplicationQuery(qb, centerId)
    const dueSoon = await qb.getRawOne<{ dueSoon: string }>()

    const overdueQb = this.appsRepo
      .createQueryBuilder("a")
      .select("COUNT(*)", "overdue")
      .where("a.dossier_deadline IS NOT NULL")
      .andWhere("a.dossier_deadline < NOW()")
    this.scopeApplicationQuery(overdueQb, centerId)
    const overdue = await overdueQb.getRawOne<{ overdue: string }>()

    return {
      dueSoon: Number(dueSoon?.dueSoon ?? 0),
      overdue: Number(overdue?.overdue ?? 0),
    }
  }
}
