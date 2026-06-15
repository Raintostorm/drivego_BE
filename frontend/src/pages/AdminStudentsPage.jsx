import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { fetchAdminStudents } from "../lib/admin-api.js"
import { formatPremiumDate } from "../lib/premium.js"

export function AdminStudentsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("all")
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
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
            onClick={() => setTab(t.id)}
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
        <UiCard variant="panel" className="overflow-x-auto">
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
              {filtered.map((r) => (
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
                          <li key={e.licenseClass} className="text-white">
                            Hạng {e.licenseClass}
                            {e.enrolledAt ? (
                              <span className="ml-2 text-xs text-drive-muted">
                                {new Date(e.enrolledAt).toLocaleDateString("vi-VN")}
                              </span>
                            ) : null}
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
          {!filtered.length ? (
            <p className="py-6 text-center text-drive-muted">Không có học viên phù hợp.</p>
          ) : null}
        </UiCard>
      )}
    </section>
  )
}
