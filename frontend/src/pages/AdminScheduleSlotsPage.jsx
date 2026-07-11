import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { TextField } from "../components/TextField.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { useAuth } from "../context/AuthContext.jsx"
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

export function AdminScheduleSlotsPage() {
  const { user } = useAuth()
  const isSystemAdmin = user?.role === "system_admin"
  const [rows, setRows] = useState([])
  const [centers, setCenters] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)

  function reload() {
    fetchAdminSlots().then(setRows).catch((e) => setError(e.message))
  }

  useEffect(() => {
    reload()
  }, [])

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

      <UiCard variant="panel">
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          {isSystemAdmin ? (
            <label className="sm:col-span-2 block text-sm">
              <span className="mb-2 block font-medium text-drive-text">Trung tâm</span>
              <select
                className="w-full rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-white"
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
            className="rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-white"
            value={form.slotType}
            onChange={(e) => setForm({ ...form, slotType: e.target.value })}
          >
            <option value="theory_exam">Thi lý thuyết</option>
            <option value="road_test">Chạy thử / thực hành</option>
          </select>
          <TextField
            label="Sức chứa"
            type="number"
            value={String(form.capacity)}
            onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
          />
          <PrimaryButton type="submit" className="sm:col-span-2">
            Tạo ca
          </PrimaryButton>
        </form>
      </UiCard>

      <UiCard variant="panel" className="overflow-x-auto">
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
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-drive-border-soft">
                <td className="py-2 text-white">{s.date ?? s.slotDate}</td>
                <td className="py-2 text-white">
                  {s.startTime}–{s.endTime}
                </td>
                <td className="py-2">{s.licenseClass}</td>
                <td className="py-2 text-drive-muted">
                  {s.heldSeats ?? s.registeredCount ?? 0}/{s.capacity}
                </td>
                <td className="py-2">{s.slotType}</td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    className="text-drive-danger text-xs"
                    onClick={() => deleteAdminSlot(s.id).then(reload)}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </UiCard>
    </section>
  )
}
