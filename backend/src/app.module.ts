import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { DatabaseModule } from "./database/database.module"
import { FirebaseModule } from "./firebase/firebase.module"
import { EnrollmentModule } from "./common/enrollment.module"
import { ExamRulesModule } from "./common/exam-rules.module"
import { AdminModule } from "./modules/admin/admin.module"
import { ApplicationsModule } from "./modules/applications/applications.module"
import { ArticlesModule } from "./modules/articles/articles.module"
import { AuthModule } from "./modules/auth/auth.module"
import { ChatModule } from "./modules/chat/chat.module"
import { EnrollmentsModule } from "./modules/enrollments/enrollments.module"
import { ExamsModule } from "./modules/exams/exams.module"
import { HealthModule } from "./modules/health/health.module"
import { LookupModule } from "./modules/lookup/lookup.module"
import { NotificationsModule } from "./modules/notifications/notifications.module"
import { PaymentsModule } from "./modules/payments/payments.module"
import { PlansModule } from "./modules/plans/plans.module"
import { SchedulesModule } from "./modules/schedules/schedules.module"
import { SiteContentModule } from "./modules/site-content/site-content.module"
import { StudyModule } from "./modules/study/study.module"
import { SessionsModule } from "./modules/sessions/sessions.module"
import { UsersModule } from "./modules/users/users.module"
import { LicensesModule } from "./modules/licenses/licenses.module"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    EnrollmentModule,
    ExamRulesModule,
    FirebaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    LicensesModule,
    ExamsModule,
    StudyModule,
    SchedulesModule,
    NotificationsModule,
    ArticlesModule,
    PlansModule,
    PaymentsModule,
    ApplicationsModule,
    AdminModule,
    EnrollmentsModule,
    LookupModule,
    ChatModule,
    SessionsModule,
    SiteContentModule,
  ],
})
export class AppModule {}
