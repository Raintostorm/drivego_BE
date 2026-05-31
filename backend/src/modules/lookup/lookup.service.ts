import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { TrainingCenter } from "../../entities/schedule-slot.entity"
import { LookupRecord } from "../../entities/lookup-record.entity"

@Injectable()
export class LookupService {
  constructor(
    @InjectRepository(LookupRecord)
    private readonly lookupRepo: Repository<LookupRecord>,
    @InjectRepository(TrainingCenter)
    private readonly centersRepo: Repository<TrainingCenter>,
  ) {}

  async listCenters() {
    const rows = await this.centersRepo.find({ order: { name: "ASC" } })
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      city: c.city ?? null,
    }))
  }

  async search(code: string) {
    const trimmed = code.trim()
    if (!trimmed) {
      throw new NotFoundException("Không tìm thấy hồ sơ")
    }

    const record = await this.lookupRepo.findOne({
      where: { nationalIdOrCode: trimmed },
    })

    if (!record) {
      throw new NotFoundException("Không tìm thấy hồ sơ với mã đã nhập")
    }

    return {
      code: record.nationalIdOrCode,
      studentName: record.studentName,
      licenseClass: record.licenseClass,
      resultStatus: record.resultStatus,
      updatedAt: record.updatedAt,
    }
  }
}
