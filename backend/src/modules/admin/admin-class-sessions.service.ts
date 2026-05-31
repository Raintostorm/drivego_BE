import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { ClassSession } from "../../entities/class-session.entity"
import { SessionAttendance } from "../../entities/session-attendance.entity"
import { AuthUser } from "../auth/jwt.strategy"
import { AdminScopeService } from "./admin-scope.service"

@Injectable()
export class AdminClassSessionsService {
  constructor(
    @InjectRepository(ClassSession)
    private readonly sessionsRepo: Repository<ClassSession>,
    @InjectRepository(SessionAttendance)
    private readonly attendanceRepo: Repository<SessionAttendance>,
    private readonly scope: AdminScopeService,
  ) {}

  async list(admin: AuthUser) {
    const centerId = await this.scope.getCenterIdForAdmin(admin)
    const qb = this.sessionsRepo
      .createQueryBuilder("s")
      .orderBy("s.session_date", "ASC")
    if (centerId) qb.andWhere("s.center_id = :centerId", { centerId })
    return qb.getMany()
  }

  async create(
    admin: AuthUser,
    dto: {
      centerId?: string
      title: string
      sessionDate: string
      startTime: string
      endTime: string
      venue?: string
      sessionType?: string
      licenseClass?: string
      maxCapacity?: number
    },
  ) {
    let centerId = dto.centerId
    const scoped = await this.scope.getCenterIdForAdmin(admin)
    if (scoped) centerId = scoped
    if (!centerId) throw new BadRequestException("center_id là bắt buộc")

    const session = this.sessionsRepo.create({
      centerId,
      title: dto.title,
      sessionDate: dto.sessionDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      venue: dto.venue ?? null,
      sessionType: dto.sessionType ?? "theory",
      licenseClass: dto.licenseClass ?? null,
      maxCapacity: dto.maxCapacity ?? 30,
      createdBy: admin.userId,
    })
    return this.sessionsRepo.save(session)
  }

  async update(admin: AuthUser, id: string, dto: Partial<ClassSession>) {
    const session = await this.sessionsRepo.findOne({ where: { id } })
    if (!session) throw new NotFoundException("Không tìm thấy buổi học")
    await this.scope.assertCenterAccessAsync(admin, session.centerId)
    Object.assign(session, dto)
    return this.sessionsRepo.save(session)
  }

  async remove(admin: AuthUser, id: string) {
    const session = await this.sessionsRepo.findOne({ where: { id } })
    if (!session) throw new NotFoundException("Không tìm thấy buổi học")
    await this.scope.assertCenterAccessAsync(admin, session.centerId)
    await this.sessionsRepo.remove(session)
    return { ok: true }
  }

  async checkInAdmin(admin: AuthUser, sessionId: string, userId: string) {
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } })
    if (!session) throw new NotFoundException("Không tìm thấy buổi học")
    await this.scope.assertCenterAccessAsync(admin, session.centerId)

    const count = await this.attendanceRepo.count({ where: { sessionId } })
    if (count >= session.maxCapacity) {
      throw new BadRequestException("Buổi học đã đủ sĩ số")
    }

    const existing = await this.attendanceRepo.findOne({
      where: { sessionId, userId },
    })
    if (existing) return existing

    const row = this.attendanceRepo.create({
      sessionId,
      userId,
      method: "admin",
      checkedInAt: new Date(),
    })
    return this.attendanceRepo.save(row)
  }

  async listAttendance(admin: AuthUser, sessionId: string) {
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } })
    if (!session) throw new NotFoundException("Không tìm thấy buổi học")
    await this.scope.assertCenterAccessAsync(admin, session.centerId)
    return this.attendanceRepo.find({
      where: { sessionId },
      order: { checkedInAt: "DESC" },
    })
  }

  async attendanceReport(admin: AuthUser) {
    const centerId = await this.scope.getCenterIdForAdmin(admin)
    const base = this.attendanceRepo
      .createQueryBuilder("a")
      .innerJoin(ClassSession, "s", "s.id = a.session_id")
    if (centerId) base.andWhere("s.center_id = :centerId", { centerId })

    const total = await base.getCount()
    const last30Q = this.attendanceRepo
      .createQueryBuilder("a")
      .innerJoin(ClassSession, "s", "s.id = a.session_id")
      .where("a.checked_in_at >= NOW() - INTERVAL '30 days'")
    if (centerId) last30Q.andWhere("s.center_id = :centerId", { centerId })
    const last30 = await last30Q.getCount()

    const upcomingQ = this.sessionsRepo
      .createQueryBuilder("s")
      .where("s.session_date >= CURRENT_DATE")
    if (centerId) upcomingQ.andWhere("s.center_id = :centerId", { centerId })
    const upcoming = await upcomingQ.getCount()

    return {
      totalCheckIns: total,
      checkInsLast30Days: last30,
      upcomingSessions: upcoming,
      attendanceRate: total > 0 ? Math.min(100, Math.round((last30 / total) * 100)) : 0,
    }
  }
}
