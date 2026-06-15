import { NavLink } from "react-router-dom"
import { t } from "../lib/strings.js"

/**
 * @param {{ items: { to: string, labelKey: string }[] }} props
 */
export function SidebarNav({ items }) {
  return (
    <nav className="space-y-1 px-3 text-sm" aria-label="Ứng dụng">
      {items.map(({ to, labelKey }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `block rounded-lg px-3 py-2.5 font-medium transition ${
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
