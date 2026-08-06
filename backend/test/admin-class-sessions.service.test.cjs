const assert = require("node:assert/strict")
const test = require("node:test")

const { AdminClassSessionsService } = require("../dist/modules/admin/admin-class-sessions.service.js")

test("admin check-in validates center, enrollment, duplicates, and capacity", async () => {
  const session = {
    id: "session-1",
    centerId: "center-1",
    licenseClass: "B2",
    maxCapacity: 1,
  }
  const attendanceRows = []
  const sessionsRepo = { findOne: async () => session }
  const attendanceRepo = {
    count: async () => attendanceRows.length,
    findOne: async ({ where }) =>
      attendanceRows.find((row) => row.sessionId === where.sessionId && row.userId === where.userId) ?? null,
    create: (row) => ({ id: `att-${attendanceRows.length + 1}`, ...row }),
    save: async (row) => {
      attendanceRows.push(row)
      return row
    },
  }
  const profilesRepo = {
    findOne: async ({ where }) => ({
      userId: where.userId,
      centerId: where.userId === "wrong-center" ? "center-2" : "center-1",
    }),
  }
  const enrollmentsRepo = {
    findOne: async ({ where }) =>
      where.userId === "no-b2"
        ? null
        : { userId: where.userId, licenseClass: where.licenseClass, status: "active" },
  }
  const scope = {
    assertCenterAccessAsync: async () => true,
    getCenterIdForAdmin: async () => "center-1",
  }
  const service = new AdminClassSessionsService(
    sessionsRepo,
    attendanceRepo,
    profilesRepo,
    enrollmentsRepo,
    scope,
  )

  await assert.rejects(
    () => service.checkInAdmin({ role: "center_admin", userId: "admin" }, "session-1", "wrong-center"),
    /không thuộc trung tâm/,
  )
  await assert.rejects(
    () => service.checkInAdmin({ role: "center_admin", userId: "admin" }, "session-1", "no-b2"),
    /chưa có khóa B2/,
  )

  const first = await service.checkInAdmin(
    { role: "center_admin", userId: "admin" },
    "session-1",
    "valid",
  )
  const duplicate = await service.checkInAdmin(
    { role: "center_admin", userId: "admin" },
    "session-1",
    "valid",
  )

  assert.equal(first.id, duplicate.id)
  assert.equal(attendanceRows.length, 1)
  await assert.rejects(
    () => service.checkInAdmin({ role: "center_admin", userId: "admin" }, "session-1", "other-valid"),
    /đủ sĩ số/,
  )
})
