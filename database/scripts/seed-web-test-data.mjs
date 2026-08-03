import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import bcrypt from "bcryptjs"
import pg from "pg"
import { CANONICAL_CENTER, CENTER_VENUES } from "./center-config.mjs"

const DEMO_PASSWORD = "DriveGo123!"
const DATABASE_URL =
  process.env.DATABASE_URL || loadDatabaseUrlFromEnvFile("backend/.env")

const ID = {
  center: CANONICAL_CENTER.id,
  centerAdmin: "23232323-2323-4232-8232-232323232301",
  studentA2: "34343434-3434-4343-8343-343434343401",
  studentB2: "34343434-3434-4343-8343-343434343402",
  studentB1: "34343434-3434-4343-8343-343434343403",
  appA2: "45454545-4545-4454-8454-454545454501",
  appB2: "45454545-4545-4454-8454-454545454502",
  appB1: "45454545-4545-4454-8454-454545454503",
  slotA1Theory: "56565656-5656-4565-8565-565656565601",
  slotA2Theory: "56565656-5656-4565-8565-565656565602",
  slotB1Theory: "56565656-5656-4565-8565-565656565603",
  slotB2Theory: "56565656-5656-4565-8565-565656565604",
  slotB2Road: "56565656-5656-4565-8565-565656565605",
  regA2: "67676767-6767-4676-8676-676767676701",
  regB2: "67676767-6767-4676-8676-676767676702",
  regB1: "67676767-6767-4676-8676-676767676703",
  sessionTheory: "78787878-7878-4787-8787-787878787801",
  sessionPractice: "78787878-7878-4787-8787-787878787802",
  sessionSimulator: "78787878-7878-4787-8787-787878787803",
}

const TEST_EMAILS = [
  "center.test@drivego.test",
  "student.a2@drivego.test",
  "student.b2@drivego.test",
  "student.b1@drivego.test",
]

function loadDatabaseUrlFromEnvFile(path) {
  const text = readFileSync(resolve(path), "utf8")
  const line = text
    .split(/\r?\n/)
    .find((item) => item.trim().startsWith("DATABASE_URL="))
  if (!line) throw new Error("DATABASE_URL not found in backend/.env")
  return line.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "")
}

async function hasTable(client, tableName) {
  const res = await client.query(
    `SELECT to_regclass($1) AS name`,
    [`public.${tableName}`],
  )
  return Boolean(res.rows[0]?.name)
}

async function seed() {
  const client = new pg.Client({ connectionString: DATABASE_URL })
  await client.connect()
  await client.query("BEGIN")
  try {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

    await client.query(
      `INSERT INTO training_centers (id, name, tax_code, city, address)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         tax_code = EXCLUDED.tax_code,
         city = EXCLUDED.city,
         address = EXCLUDED.address`,
      [ID.center, CANONICAL_CENTER.name, CANONICAL_CENTER.taxCode, CANONICAL_CENTER.city, CANONICAL_CENTER.address],
    )

    await client.query(
      `INSERT INTO users (id, email, password_hash, role, center_id) VALUES
       ($1, 'center.test@drivego.test', $5, 'center_admin', $6),
       ($2, 'student.a2@drivego.test', $5, 'student', $6),
       ($3, 'student.b2@drivego.test', $5, 'student', $6),
       ($4, 'student.b1@drivego.test', $5, 'student', $6)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         center_id = EXCLUDED.center_id`,
      [ID.centerAdmin, ID.studentA2, ID.studentB2, ID.studentB1, passwordHash, ID.center],
    )

    await client.query(
      `INSERT INTO student_profiles (user_id, full_name, phone, license_class, center_id, premium_until, held_licenses, admin_note) VALUES
       ($1, 'Test A2 - Chờ duyệt hồ sơ', '0900000001', 'A2', $4, NOW() + INTERVAL '30 days', '["A1"]'::jsonb, '[TEST] Hồ sơ A2 cần duyệt'),
       ($2, 'Test B2 - Chờ duyệt lịch thi', '0900000002', 'B2', $4, NOW() + INTERVAL '30 days', '[]'::jsonb, '[TEST] Có đăng ký ca thi chờ duyệt'),
       ($3, 'Test B1 - Cần bổ sung hồ sơ', '0900000003', 'B1', $4, NULL, '[]'::jsonb, '[TEST] Hồ sơ cần yêu cầu bổ sung')
       ON CONFLICT (user_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         phone = EXCLUDED.phone,
         license_class = EXCLUDED.license_class,
         center_id = EXCLUDED.center_id,
         premium_until = EXCLUDED.premium_until,
         held_licenses = EXCLUDED.held_licenses,
         admin_note = EXCLUDED.admin_note`,
      [ID.studentA2, ID.studentB2, ID.studentB1, ID.center],
    )

    if (await hasTable(client, "course_enrollments")) {
      await client.query(
        `DELETE FROM course_enrollments
         WHERE user_id = ANY($1::uuid[])`,
        [[ID.studentA2, ID.studentB2, ID.studentB1]],
      )
      await client.query(
        `INSERT INTO course_enrollments (user_id, license_class, status, enrolled_at) VALUES
         ($1, 'A2', 'active', NOW() - INTERVAL '2 days'),
         ($2, 'B2', 'active', NOW() - INTERVAL '5 days'),
         ($3, 'B1', 'pending', NULL)`,
        [ID.studentA2, ID.studentB2, ID.studentB1],
      )
    }

    await client.query(
      `INSERT INTO license_applications (
         id, user_id, license_class, center_id, status, personal_info,
         submitted_at, admin_note, dossier_requested_at, dossier_deadline, updated_at
       ) VALUES
       ($1, $4, 'A2', $7, 'submitted',
        '{"fullName":"Test A2 - Chờ duyệt hồ sơ","dateOfBirth":"1998-03-12","nationalId":"TESTA2000001","address":"Quận 7, TP.HCM","permanentAddress":"TP.HCM"}'::jsonb,
        NOW() - INTERVAL '1 day', '[TEST] Hồ sơ đầy đủ, chờ chuyển reviewing/approved', NULL, NULL, NOW()),
       ($2, $5, 'B2', $7, 'approved',
        '{"fullName":"Test B2 - Chờ duyệt lịch thi","dateOfBirth":"1996-08-20","nationalId":"TESTB2000002","address":"Thủ Đức, TP.HCM","permanentAddress":"TP.HCM"}'::jsonb,
        NOW() - INTERVAL '3 days', '[TEST] Đã duyệt để test đăng ký lịch thi', NULL, NULL, NOW()),
       ($3, $6, 'B1', $7, 'reviewing',
        '{"fullName":"Test B1 - Cần bổ sung hồ sơ","dateOfBirth":"2000-11-05","nationalId":"TESTB1000003","address":"Bình Thạnh, TP.HCM","permanentAddress":"TP.HCM"}'::jsonb,
        NOW() - INTERVAL '2 days', '[TEST] Thiếu ảnh VNeID, có thể bấm yêu cầu bổ sung', NOW() - INTERVAL '6 hours', NOW() + INTERVAL '5 days', NOW())
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         personal_info = EXCLUDED.personal_info,
         submitted_at = EXCLUDED.submitted_at,
         admin_note = EXCLUDED.admin_note,
         dossier_requested_at = EXCLUDED.dossier_requested_at,
         dossier_deadline = EXCLUDED.dossier_deadline,
         updated_at = NOW()`,
      [ID.appA2, ID.appB2, ID.appB1, ID.studentA2, ID.studentB2, ID.studentB1, ID.center],
    )

    await client.query(
      `INSERT INTO schedule_slots (id, center_id, slot_date, start_time, end_time, venue, license_class, capacity, registered_count, slot_type, created_by) VALUES
       ($1, $6, CURRENT_DATE + 5, '08:00', '10:30', $8, 'A1', 35, 4, 'theory_exam', $7),
       ($2, $6, CURRENT_DATE + 6, '13:30', '16:00', $8, 'A2', 30, 7, 'theory_exam', $7),
       ($3, $6, CURRENT_DATE + 8, '08:00', '11:00', $8, 'B1', 40, 10, 'theory_exam', $7),
       ($4, $6, CURRENT_DATE + 9, '13:30', '16:30', $8, 'B2', 45, 18, 'theory_exam', $7),
       ($5, $6, CURRENT_DATE + 11, '07:30', '10:30', $9, 'B2', 20, 5, 'road_test', $7)
       ON CONFLICT (id) DO UPDATE SET
         slot_date = EXCLUDED.slot_date,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         venue = EXCLUDED.venue,
         license_class = EXCLUDED.license_class,
         capacity = EXCLUDED.capacity,
         registered_count = EXCLUDED.registered_count,
         slot_type = EXCLUDED.slot_type,
         created_by = EXCLUDED.created_by`,
      [
        ID.slotA1Theory,
        ID.slotA2Theory,
        ID.slotB1Theory,
        ID.slotB2Theory,
        ID.slotB2Road,
        ID.center,
        ID.centerAdmin,
        CENTER_VENUES.theory,
        CENTER_VENUES.practice,
      ],
    )

    await client.query(
      `INSERT INTO exam_registrations (id, user_id, slot_id, status, admin_note) VALUES
       ($1, $4, $6, 'pending', '[TEST] Chờ duyệt ca lý thuyết A2'),
       ($2, $5, $7, 'pending', '[TEST] Chờ duyệt ca lý thuyết B2'),
       ($3, $5, $8, 'confirmed', '[TEST] Ca thực hành đã xác nhận')
       ON CONFLICT (id) DO UPDATE SET
         slot_id = EXCLUDED.slot_id,
         status = EXCLUDED.status,
         admin_note = EXCLUDED.admin_note,
         reviewed_at = NULL,
         reviewed_by = NULL`,
      [
        ID.regA2,
        ID.regB2,
        ID.regB1,
        ID.studentA2,
        ID.studentB2,
        ID.slotA2Theory,
        ID.slotB2Theory,
        ID.slotB2Road,
      ],
    )

    if (await hasTable(client, "class_sessions")) {
      await client.query(
        `INSERT INTO class_sessions (id, center_id, title, session_date, start_time, end_time, venue, session_type, license_class, max_capacity, created_by) VALUES
         ($1, $4, '[TEST] Ôn biển báo A1/A2', CURRENT_DATE + 2, '18:00', '20:00', $6, 'theory', 'A2', 30, $5),
         ($2, $4, '[TEST] Luyện sa hình B2', CURRENT_DATE + 3, '08:00', '10:00', $7, 'practice', 'B2', 20, $5),
         ($3, $4, '[TEST] Cài và luyện phần mềm mô phỏng', CURRENT_DATE + 4, '19:00', '20:30', $8, 'simulator', 'B2', 25, $5)
         ON CONFLICT (id) DO UPDATE SET
           session_date = EXCLUDED.session_date,
           start_time = EXCLUDED.start_time,
           end_time = EXCLUDED.end_time,
           venue = EXCLUDED.venue,
           session_type = EXCLUDED.session_type,
           license_class = EXCLUDED.license_class,
           max_capacity = EXCLUDED.max_capacity`,
        [
          ID.sessionTheory,
          ID.sessionPractice,
          ID.sessionSimulator,
          ID.center,
          ID.centerAdmin,
          CENTER_VENUES.classroom,
          CENTER_VENUES.practice,
          CENTER_VENUES.simulator,
        ],
      )
    }

    const targetUsers = await client.query(
      `SELECT id FROM users WHERE role = 'student' AND (
         email = ANY($1::text[]) OR email NOT LIKE '%@drivego.test'
       )`,
      [TEST_EMAILS],
    )
    const targetUserIds = targetUsers.rows.map((row) => row.id)

    await client.query(
      `DELETE FROM notifications WHERE title LIKE '[TEST]%' AND user_id = ANY($1::uuid[])`,
      [targetUserIds],
    )

    const notifications = [
      ["schedule", "[TEST] Có lịch thi mới tuần này", "DriveGo đã mở ca thi A1/A2/B1/B2 để bạn test luồng đăng ký lịch.", "/schedule"],
      ["application_status", "[TEST] Hồ sơ cần kiểm tra", "Có hồ sơ test đang chờ duyệt trong trang quản trị.", "/application"],
      ["study", "[TEST] Buổi học mô phỏng sắp tới", "Lịch học đã có buổi cài và luyện phần mềm mô phỏng lái xe.", "/study-calendar"],
      ["system", "[TEST] Video hướng dẫn mô phỏng", "Xem video hướng dẫn cài phần mềm mô phỏng trong trang Hướng dẫn.", "/guide"],
    ]
    for (const userId of targetUserIds) {
      for (const [type, title, body, actionUrl] of notifications) {
        await client.query(
          `INSERT INTO notifications (user_id, type, title, body, action_url, read_at, created_at)
           VALUES ($1, $2, $3, $4, $5, NULL, NOW())`,
          [userId, type, title, body, actionUrl],
        )
      }
    }

    await client.query("COMMIT")

    const counts = await client.query(`
      SELECT 'test_users' AS entity, COUNT(*)::int AS n FROM users WHERE email LIKE '%@drivego.test'
      UNION ALL SELECT 'test_applications', COUNT(*) FROM license_applications WHERE id IN ($1, $2, $3)
      UNION ALL SELECT 'test_slots', COUNT(*) FROM schedule_slots WHERE id IN ($4, $5, $6, $7, $8)
      UNION ALL SELECT 'test_registrations', COUNT(*) FROM exam_registrations WHERE id IN ($9, $10, $11)
      UNION ALL SELECT 'test_notifications', COUNT(*) FROM notifications WHERE title LIKE '[TEST]%'
    `, [
      ID.appA2, ID.appB2, ID.appB1,
      ID.slotA1Theory, ID.slotA2Theory, ID.slotB1Theory, ID.slotB2Theory, ID.slotB2Road,
      ID.regA2, ID.regB2, ID.regB1,
    ])

    console.log("Seed web test data completed.")
    console.log(`Demo password: ${DEMO_PASSWORD}`)
    console.log("Demo accounts:")
    TEST_EMAILS.forEach((email) => console.log(` - ${email}`))
    console.log("Counts:")
    counts.rows.forEach((row) => console.log(` - ${row.entity}: ${row.n}`))
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    await client.end()
  }
}

seed().catch((error) => {
  console.error("Seed web test data failed:", error)
  process.exit(1)
})
