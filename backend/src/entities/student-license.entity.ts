import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm"
import { TrainingCenter } from "./schedule-slot.entity"
import { User } from "./user.entity"

@Entity("student_licenses")
export class StudentLicense {
  @PrimaryGeneratedColumn("uuid") id!: string
  @Column({ name: "user_id", type: "uuid" }) userId!: string
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" }) user!: User
  @Column({ name: "center_id", type: "uuid", nullable: true }) centerId?: string | null
  @ManyToOne(() => TrainingCenter, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "center_id" }) center?: TrainingCenter | null
  @Column({ name: "license_number", type: "varchar", length: 64, nullable: true }) licenseNumber?: string | null
  @Column({ name: "license_class", type: "varchar", length: 16 }) licenseClass!: string
  @Column({ name: "legacy_class_code", type: "varchar", length: 16, nullable: true }) legacyClassCode?: string | null
  @Column({ name: "regulation_version", type: "varchar", length: 32, default: "from_2025" }) regulationVersion!: string
  @Column({ name: "issued_at", type: "date", nullable: true }) issuedAt?: string | null
  @Column({ name: "expires_at", type: "date", nullable: true }) expiresAt?: string | null
  @Column({ name: "issuing_authority", type: "varchar", length: 255, nullable: true }) issuingAuthority?: string | null
  @Column({ name: "verification_status", type: "varchar", length: 32, default: "unverified" }) verificationStatus!: string
  @Column({ name: "verification_source", type: "varchar", length: 32, default: "manual" }) verificationSource!: string
  @Column({ name: "source_document_id", type: "uuid", nullable: true }) sourceDocumentId?: string | null
  @Column({ name: "admin_note", type: "text", nullable: true }) adminNote?: string | null
  @Column({ name: "last_notified_stage", type: "varchar", length: 32, nullable: true }) lastNotifiedStage?: string | null
  @Column({ name: "verified_at", type: "timestamptz", nullable: true }) verifiedAt?: Date | null
  @Column({ name: "verified_by", type: "uuid", nullable: true }) verifiedBy?: string | null
  @CreateDateColumn({ name: "created_at", type: "timestamptz" }) createdAt!: Date
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" }) updatedAt!: Date
}

