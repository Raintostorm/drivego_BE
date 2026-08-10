import fs from "node:fs"
import path from "node:path"
import pg from "pg"

const ROOT = path.resolve(import.meta.dirname, "../..")
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error("DATABASE_URL is required")

const NOTES = [
  {
    email: "cao.minh.khang.14@gmail.com",
    note: "Hồ sơ đang được trung tâm kiểm tra. Chưa phát hành yêu cầu thanh toán cho đến khi hồ sơ được duyệt.",
  },
  {
    email: "kieuluongtuananh2001@gmail.com",
    note: "Học viên đã nộp hồ sơ nhưng chưa hoàn tất bước duyệt hồ sơ, vì vậy chưa có yêu cầu thanh toán.",
  },
]

const UNPAID_ORDERS = [
  {
    email: "duong.hoai.an.17@gmail.com",
    licenseClass: "A2",
    amount: 1900000,
    status: "pending",
    invoiceCode: "YCTT-20260723-DHA17",
    createdAt: "2026-07-23T09:15:00+07:00",
    note: "Hồ sơ đã duyệt, đã phát hành yêu cầu thanh toán nhưng học viên chưa chuyển khoản. Khóa học chưa được mở.",
  },
  {
    email: "truong.bao.ngoc.15@gmail.com",
    licenseClass: "A1",
    amount: 900000,
    status: "failed",
    invoiceCode: "YCTT-20260724-TBN15",
    createdAt: "2026-07-24T11:40:00+07:00",
    note: "Đã phát hành yêu cầu thanh toán nhưng giao dịch chưa đối soát được do nội dung chuyển khoản không khớp. Khóa học chưa được mở.",
  },
]

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") ? undefined : { rejectUnauthorized: false },
})

await client.connect()
try {
  await client.query("BEGIN")

  const snapshot = await client.query(`
    SELECT 'payment' AS kind, pay.id::text AS id, u.email, pay.status, pay.payment_type, pay.license_class, pay.amount::text
    FROM payments pay JOIN users u ON u.id = pay.user_id
    UNION ALL
    SELECT 'attempt' AS kind, ea.id::text AS id, u.email, NULL, NULL, NULL, NULL
    FROM exam_attempts ea JOIN users u ON u.id = ea.user_id
    UNION ALL
    SELECT 'exam_registration' AS kind, er.id::text AS id, u.email, er.status, NULL, NULL, NULL
    FROM exam_registrations er JOIN users u ON u.id = er.user_id
  `)
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  fs.writeFileSync(path.join(ROOT, "outputs", `neon-before-unpaid-flow-normalization-${stamp}.json`), JSON.stringify(snapshot.rows, null, 2))

  // This seeded female student follows the current A1 rule; the old A2 records are invalid.
  await client.query(
    `UPDATE license_applications la SET license_class = 'A1'
     FROM users u WHERE u.id = la.user_id AND lower(u.email) = 'truong.bao.ngoc.15@gmail.com'`,
  )
  await client.query(
    `UPDATE student_profiles sp SET license_class = 'A1'
     FROM users u WHERE u.id = sp.user_id AND lower(u.email) = 'truong.bao.ngoc.15@gmail.com'`,
  )

  for (const item of NOTES) {
    await client.query(
      `UPDATE license_applications la SET admin_note = $2
       FROM users u WHERE u.id = la.user_id AND lower(u.email) = lower($1)`,
      [item.email, item.note],
    )
  }

  for (const item of UNPAID_ORDERS) {
    const user = await client.query(`SELECT id FROM users WHERE lower(email) = lower($1)`, [item.email])
    if (!user.rowCount) throw new Error(`Student not found: ${item.email}`)
    const customerInfo = {
      invoiceCode: item.invoiceCode,
      source: "student_checkout",
      note: item.note,
      paymentIssueReason: item.note,
    }
    const existing = await client.query(`SELECT id FROM payments WHERE customer_info ->> 'invoiceCode' = $1`, [item.invoiceCode])
    if (existing.rowCount) {
      await client.query(
        `UPDATE payments SET user_id = $2, payment_type = 'enrollment', license_class = $3, amount = $4,
         method = 'sepay', status = $5, customer_info = $6::jsonb, created_at = $7::timestamptz WHERE id = $1`,
        [existing.rows[0].id, user.rows[0].id, item.licenseClass, item.amount, item.status, JSON.stringify(customerInfo), item.createdAt],
      )
    } else {
      await client.query(
        `INSERT INTO payments (user_id, payment_type, license_class, amount, method, status, customer_info, created_at)
         VALUES ($1, 'enrollment', $2, $3, 'sepay', $4, $5::jsonb, $6::timestamptz)`,
        [user.rows[0].id, item.licenseClass, item.amount, item.status, JSON.stringify(customerInfo), item.createdAt],
      )
    }
  }

  // Test history and registrations are only valid when the exact course class is unlocked.
  const attemptsRemoved = await client.query(
    `DELETE FROM exam_attempts ea
     USING exam_papers ep
     WHERE ep.id = ea.paper_id
       AND NOT EXISTS (
         SELECT 1 FROM course_enrollments ce
         WHERE ce.user_id = ea.user_id AND ce.status = 'active' AND ce.license_class = ep.license_class
       )`,
  )
  const registrationsRemoved = await client.query(
    `DELETE FROM exam_registrations er
     USING schedule_slots ss
     WHERE ss.id = er.slot_id
       AND NOT EXISTS (
         SELECT 1 FROM course_enrollments ce
         WHERE ce.user_id = er.user_id AND ce.status = 'active' AND ce.license_class = ss.license_class
       )`,
  )
  const attendanceRemoved = await client.query(
    `DELETE FROM session_attendance sa
     USING class_sessions cs
     WHERE cs.id = sa.session_id
       AND NOT EXISTS (
         SELECT 1 FROM course_enrollments ce
         WHERE ce.user_id = sa.user_id AND ce.status = 'active' AND ce.license_class = cs.license_class
       )`,
  )

  await client.query("COMMIT")
  console.log(JSON.stringify({
    unpaidOrdersPrepared: UNPAID_ORDERS.map(({ email, status, invoiceCode }) => ({ email, status, invoiceCode })),
    attemptsRemoved: attemptsRemoved.rowCount,
    registrationsRemoved: registrationsRemoved.rowCount,
    attendanceRemoved: attendanceRemoved.rowCount,
  }, null, 2))
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  await client.end()
}
