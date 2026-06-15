import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { SocialAuthButtons } from "../components/SocialAuthButtons.jsx"
import { TextField } from "../components/TextField.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { dashboardPathForRole, useAuth } from "../context/AuthContext.jsx"
import { apiFetch } from "../lib/api.js"
import { DEFAULT_LICENSE_CLASS, isStudyLicenseCode } from "../lib/license-classes.js"
import { t } from "../lib/strings.js"

export function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { register, loginWithGoogle } = useAuth()
  const [catalog, setCatalog] = useState([])
  const [licenseClass, setLicenseClass] = useState(DEFAULT_LICENSE_CLASS)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const prefill = searchParams.get("class")
    if (prefill && isStudyLicenseCode(prefill)) setLicenseClass(prefill)
  }, [searchParams])

  useEffect(() => {
    apiFetch("/license-classes")
      .then((data) => setCatalog(Array.isArray(data) ? data : []))
      .catch(() => setCatalog([]))
  }, [])

  async function handleGoogleSuccess(idToken) {
    setError(null)
    setSubmitting(true)
    try {
      const user = await loginWithGoogle(idToken)
      navigate(dashboardPathForRole(user.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký Google thất bại")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp")
      return
    }

    if (password.length < 8) {
      setError("Mật khẩu tối thiểu 8 ký tự")
      return
    }

    setSubmitting(true)
    try {
      const user = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        licenseClass,
      })
      navigate(dashboardPathForRole(user.role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <UiCard padding="lg" className="w-full max-w-[440px]">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">{t("pages.register.title")}</h1>
        <p className="mt-2 text-sm text-drive-muted">{t("pages.register.subtitle")}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 rounded-drive-pill border border-drive-border bg-drive-elevated p-1 text-center text-sm">
        <button type="button" className="rounded-drive-pill bg-drive-accent py-2.5 font-bold text-drive-accent-contrast">
          {t("pages.register.tabStudent")}
        </button>
        <Link
          to="/center-register"
          className="flex items-center justify-center rounded-drive-pill py-2.5 font-medium text-drive-muted hover:text-white"
        >
          {t("pages.register.tabCenter")}
        </Link>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <p className="rounded-drive border border-drive-danger/40 bg-drive-danger/10 px-4 py-3 text-sm text-drive-danger">
            {error}
          </p>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-medium text-drive-text">{t("license.registerChoose")}</p>
          <div className="grid grid-cols-2 gap-2">
            {(catalog.length ? catalog : [{ code: "B2", contentReady: true }]).map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLicenseClass(item.code)}
                className={`rounded-drive border px-3 py-2 text-left text-sm transition ${
                  licenseClass === item.code
                    ? "border-drive-action bg-drive-action/15 text-drive-text"
                    : "border-drive-border text-drive-muted hover:border-drive-action/40"
                }`}
              >
                <span className="font-semibold">{item.code}</span>
                {item.contentReady ? (
                  <span className="block text-[10px] text-drive-success">{t("license.ready")}</span>
                ) : (
                  <span className="block text-[10px] text-amber-300/80">{t("license.comingSoon")}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <TextField
          id="fullName"
          label={t("pages.register.fullName")}
          placeholder="Nguyễn Văn A"
          icon="👤"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
        />
        <TextField
          id="email"
          label={t("pages.register.email")}
          type="email"
          placeholder={t("pages.login.emailPlaceholder")}
          icon="✉"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <TextField
          id="password"
          label={t("pages.register.password")}
          type="password"
          placeholder="Tối thiểu 8 ký tự"
          icon="🔒"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <TextField
          id="confirmPassword"
          label={t("pages.register.confirmPassword")}
          type="password"
          placeholder="Nhập lại mật khẩu"
          icon="🔒"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <PrimaryButton type="submit" fullWidth disabled={submitting}>
          {submitting ? "Đang đăng ký…" : t("pages.register.submit")}
        </PrimaryButton>
        <SocialAuthButtons onGoogleSuccess={handleGoogleSuccess} disabled={submitting} />
      </form>
    </UiCard>
  )
}
