import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { ApplicationDocument } from "../../entities/application-document.entity"
import {
  ApplicationStatus,
  LicenseApplication,
} from "../../entities/license-application.entity"
import { StudentProfile } from "../../entities/student-profile.entity"
import { User } from "../../entities/user.entity"
import { ApplicationsService } from "../applications/applications.service"
import { AuthUser } from "../auth/jwt.strategy"
import { NotificationsService } from "../notifications/notifications.service"
import { AdminScopeService } from "./admin-scope.service"
import { PatchApplicationAdminDto } from "./dto/patch-application-admin.dto"

const ADMIN_LIST_STATUSES: ApplicationStatus[] = [
  "draft",
  "submitted",
  "reviewing",
  "approved",
  "rejected",
]

@Injectable()
export class AdminApplicationsService {
  constructor(
    @InjectRepository(LicenseApplication)
    private readonly appsRepo: Repository<LicenseApplication>,
    @InjectRepository(ApplicationDocument)
    private readonly docsRepo: Repository<ApplicationDocument>,
    @InjectRepository(StudentProfile)
    private readonly profilesRepo: Repository<StudentProfile>,
    private readonly applicationsService: ApplicationsService,
    private readonly scope: AdminScopeService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(admin: AuthUser, status?: string, licenseClass?: string) {
    const centerId = await this.scope.getCenterIdForAdmin(admin)
    const qb = this.appsRepo
      .createQueryBuilder("a")
      .innerJoin(User, "u", "u.id = a.user_id")
      .leftJoin(StudentProfile, "p", "p.user_id = a.user_id")
      .where("a.status IN (:...statuses)", { statuses: ADMIN_LIST_STATUSES })
      .orderBy("a.submitted_at", "DESC", "NULLS LAST")
      .addOrderBy("a.updated_at", "DESC")

    if (status) qb.andWhere("a.status = :status", { status })
    if (licenseClass) qb.andWhere("a.license_class = :licenseClass", { licenseClass })
    if (centerId) {
      qb.andWhere(
        "(a.center_id = :centerId OR (a.center_id IS NULL AND p.center_id = :centerId))",
        { centerId },
      )
    }

    const rows = await qb
      .select([
        "a.id AS id",
        "a.license_class AS license_class",
        "a.status AS status",
        "a.submitted_at AS submitted_at",
        "a.dossier_requested_at AS dossier_requested_at",
        "a.dossier_deadline AS dossier_deadline",
        "a.center_id AS center_id",
        "u.email AS email",
        "p.full_name AS full_name",
      ])
      .getRawMany<{
        id: string
        license_class: string
        status: string
        submitted_at: Date | null
        dossier_requested_at: Date | null
        dossier_deadline: Date | null
        center_id: string | null
        email: string
        full_name: string | null
      }>()

    return rows.map((r) => ({
      id: r.id,
      licenseClass: r.license_class,
      status: r.status,
      submittedAt: r.submitted_at,
      dossierRequestedAt: r.dossier_requested_at,
      dossierDeadline: r.dossier_deadline,
      centerId: r.center_id,
      studentEmail: r.email,
      studentName: r.full_name ?? r.email,
    }))
  }

  async getOne(admin: AuthUser, id: string) {
    const app = await this.appsRepo.findOne({
      where: { id },
      relations: { documents: true, user: true },
    })
    if (!app) throw new NotFoundException("Không tìm thấy hồ sơ")
    await this.scope.assertApplicationAccessAsync(admin, app.centerId, app.userId)

    const profile = await this.profilesRepo.findOne({ where: { userId: app.userId } })

    return {
      id: app.id,
      licenseClass: app.licenseClass,
      status: app.status,
      personalInfo: app.personalInfo ?? {},
      submittedAt: app.submittedAt,
      dossierRequestedAt: app.dossierRequestedAt,
      dossierDeadline: app.dossierDeadline,
      adminNote: app.adminNote,
      reviewedAt: app.reviewedAt,
      centerId: app.centerId,
      studentEmail: app.user?.email,
      studentName: profile?.fullName ?? app.user?.email,
      documents: (app.documents ?? []).map((d) => ({
        id: d.id,
        docType: d.docType,
        slotIndex: d.slotIndex,
        originalName: d.originalName,
        mimeType: d.mimeType,
        uploadedAt: d.uploadedAt,
        downloadUrl: `/api/admin/applications/documents/${d.id}/file`,
      })),
    }
  }

  async getDocumentFile(admin: AuthUser, documentId: string) {
    const doc = await this.docsRepo.findOne({
      where: { id: documentId },
      relations: { application: true },
    })
    if (!doc) throw new NotFoundException("Không tìm thấy tài liệu")
    await this.scope.assertApplicationAccessAsync(admin, doc.application.centerId, doc.application.userId)
    return this.applicationsService.resolveDocumentStream(doc)
  }

  async patchStatus(admin: AuthUser, id: string, dto: PatchApplicationAdminDto) {
    const app = await this.appsRepo.findOne({ where: { id } })
    if (!app) throw new NotFoundException("Không tìm thấy hồ sơ")
    await this.scope.assertApplicationAccessAsync(admin, app.centerId, app.userId)

    const allowed: Record<string, ApplicationStatus[]> = {
      submitted: ["reviewing", "approved", "rejected"],
      reviewing: ["approved", "rejected"],
      approved: [],
      rejected: [],
      draft: [],
    }
    const next = allowed[app.status] ?? []
    if (!next.includes(dto.status)) {
      throw new BadRequestException(
        `Không thể chuyển từ ${app.status} sang ${dto.status}`,
      )
    }

    app.status = dto.status
    app.adminNote = dto.adminNote ?? app.adminNote
    app.reviewedAt = new Date()
    app.reviewedBy = admin.userId
    await this.appsRepo.save(app)

    const titles: Record<string, string> = {
      reviewing: "Hồ sơ đang được xem xét",
      approved: "Hồ sơ đã được duyệt",
      rejected: "Hồ sơ bị từ chối",
    }
    await this.notifications.createForUser(app.userId, {
      type: "application_status",
      title: titles[dto.status] ?? "Cập nhật hồ sơ",
      body: dto.adminNote ?? titles[dto.status],
      actionUrl: "/application",
    })

    return this.getOne(admin, id)
  }

  async requestDossier(admin: AuthUser, id: string, dto: { deadline?: string }) {
    const app = await this.appsRepo.findOne({ where: { id } })
    if (!app) throw new NotFoundException("Không tìm thấy hồ sơ")
    await this.scope.assertApplicationAccessAsync(admin, app.centerId, app.userId)

    const deadline = dto.deadline ? new Date(dto.deadline) : undefined
    await this.applicationsService.requestDossier(id, deadline)

    const deadlineText = deadline
      ? deadline.toLocaleDateString("vi-VN")
      : "theo hướng dẫn trung tâm"
    await this.notifications.createForUser(app.userId, {
      type: "dossier_request",
      title: "Trung tâm yêu cầu nộp hồ sơ sát hạch",
      body: `Vui lòng hoàn thiện và nộp hồ sơ trước hạn: ${deadlineText}.`,
      actionUrl: "/application",
    })

    return this.getOne(admin, id)
  }

  async countByStatus(admin: AuthUser, status: string) {
    const centerId = await this.scope.getCenterIdForAdmin(admin)
    const qb = this.appsRepo
      .createQueryBuilder("a")
      .leftJoin(StudentProfile, "p", "p.user_id = a.user_id")
      .where("a.status = :status", { status })
    if (centerId) {
      qb.andWhere(
        "(a.center_id = :centerId OR (a.center_id IS NULL AND p.center_id = :centerId))",
        { centerId },
      )
    }
    return qb.getCount()
  }
}
