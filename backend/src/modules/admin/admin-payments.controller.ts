import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common"
import { Roles } from "../../common/decorators/roles.decorator"
import { RolesGuard } from "../../common/guards/roles.guard"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { AuthUser } from "../auth/jwt.strategy"
import { AdminPaymentsService } from "./admin-payments.service"
import { ManualConfirmPaymentDto } from "./dto/manual-confirm-payment.dto"

@Controller("admin/payments")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("center_admin", "system_admin")
export class AdminPaymentsController {
  constructor(private readonly service: AdminPaymentsService) {}

  @Get()
  list(
    @Req() req: { user: AuthUser },
    @Query("status") status?: string,
    @Query("paymentType") paymentType?: string,
  ) {
    return this.service.list(req.user, { status, paymentType })
  }

  @Post(":id/confirm")
  confirmManual(
    @Req() req: { user: AuthUser },
    @Param("id") id: string,
    @Body() body: ManualConfirmPaymentDto,
  ) {
    return this.service.confirmManual(req.user, id, body.note)
  }
}
