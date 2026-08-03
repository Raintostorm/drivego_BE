import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from "@nestjs/common"
import { Roles } from "../../common/decorators/roles.decorator"
import { RolesGuard } from "../../common/guards/roles.guard"
import { AuthUser } from "../auth/jwt.strategy"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { LicensesService } from "../licenses/licenses.service"
import { AdminScopeService } from "./admin-scope.service"

@Controller("admin/licenses")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("center_admin", "system_admin")
export class AdminLicensesController {
  constructor(private readonly licenses: LicensesService, private readonly scope: AdminScopeService) {}
  @Get()
  async list(@Req() req: { user: AuthUser }, @Query("q") q?: string) {
    return this.licenses.listAdmin(await this.scope.getCenterIdForAdmin(req.user), q)
  }
  @Patch(":id/review")
  async review(@Req() req: { user: AuthUser }, @Param("id") id: string, @Body() body: { status?: string; adminNote?: string }) {
    return this.licenses.review(req.user.userId, await this.scope.getCenterIdForAdmin(req.user), id, body)
  }
}

