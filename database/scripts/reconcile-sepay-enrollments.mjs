import fs from "node:fs"
import path from "node:path"
import pg from "pg"

const ROOT = path.resolve(import.meta.dirname, "../..")
const INPUT_PATH = path.join(ROOT, "outputs", "sepay-excel-parsed.json")
const OUTPUT_DIR = path.join(ROOT, "outputs")
const TEST_EMAILS = new Set(["corenahnoab@gmail.com", "trunglontq1@gmail.com"])

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error("DATABASE_URL is required")
if (!fs.existsSync(INPUT_PATH)) throw new Error(`Missing SePay export: ${INPUT_PATH}`)

const rows = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"))
const fullPaymentCode = (content) => String(content ?? "").match(/\bDH[A-Z0-9]{12}\b/i)?.[0]?.toUpperCase() ?? null
const expectedPayment = (amount) => {
  const value = Number(amount)
  if (value === 900000) return { paymentType: "enrollment", licenseClass: "A1" }
  if (value === 1900000) return { paymentType: "enrollment", licenseClass: "A2" }
  if (value === 99000) return { paymentType: "premium", licenseClass: null }
  return null
}

const sepayRows = rows.map((row) => ({ ...row, code: fullPaymentCode(row.content), expected: expectedPayment(row.amount) }))
for (const row of sepayRows) {
  if (!row.code || !row.expected) throw new Error(`Invalid SePay source row ${row.id}`)
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") ? undefined : { rejectUnauthorized: false },
})

await client.connect()
try {
  await client.query("BEGIN")

  const snapshot = await client.query(`
    SELECT pay.*, u.email, ce.license_class AS enrollment_class, ce.status AS enrollment_status
    FROM payments pay
    JOIN users u ON u.id = pay.user_id
    LEFT JOIN course_enrollments ce ON ce.payment_id = pay.id
    WHERE u.role = 'student'
    ORDER BY pay.created_at DESC
  `)
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  fs.writeFileSync(
    path.join(OUTPUT_DIR, `neon-before-sepay-reconciliation-${stamp}.json`),
    JSON.stringify(snapshot.rows, null, 2),
  )

  const paymentByCode = new Map()
  const paymentRows = await client.query(`
    SELECT pay.id, pay.user_id, pay.customer_info, u.email
    FROM payments pay JOIN users u ON u.id = pay.user_id
    WHERE u.role = 'student'
  `)
  for (const payment of paymentRows.rows) {
    const info = payment.customer_info ?? {}
    const code = String(info.paymentCode ?? "").toUpperCase()
    if (code) paymentByCode.set(code, payment)
  }

  let sepayUpdated = 0
  const reconciledPaymentIds = []
  for (const row of sepayRows) {
    const payment = paymentByCode.get(row.code)
    if (!payment) throw new Error(`No payment record found for SePay code ${row.code}`)
    const info = payment.customer_info ?? {}
    await client.query(
      `UPDATE payments
       SET amount = $2, payment_type = $3, license_class = $4, method = 'sepay', status = 'paid',
           customer_info = $5::jsonb
       WHERE id = $1`,
      [
        payment.id,
        row.amount,
        row.expected.paymentType,
        row.expected.licenseClass,
        JSON.stringify({
          ...info,
          paymentCode: row.code,
          excelPaymentCode: row.paymentCode,
          sepayTransactionId: String(row.id),
          sepayReferenceCode: row.referenceCode,
          sepayGateway: row.bank,
          bankAccount: row.account,
          bankAccountOwner: row.owner,
          transferContent: row.content,
          importedFrom: "sepay-history-excel",
          reconciliationNote: "Đối soát từ lịch sử giao dịch SePay.",
        }),
      ],
    )
    reconciledPaymentIds.push(payment.id)
    sepayUpdated += 1
  }

  // Old seed entries represent money collected at the centre, never SePay.
  const cashUpdated = await client.query(
    `UPDATE payments SET method = 'cash'
     WHERE method = 'seed' AND status = 'paid' AND payment_type = 'enrollment'`,
  )

  // The spreadsheet is the sole source of truth for seeded student payments.
  // Preserve the two explicitly requested demo accounts, but remove every other
  // payment that cannot be proven by one of the 27 SePay payment codes.
  const paymentsDeletedOutsideExcel = await client.query(
    `DELETE FROM payments pay
     USING users u
     WHERE u.id = pay.user_id
       AND u.role = 'student'
       AND lower(u.email) <> ALL($1::text[])
       AND upper(COALESCE(pay.customer_info ->> 'paymentCode', '')) <> ALL($2::text[])
       AND NOT (
         pay.method = 'cash'
         AND pay.status = 'paid'
         AND pay.customer_info ? 'cashReceiptNo'
       )`,
    [[...TEST_EMAILS], sepayRows.map((row) => row.code)],
  )

  // Rebuild active courses from paid enrollment payments. Test accounts retain their own demo state.
  const reset = await client.query(
    `DELETE FROM course_enrollments ce
     USING users u
     WHERE u.id = ce.user_id
       AND u.role = 'student'
       AND lower(u.email) <> ALL($1::text[])`,
    [[...TEST_EMAILS]],
  )
  const enrolled = await client.query(
    `WITH eligible AS (
       SELECT DISTINCT ON (pay.user_id, pay.license_class)
         pay.user_id, pay.license_class, pay.id, pay.created_at
       FROM payments pay
       JOIN users u ON u.id = pay.user_id
       WHERE u.role = 'student'
         AND lower(u.email) <> ALL($1::text[])
         AND pay.status = 'paid'
         AND pay.payment_type = 'enrollment'
         AND pay.license_class IN ('A1','A2','B1','B2')
       ORDER BY pay.user_id, pay.license_class, pay.created_at DESC
     )
     INSERT INTO course_enrollments (user_id, license_class, status, payment_id, enrolled_at)
     SELECT user_id, license_class, 'active', id, created_at FROM eligible`,
    [[...TEST_EMAILS]],
  )

  const audit = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE pay.method = 'sepay' AND pay.status = 'paid' AND pay.payment_type = 'enrollment'
        AND ((pay.amount = 900000 AND pay.license_class <> 'A1') OR (pay.amount = 1900000 AND pay.license_class <> 'A2')))::int AS wrong_sepay_class,
      COUNT(*) FILTER (WHERE ce.status = 'active' AND pay.id IS NULL)::int AS active_without_payment,
      COUNT(*) FILTER (WHERE ce.status = 'active' AND (pay.status <> 'paid' OR pay.payment_type <> 'enrollment' OR pay.license_class <> ce.license_class))::int AS invalid_active_enrollment
    FROM course_enrollments ce
    LEFT JOIN payments pay ON pay.id = ce.payment_id
  `)

  await client.query("COMMIT")
  console.log(JSON.stringify({
    sepayRowsReconciled: sepayUpdated,
    convertedSeedPaymentsToCash: cashUpdated.rowCount,
    paymentsDeletedOutsideExcel: paymentsDeletedOutsideExcel.rowCount,
    invalidEnrollmentsRemoved: reset.rowCount,
    activeEnrollmentsCreated: enrolled.rowCount,
    audit: audit.rows[0],
  }, null, 2))
} catch (error) {
  await client.query("ROLLBACK")
  throw error
} finally {
  await client.end()
}
