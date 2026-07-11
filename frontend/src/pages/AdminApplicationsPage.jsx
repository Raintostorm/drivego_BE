import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { fetchAdminApplications } from "../lib/admin-api.js"

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "draft", label: "Nháp (chưa nộp)" },
  { value: "submitted", label: "Đã nộp" },
  { value: "reviewing", label: "Đang xem" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Từ chối" },
]

const STATUS_LABEL = {
  draft: "Nháp",
  submitted: "Đã nộp",
  reviewing: "Đang duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
}

function statusTone(status) {
  if (status === "approved") return "success"
  if (status === "rejected") return "danger"
  if (status === "reviewing") return "warning"
  if (status === "draft") return "warning"
  return "neutral"
}

export function AdminApplicationsPage() {
  const [status, setStatus] = useState("")
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetchAdminApplications({ status: status || undefined })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"))
      .finally(() => setLoading(false))
  }, [status])

  return (
    <section className="space-y-6">
      <PageHeader
        title="Hồ sơ học viên"
        subtitle="Nháp đang soạn, hồ sơ đã nộp và yêu cầu nộp lại"
      />

      <UiCard variant="panel">
        <label className="text-sm text-drive-muted">
          Trạng thái
          <select
            className="mt-1 block rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-white"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </UiCard>

      {error ? (
        <UiCard variant="panel">
          <p className="text-sm text-drive-danger">{error}</p>
        </UiCard>
      ) : null}

      <UiCard variant="panel">
        {loading ? (
          <p className="text-drive-muted">Đang tải…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-drive-muted">Không có hồ sơ.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-drive-border text-drive-muted">
                  <th className="py-2 pr-4">Học viên</th>
                  <th className="py-2 pr-4">Hạng</th>
                  <th className="py-2 pr-4">Trạng thái</th>
                  <th className="py-2 pr-4">Ngày nộp</th>
                  <th className="py-2 pr-4">Hạn hồ sơ</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-drive-border-soft">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{r.studentName}</p>
                      <p className="text-xs text-drive-muted">{r.studentEmail}</p>
                    </td>
                    <td className="py-3 pr-4 text-white">{r.licenseClass}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge tone={statusTone(r.status)}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </StatusBadge>
                    </td>
                    <td className="py-3 pr-4 text-drive-muted">
                      {r.submittedAt
                        ? new Date(r.submittedAt).toLocaleString("vi-VN")
                        : "—"}
                    </td>
                    <td className="py-3 pr-4 text-drive-muted">
                      {r.dossierDeadline
                        ? new Date(r.dossierDeadline).toLocaleString("vi-VN")
                        : r.dossierRequestedAt
                          ? "Đã yêu cầu"
                          : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/admin/applications/${r.id}`}
                        className="text-drive-action hover:underline"
                      >
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </UiCard>
    </section>
  )
}
