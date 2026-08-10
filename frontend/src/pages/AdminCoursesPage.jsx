import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { useAuth } from "../context/AuthContext.jsx"
import {
  fetchAdminPricing,
  patchAdminLicenseClass,
  patchAdminSubscriptionPlan,
} from "../lib/admin-api.js"

function asMoneyInput(value) {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? String(Math.round(n)) : "0"
}

export function AdminCoursesPage() {
  const { user } = useAuth()
  const readOnly = user?.role === "center_admin"
  const [rows, setRows] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [draftFees, setDraftFees] = useState({})
  const [draftPlans, setDraftPlans] = useState({})
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    fetchAdminPricing()
      .then((data) => {
        const licenseClasses = data.licenseClasses ?? []
        const subscriptionPlans = data.subscriptionPlans ?? []
        setRows(licenseClasses)
        setSubscriptions(subscriptionPlans)
        setDraftFees(
          Object.fromEntries(
            licenseClasses.map((lc) => [lc.code, asMoneyInput(lc.enrollmentFee ?? lc.price)]),
          ),
        )
        setDraftPlans(
          Object.fromEntries(
            subscriptionPlans.map((plan) => [plan.code, asMoneyInput(plan.priceMonthly)]),
          ),
        )
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"))
  }, [])

  async function saveLicenseFee(code) {
    setSaving(`license:${code}`)
    setError(null)
    setNotice(null)
    try {
      const fee = Number(draftFees[code])
      if (!Number.isFinite(fee) || fee < 0) throw new Error("Học phí không hợp lệ")
      const updated = await patchAdminLicenseClass(code, { enrollmentFee: fee })
      setRows((prev) => prev.map((row) => (row.code === code ? { ...row, ...updated } : row)))
      setNotice(`Đã cập nhật học phí hạng ${code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được học phí")
    } finally {
      setSaving(null)
    }
  }

  async function saveSubscription(code) {
    setSaving(`plan:${code}`)
    setError(null)
    setNotice(null)
    try {
      const priceMonthly = Number(draftPlans[code])
      if (!Number.isFinite(priceMonthly) || priceMonthly < 0) throw new Error("Giá premium không hợp lệ")
      const updated = await patchAdminSubscriptionPlan(code, { priceMonthly })
      setSubscriptions((prev) => prev.map((row) => (row.code === code ? { ...row, ...updated } : row)))
      setNotice(`Đã cập nhật gói ${code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được gói premium")
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Khóa học theo hạng"
        subtitle={readOnly ? "Chế độ xem — chỉnh sửa do quản trị hệ thống" : "Chỉnh học phí và chương học"}
      />
      {error ? <p className="text-drive-danger">{error}</p> : null}
      {notice ? <p className="text-drive-success">{notice}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((lc) => (
          <UiCard key={lc.code} variant="panel">
            <h2 className="text-lg font-semibold text-white">Hạng {lc.code}</h2>
            <p className="mt-1 text-sm text-drive-muted">{lc.description ?? ""}</p>
            <p className="mt-2 text-sm text-white">
              Học phí: {Number(lc.enrollmentFee ?? lc.price ?? 0).toLocaleString("vi-VN")}đ
            </p>
            {!readOnly ? (
              <div className="mt-4 space-y-2">
                <label className="text-xs font-medium text-drive-muted" htmlFor={`fee-${lc.code}`}>
                  Học phí cần đóng
                </label>
                <div className="flex gap-2">
                  <input
                    id={`fee-${lc.code}`}
                    type="number"
                    min="0"
                    step="1000"
                    value={draftFees[lc.code] ?? ""}
                    onChange={(e) => setDraftFees((prev) => ({ ...prev, [lc.code]: e.target.value }))}
                    className="min-w-0 flex-1 rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-sm text-drive-text"
                  />
                  <button
                    type="button"
                    disabled={saving === `license:${lc.code}`}
                    onClick={() => saveLicenseFee(lc.code)}
                    className="rounded-drive bg-drive-action px-3 py-2 text-sm font-semibold text-drive-action-contrast disabled:opacity-60"
                  >
                    {saving === `license:${lc.code}` ? "Đang lưu" : "Lưu"}
                  </button>
                </div>
              </div>
            ) : null}
            <Link
              to={`/admin/courses/${lc.code}/chapters`}
              className="mt-4 inline-block text-sm text-drive-action hover:underline"
            >
              {readOnly ? "Xem chương →" : "Sửa chương →"}
            </Link>
          </UiCard>
        ))}
      </div>
      <UiCard variant="panel">
        <h2 className="text-lg font-semibold text-white">Gói Premium</h2>
        <p className="mt-1 text-sm text-drive-muted">Giá mở Premium một lần, sử dụng vĩnh viễn.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subscriptions.map((plan) => (
            <div key={plan.code} className="rounded-drive border border-drive-border bg-drive-elevated p-4">
              <p className="text-sm font-semibold text-white">{plan.code}</p>
              <p className="mt-1 text-sm text-drive-muted">
                Hiện tại: {Number(plan.priceMonthly ?? 0).toLocaleString("vi-VN")}đ một lần
              </p>
              {!readOnly ? (
                <div className="mt-3 flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={draftPlans[plan.code] ?? ""}
                    onChange={(e) => setDraftPlans((prev) => ({ ...prev, [plan.code]: e.target.value }))}
                    className="min-w-0 flex-1 rounded-drive border border-drive-border bg-drive-panel px-3 py-2 text-sm text-drive-text"
                  />
                  <button
                    type="button"
                    disabled={saving === `plan:${plan.code}`}
                    onClick={() => saveSubscription(plan.code)}
                    className="rounded-drive bg-drive-action px-3 py-2 text-sm font-semibold text-drive-action-contrast disabled:opacity-60"
                  >
                    {saving === `plan:${plan.code}` ? "Đang lưu" : "Lưu"}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </UiCard>
    </section>
  )
}
