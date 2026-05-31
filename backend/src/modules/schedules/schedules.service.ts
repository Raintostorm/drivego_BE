import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"
import { ApplicationsService } from "../applications/applications.service"
import { InjectRepository } from "@nestjs/typeorm"
import { DataSource, In, Repository } from "typeorm"
import { ExamRegistration, ScheduleSlot } from "../../entities/schedule-slot.entity"
import { StudentProfile } from "../../entities/student-profile.entity"
import { LicenseApplication } from "../../entities/license-application.entity"

const HELD_STATUSES = ["pending", "confirmed"] as const

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(ScheduleSlot)
    private readonly slotsRepo: Repository<ScheduleSlot>,
    @InjectRepository(ExamRegistration)
    private readonly registrationsRepo: Repository<ExamRegistration>,
    @InjectRepository(StudentProfile)
    private readonly profilesRepo: Repository<StudentProfile>,
    @InjectRepository(LicenseApplication)
    private readonly appsRepo: Repository<LicenseApplication>,
    private readonly dataSource: DataSource,
    private readonly applications: ApplicationsService,
  ) {}

  private async countHeldSeats(slotId: string): Promise<number> {
    return this.registrationsRepo.count({
      where: { slotId, status: In([...HELD_STATUSES]) },
    })
  }

  private async countHeldBySlotIds(slotIds: string[]): Promise<Map<string, number>> {
    if (slotIds.length === 0) return new Map()
    const rows = await this.registrationsRepo
      .createQueryBuilder("r")
      .select("r.slot_id", "slotId")
      .addSelect("COUNT(*)", "cnt")
      .where("r.slot_id IN (:...slotIds)", { slotIds })
      .andWhere("r.status IN (:...statuses)", { statuses: [...HELD_STATUSES] })
      .groupBy("r.slot_id")
      .getRawMany<{ slotId: string; cnt: string }>()
    return new Map(rows.map((r) => [r.slotId, Number(r.cnt)]))
  }

  private mapSlotRow(
    s: ScheduleSlot,
    held: number,
  ) {
    const remaining = Math.max(0, s.capacity - held)
    const full = held >= s.capacity
    return {
      id: s.id,
      slotType: s.slotType,
      date: s.slotDate,
      startTime: s.startTime,
      endTime: s.endTime,
      timeLabel: `${String(s.startTime).slice(0, 5)} - ${String(s.endTime).slice(0, 5)}`,
      venue: s.venue,
      centerName: s.center?.name,
      licenseClass: s.licenseClass,
      capacity: s.capacity,
      registeredCount: s.registeredCount,
      heldSeats: held,
      remaining,
      full,
      seatsLabel: full ? "Đã đầy suất đăng ký" : `${remaining}/${s.capacity}`,
    }
  }

  async listSlots(
    licenseClass?: string,
    date?: string,
    slotType?: string,
    userId?: string,
  ) {
    const qb = this.slotsRepo
      .createQueryBuilder("s")
      .leftJoinAndSelect("s.center", "center")
      .orderBy("s.slot_date", "ASC")
      .addOrderBy("s.start_time", "ASC")

    if (licenseClass) {
      qb.andWhere("s.license_class = :licenseClass", { licenseClass })
    }
    if (date) {
      qb.andWhere("s.slot_date = :date", { date })
    }
    if (slotType) {
      qb.andWhere("s.slot_type = :slotType", { slotType })
    } else {
      qb.andWhere("s.slot_type = :defaultType", { defaultType: "theory_exam" })
    }

    if (userId) {
      const profile = await this.profilesRepo.findOne({ where: { userId } })
      if (!profile?.centerId) {
        return []
      }
      qb.andWhere("s.center_id = :centerId", { centerId: profile.centerId })
    }

    const slots = await qb.getMany()
    const heldBySlot = await this.countHeldBySlotIds(slots.map((s) => s.id))
    return slots.map((s) => this.mapSlotRow(s, heldBySlot.get(s.id) ?? 0))
  }

  async listMyRegistrations(userId: string) {
    const rows = await this.registrationsRepo.find({
      where: { userId },
      relations: { slot: true },
      order: { id: "DESC" },
    })
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      slotId: r.slotId,
      slot: r.slot
        ? {
            date: r.slot.slotDate,
            startTime: r.slot.startTime,
            endTime: r.slot.endTime,
            venue: r.slot.venue,
            slotType: r.slot.slotType,
          }
        : null,
    }))
  }

  async register(userId: string, slotId: string) {
    await this.applications.assertApprovedForExam(userId)
    return this.dataSource.transaction(async (manager) => {
      const slot = await manager
        .getRepository(ScheduleSlot)
        .createQueryBuilder("s")
        .setLock("pessimistic_write")
        .where("s.id = :slotId", { slotId })
        .getOne()
      if (!slot) throw new NotFoundException("Không tìm thấy ca thi")

        const approvedApp = await this.appsRepo.findOne({
          where: { userId, status: "approved" },
          order: { updatedAt: "DESC" },
        })
        if (!approvedApp) {
          throw new ForbiddenException(
            "Cần hồ sơ sát hạch đã được duyệt trước khi đăng ký ca thi chính thức.",
          )
        }
        if (slot.licenseClass && slot.licenseClass !== approvedApp.licenseClass) {
          throw new BadRequestException(
            `Ca thi hạng ${slot.licenseClass} không khớp hồ sơ đã duyệt (${approvedApp.licenseClass})`,
          )
        }
        const profile = await this.profilesRepo.findOne({ where: { userId } })
        if (profile?.centerId && slot.centerId && slot.centerId !== profile.centerId) {
          throw new ForbiddenException("Ca thi không thuộc trung tâm của bạn")
        }

      const held = await manager.getRepository(ExamRegistration).count({
        where: { slotId, status: In([...HELD_STATUSES]) },
      })
      if (held >= slot.capacity) {
        throw new ConflictException("Ca thi đã đầy")
      }

      const existing = await manager.getRepository(ExamRegistration).findOne({
        where: { userId, slotId },
      })
      if (existing) {
        throw new ConflictException("Bạn đã đăng ký ca thi này")
      }

      const reg = manager.getRepository(ExamRegistration).create({
        userId,
        slotId,
        status: "pending",
      })
      await manager.getRepository(ExamRegistration).save(reg)

      return {
        registrationId: reg.id,
        slotId,
        status: "pending",
        message: "Đã gửi yêu cầu, chờ trung tâm xác nhận",
      }
    })
  }
}
