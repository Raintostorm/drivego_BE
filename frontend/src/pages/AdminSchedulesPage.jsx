import { useEffect, useMemo, useState } from "react"
import { PageHeader } from "../components/PageHeader.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { fetchAdminRegistrations, patchAdminRegistration } from "../lib/admin-api.js"

const TABS = [
  { id: "theory_exam", label: "Sát hạch lý thuyết" },
  { id: "road_test", label: "Chạy thử / thực hành" },
]

const STATUS_TABS = [
  { id: "pending", label: "Chờ duyệt" },
  { id: "confirmed", label: "Đã xác nhận" },
  { id: "rejected", label: "Đã từ chối" },
]

const STATUS_LABEL = { pending: "Chờ duyệt", confirmed: "Đã xác nhận", rejected: "Đã từ chối" }

function regStatusTone(status) {
  if (status === "confirmed") return "success"
  if (status === "rejected") return "danger"
  return "warning"
}

export function AdminSchedulesPage() {
  const [slotType, setSlotType] = useState("theory_exam")
  const [status, setStatus] = useState("pending")
  const [query, setQuery] = useState("")
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [busyId, setBusyId] = useState(null)

  function load() {
    setLoading(true)
    fetchAdminRegistrations({ status, slotType })
      .then(setRows)
      .catch((e) => setMessage(e instanceof Error ? e.message : "Lỗi"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchAdminRegistrations({ status, slotType })
      .then(setRows)
      .catch((e) => setMessage(e instanceof Error ? e.message : "Lỗi"))
      .finally(() => setLoading(false))
  }, [slotType, status])

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("vi-VN")
    if (!needle) return rows
    return rows.filter((row) => `${row.studentName ?? ""} ${row.studentEmail ?? ""}`.toLocaleLowerCase("vi-VN").includes(needle))
  }, [query, rows])

  async function handlePatch(regId, status) {
    setBusyId(regId)
    setMessage(null)
    try {
      await patchAdminRegistration(regId, { status })
      setMessage(status === "confirmed" ? "Đã xác nhận ca." : "Đã từ chối đăng ký.")
      load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Lỗi")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader title="Duyệt đăng ký ca thi" subtitle="Xác nhận yêu cầu đăng ký ca sát hạch" />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSlotType(tab.id)}
            className={`rounded-drive px-4 py-2 text-sm ${
              slotType === tab.id
                ? "bg-drive-accent text-drive-accent-contrast"
                : "border border-drive-border bg-drive-elevated text-drive-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <UiCard variant="panel" className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => { setLoading(true); setStatus(tab.id) }} className={`min-h-10 rounded-drive-pill px-4 text-sm ${status === tab.id ? "bg-drive-action font-semibold text-drive-action-contrast" : "border border-drive-border bg-drive-elevated text-drive-muted"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm tên hoặc email học viên" className="min-h-11 w-full rounded-drive border border-drive-border bg-drive-elevated px-3 text-sm text-drive-text outline-none focus:ring-2 focus:ring-drive-action" />
      </UiCard>

      {message ? (
        <UiCard variant="panel">
          <p className="text-sm text-drive-action">{message}</p>
        </UiCard>
      ) : null}

      <UiCard variant="panel">
        {loading ? (
          <p className="text-drive-muted">Đang tải…</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-drive-muted">Không có đăng ký phù hợp.</p>
        ) : (
          <div className="space-y-4">
            {filteredRows.map((r) => (
              <div
                key={r.id}
                className="rounded-drive border border-drive-border-soft bg-drive-sidebar p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{r.studentName}</p>
                    <p className="text-xs text-drive-muted">{r.studentEmail}</p>
                    {r.slot ? (
                      <p className="mt-2 text-sm text-drive-text">
                        {new Date(r.slot.date).toLocaleDateString("vi-VN")} ·{" "}
                        {String(r.slot.startTime).slice(0, 5)}–{String(r.slot.endTime).slice(0, 5)}
                        {r.slot.venue ? ` · ${r.slot.venue}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge tone={regStatusTone(r.status)}>{STATUS_LABEL[r.status] ?? r.status}</StatusBadge>
                </div>
                {r.status === "pending" ? <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <PrimaryButton
                    variant="action"
                    className="!py-1.5 !text-xs"
                    disabled={busyId === r.id}
                    onClick={() => handlePatch(r.id, "confirmed")}
                  >
                    Xác nhận
                  </PrimaryButton>
                  <PrimaryButton
                    variant="outline"
                    className="!py-1.5 !text-xs"
                    disabled={busyId === r.id}
                    onClick={() => handlePatch(r.id, "rejected")}
                  >
                    Từ chối
                  </PrimaryButton>
                </div> : r.adminNote ? <p className="mt-3 rounded-drive bg-drive-elevated p-3 text-sm text-drive-muted">Ghi chú: {r.adminNote}</p> : null}
              </div>
            ))}
          </div>
        )}
      </UiCard>
    </section>
  )
}
