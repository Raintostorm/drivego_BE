import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { ClassSession } from "../../entities/class-session.entity"
import { SessionAttendance } from "../../entities/session-attendance.entity"
import { StudentProfile } from "../../entities/student-profile.entity"

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(ClassSession)
    private readonly sessionsRepo: Repository<ClassSession>,
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
      .where("s.center_id = :centerId", { centerId: profile.centerId })
      .andWhere("s.session_date >= CURRENT_DATE")
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
    return { ok: true, attendance }
  }
}
