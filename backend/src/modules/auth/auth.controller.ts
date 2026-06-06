import { Body, Controller, Post } from "@nestjs/common"
import { AuthService } from "./auth.service"
import { ForgotPasswordDto, GoogleLoginDto, LoginDto, RegisterDto, ResetPasswordDto } from "./dto/auth.dto"

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(@Body() body: RegisterDto) {
    return this.authService.register(body)
  }

  @Post("login")
  login(@Body() body: LoginDto) {
    return this.authService.login(body)
  }

  @Post("google")
  google(@Body() body: GoogleLoginDto) {
    return this.authService.loginWithGoogle(body)
  }

  @Post("forgot-password")
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body)
  }

  @Post("reset-password")
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body)
  }
}
