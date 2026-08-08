import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common"
import { Roles } from "../../common/decorators/roles.decorator"
import { RolesGuard } from "../../common/guards/roles.guard"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { AuthUser } from "../auth/jwt.strategy"
import { AdminStudentsService } from "./admin-students.service"
import { UnlockCourseAdminDto } from "./dto/unlock-course-admin.dto"

@Controller("admin/students")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("center_admin", "system_admin")
export class AdminStudentsController {
  constructor(private readonly service: AdminStudentsService) {}

  @Get()
  list(
    @Req() req: { user: AuthUser },
    @Query("premium") premium?: string,
    @Query("enrolled") enrolled?: string,
    @Query("licenseClass") licenseClass?: string,
  ) {
    return this.service.list(req.user, { premium, enrolled, licenseClass })
  }

  @Get(":userId")
  getOne(@Req() req: { user: AuthUser }, @Param("userId") userId: string) {
    return this.service.getOne(req.user, userId)
  }

  @Patch(":userId/note")
  updateNote(
    @Req() req: { user: AuthUser },
    @Param("userId") userId: string,
    @Body() body: { adminNote?: string },
  ) {
    return this.service.updateNote(req.user, userId, body.adminNote ?? "")
  }

  @Post(":userId/unlock-course")
  unlockCourse(
    @Req() req: { user: AuthUser },
    @Param("userId") userId: string,
    @Body() body: UnlockCourseAdminDto,
  ) {
    return this.service.unlockCourse(req.user, userId, body)
  }
}
