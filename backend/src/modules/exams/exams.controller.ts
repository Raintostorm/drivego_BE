import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common"
import { CurrentUser } from "../../common/current-user.decorator"
import { AuthUser } from "../auth/jwt.strategy"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { SubmitAttemptDto } from "./dto/submit-attempt.dto"
import { ExamsService } from "./exams.service"

@Controller("exams")
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get("papers")
  @UseGuards(JwtAuthGuard)
  listPapers(@CurrentUser() user: AuthUser, @Query("licenseClass") licenseClass?: string) {
    return this.examsService.listPapers(user.userId, licenseClass)
  }

  @Get("attempts/history")
  @UseGuards(JwtAuthGuard)
  history(@CurrentUser() user: AuthUser) {
    return this.examsService.getHistory(user.userId)
  }

  @Post("random")
  @UseGuards(JwtAuthGuard)
  generateRandom(@CurrentUser() user: AuthUser, @Query("licenseClass") licenseClass?: string) {
    return this.examsService.generateRandomPaper(user.userId, licenseClass)
  }

  @Get(":paperId")
  @UseGuards(JwtAuthGuard)
  getPaper(@CurrentUser() user: AuthUser, @Param("paperId") paperId: string) {
    return this.examsService.getPaper(paperId, user.userId)
  }

  @Post(":paperId/attempts")
  @UseGuards(JwtAuthGuard)
  submitAttempt(
    @CurrentUser() user: AuthUser,
    @Param("paperId") paperId: string,
    @Body() body: SubmitAttemptDto,
  ) {
    return this.examsService.submitAttempt(user.userId, paperId, body)
  }
}
