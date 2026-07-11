import { useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { BrandLogo } from "../BrandLogo.jsx"
import { LicenseClassSwitcher } from "../LicenseClassSwitcher.jsx"
import { PageGuide } from "../PageGuide.jsx"
import { SidebarNav } from "../SidebarNav.jsx"
import { useAuth } from "../../context/AuthContext.jsx"
import { formatPremiumDate, isPremiumActive } from "../../lib/premium.js"
import { t } from "../../lib/strings.js"

/**
 * @param {{
 *   children: import('react').ReactNode
 *   variant: 'student' | 'admin'
 *   navItems: { to: string, labelKey: string }[]
 * }} props
 */
export function DashboardShell({ children, variant, navItems }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const premium = isPremiumActive(user)
  const logoTo = variant === "admin" ? "/admin-dashboard" : "/"

  const items = useMemo(() => {
    if (variant !== "student") return navItems
    if (!premium) return navItems
    return navItems.map((item) =>
      item.to === "/upgrade" ? { ...item, labelKey: "nav.premiumPlan" } : item,
    )
  }, [variant, navItems, premium])

  function handleLogout() {
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <div className="-mx-3 flex min-h-[calc(100vh-2rem)] flex-col sm:-mx-6 lg:-mx-10 lg:flex-row">
      <aside className="sticky top-0 z-30 flex max-h-[70svh] flex-col border-b border-drive-border-soft bg-drive-sidebar/95 backdrop-blur lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:max-h-none lg:w-72 lg:border-r lg:border-b-0 lg:bg-drive-sidebar">
        <div className="shrink-0 px-3 py-3 lg:px-0 lg:py-6">
          <div className="mb-0 hidden px-5 lg:block">
            <BrandLogo to={logoTo} />
            {variant === "admin" ? (
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-drive-action">
                Portal quản trị
              </p>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3 px-1 lg:hidden">
            <BrandLogo size="sm" to={logoTo} />
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="shrink-0 rounded-drive-pill border border-drive-border px-3 py-2 text-xs font-semibold text-drive-muted transition hover:text-white"
              >
                Đăng xuất
              </button>
            ) : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-0 pb-2 lg:max-h-[calc(100vh-12rem)]">
          <SidebarNav items={items} />
          {variant === "student" ? (
            <div className="mt-4">
              <LicenseClassSwitcher />
            </div>
          ) : null}
        </div>

        <div className="hidden shrink-0 space-y-2 border-t border-drive-border-soft px-3 py-4 lg:block">
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
              {variant === "admin" && user.role ? (
                <span className="block text-[10px] text-drive-placeholder">{user.role}</span>
              ) : null}
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
      </aside>

      <div className="min-w-0 flex-1 lg:pl-72">
        {variant === "student" ? <PageGuide /> : null}
        <div className="px-3 py-4 sm:px-6 lg:px-10 lg:py-6">{children}</div>
      </div>
    </div>
  )
}
