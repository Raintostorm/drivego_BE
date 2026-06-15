import { Link } from "react-router-dom"
import { HelpCard } from "../components/HelpCard.jsx"
import { SimulatorInstallCard } from "../components/SimulatorInstallCard.jsx"
import { UiCard } from "../components/UiCard.jsx"

const learnerSteps = [
  {
    title: "1. Tạo tài khoản và chọn hạng bằng",
    body: "Đăng ký bằng email hoặc Google, sau đó chọn hạng A1, A2, B1 hoặc B2. Hạng đang học sẽ quyết định tài liệu, đề thi và lịch thi hiển thị trong hệ thống.",
    to: "/register",
    cta: "Đăng ký tài khoản",
  },
  {
    title: "2. Đăng ký khóa học",
    body: "Vào bảng giá hoặc trang đăng ký khóa, tạo mã thanh toán và chuyển khoản đúng nội dung. Khi SePay xác nhận, khóa học sẽ tự mở.",
    to: "/pricing",
    cta: "Xem khóa học",
  },
  {
    title: "3. Học lý thuyết và làm đề thi thử",
    body: "Học theo chương, sau đó làm đề thi thử. Với A1/A2 là 25 câu, B1/B2 là 30 câu; bài đạt khi đủ điểm và không sai câu điểm liệt.",
    to: "/theory",
    cta: "Vào học",
  },
  {
    title: "4. Hoàn thiện hồ sơ sát hạch",
    body: "Điền thông tin cá nhân, upload ảnh/CCCD/VNeID/GPLX nếu có. File nên là JPG, PNG, WEBP hoặc PDF và không vượt quá 5MB mỗi file.",
    to: "/application",
    cta: "Nộp hồ sơ",
  },
  {
    title: "5. Đăng ký lịch thi",
    body: "Khi hồ sơ đã được duyệt, chọn lịch thi theo hạng bằng và loại ca. Trạng thái sẽ là chờ xác nhận cho đến khi trung tâm duyệt.",
    to: "/schedule",
    cta: "Xem lịch thi",
  },
]

const adminSteps = [
  "Theo dõi hồ sơ học viên và đổi trạng thái duyệt khi giấy tờ hợp lệ.",
  "Tạo lịch thi, ca thi, buổi học và giới hạn số chỗ theo từng trung tâm.",
  "Kiểm tra giao dịch thanh toán, chỉ xác nhận thủ công khi đã đối soát chắc chắn.",
]

const tips = [
  "Nếu không thấy tài liệu hoặc đề thi, kiểm tra lại hạng bằng đang chọn ở thanh bên.",
  "Nếu thanh toán chưa cập nhật ngay, chờ vài giây rồi bấm kiểm tra lại.",
  "Nếu hồ sơ bị yêu cầu bổ sung, upload lại giấy tờ rồi nộp lại từ trang Nộp hồ sơ.",
]

export function GuidePage() {
  return (
    <section className="space-y-8">
      <UiCard as="header" padding="lg" variant="panel" className="text-center">
        <p className="text-sm font-medium text-drive-action">DriveGo Guide</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          Hướng dẫn sử dụng DriveGo
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-drive-muted">
          Tóm tắt các bước chính để học viên đi từ đăng ký tài khoản, thanh toán,
          học lý thuyết, làm đề thi thử, nộp hồ sơ đến đăng ký lịch thi.
        </p>
      </UiCard>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {learnerSteps.map((step) => (
            <UiCard key={step.title} variant="panel">
              <h2 className="text-lg font-semibold text-white">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-drive-muted">{step.body}</p>
              <Link
                to={step.to}
                className="mt-4 inline-flex rounded-drive-pill bg-drive-action px-4 py-2 text-sm font-bold text-drive-action-contrast shadow-drive-action transition hover:brightness-110"
              >
                {step.cta}
              </Link>
            </UiCard>
          ))}
        </div>

        <aside className="space-y-4">
          <HelpCard title="Lưu ý nhanh" items={tips} />
          <SimulatorInstallCard compact />
          <HelpCard title="Dành cho trung tâm" items={adminSteps} />
          <UiCard variant="panel">
            <h2 className="font-semibold text-white">Khi cần hỗ trợ</h2>
            <p className="mt-2 text-sm leading-relaxed text-drive-muted">
              Gửi ảnh lỗi, email tài khoản và thao tác đang làm để đội hỗ trợ kiểm tra nhanh hơn.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/docs"
                className="rounded-drive-pill border border-drive-border px-4 py-2 text-sm text-drive-muted transition hover:text-white"
              >
                Tài liệu
              </Link>
              <Link
                to="/lookup"
                className="rounded-drive-pill border border-drive-border px-4 py-2 text-sm text-drive-muted transition hover:text-white"
              >
                Tra cứu
              </Link>
            </div>
          </UiCard>
        </aside>
      </div>
    </section>
  )
}
