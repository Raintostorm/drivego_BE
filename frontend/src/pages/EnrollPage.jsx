import { useCallback, useEffect, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { HelpCard } from "../components/HelpCard.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { TextField } from "../components/TextField.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { useAuth } from "../context/AuthContext.jsx"
import { useLicense } from "../context/LicenseContext.jsx"
import { apiFetch } from "../lib/api.js"
import { DEFAULT_LICENSE_CLASS, isStudyLicenseCode } from "../lib/license-classes.js"

async function copyText(text) {
  await navigator.clipboard.writeText(text)
}

export function EnrollPage() {
  const [searchParams] = useSearchParams()
  const classParam = searchParams.get("class")
  const licenseClass =
    classParam && isStudyLicenseCode(classParam) ? classParam : DEFAULT_LICENSE_CLASS

  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const { refreshEnrollments, isEnrolled, setActiveClass } = useLicense()
  const [fullName, setFullName] = useState(user?.profile?.fullName ?? "")
  const [email, setEmail] = useState(user?.email ?? "")
  const [checkout, setCheckout] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const pollRef = useRef(null)

  const enrolled = isEnrolled(licenseClass)

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
            setNotice("Thanh toán thành công — chuyển sang học lý thuyết…")
            await refreshEnrollments()
            await refreshUser()
            setCheckout(null)
            try {
              await setActiveClass(licenseClass)
            } catch {
              /* profile update optional */
            }
            navigate("/theory", { replace: true })
          }
        } catch {
          /* ignore poll errors */
        }
      }, 4000)
    },
    [licenseClass, navigate, refreshEnrollments, refreshUser, setActiveClass, stopPolling],
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
          paymentType: "enrollment",
          licenseClass,
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
      setNotice(`Đã sao chép ${label}`)
    } catch {
      setError("Không sao chép được")
    }
  }

  if (enrolled) {
    return (
      <section className="space-y-6">
        <UiCard variant="panel" className="text-center">
          <h1 className="text-2xl font-bold text-white">Đã đăng ký khóa {licenseClass}</h1>
          <p className="mt-2 text-sm text-drive-muted">Bạn có thể học lý thuyết và làm bài thi thử.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/theory"
              className="rounded-drive-pill bg-drive-action px-6 py-3 text-sm font-bold text-drive-action-contrast shadow-drive-action transition hover:brightness-110"
            >
              Học lý thuyết
            </Link>
            <Link
              to="/exam"
              className="rounded-drive-pill border border-drive-border bg-drive-elevated px-6 py-3 text-sm font-bold text-white transition hover:bg-drive-panel"
            >
              Thi thử
            </Link>
          </div>
        </UiCard>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-white">
          Đăng ký khóa <span className="text-drive-action">{licenseClass}</span>
        </h1>
        <p className="mt-2 text-drive-muted">
          Phí đăng ký thử nghiệm ~5.000đ (SePay). Sau khi thanh toán, mở khóa học và thi thử.
        </p>
      </header>

      <HelpCard
        title="Quy trình đăng ký khóa"
        items={[
          "Tạo mã thanh toán, chuyển khoản đúng số tiền và đúng nội dung hệ thống cung cấp.",
          "Sau khi SePay xác nhận, khóa học sẽ tự mở cho hạng bằng bạn chọn.",
          "Nếu đã chuyển khoản nhưng chưa cập nhật, chờ vài giây rồi bấm kiểm tra lại.",
        ]}
      />

      {notice ? <p className="text-sm text-drive-success">{notice}</p> : null}
      {error ? <p className="text-sm text-drive-danger">{error}</p> : null}

      {!checkout ? (
        <UiCard variant="panel">
          <TextField
            label="Họ và tên"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <TextField
            label="Email"
            type="email"
            className="mt-4"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <PrimaryButton
            variant="action"
            className="mt-6"
            disabled={submitting || loading}
            onClick={handleCheckout}
          >
            Tạo mã thanh toán SePay
          </PrimaryButton>
        </UiCard>
      ) : (
        <UiCard variant="panel">
          <p className="text-sm text-drive-muted">{checkout.instructions}</p>
          {checkout.qrImageUrl ? (
            <img
              src={checkout.qrImageUrl}
              alt="QR SePay"
              className="mx-auto mt-4 max-h-64 rounded-drive"
            />
          ) : null}
          <div className="mt-4 space-y-2 text-sm">
            <p>
              Số TK:{" "}
              <button
                type="button"
                className="font-mono text-white underline"
                onClick={() => handleCopy("số TK", checkout.bank.accountNumber)}
              >
                {checkout.bank.accountNumber}
              </button>
            </p>
            <p>
              Nội dung CK:{" "}
              <button
                type="button"
                className="font-mono font-bold text-white underline"
                onClick={() => handleCopy("nội dung", checkout.paymentCode)}
              >
                {checkout.paymentCode}
              </button>
            </p>
            <p className="text-lg font-bold text-white">
              {checkout.amount.toLocaleString("vi-VN")}đ
            </p>
          </div>
          <PrimaryButton
            variant="outline"
            className="mt-4"
            disabled={loading}
            onClick={async () => {
              setLoading(true)
              try {
                const status = await apiFetch(`/payments/${checkout.paymentId}/status`, {
                  auth: true,
                })
                if (status.status === "paid") {
                  await refreshEnrollments()
                  await refreshUser()
                  setCheckout(null)
                  try {
                    await setActiveClass(licenseClass)
                  } catch {
                    /* ignore */
                  }
                  navigate("/theory", { replace: true })
                } else {
                  setNotice("Chưa nhận được thanh toán — thử lại sau vài giây.")
                }
              } catch (e) {
                setError(e instanceof Error ? e.message : "Lỗi")
              } finally {
                setLoading(false)
              }
            }}
          >
            Tôi đã chuyển khoản
          </PrimaryButton>
        </UiCard>
      )}
    </section>
  )
}
