import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { HelpCard } from "../components/HelpCard.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { TextField } from "../components/TextField.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { useLicense } from "../context/LicenseContext.jsx"
import { unwrapApplication } from "../lib/applicationApi.js"
import { apiFetch, apiFetchBlob, apiUpload } from "../lib/api.js"
import { STUDY_LICENSE_CODES } from "../lib/license-classes.js"
import { vi } from "../content/vi.js"
import { t } from "../lib/strings.js"

const DOC_TYPE_KEYS = {
  photo_3x4_blue: "application.docTypes.photo3x4",
  photo_4x6_white: "application.docTypes.photo4x6",
  cccd_front: "application.docTypes.cccdFront",
  cccd_back: "application.docTypes.cccdBack",
  vneid_l2: "application.docTypes.vneid",
  gplx_optional: "application.docTypes.gplx",
}

const STATUS_TONE = {
  draft: "neutral",
  submitted: "info",
  reviewing: "warning",
  approved: "success",
  rejected: "danger",
}

function docLabel(docType) {
  const key = DOC_TYPE_KEYS[docType]
  return key ? t(key) : docType
}

function statusLabel(status) {
  if (!status) return t("application.statusUnknown")
  const labels = vi.application?.status
  if (labels && typeof labels === "object" && status in labels) {
    return labels[status]
  }
  return String(status)
}

function applyApplicationToForm(app, setters) {
  if (!app) {
    setters.setApplication(null)
    return
  }
  setters.setApplication(app)
  setters.setLicenseClass(app.licenseClass ?? "B2")
  const info = app.personalInfo ?? {}
  setters.setFullName(String(info.fullName ?? ""))
  setters.setDateOfBirth(String(info.dateOfBirth ?? ""))
  setters.setNationalId(String(info.nationalId ?? ""))
  setters.setIdIssuedAt(String(info.idIssuedAt ?? ""))
  setters.setIdIssuedPlace(String(info.idIssuedPlace ?? ""))
  setters.setAddress(String(info.address ?? ""))
  setters.setPermanentAddress(String(info.permanentAddress ?? ""))
}

export function ApplicationPage() {
  const { activeClass } = useLicense()
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingKey, setUploadingKey] = useState(null)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)
  const [previewUrls, setPreviewUrls] = useState({})

  const [licenseClass, setLicenseClass] = useState(activeClass)

  useEffect(() => {
    setLicenseClass(activeClass)
  }, [activeClass])
  const [fullName, setFullName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [nationalId, setNationalId] = useState("")
  const [idIssuedAt, setIdIssuedAt] = useState("")
  const [idIssuedPlace, setIdIssuedPlace] = useState("")
  const [address, setAddress] = useState("")
  const [permanentAddress, setPermanentAddress] = useState("")

  const isDraft = application?.status === "draft"
  const dossierRequested = Boolean(application?.dossierRequestedAt)
  const canModify = !application || isDraft || dossierRequested
  const readOnly = application && !canModify

  const loadApplication = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let data = await apiFetch("/applications/me", { auth: true })
      let app = unwrapApplication(data)
      if (!app) {
        data = await apiFetch("/applications", {
          method: "POST",
          auth: true,
          body: JSON.stringify({ licenseClass }),
        })
        app = unwrapApplication(data)
      }
      applyApplicationToForm(app, {
        setApplication,
        setLicenseClass,
        setFullName,
        setDateOfBirth,
        setNationalId,
        setIdIssuedAt,
        setIdIssuedPlace,
        setAddress,
        setPermanentAddress,
      })
    } catch (err) {
      setApplication(null)
      setError(err instanceof Error ? err.message : t("application.loadError"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadApplication()
  }, [loadApplication])

  useEffect(() => {
    if (!application?.documents?.length) {
      setPreviewUrls({})
      return undefined
    }

    let cancelled = false
    const created = []

    async function loadPreviews() {
      const next = {}
      await Promise.all(
        application.documents.map(async (doc) => {
          if (!doc.mimeType?.startsWith("image/")) return
          try {
            const blob = await apiFetchBlob(doc.fileUrl.replace(/^\/api/, ""), { auth: true })
            if (cancelled) return
            const url = URL.createObjectURL(blob)
            created.push(url)
            next[doc.id] = url
          } catch {
            /* preview optional */
          }
        }),
      )
      if (!cancelled) setPreviewUrls(next)
    }

    loadPreviews()

    return () => {
      cancelled = true
      created.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [application?.documents])

  const allSlots = useMemo(() => {
    if (!application?.requirements) return []
    return [
      ...(application.requirements.required ?? []),
      ...(application.requirements.optional ?? []),
    ]
  }, [application])

  function buildPersonalInfo() {
    return {
      fullName: fullName.trim(),
      dateOfBirth: dateOfBirth.trim(),
      nationalId: nationalId.trim(),
      idIssuedAt: idIssuedAt.trim(),
      idIssuedPlace: idIssuedPlace.trim(),
      address: address.trim(),
      permanentAddress: permanentAddress.trim(),
    }
  }

  async function handleSaveDraft(e) {
    e.preventDefault()
    if (!application?.id || readOnly) return
    setSaving(true)
    setNotice(null)
    setError(null)
    try {
      const data = await apiFetch(`/applications/${application.id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({
          licenseClass,
          personalInfo: buildPersonalInfo(),
        }),
      })
      setApplication(unwrapApplication(data))
      setNotice(t("application.savedDraft"))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("application.saveError"))
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(docType, slotIndex, file) {
    if (!application?.id || !file || readOnly) return
    const key = `${docType}:${slotIndex}`
    setUploadingKey(key)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const path = `/applications/${application.id}/documents?docType=${encodeURIComponent(docType)}&slotIndex=${slotIndex}`
      const data = await apiUpload(path, formData, { auth: true })
      setApplication(unwrapApplication(data))
      setNotice(t("application.uploaded"))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("application.uploadError"))
    } finally {
      setUploadingKey(null)
    }
  }

  async function handleSubmit() {
    if (!application?.id || readOnly) return
    setSubmitting(true)
    setNotice(null)
    setError(null)
    try {
      await apiFetch(`/applications/${application.id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({
          licenseClass,
          personalInfo: buildPersonalInfo(),
        }),
      })
      const data = await apiFetch(`/applications/${application.id}/submit`, {
        method: "POST",
        auth: true,
        body: "{}",
      })
      setApplication(unwrapApplication(data))
      setNotice(t("application.submitted"))
    } catch (err) {
      setError(err instanceof Error ? err.message : t("application.submitError"))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <PageHeader title={t("application.title")} subtitle={t("application.subtitle")} />
        <p className="text-sm text-drive-muted">{t("common.loading")}</p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <PageHeader title={t("application.title")} subtitle={t("application.subtitle")} />

      {canModify && isDraft ? (
        <p className="rounded-drive border border-drive-action/30 bg-drive-action/10 px-4 py-3 text-sm text-drive-text">
          {t("application.proactiveHint")}{" "}
          <Link to="/profile" className="font-medium text-drive-action hover:underline">
            Hồ sơ cá nhân
          </Link>
        </p>
      ) : (
        <p className="rounded-drive border border-drive-border-soft bg-drive-sidebar px-4 py-3 text-sm text-drive-muted">
          {t("application.profileNote")}{" "}
          <Link to="/profile" className="font-medium text-drive-action hover:underline">
            Hồ sơ cá nhân
          </Link>
        </p>
      )}

      <HelpCard
        title="Hướng dẫn nộp hồ sơ"
        items={[
          "Điền đúng thông tin cá nhân theo CCCD trước khi bấm lưu hoặc nộp hồ sơ.",
          "Ảnh hồ sơ chỉ nên dùng JPG, PNG, WEBP hoặc PDF, tối đa 5MB mỗi file.",
          "Khi trung tâm yêu cầu bổ sung, bạn có thể upload lại tài liệu rồi nộp lại hồ sơ.",
        ]}
      />

      {readOnly && application ? (
        <UiCard variant="panel" className="border-drive-border">
          <p className="text-sm text-drive-muted">
            Hồ sơ đang ở trạng thái{" "}
            <strong className="text-white">{statusLabel(application.status)}</strong>.{" "}
            {t("application.waitingResubmit")}
          </p>
        </UiCard>
      ) : null}

      {dossierRequested ? (
        <UiCard variant="panel" className="border-amber-500/40 bg-amber-500/10">
          <p className="font-semibold text-amber-200">Trung tâm yêu cầu nộp hồ sơ</p>
          {application.dossierDeadline ? (
            <p className="mt-1 text-sm text-drive-muted">
              Hạn nộp: {new Date(application.dossierDeadline).toLocaleString("vi-VN")}
            </p>
          ) : (
            <p className="mt-1 text-sm text-drive-muted">Vui lòng hoàn thiện và nộp sớm nhất có thể.</p>
          )}
        </UiCard>
      ) : null}

      {application ? (
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone={STATUS_TONE[application.status] ?? "neutral"}>
            {statusLabel(application.status)}
          </StatusBadge>
          {application.submittedAt ? (
            <span className="text-sm text-drive-muted">
              {t("application.submittedAt")}:{" "}
              {new Date(application.submittedAt).toLocaleString("vi-VN")}
            </span>
          ) : null}
          <Link to="/profile" className="text-sm font-medium text-drive-primary hover:underline">
            {t("application.backToProfile")}
          </Link>
        </div>
      ) : null}

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

      <form onSubmit={handleSaveDraft} className="space-y-6">
        <UiCard title={t("application.personalSection")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t("application.fullName")}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={readOnly}
              required
            />
            <TextField
              label={t("application.dateOfBirth")}
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              disabled={readOnly}
            />
            <TextField
              label={t("application.nationalId")}
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              disabled={readOnly}
            />
            <label className="block text-sm font-medium text-drive-label">
              {t("application.licenseClass")}
              <select
                value={licenseClass}
                onChange={(e) => setLicenseClass(e.target.value)}
                disabled={readOnly}
                className="mt-2 w-full rounded-drive border border-drive-border bg-drive-elevated px-4 py-3 text-drive-text outline-none transition focus:border-drive-accent disabled:opacity-60"
              >
                {STUDY_LICENSE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
            <TextField
              label={t("application.idIssuedAt")}
              type="date"
              value={idIssuedAt}
              onChange={(e) => setIdIssuedAt(e.target.value)}
              disabled={readOnly}
            />
            <TextField
              label={t("application.idIssuedPlace")}
              value={idIssuedPlace}
              onChange={(e) => setIdIssuedPlace(e.target.value)}
              disabled={readOnly}
            />
            <TextField
              className="sm:col-span-2"
              label={t("application.address")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={readOnly}
            />
            <TextField
              className="sm:col-span-2"
              label={t("application.permanentAddress")}
              value={permanentAddress}
              onChange={(e) => setPermanentAddress(e.target.value)}
              disabled={readOnly}
            />
          </div>
        </UiCard>

        <UiCard title={t("application.documentsSection")}>
          <p className="mb-4 text-sm text-drive-muted">{t("application.documentsHint")}</p>
          <ul className="space-y-4">
            {allSlots.map((slot) => {
              const key = `${slot.docType}:${slot.slotIndex}`
              const doc = application?.documents?.find(
                (d) => d.docType === slot.docType && d.slotIndex === slot.slotIndex,
              )
              const label =
                slot.docType === "photo_3x4_blue" && slot.slotIndex > 0
                  ? `${docLabel(slot.docType)} (${slot.slotIndex + 1}/4)`
                  : docLabel(slot.docType)
              const isOptional = slot.docType === "gplx_optional"

              return (
                <li
                  key={key}
                  className="flex flex-col gap-3 rounded-drive border border-drive-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-drive-ink">
                      {label}
                      {isOptional ? (
                        <span className="ml-2 text-xs font-normal text-drive-muted">
                          ({t("application.optional")})
                        </span>
                      ) : null}
                    </p>
                    {doc ? (
                      <p className="mt-1 truncate text-sm text-drive-muted">{doc.originalName}</p>
                    ) : (
                      <p className="mt-1 text-sm text-drive-muted">{t("application.notUploaded")}</p>
                    )}
                    {doc && previewUrls[doc.id] ? (
                      <img
                        src={previewUrls[doc.id]}
                        alt=""
                        className="mt-2 h-24 w-auto rounded-drive border border-drive-border object-cover"
                      />
                    ) : null}
                  </div>
                  {canModify ? (
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-drive border border-drive-primary px-4 py-2 text-sm font-medium text-drive-primary hover:bg-drive-primary/5">
                      {uploadingKey === key ? t("common.loading") : t("application.chooseFile")}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="sr-only"
                        disabled={uploadingKey === key}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleUpload(slot.docType, slot.slotIndex, file)
                          e.target.value = ""
                        }}
                      />
                    </label>
                  ) : slot.uploaded ? (
                    <StatusBadge tone="success">{t("application.uploadedBadge")}</StatusBadge>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </UiCard>

        {canModify ? (
          <div className="flex flex-wrap gap-3">
            <PrimaryButton type="submit" disabled={saving}>
              {saving ? t("common.loading") : t("application.saveDraft")}
            </PrimaryButton>
            <PrimaryButton type="button" disabled={submitting} onClick={handleSubmit}>
              {submitting
                ? t("common.loading")
                : dossierRequested
                  ? "Nộp lại hồ sơ"
                  : t("application.submit")}
            </PrimaryButton>
          </div>
        ) : null}
      </form>
    </section>
  )
}
