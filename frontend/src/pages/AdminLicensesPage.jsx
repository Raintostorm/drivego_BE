import { useEffect, useMemo, useState } from "react"
import { PageHeader } from "../components/PageHeader.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { Pagination } from "../components/Pagination.jsx"
import { fetchAdminLicenses, reviewAdminLicense } from "../lib/admin-api.js"
import { usePagination } from "../hooks/usePagination.js"

const STATUS = {
  unverified: ["Chưa xác minh", "neutral"],
  pending: ["Chờ xác minh", "warning"],
  verified: ["Đã xác minh", "success"],
  rejected: ["Cần cập nhật", "danger"],
}

function expiryLabel(row) {
  const state = row.expiryState
  if (state?.stage === "no_expiry") {
    return ["A1", "A", "B1"].includes(row.licenseClass) ? "Không thời hạn" : "Chưa cập nhật hạn"
  }
  if (state?.stage === "expired") return `Quá hạn ${Math.abs(state.days)} ngày`
  if (state?.days != null && state.days <= 90) return `Còn ${state.days} ngày`
  return row.expiresAt ? new Date(row.expiresAt).toLocaleDateString("vi-VN") : "—"
}

export function AdminLicensesPage() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState("all")

  function load(q = query) {
    setLoading(true)
    fetchAdminLicenses(q).then(setRows).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => {
    fetchAdminLicenses("")
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const summary = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => ["pending", "unverified"].includes(r.verificationStatus)).length,
    warning: rows.filter((r) => ["90_days", "30_days", "7_days"].includes(r.expiryState?.stage)).length,
    expired: rows.filter((r) => r.expiryState?.stage === "expired").length,
  }), [rows])

  const visibleRows = useMemo(() => rows.filter((row) => {
    if (tab === "pending") return ["pending", "unverified"].includes(row.verificationStatus)
    if (tab === "warning") return ["90_days", "30_days", "7_days"].includes(row.expiryState?.stage)
    if (tab === "expired") return row.expiryState?.stage === "expired"
    return true
  }), [rows, tab])
  const pagination = usePagination(visibleRows)

  async function review(row, status) {
    try {
      await reviewAdminLicense(row.id, { status })
      load()
    } catch (e) { setError(e.message) }
  }

  return (
    <section className="space-y-6">
      <PageHeader title="GPLX và hạn sử dụng" subtitle="Xác minh giấy phép, theo dõi hạn và chủ động liên hệ học viên." />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[['Tổng GPLX', summary.total], ['Chờ xác minh', summary.pending], ['Sắp hết hạn', summary.warning], ['Đã hết hạn', summary.expired]].map(([label, value]) => (
          <UiCard key={label} variant="panel"><p className="text-sm text-drive-muted">{label}</p><p className="mt-2 text-3xl font-bold text-white">{value}</p></UiCard>
        ))}
      </div>
      <UiCard variant="panel" className="space-y-4">
      <div className="touch-pan-x flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Lọc GPLX">
        {[["all", "Tất cả", summary.total], ["pending", "Chờ xác minh", summary.pending], ["warning", "Sắp hết hạn", summary.warning], ["expired", "Đã hết hạn", summary.expired]].map(([id, label, count]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-11 shrink-0 rounded-drive-pill px-4 text-sm font-medium ${tab === id ? "bg-drive-action text-drive-action-contrast" : "border border-drive-border bg-drive-elevated text-drive-muted"}`}>{label} · {count}</button>)}
      </div>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); load() }}>
        <input className="min-w-0 flex-1 rounded-drive border border-drive-border bg-drive-elevated px-4 py-3 text-white" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tên, email hoặc số GPLX" />
        <button className="rounded-drive-pill bg-drive-action px-5 font-bold text-drive-action-contrast">Tìm</button>
      </form>
      </UiCard>
      {error ? <p className="text-drive-danger">{error}</p> : null}
      {loading ? <p className="text-drive-muted">Đang tải...</p> : (
        <UiCard variant="panel" padding="sm">
          <div className="grid gap-3 md:hidden">
            {pagination.pageItems.map((row) => {
              const [label, tone] = STATUS[row.verificationStatus] ?? STATUS.unverified
              const expiryTone = row.expiryState?.stage === "expired" ? "danger" : ["90_days", "30_days", "7_days"].includes(row.expiryState?.stage) ? "warning" : "neutral"
              return <article key={row.id} className="rounded-drive border border-drive-border-soft bg-drive-sidebar p-4">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-drive-text">{row.studentName || row.studentEmail}</p><p className="truncate text-xs text-drive-muted">{row.studentEmail}</p></div><StatusBadge tone={tone}>{label}</StatusBadge></div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-drive-muted">GPLX</dt><dd className="mt-1 text-drive-text">Hạng {row.licenseClass}</dd><dd className="truncate text-xs text-drive-muted">{row.licenseNumber || "Chưa nhập số"}</dd></div><div><dt className="text-xs text-drive-muted">Hạn sử dụng</dt><dd className="mt-1"><StatusBadge tone={expiryTone}>{expiryLabel(row)}</StatusBadge></dd></div><div><dt className="text-xs text-drive-muted">Ngày cấp</dt><dd className="mt-1 text-drive-text">{row.issuedAt ? new Date(row.issuedAt).toLocaleDateString("vi-VN") : "—"}</dd></div><div><dt className="text-xs text-drive-muted">Nguồn</dt><dd className="mt-1 text-drive-text">{row.verificationSource === "profile_import" ? "Hồ sơ cũ" : "Học viên khai báo"}</dd></div></dl>
                <div className="mt-4 grid grid-cols-2 gap-2">{row.verificationStatus !== "verified" ? <button type="button" onClick={() => review(row, "verified")} className="min-h-11 rounded-drive bg-drive-success px-3 text-sm font-bold text-black">Xác minh</button> : <span />}<button type="button" onClick={() => review(row, "rejected")} className="min-h-11 rounded-drive border border-drive-danger/40 px-3 text-sm font-medium text-drive-danger">Yêu cầu sửa</button></div>
              </article>
            })}
          </div>
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead><tr className="border-b border-drive-border text-drive-muted"><th className="py-3">Học viên</th><th>GPLX</th><th>Ngày cấp</th><th>Hạn sử dụng</th><th>Xác minh</th><th /></tr></thead>
            <tbody>{pagination.pageItems.map((row) => {
              const [label, tone] = STATUS[row.verificationStatus] ?? STATUS.unverified
              return <tr key={row.id} className="border-b border-drive-border-soft">
                <td className="py-4"><p className="font-medium text-white">{row.studentName || row.studentEmail}</p><p className="text-xs text-drive-muted">{row.studentEmail}</p></td>
                <td><p className="text-white">Hạng {row.licenseClass}</p><p className="text-xs text-drive-muted">{row.licenseNumber || "Chưa nhập số"}</p></td>
                <td className="text-drive-muted">{row.issuedAt ? new Date(row.issuedAt).toLocaleDateString("vi-VN") : "—"}</td>
                <td className={row.expiryState?.stage === "expired" ? "text-drive-danger" : "text-white"}>{expiryLabel(row)}</td>
                <td><StatusBadge tone={tone}>{label}</StatusBadge></td>
                <td className="space-x-2 text-right">{row.verificationStatus !== "verified" ? <button type="button" onClick={() => review(row, "verified")} className="min-h-10 px-2 text-drive-success">Duyệt</button> : null}<button type="button" onClick={() => review(row, "rejected")} className="min-h-10 px-2 text-drive-danger">Yêu cầu sửa</button></td>
              </tr>
            })}</tbody>
          </table>
          </div>
          {!visibleRows.length ? <p className="py-8 text-center text-drive-muted">Không có GPLX phù hợp với bộ lọc.</p> : null}
          <Pagination {...pagination} total={visibleRows.length} onPageChange={pagination.setPage} label="GPLX" />
        </UiCard>
      )}
    </section>
  )
}
