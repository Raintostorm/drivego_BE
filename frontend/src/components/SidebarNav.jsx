import { NavLink } from "react-router-dom"
import { t } from "../lib/strings.js"

/**
 * @param {{ items: { to: string, labelKey: string }[] }} props
 */
export function SidebarNav({ items }) {
  return (
    <nav
      className="flex gap-2 overflow-x-auto px-3 pb-1 text-sm lg:block lg:space-y-1 lg:overflow-visible lg:pb-0"
      aria-label="Ứng dụng"
    >
      {items.map(({ to, labelKey }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `block shrink-0 whitespace-nowrap rounded-lg px-3 py-2.5 font-medium transition lg:whitespace-normal ${
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
