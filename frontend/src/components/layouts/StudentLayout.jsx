import { DashboardShell } from "./DashboardShell.jsx"
import { studentNav } from "../../config/studentNav.js"

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function StudentLayout({ children }) {
  return (
    <DashboardShell variant="student" navItems={studentNav}>
      {children}
    </DashboardShell>
  )
}
