/** @type {{ to: string, labelKey: string, systemOnly?: boolean }[]} */
export const adminNavItems = [
  { to: "/admin-dashboard", labelKey: "nav.adminDashboard" },
  { to: "/admin/students", labelKey: "nav.adminStudents" },
  { to: "/admin/applications", labelKey: "nav.adminApplications" },
  { to: "/admin/licenses", labelKey: "nav.adminLicenses" },
  { to: "/admin/payments", labelKey: "nav.adminPayments" },
  { to: "/admin/schedules", labelKey: "nav.adminSchedules" },
  { to: "/admin/schedules/slots", labelKey: "nav.adminSlots" },
  { to: "/admin/class-sessions", labelKey: "nav.adminClassSessions" },
  { to: "/admin/courses", labelKey: "nav.adminCourses" },
  { to: "/admin/site-content", labelKey: "nav.adminSiteContent" },
  { to: "/admin/health", labelKey: "nav.adminHealth" },
  { to: "/admin/centers", labelKey: "nav.adminCenters", systemOnly: true },
]

export function navItemsForRole(role) {
  return adminNavItems
    .filter((item) => !item.systemOnly || role === "system_admin")
    .map((item) => {
      if (role === "center_admin" && item.to === "/admin/courses") {
        return { ...item, labelKey: "nav.adminCoursesReadOnly" }
      }
      return item
    })
}
