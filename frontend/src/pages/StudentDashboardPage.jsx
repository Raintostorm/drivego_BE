import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { StatCard } from "../components/StatCard.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { useAuth } from "../context/AuthContext.jsx"
import { apiFetch } from "../lib/api.js"
import { isPremiumActive } from "../lib/premium.js"
import { t } from "../lib/strings.js"

export function StudentDashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const displayName = user?.profile?.fullName || user?.email?.split("@")[0] || "bạn"
  const premium = isPremiumActive(user)

  useEffect(() => {
    apiFetch("/study/dashboard-summary", { auth: true })
      .then(setSummary)
      .catch(() => setSummary(null))
  }, [])

  const progressPct =
    summary && summary.chaptersTotal > 0
      ? Math.round((summary.chaptersCompleted / summary.chaptersTotal) * 100)
      : 0

  return (
    <section>
      <PageHeader
        title={t("pages.studentDashboard.title")}
        subtitle={`Chào ${displayName}, hôm nay bạn đã sẵn sàng lái xe chưa?`}
        actions={
          <Link
            to="/notifications"
            className="relative rounded-lg border border-drive-border-soft bg-drive-panel p-2.5 text-drive-muted hover:text-white"
          >
            🔔
          </Link>
        }
      />

      {!premium ? (
        <p className="mb-4 rounded-drive border border-drive-action/40 bg-drive-action/10 px-4 py-3 text-sm text-drive-text">
          Tài khoản miễn phí: tối đa 10 bài thi, AI Chat cần Premium.{" "}
          <Link to="/upgrade" className="font-medium text-drive-action underline">
            Nâng cấp ngay
          </Link>
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("pages.studentDashboard.statProgress")}
          value={summary ? `${progressPct}%` : "—"}
          badge={
            summary
              ? `${summary.chaptersCompleted}/${summary.chaptersTotal} chương`
              : undefined
          }
        />
        <StatCard
          label={t("pages.studentDashboard.statSessions")}
          value={summary ? String(summary.upcomingSessions) : "—"}
          badge="Buổi sắp tới"
        />
        <StatCard
          label={t("pages.studentDashboard.statScore")}
          value={
            summary?.recentAttempts?.[0]?.score != null
              ? String(summary.recentAttempts[0].score)
              : "—"
          }
          badge="Lần thi gần nhất"
        />
        <StatCard
          label={t("pages.studentDashboard.statStatus")}
          value={premium ? "Premium" : "Miễn phí"}
          badge={premium ? "Đang hoạt động" : "Nâng cấp"}
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <UiCard variant="panel" as="article" padding="lg">
          <p className="text-xs font-medium text-drive-action">
            {t("pages.studentDashboard.currentLesson")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Hạng {summary?.licenseClass ?? user?.profile?.licenseClass ?? "B2"}
          </h2>
          <div className="mt-6 rounded-drive border border-drive-border-soft bg-drive-sidebar p-4">
            <div className="h-2.5 overflow-hidden rounded-full bg-drive-elevated">
              <div
                className="h-full rounded-full bg-drive-action shadow-drive-action"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-drive-muted">
              Tiến độ lý thuyết: {summary?.chaptersCompleted ?? 0}/
              {summary?.chaptersTotal ?? 0} chương
            </p>
          </div>
          <Link
            to="/theory"
            className="mt-6 inline-block rounded-drive-pill bg-drive-action px-6 py-3 text-sm font-bold text-drive-action-contrast shadow-drive-action transition hover:brightness-110"
          >
            {t("pages.studentDashboard.continue")}
          </Link>
        </UiCard>
        <UiCard variant="panel" as="article">
          <h3 className="font-semibold text-white">Lịch học</h3>
          <p className="mt-2 text-sm text-drive-muted">
            {summary?.upcomingSessions
              ? `${summary.upcomingSessions} buổi sắp tới`
              : "Chưa có buổi học"}
          </p>
          <Link
            to="/study-calendar"
            className="mt-4 inline-block text-sm text-drive-action hover:underline"
          >
            Xem lịch & điểm danh →
          </Link>
        </UiCard>
      </div>
    </section>
  )
}
