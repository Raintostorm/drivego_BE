import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common"
import { Roles } from "../../common/decorators/roles.decorator"
import { RolesGuard } from "../../common/guards/roles.guard"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { AuthUser } from "../auth/jwt.strategy"
import { AdminClassSessionsService } from "./admin-class-sessions.service"

@Controller("admin/class-sessions")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("center_admin", "system_admin")
export class AdminClassSessionsController {
  constructor(private readonly service: AdminClassSessionsService) {}

  @Get()
  list(@Req() req: { user: AuthUser }) {
    return this.service.list(req.user)
  }

  @Get("reports/attendance")
  report(@Req() req: { user: AuthUser }) {
    return this.service.attendanceReport(req.user)
  }

  @Post()
  create(@Req() req: { user: AuthUser }, @Body() body: Record<string, unknown>) {
    return this.service.create(req.user, body as never)
  }

  @Patch(":id")
  update(
    @Req() req: { user: AuthUser },
    @Param("id") id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.update(req.user, id, body as never)
  }

  @Delete(":id")
  remove(@Req() req: { user: AuthUser }, @Param("id") id: string) {
    return this.service.remove(req.user, id)
  }

  @Get(":id/attendance")
  listAttendance(@Req() req: { user: AuthUser }, @Param("id") id: string) {
    return this.service.listAttendance(req.user, id)
  }

  @Get(":id/students")
  listRoster(@Req() req: { user: AuthUser }, @Param("id") id: string) {
    return this.service.listRoster(req.user, id)
  }

  @Post(":id/students")
  assignStudent(
    @Req() req: { user: AuthUser },
    @Param("id") id: string,
    @Body() body: { userId: string; note?: string },
  ) {
    return this.service.assignStudent(req.user, id, body.userId, body.note)
  }

  @Delete(":id/students/:userId")
  removeStudent(
    @Req() req: { user: AuthUser },
    @Param("id") id: string,
    @Param("userId") userId: string,
  ) {
    return this.service.removeStudent(req.user, id, userId)
  }

  @Post(":id/attendance")
  checkIn(
    @Req() req: { user: AuthUser },
    @Param("id") id: string,
    @Body() body: { userId: string },
  ) {
    return this.service.checkInAdmin(req.user, id, body.userId)
  }
}
