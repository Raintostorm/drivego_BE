import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { apiFetch } from "../lib/api.js"
import { t } from "../lib/strings.js"

export function NotificationsPage() {
  const [filter, setFilter] = useState("all")
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const q = filter === "unread" ? "?filter=unread" : ""
        const data = await apiFetch(`/notifications${q}`, { auth: true })
        if (!cancelled) setItems(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [filter])

  async function markRead(id) {
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH", auth: true })
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const tabs = [
    { key: "all", label: t("pages.notifications.all") },
    { key: "unread", label: t("pages.notifications.unread") },
    { key: "important", label: t("pages.notifications.important") },
  ]

  const visible =
    filter === "important"
      ? items.filter((n) => n.type === "exam" || n.type === "schedule")
      : items

  return (
    <section className="space-y-6">
      <PageHeader title={t("pages.notifications.title")} subtitle={t("pages.notifications.subtitle")} />

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded-drive-pill px-4 py-1.5 text-sm font-medium transition ${
              filter === tab.key
                ? "bg-drive-accent text-drive-accent-contrast"
                : "border border-drive-border bg-drive-elevated text-drive-muted hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-drive-muted">Đang tải…</p> : null}

      <div className="space-y-3">
        {visible.map((n) => (
          <UiCard
            key={n.id}
            variant="panel"
            className={n.read ? "opacity-80" : "border-drive-accent/30"}
          >
            <p className="font-semibold text-white">{n.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-drive-muted">{n.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {n.actionUrl ? (
                <Link
                  to={n.actionUrl}
                  className="rounded-drive-pill bg-drive-action px-4 py-1.5 text-xs font-bold text-drive-action-contrast shadow-drive-action transition hover:brightness-110"
                >
                  Xem chi tiết
                </Link>
              ) : null}
              {!n.read ? (
                <PrimaryButton
                  variant="outline"
                  className="!py-1.5 !text-xs"
                  onClick={() => markRead(n.id)}
                >
                  Đánh dấu đã đọc
                </PrimaryButton>
              ) : null}
            </div>
          </UiCard>
        ))}
      </div>
    </section>
  )
}
