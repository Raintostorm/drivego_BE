import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ApplicationDocument } from "../entities/application-document.entity"
import { CourseEnrollment } from "../entities/course-enrollment.entity"
import { ChatMessage } from "../entities/chat-message.entity"
import { ChatSession } from "../entities/chat-session.entity"
import { LicenseApplication } from "../entities/license-application.entity"
import { DocumentArticle } from "../entities/document-article.entity"
import { ExamAttempt } from "../entities/exam-attempt.entity"
import { ExamPaper } from "../entities/exam-paper.entity"
import { LicenseClass } from "../entities/license-class.entity"
import { LookupRecord } from "../entities/lookup-record.entity"
import { Notification } from "../entities/notification.entity"
import { Question } from "../entities/question.entity"
import { ClassSession } from "../entities/class-session.entity"
import { SessionAttendance } from "../entities/session-attendance.entity"
import { ExamRegistration, ScheduleSlot, TrainingCenter } from "../entities/schedule-slot.entity"
import { Payment } from "../entities/payment.entity"
import { StudentProfile } from "../entities/student-profile.entity"
import { StudyChapter } from "../entities/study-chapter.entity"
import { StudyProgress } from "../entities/study-progress.entity"
import { SubscriptionPlan } from "../entities/subscription-plan.entity"
import { User } from "../entities/user.entity"

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>("DATABASE_URL")
        if (!url) {
          throw new Error("DATABASE_URL is required in backend/.env")
        }
        return {
          type: "postgres" as const,
          url,
          entities: [
            User,
            StudentProfile,
            LookupRecord,
            ExamPaper,
            Question,
            ExamAttempt,
            StudyChapter,
            StudyProgress,
            LicenseClass,
            Notification,
            ScheduleSlot,
            TrainingCenter,
            ExamRegistration,
            DocumentArticle,
            SubscriptionPlan,
            Payment,
            ChatSession,
            ChatMessage,
            LicenseApplication,
            ApplicationDocument,
            CourseEnrollment,
            ClassSession,
            SessionAttendance,
          ],
          synchronize: false,
        }
      },
    }),
  ],
})
export class DatabaseModule {}
