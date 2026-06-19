import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { BankQuestion } from "../../entities/bank-question.entity"
import { ExamAttempt } from "../../entities/exam-attempt.entity"
import { ExamPaper } from "../../entities/exam-paper.entity"
import { LicenseExamStructure } from "../../entities/license-exam-structure.entity"
import { LicenseQuestionPool } from "../../entities/license-question-pool.entity"
import { Question } from "../../entities/question.entity"
import { PremiumModule } from "../../common/premium.module"
import { AuthModule } from "../auth/auth.module"
import { ExamAssemblyService } from "./exam-assembly.service"
import { ExamsController } from "./exams.controller"
import { ExamsService } from "./exams.service"

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExamPaper,
      Question,
      ExamAttempt,
      BankQuestion,
      LicenseQuestionPool,
      LicenseExamStructure,
    ]),
    AuthModule,
    PremiumModule,
  ],
  controllers: [ExamsController],
  providers: [ExamsService, ExamAssemblyService],
})
export class ExamsModule {}
