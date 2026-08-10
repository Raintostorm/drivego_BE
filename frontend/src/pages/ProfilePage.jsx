import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { TextField } from "../components/TextField.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { StudentLicensesCard } from "../components/StudentLicensesCard.jsx"
import { displayLicenseClass } from "../lib/license-class.js"
import { useAuth } from "../context/AuthContext.jsx"
import { apiFetch } from "../lib/api.js"
import { formatPremiumDate, formatPremiumUntil, isLifetimePremium, isPremiumActive } from "../lib/premium.js"
import { t } from "../lib/strings.js"

const LICENSE_OPTIONS = ["A1", "A2", "B1", "B2", "C", "D", "E", "F"]

const APP_STATUS_LABEL = {
  draft: "Nháp — chưa nộp",
  submitted: "Đã nộp — chờ xử lý",
  reviewing: "Đang duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const premium = isPremiumActive(user)
  const lifetime = isLifetimePremium(user)
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [targetClass, setTargetClass] = useState("B2")
  const [heldLicenses, setHeldLicenses] = useState([])
  const [centers, setCenters] = useState([])
  const [centerId, setCenterId] = useState("")
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)
  const [appStatus, setAppStatus] = useState(null)
  const [examEligible, setExamEligible] = useState(false)

  useEffect(() => {
    if (user?.profile?.fullName) setFullName(user.profile.fullName)
    if (user?.profile?.phone) setPhone(user.profile.phone)
    if (user?.profile?.licenseClass) setTargetClass(user.profile.licenseClass)
    if (Array.isArray(user?.profile?.heldLicenses)) {
      setHeldLicenses(user.profile.heldLicenses)
    }
    setCenterId(user?.profile?.centerId ?? user?.centerId ?? "")
  }, [user])

  useEffect(() => {
    apiFetch("/lookup/centers")
      .then((rows) => setCenters(Array.isArray(rows) ? rows : []))
      .catch(() => setCenters([]))
  }, [])

  useEffect(() => {
    apiFetch("/applications/me", { auth: true })
      .then((data) => {
        setExamEligible(Boolean(data?.examEligible))
        setAppStatus(data?.application?.status ?? null)
      })
      .catch(() => {
        setExamEligible(false)
        setAppStatus(null)
      })
  }, [])

  function toggleHeld(code) {
    setHeldLicenses((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    )
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await apiFetch("/users/me", {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          licenseClass: targetClass,
          heldLicenses,
          ...(centerId ? { centerId } : {}),
        }),
      })
      await refreshUser()
      setNotice(t("pages.profile.saved"))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title={t("pages.profile.title")}
        subtitle={t("pages.profile.subtitleBasic")}
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

      <UiCard variant="panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{fullName || user?.email}</h2>
            <p className="mt-1 text-sm text-drive-muted">{user?.email}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge tone={premium ? "success" : "neutral"}>
                {premium ? (lifetime ? "Premium · Vĩnh viễn" : `Premium · ${formatPremiumDate(user?.profile?.premiumUntil)}`) : "Miễn phí"}
              </StatusBadge>
              {premium ? (
                <span className="text-xs text-drive-muted">
                  {lifetime ? "Đã mở quyền truy cập vĩnh viễn" : formatPremiumUntil(user?.profile?.premiumUntil)}
                </span>
              ) : null}
            </div>
          </div>
          {!premium ? (
            <Link
              to="/upgrade"
              className="rounded-drive-pill border border-drive-border bg-drive-elevated px-6 py-3 text-sm font-bold text-white transition hover:bg-drive-panel"
            >
              Nâng cấp Premium
            </Link>
          ) : null}
        </div>
      </UiCard>

      <UiCard variant="panel">
        <h3 className="font-semibold text-white">{t("pages.profile.basicInfo")}</h3>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleSave}>
          <TextField
            id="profileName"
            label="Họ và tên"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <TextField
            id="profilePhone"
            label="Số điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <TextField
            id="profileTarget"
            label={t("pages.profile.targetClass")}
            value={targetClass}
            onChange={(e) => setTargetClass(e.target.value)}
          />
          <label className="block text-sm sm:col-span-2">
            <span className="mb-2 block font-medium text-drive-text">Trung tâm đào tạo</span>
            <select
              className="w-full rounded-drive border border-drive-border bg-drive-elevated px-3 py-2 text-white"
              value={centerId}
              onChange={(e) => setCenterId(e.target.value)}
            >
              <option value="">— Chọn trung tâm —</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.city ? ` (${c.city})` : ""}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium text-drive-text">{t("pages.profile.heldLicenses")}</p>
            <p className="mb-3 text-xs text-drive-muted">{t("pages.profile.heldLicensesHint")}</p>
            <div className="flex flex-wrap gap-2">
              {LICENSE_OPTIONS.map((code) => {
                const on = heldLicenses.includes(code)
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleHeld(code)}
                    className={`rounded-drive-pill border px-3 py-1.5 text-sm font-medium transition ${
                      on
                        ? "border-drive-success bg-drive-success/15 text-drive-success"
                        : "border-drive-border text-drive-muted hover:border-drive-action/50"
                    }`}
                  >
                    {displayLicenseClass(code)}
                  </button>
                )
              })}
            </div>
            {heldLicenses.length === 0 ? (
              <p className="mt-2 text-xs text-drive-muted">{t("pages.profile.noHeldLicense")}</p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <PrimaryButton type="submit" variant="action" disabled={saving}>
              {saving ? "Đang lưu…" : t("common.save")}
            </PrimaryButton>
          </div>
        </form>
      </UiCard>

      <StudentLicensesCard />

      <UiCard variant="panel" className="border-drive-action/30">
        <h3 className="font-semibold text-white">{t("pages.profile.examDossierTitle")}</h3>
        <p className="mt-2 text-sm text-drive-muted">{t("pages.profile.examDossierDesc")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {appStatus ? (
            <StatusBadge tone={examEligible ? "success" : appStatus === "draft" ? "warning" : "info"}>
              {APP_STATUS_LABEL[appStatus] ?? appStatus}
            </StatusBadge>
          ) : (
            <StatusBadge tone="neutral">Chưa tạo hồ sơ</StatusBadge>
          )}
          <Link
            to="/application"
            className="rounded-drive-pill bg-drive-action px-6 py-3 text-sm font-bold text-drive-action-contrast shadow-drive-action transition hover:brightness-110"
          >
            {!appStatus
              ? "Nộp hồ sơ sát hạch"
              : appStatus === "draft"
                ? "Tiếp tục nộp hồ sơ"
                : examEligible
                  ? "Xem hồ sơ đã duyệt"
                  : "Xem hồ sơ đã nộp"}
          </Link>
        </div>
        {!examEligible && appStatus && appStatus !== "draft" ? (
          <p className="mt-3 text-xs text-amber-300/90">{t("pages.profile.examDossierRequired")}</p>
        ) : null}
      </UiCard>
    </section>
  )
}
