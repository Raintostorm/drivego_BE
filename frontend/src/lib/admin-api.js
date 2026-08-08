import { apiFetch, apiFetchBlob } from "./api.js"

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function adminDownloadDocument(documentId, filename) {
  return apiFetchBlob(`/admin/applications/documents/${documentId}/file`).then((blob) => {
    downloadBlob(blob, filename || "document")
  })
}

export function adminDownloadApplicationArchive(applicationId, filename) {
  return apiFetchBlob(`/admin/applications/${applicationId}/documents/archive`, {
    auth: true,
  }).then((blob) => {
    downloadBlob(blob, filename || "ho-so-hoc-vien.zip")
  })
}

export function adminOpenDocument(documentId) {
  return apiFetchBlob(`/admin/applications/documents/${documentId}/file`).then((blob) => {
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank", "noopener,noreferrer")
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  })
}

export async function fetchAdminSummary() {
  return apiFetch("/admin/dashboard/summary", { auth: true })
}

export async function fetchAdminHealthConfig() {
  return apiFetch("/health/config", { auth: true })
}

export async function fetchAdminApplications(params = {}) {
  const q = new URLSearchParams()
  if (params.status) q.set("status", params.status)
  if (params.licenseClass) q.set("licenseClass", params.licenseClass)
  const qs = q.toString()
  return apiFetch(`/admin/applications${qs ? `?${qs}` : ""}`, { auth: true })
}

export async function fetchAdminApplication(id) {
  return apiFetch(`/admin/applications/${id}`, { auth: true })
}

export async function patchAdminApplication(id, body) {
  return apiFetch(`/admin/applications/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function fetchAdminRegistrations(params = {}) {
  const q = new URLSearchParams()
  if (params.status) q.set("status", params.status)
  if (params.slotType) q.set("slotType", params.slotType)
  const qs = q.toString()
  return apiFetch(`/admin/registrations${qs ? `?${qs}` : ""}`, { auth: true })
}

export async function patchAdminRegistration(id, body) {
  return apiFetch(`/admin/registrations/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function fetchAdminStudents(params = {}) {
  const q = new URLSearchParams()
  if (params.premium) q.set("premium", params.premium)
  if (params.enrolled) q.set("enrolled", params.enrolled)
  if (params.licenseClass) q.set("licenseClass", params.licenseClass)
  const qs = q.toString()
  return apiFetch(`/admin/students${qs ? `?${qs}` : ""}`, { auth: true })
}

export async function fetchAdminStudent(userId) {
  return apiFetch(`/admin/students/${userId}`, { auth: true })
}

export async function patchAdminStudentNote(userId, adminNote) {
  return apiFetch(`/admin/students/${userId}/note`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ adminNote }),
  })
}

export async function unlockAdminStudentCourse(userId, body) {
  return apiFetch(`/admin/students/${userId}/unlock-course`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function fetchAdminEnrollments(params = {}) {
  const q = new URLSearchParams()
  if (params.status) q.set("status", params.status)
  if (params.licenseClass) q.set("licenseClass", params.licenseClass)
  const qs = q.toString()
  return apiFetch(`/admin/enrollments${qs ? `?${qs}` : ""}`, { auth: true })
}

export async function fetchAdminPayments(params = {}) {
  const q = new URLSearchParams()
  if (params.status) q.set("status", params.status)
  if (params.paymentType) q.set("paymentType", params.paymentType)
  const qs = q.toString()
  return apiFetch(`/admin/payments${qs ? `?${qs}` : ""}`, { auth: true })
}

export async function confirmAdminPayment(paymentId, body = {}) {
  return apiFetch(`/admin/payments/${paymentId}/confirm`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function fetchAdminSlots(params = {}) {
  const q = new URLSearchParams()
  if (params.slotType) q.set("slotType", params.slotType)
  const qs = q.toString()
  return apiFetch(`/admin/schedule-slots${qs ? `?${qs}` : ""}`, { auth: true })
}

export async function createAdminSlot(body) {
  return apiFetch("/admin/schedule-slots", {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function patchAdminSlot(id, body) {
  return apiFetch(`/admin/schedule-slots/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function deleteAdminSlot(id) {
  return apiFetch(`/admin/schedule-slots/${id}`, { method: "DELETE", auth: true })
}

export async function fetchAdminLicenseClasses() {
  return apiFetch("/admin/license-classes/manage", { auth: true })
}

export async function fetchAdminPricing() {
  return apiFetch("/admin/pricing/manage", { auth: true })
}

export async function fetchAdminSiteContent() {
  return apiFetch("/admin/site-content/home", { auth: true })
}

export async function patchAdminSiteContent(body) {
  return apiFetch("/admin/site-content/home", {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function patchAdminLicenseClass(code, body) {
  return apiFetch(`/admin/license-classes/${code}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function patchAdminSubscriptionPlan(code, body) {
  return apiFetch(`/admin/subscription-plans/${code}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function fetchAdminChapters(code) {
  return apiFetch(`/admin/chapters/by-class/${code}`, { auth: true })
}

export async function patchAdminChapter(id, body) {
  return apiFetch(`/admin/chapters/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function fetchAdminClassSessions() {
  return apiFetch("/admin/class-sessions", { auth: true })
}

export async function createAdminClassSession(body) {
  return apiFetch("/admin/class-sessions", {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function patchAdminClassSession(id, body) {
  return apiFetch(`/admin/class-sessions/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function deleteAdminClassSession(id) {
  return apiFetch(`/admin/class-sessions/${id}`, { method: "DELETE", auth: true })
}

export async function fetchAdminSessionAttendance(sessionId) {
  return apiFetch(`/admin/class-sessions/${sessionId}/attendance`, { auth: true })
}

export async function adminSessionCheckIn(sessionId, userId) {
  return apiFetch(`/admin/class-sessions/${sessionId}/attendance`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ userId }),
  })
}

export async function fetchAdminCenters() {
  return apiFetch("/admin/centers", { auth: true })
}

export async function createAdminCenter(body) {
  return apiFetch("/admin/centers", {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function patchAdminCenter(id, body) {
  return apiFetch(`/admin/centers/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function createCenterAdminUser(body) {
  return apiFetch("/admin/users/center-admin", {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function requestAdminDossier(applicationId, body = {}) {
  return apiFetch(`/admin/applications/${applicationId}/request-dossier`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  })
}

export async function fetchAdminLicenses(q = "") {
  return apiFetch(`/admin/licenses${q ? `?q=${encodeURIComponent(q)}` : ""}`, { auth: true })
}

export async function reviewAdminLicense(id, body) {
  return apiFetch(`/admin/licenses/${id}/review`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  })
}
