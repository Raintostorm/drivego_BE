import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { LicenseClass } from "../../entities/license-class.entity"
import { SubscriptionPlan } from "../../entities/subscription-plan.entity"

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(LicenseClass)
    private readonly licenseRepo: Repository<LicenseClass>,
    @InjectRepository(SubscriptionPlan)
    private readonly plansRepo: Repository<SubscriptionPlan>,
  ) {}

  async list() {
    const licenses = await this.licenseRepo.find({ order: { code: "ASC" } })
    const subscriptions = await this.plansRepo.find({ order: { priceMonthly: "ASC" } })

    const formatPrice = (value: string | number) => {
      const n = Number(value)
      return `${n.toLocaleString("vi-VN")}đ`
    }

    const fallbackFees: Record<string, number> = {
      A1: 755000,
      A2: 1800000,
      B1: 12000000,
      B2: 15000000,
    }

    return {
      licenseClasses: licenses.map((l) => ({
        code: l.code,
        price: formatPrice(l.price ?? 0),
        priceRaw: Number(l.price ?? 0),
        enrollmentFee: formatPrice(l.enrollmentFee ?? fallbackFees[l.code] ?? 0),
        enrollmentFeeRaw: Number(l.enrollmentFee ?? fallbackFees[l.code] ?? 0),
        description: l.description,
        featured: l.code === "B2",
        features: this.defaultFeatures(l.code),
      })),
      subscriptions: subscriptions.map((p) => ({
        code: p.code,
        priceMonthly: formatPrice(p.priceMonthly),
        priceRaw: Number(p.priceMonthly),
        features: p.features,
      })),
    }
  }

  private defaultFeatures(code: string): string[] {
    const map: Record<string, string[]> = {
      A1: ["Lý thuyết tiếng Việt", "Thi thử 24/7", "Hỗ trợ 1-1"],
      A2: ["Lý thuyết & thực hành", "450+ video", "Hỗ trợ trung tâm"],
      B1: ["Lý thuyết & mô phỏng", "Lịch học linh hoạt", "Hỗ trợ đến khi đỗ"],
      B2: ["Lái xe sân", "Thống kê tiến độ", "Ưu tiên lịch thi"],
    }
    return map[code] ?? ["Lý thuyết", "Thi thử", "Hỗ trợ online"]
  }
}
