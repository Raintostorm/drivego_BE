import { useEffect, useState } from "react"
import { UiCard } from "../components/UiCard.jsx"
import { useLicense } from "../context/LicenseContext.jsx"
import { DEFAULT_LICENSE_CLASS } from "../lib/license-classes.js"
import { apiFetch } from "../lib/api.js"
import { t } from "../lib/strings.js"

const faqItems = [
  {
    q: "Tôi có thể tải tài liệu về học offline không?",
    a: "Có, bạn có thể tải PDF hướng dẫn và bộ đề mẫu từ trang Tài liệu.",
  },
  {
    q: "Ứng dụng DriveGo có cập nhật câu hỏi mới nhất không?",
    a: "Có, hệ thống tự động cập nhật khi Bộ GTVT thay đổi bộ đề hoặc quy định sát hạch.",
    open: true,
  },
  {
    q: "Làm sao để đăng ký thi thử tại trung tâm?",
    a: "Vào mục Lịch thi, chọn ngày và ca thi, sau đó bấm Đăng ký.",
  },
]

export function DocsPage() {
  const { activeClass } = useLicense()
  const [docFilter, setDocFilter] = useState(activeClass)
  const [openFaq, setOpenFaq] = useState(1)
  const [articles, setArticles] = useState([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setDocFilter(activeClass)
  }, [activeClass])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (search.trim()) params.set("search", search.trim())
        if (docFilter && docFilter !== "all") params.set("licenseClass", docFilter)
        const q = params.toString() ? `?${params}` : ""
        const data = await apiFetch(`/articles${q}`)
        if (!cancelled) {
          setArticles(data)
          if (data[0]) setSelected(data[0])
          else setSelected(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const timer = setTimeout(load, search ? 300 : 0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, docFilter])

  const active = selected ?? articles[0]

  return (
    <section className="space-y-10">
      <UiCard as="header" padding="lg" variant="panel" className="text-center">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          {t("pages.docs.title")}{" "}
          <span className="text-drive-action">{t("pages.docs.titleHighlight")}</span> {t("brand")}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-drive-muted">{t("pages.docs.subtitle")}</p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("pages.docs.searchPlaceholder")}
          className="mx-auto mt-5 block w-full max-w-2xl rounded-drive-pill border border-drive-border bg-drive-elevated px-5 py-3 text-drive-text outline-none focus:ring-2 focus:ring-drive-accent"
        />
        <div className="mx-auto mt-4 flex max-w-2xl flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setDocFilter("all")}
            className={`rounded-drive-pill px-4 py-2 text-sm ${
              docFilter === "all"
                ? "bg-drive-action text-drive-action-contrast"
                : "border border-drive-border text-drive-muted"
            }`}
          >
            {t("license.docsAll")}
          </button>
          <button
            type="button"
            onClick={() => setDocFilter(activeClass)}
            className={`rounded-drive-pill px-4 py-2 text-sm ${
              docFilter === activeClass
                ? "bg-drive-action text-drive-action-contrast"
                : "border border-drive-border text-drive-muted"
            }`}
          >
            {t("license.docsForClass", { code: activeClass })}
          </button>
          {activeClass !== DEFAULT_LICENSE_CLASS ? (
            <button
              type="button"
              onClick={() => setDocFilter(DEFAULT_LICENSE_CLASS)}
              className={`rounded-drive-pill px-4 py-2 text-sm ${
                docFilter === DEFAULT_LICENSE_CLASS
                  ? "bg-drive-action text-drive-action-contrast"
                  : "border border-drive-border text-drive-muted"
              }`}
            >
              B2
            </button>
          ) : null}
        </div>
      </UiCard>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr_240px]">
        <UiCard as="nav" padding="sm" variant="panel" className="hidden lg:block">
          <p className="text-xs font-semibold uppercase text-drive-placeholder">Bài viết</p>
          {loading ? (
            <p className="mt-3 text-sm text-drive-muted">{t("common.loading")}</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {articles.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(a)}
                    className={`text-left ${active?.id === a.id ? "font-medium text-drive-action" : "text-drive-muted hover:text-white"}`}
                  >
                    {a.title}
                    {a.licenseClass ? (
                      <span className="ml-1 text-[10px] text-drive-placeholder">({a.licenseClass})</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </UiCard>

        <UiCard variant="panel">
          {active ? (
            <>
              <p className="text-xs text-drive-muted">
                {active.category}
                {active.licenseClass ? ` · Hạng ${active.licenseClass}` : ` · ${t("license.docsShared")}`}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">{active.title}</h2>
              <p className="mt-4 whitespace-pre-wrap text-drive-text">{active.body}</p>
            </>
          ) : (
            <p className="text-drive-muted">{t("license.docsEmpty")}</p>
          )}
        </UiCard>

        <UiCard variant="panel">
          <h3 className="font-semibold text-white">FAQ</h3>
          <ul className="mt-4 space-y-2">
            {faqItems.map((item, idx) => (
              <li key={item.q} className="rounded-drive border border-drive-border-soft">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-white"
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                >
                  {item.q}
                  <span>{openFaq === idx ? "−" : "+"}</span>
                </button>
                {openFaq === idx ? (
                  <p className="border-t border-drive-border-soft px-3 py-2 text-xs text-drive-muted">
                    {item.a}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </UiCard>
      </div>
    </section>
  )
}
