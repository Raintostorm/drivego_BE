import { Transform } from "class-transformer"
import { IsIn, IsInt, IsOptional, IsString } from "class-validator"

function toNumber(value: unknown) {
  if (typeof value === "number") return value
  if (typeof value !== "string") return value
  const normalized = value.replace(/[^\d.-]/g, "")
  return normalized ? Number(normalized) : value
}

export class SepayWebhookDto {
  @Transform(({ value }) => toNumber(value))
  @IsInt()
  id!: number

  @IsOptional()
  @IsString()
  gateway?: string

  @IsOptional()
  @IsString()
  transactionDate?: string

  @IsOptional()
  @IsString()
  accountNumber?: string

  @IsOptional()
  @IsString()
  subAccount?: string

  @IsOptional()
  @IsString()
  code?: string | null

  @IsOptional()
  @IsString()
  content?: string

  @Transform(({ value }) => (typeof value === "string" ? value.toLowerCase() : value))
  @IsString()
  @IsIn(["in", "out"])
  transferType!: string

  @IsOptional()
  @IsString()
  description?: string

  @Transform(({ value }) => toNumber(value))
  @IsInt()
  transferAmount!: number

  @IsOptional()
  @Transform(({ value }) => toNumber(value))
  @IsInt()
  accumulated?: number

  @IsOptional()
  @IsString()
  referenceCode?: string
}
