import { useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext.jsx"
import { dashboardPathForRole, isStaffRole } from "../lib/roles.js"
import { t } from "../lib/strings.js"
import { moreRoutes } from "../routes.jsx"
import { CardNav } from "./CardNav.jsx"

export function MarketingNav() {
  const { user } = useAuth()
  const location = useLocation()
  const staff = user && isStaffRole(user.role)
  const [open, setOpen] = useState(false)
  const appHome = user ? dashboardPathForRole(user.role) : null
  const homeTone = location.pathname === "/"

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [])

  const visibleMoreRoutes = moreRoutes.filter((route) => {
    if (!user) return route.group === "marketing"
    if (staff) return route.group === "admin"
    return route.group === "app"
  })

  const items = useMemo(() => {
    const studyLinks = user
      ? [
          { label: t("nav.studentDashboard"), href: appHome || "/student-dashboard" },
          { label: t("nav.theory"), href: "/theory" },
          { label: t("nav.exam"), href: "/exam" },
        ]
      : [
          { label: t("nav.pricing"), href: "/pricing" },
          { label: t("nav.guide"), href: "/guide" },
          { label: t("nav.docs"), href: "/docs" },
        ]

    const supportLinks = [
      { label: t("nav.lookup"), href: "/lookup" },
      { label: t("nav.docs"), href: "/docs" },
      { label: t("nav.guide"), href: "/guide" },
    ]

    const accountLinks = user
      ? [
          { label: staff ? "Vào quản trị" : "Vào học", href: appHome || "/" },
          { label: t("nav.profile"), href: "/profile" },
          ...visibleMoreRoutes.slice(0, 1).map(({ path, labelKey }) => ({
            label: t(labelKey),
            href: path,
          })),
        ]
      : [
          { label: t("nav.register"), href: "/register" },
          { label: t("nav.login"), href: "/login" },
          { label: t("nav.centerRegister"), href: "/center-register" },
        ]

    return [
      {
        label: "Lộ trình",
        bgColor: "var(--nav-card-1-bg)",
        textColor: "var(--nav-card-1-color)",
        links: studyLinks,
      },
      {
        label: "Tra cứu",
        bgColor: "var(--nav-card-2-bg)",
        textColor: "var(--nav-card-2-color)",
        links: supportLinks,
      },
      {
        label: "Tài khoản",
        bgColor: "var(--nav-card-3-bg)",
        textColor: "var(--nav-card-3-color)",
        links: accountLinks,
      },
    ]
  }, [appHome, staff, user, visibleMoreRoutes])

  return (
    <CardNav
      items={items}
      cta={{
        label: user ? (staff ? "Vào quản trị" : "Vào học") : t("nav.register"),
        href: user ? appHome || "/" : "/register",
      }}
      secondaryCta={user ? null : { label: t("nav.login"), href: "/login" }}
      homeTone={homeTone}
      isOpen={open}
      onToggle={() => setOpen((value) => !value)}
      onClose={() => setOpen(false)}
    />
  )
}
