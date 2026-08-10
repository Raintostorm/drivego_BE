import { useEffect, useMemo, useState } from "react"
import { PageHeader } from "../components/PageHeader.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { TextField } from "../components/TextField.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { Pagination } from "../components/Pagination.jsx"
import { useAuth } from "../context/AuthContext.jsx"
import { usePagination } from "../hooks/usePagination.js"
import {
  adminSessionCheckIn,
  assignAdminSessionStudent,
  createAdminClassSession,
  fetchAdminCenters,
  fetchAdminClassSessions,
  fetchAdminSessionAttendance,
  fetchAdminSessionRoster,
  fetchAdminStudents,
  removeAdminSessionStudent,
} from "../lib/admin-api.js"

const EMPTY = {
  centerId: "",
  title: "",
  sessionDate: "",
  startTime: "08:00",
  endTime: "10:00",
  venue: "",
  sessionType: "theory",
  deliveryMode: "in_person",
  onlineUrl: "",
  instructorName: "",
  licenseClass: "B2",
  maxCapacity: 30,
}

const SESSION_META = {
  theory: { label: "Lý thuyết", tone: "info" },
  simulation: { label: "Mô phỏng", tone: "warning" },
  practice: { label: "Thực hành", tone: "success" },
}

const DELIVERY_META = {
  in_person: "Trực tiếp",
  online: "Online",
  hybrid: "Kết hợp",
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  })
}

export function AdminClassSessionsPage() {
  const { user } = useAuth()
  const isSystemAdmin = user?.role === "system_admin"
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [centers, setCenters] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [roster, setRoster] = useState([])
  const [assignUserId, setAssignUserId] = useState("")
  const [checkInUserId, setCheckInUserId] = useState("")
  const [students, setStudents] = useState([])
  const [filter, setFilter] = useState("upcoming")
  const [error, setError] = useState(null)

  function reload() {
    fetchAdminClassSessions().then(setRows).catch((e) => setError(e.message))
  }

  async function refreshSelectedSession() {
    if (!selectedId) return
    const [attendanceRows, rosterRows] = await Promise.all([
      fetchAdminSessionAttendance(selectedId),
      fetchAdminSessionRoster(selectedId),
    ])
    setAttendance(attendanceRows)
    setRoster(rosterRows)
    reload()
  }

  useEffect(() => {
    reload()
    fetchAdminStudents({ enrolled: "true" }).then(setStudents).catch(() => setStudents([]))
    if (isSystemAdmin) fetchAdminCenters().then(setCenters).catch(() => setCenters([]))
  }, [isSystemAdmin])

  useEffect(() => {
    if (!selectedId) return
    refreshSelectedSession().catch((e) => setError(e.message))
  }, [selectedId])

  async function handleCreate(e) {
    e.preventDefault()
    try {
      await createAdminClassSession(form)
      setForm({ ...EMPTY, centerId: form.centerId })
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi")
    }
  }

  const visibleRows = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return rows.filter((row) => filter === "all" || (filter === "upcoming" ? row.sessionDate >= today : row.sessionDate < today))
  }, [filter, rows])
  const sessionPagination = usePagination(visibleRows)
  const attendancePagination = usePagination(attendance)
  const selectedSession = rows.find((row) => row.id === selectedId)
  const eligibleStudents = useMemo(() => {
    if (!selectedSession) return []
    return students.filter((student) => {
      const sameCenter = student.centerId === selectedSession.centerId
      const sameClass = !selectedSession.licenseClass || student.enrollments?.some((item) => item.licenseClass === selectedSession.licenseClass)
      const notAssigned = !roster.some((item) => item.userId === student.userId && item.status !== "cancelled")
      return sameCenter && sameClass && notAssigned
    })
  }, [roster, selectedSession, students])
  const scheduledRoster = roster.filter((item) => item.status === "scheduled")

  async function handleAssignStudent() {
    if (!selectedId || !assignUserId) return
    try {
      await assignAdminSessionStudent(selectedId, assignUserId)
      setAssignUserId("")
      await refreshSelectedSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xếp lớp")
    }
  }

  async function handleCheckIn() {
    if (!selectedId || !checkInUserId) return
    try {
      await adminSessionCheckIn(selectedId, checkInUserId)
      setCheckInUserId("")
      await refreshSelectedSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể điểm danh")
    }
  }

  async function handleRemoveStudent(userId) {
    try {
      await removeAdminSessionStudent(selectedId, userId)
      await refreshSelectedSession()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể hủy xếp lớp")
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader title="Buổi học, xếp lớp & điểm danh" subtitle="Chỉ học viên có khóa active đúng hạng mới được xếp vào lớp." />
      {error ? <p className="text-drive-danger">{error}</p> : null}

      <UiCard variant="panel" className="space-y-4">
        <div><h2 className="font-semibold text-drive-text">Tạo buổi học mới</h2><p className="mt-1 text-sm text-drive-muted">Xếp học viên vào danh sách lớp trước khi điểm danh.</p></div>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          {isSystemAdmin ? <label className="block text-sm sm:col-span-2"><span className="mb-2 block font-medium text-drive-text">Trung tam</span><select value={form.centerId} onChange={(e) => setForm({ ...form, centerId: e.target.value })} required className="min-h-14 w-full rounded-drive-pill border border-drive-border bg-drive-elevated px-4 text-drive-text"><option value="">Chon trung tam</option>{centers.map((center) => <option key={center.id} value={center.id}>{center.name} · {center.city}</option>)}</select></label> : null}
          <TextField label="Tieu de" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="sm:col-span-2" />
          <label className="block text-sm"><span className="mb-2 block font-medium text-drive-text">Loai buoi</span><select value={form.sessionType} onChange={(e) => setForm({ ...form, sessionType: e.target.value })} className="min-h-14 w-full rounded-drive-pill border border-drive-border bg-drive-elevated px-4 text-drive-text"><option value="theory">Ly thuyet</option><option value="simulation">Mo phong</option><option value="practice">Thuc hanh</option></select></label>
          <label className="block text-sm"><span className="mb-2 block font-medium text-drive-text">Hinh thuc</span><select value={form.deliveryMode} onChange={(e) => setForm({ ...form, deliveryMode: e.target.value })} className="min-h-14 w-full rounded-drive-pill border border-drive-border bg-drive-elevated px-4 text-drive-text"><option value="in_person">Truc tiep tai trung tam</option><option value="online">Online</option><option value="hybrid">Ket hop</option></select></label>
          <TextField label="Dia diem / phong" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="sm:col-span-2" />
          <TextField label="Giao vien phu trach" value={form.instructorName} onChange={(e) => setForm({ ...form, instructorName: e.target.value })} />
          {form.deliveryMode !== "in_person" ? <TextField label="Link phong hoc" type="url" value={form.onlineUrl} onChange={(e) => setForm({ ...form, onlineUrl: e.target.value })} required /> : <TextField label="Suc chua" type="number" value={String(form.maxCapacity)} onChange={(e) => setForm({ ...form, maxCapacity: Number(e.target.value) })} />}
          {form.deliveryMode !== "in_person" ? <TextField label="Suc chua" type="number" value={String(form.maxCapacity)} onChange={(e) => setForm({ ...form, maxCapacity: Number(e.target.value) })} /> : null}
          <TextField label="Ngay" type="date" value={form.sessionDate} onChange={(e) => setForm({ ...form, sessionDate: e.target.value })} required />
          <label className="block text-sm"><span className="mb-2 block font-medium text-drive-text">Hang</span><select value={form.licenseClass} onChange={(e) => setForm({ ...form, licenseClass: e.target.value })} className="min-h-14 w-full rounded-drive-pill border border-drive-border bg-drive-elevated px-4 text-drive-text"><option value="">Dung chung moi hang</option><option value="A1">Hang A1</option><option value="A2">Hang A</option><option value="B1">Hang B1</option><option value="B2">Hang B</option></select></label>
          <TextField label="Bat dau" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          <TextField label="Ket thuc" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          <PrimaryButton type="submit" className="sm:col-span-2">Tao buoi hoc</PrimaryButton>
        </form>
      </UiCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <UiCard variant="panel"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h3 className="font-semibold text-drive-text">Danh sach buoi</h3><div className="grid grid-cols-3 rounded-drive border border-drive-border p-1 text-xs">{[{ id: "upcoming", label: "Sap toi" }, { id: "past", label: "Da qua" }, { id: "all", label: "Tat ca" }].map((item) => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`min-h-9 rounded px-3 ${filter === item.id ? "bg-drive-action text-drive-action-contrast" : "text-drive-muted"}`}>{item.label}</button>)}</div></div>
          <ul className="mt-4 space-y-2 text-sm">{sessionPagination.pageItems.map((s) => <li key={s.id}><button type="button" className={`min-h-20 w-full rounded-drive border px-3 py-3 text-left ${selectedId === s.id ? "border-drive-action bg-drive-action/10" : "border-drive-border"}`} onClick={() => setSelectedId(s.id)}><span className="flex items-start justify-between gap-3"><span className="font-semibold text-drive-text">{s.title}</span><StatusBadge tone={SESSION_META[s.sessionType]?.tone}>{SESSION_META[s.sessionType]?.label ?? s.sessionType}</StatusBadge></span><span className="mt-1 block text-drive-muted">{formatDate(s.sessionDate)} · {String(s.startTime).slice(0, 5)}-{String(s.endTime).slice(0, 5)}</span><span className="mt-1 flex justify-between gap-3 text-xs text-drive-muted"><span>Hang {s.licenseClass ?? "chung"} · {DELIVERY_META[s.deliveryMode] ?? "Truc tiep"}</span><span>{s.assignedCount ?? 0}/{s.maxCapacity} da xep</span></span></button></li>)}</ul>
          <Pagination {...sessionPagination} total={visibleRows.length} onPageChange={sessionPagination.setPage} label="buoi hoc" />
        </UiCard>

        <UiCard variant="panel"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-drive-text">Danh sach lop{selectedSession ? ` · ${selectedSession.title}` : ""}</h3>{selectedSession ? <p className="mt-1 text-xs text-drive-muted">{DELIVERY_META[selectedSession.deliveryMode] ?? "Truc tiep"}{selectedSession.instructorName ? ` · GV ${selectedSession.instructorName}` : ""}</p> : null}</div>{selectedSession ? <StatusBadge tone="info">{roster.filter((item) => item.status !== "cancelled").length}/{selectedSession.maxCapacity} da xep</StatusBadge> : null}</div>
          {selectedId ? <><div className="mt-3 flex flex-col gap-2 sm:flex-row"><select value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} className="min-h-12 flex-1 rounded-drive border border-drive-border bg-drive-elevated px-3 text-drive-text"><option value="">Chon hoc vien du dieu kien</option>{eligibleStudents.map((student) => <option key={student.userId} value={student.userId}>{student.fullName ?? student.email} · {student.email}</option>)}</select><PrimaryButton type="button" className="w-full sm:w-auto" disabled={!assignUserId} onClick={handleAssignStudent}>Xep vao lop</PrimaryButton></div>
            <div className="mt-4 border-t border-drive-border pt-4"><p className="text-xs font-semibold uppercase text-drive-muted">Diem danh</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><select value={checkInUserId} onChange={(e) => setCheckInUserId(e.target.value)} className="min-h-12 flex-1 rounded-drive border border-drive-border bg-drive-elevated px-3 text-drive-text"><option value="">Chon hoc vien da xep lop</option>{scheduledRoster.map((student) => <option key={student.userId} value={student.userId}>{student.studentName} · {student.studentEmail}</option>)}</select><PrimaryButton type="button" className="w-full sm:w-auto" disabled={!checkInUserId} onClick={handleCheckIn}>Xac nhan co mat</PrimaryButton></div></div>
            <ul className="mt-4 space-y-1 text-sm">{roster.map((student) => <li key={student.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-drive border border-drive-border-soft bg-drive-sidebar px-3 py-2"><span><span className="block font-medium text-drive-text">{student.studentName}</span><span className="text-xs text-drive-muted">{student.studentEmail}</span></span><span className="flex items-center gap-2"><StatusBadge tone={student.status === "attended" ? "success" : student.status === "cancelled" ? "danger" : "info"}>{student.status === "attended" ? "Co mat" : student.status === "cancelled" ? "Da huy" : "Da xep"}</StatusBadge>{student.status === "scheduled" ? <button type="button" onClick={() => handleRemoveStudent(student.userId)} className="text-xs text-drive-danger hover:underline">Bo</button> : null}</span></li>)}</ul>
            {!roster.length ? <p className="mt-4 text-sm text-drive-muted">Chua xep hoc vien nao vao lop nay.</p> : null}
            {attendance.length ? <p className="mt-4 text-xs text-drive-muted">Da diem danh {attendance.length} hoc vien.</p> : null}
          </> : <p className="mt-2 text-sm text-drive-muted">Chon mot buoi hoc.</p>}</UiCard>
      </div>
    </section>
  )
}
