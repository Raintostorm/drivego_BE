/**
 * Xóa toàn bộ dữ liệu (giữ schema), rồi seed + import nội dung.
 * Usage: node database/scripts/reset-db.mjs
 * Env: DATABASE_URL hoặc backend/.env
 */
import { readFileSync, existsSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { spawn } from "child_process"
import pg from "pg"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "../..")

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  for (const rel of ["backend/.env", "database/.env"]) {
    const envPath = resolve(repoRoot, rel)
    if (!existsSync(envPath)) continue
    const line = readFileSync(envPath, "utf8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="))
    if (line) return line.slice("DATABASE_URL=".length).trim()
  }
  return "postgresql://postgres:12345@localhost:5432/DriveGo"
}

async function truncateAll(client) {
  const { rows } = await client.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
    ORDER BY tablename
  `)
  if (!rows.length) {
    console.log("No tables in public schema — run schema/migrations first.")
    return
  }
  const names = rows.map((r) => `"${r.tablename}"`).join(", ")
  await client.query(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`)
  console.log(`Truncated ${rows.length} tables.`)
}

function runNpm(script, cwd = repoRoot) {
  return new Promise((resolvePromise, reject) => {
    const isWin = process.platform === "win32"
    const child = spawn(isWin ? "npm.cmd" : "npm", ["run", script], {
      cwd,
      stdio: "inherit",
      shell: isWin,
      env: { ...process.env, DATABASE_URL: loadDatabaseUrl() },
    })
    child.on("close", (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`npm run ${script} exited with ${code}`))
    })
  })
}

const MIGRATIONS = [
  "database/migrations/001_applications.sql",
  "database/migrations/002_chapter_videos.sql",
  "database/migrations/003_fix_chapter_videos.sql",
  "database/migrations/004_held_licenses.sql",
  "database/migrations/005_article_license_class.sql",
  "database/migrations/006_admin_workflow.sql",
  "database/migrations/007_enrollment_and_dossier_request.sql",
  "database/migrations/008_update_chapter_videos.sql",
  "database/migrations/009_admin_ops.sql",
  "database/migrations/010_content_admin.sql",
  "database/migrations/011_class_sessions.sql",
  "database/migrations/012_exam_rules.sql",
  "database/migrations/013_password_reset_tokens.sql",
  "database/migrations/014_question_bank.sql",
  "database/migrations/015_exam_structure.sql",
  "database/migrations/016_site_content.sql",
  "database/migrations/017_seed_home_site_content.sql",
  "database/migrations/018_student_licenses.sql",
]

async function applyMigrations(client) {
  const { readFileSync: read } = await import("fs")
  for (const rel of MIGRATIONS) {
    const path = resolve(repoRoot, rel)
    if (!existsSync(path)) continue
    const sql = read(path, "utf8")
    await client.query(sql)
    console.log(`Migration OK: ${rel}`)
  }
}

async function main() {
  const url = loadDatabaseUrl()
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  console.log("Reset DriveGo DB:", url.replace(/:[^:@]+@/, ":****@"))

  try {
    console.log("\n1/5 Truncate all tables...")
    await truncateAll(client)

    console.log("\n2/5 Re-apply migrations (idempotent)...")
    await applyMigrations(client)
  } finally {
    await client.end()
  }

  console.log("\n3/5 Seed demo accounts...")
  await runNpm("seed:db")

  console.log("\n4/5 Bootstrap content JSON (A2 from A1, B1 from B2)...")
  await runNpm("bootstrap:content")

  console.log("\n5/5 Import A1–B2 content (chapters + exam papers)...")
  await runNpm("import:content:all")

  console.log("\nReset completed.")
  console.log("Demo: student@ / center@ / admin@drivego.demo — password DriveGo123!")
}

main().catch((err) => {
  console.error("Reset failed:", err.message)
  process.exit(1)
})
