import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { HelpCard } from "../components/HelpCard.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { TextField } from "../components/TextField.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { useAuth } from "../context/AuthContext.jsx"
import { apiFetch } from "../lib/api.js"
import {
  formatPremiumDate,
  formatPremiumUntil,
  isPremiumActive,
  premiumDaysRemaining,
} from "../lib/premium.js"
import { t } from "../lib/strings.js"

async function copyText(text) {
  await navigator.clipboard.writeText(text)
}

const PREMIUM_BENEFITS = [
  "pages.upgrade.benefitExam",
  "pages.upgrade.benefitAi",
  "pages.upgrade.benefitTheory",
]

function PremiumMemberView({ user }) {
  const daysLeft = premiumDaysRemaining(user)
  const until = user?.profile?.premiumUntil

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-4xl font-bold text-white">
          {t("pages.upgrade.memberTitle")}{" "}
          <span className="text-drive-success">✓</span>
        </h1>
        <p className="mt-2 text-drive-muted">{t("pages.upgrade.memberSubtitle")}</p>
      </header>

      <UiCard
        variant="panel"
        className="border-drive-success/40 bg-gradient-to-br from-drive-success/15 via-drive-panel to-drive-panel"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <StatusBadge tone="success">{t("pages.upgrade.memberActive")}</StatusBadge>
            <p className="mt-3 text-2xl font-bold text-white">DriveGo Premium</p>
            <p className="mt-2 text-sm text-drive-muted">
              {t("pages.upgrade.validUntil")}{" "}
              <span className="font-medium text-white">{formatPremiumDate(until)}</span>
              <span className="mx-2 text-drive-border">·</span>
              <span className="text-drive-muted">{formatPremiumUntil(until)}</span>
            </p>
            {daysLeft !== null && daysLeft <= 30 ? (
              <p className="mt-2 text-sm font-medium text-amber-300">
                {t("pages.upgrade.daysLeft", { days: String(daysLeft) })}
              </p>
            ) : null}
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-drive-success/50 bg-drive-success/10 text-3xl">
            ★
          </div>
        </div>

        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-drive-muted">
          {t("pages.upgrade.benefitsTitle")}
        </h2>
        <ul className="mt-3 space-y-2">
          {PREMIUM_BENEFITS.map((key) => (
            <li key={key} className="flex items-center gap-2 text-sm text-drive-text">
              <span className="text-drive-success" aria-hidden>
                ✓
              </span>
              {t(key)}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/ai-chat"
            className="rounded-drive-pill bg-drive-action px-6 py-3 text-sm font-bold text-drive-action-contrast shadow-drive-action transition hover:brightness-110"
          >
            {t("pages.upgrade.openAiChat")}
          </Link>
          <Link
            to="/exam"
            className="rounded-drive-pill border border-drive-border bg-drive-elevated px-6 py-3 text-sm font-bold text-white transition hover:bg-drive-panel"
          >
            {t("pages.upgrade.openExam")}
          </Link>
        </div>
      </UiCard>

      <p className="text-center text-xs text-drive-muted">{t("pages.upgrade.renewHint")}</p>
    </section>
  )
}

export function UpgradePage() {
  const { user, refreshUser } = useAuth()
  const [plans, setPlans] = useState({ premium: null, free: null })
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [checkout, setCheckout] = useState(null)
  const [copyHint, setCopyHint] = useState(null)
  const pollRef = useRef(null)

  const premiumActive = isPremiumActive(user)

  useEffect(() => {
    if (premiumActive) {
      setLoading(false)
      return
    }
    apiFetch("/plans")
      .then((data) => {
        const subs = data.subscriptions ?? []
        setPlans({
          free: subs.find((p) => p.code === "free") ?? null,
          premium: subs.find((p) => p.code === "premium") ?? null,
        })
      })
      .finally(() => setLoading(false))
  }, [premiumActive])

  useEffect(() => {
    if (user?.profile?.fullName) setFullName(user.profile.fullName)
    if (user?.email) setEmail(user.email)
  }, [user])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const pollPaymentStatus = useCallback(
    (paymentId) => {
      stopPolling()
      pollRef.current = setInterval(async () => {
        try {
          const status = await apiFetch(`/payments/${paymentId}/status`, { auth: true })
          if (status.status === "paid") {
            stopPolling()
            setCheckout(null)
            setNotice("Thanh toán thành công! Gói Premium đã được kích hoạt.")
            setError(null)
            await refreshUser()
          } else if (status.status === "expired" || status.status === "failed") {
            stopPolling()
            setError("Giao dịch hết hạn hoặc thất bại. Vui lòng tạo đơn mới.")
            setCheckout(null)
          }
        } catch {
          /* ignore transient poll errors */
        }
      }, 3000)
    },
    [refreshUser, stopPolling],
  )

  useEffect(() => () => stopPolling(), [stopPolling])

  async function handleCheckout() {
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const data = await apiFetch("/payments/checkout", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          paymentType: "premium",
          planCode: "premium",
          fullName: fullName.trim(),
          email: email.trim(),
        }),
      })
      setCheckout(data)
      pollPaymentStatus(data.paymentId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được đơn thanh toán")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopy(label, value) {
    try {
      await copyText(value)
      setCopyHint(`Đã copy ${label}`)
      setTimeout(() => setCopyHint(null), 2000)
    } catch {
      setCopyHint("Không copy được — hãy chọn và copy thủ công")
    }
  }

  if (premiumActive) {
    return <PremiumMemberView user={user} />
  }

  const premiumPrice = plans.premium?.priceRaw ?? 5000
  const premiumLabel = plans.premium?.priceMonthly ?? "5.000đ/tháng"

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold text-white">
          {t("pages.upgrade.title")}{" "}
          <span className="text-drive-action">{t("pages.upgrade.titleHighlight")}</span>
        </h1>
        <p className="mt-2 text-drive-muted">{t("pages.upgrade.subtitle")}</p>
      </header>

      <HelpCard
        title="Cách thanh toán Premium"
        items={[
          "Quét QR bằng app ngân hàng hoặc chuyển khoản thủ công theo đúng số tài khoản.",
          "Nội dung chuyển khoản phải khớp mã thanh toán để hệ thống tự nhận giao dịch.",
          "Gói Premium được kích hoạt ngay khi webhook SePay báo thanh toán thành công.",
        ]}
      />

      {notice ? (
        <p className="rounded-drive border border-drive-success/40 bg-drive-success/10 px-4 py-3 text-sm text-drive-success">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-drive border border-drive-danger/40 bg-drive-danger/10 px-4 py-3 text-sm text-drive-danger">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <UiCard variant="panel">
          <p className="text-sm text-drive-muted">{t("pages.upgrade.free")}</p>
          <p className="text-4xl font-bold text-white">
            {loading ? "…" : (plans.free?.priceMonthly ?? "0đ/tháng")}
          </p>
          <ul className="mt-4 space-y-2 text-sm text-drive-muted">
            <li>
              <span className="text-drive-success">✓</span> 10 đề thi cơ bản
            </li>
            <li>
              <span className="text-drive-success">✓</span> Lưu kết quả gần nhất
            </li>
          </ul>
        </UiCard>
        <UiCard
          variant="panel"
          className="border-drive-action/50 bg-gradient-to-b from-drive-action/20 to-drive-panel"
        >
          <p className="text-sm font-medium text-drive-action">{t("pages.upgrade.premium")}</p>
          <p className="text-4xl font-bold text-white">{loading ? "…" : premiumLabel}</p>
          <PrimaryButton
            variant="action"
            className="mt-4"
            disabled={submitting || loading || Boolean(checkout)}
            onClick={handleCheckout}
          >
            {submitting ? "Đang tạo đơn…" : t("pages.upgrade.upgradeNow")}
          </PrimaryButton>
        </UiCard>
      </div>

      {checkout ? (
        <UiCard variant="panel" className="border-drive-action/50 space-y-4">
          <h2 className="text-lg font-semibold text-white">Chuyển khoản SePay</h2>
          <p className="text-sm text-drive-muted">{checkout.instructions}</p>
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
            {checkout.qrImageUrl ? (
              <div className="shrink-0 rounded-drive border border-drive-border bg-white p-3">
                <img
                  src={checkout.qrImageUrl}
                  alt="Mã QR chuyển khoản VietQR"
                  width={240}
                  height={240}
                  className="size-60 object-contain"
                />
                <p className="mt-2 text-center text-xs text-drive-muted">
                  Mở app ngân hàng → Quét QR → Xác nhận chuyển khoản
                </p>
              </div>
            ) : null}
            <div className="min-w-0 flex-1 grid gap-3 sm:grid-cols-2 w-full">
              <div className="rounded-drive border border-drive-border bg-drive-elevated p-3">
                <p className="text-xs text-drive-muted">Ngân hàng</p>
                <p className="font-medium text-white">{checkout.bank.bankName}</p>
              </div>
              <div className="rounded-drive border border-drive-border bg-drive-elevated p-3">
                <p className="text-xs text-drive-muted">Chủ tài khoản</p>
                <p className="font-medium text-white">{checkout.bank.accountHolder}</p>
              </div>
              <div className="rounded-drive border border-drive-border bg-drive-elevated p-3 sm:col-span-2">
                <p className="text-xs text-drive-muted">Số tài khoản</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="font-mono text-lg font-bold text-drive-action">
                    {checkout.bank.accountNumber}
                  </p>
                  <button
                    type="button"
                    className="rounded-drive-pill border border-drive-border px-3 py-1 text-xs text-white hover:bg-drive-panel"
                    onClick={() => handleCopy("số TK", checkout.bank.accountNumber)}
                  >
                    Copy STK
                  </button>
                </div>
              </div>
              <div className="rounded-drive border border-drive-action/40 bg-drive-action/10 p-3 sm:col-span-2">
                <p className="text-xs text-drive-muted">Nội dung chuyển khoản (bắt buộc)</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="font-mono text-xl font-bold text-white">{checkout.paymentCode}</p>
                  <button
                    type="button"
                    className="rounded-drive-pill border border-drive-action px-3 py-1 text-xs font-medium text-white hover:bg-drive-action/20"
                    onClick={() => handleCopy("nội dung", checkout.paymentCode)}
                  >
                    Copy mã
                  </button>
                </div>
              </div>
              <div className="rounded-drive border border-drive-border bg-drive-elevated p-3 sm:col-span-2">
                <p className="text-xs text-drive-muted">Số tiền</p>
                <p className="text-2xl font-bold text-white">
                  {checkout.amount.toLocaleString("vi-VN")}đ
                </p>
              </div>
            </div>
          </div>
          {copyHint ? <p className="text-sm text-drive-success">{copyHint}</p> : null}
          <p className="text-sm text-drive-muted">
            Đang chờ xác nhận từ SePay… Trang sẽ tự cập nhật khi chuyển khoản thành công (hoặc bấm
            “Kiểm tra lại”).
          </p>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton
              variant="action"
              onClick={async () => {
                try {
                  const status = await apiFetch(`/payments/${checkout.paymentId}/status`, {
                    auth: true,
                  })
                  if (status.status === "paid") {
                    setCheckout(null)
                    setNotice("Thanh toán thành công!")
                    await refreshUser()
                  } else {
                    setNotice("Chưa nhận được thanh toán. Kiểm tra đúng số tiền và nội dung CK.")
                  }
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Không kiểm tra được")
                }
              }}
            >
              Kiểm tra lại
            </PrimaryButton>
            <button
              type="button"
              className="rounded-drive-pill border border-drive-border px-4 py-2 text-sm text-drive-muted hover:text-white"
              onClick={() => {
                stopPolling()
                setCheckout(null)
              }}
            >
              Hủy đơn chờ
            </button>
          </div>
        </UiCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <UiCard variant="panel">
          <h2 className="font-semibold text-white">Thông tin khách hàng</h2>
          <form className="mt-4 space-y-3" onSubmit={(e) => e.preventDefault()}>
            <TextField
              id="custName"
              label="Họ và tên"
              placeholder="Nguyễn Văn A"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <TextField
              id="custEmail"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </form>
        </UiCard>
        <UiCard variant="panel">
          <h2 className="font-semibold text-white">{t("pages.upgrade.paymentTitle")}</h2>
          <div className="mt-4 rounded-drive border border-drive-action bg-drive-action/10 p-3 text-sm text-drive-text">
            Bấm thanh toán để hiện mã QR VietQR — quét bằng app ngân hàng, hệ thống tự xác nhận
            sau khi chuyển khoản thành công.
          </div>
          <p className="mt-6 text-2xl font-bold text-white">
            {premiumPrice.toLocaleString("vi-VN")}đ
          </p>
          <PrimaryButton
            variant="action"
            fullWidth
            className="mt-4"
            disabled={submitting || loading || Boolean(checkout)}
            onClick={handleCheckout}
          >
            {submitting ? "Đang tạo đơn…" : t("pages.upgrade.paySecure")}
          </PrimaryButton>
        </UiCard>
      </div>
    </section>
  )
}
