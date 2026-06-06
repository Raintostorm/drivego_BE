import { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { TextField } from "../components/TextField.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { apiFetch } from "../lib/api.js"

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    if (!token) {
      setError("Link đặt lại mật khẩu không hợp lệ.")
      return
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.")
      return
    }

    setSubmitting(true)
    try {
      const data = await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      })
      setNotice(data?.message ?? "Đặt lại mật khẩu thành công.")
      setPassword("")
      setConfirmPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đặt lại mật khẩu thất bại")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <UiCard padding="lg" className="w-full max-w-[440px]">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Đặt lại mật khẩu</h1>
        <p className="mt-2 text-sm leading-relaxed text-drive-muted">
          Tạo mật khẩu mới cho tài khoản DriveGo của bạn.
        </p>
      </div>
      {notice ? (
        <p className="mb-4 rounded-drive border border-drive-success/40 bg-drive-success/10 px-4 py-3 text-sm text-drive-success">
          {notice}{" "}
          <Link to="/login" className="font-bold underline">
            Đăng nhập
          </Link>
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-drive border border-drive-danger/40 bg-drive-danger/10 px-4 py-3 text-sm text-drive-danger">
          {error}
        </p>
      ) : null}
      <form className="space-y-5" onSubmit={handleSubmit}>
        <TextField
          id="resetPassword"
          label="Mật khẩu mới"
          type="password"
          placeholder="Tối thiểu 8 ký tự"
          icon="🔒"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <TextField
          id="resetConfirmPassword"
          label="Xác nhận mật khẩu"
          type="password"
          placeholder="Nhập lại mật khẩu mới"
          icon="🔒"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
        <PrimaryButton type="submit" fullWidth disabled={submitting}>
          {submitting ? "Đang lưu…" : "Lưu mật khẩu mới"}
        </PrimaryButton>
      </form>
    </UiCard>
  )
}
