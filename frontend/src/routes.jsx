import { lazy } from "react"

function lazyNamed(importer, exportName) {
  return lazy(() =>
    importer().then((m) => ({
      default: m[exportName],
    })),
  )
}

/**
 * @typedef {'marketing' | 'auth' | 'dashboard' | 'admin'} RouteLayoutType
 * @typedef {{ path: string, labelKey: string, group: 'marketing' | 'auth' | 'app' | 'admin', layout: RouteLayoutType, LazyPage: import('react').LazyExoticComponent<import('react').ComponentType<object>> }} AppRoute
 */

/** @type {AppRoute[]} */
export const routeConfig = [
  {
    path: "/",
    labelKey: "nav.home",
    group: "marketing",
    layout: "marketing",
    LazyPage: lazyNamed(() => import("./pages/HomePage.jsx"), "HomePage"),
  },
  {
    path: "/pricing",
    labelKey: "nav.pricing",
    group: "marketing",
    layout: "marketing",
    LazyPage: lazyNamed(() => import("./pages/PricingPage.jsx"), "PricingPage"),
  },
  {
    path: "/docs",
    labelKey: "nav.docs",
    group: "marketing",
    layout: "marketing",
    LazyPage: lazyNamed(() => import("./pages/DocsPage.jsx"), "DocsPage"),
  },
  {
    path: "/guide",
    labelKey: "nav.guide",
    group: "marketing",
    layout: "marketing",
    LazyPage: lazyNamed(() => import("./pages/GuidePage.jsx"), "GuidePage"),
  },
  {
    path: "/lookup",
    labelKey: "nav.lookup",
    group: "marketing",
    layout: "marketing",
    LazyPage: lazyNamed(() => import("./pages/LookupPage.jsx"), "LookupPage"),
  },
  {
    path: "/login",
    labelKey: "nav.login",
    group: "auth",
    layout: "auth",
    LazyPage: lazyNamed(() => import("./pages/LoginPage.jsx"), "LoginPage"),
  },
  {
    path: "/register",
    labelKey: "nav.register",
    group: "auth",
    layout: "auth",
    LazyPage: lazyNamed(() => import("./pages/RegisterPage.jsx"), "RegisterPage"),
  },
  {
    path: "/forgot-password",
    labelKey: "nav.forgotPassword",
    group: "auth",
    layout: "auth",
    LazyPage: lazyNamed(
      () => import("./pages/ForgotPasswordPage.jsx"),
      "ForgotPasswordPage",
    ),
  },
  {
    path: "/reset-password",
    labelKey: "nav.forgotPassword",
    group: "auth",
    layout: "auth",
    LazyPage: lazyNamed(
      () => import("./pages/ResetPasswordPage.jsx"),
      "ResetPasswordPage",
    ),
  },
  {
    path: "/history",
    labelKey: "nav.history",
    group: "app",
    layout: "dashboard",
    LazyPage: lazyNamed(() => import("./pages/HistoryPage.jsx"), "HistoryPage"),
  },
  {
    path: "/history/:attemptId",
    labelKey: "nav.history",
    group: "app",
    layout: "dashboard",
    LazyPage: lazyNamed(() => import("./pages/ExamReviewPage.jsx"), "ExamReviewPage"),
  },
  {
    path: "/exam",
    labelKey: "nav.exam",
    group: "app",
    layout: "dashboard",
    LazyPage: lazyNamed(() => import("./pages/ExamPage.jsx"), "ExamPage"),
  },
  {
    path: "/theory",
    labelKey: "nav.theory",
    group: "app",
    layout: "dashboard",
    LazyPage: lazyNamed(() => import("./pages/TheoryPage.jsx"), "TheoryPage"),
  },
  {
    path: "/schedule",
    labelKey: "nav.schedule",
    group: "app",
    layout: "dashboard",
    LazyPage: lazyNamed(() => import("./pages/SchedulePage.jsx"), "SchedulePage"),
  },
  {
    path: "/student-dashboard",
    labelKey: "nav.studentDashboard",
    group: "app",
    layout: "dashboard",
    LazyPage: lazyNamed(
      () => import("./pages/StudentDashboardPage.jsx"),
      "StudentDashboardPage",
    ),
  },
  {
    path: "/upgrade",
    labelKey: "nav.upgrade",
    group: "app",
    layout: "dashboard",
    LazyPage: lazyNamed(() => import("./pages/UpgradePage.jsx"), "UpgradePage"),
  },
  {
    path: "/enroll",
    labelKey: "nav.pricing",
    group: "app",
    layout: "dashboard",
    LazyPage: lazyNamed(() => import("./pages/EnrollPage.jsx"), "EnrollPage"),
  },
  {
    path: "/profile",
    labelKey: "nav.profile",
    group: "app",
    layout: "dashboard",
    LazyPage: lazyNamed(() => import("./pages/ProfilePage.jsx"), "ProfilePage"),
  },
  {
    path: "/application",
    labelKey: "nav.application",
    group: "app",
    layout: "dashboard",
    LazyPage: lazyNamed(
      () => import("./pages/ApplicationPage.jsx"),
      "ApplicationPage",
    ),
  },
  {
    path: "/study-calendar",
    labelKey: "nav.studyCalendar",
    group: "app",
    layout: "dashboard",
    LazyPage: lazyNamed(
      () => import("./pages/StudyCalendarPage.jsx"),
      "StudyCalendarPage",
    ),
  },
  {
    path: "/ai-chat",
    labelKey: "nav.aiChat",
    group: "app",
    layout: "dashboard",
    LazyPage: lazyNamed(() => import("./pages/AiChatPage.jsx"), "AiChatPage"),
  },
  {
    path: "/notifications",
    labelKey: "nav.notifications",
    group: "app",
    layout: "dashboard",
    LazyPage: lazyNamed(
      () => import("./pages/NotificationsPage.jsx"),
      "NotificationsPage",
    ),
  },
  {
    path: "/center-register",
    labelKey: "nav.centerRegister",
    group: "app",
    layout: "marketing",
    LazyPage: lazyNamed(
      () => import("./pages/CenterRegisterPage.jsx"),
      "CenterRegisterPage",
    ),
  },
  {
    path: "/admin-dashboard",
    labelKey: "nav.adminDashboard",
    group: "admin",
    layout: "admin",
    LazyPage: lazyNamed(
      () => import("./pages/AdminDashboardPage.jsx"),
      "AdminDashboardPage",
    ),
  },
  {
    path: "/admin/students",
    labelKey: "nav.adminStudents",
    group: "admin",
    layout: "admin",
    LazyPage: lazyNamed(
      () => import("./pages/AdminStudentsPage.jsx"),
      "AdminStudentsPage",
    ),
  },
  {
    path: "/admin/students/:userId",
    labelKey: "nav.adminStudentDetail",
    group: "admin",
    layout: "admin",
    LazyPage: lazyNamed(
      () => import("./pages/AdminStudentDetailPage.jsx"),
      "AdminStudentDetailPage",
    ),
  },
  {
    path: "/admin/applications",
    labelKey: "nav.adminApplications",
    group: "admin",
    layout: "admin",
    LazyPage: lazyNamed(
      () => import("./pages/AdminApplicationsPage.jsx"),
      "AdminApplicationsPage",
    ),
  },
  {
    path: "/admin/applications/:id",
    labelKey: "nav.adminApplicationDetail",
    group: "admin",
    layout: "admin",
    LazyPage: lazyNamed(
      () => import("./pages/AdminApplicationDetailPage.jsx"),
      "AdminApplicationDetailPage",
    ),
  },
  {
    path: "/admin/licenses",
    labelKey: "nav.adminLicenses",
    group: "admin",
    layout: "admin",
    LazyPage: lazyNamed(
      () => import("./pages/AdminLicensesPage.jsx"),
      "AdminLicensesPage",
    ),
  },
  {
    path: "/admin/payments",
    labelKey: "nav.adminPayments",
    group: "admin",
    layout: "admin",
    LazyPage: lazyNamed(
      () => import("./pages/AdminPaymentsPage.jsx"),
      "AdminPaymentsPage",
    ),
  },
  {
    path: "/admin/schedules",
    labelKey: "nav.adminSchedules",
    group: "admin",
    layout: "admin",
    LazyPage: lazyNamed(
      () => import("./pages/AdminSchedulesPage.jsx"),
      "AdminSchedulesPage",
    ),
  },
  {
    path: "/admin/schedules/slots",
    labelKey: "nav.adminSlots",
    group: "admin",
    layout: "admin",
    LazyPage: lazyNamed(
      () => import("./pages/AdminScheduleSlotsPage.jsx"),
      "AdminScheduleSlotsPage",
    ),
  },
  {
    path: "/admin/courses",
    labelKey: "nav.adminCourses",
    group: "admin",
    layout: "admin",
    LazyPage: lazyNamed(
      () => import("./pages/AdminCoursesPage.jsx"),
      "AdminCoursesPage",
    ),
  },
  {
    path: "/admin/courses/:code/chapters",
    labelKey: "nav.adminChapters",
    group: "admin",
    layout: "admin",
    LazyPage: lazyNamed(
      () => import("./pages/AdminCourseChaptersPage.jsx"),
      "AdminCourseChaptersPage",
    ),
  },
  {
    path: "/admin/site-content",
    labelKey: "nav.adminSiteContent",
    group: "admin",
    layout: "admin",
    LazyPage: lazyNamed(
      () => import("./pages/AdminSiteContentPage.jsx"),
      "AdminSiteContentPage",
    ),
  },
  {
    path: "/admin/health",
    labelKey: "nav.adminHealth",
    group: "admin",
    layout: "admin",
    LazyPage: lazyNamed(() => import("./pages/AdminHealthPage.jsx"), "AdminHealthPage"),
  },
  {
    path: "/admin/class-sessions",
    labelKey: "nav.adminClassSessions",
    group: "admin",
    layout: "admin",
    LazyPage: lazyNamed(
      () => import("./pages/AdminClassSessionsPage.jsx"),
      "AdminClassSessionsPage",
    ),
  },
  {
    path: "/admin/centers",
    labelKey: "nav.adminCenters",
    group: "admin",
    layout: "admin",
    LazyPage: lazyNamed(
      () => import("./pages/AdminCentersPage.jsx"),
      "AdminCentersPage",
    ),
  },
]

export const marketingRoutes = routeConfig.filter((r) => r.group === "marketing")
export const moreRoutes = routeConfig.filter((r) => r.group === "app" || r.group === "admin")
