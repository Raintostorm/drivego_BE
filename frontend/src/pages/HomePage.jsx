import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import practiceLineImage from "../assets/boanh/z7907357627838_b3adcc5190caaa267c02a800d9949a33.jpg"
import practiceClassImage from "../assets/boanh/z7907357639212_bdbc6e4d16caefc28da3f32243cc699f.jpg"
import studentBriefingImage from "../assets/boanh/z7920884503549_4725c39213fabd12da44f10563ec47c2.jpg"
import bikeYardImage from "../assets/boanh/z7920884510543_b364c845fe6476f713fb45529966710e.jpg"
import motorbikeRowImage from "../assets/boanh/z7920884518729_1b2114bfcebcb0da54afe39e41923706.jpg"
import groupClassImage from "../assets/boanh/z7920884538917_b80e61e31431c1e7c60b6715f902306d.jpg"
import theoryClassImage from "../assets/boanh/z7920884561048_a583b6d965b7c0588a138ba13b1cd6a4.jpg"
import instructorBikeImage from "../assets/boanh/z7920884565064_661f914b7e66173cecbfcc4710285de9.jpg"
import emptyYardImage from "../assets/boanh/z7988973616633_bf3e5cd10520d7d930a3d14633f7edce.jpg"
import scooterGarageImage from "../assets/boanh/z7988973619848_5e0d7f0197a654eebcdf50d4b626dce2.jpg"
import drivingTrackImage from "../assets/boanh/z7988973749907_1e8d1d1b508f47794dd85f7616de1ace.jpg"
import motorbikeImage from "../assets/motorbike.png"
import scooterVideo from "../assets/scooter-urban-road.mp4"
import { DitherBackground } from "../components/DitherBackground.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { apiFetch } from "../lib/api.js"
import { t } from "../lib/strings.js"
import DecryptedText from "../components/DecryptedText.jsx"

const IMAGE_MAP = {
  practiceLine: practiceLineImage,
  practiceClass: practiceClassImage,
  studentBriefing: studentBriefingImage,
  bikeYard: bikeYardImage,
  motorbikeRow: motorbikeRowImage,
  groupClass: groupClassImage,
  theoryClass: theoryClassImage,
  instructorBike: instructorBikeImage,
  emptyYard: emptyYardImage,
  scooterGarage: scooterGarageImage,
  drivingTrack: drivingTrackImage,
}

const DEFAULT_HOME_CONTENT = {
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
      title: "Khóa học bằng lái xe máy A1",
      price: "từ 900.000đ",
      desc: "Gói học gọn cho người mới, hỗ trợ hồ sơ, lịch ôn lý thuyết và luyện thi trước ngày sát hạch.",
      imageKey: "bikeYard",
    },
    {
      title: "Khóa học ô tô B1/B2 trọn lộ trình",
      price: "từ 25.000.000đ",
      desc: "Theo dõi lý thuyết, thực hành, lịch học và hồ sơ trên cùng một tài khoản DriveGo.",
      imageKey: "drivingTrack",
    },
  ],
  popularPlan: {
    eyebrow: "Gói học phổ biến",
    title: "Bằng B2 trọn lộ trình — từ 25.000.000đ",
    cta: "Xem tất cả",
  },
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

function imageByKey(key, fallback = practiceClassImage) {
  return IMAGE_MAP[key] || fallback
}

const CENTER_LOCATION = {
  name: "Trung tâm Dạy Nghề Đào Tạo & Sát Hạch Lái Xe Làng Đại Học",
  address: "Trường ĐH TDTT Võ Trường Toản, Phường Linh Trung, Thủ Đức, Hồ Chí Minh, Việt Nam",
  // Approximate pin for the TDTT/Linh Trung training area. Google Maps link remains the source of truth.
  lat: 10.8792,
  lng: 106.8027,
}

function toRad(value) {
  return (value * Math.PI) / 180
}

function distanceKm(from, to) {
  const earthKm = 6371
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function HomePage() {
  const heroVideoRef = useRef(null)
  const [siteContent, setSiteContent] = useState(DEFAULT_HOME_CONTENT)
  const [geoState, setGeoState] = useState({
    loading: false,
    userPosition: null,
    distance: null,
    error: "",
  })
  const centerInfo = siteContent.center
  const features = [
    { title: t("pages.home.feature1"), desc: "Video bài giảng và mô phỏng tình huống trên mọi thiết bị." },
    { title: t("pages.home.feature2"), desc: "Ngân hàng 600 câu hỏi và đề thi cập nhật theo quy định mới." },
    { title: t("pages.home.feature3"), desc: "Biểu đồ tiến độ, điểm yếu và gợi ý ôn tập cá nhân hóa." },
    { title: t("pages.home.feature4"), desc: "Mã hóa dữ liệu và xác thực đa lớp cho tài khoản học viên." },
  ]
  const quickTabs = [
    { href: "#services", label: "Dịch vụ" },
    { href: "#about", label: "Giới thiệu" },
    { href: "#programs", label: "Chương trình" },
    { href: "#gallery", label: "Hình ảnh" },
    { href: "#news", label: "Tin tức" },
    { href: "#map", label: "Bản đồ" },
    { href: "#contact", label: "Liên hệ" },
  ]
  const services = siteContent.services
  const popularPlan = siteContent.popularPlan
  const programHighlights = siteContent.highlights
  const gallery = siteContent.gallery
  const news = siteContent.news

  useEffect(() => {
    const video = heroVideoRef.current
    if (!video) return
    video.play().catch(() => {
      // The poster remains visible if the browser blocks autoplay.
    })
  }, [])

  useEffect(() => {
    let active = true
    apiFetch("/site-content/home")
      .then((data) => {
        if (!active) return
        setSiteContent({
          ...DEFAULT_HOME_CONTENT,
          ...data,
          center: { ...DEFAULT_HOME_CONTENT.center, ...(data?.center || {}) },
          popularPlan: { ...DEFAULT_HOME_CONTENT.popularPlan, ...(data?.popularPlan || {}) },
        })
      })
      .catch(() => {
        if (active) setSiteContent(DEFAULT_HOME_CONTENT)
      })
    return () => {
      active = false
    }
  }, [])

  const mapQuery = `${CENTER_LOCATION.name}, ${CENTER_LOCATION.address}`
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
  const directionsUrl = geoState.userPosition
    ? `https://www.google.com/maps/dir/?api=1&origin=${geoState.userPosition.lat},${geoState.userPosition.lng}&destination=${encodeURIComponent(mapQuery)}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`

  function locateUser() {
    if (!navigator.geolocation) {
      setGeoState((prev) => ({
        ...prev,
        error: "Trình duyệt này chưa hỗ trợ định vị. Bạn có thể mở Google Maps để xem đường đi.",
      }))
      return
    }

    setGeoState((prev) => ({ ...prev, loading: true, error: "" }))
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setGeoState({
          loading: false,
          userPosition,
          distance: distanceKm(userPosition, CENTER_LOCATION),
          error: "",
        })
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Bạn chưa cấp quyền định vị. Hãy bật định vị trên trình duyệt để ước tính khoảng cách."
            : "Không lấy được vị trí hiện tại. Bạn có thể mở Google Maps để xác nhận đường đi."
        setGeoState((prev) => ({ ...prev, loading: false, error: message }))
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  return (
    <section className="home-page-surface space-y-20">
      <div className="home-dither-hero relative overflow-hidden text-center">
        <DitherBackground density="strong" />
        <video
          ref={heroVideoRef}
          className="home-hero-video"
          src={scooterVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={motorbikeImage}
          aria-hidden="true"
        />
        <p className="relative mb-4 inline-flex items-center gap-2 rounded-full border border-drive-border bg-drive-elevated/80 px-4 py-1.5 text-xs font-medium text-drive-muted">
          <span className="size-2 rounded-full bg-drive-success" />
          {t("pages.home.badge")}
        </p>
        <h1 className="relative text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          <DecryptedText
            text={t("pages.home.title")}
            speed={60}
            maxIterations={10}
            loop={true}
            loopDelay={4000}
            animateOn="view"
            sequential={false}
          />
          <br />
          <DecryptedText
            text={t("pages.home.titleHighlight")}
            speed={60}
            maxIterations={10}
            loop={true}
            loopDelay={4000}
            animateOn="view"
            parentClassName="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent inline-block"
            sequential={false}
          />
        </h1>
        <p className="relative mx-auto mt-6 max-w-2xl text-base leading-relaxed text-drive-muted">
          {t("pages.home.subtitle")}
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/register"
            className="home-primary-cta rounded-drive-pill bg-white px-6 py-3 text-sm font-bold text-black shadow-drive-action transition hover:bg-gray-200"
          >
            {t("common.startFree")}
          </Link>
          <Link
            to="/exam"
            className="home-secondary-cta rounded-drive-pill border border-drive-border bg-drive-elevated px-6 py-3 text-sm font-bold text-white transition hover:bg-drive-panel"
          >
            {t("common.viewDemo")}
          </Link>
        </div>
      </div>

      <UiCard variant="panel" padding="none" className="home-preview-card overflow-hidden">
        <div className="border-b border-drive-border-soft bg-drive-sidebar px-4 py-2">
          <div className="flex gap-2">
            <span className="size-3 rounded-full bg-red-500/80" />
            <span className="size-3 rounded-full bg-amber-500/80" />
            <span className="size-3 rounded-full bg-drive-success/80" />
          </div>
        </div>
        <div className="drive-velocity-stage">
          <div className="drive-velocity-glow" />
          <div className="drive-velocity-lines" aria-hidden="true">
            {[
              ["Học lái thông minh", "drive-velocity-line--bold", "drive-velocity-track--left"],
              ["Thi thử sát hạch", "drive-velocity-line--serif", "drive-velocity-track--right"],
              ["AI nhắc điểm yếu", "drive-velocity-line--mono", "drive-velocity-track--left drive-velocity-track--slow"],
              ["Đỗ nhanh hơn", "drive-velocity-line--outline", "drive-velocity-track--right drive-velocity-track--fast"],
            ].map(([text, lineClass, trackClass]) => (
              <div className={`drive-velocity-line ${lineClass}`} key={text}>
                <div className={`drive-velocity-track ${trackClass}`}>
                  {Array.from({ length: 6 }, (_, index) => (
                    <span key={index}>{text}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="drive-hero-device">
            <div className="drive-hero-device__top">
              <span />
              <span />
              <span />
            </div>
            <div className="drive-hero-device__screen">
              <img src={motorbikeImage} alt="Xe máy học lái DriveGo" />
              <div>
                <p>DriveGo</p>
                <strong>Luyện thi bằng lái trong một lộ trình rõ ràng</strong>
              </div>
            </div>
          </div>
        </div>
      </UiCard>

      <UiCard variant="panel" padding="sm" className="home-tabs">
        {quickTabs.map((tab) => (
          <a key={tab.href} href={tab.href} className="home-tab-link">
            {tab.label}
          </a>
        ))}
      </UiCard>

      <div>
        <h2 className="mb-8 text-center text-2xl font-bold text-white">{t("pages.home.featuresTitle")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map(({ title, desc }) => (
            <UiCard key={title} variant="panel" as="article" className="home-feature-card">
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-drive-muted">{desc}</p>
            </UiCard>
          ))}
        </div>
      </div>

      <UiCard variant="panel" className="home-plan-card text-center">
        <p className="text-sm font-medium text-white/70">{popularPlan.eyebrow}</p>
        <h3 className="mt-2 text-2xl font-bold text-white">{popularPlan.title}</h3>
        <Link
          to="/pricing"
          className="mt-6 inline-block rounded-drive-pill bg-white px-6 py-3 text-sm font-bold text-black shadow-drive-action transition hover:bg-gray-200"
        >
          {popularPlan.cta || t("common.viewAll")}
        </Link>
      </UiCard>

      <section id="map" className="scroll-mt-24">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <UiCard variant="panel" padding="none" className="overflow-hidden">
            <iframe
              title="Bản đồ trung tâm lái xe Làng Đại Học"
              src={mapEmbedUrl}
              className="h-[320px] w-full border-0 sm:h-[420px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </UiCard>
          <UiCard variant="panel" className="flex flex-col justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase text-drive-action">Bản đồ & khoảng cách</p>
              <h2 className="mt-2 text-2xl font-bold text-white">{CENTER_LOCATION.name}</h2>
              <p className="mt-3 text-sm leading-relaxed text-drive-muted">{CENTER_LOCATION.address}</p>
              <div className="mt-4 rounded-drive border border-drive-border-soft bg-drive-sidebar p-4">
                <p className="text-xs font-semibold uppercase text-drive-placeholder">Khoảng cách từ bạn</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {geoState.distance != null ? `${geoState.distance.toFixed(1)} km` : "Chưa xác định"}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-drive-muted">
                  Khoảng cách trên là ước tính đường thẳng từ vị trí trình duyệt. Mở Google Maps để xem quãng đường đi thực tế.
                </p>
              </div>
              {geoState.error ? <p className="mt-3 text-sm text-drive-danger">{geoState.error}</p> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={locateUser}
                disabled={geoState.loading}
                className="tap-feedback rounded-drive-pill bg-drive-action px-5 py-3 text-sm font-bold text-drive-action-contrast shadow-drive-action disabled:opacity-60"
              >
                {geoState.loading ? "Đang định vị..." : "Bật định vị"}
              </button>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tap-feedback rounded-drive-pill border border-drive-border bg-drive-elevated px-5 py-3 text-center text-sm font-bold text-drive-text"
              >
                Mở chỉ đường
              </a>
            </div>
          </UiCard>
        </div>
      </section>

      <section id="contact" className="scroll-mt-24">
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <UiCard variant="panel" padding="none" className="overflow-hidden">
            <div className="relative aspect-[4/3] bg-drive-elevated">
              <img className="h-full w-full object-cover" src={practiceClassImage} alt="Khu vực học lái DriveGo" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 rounded-drive bg-drive-panel/90 p-4">
                <p className="text-xs font-semibold uppercase text-drive-action">Thông tin liên hệ</p>
                <h2 className="mt-1 text-xl font-bold text-white">{centerInfo.name}</h2>
                <p className="mt-2 text-sm text-drive-muted">
                  {centerInfo.address}
                </p>
                <p className="mt-2 text-xs text-drive-muted">
                  Hotline {centerInfo.phone} · {centerInfo.hours}
                </p>
              </div>
            </div>
          </UiCard>
          <UiCard variant="panel" className="flex flex-col justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase text-drive-action">Liên hệ với chúng tôi</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Cần tư vấn khóa học?</h2>
              <p className="mt-3 text-sm leading-relaxed text-drive-muted">
                Để lại thông tin, đội ngũ DriveGo sẽ hỗ trợ chọn hạng học, cách nộp hồ sơ và lịch học phù hợp.
              </p>
              <div className="mt-4 grid gap-2 rounded-drive border border-drive-border-soft bg-drive-sidebar p-4 text-sm text-drive-muted">
                <p>
                  <span className="font-semibold text-drive-text">Hotline:</span> {centerInfo.phone}
                </p>
                <p>
                  <span className="font-semibold text-drive-text">Email:</span> {centerInfo.email}
                </p>
                <p>
                  <span className="font-semibold text-drive-text">Thanh toán:</span> {centerInfo.bank}
                </p>
              </div>
            </div>
            <form className="grid gap-3 md:grid-cols-2">
              <input className="rounded-drive border border-drive-border bg-drive-elevated px-4 py-3 text-sm text-drive-text outline-none focus:ring-2 focus:ring-drive-accent" placeholder="Họ tên của bạn" />
              <input className="rounded-drive border border-drive-border bg-drive-elevated px-4 py-3 text-sm text-drive-text outline-none focus:ring-2 focus:ring-drive-accent" placeholder="Email của bạn" />
              <input className="rounded-drive border border-drive-border bg-drive-elevated px-4 py-3 text-sm text-drive-text outline-none focus:ring-2 focus:ring-drive-accent md:col-span-2" placeholder="Số điện thoại" />
              <textarea className="min-h-28 rounded-drive border border-drive-border bg-drive-elevated px-4 py-3 text-sm text-drive-text outline-none focus:ring-2 focus:ring-drive-accent md:col-span-2" placeholder="Ghi chú" />
              <button type="button" className="rounded-drive-pill bg-drive-action px-6 py-3 text-sm font-bold text-drive-action-contrast shadow-drive-action">
                Gửi tư vấn
              </button>
            </form>
          </UiCard>
        </div>
      </section>

      <section id="services" className="scroll-mt-24">
        <p className="text-center text-sm font-semibold uppercase text-drive-action">Khóa học đào tạo lái xe</p>
        <h2 className="mt-2 text-center text-3xl font-bold text-white">Các gói dịch vụ</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <UiCard key={service.title} variant="panel" padding="none" as="article" className="overflow-hidden">
              <div className="relative aspect-video bg-drive-elevated">
                <img className="h-full w-full object-cover" src={imageByKey(service.imageKey, bikeYardImage)} alt={service.title} />
                <span className="absolute bottom-4 left-4 rounded-drive-pill bg-drive-action px-4 py-2 text-sm font-bold text-drive-action-contrast">
                  {service.price}
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-white">{service.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-drive-muted">{service.desc}</p>
              </div>
            </UiCard>
          ))}
        </div>
      </section>

      <section id="about" className="scroll-mt-24">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_1fr]">
          <img className="h-full min-h-80 rounded-drive object-cover shadow-drive-card" src={motorbikeRowImage} alt="Dàn xe thực hành DriveGo" />
          <div>
            <p className="text-sm font-semibold uppercase text-drive-action">Về chúng tôi</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Nền tảng học lái xe thông minh cho trung tâm và học viên</h2>
            <p className="mt-4 text-sm leading-relaxed text-drive-muted">
              {centerInfo.name} kết hợp quản lý đào tạo, luyện đề, lịch học, hồ sơ và thanh toán trong một
              trải nghiệm gọn. Học viên biết mình đang ở đâu trong lộ trình; admin nắm được học phí,
              lớp học và tiến độ vận hành.
            </p>
            <div className="mt-6 grid gap-3">
              {["Quy trình học rõ ràng", "Theo dõi tiến độ từng hạng", "Hỗ trợ học viên qua AI và thông báo"].map((item) => (
                <div key={item} className="rounded-drive border border-drive-border-soft bg-drive-sidebar px-4 py-3 text-sm font-medium text-drive-text">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="programs" className="scroll-mt-24">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-drive-action">Lý do chọn chúng tôi</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Các chương trình đào tạo nổi bật</h2>
            <p className="mt-4 text-sm leading-relaxed text-drive-muted">
              Nội dung đào tạo được chia theo hạng bằng và trạng thái học tập, giúp học viên không bị lẫn giữa
              lý thuyết, thi thử, lịch học, hồ sơ và premium.
            </p>
            <ul className="mt-6 space-y-3">
              {programHighlights.map((item) => (
                <li key={item} className="flex gap-3 rounded-drive border border-drive-border-soft bg-drive-panel px-4 py-3 text-sm text-drive-text">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-drive-success" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map(({ title, desc }) => (
              <UiCard key={`program-${title}`} variant="panel" className="home-program-card">
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-drive-muted">{desc}</p>
              </UiCard>
            ))}
          </div>
        </div>
      </section>

      <section id="gallery" className="scroll-mt-24">
        <p className="text-center text-sm font-semibold uppercase text-drive-action">Hình ảnh thực tế</p>
        <h2 className="mt-2 text-center text-3xl font-bold text-white">Không gian học tập và luyện thi</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((item, index) => (
            <img
              key={`${item.imageKey}-${index}`}
              className="aspect-[4/3] rounded-drive border border-drive-border-soft object-cover shadow-drive-card"
              src={imageByKey(item.imageKey, practiceClassImage)}
              alt={item.alt || `Hình ảnh DriveGo ${index + 1}`}
            />
          ))}
        </div>
      </section>

      <section id="news" className="scroll-mt-24">
        <p className="text-center text-sm font-semibold uppercase text-drive-action">Tin tức</p>
        <h2 className="mt-2 text-center text-3xl font-bold text-white">Cập nhật mới cho học viên</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {news.map((item) => (
            <UiCard key={item.title} variant="panel" padding="none" as="article" className="overflow-hidden">
              <img className="aspect-video w-full object-cover" src={imageByKey(item.imageKey, theoryClassImage)} alt={item.title} />
              <div className="p-5">
                <p className="text-xs text-drive-muted">{item.date}</p>
                <h3 className="mt-2 font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-drive-muted">{item.desc}</p>
              </div>
            </UiCard>
          ))}
        </div>
      </section>
    </section>
  )
}
