import { useEffect, useMemo, useState } from "react"
import { PageHeader } from "../components/PageHeader.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { TextField } from "../components/TextField.jsx"
import { UiCard } from "../components/UiCard.jsx"
import {
  adminSessionCheckIn,
  createAdminClassSession,
  fetchAdminClassSessions,
  fetchAdminSessionAttendance,
  fetchAdminStudents,
} from "../lib/admin-api.js"

const EMPTY = {
  title: "",
  sessionDate: "",
  startTime: "08:00",
  endTime: "10:00",
  venue: "",
  sessionType: "theory",
  licenseClass: "B2",
  maxCapacity: 30,
}

export function AdminClassSessionsPage() {
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [selectedId, setSelectedId] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [checkInUserId, setCheckInUserId] = useState("")
  const [students, setStudents] = useState([])
  const [filter, setFilter] = useState("upcoming")
  const [error, setError] = useState(null)

  function reload() {
    fetchAdminClassSessions().then(setRows).catch((e) => setError(e.message))
  }

  useEffect(() => {
    reload()
    fetchAdminStudents({ enrolled: "true" }).then(setStudents).catch(() => setStudents([]))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    fetchAdminSessionAttendance(selectedId).then(setAttendance)
  }, [selectedId])

  async function handleCreate(e) {
    e.preventDefault()
    try {
      await createAdminClassSession(form)
      setForm(EMPTY)
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi")
    }
  }

  const visibleRows = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return rows.filter((row) => filter === "all" || (filter === "upcoming" ? row.sessionDate >= today : row.sessionDate < today))
  }, [filter, rows])

  const selectedSession = rows.find((row) => row.id === selectedId)

  async function handleCheckIn() {
    if (!selectedId || !checkInUserId.trim()) return
    await adminSessionCheckIn(selectedId, checkInUserId.trim())
    setCheckInUserId("")
    const list = await fetchAdminSessionAttendance(selectedId)
    setAttendance(list)
  }

  return (
    <section className="space-y-6">
      <PageHeader title="Buổi học & điểm danh" subtitle="Lịch lớp tại trung tâm" />
      {error ? <p className="text-drive-danger">{error}</p> : null}

      <UiCard variant="panel">
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Tiêu đề"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="sm:col-span-2"
          />
          <label className="block text-sm">
            <span className="mb-2 block font-medium text-drive-text">Loại buổi</span>
            <select value={form.sessionType} onChange={(e) => setForm({ ...form, sessionType: e.target.value })} className="min-h-14 w-full rounded-drive-pill border border-drive-border bg-drive-elevated px-4 text-drive-text">
              <option value="theory">Lý thuyết</option>
              <option value="simulation">Mô phỏng</option>
              <option value="practice">Thực hành</option>
            </select>
          </label>
          <TextField label="Sức chứa" type="number" value={String(form.maxCapacity)} onChange={(e) => setForm({ ...form, maxCapacity: Number(e.target.value) })} />
          <TextField label="Địa điểm / phòng" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="sm:col-span-2" />
          <TextField
            label="Ngày"
            type="date"
            value={form.sessionDate}
            onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}
            required
          />
          <TextField
            label="Hạng (tùy chọn)"
            value={form.licenseClass}
            onChange={(e) => setForm({ ...form, licenseClass: e.target.value })}
          />
          <TextField
            label="Bắt đầu"
            type="time"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
          />
          <TextField
            label="Kết thúc"
            type="time"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          />
          <PrimaryButton type="submit" className="sm:col-span-2">
            Tạo buổi học
          </PrimaryButton>
        </form>
      </UiCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <UiCard variant="panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-white">Danh sách buổi</h3>
            <div className="flex rounded-drive border border-drive-border p-1 text-xs">
              {[{ id: "upcoming", label: "Sắp tới" }, { id: "past", label: "Đã qua" }, { id: "all", label: "Tất cả" }].map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`min-h-9 rounded px-3 ${filter === item.id ? "bg-drive-action text-drive-action-contrast" : "text-drive-muted"}`}>{item.label}</button>)}
            </div>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {visibleRows.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`w-full rounded-drive border px-3 py-2 text-left ${
                    selectedId === s.id
                      ? "border-drive-action bg-drive-action/10"
                      : "border-drive-border"
                  }`}
                  onClick={() => setSelectedId(s.id)}
                >
                  <span className="flex items-start justify-between gap-3"><span className="font-medium text-white">{s.title}</span><span className="shrink-0 text-xs text-drive-action">{s.attendanceCount ?? 0}/{s.maxCapacity}</span></span>
                  <span className="block text-drive-muted">
                    {new Date(`${s.sessionDate}T00:00:00`).toLocaleDateString("vi-VN")} · {String(s.startTime).slice(0, 5)}–{String(s.endTime).slice(0, 5)}
                  </span>
                  <span className="mt-1 block text-xs text-drive-muted">{s.sessionType === "theory" ? "Lý thuyết" : s.sessionType === "simulation" ? "Mô phỏng" : "Thực hành"} · Hạng {s.licenseClass ?? "chung"}{s.venue ? ` · ${s.venue}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        </UiCard>

        <UiCard variant="panel">
          <h3 className="font-semibold text-white">Điểm danh{selectedSession ? ` · ${selectedSession.title}` : ""}</h3>
          {selectedId ? (
            <>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label className="flex-1 text-sm text-drive-text">Học viên
                  <select value={checkInUserId} onChange={(e) => setCheckInUserId(e.target.value)} className="mt-2 min-h-12 w-full rounded-drive border border-drive-border bg-drive-elevated px-3 text-drive-text">
                    <option value="">Chọn theo tên hoặc email</option>
                    {students.filter((student) => !attendance.some((item) => item.userId === student.userId)).map((student) => <option key={student.userId} value={student.userId}>{student.fullName ?? student.email} · {student.email}</option>)}
                  </select>
                </label>
                <PrimaryButton type="button" className="self-end" onClick={handleCheckIn}>
                  Xác nhận có mặt
                </PrimaryButton>
              </div>
              <ul className="mt-4 space-y-1 text-sm text-drive-muted">
                {attendance.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-drive border border-drive-border-soft bg-drive-sidebar px-3 py-2">
                    <span><span className="block font-medium text-drive-text">{a.studentName ?? a.userId}</span><span className="text-xs">{a.studentEmail}</span></span>
                    <span className="text-xs text-drive-action">Có mặt · {new Date(a.checkedInAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
                {!attendance.length ? <li>Chưa có điểm danh.</li> : null}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-sm text-drive-muted">Chọn một buổi học.</p>
          )}
        </UiCard>
      </div>
    </section>
  )
}
