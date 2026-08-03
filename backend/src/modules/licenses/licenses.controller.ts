import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common"
import { CurrentUser } from "../../common/current-user.decorator"
import { AuthUser } from "../auth/jwt.strategy"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { LicensesService } from "./licenses.service"

@Controller("licenses")
@UseGuards(JwtAuthGuard)
export class LicensesController {
  constructor(private readonly service: LicensesService) {}
  @Get("me") list(@CurrentUser() user: AuthUser) { return this.service.listMine(user.userId) }
  @Post("me") create(@CurrentUser() user: AuthUser, @Body() body: Record<string, string>) { return this.service.createMine(user.userId, body) }
  @Patch("me/:id") update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() body: Record<string, string>) { return this.service.updateMine(user.userId, id, body) }
}

