import { ForbiddenException, Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { User } from "../../entities/user.entity"
import { AuthUser } from "../auth/jwt.strategy"
import { StudentProfile } from "../../entities/student-profile.entity"

@Injectable()
export class AdminScopeService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(StudentProfile)
    private readonly profilesRepo: Repository<StudentProfile>,
  ) {}

  async getCenterIdForAdmin(user: AuthUser): Promise<string | null> {
    if (user.role === "system_admin") return null
    const row = await this.usersRepo.findOne({ where: { id: user.userId } })
    if (!row?.centerId) {
      throw new ForbiddenException("Tài khoản trung tâm chưa gắn center_id")
    }
    return row.centerId
  }

  async assertCenterAccessAsync(admin: AuthUser, resourceCenterId?: string | null) {
    if (admin.role === "system_admin") return
    const u = await this.usersRepo.findOne({ where: { id: admin.userId } })
    if (!u?.centerId) {
      throw new ForbiddenException("Tài khoản trung tâm chưa gắn center_id")
    }
    if (resourceCenterId && resourceCenterId !== u.centerId) {
      throw new ForbiddenException("Không thuộc trung tâm của bạn")
    }
  }

  async resolveApplicationCenterId(
    appCenterId: string | null | undefined,
    studentUserId: string,
  ): Promise<string | null> {
    if (appCenterId) return appCenterId
    const profile = await this.profilesRepo.findOne({ where: { userId: studentUserId } })
    return profile?.centerId ?? null
  }
  
  async assertApplicationAccessAsync(
    admin: AuthUser,
    appCenterId: string | null | undefined,
    studentUserId: string,
  ) {
    if (admin.role === "system_admin") return
    const effective = await this.resolveApplicationCenterId(appCenterId, studentUserId)
    if (!effective) {
      throw new ForbiddenException(
        "Hồ sơ chưa gắn trung tâm — chỉ quản trị hệ thống được xem",
      )
    }
    await this.assertCenterAccessAsync(admin, effective)
  }
}
