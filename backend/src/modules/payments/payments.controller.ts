import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common"
import type { Request } from "express"
import { CurrentUser } from "../../common/current-user.decorator"
import { AuthUser } from "../auth/jwt.strategy"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { CheckoutDto } from "./dto/checkout.dto"
import { SepayWebhookDto } from "./dto/sepay-webhook.dto"
import { PaymentsService } from "./payments.service"
import { SepayConfigService } from "./sepay-config.service"

@Controller("payments")
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly sepayConfig: SepayConfigService,
  ) {}

  @Post("checkout")
  @UseGuards(JwtAuthGuard)
  checkout(@CurrentUser() user: AuthUser, @Body() body: CheckoutDto) {
    return this.paymentsService.checkout(user.userId, body)
  }

  @Get(":id/status")
  @UseGuards(JwtAuthGuard)
  status(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.paymentsService.getStatus(user.userId, id)
  }

  /** Staging/production: bắt buộc xác thực webhook SePay (SEPAY_WEBHOOK_HMAC_SECRET hoặc SEPAY_WEBHOOK_API_KEY). */
  @Post("sepay/webhook")
  sepayWebhook(
    @Req() req: Request,
    @Body() body: SepayWebhookDto,
    @Headers("authorization") _authorization?: string,
  ) {
    this.sepayConfig.verifyWebhookRequest(req)
    return this.paymentsService.handleSepayWebhook(body)
  }
}
