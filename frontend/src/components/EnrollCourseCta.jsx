import { Link } from "react-router-dom"
import { UiCard } from "./UiCard.jsx"

/**
 * @param {{ licenseClass: string }} props
 */
export function EnrollCourseCta({ licenseClass }) {
  return (
    <UiCard variant="panel" className="mx-auto max-w-lg text-center">
      <h1 className="text-xl font-bold text-white">Đăng ký khóa học hạng {licenseClass}</h1>
      <p className="mt-3 text-sm text-drive-muted">
        Bạn cần thanh toán phí đăng ký khóa (thử nghiệm ~5.000đ qua SePay) để học lý thuyết và làm
        bài thi thử. Premium là tùy chọn, không bắt buộc.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to={`/enroll?class=${encodeURIComponent(licenseClass)}`}
          className="rounded-drive-pill bg-drive-action px-6 py-3 text-sm font-bold text-drive-action-contrast shadow-drive-action transition hover:brightness-110"
        >
          Đăng ký & thanh toán
        </Link>
        <Link
          to="/pricing"
          className="rounded-drive-pill border border-drive-border bg-drive-elevated px-6 py-3 text-sm font-bold text-white transition hover:bg-drive-panel"
        >
          Xem bảng giá
        </Link>
      </div>
    </UiCard>
  )
}
