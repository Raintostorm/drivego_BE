import {
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { JwtService } from "@nestjs/jwt"
import { InjectRepository } from "@nestjs/typeorm"
import * as bcrypt from "bcryptjs"
import { promises as dns } from "dns"
import { randomBytes, randomUUID } from "crypto"
import nodemailer from "nodemailer"
import type SMTPTransport from "nodemailer/lib/smtp-transport"
import { DataSource, Repository } from "typeorm"
import { FirebaseAdminService } from "../../firebase/firebase-admin.service"
import { PasswordResetToken } from "../../entities/password-reset-token.entity"
import { StudentProfile } from "../../entities/student-profile.entity"
import { User } from "../../entities/user.entity"
import { DEFAULT_LICENSE_CLASS } from "../../common/license-class.constants"
import { ForgotPasswordDto, GoogleLoginDto, LoginDto, RegisterDto, ResetPasswordDto, UserRole } from "./dto/auth.dto"
import { JwtPayload } from "./jwt.strategy"

export type AuthResponseUser = {
  id: string
  email: string
  role: string
  fullName: string | null
}

export type AuthResponse = {
  accessToken: string
  user: AuthResponseUser
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000
const FORGOT_PASSWORD_MESSAGE =
  "Nếu email tồn tại trong hệ thống, DriveGo đã gửi hướng dẫn đặt lại mật khẩu."

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(StudentProfile)
    private readonly profilesRepo: Repository<StudentProfile>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokensRepo: Repository<PasswordResetToken>,
    private readonly jwtService: JwtService,
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } })
    if (existing) {
      throw new ConflictException("Email đã được sử dụng")
    }

    const role = UserRole.STUDENT
    const passwordHash = await bcrypt.hash(dto.password, 10)

    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      role,
    })
    await this.usersRepo.save(user)

    if (role === UserRole.STUDENT) {
      const profile = this.profilesRepo.create({
        userId: user.id,
        fullName: dto.fullName ?? null,
        phone: dto.phone ?? null,
        licenseClass: dto.licenseClass ?? DEFAULT_LICENSE_CLASS,
        heldLicenses: [],
      })
      await this.profilesRepo.save(profile)
      user.profile = profile
    }

    return this.buildAuthResponse(user)
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersRepo.findOne({
      where: { email: dto.email },
      relations: { profile: true },
    })

    if (!user) {
      throw new UnauthorizedException("Email hoặc mật khẩu không đúng")
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) {
      throw new UnauthorizedException("Email hoặc mật khẩu không đúng")
    }

    return this.buildAuthResponse(user)
  }

  async loginWithGoogle(dto: GoogleLoginDto): Promise<AuthResponse> {
    if (!this.firebaseAdmin.isConfigured()) {
      throw new ServiceUnavailableException(
        "Google Sign-in chưa cấu hình trên server (FIREBASE_PROJECT_ID / FIREBASE_SERVICE_ACCOUNT_BASE64)",
      )
    }

    let decoded: Awaited<ReturnType<FirebaseAdminService["verifyIdToken"]>>
    try {
      decoded = await this.firebaseAdmin.verifyIdToken(dto.idToken)
    } catch {
      throw new UnauthorizedException("Token Google không hợp lệ hoặc đã hết hạn")
    }

    const email = decoded.email
    if (!email) {
      throw new UnauthorizedException("Tài khoản Google không có email")
    }

    const fullName = decoded.name ?? null

    let user = await this.usersRepo.findOne({
      where: { email },
      relations: { profile: true },
    })

    if (!user) {
      const passwordHash = await bcrypt.hash(randomUUID(), 10)
      user = this.usersRepo.create({
        email,
        passwordHash,
        role: UserRole.STUDENT,
      })
      await this.usersRepo.save(user)

      const profile = this.profilesRepo.create({
        userId: user.id,
        fullName,
        phone: null,
        licenseClass: DEFAULT_LICENSE_CLASS,
        heldLicenses: [],
      })
      await this.profilesRepo.save(profile)
      user.profile = profile
    } else if (fullName && user.profile && !user.profile.fullName) {
      user.profile.fullName = fullName
      await this.profilesRepo.save(user.profile)
    } else if (fullName && !user.profile) {
      const profile = this.profilesRepo.create({
        userId: user.id,
        fullName,
        phone: null,
        licenseClass: DEFAULT_LICENSE_CLASS,
        heldLicenses: [],
      })
      await this.profilesRepo.save(profile)
      user.profile = profile
    }

    return this.buildAuthResponse(user)
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    await this.ensurePasswordResetTable()
    const email = dto.email.trim().toLowerCase()
    const user = await this.usersRepo.findOne({ where: { email } })
    if (!user) {
      return { message: FORGOT_PASSWORD_MESSAGE }
    }

    const token = randomBytes(32).toString("hex")
    await this.resetTokensRepo.delete({ userId: user.id })
    await this.resetTokensRepo.save(
      this.resetTokensRepo.create({
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      }),
    )

    await this.sendPasswordResetEmail(email, token)
    return { message: FORGOT_PASSWORD_MESSAGE }
  }

  async resetPassword(dto: ResetPasswordDto) {
    await this.ensurePasswordResetTable()
    const row = await this.resetTokensRepo.findOne({
      where: { token: dto.token },
      relations: { user: true },
    })
    if (!row || !row.user || row.expiresAt.getTime() < Date.now()) {
      if (row) await this.resetTokensRepo.delete({ id: row.id })
      throw new UnauthorizedException("Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn")
    }

    row.user.passwordHash = await bcrypt.hash(dto.password, 10)
    await this.usersRepo.save(row.user)
    await this.resetTokensRepo.delete({ id: row.id })

    return { message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới." }
  }

  private async sendPasswordResetEmail(email: string, token: string) {
    const frontendUrl = this.config.get<string>("FRONTEND_URL")?.replace(/\/$/, "")
    if (!frontendUrl) {
      this.logger.error("Password reset email is unavailable: missing FRONTEND_URL")
      throw new ServiceUnavailableException("Dịch vụ đặt lại mật khẩu tạm thời chưa sẵn sàng")
    }

    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`
    const resendKey = this.config.get<string>("RESEND_API_KEY")?.trim()
    if (resendKey) {
      await this.sendPasswordResetWithResend(email, resetUrl, resendKey)
      return
    }

    const host = this.config.get<string>("SMTP_HOST")
    const port = Number(this.config.get<string>("SMTP_PORT") ?? 587)
    const secureRaw = this.config.get<string>("SMTP_SECURE")?.trim().toLowerCase()
    const secure = secureRaw ? secureRaw === "true" : port === 465
    const user = this.config.get<string>("SMTP_USER")
    const pass = this.config.get<string>("SMTP_PASS")
    const from = this.config.get<string>("MAIL_FROM") ?? user
    if (!host || !user || !pass || !from) {
      this.logger.error("Password reset SMTP fallback is unavailable: missing SMTP env")
      throw new ServiceUnavailableException(
        "Dịch vụ đặt lại mật khẩu tạm thời chưa sẵn sàng",
      )
    }

    const smtpHost = await this.resolveSmtpHost(host)
    const mailOptions = {
      host: smtpHost,
      port,
      secure,
      family: 4,
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 12_000,
      tls: { servername: host },
      auth: { user, pass },
    } as SMTPTransport.Options & {
      family: 4
      connectionTimeout: number
      greetingTimeout: number
      socketTimeout: number
    }
    const transporter = nodemailer.createTransport(mailOptions)

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: "Đặt lại mật khẩu DriveGo",
        text: [
          "Bạn vừa yêu cầu đặt lại mật khẩu DriveGo.",
          `Mở link sau trong 60 phút để tạo mật khẩu mới: ${resetUrl}`,
          "Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.",
        ].join("\n\n"),
        html: `
          <p>Bạn vừa yêu cầu đặt lại mật khẩu DriveGo.</p>
          <p><a href="${resetUrl}">Đặt lại mật khẩu</a></p>
          <p>Link có hiệu lực trong 60 phút. Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.</p>
        `,
      })
    } catch (err) {
      this.logger.error(
        `Password reset SMTP send failed: ${err instanceof Error ? err.message : err}`,
      )
      throw new ServiceUnavailableException(
        "Chưa gửi được email đặt lại mật khẩu. Vui lòng thử lại sau.",
      )
    }
  }

  private async sendPasswordResetWithResend(email: string, resetUrl: string, apiKey: string) {
    const from = this.config.get<string>("RESEND_FROM")?.trim() || "DriveGo <no-reply@drivego.space>"
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Đặt lại mật khẩu DriveGo",
        text: [
          "Bạn vừa yêu cầu đặt lại mật khẩu DriveGo.",
          `Mở link sau trong 60 phút để tạo mật khẩu mới: ${resetUrl}`,
          "Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.",
        ].join("\n\n"),
        html: `
          <p>Bạn vừa yêu cầu đặt lại mật khẩu DriveGo.</p>
          <p><a href="${resetUrl}">Đặt lại mật khẩu</a></p>
          <p>Link có hiệu lực trong 60 phút. Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.</p>
        `,
      }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      const message = data?.message ?? data?.error ?? response.statusText
      this.logger.error(`Password reset Resend send failed: ${response.status} ${message}`)
      throw new ServiceUnavailableException(
        "Chưa gửi được email đặt lại mật khẩu. Vui lòng thử lại sau.",
      )
    }
  }

  private async resolveSmtpHost(host: string) {
    try {
      const addresses = await dns.resolve4(host)
      return addresses[0] ?? host
    } catch {
      return host
    }
  }

  private async ensurePasswordResetTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL
      )
    `)
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
        ON password_reset_tokens(user_id)
    `)
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
        ON password_reset_tokens(expires_at)
    `)
  }

  private buildAuthResponse(user: User): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.profile?.fullName ?? null,
      },
    }
  }
}
