import { useEffect, useState } from "react"
import { PageHeader } from "../components/PageHeader.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { fetchAdminRegistrations, patchAdminRegistration } from "../lib/admin-api.js"

const TABS = [
  { id: "theory_exam", label: "Sát hạch lý thuyết" },
  { id: "road_test", label: "Chạy thử / thực hành" },
]

function regStatusTone(status) {
  if (status === "confirmed") return "success"
  if (status === "rejected") return "danger"
  return "warning"
}

export function AdminSchedulesPage() {
  const [slotType, setSlotType] = useState("theory_exam")
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [busyId, setBusyId] = useState(null)

  function load() {
    setLoading(true)
    fetchAdminRegistrations({ status: "pending", slotType })
      .then(setRows)
      .catch((e) => setMessage(e instanceof Error ? e.message : "Lỗi"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [slotType])

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

      {message ? (
        <UiCard variant="panel">
          <p className="text-sm text-drive-action">{message}</p>
        </UiCard>
      ) : null}

      <UiCard variant="panel">
        {loading ? (
          <p className="text-drive-muted">Đang tải…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-drive-muted">Không có đăng ký chờ duyệt.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => (
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
                  <StatusBadge tone={regStatusTone(r.status)}>{r.status}</StatusBadge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </UiCard>
    </section>
  )
}
