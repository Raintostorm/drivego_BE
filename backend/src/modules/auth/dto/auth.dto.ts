import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator"
import { STUDY_LICENSE_CODES } from "../../../common/license-class.constants"

export enum UserRole {
  STUDENT = "student",
  CENTER_ADMIN = "center_admin",
  SYSTEM_ADMIN = "system_admin",
}

export class RegisterDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string

  @IsOptional()
  @IsString()
  fullName?: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  @IsIn([...STUDY_LICENSE_CODES])
  licenseClass?: string
}

export class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  password!: string
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string
}

export class ResetPasswordDto {
  @IsString()
  token!: string

  @IsString()
  @MinLength(8)
  password!: string
}

export class GoogleLoginDto {
  @IsString()
  idToken!: string
}
