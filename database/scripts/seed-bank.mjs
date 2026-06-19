/**
 * Phase 1: Seed bank_questions + license_question_pool from Phase 0 artifacts.
 *
 * Reads:
 *   database/content/bank.json   (build-bank.py)
 *   database/content/pools.json  (build-bank.py)
 *
 * Run AFTER migrations 014 + 015:
 *   npm run seed:bank
 */
import { existsSync, readFileSync } from "fs"
import { resolve } from "path"
import { fileURLToPath } from "url"
import pg from "pg"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const CONTENT = resolve(__dirname, "../content")

function stripQuotes(v) {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1)
  }
  return v
}

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return stripQuotes(process.env.DATABASE_URL.trim())
  const envPath = resolve(__dirname, "../.env")
  if (existsSync(envPath)) {
    const line = readFileSync(envPath, "utf8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="))
    if (line) return stripQuotes(line.slice("DATABASE_URL=".length).trim())
  }
  return "postgresql://postgres:12345@localhost:5432/DriveGo"
}

function readJson(name) {
  const path = resolve(CONTENT, name)
  if (!existsSync(path)) {
    console.error(`Missing ${path} — run: python database/scripts/build-bank.py`)
    process.exit(1)
  }
  return JSON.parse(readFileSync(path, "utf8"))
}

const bankData = readJson("bank.json")
const pools = readJson("pools.json")
const bank = bankData.bank ?? []

if (bank.length < 500) {
  console.error(`bank.json only has ${bank.length} questions — aborting`)
  process.exit(1)
}

const client = new pg.Client({ connectionString: loadDatabaseUrl() })

try {
  await client.connect()
  await client.query("BEGIN")

  await client.query("DELETE FROM license_question_pool")
  await client.query("DELETE FROM bank_questions")

  // Batch insert bank_questions (one round-trip instead of ~600)
  let nCrit = 0
  const COLS = 7
  const values = []
  const params = []
  bank.forEach((q, i) => {
    if (q.isCritical) nCrit += 1
    const b = i * COLS
    values.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}::jsonb, $${b + 6}, $${b + 7})`)
    params.push(
      q.number,
      q.category,
      q.body,
      q.imageUrl ?? null,
      JSON.stringify(q.answers ?? []),
      q.correctIndex ?? 0,
      Boolean(q.isCritical),
    )
  })
  await client.query(
    `INSERT INTO bank_questions (bank_number, category, body, image_url, answers, correct_index, is_critical)
     VALUES ${values.join(", ")}`,
    params,
  )

  // Batch insert pools per class
  const bankNums = new Set(bank.map((q) => q.number))
  let poolRows = 0
  for (const [code, nums] of Object.entries(pools)) {
    const valid = nums.filter((n) => bankNums.has(n)) // skip numbers absent from bank (e.g. 507)
    if (valid.length === 0) continue
    const ph = []
    const pp = []
    valid.forEach((n, i) => {
      ph.push(`($${i * 2 + 1}, $${i * 2 + 2})`)
      pp.push(code, n)
    })
    await client.query(
      `INSERT INTO license_question_pool (license_class, bank_number) VALUES ${ph.join(", ")}
       ON CONFLICT DO NOTHING`,
      pp,
    )
    poolRows += valid.length
  }

  await client.query("COMMIT")
  console.log(`bank_questions: ${bank.length} (critical: ${nCrit})`)
  console.log(`license_question_pool: ${poolRows} rows`)
  for (const [code, nums] of Object.entries(pools)) {
    const inBank = nums.filter((n) => bankNums.has(n)).length
    console.log(`  ${code}: ${inBank} questions`)
  }
  if (nCrit !== 60) {
    console.warn(`\n⚠️  CHỈ ${nCrit}/60 câu điểm liệt — kiểm tra database/content/appendices.json trước khi production.`)
  }
} catch (err) {
  await client.query("ROLLBACK")
  throw err
} finally {
  await client.end()
}
