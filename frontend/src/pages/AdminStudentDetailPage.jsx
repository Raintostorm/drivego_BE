import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { TextField } from "../components/TextField.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { fetchAdminStudent, patchAdminStudentNote, unlockAdminStudentCourse } from "../lib/admin-api.js"
import { formatPremiumDate } from "../lib/premium.js"
import { displayLicenseClass } from "../lib/license-class.js"

const TABS = [
  { id: "info", label: "Thông tin" },
  { id: "courses", label: "Khóa học" },
  { id: "exams", label: "Thi thử" },
  { id: "application", label: "Hồ sơ" },
]

const LICENSE_OPTIONS = ["A1", "A2", "B1", "B2"]

function formatMoney(value) {
  return Number(value ?? 0).toLocaleString("vi-VN")
}

function formatDateTime(value) {
  if (!value) return "—"
  return new Date(value).toLocaleString("vi-VN")
}

function paymentTone(payment) {
  if (!payment) return "neutral"
  if (payment.status === "pending") return "warning"
  if (payment.status !== "paid") return "danger"
  if (payment.method === "direct") return "warning"
  if (payment.sepayTransactionId) return "success"
  if (payment.method === "seed") return "neutral"
  return "success"
}

function paymentLabel(payment) {
  if (!payment) return "Chưa có payment"
  if (payment.status === "pending") return "Chờ thanh toán"
  if (payment.status !== "paid") return payment.status
  if (payment.method === "direct") return "Đóng trực tiếp"
  if (payment.sepayTransactionId && payment.importedFrom) return "SePay Excel"
  if (payment.sepayTransactionId) return "SePay thật"
  if (payment.method === "seed") return "Seed demo"
  return payment.method || "Đã thanh toán"
}

export function AdminStudentDetailPage() {
  const { userId } = useParams()
  const [data, setData] = useState(null)
  const [tab, setTab] = useState("info")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [unlockClass, setUnlockClass] = useState("A1")
  const [unlockNote, setUnlockNote] = useState("Đã thu tiền trực tiếp tại trung tâm.")
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    fetchAdminStudent(userId)
      .then((d) => {
        setData(d)
        setNote(d.adminNote ?? "")
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"))
  }, [userId])

  async function saveNote() {
    setSaving(true)
    try {
      const updated = await patchAdminStudentNote(userId, note)
      setData(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi lưu")
    } finally {
      setSaving(false)
    }
  }

  async function handleUnlockCourse() {
    const ok = window.confirm(`Mở khóa học hạng ${displayLicenseClass(unlockClass)} cho ${data.fullName || data.email}?`)
    if (!ok) return
    setUnlocking(true)
    setError(null)
    setNotice(null)
    try {
      const updated = await unlockAdminStudentCourse(userId, {
        licenseClass: unlockClass,
        note: unlockNote,
      })
      setData(updated)
      setNotice(`Đã mở khóa học hạng ${displayLicenseClass(unlockClass)} và ghi nhận thanh toán trực tiếp.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không mở khóa được")
    } finally {
      setUnlocking(false)
    }
  }

  if (error && !data) {
    return (
      <section>
        <PageHeader title="Học viên" />
        <p className="text-drive-danger">{error}</p>
        <Link to="/admin/students" className="text-drive-action">
          ← Danh sách
        </Link>
      </section>
    )
  }

  if (!data) {
    return (
      <section>
        <PageHeader title="Học viên" />
        <p className="text-drive-muted">Đang tải…</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={data.fullName || data.email}
        subtitle={data.email}
        actions={
          <Link to="/admin/students" className="text-sm text-drive-action hover:underline">
            ← Danh sách
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-drive-pill px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? "bg-drive-action text-drive-action-contrast"
                : "border border-drive-border text-drive-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice ? <p className="rounded-drive border border-drive-success/40 bg-drive-success/10 px-4 py-3 text-sm text-drive-success">{notice}</p> : null}
      {error ? <p className="rounded-drive border border-drive-danger/40 bg-drive-danger/10 px-4 py-3 text-sm text-drive-danger">{error}</p> : null}

      {tab === "info" ? (
        <UiCard variant="panel">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-drive-muted">Hạng</dt>
              <dd className="text-white">{displayLicenseClass(data.licenseClass) || "—"}</dd>
            </div>
            <div>
              <dt className="text-drive-muted">Premium</dt>
              <dd className="text-white">
                {data.premiumUntil
                  ? formatPremiumDate(data.premiumUntil)
                  : "Chưa có"}
              </dd>
            </div>
            <div>
              <dt className="text-drive-muted">Điện thoại</dt>
              <dd className="text-white">{data.phone ?? "—"}</dd>
            </div>
          </dl>
          <div className="mt-6">
            <TextField
              label="Ghi chú nội bộ (center)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <PrimaryButton className="mt-3" disabled={saving} onClick={saveNote}>
              {saving ? "Đang lưu…" : "Lưu ghi chú"}
            </PrimaryButton>
          </div>
        </UiCard>
      ) : null}

      {tab === "courses" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <UiCard variant="panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-white">Khóa đã mở</h2>
                <p className="mt-1 text-sm text-drive-muted">Các hạng học viên có thể học và làm đề.</p>
              </div>
              <StatusBadge tone={data.enrollments?.some((e) => e.status === "active") ? "success" : "neutral"}>
                {data.enrollments?.filter((e) => e.status === "active").length ?? 0} active
              </StatusBadge>
            </div>
            {data.enrollments?.length ? (
              <ul className="mt-4 space-y-2 text-sm">
                {data.enrollments.map((e) => (
                  <li key={e.id ?? e.licenseClass} className="rounded-drive border border-drive-border-soft bg-drive-sidebar p-3 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">Hạng {displayLicenseClass(e.licenseClass)}</span>
                      <StatusBadge tone={e.status === "active" ? "success" : "warning"}>{e.status ?? "active"}</StatusBadge>
                    </div>
                    <p className="mt-1 text-xs text-drive-muted">Mở: {formatDateTime(e.enrolledAt)}</p>
                    {e.payment ? (
                      <div className="mt-3 rounded-drive border border-drive-border-soft bg-drive-elevated/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <StatusBadge tone={paymentTone(e.payment)}>{paymentLabel(e.payment)}</StatusBadge>
                          <span className="text-xs font-semibold text-drive-text">{formatMoney(e.payment.amount)}đ</span>
                        </div>
                        <dl className="mt-2 grid gap-1 text-xs text-drive-muted sm:grid-cols-2">
                          <div><dt>Mã thanh toán</dt><dd className="break-all text-drive-text">{e.payment.paymentCode || "—"}</dd></div>
                          <div><dt>SePay transaction</dt><dd className="break-all text-drive-text">{e.payment.sepayTransactionId || "—"}</dd></div>
                          <div><dt>Mã tham chiếu</dt><dd className="break-all text-drive-text">{e.payment.sepayReferenceCode || "—"}</dd></div>
                          <div><dt>Nguồn</dt><dd className="break-all text-drive-text">{e.payment.importedFrom || e.payment.sourceType || e.payment.source || e.payment.method || "—"}</dd></div>
                        </dl>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-drive-muted">Chưa có đăng ký khóa.</p>
            )}
          </UiCard>

          <UiCard variant="panel">
            <h2 className="font-semibold text-white">Mở khóa học</h2>
            <p className="mt-1 text-sm text-drive-muted">Dùng khi học viên đã đóng tiền trực tiếp tại trung tâm.</p>
            <label className="mt-4 block text-sm text-drive-text">
              Hạng cần mở
              <select value={unlockClass} onChange={(e) => setUnlockClass(e.target.value)} className="mt-2 min-h-12 w-full rounded-drive border border-drive-border bg-drive-elevated px-3 text-drive-text">
                {LICENSE_OPTIONS.map((code) => <option key={code} value={code}>{displayLicenseClass(code)}</option>)}
              </select>
            </label>
            <TextField className="mt-3" label="Ghi chú thanh toán" value={unlockNote} onChange={(e) => setUnlockNote(e.target.value)} />
            <PrimaryButton className="mt-4 w-full" disabled={unlocking} onClick={handleUnlockCourse}>
              {unlocking ? "Đang mở…" : "Mở khóa học"}
            </PrimaryButton>
            <p className="mt-3 text-xs text-drive-muted">Hệ thống sẽ tự tạo một payment đã thanh toán bằng phương thức trực tiếp để dashboard vẫn có dòng tiền.</p>
          </UiCard>
        </div>
      ) : null}

      {tab === "exams" ? (
        <UiCard variant="panel">
          {data.recentAttempts?.length ? (
            <>
            <div className="grid gap-2 md:hidden">
              {data.recentAttempts.map((a) => <article key={a.id} className="flex items-center justify-between gap-3 rounded-drive border border-drive-border-soft bg-drive-sidebar p-3"><div><p className="text-xs text-drive-muted">Điểm</p><p className="text-xl font-bold text-drive-text">{a.score ?? "—"}</p><p className="mt-1 text-xs text-drive-muted">{a.finishedAt ? new Date(a.finishedAt).toLocaleString("vi-VN") : "Chưa hoàn tất"}</p></div><StatusBadge tone={a.passed ? "success" : "danger"}>{a.passed ? "Đạt" : "Chưa đạt"}</StatusBadge></article>)}
            </div>
            <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[640px] w-full text-sm">
              <thead>
                <tr className="text-drive-muted">
                  <th className="py-2 text-left">Điểm</th>
                  <th className="py-2 text-left">Kết quả</th>
                  <th className="py-2 text-left">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {data.recentAttempts.map((a) => (
                  <tr key={a.id} className="border-t border-drive-border-soft">
                    <td className="py-2 text-white">{a.score ?? "—"}</td>
                    <td className="py-2">
                      {a.passed ? (
                        <StatusBadge tone="success">Đạt</StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral">—</StatusBadge>
                      )}
                    </td>
                    <td className="py-2 text-drive-muted">
                      {a.finishedAt
                        ? new Date(a.finishedAt).toLocaleString("vi-VN")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            </>
          ) : (
            <p className="text-drive-muted">Chưa có lượt thi.</p>
          )}
        </UiCard>
      ) : null}

      {tab === "application" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <UiCard variant="panel">
          <h2 className="font-semibold text-white">Hồ sơ sát hạch</h2>
          {data.application ? (
            <>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-drive-muted">Hạng</dt><dd className="text-white">{displayLicenseClass(data.application.licenseClass)}</dd></div>
                <div><dt className="text-drive-muted">Trạng thái</dt><dd><StatusBadge tone={data.application.status === "approved" ? "success" : data.application.status === "rejected" ? "danger" : "warning"}>{data.application.status}</StatusBadge></dd></div>
                <div><dt className="text-drive-muted">Ngày nộp</dt><dd className="text-white">{formatDateTime(data.application.submittedAt)}</dd></div>
                <div><dt className="text-drive-muted">Hạn bổ sung</dt><dd className="text-white">{formatDateTime(data.application.dossierDeadline)}</dd></div>
              </dl>
              {data.application.adminNote ? <p className="mt-4 rounded-drive border border-drive-border-soft bg-drive-sidebar p-3 text-sm text-drive-muted">{data.application.adminNote}</p> : null}
              <Link
                to={`/admin/applications/${data.application.id}`}
                className="mt-3 inline-block text-drive-action hover:underline"
              >
                Mở hồ sơ admin →
              </Link>
            </>
          ) : (
            <p className="text-drive-muted">Chưa có hồ sơ sát hạch.</p>
          )}
        </UiCard>
        <UiCard variant="panel">
          <h2 className="font-semibold text-white">Tiền & thanh toán</h2>
          {data.payments?.length ? (
            <ul className="mt-4 space-y-2">
              {data.payments.map((payment) => (
                <li key={payment.id} className="rounded-drive border border-drive-border-soft bg-drive-sidebar p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{payment.paymentType === "enrollment" ? `Khóa ${displayLicenseClass(payment.licenseClass)}` : "Premium"}</p>
                      <p className="mt-1 text-xs text-drive-muted">{paymentLabel(payment)} · {formatDateTime(payment.paidAt || payment.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{formatMoney(payment.amount)}đ</p>
                      <StatusBadge tone={paymentTone(payment)}>{payment.status}</StatusBadge>
                    </div>
                  </div>
                  <dl className="mt-3 grid gap-2 text-xs text-drive-muted sm:grid-cols-2">
                    <div><dt>Mã thanh toán</dt><dd className="break-all text-drive-text">{payment.paymentCode || "—"}</dd></div>
                    <div><dt>SePay transaction</dt><dd className="break-all text-drive-text">{payment.sepayTransactionId || "—"}</dd></div>
                    <div><dt>Mã tham chiếu</dt><dd className="break-all text-drive-text">{payment.sepayReferenceCode || "—"}</dd></div>
                    <div><dt>Nguồn</dt><dd className="break-all text-drive-text">{payment.importedFrom || payment.sourceType || payment.source || payment.method || "—"}</dd></div>
                  </dl>
                  {payment.note ? <p className="mt-2 text-xs text-drive-muted">{payment.note}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-drive-muted">Chưa có giao dịch.</p>
          )}
        </UiCard>
        </div>
      ) : null}
    </section>
  )
}
