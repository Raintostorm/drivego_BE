import { useState } from "react"
import { t } from "../lib/strings.js"
import { isFirebaseConfigured, signInWithGooglePopup } from "../lib/firebase.js"

/**
 * @param {{ onGoogleSuccess?: (idToken: string) => Promise<void>, disabled?: boolean }} props
 */
export function SocialAuthButtons({ onGoogleSuccess, disabled = false }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const googleEnabled = isFirebaseConfigured() && Boolean(onGoogleSuccess)

  async function handleGoogle() {
    if (!onGoogleSuccess) return
    setError(null)
    setLoading(true)
    try {
      const idToken = await signInWithGooglePopup()
      await onGoogleSuccess(idToken)
    } catch (err) {
      const code = err?.code
      if (code === "auth/popup-closed-by-user") {
        setError(null)
      } else if (code === "auth/unauthorized-domain") {
        setError("Domain hiện tại chưa được bật trong Firebase Authentication.")
      } else if (code === "auth/popup-blocked") {
        setError("Trình duyệt đang chặn popup đăng nhập Google.")
      } else if (code === "auth/cancelled-popup-request") {
        setError(null)
      } else {
        setError("Đăng nhập Google thất bại. Vui lòng thử lại.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-4 py-4">
        <div className="h-px flex-1 bg-drive-border" />
        <span className="text-xs font-medium uppercase tracking-wider text-drive-muted">
          {t("pages.login.orContinue")}
        </span>
        <div className="h-px flex-1 bg-drive-border" />
      </div>
      {error ? <p className="mb-3 text-sm text-drive-danger">{error}</p> : null}
      <button
        type="button"
        disabled={disabled || loading || !googleEnabled}
        onClick={handleGoogle}
        title={googleEnabled ? "Đăng nhập bằng Google" : "Chưa cấu hình Firebase trên frontend/.env"}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-drive-border bg-drive-elevated text-sm font-medium text-white transition hover:bg-drive-panel disabled:cursor-not-allowed disabled:opacity-50"
      >
        <img src="/images/login/google.svg" alt="" className="size-5" width={20} height={20} />
        {loading ? "Đang kết nối Google…" : "Google"}
      </button>
    </>
  )
}
