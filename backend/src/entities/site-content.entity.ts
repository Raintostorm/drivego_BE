import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm"

@Entity("site_content")
export class SiteContent {
  @PrimaryColumn({ type: "varchar", length: 64 })
  key!: string

  @Column({ type: "jsonb" })
  value!: Record<string, unknown>

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date
}
