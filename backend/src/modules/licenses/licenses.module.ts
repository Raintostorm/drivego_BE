import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { StudentLicense } from "../../entities/student-license.entity"
import { StudentProfile } from "../../entities/student-profile.entity"
import { User } from "../../entities/user.entity"
import { AuthModule } from "../auth/auth.module"
import { NotificationsModule } from "../notifications/notifications.module"
import { LicensesController } from "./licenses.controller"
import { LicensesService } from "./licenses.service"

@Module({
  imports: [TypeOrmModule.forFeature([StudentLicense, StudentProfile, User]), AuthModule, NotificationsModule],
  controllers: [LicensesController],
  providers: [LicensesService],
  exports: [LicensesService],
})
export class LicensesModule {}

