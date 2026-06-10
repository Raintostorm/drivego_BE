import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common"
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { ConfigService } from "@nestjs/config"
import { InjectRepository } from "@nestjs/typeorm"
import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs"
import { join, extname } from "path"
import { Readable } from "stream"
import type { ReadableStream as NodeReadableStream } from "stream/web"
import { randomUUID } from "crypto"
import { Repository } from "typeorm"
import { ApplicationDocument } from "../../entities/application-document.entity"
import {
  ApplicationStatus,
  LicenseApplication,
} from "../../entities/license-application.entity"
import { StudentProfile } from "../../entities/student-profile.entity"
import {
  isValidDocType,
  maxSlotIndex,
  OPTIONAL_DOCUMENT_SLOTS,
  REQUIRED_DOCUMENT_SLOTS,
} from "./application-doc-types"
import { UpdateApplicationDto } from "./dto/update-application.dto"

const MAX_FILE_BYTES = 5 * 1024 * 1024

@Injectable()
export class ApplicationsService {
  private readonly uploadRoot: string
  private readonly uploadDir: string
  private readonly uploadProvider: string
  private readonly r2Bucket?: string
  private readonly r2Client?: S3Client

  constructor(
    @InjectRepository(LicenseApplication)
    private readonly appsRepo: Repository<LicenseApplication>,
    @InjectRepository(ApplicationDocument)
    private readonly docsRepo: Repository<ApplicationDocument>,
    @InjectRepository(StudentProfile)
    private readonly profilesRepo: Repository<StudentProfile>,
    private readonly config: ConfigService,
  ) {
    this.uploadProvider = this.config.get<string>("UPLOAD_STORAGE_PROVIDER")?.trim().toLowerCase() || "local"
    this.uploadRoot = this.config.get<string>("UPLOAD_DIR")?.trim() || join(process.cwd(), "uploads")
    this.uploadDir = join(this.uploadRoot, "applications")
    if (this.uploadProvider === "r2") {
      this.r2Bucket = this.config.get<string>("R2_BUCKET")?.trim()
      const endpoint = this.normalizeR2Endpoint(
        this.config.get<string>("R2_ENDPOINT")?.trim(),
        this.r2Bucket,
      )
      const accessKeyId = this.config.get<string>("R2_ACCESS_KEY_ID")?.trim()
      const secretAccessKey = this.config.get<string>("R2_SECRET_ACCESS_KEY")?.trim()
      if (this.r2Bucket && endpoint && accessKeyId && secretAccessKey) {
        this.r2Client = new S3Client({
          region: "auto",
          endpoint,
          forcePathStyle: true,
          credentials: { accessKeyId, secretAccessKey },
        })
      }
    } else {
      mkdirSync(this.uploadDir, { recursive: true })
    }
  }

  async assertApprovedForExam(userId: string) {
    const app = await this.appsRepo.findOne({
      where: { userId, status: "approved" },
      order: { updatedAt: "DESC" },
    })
    if (!app) {
      throw new ForbiddenException(
        "Cần hồ sơ sát hạch đã được duyệt trước khi đăng ký ca thi chính thức.",
      )
    }
  }

  private canModifyApplication(app: LicenseApplication) {
    return app.status === "draft" || Boolean(app.dossierRequestedAt)
  }

  async requestDossier(applicationId: string, deadline?: Date) {
    const app = await this.appsRepo.findOne({ where: { id: applicationId } })
    if (!app) throw new NotFoundException("Không tìm thấy hồ sơ")

    if (app.status === "draft") {
      throw new BadRequestException(
        "Học viên chưa nộp hồ sơ lần đầu — không cần yêu cầu nộp hồ sơ",
      )
    }

    const allowed: ApplicationStatus[] = [
      "submitted",
      "reviewing",
      "approved",
      "rejected",
    ]
    if (!allowed.includes(app.status)) {
      throw new BadRequestException("Không thể yêu cầu nộp hồ sơ ở trạng thái hiện tại")
    }

    app.dossierRequestedAt = new Date()
    if (deadline) app.dossierDeadline = deadline
    await this.appsRepo.save(app)

    const reloaded = await this.appsRepo.findOne({
      where: { id: applicationId },
      relations: { documents: true },
    })
    return this.toResponse(reloaded!)
  }

  async getMyApplication(userId: string) {
    const app = await this.resolveApplicationForStudent(userId)
    if (!app) {
      return {
        application: null,
        examEligible: await this.examEligibleForUser(userId),
      }
    }
    return {
      application: this.toResponse(app),
      examEligible: await this.examEligibleForUser(userId),
    }
  }

  private async hasApprovedApplication(userId: string) {
    const count = await this.appsRepo.count({
      where: { userId, status: "approved" },
    })
    return count > 0
  }
  private async examEligibleForUser(userId: string) {
    return this.hasApprovedApplication(userId)
  }

  async createDraft(userId: string, licenseClass = "B2") {
    const existing = await this.appsRepo.findOne({
      where: { userId, status: "draft" },
      order: { createdAt: "DESC" },
    })
    if (existing) {
      return {
        application: this.toResponse(existing),
        examEligible: await this.examEligibleForUser(userId)
      }
    }

    const app = this.appsRepo.create({
      userId,
      licenseClass,
      status: "draft",
      personalInfo: {},
    })
    await this.appsRepo.save(app)
    return {
      application: this.toResponse(app),
      examEligible: await this.examEligibleForUser(userId),
    }
  }

  async updateApplication(userId: string, id: string, dto: UpdateApplicationDto) {
    const app = await this.getOwnedApplication(userId, id)
    if (!this.canModifyApplication(app)) {
      throw new BadRequestException("Không thể sửa hồ sơ ở trạng thái hiện tại")
    }

    if (dto.licenseClass !== undefined) app.licenseClass = dto.licenseClass
    if (dto.personalInfo !== undefined) {
      app.personalInfo = { ...(app.personalInfo ?? {}), ...dto.personalInfo }
    }

    await this.appsRepo.save(app)
    const reloaded = await this.appsRepo.findOne({
      where: { id: app.id },
      relations: { documents: true },
    })
    return {
      application: this.toResponse(reloaded!),
      examEligible: await this.examEligibleForUser(userId),
    }
  }

  async uploadDocument(
    userId: string,
    applicationId: string,
    file: Express.Multer.File,
    docType: string,
    slotIndex: number,
  ) {
    const app = await this.getOwnedApplication(userId, applicationId)
    if (!this.canModifyApplication(app)) {
      throw new BadRequestException("Không thể upload ở trạng thái hiện tại")
    }

    if (!isValidDocType(docType)) {
      throw new BadRequestException("Loại tài liệu không hợp lệ")
    }

    const maxSlot = maxSlotIndex(docType)
    if (slotIndex < 0 || slotIndex > maxSlot) {
      throw new BadRequestException(`slot_index phải từ 0 đến ${maxSlot}`)
    }

    if (!file?.buffer?.length) {
      throw new BadRequestException("Thiếu file upload")
    }

    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException("File tối đa 5MB")
    }

    const mime = file.mimetype ?? ""
    if (!mime.startsWith("image/") && mime !== "application/pdf") {
      throw new BadRequestException("Chỉ chấp nhận ảnh hoặc PDF")
    }

    const ext = extname(file.originalname) || (mime === "application/pdf" ? ".pdf" : ".jpg")
    const storedName = `${docType}_${slotIndex}_${randomUUID()}${ext}`
    const filePath = `applications/${applicationId}/${storedName}`
    await this.storeUploadedFile(filePath, file.buffer, mime)

    const existing = await this.docsRepo.findOne({
      where: { applicationId, docType, slotIndex },
    })
    if (existing?.filePath) {
      await this.deleteStoredFile(existing.filePath)
      await this.docsRepo.remove(existing)
    }

    const doc = this.docsRepo.create({
      applicationId,
      docType,
      slotIndex,
      filePath,
      originalName: file.originalname,
      mimeType: mime,
    })
    await this.docsRepo.save(doc)

    const reloaded = await this.appsRepo.findOne({
      where: { id: applicationId },
      relations: { documents: true },
    })
    return {
      application: this.toResponse(reloaded!),
      examEligible: await this.examEligibleForUser(userId),
    }
  }

  async submitApplication(userId: string, applicationId: string) {
    const app = await this.getOwnedApplication(userId, applicationId)
    const resubmit = Boolean(app.dossierRequestedAt)
    if (app.status !== "draft" && !resubmit) {
      throw new BadRequestException("Hồ sơ đã được nộp")
    }
    if (!this.canModifyApplication(app)) {
      throw new BadRequestException("Không thể nộp hồ sơ ở trạng thái hiện tại")
    }

    const docs = await this.docsRepo.find({ where: { applicationId } })
    const missing: string[] = []

    for (const [docType, count] of Object.entries(REQUIRED_DOCUMENT_SLOTS)) {
      for (let slot = 0; slot < count; slot += 1) {
        const found = docs.some((d) => d.docType === docType && d.slotIndex === slot)
        if (!found) missing.push(`${docType}[${slot}]`)
      }
    }

    if (missing.length > 0) {
      throw new BadRequestException(
        `Thiếu tài liệu bắt buộc: ${missing.join(", ")}`,
      )
    }

    const profile = await this.profilesRepo.findOne({ where: { userId } })
    if (profile?.centerId) {
      app.centerId = profile.centerId
    }

    app.status = "submitted"
    app.submittedAt = new Date()
    if (resubmit) {
      app.dossierRequestedAt = null
      app.dossierDeadline = null
    }
    await this.appsRepo.save(app)

    const reloaded = await this.appsRepo.findOne({
      where: { id: applicationId },
      relations: { documents: true },
    })
    return {
      application: this.toResponse(reloaded!),
      examEligible: await this.examEligibleForUser(userId),
    }
  }

  async getDocumentFile(userId: string, documentId: string) {
    const doc = await this.docsRepo.findOne({
      where: { id: documentId },
      relations: { application: true },
    })
    if (!doc) throw new NotFoundException("Không tìm thấy tài liệu")
    if (doc.application.userId !== userId) {
      throw new ForbiddenException("Không có quyền xem file")
    }
    return this.resolveDocumentStream(doc)
  }

  async resolveDocumentStream(doc: ApplicationDocument) {
    if (this.uploadProvider === "r2") {
      const r2Stream = await this.resolveR2Stream(doc.filePath).catch(() => null)
      if (r2Stream) {
        return {
          stream: r2Stream,
          mimeType: doc.mimeType ?? "application/octet-stream",
          originalName: doc.originalName ?? "document",
        }
      }
    }

    const absolutePath = join(this.uploadRoot, doc.filePath)
    if (!existsSync(absolutePath)) {
      throw new NotFoundException("File không tồn tại trên máy chủ")
    }
    return {
      stream: createReadStream(absolutePath),
      mimeType: doc.mimeType ?? "application/octet-stream",
      originalName: doc.originalName ?? "document",
    }
  }

  private async storeUploadedFile(filePath: string, buffer: Buffer, mimeType: string) {
    if (this.uploadProvider === "r2") {
      if (!this.r2Client || !this.r2Bucket) {
        throw new InternalServerErrorException("Chưa cấu hình R2 để lưu hồ sơ")
      }
      await this.r2Client.send(
        new PutObjectCommand({
          Bucket: this.r2Bucket,
          Key: filePath,
          Body: buffer,
          ContentType: mimeType,
        }),
      )
      return
    }

    mkdirSync(join(this.uploadRoot, "applications"), { recursive: true })
    writeFileSync(join(this.uploadRoot, filePath), buffer)
  }

  private async deleteStoredFile(filePath: string) {
    if (this.uploadProvider === "r2" && this.r2Client && this.r2Bucket) {
      await this.r2Client
        .send(new DeleteObjectCommand({ Bucket: this.r2Bucket, Key: filePath }))
        .catch(() => undefined)
      return
    }

    const oldAbs = join(this.uploadRoot, filePath)
    if (existsSync(oldAbs)) unlinkSync(oldAbs)
  }

  private async resolveR2Stream(filePath: string) {
    if (!this.r2Client || !this.r2Bucket) return null
    const result = await this.r2Client.send(
      new GetObjectCommand({ Bucket: this.r2Bucket, Key: filePath }),
    )
    const body = result.Body
    if (!body) return null
    if (body instanceof Readable) return body
    if (typeof (body as { transformToWebStream?: () => unknown }).transformToWebStream === "function") {
      const webStream = (body as { transformToWebStream: () => unknown }).transformToWebStream()
      return Readable.fromWeb(webStream as NodeReadableStream)
    }
    return Readable.from(body as AsyncIterable<Uint8Array>)
  }

  private normalizeR2Endpoint(endpoint?: string, bucket?: string) {
    if (!endpoint) return undefined
    const trimmed = endpoint.replace(/\/+$/, "")
    if (!bucket) return trimmed
    const suffix = `/${bucket}`
    return trimmed.endsWith(suffix) ? trimmed.slice(0, -suffix.length) : trimmed
  }

  /** Ưu tiên nháp đang soạn; không thì bản mới nhất (đã nộp / chờ nộp lại). */
  private async resolveApplicationForStudent(userId: string) {
    const draft = await this.findDraftForUser(userId)
    if (draft) return draft
    return this.findLatestForUser(userId)
  }

  private async findDraftForUser(userId: string) {
    return this.appsRepo.findOne({
      where: { userId, status: "draft" },
      relations: { documents: true },
      order: { updatedAt: "DESC" },
    })
  }

  private async findLatestForUser(userId: string) {
    return this.appsRepo.findOne({
      where: { userId },
      relations: { documents: true },
      order: { updatedAt: "DESC" },
    })
  }

  private async getOwnedApplication(userId: string, id: string) {
    const app = await this.appsRepo.findOne({
      where: { id, userId },
      relations: { documents: true },
    })
    if (!app) throw new NotFoundException("Không tìm thấy hồ sơ")
    return app
  }

  private toResponse(app: LicenseApplication) {
    const documents = (app.documents ?? []).map((d) => ({
      id: d.id,
      docType: d.docType,
      slotIndex: d.slotIndex,
      originalName: d.originalName,
      mimeType: d.mimeType,
      uploadedAt: d.uploadedAt,
      fileUrl: `/api/applications/documents/${d.id}/file`,
    }))

    const uploadedKeys = new Set(
      documents.map((d) => `${d.docType}:${d.slotIndex}`),
    )

    const requirements = {
      required: Object.entries(REQUIRED_DOCUMENT_SLOTS).flatMap(([docType, count]) =>
        Array.from({ length: count }, (_, slotIndex) => ({
          docType,
          slotIndex,
          uploaded: uploadedKeys.has(`${docType}:${slotIndex}`),
        })),
      ),
      optional: Object.entries(OPTIONAL_DOCUMENT_SLOTS).flatMap(([docType, count]) =>
        Array.from({ length: count }, (_, slotIndex) => ({
          docType,
          slotIndex,
          uploaded: uploadedKeys.has(`${docType}:${slotIndex}`),
        })),
      ),
    }

    return {
      id: app.id,
      licenseClass: app.licenseClass,
      status: app.status ?? "draft",
      personalInfo: app.personalInfo ?? {},
      submittedAt: app.submittedAt,
      dossierRequestedAt: app.dossierRequestedAt,
      dossierDeadline: app.dossierDeadline,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      documents,
      requirements,
    }
  }
}
