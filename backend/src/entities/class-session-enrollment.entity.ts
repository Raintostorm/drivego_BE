import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm"
import { ClassSession } from "./class-session.entity"
import { User } from "./user.entity"

@Entity("class_session_enrollments")
@Unique(["sessionId", "userId"])
export class ClassSessionEnrollment {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({ name: "session_id", type: "uuid" })
  sessionId!: string

  @ManyToOne(() => ClassSession, { onDelete: "CASCADE" })
  @JoinColumn({ name: "session_id" })
  session?: ClassSession

  @Column({ name: "user_id", type: "uuid" })
  userId!: string

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: User

  @Column({ type: "varchar", length: 16, default: "scheduled" })
  status!: "scheduled" | "attended" | "cancelled" | "absent"

  @Column({ name: "assigned_by", type: "uuid", nullable: true })
  assignedBy?: string | null

  @Column({ type: "text", nullable: true })
  note?: string | null

  @CreateDateColumn({ name: "assigned_at", type: "timestamptz" })
  assignedAt!: Date
}
