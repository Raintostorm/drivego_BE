import { Column, Entity, PrimaryColumn } from "typeorm"

@Entity("license_exam_structure")
export class LicenseExamStructure {
  @PrimaryColumn({ name: "license_class", type: "varchar", length: 16 })
  licenseClass!: string

  @PrimaryColumn({ name: "slot_type", type: "varchar", length: 8 })
  slotType!: string

  @Column({ type: "int" })
  quota!: number

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder!: number
}
