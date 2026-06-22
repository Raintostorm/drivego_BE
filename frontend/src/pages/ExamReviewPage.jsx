import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { PageHeader } from "../components/PageHeader.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { StatusBadge } from "../components/StatusBadge.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { apiFetch } from "../lib/api.js"

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

const LETTERS = ["1", "2", "3", "4", "5", "6"]

export function ExamReviewPage() {
  const { attemptId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [onlyWrong, setOnlyWrong] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiFetch(`/exams/attempts/${attemptId}`, { auth: true })
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Không tải được bài thi")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [attemptId])

  if (loading) return <p className="text-drive-muted">Đang tải bài thi…</p>
  if (error) return <p className="text-drive-danger">{error}</p>
  if (!data) return null

  const questions = data.questions ?? []
  const wrongCount = questions.filter((q) => !q.isCorrect).length
  const shown = onlyWrong ? questions.filter((q) => !q.isCorrect) : questions

  return (
    <section className="space-y-6">
      <PageHeader
        title="Xem lại bài thi"
        subtitle={`${data.title} · ${new Date(data.date).toLocaleString("vi-VN")}`}
        actions={
          <Link
            to="/history"
            className="rounded-drive border border-drive-border-soft bg-drive-panel px-4 py-2 text-sm text-drive-muted hover:text-white"
          >
            ← Lịch sử
          </Link>
        }
      />

      <UiCard variant="panel" className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-drive-muted">Kết quả</p>
          <p className="mt-1 text-3xl font-bold text-drive-action">
            {data.score}/{data.total}
          </p>
          <p className="mt-1 text-xs text-drive-muted">
            Cần ≥ {data.passThreshold}/{data.total} và không sai điểm liệt
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge tone={data.passed ? "success" : "danger"}>
            {data.passed ? "Đạt" : "Chưa đạt"}
          </StatusBadge>
          {data.failedCritical ? (
            <span className="rounded-drive-pill bg-drive-danger/20 px-3 py-1 text-xs font-semibold text-drive-danger">
              Sai câu điểm liệt
            </span>
          ) : null}
          <p className="text-xs text-drive-muted">
            Sai {wrongCount} câu · {formatDuration(data.durationSeconds)}
          </p>
        </div>
      </UiCard>

      {!data.hasReview ? (
        <UiCard variant="panel">
          <p className="text-sm text-drive-muted">
            Bài thi này được làm trước khi có tính năng xem lại nên không lưu chi tiết từng câu.
            Hãy làm một đề mới để xem lại được đầy đủ.
          </p>
          <Link to="/exam" className="mt-3 inline-block text-sm text-drive-action hover:underline">
            Thi thử ngay →
          </Link>
        </UiCard>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOnlyWrong(false)}
              className={`rounded-drive-pill px-4 py-2 text-sm font-medium ${
                !onlyWrong ? "bg-drive-action text-drive-action-contrast" : "bg-drive-elevated text-drive-muted"
              }`}
            >
              Tất cả ({questions.length})
            </button>
            <button
              type="button"
              onClick={() => setOnlyWrong(true)}
              className={`rounded-drive-pill px-4 py-2 text-sm font-medium ${
                onlyWrong ? "bg-drive-danger text-white" : "bg-drive-elevated text-drive-muted"
              }`}
            >
              Chỉ câu sai ({wrongCount})
            </button>
          </div>

          <div className="space-y-4">
            {shown.map((q) => (
              <UiCard key={q.index} variant="panel" className="space-y-3">
                <header className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-white">
                    Câu {q.index}.{" "}
                    <span className="font-normal text-drive-text">{q.body}</span>
                  </p>
                  <div className="flex shrink-0 gap-2">
                    {q.isCritical ? (
                      <span className="rounded-drive-pill bg-drive-danger/20 px-2 py-1 text-[11px] font-semibold text-drive-danger">
                        Điểm liệt
                      </span>
                    ) : null}
                    <span
                      className={`rounded-drive-pill px-2 py-1 text-[11px] font-semibold ${
                        q.isCorrect
                          ? "bg-drive-success/20 text-drive-success"
                          : "bg-drive-danger/20 text-drive-danger"
                      }`}
                    >
                      {q.isCorrect ? "Đúng" : "Sai"}
                    </span>
                  </div>
                </header>

                {q.imageUrl ? (
                  <div className="mx-auto flex aspect-video w-full max-w-[420px] items-center justify-center overflow-hidden rounded-drive border border-drive-border-soft bg-white p-2">
                    <img src={q.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : null}

                <div className="space-y-2">
                  {(q.answers ?? [])
                    .filter((a) => a && a.trim() && a.trim() !== "—")
                    .map((answer, idx) => {
                      const isCorrectOpt = idx === q.correctIndex
                      const isPicked = idx === q.selected
                      let cls = "border-drive-border bg-drive-elevated text-drive-text"
                      if (isCorrectOpt) cls = "border-drive-success bg-drive-success/10 text-white"
                      else if (isPicked) cls = "border-drive-danger bg-drive-danger/10 text-white"
                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-3 rounded-drive border p-3 text-sm ${cls}`}
                        >
                          <span className="font-semibold">{LETTERS[idx]}.</span>
                          <span className="flex-1">{answer}</span>
                          {isCorrectOpt ? (
                            <span className="text-xs font-semibold text-drive-success">✓ Đáp án đúng</span>
                          ) : isPicked ? (
                            <span className="text-xs font-semibold text-drive-danger">Bạn chọn</span>
                          ) : null}
                        </div>
                      )
                    })}
                </div>
              </UiCard>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Link to="/exam">
          <PrimaryButton variant="action">Thi lại đề mới</PrimaryButton>
        </Link>
        <Link to="/history">
          <PrimaryButton variant="outline">Về lịch sử</PrimaryButton>
        </Link>
      </div>
    </section>
  )
}
