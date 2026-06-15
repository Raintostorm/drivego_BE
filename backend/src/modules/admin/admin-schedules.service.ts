import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { DataSource, In, Repository } from "typeorm"
import {
  ExamRegistration,
  ScheduleSlot,
  TrainingCenter,
} from "../../entities/schedule-slot.entity"
import { StudentProfile } from "../../entities/student-profile.entity"
import { AuthUser } from "../auth/jwt.strategy"
import { NotificationsService } from "../notifications/notifications.service"
import { AdminScopeService } from "./admin-scope.service"
import { CreateSlotAdminDto } from "./dto/create-slot-admin.dto"
import { PatchRegistrationAdminDto } from "./dto/patch-registration-admin.dto"

@Injectable()
export class AdminSchedulesService {
  constructor(
    @InjectRepository(ScheduleSlot)
    private readonly slotsRepo: Repository<ScheduleSlot>,
    @InjectRepository(ExamRegistration)
    private readonly registrationsRepo: Repository<ExamRegistration>,
    @InjectRepository(StudentProfile)
    private readonly profilesRepo: Repository<StudentProfile>,
    @InjectRepository(TrainingCenter)
    private readonly centersRepo: Repository<TrainingCenter>,
    private readonly dataSource: DataSource,
    private readonly scope: AdminScopeService,
    private readonly notifications: NotificationsService,
  ) {}

  async listRegistrations(
    admin: AuthUser,
    status?: string,
    slotType?: string,
  ) {
    const centerId = await this.scope.getCenterIdForAdmin(admin)
    const qb = this.registrationsRepo
      .createQueryBuilder("r")
      .leftJoinAndSelect("r.slot", "s")
      .leftJoinAndSelect("r.user", "u")
      .orderBy("s.slot_date", "ASC")
      .addOrderBy("s.start_time", "ASC")

    qb.andWhere("r.status = :status", { status: status ?? "pending" })
    if (slotType) qb.andWhere("s.slot_type = :slotType", { slotType })
    if (centerId) qb.andWhere("s.center_id = :centerId", { centerId })

    const rows = await qb.getMany()
    const userIds = [...new Set(rows.map((r) => r.userId))]
    const profiles =
      userIds.length > 0
        ? await this.profilesRepo.find({ where: { userId: In(userIds) } })
        : []
    const nameByUser = new Map(profiles.map((p) => [p.userId, p.fullName]))

    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      adminNote: r.adminNote,
      userId: r.userId,
      studentEmail: r.user?.email,
      studentName: nameByUser.get(r.userId) ?? r.user?.email,
      slot: r.slot
        ? {
            id: r.slot.id,
            date: r.slot.slotDate,
            startTime: r.slot.startTime,
            endTime: r.slot.endTime,
            venue: r.slot.venue,
            slotType: r.slot.slotType,
            licenseClass: r.slot.licenseClass,
          }
        : null,
    }))
  }

  async patchRegistration(
    admin: AuthUser,
    id: string,
    dto: PatchRegistrationAdminDto,
  ) {
    const notifyPayload = await this.dataSource.transaction(async (manager) => {
      const regRepo = manager.getRepository(ExamRegistration)
      const slotRepo = manager.getRepository(ScheduleSlot)
      const reg = await regRepo
        .createQueryBuilder("r")
        .setLock("pessimistic_write")
        .where("r.id = :id", { id })
        .getOne()
      if (!reg) throw new NotFoundException("Không tìm thấy đăng ký")

      if (reg.status !== "pending") {
        throw new BadRequestException("Chỉ xử lý đăng ký đang chờ duyệt")
      }

      const slot = await slotRepo
        .createQueryBuilder("s")
        .setLock("pessimistic_write")
        .where("s.id = :slotId", { slotId: reg.slotId })
        .getOne()
      if (!slot) throw new NotFoundException("Không tìm thấy ca")
      await this.scope.assertCenterAccessAsync(admin, slot.centerId)

      if (dto.status === "confirmed") {
        const held = await regRepo.count({
          where: { slotId: slot.id, status: In(["pending", "confirmed"]) },
        })
        if (held > slot.capacity) {
          throw new ConflictException("Ca thi đã đầy (vượt sức chứa sau khi có đăng ký chờ)")
        }
        reg.status = "confirmed"
        slot.registeredCount += 1
        await slotRepo.save(slot)
      } else {
        reg.status = "rejected"
      }

      reg.adminNote = dto.adminNote ?? reg.adminNote
      reg.reviewedAt = new Date()
      reg.reviewedBy = admin.userId
      await regRepo.save(reg)

      return {
        id: reg.id,
        status: reg.status,
        userId: reg.userId,
        slotDate: slot.slotDate,
        startTime: slot.startTime,
      }
    })

    if (notifyPayload.status === "confirmed") {
      await this.notifications.createForUser(notifyPayload.userId, {
        type: "schedule_confirmed",
        title: "Đăng ký ca thi đã được xác nhận",
        body:
          dto.adminNote ??
          `Ca ${notifyPayload.slotDate} ${String(notifyPayload.startTime).slice(0, 5)}`,
        actionUrl: "/schedule",
      })
    } else {
      await this.notifications.createForUser(notifyPayload.userId, {
        type: "schedule_rejected",
        title: "Đăng ký ca thi bị từ chối",
        body: dto.adminNote ?? "Vui lòng chọn ca khác hoặc liên hệ trung tâm",
        actionUrl: "/schedule",
      })
    }

    return { id: notifyPayload.id, status: notifyPayload.status }
  }

  async listSlots(admin: AuthUser, slotType?: string, date?: string) {
    const centerId = await this.scope.getCenterIdForAdmin(admin)
    const qb = this.slotsRepo
      .createQueryBuilder("s")
      .leftJoinAndSelect("s.center", "center")
      .orderBy("s.slot_date", "ASC")
      .addOrderBy("s.start_time", "ASC")

    if (slotType) qb.andWhere("s.slot_type = :slotType", { slotType })
    if (date) qb.andWhere("s.slot_date = :date", { date })
    if (centerId) qb.andWhere("s.center_id = :centerId", { centerId })

    const slots = await qb.getMany()
    const slotIds = slots.map((s) => s.id)
    const heldRows =
      slotIds.length > 0
        ? await this.registrationsRepo
            .createQueryBuilder("r")
            .select("r.slot_id", "slotId")
            .addSelect("COUNT(*)", "cnt")
            .where("r.slot_id IN (:...slotIds)", { slotIds })
            .andWhere("r.status IN (:...statuses)", {
              statuses: ["pending", "confirmed"],
            })
            .groupBy("r.slot_id")
            .getRawMany<{ slotId: string; cnt: string }>()
        : []
    const heldBySlot = new Map(heldRows.map((r) => [r.slotId, Number(r.cnt)]))

    return slots.map((s) => {
      const heldSeats = heldBySlot.get(s.id) ?? 0
      return {
        id: s.id,
        slotType: s.slotType,
        date: s.slotDate,
        startTime: s.startTime,
        endTime: s.endTime,
        venue: s.venue,
        licenseClass: s.licenseClass,
        capacity: s.capacity,
        registeredCount: s.registeredCount,
        heldSeats,
        remaining: Math.max(0, s.capacity - heldSeats),
        centerName: s.center?.name,
      }
    })
  }

  async createSlot(admin: AuthUser, dto: CreateSlotAdminDto) {
    let centerId = await this.scope.getCenterIdForAdmin(admin)
    if (!centerId) {
      if (admin.role === "system_admin") {
        if (!dto.centerId) {
          throw new BadRequestException("System admin cần chọn centerId khi tạo ca thi")
        }
        centerId = dto.centerId
      } else {
        throw new BadRequestException("Tài khoản trung tâm chưa gắn center_id")
      }
    }
    const center = await this.centersRepo.findOne({ where: { id: centerId } })
    if (!center) throw new NotFoundException("Không tìm thấy trung tâm")
    const slot = this.slotsRepo.create({
      centerId,
      slotDate: dto.slotDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      venue: dto.venue,
      licenseClass: dto.licenseClass,
      slotType: dto.slotType,
      capacity: dto.capacity,
      registeredCount: 0,
    })
    await this.slotsRepo.save(slot)
    return { id: slot.id }
  }

  async countPendingRegistrations(admin: AuthUser) {
    const centerId = await this.scope.getCenterIdForAdmin(admin)
    const qb = this.registrationsRepo
      .createQueryBuilder("r")
      .innerJoin("r.slot", "s")
      .where("r.status = :status", { status: "pending" })
    if (centerId) qb.andWhere("s.center_id = :centerId", { centerId })
    return qb.getCount()
  }
}
