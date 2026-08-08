const assert = require("node:assert/strict")
const test = require("node:test")

const { AdminStudentsService } = require("../dist/modules/admin/admin-students.service.js")

test("admin direct unlock creates a paid direct payment and active enrollment", async () => {
  let savedPayment = null
  let savedEnrollment = null
  const enrollmentsRepo = {
    findOne: async ({ where }) => {
      if (where.status === "active") return null
      return null
    },
    create: (row) => ({ id: "enrollment-1", ...row }),
    save: async (row) => {
      savedEnrollment = row
      return row
    },
  }
  const paymentsRepo = {
    create: (row) => ({ id: "payment-1", ...row }),
    save: async (row) => {
      savedPayment = row
      return row
    },
  }
  const licenseRepo = {
    findOne: async () => ({ code: "A2", enrollmentFee: "1900000" }),
  }
  const service = new AdminStudentsService(
    {},
    {},
    enrollmentsRepo,
    {},
    {},
    paymentsRepo,
    licenseRepo,
    {},
  )
  service.getOne = async () => ({ userId: "user-1" })

  await service.unlockCourse(
    { userId: "admin-1", role: "center_admin" },
    "user-1",
    { licenseClass: "A2", note: "Thu tien mat" },
  )

  assert.equal(savedPayment.status, "paid")
  assert.equal(savedPayment.method, "direct")
  assert.equal(savedPayment.paymentType, "enrollment")
  assert.equal(savedPayment.licenseClass, "A2")
  assert.equal(savedPayment.amount, "1900000")
  assert.equal(savedPayment.customerInfo.source, "admin_direct_unlock")
  assert.equal(savedEnrollment.status, "active")
  assert.equal(savedEnrollment.paymentId, "payment-1")
})
