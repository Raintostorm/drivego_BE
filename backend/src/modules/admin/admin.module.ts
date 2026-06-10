import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { RolesGuard } from "../../common/guards/roles.guard"
import { ApplicationDocument } from "../../entities/application-document.entity"
import { ClassSession } from "../../entities/class-session.entity"
import { CourseEnrollment } from "../../entities/course-enrollment.entity"
import { ExamAttempt } from "../../entities/exam-attempt.entity"
import { LicenseApplication } from "../../entities/license-application.entity"
import { LicenseClass } from "../../entities/license-class.entity"
import { Payment } from "../../entities/payment.entity"
import { ExamRegistration, ScheduleSlot, TrainingCenter } from "../../entities/schedule-slot.entity"
import { SessionAttendance } from "../../entities/session-attendance.entity"
import { StudentProfile } from "../../entities/student-profile.entity"
import { StudyChapter } from "../../entities/study-chapter.entity"
import { User } from "../../entities/user.entity"
import { ApplicationsModule } from "../applications/applications.module"
import { AuthModule } from "../auth/auth.module"
import { NotificationsModule } from "../notifications/notifications.module"
import { PaymentsModule } from "../payments/payments.module"
import { AdminApplicationsController } from "./admin-applications.controller"
import { AdminApplicationsService } from "./admin-applications.service"
import { AdminCentersController } from "./admin-centers.controller"
import { AdminCentersService } from "./admin-centers.service"
import { AdminClassSessionsController } from "./admin-class-sessions.controller"
import { AdminClassSessionsService } from "./admin-class-sessions.service"
import { AdminContentController } from "./admin-content.controller"
import { AdminContentService } from "./admin-content.service"
import { AdminDashboardController } from "./admin-dashboard.controller"
import { AdminDashboardService } from "./admin-dashboard.service"
import { AdminEnrollmentsController } from "./admin-enrollments.controller"
import { AdminEnrollmentsService } from "./admin-enrollments.service"
import { AdminPaymentsController } from "./admin-payments.controller"
import { AdminPaymentsService } from "./admin-payments.service"
import { AdminSchedulesController } from "./admin-schedules.controller"
import { AdminSchedulesService } from "./admin-schedules.service"
import { AdminScopeService } from "./admin-scope.service"
import { AdminSlotsController } from "./admin-slots.controller"
import { AdminSlotsService } from "./admin-slots.service"
import { AdminStudentsController } from "./admin-students.controller"
import { AdminStudentsService } from "./admin-students.service"
import { AdminUsersController } from "./admin-users.controller"
import { AdminUsersService } from "./admin-users.service"

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LicenseApplication,
      ApplicationDocument,
      ScheduleSlot,
      ExamRegistration,
      TrainingCenter,
      User,
      StudentProfile,
      CourseEnrollment,
      ExamAttempt,
      Payment,
      LicenseClass,
      StudyChapter,
      ClassSession,
      SessionAttendance,
    ]),
    AuthModule,
    ApplicationsModule,
    NotificationsModule,
    PaymentsModule,
  ],
  controllers: [
    AdminApplicationsController,
    AdminSchedulesController,
    AdminDashboardController,
    AdminStudentsController,
    AdminEnrollmentsController,
    AdminPaymentsController,
    AdminContentController,
    AdminSlotsController,
    AdminClassSessionsController,
    AdminCentersController,
    AdminUsersController,
  ],
  providers: [
    RolesGuard,
    AdminScopeService,
    AdminApplicationsService,
    AdminSchedulesService,
    AdminDashboardService,
    AdminStudentsService,
    AdminEnrollmentsService,
    AdminPaymentsService,
    AdminContentService,
    AdminSlotsService,
    AdminClassSessionsService,
    AdminCentersService,
    AdminUsersService,
  ],
})
export class AdminModule {}
