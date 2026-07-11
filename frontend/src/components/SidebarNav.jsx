import { NavLink } from "react-router-dom"
import { t } from "../lib/strings.js"

/**
 * @param {{ items: { to: string, labelKey: string }[] }} props
 */
export function SidebarNav({ items }) {
  return (
    <nav
      className="touch-pan-x flex gap-2 overflow-x-auto px-3 pb-2 text-sm lg:block lg:space-y-1 lg:overflow-visible lg:pb-0"
      aria-label="Ứng dụng"
    >
      {items.map(({ to, labelKey }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `tap-feedback flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2 text-center font-medium transition lg:block lg:min-h-0 lg:whitespace-normal lg:text-left ${
              isActive
                ? "bg-drive-action text-drive-action-contrast"
                : "text-drive-muted hover:bg-drive-panel hover:text-white"
            }`
          }
        >
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  )
}
