import { NavLink } from "react-router-dom"
import { t } from "../lib/strings.js"

/**
 * @param {{ items: { to: string, labelKey: string }[] }} props
 */
export function SidebarNav({ items, stackOnMobile = false, onNavigate }) {
  return (
    <nav
      className={`px-3 pb-2 text-sm lg:block lg:space-y-1 lg:overflow-visible lg:pb-0 ${
        stackOnMobile
          ? "flex flex-col gap-1 overflow-visible"
          : "touch-pan-x flex gap-2 overflow-x-auto"
      }`}
      aria-label="Ứng dụng"
    >
      {items.map(({ to, labelKey }) => {
        const hasDedicatedChild = items.some((item) => item.to.startsWith(`${to}/`))
        return (
          <NavLink
            key={to}
            to={to}
            end={hasDedicatedChild}
            onClick={onNavigate}
            className={({ isActive }) =>
              `tap-feedback flex min-h-12 shrink-0 items-center rounded-lg px-3 py-2.5 font-medium transition lg:block lg:min-h-0 lg:py-2 ${stackOnMobile ? "whitespace-normal text-left" : "whitespace-nowrap text-center lg:whitespace-normal lg:text-left"} ${
                isActive
                  ? "bg-drive-action text-drive-action-contrast"
                  : "text-drive-muted hover:bg-drive-panel hover:text-white"
              }`
            }
          >
            {t(labelKey)}
          </NavLink>
        )
      })}
    </nav>
  )
}
