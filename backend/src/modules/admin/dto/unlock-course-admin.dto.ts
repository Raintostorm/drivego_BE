import { IsIn, IsOptional, IsString } from "class-validator"
import { STUDY_LICENSE_CODES } from "../../../common/license-class.constants"

export class UnlockCourseAdminDto {
  @IsIn(STUDY_LICENSE_CODES)
  licenseClass!: string

  @IsOptional()
  @IsString()
  note?: string
}
