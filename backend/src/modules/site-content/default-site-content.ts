export type SiteContentPayload = {
  center: {
    name: string
    address: string
    phone: string
    email: string
    hours: string
    bank: string
  }
  services: Array<{
    title: string
    price: string
    desc: string
    imageKey: string
  }>
  highlights: string[]
  gallery: Array<{
    imageKey: string
    alt: string
  }>
  news: Array<{
    title: string
    date: string
    desc: string
    imageKey: string
  }>
}

export const DEFAULT_HOME_CONTENT: SiteContentPayload = {
  center: {
    name: "Trung tâm Đào tạo Lái xe DriveGo Sài Gòn",
    address: "Khu thực hành Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh",
    phone: "0976 693 436",
    email: "tuvan@drivego.space",
    hours: "Thứ 2 - Chủ nhật, 07:30 - 20:30",
    bank: "MBBank 0976693436 - VU HA GIA BAO",
  },
  services: [
    {
      title: "Đăng ký học lái xe máy A1",
      price: "từ 755.000đ",
      desc: "Lộ trình học gọn, phù hợp người mới bắt đầu và cần hoàn thiện hồ sơ thi sát hạch.",
      imageKey: "bikeYard",
    },
    {
      title: "Khóa học ô tô B1/B2",
      price: "từ 15.000.000đ",
      desc: "Quản lý lịch học, tiến độ lý thuyết, thực hành và luyện đề trên cùng một tài khoản DriveGo.",
      imageKey: "drivingTrack",
    },
  ],
  highlights: [
    "Hồ sơ, học phí và tiến độ được hiển thị rõ ràng cho từng hạng A1, A2, B1, B2.",
    "Bộ đề luyện thi tách riêng, không pha vào database vận hành thường ngày.",
    "AI Chat hỗ trợ giải thích luật, biển báo và mẹo ôn tập theo nhu cầu học viên.",
    "Theo dõi lịch học, lịch thi, thông báo và trạng thái premium trong dashboard.",
  ],
  gallery: [
    { imageKey: "practiceLine", alt: "Sân thực hành xe máy DriveGo" },
    { imageKey: "practiceClass", alt: "Khu vực hướng dẫn thực hành" },
    { imageKey: "studentBriefing", alt: "Buổi phổ biến trước giờ học" },
    { imageKey: "bikeYard", alt: "Khu luyện sa hình xe máy" },
    { imageKey: "motorbikeRow", alt: "Dàn xe thực hành" },
    { imageKey: "groupClass", alt: "Lớp học tập trung" },
    { imageKey: "theoryClass", alt: "Phòng học lý thuyết" },
    { imageKey: "instructorBike", alt: "Xe hướng dẫn thực hành" },
    { imageKey: "emptyYard", alt: "Sân tập lái" },
    { imageKey: "scooterGarage", alt: "Khu để xe học viên" },
    { imageKey: "drivingTrack", alt: "Đường luyện tập sát hạch" },
  ],
  news: [
    {
      title: "Cập nhật quy trình đăng ký GPLX trực tuyến",
      date: "30 Tháng 06",
      desc: "Học viên có thể chuẩn bị thông tin cá nhân, hồ sơ và chọn hạng học ngay trên DriveGo.",
      imageKey: "theoryClass",
    },
    {
      title: "Mẹo ôn 600 câu lý thuyết hiệu quả",
      date: "27 Tháng 06",
      desc: "Tập trung câu điểm liệt, nhóm biển báo dễ nhầm và luyện đề ngẫu nhiên theo hạng bằng.",
      imageKey: "groupClass",
    },
    {
      title: "Theo dõi học phí và premium trong admin",
      date: "22 Tháng 06",
      desc: "Admin có thể cập nhật học phí theo từng hạng và gói premium để học viên xem đúng giá.",
      imageKey: "instructorBike",
    },
  ],
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback
}

function normalizeCenter(value: unknown): SiteContentPayload["center"] {
  const input = isPlainObject(value) ? value : {}
  return {
    name: stringOrFallback(input.name, DEFAULT_HOME_CONTENT.center.name),
    address: stringOrFallback(input.address, DEFAULT_HOME_CONTENT.center.address),
    phone: stringOrFallback(input.phone, DEFAULT_HOME_CONTENT.center.phone),
    email: stringOrFallback(input.email, DEFAULT_HOME_CONTENT.center.email),
    hours: stringOrFallback(input.hours, DEFAULT_HOME_CONTENT.center.hours),
    bank: stringOrFallback(input.bank, DEFAULT_HOME_CONTENT.center.bank),
  }
}

function normalizeServices(value: unknown): SiteContentPayload["services"] {
  if (!Array.isArray(value)) return DEFAULT_HOME_CONTENT.services
  const services = value
    .filter(isPlainObject)
    .map((item, index) => {
      const fallback = DEFAULT_HOME_CONTENT.services[index % DEFAULT_HOME_CONTENT.services.length]
      return {
        title: stringOrFallback(item.title, fallback.title),
        price: stringOrFallback(item.price, fallback.price),
        desc: stringOrFallback(item.desc, fallback.desc),
        imageKey: stringOrFallback(item.imageKey, fallback.imageKey),
      }
    })
  return services.length ? services : DEFAULT_HOME_CONTENT.services
}

function normalizeHighlights(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_HOME_CONTENT.highlights
  const highlights = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  )
  return highlights.length ? highlights : DEFAULT_HOME_CONTENT.highlights
}

function normalizeGallery(value: unknown): SiteContentPayload["gallery"] {
  if (!Array.isArray(value)) return DEFAULT_HOME_CONTENT.gallery
  const gallery = value
    .filter(isPlainObject)
    .map((item, index) => {
      const fallback = DEFAULT_HOME_CONTENT.gallery[index % DEFAULT_HOME_CONTENT.gallery.length]
      return {
        imageKey: stringOrFallback(item.imageKey, fallback.imageKey),
        alt: stringOrFallback(item.alt, fallback.alt),
      }
    })
  return gallery.length ? gallery : DEFAULT_HOME_CONTENT.gallery
}

function normalizeNews(value: unknown): SiteContentPayload["news"] {
  if (!Array.isArray(value)) return DEFAULT_HOME_CONTENT.news
  const news = value
    .filter(isPlainObject)
    .map((item, index) => {
      const fallback = DEFAULT_HOME_CONTENT.news[index % DEFAULT_HOME_CONTENT.news.length]
      return {
        title: stringOrFallback(item.title, fallback.title),
        date: stringOrFallback(item.date, fallback.date),
        desc: stringOrFallback(item.desc, fallback.desc),
        imageKey: stringOrFallback(item.imageKey, fallback.imageKey),
      }
    })
  return news.length ? news : DEFAULT_HOME_CONTENT.news
}

export function normalizeHomeContent(value: unknown): SiteContentPayload {
  const input = isPlainObject(value) ? value : {}
  return {
    center: normalizeCenter(input.center),
    services: normalizeServices(input.services),
    highlights: normalizeHighlights(input.highlights),
    gallery: normalizeGallery(input.gallery),
    news: normalizeNews(input.news),
  }
}
