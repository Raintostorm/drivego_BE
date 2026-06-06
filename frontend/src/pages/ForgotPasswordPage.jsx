import { useState } from "react"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { TextField } from "../components/TextField.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { apiFetch } from "../lib/api.js"
import { t } from "../lib/strings.js"

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setNotice(null)
    try {
      const data = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      })
      setNotice(
        data?.message ??
          "Nếu email tồn tại trong hệ thống, DriveGo đã gửi hướng dẫn đặt lại mật khẩu.",
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi yêu cầu thất bại")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <UiCard padding="lg" className="w-full max-w-[440px]">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">{t("pages.forgotPassword.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-drive-muted">{t("pages.forgotPassword.subtitle")}</p>
      </div>
      {notice ? (
        <p className="mb-4 rounded-drive border border-drive-success/40 bg-drive-success/10 px-4 py-3 text-sm text-drive-success">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-drive border border-drive-danger/40 bg-drive-danger/10 px-4 py-3 text-sm text-drive-danger">
          {error}
        </p>
      ) : null}
      <form className="space-y-5" onSubmit={handleSubmit}>
        <TextField
          id="forgotEmail"
          label={t("pages.forgotPassword.email")}
          type="email"
          placeholder={t("pages.login.emailPlaceholder")}
          icon="✉"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <PrimaryButton type="submit" fullWidth disabled={submitting}>
          {submitting ? "Đang gửi…" : t("pages.forgotPassword.submit")}
        </PrimaryButton>
      </form>
    </UiCard>
  )
}
