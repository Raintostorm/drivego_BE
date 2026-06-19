import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity("bank_questions")
export class BankQuestion {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({ name: "bank_number", type: "int", unique: true })
  bankNumber!: number

  @Column({ type: "varchar", length: 4 })
  category!: string

  @Column({ type: "text" })
  body!: string

  @Column({ name: "image_url", type: "text", nullable: true })
  imageUrl?: string | null

  @Column({ type: "jsonb" })
  answers!: string[]

  @Column({ name: "correct_index", type: "int" })
  correctIndex!: number

  @Column({ name: "is_critical", type: "boolean", default: false })
  isCritical!: boolean
}
