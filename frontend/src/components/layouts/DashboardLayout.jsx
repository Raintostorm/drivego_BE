import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { BrandLogo } from "../BrandLogo.jsx"
import { LicenseClassSwitcher } from "../LicenseClassSwitcher.jsx"
import { SidebarNav } from "../SidebarNav.jsx"
import { useAuth } from "../../context/AuthContext.jsx"
import { formatPremiumDate, isPremiumActive } from "../../lib/premium.js"
import { t } from "../../lib/strings.js"

const studentNav = [
  { to: "/student-dashboard", labelKey: "nav.studentDashboard" },
  { to: "/theory", labelKey: "nav.theory" },
  { to: "/exam", labelKey: "nav.exam" },
  { to: "/history", labelKey: "nav.history" },
  { to: "/schedule", labelKey: "nav.schedule" },
  { to: "/study-calendar", labelKey: "nav.studyCalendar" },
  { to: "/profile", labelKey: "nav.profile" },
  { to: "/application", labelKey: "nav.application" },
  { to: "/notifications", labelKey: "nav.notifications" },
  { to: "/upgrade", labelKey: "nav.upgrade" },
  { to: "/ai-chat", labelKey: "nav.aiChat" },
]

const adminNav = [
  { to: "/admin-dashboard", labelKey: "nav.adminDashboard" },
  { to: "/admin/students", labelKey: "nav.adminStudents" },
  { to: "/admin/applications", labelKey: "nav.adminApplications" },
  { to: "/admin/schedules", labelKey: "nav.adminSchedules" },
]

/**
 * @param {{ children: import('react').ReactNode, variant?: 'student' | 'admin' }} props
 */
export function DashboardLayout({ children, variant = "student" }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const premium = isPremiumActive(user)

  const items = useMemo(() => {
    const base = variant === "admin" ? adminNav : studentNav
    if (!premium) return base
    return base.map((item) =>
      item.to === "/upgrade" ? { ...item, labelKey: "nav.premiumPlan" } : item,
    )
  }, [variant, premium])

  function handleLogout() {
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="-mx-4 flex min-h-[calc(100vh-3rem)] flex-col sm:-mx-6 lg:-mx-10 lg:flex-row">
      <div className="border-b border-drive-border-soft bg-drive-sidebar px-4 py-4 lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:w-72 lg:border-r lg:border-b-0 lg:px-0 lg:py-6">
        <div className="mb-6 hidden px-5 lg:block">
          <BrandLogo />
        </div>
        <Link to="/" className="mb-4 flex items-center gap-2 px-2 lg:hidden">
          <BrandLogo size="sm" />
        </Link>
        <SidebarNav items={items} />
        {variant === "student" ? (
          <div className="mt-4">
            <LicenseClassSwitcher />
          </div>
        ) : null}
        <div className="mt-6 space-y-2 px-3">
          {variant === "student" ? (
            premium ? (
              <Link
                to="/upgrade"
                className="block rounded-drive border border-drive-success/40 bg-drive-success/10 px-3 py-2.5 text-center transition hover:bg-drive-success/15"
              >
                <span className="text-sm font-semibold text-drive-success">★ Premium</span>
                <span className="mt-0.5 block text-xs text-drive-muted">
                  {t("pages.upgrade.validUntil")}{" "}
                  {formatPremiumDate(user?.profile?.premiumUntil)}
                </span>
              </Link>
            ) : (
              <Link
                to="/upgrade"
                className="block w-full rounded-drive-pill bg-drive-action px-6 py-3 text-center text-sm font-bold text-drive-action-contrast shadow-drive-action transition hover:brightness-110"
              >
                {t("nav.upgrade")} Premium
              </Link>
            )
          ) : null}
          {user ? (
            <p className="truncate px-1 text-xs text-drive-muted" title={user.email}>
              {user.profile?.fullName || user.email}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-drive-pill border border-drive-border py-2.5 text-sm text-drive-muted transition hover:text-white"
          >
            Đăng xuất
          </button>
        </div>
      </div>
      <div className="min-w-0 flex-1 lg:pl-72">
        <div className="px-4 py-6 sm:px-6 lg:px-10">{children}</div>
      </div>
    </div>
  )
}
