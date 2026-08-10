import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { ClassSession } from "../../entities/class-session.entity"
import { ClassSessionEnrollment } from "../../entities/class-session-enrollment.entity"
import { CourseEnrollment } from "../../entities/course-enrollment.entity"
import { SessionAttendance } from "../../entities/session-attendance.entity"
import { StudentProfile } from "../../entities/student-profile.entity"

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(ClassSession)
    private readonly sessionsRepo: Repository<ClassSession>,
    @InjectRepository(ClassSessionEnrollment)
    private readonly sessionEnrollmentsRepo: Repository<ClassSessionEnrollment>,
    @InjectRepository(CourseEnrollment)
    private readonly courseEnrollmentsRepo: Repository<CourseEnrollment>,
    @InjectRepository(SessionAttendance)
    private readonly attendanceRepo: Repository<SessionAttendance>,
    @InjectRepository(StudentProfile)
    private readonly profilesRepo: Repository<StudentProfile>,
  ) {}

  private sessionBounds(session: ClassSession): { startMs: number; endMs: number } {
    const date = String(session.sessionDate).slice(0, 10)
    const start = new Date(`${date}T${String(session.startTime).slice(0, 8)}`)
    const end = new Date(`${date}T${String(session.endTime).slice(0, 8)}`)
    return { startMs: start.getTime(), endMs: end.getTime() }
  }

  private assertCheckInWindow(session: ClassSession) {
    const { startMs, endMs } = this.sessionBounds(session)
    const now = Date.now()
    const marginMs = 15 * 60 * 1000
    if (now < startMs - marginMs || now > endMs + marginMs) {
      throw new BadRequestException(
        "Chỉ được điểm danh trong khung giờ buổi học (±15 phút)",
      )
    }
  }

  async upcomingForUser(userId: string) {
    const profile = await this.profilesRepo.findOne({ where: { userId } })
    if (!profile?.centerId) return []

    return this.sessionsRepo
      .createQueryBuilder("s")
      .innerJoin(
        ClassSessionEnrollment,
        "assignment",
        "assignment.session_id = s.id AND assignment.user_id = :userId AND assignment.status = :assignmentStatus",
        { userId, assignmentStatus: "scheduled" },
      )
      .where("s.center_id = :centerId", { centerId: profile.centerId })
      .andWhere("s.session_date >= CURRENT_DATE")
      .andWhere("s.status = :status", { status: "scheduled" })
      .orderBy("s.session_date", "ASC")
      .addOrderBy("s.start_time", "ASC")
      .limit(20)
      .getMany()
  }

  async checkIn(userId: string, sessionId: string) {
    const profile = await this.profilesRepo.findOne({ where: { userId } })
    const session = await this.sessionsRepo.findOne({ where: { id: sessionId } })
    if (!session) throw new NotFoundException("Không tìm thấy buổi học")

    if (!profile?.centerId || profile.centerId !== session.centerId) {
      throw new ForbiddenException("Buổi học không thuộc trung tâm của bạn")
    }

    if (session.status !== "scheduled") {
      throw new BadRequestException("Buổi học không còn mở để điểm danh")
    }

    const assignment = await this.sessionEnrollmentsRepo.findOne({
      where: { sessionId, userId },
    })
    if (!assignment || assignment.status === "cancelled") {
      throw new ForbiddenException("Bạn chưa được xếp vào buổi học này")
    }

    if (session.licenseClass) {
      const enrollment = await this.courseEnrollmentsRepo.findOne({
        where: { userId, licenseClass: session.licenseClass, status: "active" },
      })
      if (!enrollment) {
        throw new ForbiddenException("Khóa học của bạn không còn hoạt động cho buổi này")
      }
    }

    this.assertCheckInWindow(session)

    const count = await this.attendanceRepo.count({ where: { sessionId } })
    if (count >= session.maxCapacity) {
      throw new BadRequestException("Buổi học đã đủ sĩ số")
    }

    const existing = await this.attendanceRepo.findOne({
      where: { sessionId, userId },
    })
    if (existing) return { ok: true, attendance: existing }

    const attendance = await this.attendanceRepo.save(
      this.attendanceRepo.create({
        sessionId,
        userId,
        method: "self",
        checkedInAt: new Date(),
      }),
    )
    assignment.status = "attended"
    await this.sessionEnrollmentsRepo.save(assignment)
    return { ok: true, attendance }
  }
}
