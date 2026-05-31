import { IsArray, IsOptional, IsString, MaxLength } from "class-validator"
import { IsUUID } from "class-validator"

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(16)
  licenseClass?: string

  /** Hạng GPLX đang có */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(16, { each: true })
  heldLicenses?: string[]

  @IsOptional()
  @IsUUID()
  centerId?: string
}
