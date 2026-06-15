import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { randomBytes } from "crypto"
import { Repository } from "typeorm"
import { EnrollmentService } from "../../common/enrollment.service"
import { isStudyLicenseCode } from "../../common/license-class.constants"
import { Payment } from "../../entities/payment.entity"
import { StudentProfile } from "../../entities/student-profile.entity"
import { SubscriptionPlan } from "../../entities/subscription-plan.entity"
import { User } from "../../entities/user.entity"
import { CheckoutDto } from "./dto/checkout.dto"
import { SepayWebhookDto } from "./dto/sepay-webhook.dto"
import { SepayConfigService } from "./sepay-config.service"

const PREMIUM_DAYS = 30
const PAYMENT_TTL_MS = 24 * 60 * 60 * 1000

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(SubscriptionPlan)
    private readonly plansRepo: Repository<SubscriptionPlan>,
    @InjectRepository(StudentProfile)
    private readonly profilesRepo: Repository<StudentProfile>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly enrollment: EnrollmentService,
    private readonly sepay: SepayConfigService,
  ) {}

  async checkout(userId: string, dto: CheckoutDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } })
    if (!user || user.role !== "student") {
      throw new ForbiddenException("Chỉ học viên mới được thanh toán trên hệ thống")
    }

    const bank = this.sepay.assertCheckoutConfigured()

    const paymentType = dto.paymentType ?? "premium"
    let amount = 0
    let planId: string | null = null
    let licenseClass: string | null = null

    if (paymentType === "premium") {
      const planCode = dto.planCode ?? "premium"
      const plan = await this.plansRepo.findOne({ where: { code: planCode } })
      if (!plan) {
        throw new NotFoundException("Không tìm thấy gói đăng ký")
      }
      amount = Number(plan.priceMonthly)
      if (!amount || amount <= 0) {
        throw new BadRequestException("Gói này không cần thanh toán")
      }
      planId = plan.id
    } else if (paymentType === "enrollment") {
      if (!dto.licenseClass || !isStudyLicenseCode(dto.licenseClass)) {
        throw new BadRequestException("licenseClass không hợp lệ (A1, A2, B1, B2)")
      }
      if (await this.enrollment.isEnrolled(userId, dto.licenseClass)) {
        throw new BadRequestException(`Bạn đã đăng ký khóa hạng ${dto.licenseClass}`)
      }
      amount = await this.enrollment.getEnrollmentFee(dto.licenseClass)
      licenseClass = dto.licenseClass
    } else {
      throw new BadRequestException("paymentType không hợp lệ")
    }

    const paymentCode = await this.generateUniquePaymentCode()
    const expiresAt = new Date(Date.now() + PAYMENT_TTL_MS).toISOString()

    const payment = this.paymentsRepo.create({
      userId,
      planId,
      paymentType,
      licenseClass,
      amount: String(amount),
      method: "sepay",
      status: "pending",
      customerInfo: {
        paymentCode,
        fullName: dto.fullName ?? null,
        email: dto.email ?? null,
        expiresAt,
        paymentType,
        licenseClass,
      },
    })
    await this.paymentsRepo.save(payment)

    const qrImageUrl = this.sepay.buildQrImageUrl({
      accountNumber: bank.accountNumber,
      bankName: bank.bankName,
      amount,
      description: paymentCode,
    })

    return {
      paymentId: payment.id,
      paymentType,
      licenseClass,
      paymentCode,
      amount,
      transferContent: paymentCode,
      expiresAt,
      bank,
      qrImageUrl,
      instructions: `Quét QR hoặc chuyển khoản đúng ${amount.toLocaleString("vi-VN")}đ với nội dung: ${paymentCode}`,
    }
  }

  async getStatus(userId: string, paymentId: string) {
    const payment = await this.paymentsRepo.findOne({ where: { id: paymentId, userId } })
    if (!payment) {
      throw new NotFoundException("Không tìm thấy giao dịch")
    }

    return this.toPaymentStatus(payment)
  }

  async confirmManual(paymentId: string, adminUserId: string, note?: string) {
    const payment = await this.paymentsRepo.findOne({ where: { id: paymentId } })
    if (!payment) {
      throw new NotFoundException("Không tìm thấy giao dịch")
    }
    if (payment.status === "paid") {
      return this.toPaymentStatus(payment)
    }
    if (payment.status !== "pending") {
      throw new BadRequestException("Chỉ có thể xác nhận thủ công giao dịch đang chờ")
    }
    if (this.isExpired(payment)) {
      payment.status = "expired"
      await this.paymentsRepo.save(payment)
      throw new BadRequestException("Giao dịch đã hết hạn")
    }

    await this.markPaid(payment, {
      manual: true,
      adminUserId,
      note: note?.trim() || null,
    })
    return this.toPaymentStatus(payment)
  }

  async handleSepayWebhook(payload: SepayWebhookDto) {
    if (payload.transferType !== "in") {
      return { success: true, message: "Ignored outgoing transfer" }
    }

    const paymentCodes = this.resolvePaymentCodeCandidates(payload)
    if (!paymentCodes.length) {
      return { success: true, message: "No payment code in webhook" }
    }

    const payment = await this.findPaymentByCodes(paymentCodes)
    if (!payment) {
      return { success: true, message: "Payment not found for code" }
    }

    if (payment.status === "paid") {
      const existingSepayId = payment.customerInfo?.sepayTransactionId
      if (existingSepayId === payload.id) {
        return { success: true, message: "Already processed" }
      }
      return { success: true, message: "Payment already paid" }
    }

    const expectedAmount = Math.round(Number(payment.amount))
    const paidAmount = Math.round(Number(payload.transferAmount))
    if (paidAmount !== expectedAmount) {
      return { success: true, message: "Amount mismatch — ignored" }
    }

    if (this.isExpired(payment)) {
      payment.status = "expired"
      await this.paymentsRepo.save(payment)
      return { success: true, message: "Payment expired" }
    }

    await this.markPaid(payment, payload)
    return { success: true, message: "Payment confirmed" }
  }

  private generatePaymentCode() {
    const prefix = this.sepay.getPaymentCodePrefix()
    const suffix = randomBytes(6).toString("hex").toUpperCase()
    return `${prefix}${suffix}`
  }

  private async generateUniquePaymentCode() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = this.generatePaymentCode()
      const existing = await this.findPaymentByCode(code)
      if (!existing) return code
    }
    throw new BadRequestException("Chưa tạo được mã thanh toán, vui lòng thử lại")
  }

  private resolvePaymentCodeCandidates(payload: SepayWebhookDto) {
    const prefix = this.sepay.getPaymentCodePrefix()
    const content = [
      payload.content,
      payload.description,
      payload.referenceCode,
    ]
      .filter(Boolean)
      .join(" ")
      .toUpperCase()
    const matches: string[] = content.match(new RegExp(`${prefix}[A-Z0-9]+`, "g")) ?? []
    if (payload.code) matches.push(String(payload.code).toUpperCase())
    return [...new Set(matches)]
  }

  private async findPaymentByCode(paymentCode: string) {
    return this.paymentsRepo
      .createQueryBuilder("p")
      .where("UPPER(p.customer_info->>'paymentCode') = :code", { code: paymentCode.toUpperCase() })
      .orderBy("p.created_at", "DESC")
      .getOne()
  }

  private async findPaymentByCodes(paymentCodes: string[]) {
    return this.paymentsRepo
      .createQueryBuilder("p")
      .where("UPPER(p.customer_info->>'paymentCode') IN (:...codes)", {
        codes: paymentCodes.map((code) => code.toUpperCase()),
      })
      .orderBy("p.created_at", "DESC")
      .getOne()
  }

  private isExpired(payment: Payment) {
    const expiresAt = payment.customerInfo?.expiresAt
    if (typeof expiresAt !== "string") return false
    return new Date(expiresAt).getTime() < Date.now()
  }

  private async markPaid(
    payment: Payment,
    payload: SepayWebhookDto | { manual: true; adminUserId: string; note: string | null },
  ) {
    payment.status = "paid"
    const manualPayload = "manual" in payload
    payment.customerInfo = {
      ...(payment.customerInfo ?? {}),
      paidAt: new Date().toISOString(),
      ...(manualPayload
        ? {
            manualConfirmed: true,
            manualConfirmedBy: payload.adminUserId,
            manualConfirmNote: payload.note,
          }
        : {
            sepayTransactionId: payload.id,
            sepayReferenceCode: payload.referenceCode ?? null,
            sepayGateway: payload.gateway ?? null,
          }),
    }
    await this.paymentsRepo.save(payment)

    const type = payment.paymentType ?? (payment.planId ? "premium" : "enrollment")

    if (type === "enrollment" && payment.licenseClass) {
      await this.enrollment.activateFromPayment(
        payment.userId,
        payment.licenseClass,
        payment.id,
      )
      return
    }

    if (!payment.planId) return

    const profile = await this.profilesRepo.findOne({ where: { userId: payment.userId } })
    if (!profile) return

    const now = new Date()
    const base =
      profile.premiumUntil && profile.premiumUntil > now ? profile.premiumUntil : now
    const premiumUntil = new Date(base)
    premiumUntil.setDate(premiumUntil.getDate() + PREMIUM_DAYS)

    await this.profilesRepo.update(payment.userId, { premiumUntil })
  }

  private toPaymentStatus(payment: Payment) {
    return {
      id: payment.id,
      status: payment.status,
      paymentType: payment.paymentType,
      licenseClass: payment.licenseClass,
      paymentCode: payment.customerInfo?.paymentCode ?? null,
      amount: Number(payment.amount),
      paidAt: payment.customerInfo?.paidAt ?? null,
      manualConfirmed: Boolean(payment.customerInfo?.manualConfirmed),
    }
  }
}
