import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity("license_classes")
export class LicenseClass {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({ type: "varchar", length: 16, unique: true })
  code!: string

  @Column({ type: "numeric", precision: 12, scale: 2, nullable: true })
  price?: string | null

  @Column({ name: "enrollment_fee", type: "numeric", precision: 12, scale: 2, default: 755000 })
  enrollmentFee!: string

  @Column({ type: "text", nullable: true })
  description?: string | null

  @Column({ name: "questions_per_exam", type: "int", default: 30 })
  questionsPerExam!: number

  @Column({ name: "exam_duration_minutes", type: "int", default: 22 })
  examDurationMinutes!: number

  @Column({ name: "pass_min_correct", type: "int", default: 26 })
  passMinCorrect!: number

  @Column({ name: "bank_question_count", type: "int", default: 600 })
  bankQuestionCount!: number

  @Column({ name: "papers_count", type: "int", default: 20 })
  papersCount!: number
}
