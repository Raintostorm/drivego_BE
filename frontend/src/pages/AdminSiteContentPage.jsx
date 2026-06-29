import { useEffect, useMemo, useState } from "react"
import { PageHeader } from "../components/PageHeader.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { useAuth } from "../context/AuthContext.jsx"
import { fetchAdminSiteContent, patchAdminSiteContent } from "../lib/admin-api.js"

const DEFAULT_CONTENT = {
  center: {
    name: "",
    address: "",
    phone: "",
    email: "",
    hours: "",
    bank: "",
  },
  services: [],
  highlights: [],
  gallery: [],
  news: [],
}

function stringify(value) {
  return JSON.stringify(value ?? [], null, 2)
}

function parseJson(label, value) {
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) throw new Error(`${label} phải là mảng JSON`)
    return parsed
  } catch (error) {
    if (error instanceof Error) throw new Error(`${label}: ${error.message}`)
    throw new Error(`${label}: JSON không hợp lệ`)
  }
}

export function AdminSiteContentPage() {
  const { user } = useAuth()
  const readOnly = user?.role === "center_admin"
  const [center, setCenter] = useState(DEFAULT_CONTENT.center)
  const [servicesJson, setServicesJson] = useState("[]")
  const [highlightsJson, setHighlightsJson] = useState("[]")
  const [galleryJson, setGalleryJson] = useState("[]")
  const [newsJson, setNewsJson] = useState("[]")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    fetchAdminSiteContent()
      .then((data) => {
        const merged = { ...DEFAULT_CONTENT, ...data, center: { ...DEFAULT_CONTENT.center, ...(data?.center || {}) } }
        setCenter(merged.center)
        setServicesJson(stringify(merged.services))
        setHighlightsJson(stringify(merged.highlights))
        setGalleryJson(stringify(merged.gallery))
        setNewsJson(stringify(merged.news))
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được nội dung website"))
  }, [])

  const preview = useMemo(() => {
    try {
      return {
        services: parseJson("Dịch vụ", servicesJson).length,
        gallery: parseJson("Gallery", galleryJson).length,
        news: parseJson("Tin tức", newsJson).length,
      }
    } catch {
      return null
    }
  }, [servicesJson, galleryJson, newsJson])

  function updateCenter(field, value) {
    setCenter((prev) => ({ ...prev, [field]: value }))
  }

  async function saveContent() {
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const payload = {
        center,
        services: parseJson("Dịch vụ", servicesJson),
        highlights: parseJson("Điểm nổi bật", highlightsJson),
        gallery: parseJson("Gallery", galleryJson),
        news: parseJson("Tin tức", newsJson),
      }
      const saved = await patchAdminSiteContent(payload)
      setCenter(saved.center)
      setServicesJson(stringify(saved.services))
      setHighlightsJson(stringify(saved.highlights))
      setGalleryJson(stringify(saved.gallery))
      setNewsJson(stringify(saved.news))
      setNotice("Đã lưu nội dung website. Trang chủ sẽ kéo dữ liệu mới từ backend.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được nội dung")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Nội dung website"
        subtitle={readOnly ? "Chế độ xem dữ liệu trang chủ" : "Chỉnh dữ liệu mà trang chủ kéo từ backend"}
      />

      {error ? <p className="text-drive-danger">{error}</p> : null}
      {notice ? <p className="text-drive-success">{notice}</p> : null}

      <UiCard variant="panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Thông tin trung tâm</h2>
            <p className="mt-1 text-sm text-drive-muted">
              Dữ liệu này đang được dùng ở phần liên hệ, footer nội dung và CTA tư vấn.
            </p>
          </div>
          {preview ? (
            <p className="rounded-drive-pill border border-drive-border bg-drive-elevated px-3 py-1 text-xs text-drive-muted">
              {preview.services} dịch vụ · {preview.gallery} ảnh · {preview.news} tin
            </p>
          ) : null}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            ["name", "Tên trung tâm"],
            ["address", "Địa chỉ"],
            ["phone", "Hotline"],
            ["email", "Email"],
            ["hours", "Giờ làm việc"],
            ["bank", "Tài khoản thanh toán"],
          ].map(([field, label]) => (
            <label key={field} className="block">
              <span className="mb-2 block text-sm font-medium text-drive-text">{label}</span>
              <input
                value={center[field] ?? ""}
                disabled={readOnly}
                onChange={(e) => updateCenter(field, e.target.value)}
                className="w-full rounded-drive border border-drive-border bg-drive-elevated px-4 py-3 text-sm text-drive-text outline-none focus:ring-2 focus:ring-drive-accent disabled:opacity-60"
              />
            </label>
          ))}
        </div>
      </UiCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {[
          ["Dịch vụ", servicesJson, setServicesJson, "title, price, desc, imageKey"],
          ["Điểm nổi bật", highlightsJson, setHighlightsJson, "mảng chuỗi"],
          ["Gallery", galleryJson, setGalleryJson, "imageKey, alt"],
          ["Tin tức", newsJson, setNewsJson, "title, date, desc, imageKey"],
        ].map(([label, value, setter, hint]) => (
          <UiCard key={label} variant="panel">
            <h2 className="text-lg font-semibold text-white">{label}</h2>
            <p className="mt-1 text-sm text-drive-muted">JSON array · {hint}</p>
            <textarea
              value={value}
              disabled={readOnly}
              onChange={(e) => setter(e.target.value)}
              className="mt-4 min-h-64 w-full rounded-drive border border-drive-border bg-drive-elevated p-4 font-mono text-xs text-drive-text outline-none focus:ring-2 focus:ring-drive-accent disabled:opacity-60"
              spellCheck={false}
            />
          </UiCard>
        ))}
      </div>

      {!readOnly ? (
        <div className="flex justify-end">
          <PrimaryButton variant="action" onClick={saveContent} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu nội dung website"}
          </PrimaryButton>
        </div>
      ) : null}
    </section>
  )
}
