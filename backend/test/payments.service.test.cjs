const assert = require("node:assert/strict")
const test = require("node:test")

const { PaymentsService } = require("../dist/modules/payments/payments.service.js")
const { Payment } = require("../dist/entities/payment.entity.js")
const { StudentProfile } = require("../dist/entities/student-profile.entity.js")
const { CourseEnrollment } = require("../dist/entities/course-enrollment.entity.js")

function qbReturning(row) {
  return {
    setLock() {
      return this
    },
    where() {
      return this
    },
    getOne: async () => row,
  }
}

test("markPaid is idempotent for repeated premium webhook confirmations", async () => {
  const payment = {
    id: "pay-1",
    userId: "user-1",
    planId: "premium-plan",
    paymentType: "premium",
    status: "pending",
    customerInfo: {},
  }
  const profile = { userId: "user-1", premiumUntil: null }
  let paymentSaves = 0
  let profileSaves = 0

  const manager = {
    getRepository(entity) {
      if (entity === Payment) {
        return {
          createQueryBuilder: () => qbReturning(payment),
          save: async (row) => {
            paymentSaves += 1
            Object.assign(payment, row)
            return row
          },
        }
      }
      if (entity === StudentProfile) {
        return {
          createQueryBuilder: () => qbReturning(profile),
          save: async (row) => {
            profileSaves += 1
            Object.assign(profile, row)
            return row
          },
        }
      }
      throw new Error(`Unexpected repository: ${entity?.name}`)
    },
  }

  const service = new PaymentsService(
    {},
    {},
    {},
    {},
    { transaction: async (fn) => fn(manager) },
    { normalizeClass: (code) => code },
    {},
  )

  await service.markPaid(payment, {
    id: "sepay-1",
    referenceCode: "ref-1",
    gateway: "VCB",
  })
  const firstPremiumUntil = profile.premiumUntil.getTime()

  await service.markPaid(payment, {
    id: "sepay-1",
    referenceCode: "ref-1",
    gateway: "VCB",
  })

  assert.equal(payment.status, "paid")
  assert.equal(paymentSaves, 1)
  assert.equal(profileSaves, 1)
  assert.equal(profile.premiumUntil.getTime(), firstPremiumUntil)
  assert.equal(payment.customerInfo.paymentEvents.length, 1)
  assert.equal(payment.customerInfo.paymentEvents[0].type, "sepay_webhook_confirmed")
})

test("markPaid activates enrollment payments in the same transaction", async () => {
  const payment = {
    id: "pay-2",
    userId: "user-2",
    licenseClass: "A1",
    paymentType: "enrollment",
    status: "pending",
    customerInfo: {},
  }
  let savedEnrollment = null

  const manager = {
    getRepository(entity) {
      if (entity === Payment) {
        return {
          createQueryBuilder: () => qbReturning(payment),
          save: async (row) => {
            Object.assign(payment, row)
            return row
          },
        }
      }
      if (entity === CourseEnrollment) {
        return {
          createQueryBuilder: () => qbReturning(null),
          create: (row) => ({ ...row }),
          save: async (row) => {
            savedEnrollment = row
            return row
          },
        }
      }
      throw new Error(`Unexpected repository: ${entity?.name}`)
    },
  }

  const service = new PaymentsService(
    {},
    {},
    {},
    {},
    { transaction: async (fn) => fn(manager) },
    { normalizeClass: (code) => code },
    {},
  )

  await service.markPaid(payment, {
    manual: true,
    adminUserId: "admin-1",
    note: "ok",
  })

  assert.equal(payment.status, "paid")
  assert.equal(savedEnrollment.status, "active")
  assert.equal(savedEnrollment.licenseClass, "A1")
  assert.equal(savedEnrollment.paymentId, "pay-2")
  assert.equal(payment.customerInfo.paymentEvents[0].type, "manual_confirmed")
})
