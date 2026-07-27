import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AdminScopeBanner } from "../components/AdminScopeBanner.jsx"
import { PageHeader } from "../components/PageHeader.jsx"
import { StatCard } from "../components/StatCard.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { useAuth } from "../context/AuthContext.jsx"
import { fetchAdminSummary } from "../lib/admin-api.js"
import { t } from "../lib/strings.js"

const APPLICATION_LABELS = {
  draft: "Nháp",
  submitted: "Chờ duyệt",
  reviewing: "Đang xem",
  approved: "Đã duyệt",
  rejected: "Từ chối",
}

const PAYMENT_LABELS = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  expired: "Hết hạn",
  failed: "Thất bại",
}

const QUICK_LINKS = [
  { to: "/admin/applications", title: "Hồ sơ sát hạch", desc: "Duyệt và yêu cầu nộp lại hồ sơ." },
  { to: "/admin/payments", title: "Thanh toán", desc: "Theo dõi và xác nhận giao dịch khi webhook chậm." },
  { to: "/admin/students", title: "Học viên", desc: "Danh sách và chi tiết học viên trung tâm." },
  { to: "/admin/schedules", title: "Duyệt đăng ký ca thi", desc: "Xác nhận yêu cầu đăng ký ca sát hạch." },
  { to: "/admin/schedules/slots", title: "Quản lý ca thi", desc: "Tạo ca lý thuyết / chạy thử." },
  { to: "/admin/class-sessions", title: "Buổi học & điểm danh", desc: "Lịch lớp và check-in học viên." },
  { to: "/admin/courses", title: "Nội dung khóa", desc: "Xem chương và học phí theo hạng.", systemOnly: false },
  { to: "/admin/site-content", title: "Nội dung website", desc: "Chỉnh dữ liệu trang chủ đang kéo từ backend." },
  { to: "/admin/health", title: "Cấu hình hệ thống", desc: "Kiểm tra DB, Firebase, Resend, SePay và upload." },
]

function formatMoney(value) {
  return `${Number(value ?? 0).toLocaleString("vi-VN")}đ`
}

function percent(value, total) {
  if (!total) return 0
  return Math.min(100, Math.round((Number(value) / Number(total)) * 100))
}

function BarRow({ label, value, total, tone = "action" }) {
  const pct = percent(value, total)
  const toneClass =
    tone === "success"
      ? "bg-drive-success"
      : tone === "danger"
        ? "bg-drive-danger"
        : "bg-drive-action"

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-drive-text">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-drive-elevated">
        <div className={`h-full rounded-full ${toneClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function EmptyStat({ children = "Chưa có dữ liệu." }) {
  return <p className="rounded-drive border border-drive-border-soft bg-drive-sidebar p-3 text-sm text-drive-muted">{children}</p>
}

export function AdminDashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAdminSummary()
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu"))
  }, [])

  const centerLabel = user?.centerName
    ? user.centerName
    : user?.role === "system_admin"
      ? "Toàn hệ thống"
      : "Trung tâm"

  return (
    <section>
      <PageHeader
        title={t("pages.adminDashboard.title")}
        subtitle={`${centerLabel} · DriveGo Admin`}
      />

      <div className="mt-4">
        <AdminScopeBanner />
      </div>

      {error ? (
        <UiCard variant="panel" className="mt-4">
          <p className="text-sm text-drive-danger">{error}</p>
        </UiCard>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Hồ sơ nháp"
          value={summary ? String(summary.draftApplications ?? 0) : "—"}
        />
        <StatCard
          label="Hồ sơ chờ duyệt"
          value={summary ? String(summary.pendingApplications ?? summary.submittedApplications) : "—"}
        />
        <StatCard
          label="Đăng ký ca chờ"
          value={summary ? String(summary.pendingRegistrations) : "—"}
        />
        <StatCard
          label="Buổi học sắp tới"
          value={summary ? String(summary.upcomingSessions ?? 0) : "—"}
        />
        <StatCard
          label="Điểm danh (30 ngày)"
          value={summary ? `${summary.attendanceRate ?? 0}%` : "—"}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <UiCard variant="panel">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Tình trạng hồ sơ</h2>
              <p className="mt-1 text-sm text-drive-muted">
                Tổng {summary?.totalApplications ?? 0} hồ sơ trong phạm vi quản trị.
              </p>
            </div>
            <Link to="/admin/applications" className="text-sm font-medium text-drive-action">
              Xem hồ sơ →
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {summary?.applicationStatus?.length ? (
              summary.applicationStatus.map((row) => (
                <BarRow
                  key={row.status}
                  label={APPLICATION_LABELS[row.status] ?? row.status}
                  value={row.count}
                  total={summary.totalApplications}
                  tone={row.status === "rejected" ? "danger" : row.status === "approved" ? "success" : "action"}
                />
              ))
            ) : (
              <EmptyStat />
            )}
          </div>
        </UiCard>

        <UiCard variant="panel">
          <h2 className="font-semibold text-white">Cảnh báo vận hành</h2>
          <div className="mt-4 grid gap-3">
            <div className="rounded-drive border border-drive-border-soft bg-drive-sidebar p-4">
              <p className="text-sm text-drive-muted">Hồ sơ thiếu giấy tờ</p>
              <p className="mt-1 text-3xl font-bold text-white">
                {summary?.missingDocuments?.incompleteApplications ?? 0}
              </p>
              <p className="mt-1 text-xs text-drive-placeholder">
                Đã kiểm {summary?.missingDocuments?.checkedApplications ?? 0} hồ sơ đang xử lý.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-drive border border-drive-border-soft bg-drive-sidebar p-4">
                <p className="text-sm text-drive-muted">Deadline 7 ngày</p>
                <p className="mt-1 text-2xl font-bold text-amber-300">
                  {summary?.deadlines?.dueSoon ?? 0}
                </p>
              </div>
              <div className="rounded-drive border border-drive-border-soft bg-drive-sidebar p-4">
                <p className="text-sm text-drive-muted">Quá hạn bổ sung</p>
                <p className="mt-1 text-2xl font-bold text-drive-danger">
                  {summary?.deadlines?.overdue ?? 0}
                </p>
              </div>
            </div>
          </div>
        </UiCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <UiCard variant="panel">
          <h2 className="font-semibold text-white">Học viên theo hạng</h2>
          <p className="mt-1 text-sm text-drive-muted">
            Tổng {summary?.totalStudents ?? 0} học viên có hồ sơ học tập.
          </p>
          <div className="mt-5 space-y-4">
            {summary?.studentsByClass?.length ? (
              summary.studentsByClass.map((row) => (
                <BarRow
                  key={row.licenseClass}
                  label={`Hạng ${row.licenseClass}`}
                  value={row.count}
                  total={summary.totalStudents}
                  tone="success"
                />
              ))
            ) : (
              <EmptyStat />
            )}
          </div>
        </UiCard>

        <UiCard variant="panel">
          <h2 className="font-semibold text-white">Thanh toán</h2>
          <p className="mt-1 text-sm text-drive-muted">
            Doanh thu 30 ngày:{" "}
            <span className="font-semibold text-white">{formatMoney(summary?.revenue30Days)}</span>
          </p>
          <div className="mt-5 space-y-4">
            {summary?.paymentStatus?.length ? (
              summary.paymentStatus.map((row) => (
                <div key={row.status} className="rounded-drive border border-drive-border-soft bg-drive-sidebar p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {PAYMENT_LABELS[row.status] ?? row.status}
                      </p>
                      <p className="mt-1 text-xs text-drive-muted">{formatMoney(row.amount)}</p>
                    </div>
                    <span className="rounded-full bg-drive-action/10 px-2 py-1 text-xs font-bold text-drive-action">
                      {row.count}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyStat />
            )}
          </div>
        </UiCard>

        <UiCard variant="panel">
          <h2 className="font-semibold text-white">Nhịp vận hành</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-drive border border-drive-border-soft bg-drive-sidebar p-3">
              <span className="text-drive-muted">Check-in 30 ngày</span>
              <span className="font-semibold text-white">{summary?.checkInsLast30Days ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-drive border border-drive-border-soft bg-drive-sidebar p-3">
              <span className="text-drive-muted">Tỷ lệ điểm danh</span>
              <span className="font-semibold text-white">{summary?.attendanceRate ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between rounded-drive border border-drive-border-soft bg-drive-sidebar p-3">
              <span className="text-drive-muted">Buổi học sắp tới</span>
              <span className="font-semibold text-white">{summary?.upcomingSessions ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-drive border border-drive-border-soft bg-drive-sidebar p-3">
              <span className="text-drive-muted">Ca thi chờ duyệt</span>
              <span className="font-semibold text-white">{summary?.pendingRegistrations ?? 0}</span>
            </div>
          </div>
        </UiCard>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.filter(
          (item) => !item.systemOnly || user?.role === "system_admin",
        ).map((item) => (
          <UiCard key={item.to} variant="panel">
            <h2 className="font-semibold text-white">{item.title}</h2>
            <p className="mt-2 text-sm text-drive-muted">{item.desc}</p>
            <Link
              to={item.to}
              className="mt-4 inline-block text-sm font-medium text-drive-action hover:underline"
            >
              Mở →
            </Link>
          </UiCard>
        ))}
      </div>
    </section>
  )
}
