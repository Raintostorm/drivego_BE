import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { BrandLogo } from "../BrandLogo.jsx"
import { LicenseClassSwitcher } from "../LicenseClassSwitcher.jsx"
import { PageGuide } from "../PageGuide.jsx"
import { SidebarNav } from "../SidebarNav.jsx"
import { ThemeToggle } from "../ThemeToggle.jsx"
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
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
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

  useEffect(() => {
    queueMicrotask(() => setMenuOpen(false))
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previous }
  }, [menuOpen])

  return (
    <div className="-mx-3 min-h-[calc(100vh-2rem)] sm:-mx-6 lg:-mx-10">
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-drive-border-soft bg-drive-sidebar/95 px-3 backdrop-blur lg:hidden">
        <BrandLogo size="sm" to={logoTo} />
        <button
          type="button"
          className="tap-feedback inline-flex size-11 items-center justify-center rounded-lg border border-drive-border text-drive-text"
          aria-label="Mở menu"
          aria-expanded={menuOpen}
          aria-controls="dashboard-navigation"
          onClick={() => setMenuOpen(true)}
        >
          <span className="flex w-5 flex-col gap-1.5" aria-hidden="true"><span className="h-0.5 w-full bg-current" /><span className="h-0.5 w-full bg-current" /><span className="h-0.5 w-full bg-current" /></span>
        </button>
      </header>

      {menuOpen ? (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        id="dashboard-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(22rem,88vw)] flex-col overflow-hidden border-r border-drive-border-soft bg-drive-sidebar shadow-2xl transition-transform duration-200 lg:z-20 lg:w-72 lg:translate-x-0 lg:shadow-none ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="shrink-0 px-3 py-2.5 lg:px-0 lg:py-6">
          <div className="mb-0 hidden px-5 lg:block">
            <BrandLogo size="sm" to={logoTo} />
            {variant === "admin" ? (
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-drive-action">
                Portal quản trị
              </p>
            ) : null}
          </div>
          <div className="flex min-h-12 items-center justify-between gap-3 px-1 lg:hidden">
            <BrandLogo size="sm" to={logoTo} />
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Đóng menu" className="tap-feedback inline-flex size-11 items-center justify-center rounded-lg border border-drive-border text-2xl leading-none text-drive-text">×</button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-0 pb-2 lg:max-h-[calc(100vh-12rem)]">
          <SidebarNav items={items} stackOnMobile onNavigate={() => setMenuOpen(false)} />
          {variant === "student" ? (
            <div className="mt-4">
              <LicenseClassSwitcher />
            </div>
          ) : null}
        </div>

        <div className="shrink-0 space-y-2 border-t border-drive-border-soft px-3 py-4">
          <ThemeToggle />
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
        <main className="px-3 py-4 sm:px-6 lg:px-10 lg:py-6">{children}</main>
      </div>
    </div>
  )
}
