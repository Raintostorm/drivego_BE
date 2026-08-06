import { ForbiddenException, Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import {
  DEFAULT_LICENSE_CLASS,
  isStudyLicenseCode,
} from "./license-class.constants"
import { fallbackEnrollmentFee } from "./pricing.constants"
import { CourseEnrollment } from "../entities/course-enrollment.entity"
import { LicenseClass } from "../entities/license-class.entity"

@Injectable()
export class EnrollmentService {
  constructor(
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentsRepo: Repository<CourseEnrollment>,
    @InjectRepository(LicenseClass)
    private readonly licenseRepo: Repository<LicenseClass>,
  ) {}

  normalizeClass(code?: string) {
    return code && isStudyLicenseCode(code) ? code : DEFAULT_LICENSE_CLASS
  }

  async isEnrolled(userId: string, licenseClass: string) {
    const code = this.normalizeClass(licenseClass)
    const row = await this.enrollmentsRepo.findOne({
      where: { userId, licenseClass: code, status: "active" },
    })
    return Boolean(row)
  }

  async assertEnrolled(userId: string, licenseClass: string) {
    if (await this.isEnrolled(userId, licenseClass)) return
    const code = this.normalizeClass(licenseClass)
    throw new ForbiddenException(
      `Cần đăng ký và thanh toán khóa học hạng ${code} trước khi học hoặc làm đề. Vào Bảng giá hoặc trang Đăng ký khóa.`,
    )
  }

  async listForUser(userId: string) {
    const rows = await this.enrollmentsRepo.find({
      where: { userId, status: "active" },
      order: { enrolledAt: "DESC" },
    })
    return rows.map((r) => ({
      licenseClass: r.licenseClass,
      status: r.status,
      enrolledAt: r.enrolledAt,
    }))
  }

  async getEnrollmentFee(licenseClass: string) {
    const code = this.normalizeClass(licenseClass)
    const row = await this.licenseRepo.findOne({ where: { code } })
    const fallback = fallbackEnrollmentFee(code)
    const fee = Number(row?.enrollmentFee ?? fallback)
    return fee > 0 ? fee : fallback
  }

  async activateFromPayment(userId: string, licenseClass: string, paymentId: string) {
    const code = this.normalizeClass(licenseClass)
    let row = await this.enrollmentsRepo.findOne({
      where: { userId, licenseClass: code },
    })
    if (!row) {
      row = this.enrollmentsRepo.create({
        userId,
        licenseClass: code,
        status: "active",
        paymentId,
        enrolledAt: new Date(),
      })
    } else {
      row.status = "active"
      row.paymentId = paymentId
      row.enrolledAt = row.enrolledAt ?? new Date()
    }
    await this.enrollmentsRepo.save(row)
    return row
  }
}
