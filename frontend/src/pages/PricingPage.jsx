import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { apiFetch } from "../lib/api.js"
import { t } from "../lib/strings.js"

export function PricingPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  function handleEnroll(code) {
    if (!isAuthenticated) {
      navigate(`/register?class=${encodeURIComponent(code)}`)
      return
    }
    navigate(`/enroll?class=${encodeURIComponent(code)}`)
  }

  useEffect(() => {
    Promise.all([apiFetch("/plans"), apiFetch("/license-classes").catch(() => [])])
      .then(([plansData, catalog]) => {
        const byCode = new Map((catalog ?? []).map((c) => [c.code, c]))
        const merged = (plansData.licenseClasses ?? []).map((p) => ({
          ...p,
          contentReady: byCode.get(p.code)?.contentReady ?? false,
        }))
        setPlans(merged)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="space-y-10">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-white">
          {t("pages.pricing.title")}{" "}
          <span className="text-drive-action">{t("pages.pricing.titleHighlight")}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-drive-muted">{t("pages.pricing.subtitle")}</p>
      </header>

      {loading ? (
        <p className="text-center text-drive-muted">Đang tải bảng giá…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {plans.map((plan) => (
            <UiCard
              key={plan.code}
              variant="panel"
              className={
                plan.featured
                  ? "border-drive-action/50 bg-gradient-to-b from-drive-action/20 to-drive-panel"
                  : ""
              }
            >
              {plan.featured ? (
                <span className="mb-2 inline-block rounded-full bg-drive-action px-2 py-0.5 text-[10px] font-bold uppercase text-drive-action-contrast">
                  {t("pages.pricing.popular")}
                </span>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-white">Bằng {plan.code}</h2>
                {plan.contentReady ? (
                  <span className="rounded-full bg-drive-success/20 px-2 py-0.5 text-[10px] font-semibold text-drive-success">
                    Sẵn sàng
                  </span>
                ) : (
                  <span className="rounded-full bg-drive-border px-2 py-0.5 text-[10px] text-drive-muted">
                    Sắp có
                  </span>
                )}
              </div>
              <p className="mt-2 text-3xl font-bold text-white">
                {plan.enrollmentFee ?? "755.000đ"}
              </p>
              <p className="text-xs text-drive-muted">Phí đăng ký khóa (thử SePay)</p>
              <p className="mt-1 text-sm text-drive-muted line-through opacity-60">
                Giá tham khảo: {plan.price}
              </p>
              <p className="mt-1 text-xs text-drive-muted">{plan.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-drive-muted">
                {plan.features.map((f) => (
                  <li key={f}>
                    <span className="text-drive-success">✓</span> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6 space-y-2">
                <PrimaryButton variant="action" fullWidth onClick={() => handleEnroll(plan.code)}>
                  Đăng ký & thanh toán
                </PrimaryButton>
                <Link
                  to={`/register?class=${encodeURIComponent(plan.code)}`}
                  className="block text-center text-xs text-drive-action hover:underline"
                >
                  {t("common.registerNow")}
                </Link>
              </div>
            </UiCard>
          ))}
        </div>
      )}

      <UiCard variant="panel">
        <h2 className="font-semibold text-white">{t("pages.pricing.consultTitle")}</h2>
        <p className="mt-2 text-drive-muted">{t("pages.pricing.consultSubtitle")}</p>
        <input
          type="tel"
          placeholder="0912 xxx xxx"
          className="mt-4 w-full max-w-md rounded-drive-pill border border-drive-border bg-drive-elevated px-4 py-3 text-drive-text outline-none focus:ring-2 focus:ring-drive-accent"
        />
      </UiCard>
    </section>
  )
}
