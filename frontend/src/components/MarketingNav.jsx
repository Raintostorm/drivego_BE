import { useEffect, useRef, useState } from "react"
import { Link, NavLink } from "react-router-dom"
import { useAuth } from "../context/AuthContext.jsx"
import { dashboardPathForRole, isStaffRole } from "../lib/roles.js"
import { t } from "../lib/strings.js"
import { marketingRoutes, moreRoutes } from "../routes.jsx"
import { BrandLogo } from "./BrandLogo.jsx"

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium transition ${isActive ? "text-white" : "text-drive-muted hover:text-white"}`

export function MarketingNav() {
  const { user } = useAuth()
  const staff = user && isStaffRole(user.role)
  const [moreOpen, setMoreOpen] = useState(false)
  const wrapRef = useRef(null)
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMoreOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const appHome = user ? dashboardPathForRole(user.role) : null
  const visibleMoreRoutes = moreRoutes.filter((route) => {
    if (!user) return route.group === "marketing"
    if (staff) return route.group === "admin"
    return route.group === "app"
  })

  return (
    <header className="sticky top-0 z-30 -mx-4 mb-8 border-b border-drive-border-soft bg-drive-canvas/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BrandLogo />

        <nav className="hidden items-center gap-8 md:flex" aria-label="Chính">
          {marketingRoutes.map(({ path, labelKey }) => (
            <NavLink
              key={path}
              to={path}
              className={navLinkClass}
              end={path === "/"}
              onClick={() => setMoreOpen(false)}
            >
              {t(labelKey)}
            </NavLink>
          ))}
          {visibleMoreRoutes.length ? (
            <div className="relative" ref={wrapRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                className="text-sm font-medium text-drive-muted hover:text-white"
              >
                {t("nav.more")}
              </button>
              {moreOpen ? (
                <div className="absolute right-0 z-50 mt-2 min-w-[200px] rounded-drive border border-drive-border bg-drive-panel py-2 shadow-xl">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase text-drive-placeholder">
                    {t("nav.moreGroupApp")}
                  </p>
                  {visibleMoreRoutes.map(({ path, labelKey }) => (
                    <NavLink
                      key={path}
                      to={path}
                      className="block px-3 py-2 text-sm text-drive-text hover:bg-drive-elevated"
                      onClick={() => setMoreOpen(false)}
                    >
                      {t(labelKey)}
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span
                className="hidden max-w-[140px] truncate text-sm text-drive-muted sm:inline"
                title={user.email}
              >
                {user.profile?.fullName || user.email}
              </span>
              {appHome ? (
                <Link
                  to={appHome}
                  className="rounded-drive-pill bg-drive-action px-5 py-2.5 text-sm font-bold text-white shadow-drive-action transition hover:brightness-110"
                >
                  {staff ? "Vào quản trị" : "Vào học"}
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden text-sm font-medium text-drive-muted hover:text-white sm:inline"
              >
                {t("nav.login")}
              </Link>
              <Link
                to="/register"
                className="rounded-drive-pill bg-drive-action px-6 py-3 text-sm font-bold text-white shadow-drive-action transition hover:brightness-110"
              >
                {t("nav.register")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
