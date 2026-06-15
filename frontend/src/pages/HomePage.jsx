import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import motorbikeImage from "../assets/motorbike.png"
import scooterVideo from "../assets/scooter-urban-road.mp4"
import { DitherBackground } from "../components/DitherBackground.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { t } from "../lib/strings.js"
import DecryptedText from "../components/DecryptedText.jsx"

export function HomePage() {
  const heroVideoRef = useRef(null)
  const features = [
    { title: t("pages.home.feature1"), desc: "Video bài giảng và mô phỏng tình huống trên mọi thiết bị." },
    { title: t("pages.home.feature2"), desc: "Ngân hàng 600 câu hỏi và đề thi cập nhật theo quy định mới." },
    { title: t("pages.home.feature3"), desc: "Biểu đồ tiến độ, điểm yếu và gợi ý ôn tập cá nhân hóa." },
    { title: t("pages.home.feature4"), desc: "Mã hóa dữ liệu và xác thực đa lớp cho tài khoản học viên." },
  ]

  useEffect(() => {
    const video = heroVideoRef.current
    if (!video) return
    video.play().catch(() => {
      // The poster remains visible if the browser blocks autoplay.
    })
  }, [])

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
        <p className="text-sm font-medium text-white/70">Gói học phổ biến</p>
        <h3 className="mt-2 text-2xl font-bold text-white">Bằng B2 — từ 15.000.000đ</h3>
        <Link
          to="/pricing"
          className="mt-6 inline-block rounded-drive-pill bg-white px-6 py-3 text-sm font-bold text-black shadow-drive-action transition hover:bg-gray-200"
        >
          {t("common.viewAll")}
        </Link>
      </UiCard>
    </section>
  )
}
