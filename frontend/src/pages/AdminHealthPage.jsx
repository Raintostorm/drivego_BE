import { useEffect, useState } from "react"
import { PageHeader } from "../components/PageHeader.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { fetchAdminHealthConfig } from "../lib/admin-api.js"

const CHECK_LABELS = {
  database: "Database",
  firebase: "Firebase Admin",
  resend: "Resend email",
  smtpFallback: "SMTP fallback",
  sepayCheckout: "SePay checkout",
  sepayWebhook: "SePay webhook",
  gemini: "Gemini AI",
  uploadStorage: "Upload storage",
}

export function AdminHealthPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAdminHealthConfig()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Không tải được cấu hình"))
  }, [])

  const checks = data?.checks ?? {}

  return (
    <section>
      <PageHeader
        title="Cấu hình hệ thống"
        subtitle="Kiểm tra nhanh các tích hợp production mà không hiển thị secret."
      />

      {error ? (
        <UiCard variant="panel" className="mt-4">
          <p className="text-sm text-drive-danger">{error}</p>
        </UiCard>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(CHECK_LABELS).map(([key, label]) => {
          const value = checks[key]
          const ok = typeof value === "boolean" ? value : Boolean(value)
          return (
            <UiCard key={key} variant="panel">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-white">{label}</p>
                <StatusBadge tone={ok ? "success" : "warning"}>
                  {typeof value === "string" ? value : ok ? "OK" : "Thiếu"}
                </StatusBadge>
              </div>
            </UiCard>
          )
        })}
      </div>

      {data?.warnings?.length ? (
        <UiCard variant="panel" className="mt-4">
          <h2 className="font-semibold text-white">Cảnh báo</h2>
          <ul className="mt-3 space-y-2 text-sm text-drive-muted">
            {data.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </UiCard>
      ) : null}
    </section>
  )
}
