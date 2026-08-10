import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from "typeorm"
import { User } from "./user.entity"

@Entity("student_profiles")
export class StudentProfile {
  @PrimaryColumn({ name: "user_id", type: "uuid" })
  userId!: string

  @OneToOne(() => User, (user) => user.profile, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User

  @Column({ name: "full_name", type: "varchar", length: 255, nullable: true })
  fullName?: string | null

  @Column({ type: "varchar", length: 32, nullable: true })
  phone?: string | null

  @Column({ name: "license_class", type: "varchar", length: 16, nullable: true })
  licenseClass?: string | null

  @Column({ name: "center_id", type: "uuid", nullable: true })
  centerId?: string | null

  @Column({ name: "premium_until", type: "timestamptz", nullable: true })
  premiumUntil?: Date | null

  @Column({ name: "premium_lifetime", type: "boolean", default: false })
  premiumLifetime!: boolean

  /** Các hạng GPLX học viên đang có (A1, B2, …) */
  @Column({ name: "held_licenses", type: "jsonb", default: () => "'[]'" })
  heldLicenses!: string[]

  @Column({ name: "admin_note", type: "text", nullable: true })
  adminNote?: string | null
}
