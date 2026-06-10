import { Controller, Get, UseGuards } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { DataSource } from "typeorm"
import { Roles } from "../../common/decorators/roles.decorator"
import { RolesGuard } from "../../common/guards/roles.guard"
import { FirebaseAdminService } from "../../firebase/firebase-admin.service"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"

@Controller("health")
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly firebase: FirebaseAdminService,
  ) {}

  @Get()
  check() {
    return { status: "ok", service: "drivego-backend" }
  }

  @Get("config")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("center_admin", "system_admin")
  configCheck() {
    const has = (key: string) => Boolean(this.config.get<string>(key)?.trim())
    const uploadProvider = this.config.get<string>("UPLOAD_STORAGE_PROVIDER")?.trim() || "local"
    const production = this.config.get<string>("NODE_ENV") === "production"
    const warnings: string[] = []

    if (production && uploadProvider === "local") {
      warnings.push("UPLOAD_STORAGE_PROVIDER=local: file upload có thể mất khi Render redeploy nếu không gắn persistent disk.")
    }
    if (!has("RESEND_API_KEY") && !has("SMTP_USER")) {
      warnings.push("Chưa cấu hình email reset password (RESEND_API_KEY hoặc SMTP_USER).")
    }
    if (!has("SEPAY_WEBHOOK_API_KEY") && !has("SEPAY_WEBHOOK_HMAC_SECRET")) {
      warnings.push("Chưa cấu hình xác thực webhook SePay.")
    }

    return {
      status: "ok",
      checks: {
        database: this.dataSource.isInitialized,
        firebase: this.firebase.isConfigured(),
        resend: has("RESEND_API_KEY") && has("RESEND_FROM"),
        smtpFallback: has("SMTP_HOST") && has("SMTP_USER") && has("SMTP_PASS"),
        sepayCheckout:
          has("SEPAY_BANK_NAME") &&
          has("SEPAY_BANK_ACCOUNT") &&
          has("SEPAY_ACCOUNT_HOLDER"),
        sepayWebhook: has("SEPAY_WEBHOOK_API_KEY") || has("SEPAY_WEBHOOK_HMAC_SECRET"),
        gemini: has("GEMINI_API_KEY") && has("GEMINI_MODEL"),
        uploadStorage: uploadProvider,
      },
      warnings,
    }
  }
}
