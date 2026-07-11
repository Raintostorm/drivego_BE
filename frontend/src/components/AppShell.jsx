import { useLocation } from "react-router-dom"

const AUTH_PATHS = ["/login", "/register", "/forgot-password"]

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function AppShell({ children }) {
  const { pathname } = useLocation()
  const isAuth = AUTH_PATHS.includes(pathname)
  const isDashboard =
    pathname.includes("dashboard") ||
    [
      "/admin-dashboard",
      "/theory",
      "/exam",
      "/history",
      "/schedule",
      "/study-calendar",
      "/profile",
      "/notifications",
      "/upgrade",
      "/ai-chat",
    ].includes(pathname) ||
    pathname.startsWith("/admin/")

  if (isAuth) {
    return <main className="relative min-h-screen overflow-hidden text-drive-text">{children}</main>
  }

  const shellClass = isDashboard
    ? "min-h-screen bg-drive-canvas text-drive-text"
    : "min-h-screen bg-drive-canvas text-drive-text"

  const innerClass = isDashboard
    ? "mx-auto max-w-[1280px] px-3 py-4 sm:px-6 lg:px-10 lg:py-6"
    : "mx-auto max-w-7xl px-4 py-6 sm:px-6"

  return (
    <main className={shellClass}>
      <div className={innerClass}>{children}</div>
    </main>
  )
}
