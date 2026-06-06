import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { JwtModule } from "@nestjs/jwt"
import { PassportModule } from "@nestjs/passport"
import { TypeOrmModule } from "@nestjs/typeorm"
import { StudentProfile } from "../../entities/student-profile.entity"
import { PasswordResetToken } from "../../entities/password-reset-token.entity"
import { User } from "../../entities/user.entity"
import { AuthController } from "./auth.controller"
import { AuthService } from "./auth.service"
import { JwtStrategy } from "./jwt.strategy"
import { OptionalJwtAuthGuard } from "./optional-jwt-auth.guard"

@Module({
  imports: [
    TypeOrmModule.forFeature([User, StudentProfile, PasswordResetToken]),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET")?.trim()
        if (!secret) {
          throw new Error("Missing JWT_SECRET in environment")
        }
        return {
          secret,
          signOptions: { expiresIn: "7d" },
        }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, OptionalJwtAuthGuard],
  exports: [AuthService, JwtModule, PassportModule, OptionalJwtAuthGuard],
})
export class AuthModule {}
