import { Link } from "react-router-dom"
import { UiCard } from "../components/UiCard.jsx"
import { t } from "../lib/strings.js"

export function CenterRegisterPage() {
  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-white">{t("pages.centerRegister.title")}</h1>
        <p className="mt-2 text-drive-muted">{t("pages.centerRegister.subtitle")}</p>
        <div className="mx-auto mt-4 grid max-w-md grid-cols-2 rounded-drive-pill border border-drive-border bg-drive-elevated p-1 text-sm">
          <Link to="/register" className="rounded-drive-pill py-2.5 text-drive-muted hover:text-white">
            {t("pages.register.tabStudent")}
          </Link>
          <span className="rounded-drive-pill bg-drive-accent py-2.5 font-bold text-drive-accent-contrast">
            {t("pages.register.tabCenter")}
          </span>
        </div>
      </header>

      <UiCard variant="panel" className="space-y-4 text-center">
        <h2 className="text-lg font-semibold text-white">Đăng ký trung tâm qua DriveGo</h2>
        <p className="text-sm leading-relaxed text-drive-muted">
          Tài khoản quản trị trung tâm do bộ phận vận hành DriveGo cấp sau khi hợp tác. Nếu bạn là
          đại diện trung tâm lái xe, vui lòng liên hệ để được tạo tài khoản và gắn dữ liệu học viên.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/login"
            className="rounded-drive-pill bg-drive-action px-6 py-3 text-sm font-bold text-drive-action-contrast shadow-drive-action transition hover:brightness-110"
          >
            Đăng nhập quản trị
          </Link>
          <a
            href="mailto:support@drivego.demo"
            className="rounded-drive-pill border border-drive-border bg-drive-elevated px-6 py-3 text-sm font-bold text-white transition hover:bg-drive-panel"
          >
            Liên hệ hỗ trợ
          </a>
        </div>
        <p className="text-xs text-drive-placeholder">
          Quản trị viên hệ thống: tạo trung tâm tại menu Trung tâm sau khi đăng nhập admin.
        </p>
      </UiCard>
    </section>
  )
}
