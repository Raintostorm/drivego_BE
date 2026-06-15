import { useEffect, useState } from "react"
import { useLocation } from "react-router-dom"

const GUIDE_AUTO_OPEN_KEY = "drivego_page_guide_auto_open"
const SIMULATOR_VIDEO_URL = "https://www.youtube.com/watch?v=Xxnk7i5vGgw&t=795s"

const guideContent = {
  "/student-dashboard": {
    label: "Tổng quan",
    title: "Cách dùng trang tổng quan",
    items: [
      "Xem nhanh tiến độ học, trạng thái khóa học và các việc cần làm tiếp theo.",
      "Nếu chưa mở khóa học, vào bảng giá hoặc đăng ký khóa để thanh toán.",
      "Luôn kiểm tra hạng bằng ở thanh bên trước khi học hoặc thi thử.",
    ],
  },
  "/theory": {
    label: "Học lý thuyết",
    title: "Cách học hiệu quả",
    items: [
      "Chọn chương ở lộ trình bên dưới để đổi bài học.",
      "Xem video, sau đó bấm Đã xem 50% hoặc Hoàn thành chương để lưu tiến độ.",
      "Nếu video không phát trong trang, bấm link mở trực tiếp trên YouTube.",
    ],
    links: [{ label: "Video cài phần mềm mô phỏng", href: SIMULATOR_VIDEO_URL }],
  },
  "/exam": {
    label: "Thi thử",
    title: "Cách làm bài thi thử",
    items: [
      "Chọn đề thi ở hộp phía trên, sau đó trả lời từng câu.",
      "Bấm số câu phía dưới để nhảy nhanh; màu xanh là câu đã trả lời.",
      "Cần trả lời đủ câu mới nộp được. Hết giờ hệ thống sẽ tự nộp.",
      "Sai câu điểm liệt thì không đạt dù tổng điểm đủ.",
    ],
    links: [{ label: "Video cài phần mềm mô phỏng", href: SIMULATOR_VIDEO_URL }],
  },
  "/history": {
    label: "Lịch sử",
    title: "Theo dõi kết quả",
    items: [
      "Xem lại các lần thi thử để biết điểm và xu hướng tiến bộ.",
      "Nếu rớt vì câu điểm liệt, quay lại ôn đúng nhóm câu đó trước khi thi lại.",
      "Dùng lịch sử để chọn thời điểm đăng ký lịch thi phù hợp.",
    ],
  },
  "/schedule": {
    label: "Lịch thi",
    title: "Đăng ký lịch thi",
    items: [
      "Chọn đúng hạng bằng và loại ca thi trước khi xem lịch.",
      "Ca thi chính thức thường yêu cầu hồ sơ sát hạch đã được duyệt.",
      "Sau khi đăng ký, trạng thái sẽ chờ trung tâm xác nhận.",
    ],
  },
  "/study-calendar": {
    label: "Lịch học",
    title: "Theo dõi buổi học",
    items: [
      "Chọn buổi học trong danh sách để xem thời gian và địa điểm.",
      "Bấm điểm danh khi đến buổi học theo hướng dẫn của trung tâm.",
      "Nếu chưa thấy lịch, hãy kiểm tra hồ sơ cá nhân đã gắn trung tâm chưa.",
    ],
  },
  "/profile": {
    label: "Hồ sơ",
    title: "Cập nhật thông tin cá nhân",
    items: [
      "Điền đúng họ tên, ngày sinh, số điện thoại và thông tin liên hệ.",
      "Thông tin này giúp trung tâm đối chiếu khi duyệt hồ sơ sát hạch.",
      "Nếu đổi hạng bằng đang học, kiểm tra lại tài liệu và đề thi tương ứng.",
    ],
  },
  "/application": {
    label: "Nộp hồ sơ",
    title: "Chuẩn bị hồ sơ sát hạch",
    items: [
      "Điền thông tin theo CCCD trước khi lưu hoặc nộp.",
      "Upload đúng loại giấy tờ; ảnh nên rõ nét, không bị cắt góc.",
      "Nếu trung tâm yêu cầu bổ sung, upload lại tài liệu rồi nộp lại.",
    ],
  },
  "/notifications": {
    label: "Thông báo",
    title: "Theo dõi cập nhật",
    items: [
      "Đọc thông báo về thanh toán, hồ sơ, lịch học và lịch thi.",
      "Những thông báo quan trọng nên xử lý trước khi tiếp tục đăng ký lịch.",
      "Nếu thấy thông báo lỗi thanh toán/hồ sơ, mở đúng trang liên quan để kiểm tra.",
    ],
  },
  "/upgrade": {
    label: "Premium",
    title: "Dùng gói Premium",
    items: [
      "Tạo mã thanh toán và chuyển khoản đúng nội dung hiển thị.",
      "Sau khi hệ thống đối soát thành công, quyền Premium sẽ tự cập nhật.",
      "Premium là tùy chọn hỗ trợ thêm, không thay thế yêu cầu hồ sơ sát hạch.",
    ],
  },
  "/enroll": {
    label: "Đăng ký khóa",
    title: "Mở khóa học",
    items: [
      "Kiểm tra hạng bằng trước khi tạo thanh toán.",
      "Chuyển khoản đúng số tiền và đúng mã nội dung để tự động mở khóa.",
      "Nếu thanh toán chưa cập nhật ngay, chờ vài giây rồi kiểm tra lại.",
    ],
  },
  "/ai-chat": {
    label: "AI Chat",
    title: "Hỏi đáp với AI",
    items: [
      "Dùng AI để hỏi lại khái niệm, biển báo hoặc tình huống chưa hiểu.",
      "AI chỉ hỗ trợ ôn tập, không thay thế tài liệu chính thức và hướng dẫn của trung tâm.",
      "Không nhập thông tin nhạy cảm như mật khẩu hoặc mã thanh toán.",
    ],
  },
}

function contentForPath(pathname) {
  return guideContent[pathname] ?? null
}

export function PageGuide() {
  const { pathname } = useLocation()
  const content = contentForPath(pathname)
  const [autoOpen, setAutoOpen] = useState(() => localStorage.getItem(GUIDE_AUTO_OPEN_KEY) !== "off")
  const [open, setOpen] = useState(() => localStorage.getItem(GUIDE_AUTO_OPEN_KEY) !== "off")

  useEffect(() => {
    if (autoOpen) setOpen(Boolean(content))
  }, [autoOpen, content, pathname])

  if (!content) return null

  function handleAutoOpenChange(enabled) {
    setAutoOpen(enabled)
    localStorage.setItem(GUIDE_AUTO_OPEN_KEY, enabled ? "on" : "off")
    setOpen(enabled)
  }

  return (
    <div className="fixed right-4 top-24 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 lg:right-6">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-drive-pill border border-drive-border bg-drive-action px-4 py-2 text-sm font-bold text-drive-action-contrast shadow-drive-action transition hover:brightness-110"
      >
        {open ? "Đóng hướng dẫn" : "Hướng dẫn"}
      </button>
      {open ? (
        <div className="w-full max-w-sm rounded-drive-lg border border-drive-border bg-drive-surface p-4 text-sm shadow-drive-card backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-drive-action">{content.label}</p>
              <h2 className="mt-1 text-lg font-bold text-white">{content.title}</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-drive-border px-2 py-1 text-xs text-drive-muted transition hover:text-white"
              aria-label="Đóng hướng dẫn"
            >
              x
            </button>
          </div>

          <ul className="mt-4 space-y-3 text-drive-muted">
            {content.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          {content.links?.length ? (
            <div className="mt-4 space-y-2">
              {content.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-drive border border-drive-action/40 bg-drive-action/10 px-3 py-2 text-drive-action transition hover:bg-drive-action/15"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}

          <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-drive border border-drive-border bg-drive-elevated px-3 py-2">
            <span className="text-drive-text">Tự mở hướng dẫn</span>
            <input
              type="checkbox"
              checked={autoOpen}
              onChange={(event) => handleAutoOpenChange(event.target.checked)}
              className="size-4 accent-drive-action"
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}
