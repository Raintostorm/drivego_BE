import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { TrainingCenter } from "../../entities/schedule-slot.entity"
import { LookupRecord } from "../../entities/lookup-record.entity"
import { LookupController } from "./lookup.controller"
import { LookupService } from "./lookup.service"

@Module({
  imports: [TypeOrmModule.forFeature([LookupRecord, TrainingCenter])],
  controllers: [LookupController],
  providers: [LookupService],
})
export class LookupModule {}
