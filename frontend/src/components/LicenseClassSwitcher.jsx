import { useState } from "react"
import { useLicense } from "../context/LicenseContext.jsx"
import { t } from "../lib/strings.js"

export function LicenseClassSwitcher() {
  const { catalog, catalogLoading, activeClass, setActiveClass } = useLicense()
  const [saving, setSaving] = useState(false)

  if (catalogLoading || catalog.length === 0) return null

  async function handleChange(code) {
    if (code === activeClass || saving) return
    setSaving(true)
    try {
      await setActiveClass(code)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-drive-placeholder">
        {t("license.studying")}
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0">
        {catalog.map((item) => {
          const selected = item.code === activeClass
          return (
            <button
              key={item.code}
              type="button"
              disabled={saving}
              onClick={() => handleChange(item.code)}
              className={`min-w-24 shrink-0 rounded-lg border px-2 py-2 text-left text-xs transition lg:min-w-0 ${
                selected
                  ? "border-drive-action bg-drive-action/15 text-drive-text"
                  : "border-drive-border bg-drive-elevated text-drive-muted hover:border-drive-action/40"
              }`}
            >
              <span className="font-semibold">{item.code}</span>
              {item.contentReady ? (
                <span className="mt-0.5 block text-[10px] text-drive-success">
                  {t("license.ready")}
                </span>
              ) : (
                <span className="mt-0.5 block text-[10px] text-amber-300/80">
                  {t("license.comingSoon")}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
