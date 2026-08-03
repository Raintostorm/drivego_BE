import { useEffect, useMemo, useState } from "react"
import { PageHeader } from "../components/PageHeader.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { fetchAdminLicenses, reviewAdminLicense } from "../lib/admin-api.js"

const STATUS = {
  unverified: ["Chưa xác minh", "neutral"],
  pending: ["Chờ xác minh", "warning"],
  verified: ["Đã xác minh", "success"],
  rejected: ["Cần cập nhật", "danger"],
}

function expiryLabel(row) {
  const state = row.expiryState
  if (state?.stage === "no_expiry") return "Không thời hạn"
  if (state?.stage === "expired") return `Quá hạn ${Math.abs(state.days)} ngày`
  if (state?.days != null && state.days <= 90) return `Còn ${state.days} ngày`
  return row.expiresAt ? new Date(row.expiresAt).toLocaleDateString("vi-VN") : "—"
}

export function AdminLicensesPage() {
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
    pending: rows.filter((r) => r.verificationStatus === "pending").length,
    warning: rows.filter((r) => ["90_days", "30_days", "7_days"].includes(r.expiryState?.stage)).length,
    expired: rows.filter((r) => r.expiryState?.stage === "expired").length,
  }), [rows])

  async function review(row, status) {
    try {
      await reviewAdminLicense(row.id, { status })
      load()
    } catch (e) { setError(e.message) }
  }

  return (
    <section className="space-y-6">
      <PageHeader title="GPLX và hạn sử dụng" subtitle="Xác minh giấy phép, theo dõi hạn và chủ động liên hệ học viên." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[['Tổng GPLX', summary.total], ['Chờ xác minh', summary.pending], ['Sắp hết hạn', summary.warning], ['Đã hết hạn', summary.expired]].map(([label, value]) => (
          <UiCard key={label} variant="panel"><p className="text-sm text-drive-muted">{label}</p><p className="mt-2 text-3xl font-bold text-white">{value}</p></UiCard>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); load() }}>
        <input className="min-w-0 flex-1 rounded-drive border border-drive-border bg-drive-elevated px-4 py-3 text-white" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tên, email hoặc số GPLX" />
        <button className="rounded-drive-pill bg-drive-action px-5 font-bold text-drive-action-contrast">Tìm</button>
      </form>
      {error ? <p className="text-drive-danger">{error}</p> : null}
      {loading ? <p className="text-drive-muted">Đang tải...</p> : (
        <UiCard variant="panel" className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead><tr className="border-b border-drive-border text-drive-muted"><th className="py-3">Học viên</th><th>GPLX</th><th>Ngày cấp</th><th>Hạn sử dụng</th><th>Xác minh</th><th /></tr></thead>
            <tbody>{rows.map((row) => {
              const [label, tone] = STATUS[row.verificationStatus] ?? STATUS.unverified
              return <tr key={row.id} className="border-b border-drive-border-soft">
                <td className="py-4"><p className="font-medium text-white">{row.studentName || row.studentEmail}</p><p className="text-xs text-drive-muted">{row.studentEmail}</p></td>
                <td><p className="text-white">Hạng {row.licenseClass}</p><p className="text-xs text-drive-muted">{row.licenseNumber || "Chưa nhập số"}</p></td>
                <td className="text-drive-muted">{row.issuedAt ? new Date(row.issuedAt).toLocaleDateString("vi-VN") : "—"}</td>
                <td className={row.expiryState?.stage === "expired" ? "text-drive-danger" : "text-white"}>{expiryLabel(row)}</td>
                <td><StatusBadge tone={tone}>{label}</StatusBadge></td>
                <td className="space-x-2 text-right">{row.verificationStatus !== "verified" ? <button onClick={() => review(row, "verified")} className="text-drive-success">Duyệt</button> : null}<button onClick={() => review(row, "rejected")} className="text-drive-danger">Yêu cầu sửa</button></td>
              </tr>
            })}</tbody>
          </table>
          {!rows.length ? <p className="py-8 text-center text-drive-muted">Chưa có GPLX nào được khai báo.</p> : null}
        </UiCard>
      )}
    </section>
  )
}
