import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { Pagination } from "../components/Pagination.jsx"
import { fetchAdminStudents } from "../lib/admin-api.js"
import { formatPremiumDate } from "../lib/premium.js"
import { displayLicenseClass } from "../lib/license-class.js"
import { usePagination } from "../hooks/usePagination.js"

function paymentTone(payment) {
  if (!payment) return "neutral"
  if (payment.status === "pending") return "warning"
  if (payment.status === "expired") return "danger"
  if (payment.status === "failed") return "danger"
  if (payment.status !== "paid") return "danger"
  if (payment.method === "direct") return "warning"
  if (payment.method === "sepay" || payment.sepayTransactionId) return "success"
  return "success"
}

function paymentLabel(payment) {
  if (!payment) return "Chưa có thanh toán"
  if (payment.status === "pending") return "Chờ thanh toán"
  if (payment.status === "expired") return "Quá hạn thanh toán"
  if (payment.status === "failed") return "Thanh toán lỗi"
  if (payment.status !== "paid") return payment.status
  if (payment.method === "direct") return "Đã thu tiền mặt"
  if (payment.method === "sepay" || payment.sepayTransactionId) return "Đã thanh toán qua SePay"
  return "Đã thanh toán"
}

function formatMoney(value) {
  return Number(value ?? 0).toLocaleString("vi-VN")
}

export function AdminStudentsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("all")
  const [error, setError] = useState(null)

  useEffect(() => {
    const params =
      tab === "premium"
        ? { premium: "true" }
        : tab === "enrolled"
          ? { enrolled: "true" }
          : {}
    fetchAdminStudents(params)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"))
      .finally(() => setLoading(false))
  }, [tab])

  const filtered = useMemo(() => {
    if (tab === "premium") return rows.filter((r) => r.isPremium)
    if (tab === "enrolled") return rows.filter((r) => r.isEnrolled)
    return rows
  }, [rows, tab])
  const pagination = usePagination(filtered)

  return (
    <section className="space-y-6">
      <PageHeader
        title="Học viên"
        subtitle="Premium và đăng ký khóa — admin không thanh toán Premium trên hệ thống."
      />

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "Tất cả" },
          { id: "premium", label: "Đã Premium" },
          { id: "enrolled", label: "Đã đăng ký khóa" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
          onClick={() => { setLoading(true); setTab(t.id) }}
            className={`rounded-drive-pill px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-drive-action text-drive-action-contrast"
                : "border border-drive-border text-drive-muted hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-drive-danger">{error}</p> : null}
      {loading ? (
        <p className="text-drive-muted">Đang tải…</p>
      ) : (
        <UiCard variant="panel" padding="sm">
          <div className="grid gap-3 md:hidden">
            {pagination.pageItems.map((r) => (
              <article key={r.userId} className="rounded-drive border border-drive-border-soft bg-drive-sidebar p-4">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold text-drive-text">{r.fullName ?? r.email}</p><p className="truncate text-xs text-drive-muted">{r.email}</p></div>{r.isPremium ? <StatusBadge tone="success">Premium</StatusBadge> : <StatusBadge tone="neutral">Free</StatusBadge>}</div>
                <div className="mt-4">
                  <p className="text-xs text-drive-muted">Khóa đang học</p>
                  {r.enrollments?.length ? (
                    <div className="mt-2 space-y-2">
                      {r.enrollments.map((e) => (
                        <div key={e.licenseClass} className="rounded-drive border border-drive-border-soft px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-drive-text">Hạng {displayLicenseClass(e.licenseClass)}</span>
                            <StatusBadge tone={paymentTone(e.payment)}>{paymentLabel(e.payment)}</StatusBadge>
                          </div>
                          {e.payment?.amount ? <p className="mt-1 text-xs text-drive-muted">{formatMoney(e.payment.amount)}đ</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : <p className="mt-1 text-sm text-drive-muted">Chưa đăng ký khóa</p>}
                </div>
                <Link to={`/admin/students/${r.userId}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-drive bg-drive-action px-4 text-sm font-bold text-drive-action-contrast">Xem học viên</Link>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-drive-border text-drive-muted">
                <th className="py-2 pr-4">Học viên</th>
                <th className="py-2 pr-4">Premium</th>
                <th className="py-2 pr-4">Khóa đã đăng ký</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {pagination.pageItems.map((r) => (
                <tr key={r.userId} className="border-b border-drive-border-soft">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-white">{r.fullName ?? r.email}</p>
                    <p className="text-xs text-drive-muted">{r.email}</p>
                  </td>
                  <td className="py-3 pr-4">
                    {r.isPremium ? (
                      <StatusBadge tone="success">
                        đến {formatPremiumDate(r.premiumUntil)}
                      </StatusBadge>
                    ) : (
                      <span className="text-drive-muted">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {r.enrollments?.length ? (
                      <ul className="space-y-1">
                        {r.enrollments.map((e) => (
                          <li key={e.licenseClass} className="flex flex-wrap items-center gap-2 text-white">
                            <span>Hạng {displayLicenseClass(e.licenseClass)}</span>
                            <StatusBadge tone={paymentTone(e.payment)}>{paymentLabel(e.payment)}</StatusBadge>
                            {e.payment?.amount ? <span className="text-xs text-drive-muted">{formatMoney(e.payment.amount)}đ</span> : null}
                            {e.enrolledAt ? <span className="text-xs text-drive-muted">{new Date(e.enrolledAt).toLocaleDateString("vi-VN")}</span> : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-drive-muted">Chưa đăng ký khóa</span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      to={`/admin/students/${r.userId}`}
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
          {!filtered.length ? (
            <p className="py-6 text-center text-drive-muted">Không có học viên phù hợp.</p>
          ) : null}
          <Pagination {...pagination} total={filtered.length} onPageChange={pagination.setPage} label="học viên" />
        </UiCard>
      )}
    </section>
  )
}
