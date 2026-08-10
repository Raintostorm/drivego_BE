import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ExamRegistration, ScheduleSlot } from "../../entities/schedule-slot.entity"
import { StudentProfile } from "../../entities/student-profile.entity"
import { ApplicationsModule } from "../applications/applications.module"
import { AuthModule } from "../auth/auth.module"
import { SchedulesController } from "./schedules.controller"
import { SchedulesService } from "./schedules.service"
import { LicenseApplication } from "../../entities/license-application.entity"
import { CourseEnrollment } from "../../entities/course-enrollment.entity"

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduleSlot, ExamRegistration, StudentProfile, LicenseApplication, CourseEnrollment]),
    AuthModule,
    ApplicationsModule,
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
})
export class SchedulesModule {}
