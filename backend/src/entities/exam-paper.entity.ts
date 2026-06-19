import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { Question } from "./question.entity"

@Entity("exam_papers")
export class ExamPaper {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({ name: "license_class", type: "varchar", length: 16 })
  licenseClass!: string

  @Column({ name: "paper_number", type: "int" })
  paperNumber!: number

  @Column({ name: "question_count", type: "int" })
  questionCount!: number

  @Column({ name: "is_mock", type: "boolean", default: true })
  isMock!: boolean

  @Column({ name: "is_generated", type: "boolean", default: false })
  isGenerated!: boolean

  @Column({ name: "created_at", type: "timestamptz", default: () => "NOW()" })
  createdAt!: Date

  @OneToMany(() => Question, (question) => question.paper)
  questions?: Question[]
}
