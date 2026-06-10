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

    const paymentCode = this.generatePaymentCode()
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

    return {
      id: payment.id,
      status: payment.status,
      paymentType: payment.paymentType,
      licenseClass: payment.licenseClass,
      paymentCode: payment.customerInfo?.paymentCode ?? null,
      amount: Number(payment.amount),
      paidAt: payment.customerInfo?.paidAt ?? null,
    }
  }

  async handleSepayWebhook(payload: SepayWebhookDto) {
    if (payload.transferType !== "in") {
      return { success: true, message: "Ignored outgoing transfer" }
    }

    const paymentCode = this.resolvePaymentCode(payload)
    if (!paymentCode) {
      return { success: true, message: "No payment code in webhook" }
    }

    const payment = await this.findPaymentByCode(paymentCode)
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
    const suffix = randomBytes(4).toString("hex").toUpperCase()
    return `${prefix}${suffix}`
  }

  private resolvePaymentCode(payload: SepayWebhookDto) {
    const prefix = this.sepay.getPaymentCodePrefix()
    if (payload.code) {
      return String(payload.code).toUpperCase()
    }

    const content = [
      payload.content,
      payload.description,
      payload.referenceCode,
    ]
      .filter(Boolean)
      .join(" ")
      .toUpperCase()
    const match = content.match(new RegExp(`${prefix}[A-Z0-9]+`))
    return match?.[0] ?? null
  }

  private async findPaymentByCode(paymentCode: string) {
    return this.paymentsRepo
      .createQueryBuilder("p")
      .where("UPPER(p.customer_info->>'paymentCode') = :code", { code: paymentCode.toUpperCase() })
      .orderBy("p.created_at", "DESC")
      .getOne()
  }

  private isExpired(payment: Payment) {
    const expiresAt = payment.customerInfo?.expiresAt
    if (typeof expiresAt !== "string") return false
    return new Date(expiresAt).getTime() < Date.now()
  }

  private async markPaid(payment: Payment, payload: SepayWebhookDto) {
    payment.status = "paid"
    payment.customerInfo = {
      ...(payment.customerInfo ?? {}),
      sepayTransactionId: payload.id,
      paidAt: new Date().toISOString(),
      sepayReferenceCode: payload.referenceCode ?? null,
      sepayGateway: payload.gateway ?? null,
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
}
