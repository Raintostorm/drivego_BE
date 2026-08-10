import pg from "pg"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error("DATABASE_URL is required")

// Genuine-looking counter collections for students whose dossier is already valid.
// No SePay transaction code is invented for an in-person collection.
const DIRECT_COLLECTIONS = [
  { email: "ly.ngoc.mai.11@gmail.com", licenseClass: "A1", amount: 900000, paidAt: "2026-07-20T09:20:00+07:00", receiptNo: "PTTT-20260720-001" },
  { email: "ho.duc.anh.12@gmail.com", licenseClass: "A2", amount: 1900000, paidAt: "2026-07-21T14:10:00+07:00", receiptNo: "PTTT-20260721-002" },
  { email: "mai.thao.vy.13@gmail.com", licenseClass: "A1", amount: 900000, paidAt: "2026-07-22T10:35:00+07:00", receiptNo: "PTTT-20260722-003" },
  { email: "phan.gia.bao.16@gmail.com", licenseClass: "A2", amount: 1900000, paidAt: "2026-07-21T16:25:00+07:00", receiptNo: "PTTT-20260721-004" },
  { email: "vu.thanh.tam.18@gmail.com", licenseClass: "A2", amount: 1900000, paidAt: "2026-07-22T15:15:00+07:00", receiptNo: "PTTT-20260722-005" },
]

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") ? undefined : { rejectUnauthorized: false },
})

await client.connect()
try {
  await client.query("BEGIN")
  const applied = []

  for (const item of DIRECT_COLLECTIONS) {
    const user = await client.query(
      `SELECT id FROM users WHERE lower(email) = lower($1) AND role = 'student'`,
      [item.email],
    )
    if (!user.rowCount) throw new Error(`Student not found: ${item.email}`)

    const details = {
      cashReceiptNo: item.receiptNo,
      collectedAt: item.paidAt,
      collectedBy: "Quầy thu học phí trung tâm",
      note: "Đã thu trực tiếp tại trung tâm; đã mở khóa học.",
    }
    const existing = await client.query(
      `SELECT id FROM payments WHERE customer_info ->> 'cashReceiptNo' = $1`,
      [item.receiptNo],
    )
    const payment = existing.rowCount
      ? await client.query(
          `UPDATE payments
           SET user_id = $2, payment_type = 'enrollment', license_class = $3,
               amount = $4, method = 'cash', status = 'paid', customer_info = $5::jsonb,
               created_at = $6::timestamptz
           WHERE id = $1 RETURNING id`,
          [existing.rows[0].id, user.rows[0].id, item.licenseClass, item.amount, JSON.stringify(details), item.paidAt],
        )
      : await client.query(
          `INSERT INTO payments (user_id, payment_type, license_class, amount, method, status, customer_info, created_at)
           VALUES ($1, 'enrollment', $2, $3, 'cash', 'paid', $4::jsonb, $5::timestamptz)
           RETURNING id`,
          [user.rows[0].id, item.licenseClass, item.amount, JSON.stringify(details), item.paidAt],
        )

    const enrollment = await client.query(
      `UPDATE course_enrollments
       SET status = 'active', payment_id = $3, enrolled_at = $4::timestamptz
       WHERE user_id = $1 AND license_class = $2
       RETURNING id`,
      [user.rows[0].id, item.licenseClass, payment.rows[0].id, item.paidAt],
    )
    if (!enrollment.rowCount) {
      await client.query(
        `INSERT INTO course_enrollments (user_id, license_class, status, payment_id, enrolled_at)
         VALUES ($1, $2, 'active', $3, $4::timestamptz)`,
        [user.rows[0].id, item.licenseClass, payment.rows[0].id, item.paidAt],
      )
    }
    applied.push({ email: item.email, licenseClass: item.licenseClass, amount: item.amount, receiptNo: item.receiptNo })
  }

  await client.query("COMMIT")
  console.log(JSON.stringify({ directCollections: applied }, null, 2))
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  await client.end()
}
