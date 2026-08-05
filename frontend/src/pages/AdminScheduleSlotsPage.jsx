import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { TextField } from "../components/TextField.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { useAuth } from "../context/AuthContext.jsx"
import { Pagination } from "../components/Pagination.jsx"
import { usePagination } from "../hooks/usePagination.js"
import {
  createAdminSlot,
  deleteAdminSlot,
  fetchAdminCenters,
  fetchAdminSlots,
} from "../lib/admin-api.js"

const EMPTY = {
  slotDate: "",
  startTime: "08:00",
  endTime: "10:00",
  venue: "",
  licenseClass: "B2",
  slotType: "theory_exam",
  capacity: 30,
  centerId: "",
}

const SLOT_LABEL = { theory_exam: "Thi lý thuyết", road_test: "Chạy thử / thực hành" }

function formatDate(value) {
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function AdminScheduleSlotsPage() {
  const { user } = useAuth()
  const isSystemAdmin = user?.role === "system_admin"
  const [rows, setRows] = useState([])
  const [centers, setCenters] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [slotTypeFilter, setSlotTypeFilter] = useState("")
  const pagination = usePagination(rows)

  function reload() {
    fetchAdminSlots(slotTypeFilter ? { slotType: slotTypeFilter } : {}).then(setRows).catch((e) => setError(e.message))
  }

  useEffect(() => {
    fetchAdminSlots(slotTypeFilter ? { slotType: slotTypeFilter } : {})
      .then(setRows)
      .catch((e) => setError(e.message))
  }, [slotTypeFilter])

  useEffect(() => {
    if (isSystemAdmin) {
      fetchAdminCenters()
        .then(setCenters)
        .catch(() => setCenters([]))
    }
  }, [isSystemAdmin])

  async function handleCreate(e) {
    e.preventDefault()
    try {
      const payload = { ...form, capacity: Number(form.capacity) }
      if (!isSystemAdmin) delete payload.centerId
      await createAdminSlot(payload)
      setForm({ ...EMPTY, centerId: form.centerId })
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi")
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Quản lý ca thi"
        subtitle="Tạo ca lý thuyết / chạy thử"
        actions={
          <Link to="/admin/schedules" className="text-sm text-drive-action">
            Đăng ký chờ duyệt →
          </Link>
        }
      />
      {error ? <p className="text-drive-danger">{error}</p> : null}

      <UiCard variant="panel" className="space-y-4">
        <div>
          <h2 className="font-semibold text-drive-text">Tạo ca thi mới</h2>
          <p className="mt-1 text-sm text-drive-muted">Thiết lập thời gian, sức chứa và địa điểm trước khi mở đăng ký.</p>
        </div>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          {isSystemAdmin ? (
            <label className="sm:col-span-2 block text-sm">
              <span className="mb-2 block font-medium text-drive-text">Trung tâm</span>
              <select
                className="min-h-12 w-full rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-drive-text"
                value={form.centerId}
                onChange={(e) => setForm({ ...form, centerId: e.target.value })}
                required
              >
                <option value="">— Chọn trung tâm —</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <TextField
            label="Ngày"
            type="date"
            value={form.slotDate}
            onChange={(e) => setForm({ ...form, slotDate: e.target.value })}
            required
          />
          <TextField
            label="Hạng"
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
            label="Sức chứa"
            type="number"
            value={String(form.capacity)}
            onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
          />
          <TextField
            label="Kết thúc"
            type="time"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          />
          <TextField
            label="Địa điểm"
            value={form.venue}
            onChange={(e) => setForm({ ...form, venue: e.target.value })}
            className="sm:col-span-2"
          />
          <select
            className="min-h-12 rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-drive-text"
            value={form.slotType}
            onChange={(e) => setForm({ ...form, slotType: e.target.value })}
          >
            <option value="theory_exam">Thi lý thuyết</option>
            <option value="road_test">Chạy thử / thực hành</option>
          </select>
          <PrimaryButton type="submit" className="sm:col-span-2">
            Tạo ca
          </PrimaryButton>
        </form>
      </UiCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-drive-text">Danh sách ca thi</h2>
        <select value={slotTypeFilter} onChange={(e) => setSlotTypeFilter(e.target.value)} className="min-h-11 w-full rounded-drive border border-drive-border bg-drive-elevated px-3 text-sm text-drive-text sm:w-auto">
          <option value="">Tất cả loại ca</option>
          <option value="theory_exam">Thi lý thuyết</option>
          <option value="road_test">Chạy thử / thực hành</option>
        </select>
      </div>

      {!rows.length ? <UiCard variant="panel"><p className="text-sm text-drive-muted">Chưa có ca thi phù hợp với bộ lọc.</p></UiCard> : null}

      <div className="grid gap-3 md:hidden">
        {pagination.pageItems.map((slot) => {
          const held = slot.heldSeats ?? slot.registeredCount ?? 0
          const percent = Math.min(100, Math.round((held / Math.max(1, slot.capacity)) * 100))
          return <UiCard key={slot.id} variant="panel">
            <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-drive-text">{formatDate(slot.date ?? slot.slotDate)}</p><p className="mt-1 text-sm text-drive-muted">{String(slot.startTime).slice(0, 5)}–{String(slot.endTime).slice(0, 5)} · Hạng {slot.licenseClass}</p></div><StatusBadge tone={percent >= 100 ? "danger" : percent >= 80 ? "warning" : "success"}>{held}/{slot.capacity} chỗ</StatusBadge></div>
            <p className="mt-3 text-sm text-drive-muted">{SLOT_LABEL[slot.slotType]}{slot.venue ? ` · ${slot.venue}` : ""}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-drive-elevated"><div className="h-full bg-drive-action" style={{ width: `${percent}%` }} /></div>
            <button type="button" className="mt-4 min-h-11 w-full rounded-drive border border-drive-danger text-sm text-drive-danger" onClick={() => { if (held > 0) { setError("Không thể xóa nhanh ca đã có học viên giữ chỗ."); return } if (window.confirm("Xóa ca thi này?")) deleteAdminSlot(slot.id).then(reload) }}>Xóa ca</button>
          </UiCard>
        })}
      </div>

      {rows.length ? <UiCard variant="panel" className="hidden overflow-x-auto md:block">
        <table className="min-w-[720px] w-full text-sm">
          <thead>
            <tr className="text-drive-muted">
              <th className="py-2 text-left">Ngày</th>
              <th className="py-2 text-left">Giờ</th>
              <th className="py-2 text-left">Hạng</th>
              <th className="py-2 text-left">Chỗ</th>
              <th className="py-2 text-left">Loại</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((s) => (
              <tr key={s.id} className="border-t border-drive-border-soft">
                <td className="py-3 text-drive-text">{formatDate(s.date ?? s.slotDate)}</td>
                <td className="py-3 text-drive-text">
                  {String(s.startTime).slice(0, 5)}–{String(s.endTime).slice(0, 5)}
                </td>
                <td className="py-2">{s.licenseClass}</td>
                <td className="py-2 text-drive-muted">
                  {s.heldSeats ?? s.registeredCount ?? 0}/{s.capacity}
                </td>
                <td className="py-2">{SLOT_LABEL[s.slotType]}</td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    className="text-drive-danger text-xs"
                    onClick={() => {
                      const held = s.heldSeats ?? s.registeredCount ?? 0
                      if (held > 0) { setError("Không thể xóa nhanh ca đã có học viên giữ chỗ."); return }
                      if (window.confirm("Xóa ca thi này?")) deleteAdminSlot(s.id).then(reload)
                    }}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </UiCard> : null}
      <Pagination {...pagination} total={rows.length} onPageChange={pagination.setPage} label="ca thi" />
    </section>
  )
}
