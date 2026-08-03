import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
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

const PAGE_OPENED_AT = Date.now()

function statusTone(status) {
  if (status === "approved") return "success"
  if (status === "rejected") return "danger"
  if (status === "reviewing") return "warning"
  if (status === "draft") return "warning"
  return "neutral"
}

export function AdminApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState(() => searchParams.get("status") ?? "")
  const [licenseClass, setLicenseClass] = useState("")
  const [query, setQuery] = useState("")
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  function selectStatus(value) {
    setLoading(true)
    setStatus(value)
    const next = new URLSearchParams(searchParams)
    if (value) next.set("status", value)
    else next.delete("status")
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    fetchAdminApplications({
      status: status || undefined,
      licenseClass: licenseClass || undefined,
    })
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"))
      .finally(() => setLoading(false))
  }, [status, licenseClass])

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("vi-VN")
    if (!needle) return rows
    return rows.filter((row) =>
      `${row.studentName ?? ""} ${row.studentEmail ?? ""}`
        .toLocaleLowerCase("vi-VN")
        .includes(needle),
    )
  }, [query, rows])

  const statusCounts = useMemo(
    () => rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] ?? 0) + 1 }), {}),
    [rows],
  )

  function deadlineMeta(row) {
    if (!row.dossierDeadline) return null
    const deadline = new Date(row.dossierDeadline)
    const days = Math.ceil((deadline.getTime() - PAGE_OPENED_AT) / 86_400_000)
    if (days < 0) return { label: `Quá hạn ${Math.abs(days)} ngày`, tone: "danger" }
    if (days <= 7) return { label: `Còn ${days} ngày`, tone: "warning" }
    return { label: deadline.toLocaleDateString("vi-VN"), tone: "neutral" }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Hồ sơ học viên"
        subtitle="Nháp đang soạn, hồ sơ đã nộp và yêu cầu nộp lại"
      />

      <UiCard variant="panel" className="space-y-4">
        <div className="flex flex-wrap gap-2" aria-label="Lọc nhanh trạng thái hồ sơ">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => selectStatus(option.value)}
              className={`min-h-10 rounded-drive-pill px-4 text-sm transition ${
                status === option.value
                  ? "bg-drive-action font-semibold text-drive-action-contrast"
                  : "border border-drive-border bg-drive-elevated text-drive-muted hover:text-drive-text"
              }`}
            >
              {option.label}
              {option.value && statusCounts[option.value] ? ` · ${statusCounts[option.value]}` : ""}
            </button>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <label className="text-sm text-drive-muted">
            Tìm học viên
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tên hoặc email"
              className="mt-1 block min-h-11 w-full rounded-drive border border-drive-border bg-drive-elevated px-3 text-drive-text outline-none focus:ring-2 focus:ring-drive-action"
            />
          </label>
          <label className="text-sm text-drive-muted">
            Hạng bằng
            <select
              className="mt-1 block min-h-11 w-full rounded-drive border border-drive-border bg-drive-elevated px-3 text-drive-text"
              value={licenseClass}
              onChange={(e) => { setLoading(true); setLicenseClass(e.target.value) }}
            >
              <option value="">Tất cả hạng</option>
              {["A1", "A2", "B1", "B2"].map((code) => <option key={code}>{code}</option>)}
            </select>
          </label>
        </div>
      </UiCard>

      {error ? (
        <UiCard variant="panel">
          <p className="text-sm text-drive-danger">{error}</p>
        </UiCard>
      ) : null}

      <UiCard variant="panel">
        {loading ? (
          <p className="text-drive-muted">Đang tải…</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-drive-muted">Không có hồ sơ.</p>
        ) : (
          <>
          <div className="grid gap-3 md:hidden">
            {filteredRows.map((row) => {
              const deadline = deadlineMeta(row)
              return (
                <article key={row.id} className="rounded-drive border border-drive-border-soft bg-drive-sidebar p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-drive-text">{row.studentName}</p>
                      <p className="truncate text-xs text-drive-muted">{row.studentEmail}</p>
                    </div>
                    <StatusBadge tone={statusTone(row.status)}>{STATUS_LABEL[row.status] ?? row.status}</StatusBadge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-drive-muted">
                    <span className="rounded-full border border-drive-border px-2 py-1">Hạng {row.licenseClass}</span>
                    {deadline ? <StatusBadge tone={deadline.tone}>{deadline.label}</StatusBadge> : null}
                    <span>{row.submittedAt ? `Nộp ${new Date(row.submittedAt).toLocaleDateString("vi-VN")}` : "Chưa nộp"}</span>
                  </div>
                  <Link to={`/admin/applications/${row.id}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-drive bg-drive-action text-sm font-semibold text-drive-action-contrast">
                    Xem và xử lý hồ sơ
                  </Link>
                </article>
              )
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
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
                {filteredRows.map((r) => {
                  const deadline = deadlineMeta(r)
                  return (
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
                      {deadline ? <StatusBadge tone={deadline.tone}>{deadline.label}</StatusBadge> : r.dossierRequestedAt ? "Đã yêu cầu" : "—"}
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
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </UiCard>
    </section>
  )
}
