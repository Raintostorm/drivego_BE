import { ForbiddenException, Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { StudentProfile } from "../entities/student-profile.entity"

@Injectable()
export class PremiumService {
  constructor(
    @InjectRepository(StudentProfile)
    private readonly profilesRepo: Repository<StudentProfile>,
  ) {}

  async isPremium(userId: string): Promise<boolean> {
    const profile = await this.profilesRepo.findOne({ where: { userId } })
    if (profile?.premiumLifetime) return true
    if (!profile?.premiumUntil) return false
    return profile.premiumUntil.getTime() > Date.now()
  }

  async assertPremiumForChat(userId: string) {
    if (await this.isPremium(userId)) return
    throw new ForbiddenException(
      "AI Chat chỉ dành cho tài khoản Premium. Vui lòng nâng cấp tại trang Nâng cấp.",
    )
  }

}
