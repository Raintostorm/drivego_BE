import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AdminScopeBanner } from "../components/AdminScopeBanner.jsx"
import { PageHeader } from "../components/PageHeader.jsx"
import { StatCard } from "../components/StatCard.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { useAuth } from "../context/AuthContext.jsx"
import { fetchAdminSummary } from "../lib/admin-api.js"
import { t } from "../lib/strings.js"

const QUICK_LINKS = [
  { to: "/admin/applications", title: "Hồ sơ sát hạch", desc: "Duyệt và yêu cầu nộp lại hồ sơ." },
  { to: "/admin/payments", title: "Thanh toán", desc: "Theo dõi và xác nhận giao dịch khi webhook chậm." },
  { to: "/admin/students", title: "Học viên", desc: "Danh sách và chi tiết học viên trung tâm." },
  { to: "/admin/schedules", title: "Duyệt đăng ký ca thi", desc: "Xác nhận yêu cầu đăng ký ca sát hạch." },
  { to: "/admin/schedules/slots", title: "Quản lý ca thi", desc: "Tạo ca lý thuyết / chạy thử." },
  { to: "/admin/class-sessions", title: "Buổi học & điểm danh", desc: "Lịch lớp và check-in học viên." },
  { to: "/admin/courses", title: "Nội dung khóa", desc: "Xem chương và học phí theo hạng.", systemOnly: false },
  { to: "/admin/health", title: "Cấu hình hệ thống", desc: "Kiểm tra DB, Firebase, Resend, SePay và upload." },
]

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
