import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { StatCard } from "../components/StatCard.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { apiFetch } from "../lib/api.js"
import { t } from "../lib/strings.js"

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("vi-VN")
}

export function HistoryPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await apiFetch("/exams/attempts/history", { auth: true })
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không tải được lịch sử")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p className="text-drive-muted">Đang tải lịch sử…</p>
  if (error) return <p className="text-drive-danger">{error}</p>

  const rows = data?.rows ?? []
  const stats = data?.stats ?? { totalExams: 0, passRate: "0%", bestScore: "0/0" }
  const limited = Boolean(data?.hasMore)

  return (
    <section>
      <PageHeader title={t("pages.history.title")} subtitle={t("pages.history.subtitle")} />

      {limited ? (
        <UiCard variant="panel" className="mb-4 border-drive-action/40">
          <p className="text-sm text-drive-muted">
            Tài khoản miễn phí chỉ xem lại 3 đề gần nhất. Nâng cấp Premium để xem toàn bộ {data.totalAvailable} lượt đã làm.
          </p>
          <Link to="/upgrade" className="mt-2 inline-block text-sm font-semibold text-drive-action hover:underline">Nâng cấp Premium →</Link>
        </UiCard>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={t("pages.history.totalExams")} value={String(stats.totalExams)} />
            <StatCard label={t("pages.history.passRate")} value={stats.passRate} />
            <StatCard label={t("pages.history.bestScore")} value={stats.bestScore} />
          </div>

          <UiCard variant="panel" padding="none" className="overflow-hidden">
            {rows.length === 0 ? (
              <p className="p-6 text-sm text-drive-muted">Chưa có lần thi nào. Hãy thử đề tại trang Thi thử.</p>
            ) : (
              <>
                <div className="space-y-3 p-3 sm:hidden">
                  {rows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => navigate(`/history/${row.id}`)}
                      className="tap-feedback w-full rounded-drive border border-drive-border-soft bg-drive-sidebar p-4 text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-drive-muted">{formatDate(row.date)} · Hạng {row.rank}</p>
                          <h2 className="mt-1 text-sm font-semibold text-white">{row.exam}</h2>
                        </div>
                        <StatusBadge tone={row.pass ? "success" : "danger"}>{row.score}</StatusBadge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-drive-muted">
                        <span>Thời gian: {row.time}</span>
                        <span className="font-semibold text-drive-action">Xem lại →</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="min-w-[640px] w-full text-left text-sm">
                    <thead className="bg-drive-sidebar text-drive-muted">
                      <tr>
                        <th className="px-4 py-3">Ngày</th>
                        <th className="px-4 py-3">Đề thi</th>
                        <th className="px-4 py-3">Hạng</th>
                        <th className="px-4 py-3">Kết quả</th>
                        <th className="px-4 py-3">Thời gian</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => navigate(`/history/${row.id}`)}
                          className="cursor-pointer border-t border-drive-border-soft text-drive-text transition hover:bg-drive-sidebar"
                        >
                          <td className="px-4 py-3 text-drive-muted">{formatDate(row.date)}</td>
                          <td className="px-4 py-3">{row.exam}</td>
                          <td className="px-4 py-3">{row.rank}</td>
                          <td className="px-4 py-3">
                            <StatusBadge tone={row.pass ? "success" : "danger"}>{row.score}</StatusBadge>
                          </td>
                          <td className="px-4 py-3 text-drive-muted">{row.time}</td>
                          <td className="px-4 py-3 text-right text-drive-action">Xem lại →</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </UiCard>
        </div>

        <aside className="space-y-4">
          <UiCard variant="panel">
            <p className="text-sm font-semibold text-white">{t("pages.history.reviewHint")}</p>
            <p className="mt-2 text-xs text-drive-muted">
              Ôn lại chương biển báo và câu điểm liệt trước khi thi lại.
            </p>
            <div className="mt-4 flex h-24 items-end gap-1">
              {rows.slice(0, 5).map((row) => {
                const [got, of] = row.score.split("/").map(Number)
                const h = of ? Math.round((got / of) * 100) : 0
                return (
                  <div
                    key={row.id}
                    className="flex-1 rounded-t bg-drive-action/70"
                    style={{ height: `${Math.max(h, 8)}%` }}
                    title={row.score}
                  />
                )
              })}
            </div>
          </UiCard>
          <Link
            to="/exam"
            className="block w-full rounded-drive-pill bg-drive-action px-6 py-3 text-center text-sm font-bold text-drive-action-contrast shadow-drive-action transition hover:brightness-110"
          >
            {t("pages.history.startReview")}
          </Link>
        </aside>
      </div>
    </section>
  )
}
