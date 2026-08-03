import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"
import { CANONICAL_CENTER, CENTER_VENUES } from "./center-config.mjs"

const APPLY = process.argv.includes("--apply")
const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const text = readFileSync(resolve(WORKSPACE_ROOT, "backend", ".env"), "utf8")
  const line = text.split(/\r?\n/).find((item) => item.startsWith("DATABASE_URL="))
  if (!line) throw new Error("DATABASE_URL not found in backend/.env")
  return line.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "")
}

async function centerSummary(client) {
  const result = await client.query(`
    SELECT c.id, c.name,
      (SELECT COUNT(*) FROM users u WHERE u.center_id = c.id)::int AS users,
      (SELECT COUNT(*) FROM student_profiles p WHERE p.center_id = c.id)::int AS profiles,
      (SELECT COUNT(*) FROM license_applications a WHERE a.center_id = c.id)::int AS applications,
      (SELECT COUNT(*) FROM schedule_slots s WHERE s.center_id = c.id)::int AS slots,
      (SELECT COUNT(*) FROM class_sessions cs WHERE cs.center_id = c.id)::int AS sessions
    FROM training_centers c
    ORDER BY c.name
  `)
  return result.rows
}

const client = new pg.Client({ connectionString: loadDatabaseUrl() })
await client.connect()

try {
  const before = await centerSummary(client)
  console.log("Current center data:")
  console.table(before)

  if (!APPLY) {
    console.log("Dry run only. Re-run with --apply to normalize center data.")
    process.exitCode = 0
  } else {
    await client.query("BEGIN")
    try {
      await client.query(
        `INSERT INTO training_centers (id, name, tax_code, city, address)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           tax_code = EXCLUDED.tax_code,
           city = EXCLUDED.city,
           address = EXCLUDED.address`,
        [
          CANONICAL_CENTER.id,
          CANONICAL_CENTER.name,
          CANONICAL_CENTER.taxCode,
          CANONICAL_CENTER.city,
          CANONICAL_CENTER.address,
        ],
      )

      await client.query(
        `UPDATE users SET center_id = $1
         WHERE role <> 'system_admin' AND center_id IS DISTINCT FROM $1`,
        [CANONICAL_CENTER.id],
      )
      await client.query(`UPDATE users SET center_id = NULL WHERE role = 'system_admin'`)

      for (const table of [
        "student_profiles",
        "license_applications",
        "schedule_slots",
        "class_sessions",
      ]) {
        await client.query(
          `UPDATE ${table} SET center_id = $1 WHERE center_id IS DISTINCT FROM $1`,
          [CANONICAL_CENTER.id],
        )
      }

      await client.query(
        `UPDATE schedule_slots
         SET venue = CASE
           WHEN slot_type = 'road_test' THEN $2
           ELSE $3
         END
         WHERE center_id = $1 AND (
           venue IS NULL OR venue ~* '(DriveGo|Củ Chi|Cu Chi|Quận 7|Q7|thử nghiệm)'
         )`,
        [CANONICAL_CENTER.id, CENTER_VENUES.practice, CENTER_VENUES.theory],
      )

      await client.query(
        `UPDATE class_sessions
         SET venue = CASE
           WHEN session_type = 'practice' THEN $2
           WHEN session_type IN ('simulation', 'simulator') THEN $3
           ELSE $4
         END
         WHERE center_id = $1 AND (
           venue IS NULL OR venue ~* '(DriveGo|Củ Chi|Cu Chi|Quận 7|Q7|thử nghiệm)'
         )`,
        [
          CANONICAL_CENTER.id,
          CENTER_VENUES.practice,
          CENTER_VENUES.simulator,
          CENTER_VENUES.classroom,
        ],
      )

      await client.query(`DELETE FROM training_centers WHERE id <> $1`, [CANONICAL_CENTER.id])
      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }

    console.log("Normalized center data:")
    console.table(await centerSummary(client))
  }
} finally {
  await client.end()
}
