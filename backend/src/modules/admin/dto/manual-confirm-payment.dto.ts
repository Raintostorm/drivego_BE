import { IsOptional, IsString, MaxLength } from "class-validator"

export class ManualConfirmPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string
}
