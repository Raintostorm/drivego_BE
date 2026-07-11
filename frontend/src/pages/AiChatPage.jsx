import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { apiFetch } from "../lib/api.js"
import { t } from "../lib/strings.js"

export function AiChatPage() {
  const [sessions, setSessions] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [premiumError, setPremiumError] = useState(null)

  function isPremiumGateError(message) {
    const lower = message.toLowerCase()
    return lower.includes("premium") && lower.includes("chỉ dành")
  }

  async function loadSession(id) {
    const data = await apiFetch(`/chat/sessions/${id}`, { auth: true })
    setMessages(data.messages ?? [])
    setActiveId(id)
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const list = await apiFetch("/chat/sessions", { auth: true })
        if (cancelled) return
        setSessions(list)
        if (list[0]) await loadSession(list[0].id)
      } catch (err) {
        if (!cancelled) {
          setPremiumError(err instanceof Error ? err.message : "Không tải được chat")
          setSessions([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleNewChat() {
    setPremiumError(null)
    try {
      const data = await apiFetch("/chat/sessions", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ title: "Cuộc trò chuyện mới" }),
      })
      setSessions((prev) => [{ id: data.id, title: data.title }, ...prev])
      setMessages(data.messages ?? [])
      setActiveId(data.id)
    } catch (err) {
      setPremiumError(err instanceof Error ? err.message : "Không tạo được chat")
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || !activeId) return
    setSending(true)
    setPremiumError(null)
    try {
      const data = await apiFetch(`/chat/sessions/${activeId}/messages`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ content: input.trim() }),
      })
      setMessages((prev) => [
        ...prev,
        { role: "user", content: data.user.content },
        { role: "assistant", content: data.assistant.content },
      ])
      setInput("")
    } catch (err) {
      setPremiumError(err instanceof Error ? err.message : "Gửi tin thất bại")
    } finally {
      setSending(false)
    }
  }

  if (loading) return <p className="text-drive-muted">Đang tải chat…</p>

  return (
    <section className="grid min-h-[70svh] gap-4 lg:grid-cols-[260px_1fr]">
      <UiCard padding="sm" variant="panel" className="flex min-w-0 flex-col">
        <PrimaryButton variant="action" className="mb-4" onClick={handleNewChat}>
          {t("pages.aiChat.newChat")}
        </PrimaryButton>
        <p className="mb-2 text-xs font-semibold uppercase text-drive-placeholder">Gần đây</p>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:block lg:overflow-visible lg:pb-0">
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => loadSession(s.id)}
              className={`mb-1 shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition lg:block lg:w-full lg:whitespace-normal ${
                activeId === s.id
                  ? "bg-drive-action text-drive-action-contrast"
                  : "text-drive-muted hover:bg-drive-elevated hover:text-white"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </UiCard>

      <UiCard variant="panel" className="flex min-w-0 flex-col">
        <h1 className="text-xl font-bold text-white">{t("pages.aiChat.title")}</h1>
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={`drive-chat-bubble max-w-[92%] break-words rounded-drive p-3 text-sm sm:max-w-xl ${
                m.role === "user"
                  ? "drive-chat-bubble--user ml-auto"
                  : "drive-chat-bubble--assistant border"
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>
        {premiumError ? (
          <p className="mt-4 text-sm text-drive-danger">
            {premiumError}
            {isPremiumGateError(premiumError) ? (
              <>
                {" "}
                <Link to="/upgrade" className="font-medium text-drive-action underline">
                  Nâng cấp Premium
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
        <form onSubmit={handleSend} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("pages.aiChat.placeholder")}
            className="min-w-0 flex-1 rounded-drive-pill border border-drive-border bg-drive-elevated px-4 py-3 text-drive-text outline-none focus:ring-2 focus:ring-drive-accent"
          />
          <PrimaryButton type="submit" variant="action" disabled={sending}>
            {t("pages.aiChat.send")}
          </PrimaryButton>
        </form>
      </UiCard>
    </section>
  )
}
