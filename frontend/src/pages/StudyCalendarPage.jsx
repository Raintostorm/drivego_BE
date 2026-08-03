import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { apiFetch } from "../lib/api.js"
import { t } from "../lib/strings.js"

const SESSION_META = {
  theory: { label: "Lý thuyết", tone: "info" },
  simulation: { label: "Mô phỏng", tone: "warning" },
  practice: { label: "Thực hành", tone: "success" },
}

function formatDate(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function StudyCalendarPage() {
  const [sessions, setSessions] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch("/sessions/upcoming", { auth: true })
      .then((list) => {
        setSessions(list)
        setSelected(list[0] ?? null)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi"))
      .finally(() => setLoading(false))
  }, [])

  async function handleCheckIn() {
    if (!selected?.id) return
    setChecking(true)
    setMessage(null)
    try {
      await apiFetch(`/sessions/${selected.id}/check-in`, { method: "POST", auth: true, body: "{}" })
      setMessage("Điểm danh thành công!")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không điểm danh được")
    } finally {
      setChecking(false)
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader title={t("pages.studyCalendar.title")} subtitle="Buổi học tại trung tâm của bạn" />

      {loading ? <p className="text-drive-muted">{t("common.loading")}</p> : null}
      {error ? <p className="text-drive-danger">{error}</p> : null}
      {message ? <p className="text-drive-success">{message}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <UiCard variant="panel">
          <h3 className="text-xs font-bold uppercase text-drive-placeholder">
            {t("pages.studyCalendar.upcoming")}
          </h3>
          {sessions.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(s)}
                    className={`min-h-20 w-full rounded-drive border px-3 py-3 text-left transition-colors ${
                      selected?.id === s.id
                        ? "border-drive-action bg-drive-action/10"
                        : "border-drive-border-soft"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3"><p className="font-semibold text-drive-text">{s.title}</p><StatusBadge tone={SESSION_META[s.sessionType]?.tone}>{SESSION_META[s.sessionType]?.label ?? "Buổi học"}</StatusBadge></div>
                    <p className="mt-1 text-xs text-drive-muted">
                      {formatDate(s.sessionDate)} · {String(s.startTime).slice(0, 5)}–{String(s.endTime).slice(0, 5)}
                      {s.venue ? ` · ${s.venue}` : ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          ) : !loading ? (
            <div className="mt-3 space-y-2 text-sm text-drive-muted">
              <p>Chưa có buổi học sắp tới tại trung tâm của bạn.</p>
              <p>
                Nếu bạn mới đăng ký, hãy cập nhật{" "}
                <Link to="/profile" className="text-drive-action underline">
                  hồ sơ
                </Link>{" "}
                để gắn trung tâm đào tạo.
              </p>
            </div>
          ) : null}
        </UiCard>

        <UiCard variant="panel">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs capitalize text-drive-muted">{formatDate(selected.sessionDate)}</p><h2 className="mt-2 font-semibold text-drive-text">{selected.title}</h2></div><StatusBadge tone={SESSION_META[selected.sessionType]?.tone}>{SESSION_META[selected.sessionType]?.label ?? "Buổi học"}</StatusBadge></div>
              <p className="mt-2 text-sm text-drive-text">
                {String(selected.startTime).slice(0, 5)}–{String(selected.endTime).slice(0, 5)}
              </p>
              {selected.venue ? (
                <p className="text-xs text-drive-muted">{selected.venue}</p>
              ) : null}
              <PrimaryButton
                variant="action"
                className="mt-4 w-full sm:w-auto"
                disabled={checking}
                onClick={handleCheckIn}
              >
                {checking ? t("common.loading") : t("pages.studyCalendar.checkIn")}
              </PrimaryButton>
            </>
          ) : (
            <p className="text-sm text-drive-muted">Chọn buổi học để điểm danh.</p>
          )}
        </UiCard>
      </div>
    </section>
  )
}
