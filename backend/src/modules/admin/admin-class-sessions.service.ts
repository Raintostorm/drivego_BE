import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { ClassSession } from "../../entities/class-session.entity"
import { ClassSessionEnrollment } from "../../entities/class-session-enrollment.entity"
import { CourseEnrollment } from "../../entities/course-enrollment.entity"
import { SessionAttendance } from "../../entities/session-attendance.entity"
import { StudentProfile } from "../../entities/student-profile.entity"
import { User } from "../../entities/user.entity"
import { AuthUser } from "../auth/jwt.strategy"
import { NotificationsService } from "../notifications/notifications.service"
import { AdminScopeService } from "./admin-scope.service"

@Injectable()
export class AdminClassSessionsService {
  constructor(
    @InjectRepository(ClassSession)
    private readonly sessionsRepo: Repository<ClassSession>,
    @InjectRepository(ClassSessionEnrollment)
    private readonly sessionEnrollmentsRepo: Repository<ClassSessionEnrollment>,
    @InjectRepository(SessionAttendance)
    private readonly attendanceRepo: Repository<SessionAttendance>,
    @InjectRepository(StudentProfile)
    private readonly profilesRepo: Repository<StudentProfile>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentsRepo: Repository<CourseEnrollment>,
    private readonly scope: AdminScopeService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(admin: AuthUser) {
    const centerId = await this.scope.getCenterIdForAdmin(admin)
    const qb = this.sessionsRepo
      .createQueryBuilder("s")
      .orderBy("s.session_date", "ASC")
    if (centerId) qb.andWhere("s.center_id = :centerId", { centerId })
    const sessions = await qb.getMany()
    if (!sessions.length) return []
    const counts = await this.attendanceRepo
      .createQueryBuilder("a")
      .select("a.session_id", "sessionId")
      .addSelect("COUNT(*)", "count")
      .where("a.session_id IN (:...ids)", { ids: sessions.map((session) => session.id) })
      .groupBy("a.session_id")
      .getRawMany<{ sessionId: string; count: string }>()
    const countBySession = new Map(counts.map((row) => [row.sessionId, Number(row.count)]))
    const assignedRows = await this.sessionEnrollmentsRepo
      .createQueryBuilder("e")
      .select("e.session_id", "sessionId")
      .addSelect("COUNT(*)", "count")
      .where("e.session_id IN (:...ids)", { ids: sessions.map((session) => session.id) })
      .andWhere("e.status != :cancelled", { cancelled: "cancelled" })
      .groupBy("e.session_id")
      .getRawMany<{ sessionId: string; count: string }>()
    const assignedBySession = new Map(assignedRows.map((row) => [row.sessionId, Number(row.count)]))
    return sessions.map((session) => ({
      ...session,
      attendanceCount: countBySession.get(session.id) ?? 0,
      assignedCount: assignedBySession.get(session.id) ?? 0,
    }))
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
      deliveryMode?: "in_person" | "online" | "hybrid"
      onlineUrl?: string
      instructorName?: string
      licenseClass?: string
      maxCapacity?: number
    },
  ) {
    let centerId = dto.centerId
    const scoped = await this.scope.getCenterIdForAdmin(admin)
    if (scoped) centerId = scoped
    if (!centerId) throw new BadRequestException("center_id là bắt buộc")
    if (!dto.title?.trim() || !dto.sessionDate || !dto.startTime || !dto.endTime) {
      throw new BadRequestException("Thiếu thông tin bắt buộc của buổi học")
    }
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException("Giờ kết thúc phải sau giờ bắt đầu")
    }
    const deliveryMode = dto.deliveryMode ?? "in_person"
    if (!["in_person", "online", "hybrid"].includes(deliveryMode)) {
      throw new BadRequestException("Hình thức học không hợp lệ")
    }
    if (["online", "hybrid"].includes(deliveryMode) && !dto.onlineUrl?.trim()) {
      throw new BadRequestException("Buổi học online cần có link tham gia")
    }
    if (!Number.isFinite(dto.maxCapacity ?? 30) || (dto.maxCapacity ?? 30) < 1) {
      throw new BadRequestException("Sức chứa phải lớn hơn 0")
    }

    const session = this.sessionsRepo.create({
      centerId,
      title: dto.title,
      sessionDate: dto.sessionDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      venue: dto.venue ?? null,
      sessionType: dto.sessionType ?? "theory",
      deliveryMode,
      onlineUrl: dto.onlineUrl?.trim() || null,
      instructorName: dto.instructorName?.trim() || null,
      status: "scheduled",
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
    const safeFields: Array<keyof ClassSession> = [
      "title", "sessionDate", "startTime", "endTime", "venue", "sessionType",
      "deliveryMode", "onlineUrl", "instructorName", "licenseClass", "maxCapacity", "status",
    ]
    for (const field of safeFields) {
      if (dto[field] !== undefined) Object.assign(session, { [field]: dto[field] })
    }
    if (session.startTime >= session.endTime) {
      throw new BadRequestException("Giờ kết thúc phải sau giờ bắt đầu")
    }
    if (["online", "hybrid"].includes(session.deliveryMode) && !session.onlineUrl?.trim()) {
      throw new BadRequestException("Buổi học online cần có link tham gia")
    }
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

    const assignment = await this.sessionEnrollmentsRepo.findOne({ where: { sessionId, userId } })
    if (!assignment || assignment.status === "cancelled") {
      throw new BadRequestException("Học viên chưa được xếp vào buổi học này")
    }

    const existing = await this.attendanceRepo.findOne({
      where: { sessionId, userId },
    })
    if (existing) return existing

    const count = await this.attendanceRepo.count({ where: { sessionId } })
    if (count >= session.maxCapacity) {
      throw new BadRequestException("Buổi học đã đủ sĩ số")
    }

    const row = this.attendanceRepo.create({
      sessionId,
      userId,
      method: "admin",
      checkedInAt: new Date(),
    })
    const attendance = await this.attendanceRepo.save(row)
    assignment.status = "attended"
    await this.sessionEnrollmentsRepo.save(assignment)
    return attendance
  }

  async listRoster(admin: AuthUser, sessionId: string) {
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } })
    if (!session) throw new NotFoundException("Không tìm thấy buổi học")
    await this.scope.assertCenterAccessAsync(admin, session.centerId)
    const rows = await this.sessionEnrollmentsRepo
      .createQueryBuilder("e")
      .innerJoin(User, "u", "u.id = e.user_id")
      .leftJoin(StudentProfile, "p", "p.user_id = e.user_id")
      .where("e.session_id = :sessionId", { sessionId })
      .orderBy("e.assigned_at", "ASC")
      .select([
        "e.user_id AS user_id", "e.status AS status", "e.note AS note", "e.assigned_at AS assigned_at",
        "u.email AS email", "p.full_name AS full_name",
      ])
      .getRawMany<{ user_id: string; status: string; note: string | null; assigned_at: Date; email: string; full_name: string | null }>()
    return rows.map((row) => ({
      userId: row.user_id,
      status: row.status,
      note: row.note,
      assignedAt: row.assigned_at,
      studentEmail: row.email,
      studentName: row.full_name ?? row.email,
    }))
  }

  async assignStudent(admin: AuthUser, sessionId: string, userId: string, note?: string) {
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } })
    if (!session) throw new NotFoundException("Không tìm thấy buổi học")
    await this.scope.assertCenterAccessAsync(admin, session.centerId)
    if (session.status !== "scheduled") throw new BadRequestException("Buổi học không còn mở xếp lớp")

    const profile = await this.profilesRepo.findOne({ where: { userId } })
    if (!profile || profile.centerId !== session.centerId) {
      throw new BadRequestException("Học viên không thuộc trung tâm của buổi học")
    }
    const enrollmentWhere = session.licenseClass
      ? { userId, licenseClass: session.licenseClass, status: "active" }
      : { userId, status: "active" }
    const enrollment = await this.enrollmentsRepo.findOne({ where: enrollmentWhere })
    if (!enrollment) {
      throw new BadRequestException(session.licenseClass
        ? `Học viên chưa có khóa ${session.licenseClass} đang hoạt động`
        : "Học viên chưa có khóa học đang hoạt động")
    }
    const existing = await this.sessionEnrollmentsRepo.findOne({ where: { sessionId, userId } })
    let saved: ClassSessionEnrollment
    if (existing) {
      existing.status = "scheduled"
      existing.note = note?.trim() || null
      existing.assignedBy = admin.userId
      saved = await this.sessionEnrollmentsRepo.save(existing)
    } else {
      const activeAssignments = await this.sessionEnrollmentsRepo
        .createQueryBuilder("e")
        .where("e.session_id = :sessionId", { sessionId })
        .andWhere("e.status != :cancelled", { cancelled: "cancelled" })
        .getCount()
      if (activeAssignments >= session.maxCapacity) throw new BadRequestException("Buổi học đã đủ sĩ số")
      saved = await this.sessionEnrollmentsRepo.save(this.sessionEnrollmentsRepo.create({
        sessionId, userId, status: "scheduled", assignedBy: admin.userId, note: note?.trim() || null,
      }))
    }
    await this.notifications.createForUser(userId, {
      type: "class_session_assigned",
      title: "Bạn có buổi học mới",
      body: `${session.title} · ${session.sessionDate} ${String(session.startTime).slice(0, 5)}`,
      actionUrl: "/study-calendar",
    })
    return saved
  }

  async removeStudent(admin: AuthUser, sessionId: string, userId: string) {
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } })
    if (!session) throw new NotFoundException("Không tìm thấy buổi học")
    await this.scope.assertCenterAccessAsync(admin, session.centerId)
    const assignment = await this.sessionEnrollmentsRepo.findOne({ where: { sessionId, userId } })
    if (!assignment) throw new NotFoundException("Không tìm thấy học viên trong danh sách lớp")
    if (assignment.status === "attended") {
      throw new BadRequestException("Không thể hủy xếp lớp sau khi đã điểm danh")
    }
    assignment.status = "cancelled"
    return this.sessionEnrollmentsRepo.save(assignment)
  }

  async listAttendance(admin: AuthUser, sessionId: string) {
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } })
    if (!session) throw new NotFoundException("Không tìm thấy buổi học")
    await this.scope.assertCenterAccessAsync(admin, session.centerId)
    const rows = await this.attendanceRepo
      .createQueryBuilder("a")
      .innerJoin(User, "u", "u.id = a.user_id")
      .leftJoin(StudentProfile, "p", "p.user_id = a.user_id")
      .where("a.session_id = :sessionId", { sessionId })
      .orderBy("a.checked_in_at", "DESC")
      .select([
        "a.id AS id",
        "a.user_id AS user_id",
        "a.checked_in_at AS checked_in_at",
        "a.method AS method",
        "u.email AS email",
        "p.full_name AS full_name",
      ])
      .getRawMany<{ id: string; user_id: string; checked_in_at: Date; method: string; email: string; full_name: string | null }>()
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      checkedInAt: row.checked_in_at,
      method: row.method,
      studentEmail: row.email,
      studentName: row.full_name ?? row.email,
    }))
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
