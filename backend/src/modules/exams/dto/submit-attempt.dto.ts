import { IsObject, IsString } from "class-validator"

export class SubmitAttemptDto {
  @IsObject()
  answers!: Record<string, number>

  @IsString()
  startedAt!: string
}
