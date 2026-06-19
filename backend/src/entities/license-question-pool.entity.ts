import { Column, Entity, PrimaryColumn } from "typeorm"

@Entity("license_question_pool")
export class LicenseQuestionPool {
  @PrimaryColumn({ name: "license_class", type: "varchar", length: 16 })
  licenseClass!: string

  @PrimaryColumn({ name: "bank_number", type: "int" })
  bankNumber!: number
}
