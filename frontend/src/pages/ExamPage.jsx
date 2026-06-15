import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { EnrollCourseCta } from "../components/EnrollCourseCta.jsx"
import { EnrollmentConsentCard } from "../components/EnrollmentConsentCard.jsx"
import { HelpCard } from "../components/HelpCard.jsx"
import { LicenseContentEmpty } from "../components/LicenseContentEmpty.jsx"
import { PrimaryButton } from "../components/PrimaryButton.jsx"
import { UiCard } from "../components/UiCard.jsx"
import { useLicense } from "../context/LicenseContext.jsx"
import { apiFetch } from "../lib/api.js"
import { t } from "../lib/strings.js"

const DEFAULT_EXAM_RULES = {
  questionsPerExam: 30,
  durationMinutes: 22,
  passMinCorrect: 26,
}

const EXAM_GUIDE_AUTO_OPEN_KEY = "drivego_exam_guide_auto_open"

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function ExamPage() {
  const navigate = useNavigate()
  const { activeClass, activeEntry, isEnrolled, enrollmentsLoading } = useLicense()
  const enrolled = isEnrolled(activeClass)
  const examRules = activeEntry?.examRules ?? DEFAULT_EXAM_RULES
  const durationSeconds = (examRules.durationMinutes ?? 22) * 60

  const [paper, setPaper] = useState(null)
  const [papers, setPapers] = useState([])
  const [examContentReady, setExamContentReady] = useState(false)
  const [selectedPaperId, setSelectedPaperId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString())
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const [guideAutoOpen, setGuideAutoOpen] = useState(() => {
    return localStorage.getItem(EXAM_GUIDE_AUTO_OPEN_KEY) !== "off"
  })
  const [guideOpen, setGuideOpen] = useState(() => {
    return localStorage.getItem(EXAM_GUIDE_AUTO_OPEN_KEY) !== "off"
  })
  const autoSubmittedRef = useRef(false)

  useEffect(() => {
    setSecondsLeft(durationSeconds)
    autoSubmittedRef.current = false
  }, [durationSeconds, selectedPaperId])

  useEffect(() => {
    if (enrollmentsLoading) return undefined
    if (!enrolled) {
      setLoading(false)
      setPapers([])
      setPaper(null)
      setExamContentReady(false)
      setSelectedPaperId(null)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch(`/exams/papers?licenseClass=${activeClass}`, { auth: true })
      .then((data) => {
        if (!cancelled) {
          const list = data.papers ?? (Array.isArray(data) ? data : [])
          setPapers(list)
          setExamContentReady(Boolean(data.contentReady ?? list.length > 0))
          if (list[0]) {
            setSelectedPaperId(list[0].id)
          } else {
            setSelectedPaperId(null)
            setLoading(false)
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không tải được đề thi")
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [enrollmentsLoading, enrolled, activeClass])

  useEffect(() => {
    if (!enrolled || !selectedPaperId) return undefined
    let cancelled = false
    setLoading(true)
    apiFetch(`/exams/${selectedPaperId}`, { auth: true })
      .then((detail) => {
        if (!cancelled) {
          setPaper(detail)
          setCurrentIndex(0)
          setAnswers({})
          setResult(null)
          setError(null)
          setStartedAt(new Date().toISOString())
          autoSubmittedRef.current = false
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Không tải được đề thi")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedPaperId, enrolled, activeClass])

  const questions = paper?.questions ?? []
  const question = questions[currentIndex]
  const passMin = paper?.examRules?.passMinCorrect ?? examRules.passMinCorrect ?? 26
  const totalQuestions = questions.length || examRules.questionsPerExam

  const handleSubmitExam = useCallback(async () => {
    if (!paper || submitting || result) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {}
      for (const q of questions) {
        if (answers[q.id] !== undefined) payload[q.id] = answers[q.id]
      }
      const data = await apiFetch(`/exams/${paper.id}/attempts`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ answers: payload, startedAt }),
      })
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nộp bài thất bại")
    } finally {
      setSubmitting(false)
    }
  }, [paper, submitting, result, questions, answers, startedAt])

  useEffect(() => {
    if (!paper || result) return undefined
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [paper, result])

  useEffect(() => {
    if (!paper || result || secondsLeft > 0 || autoSubmittedRef.current) return
    autoSubmittedRef.current = true
    handleSubmitExam()
  }, [paper, result, secondsLeft, handleSubmitExam])

  function handleGuideAutoOpenChange(enabled) {
    setGuideAutoOpen(enabled)
    localStorage.setItem(EXAM_GUIDE_AUTO_OPEN_KEY, enabled ? "on" : "off")
    setGuideOpen(enabled)
  }

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] !== undefined).length,
    [questions, answers],
  )

  if (enrollmentsLoading) return <p className="text-drive-muted">Đang kiểm tra đăng ký khóa…</p>

  if (!enrolled) {
    return <EnrollCourseCta licenseClass={activeClass} />
  }

  if (loading) return <p className="text-drive-muted">Đang tải đề thi…</p>
  if (error && !paper) {
    return (
      <p className="text-drive-danger">
        {error}{" "}
        {error.includes("đăng ký") ? (
          <Link to={`/enroll?class=${activeClass}`} className="font-medium text-drive-action underline">
            Đăng ký khóa
          </Link>
        ) : null}
      </p>
    )
  }

  if (!examContentReady) {
    return (
      <EnrollmentConsentCard
        storageKey="drivego_consent_exam_v1"
        title={t("consent.examTitle")}
        bullets={[t("consent.examBullet1"), t("consent.examBullet2")]}
        confirmLabel={t("consent.examConfirm")}
      >
        <LicenseContentEmpty feature="exam" />
      </EnrollmentConsentCard>
    )
  }

  if (result) {
    return (
      <UiCard variant="panel" className="mx-auto max-w-lg text-center">
        <h1 className="text-2xl font-bold text-white">
          {result.passed ? "Chúc mừng — bạn đã đạt!" : "Chưa đạt — ôn thêm nhé"}
        </h1>
        <p className="mt-4 text-4xl font-bold text-drive-action">
          {result.correct}/{result.total}
        </p>
        <p className="mt-2 text-sm text-drive-muted">
          Cần tối thiểu {result.passThreshold}/{result.total} điểm và không sai câu điểm liệt
          {result.failedCritical ? " (bạn đã sai câu điểm liệt)." : "."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <PrimaryButton variant="action" onClick={() => navigate("/history")}>
            Xem lịch sử
          </PrimaryButton>
          <PrimaryButton variant="outline" onClick={() => window.location.reload()}>
            Thi lại
          </PrimaryButton>
        </div>
      </UiCard>
    )
  }

  if (!question) return <p className="text-drive-muted">Đề thi trống.</p>

  const allAnswered = questions.every((q) => answers[q.id] !== undefined)
  const isLast = currentIndex === questions.length - 1
  const progressPct = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0

  const examUi = (
    <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="fixed right-4 top-24 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 lg:right-6">
        <button
          type="button"
          onClick={() => setGuideOpen((open) => !open)}
          className="rounded-drive-pill border border-drive-border bg-drive-action px-4 py-2 text-sm font-bold text-drive-action-contrast shadow-drive-action transition hover:brightness-110"
        >
          {guideOpen ? "Đóng hướng dẫn" : "Hướng dẫn"}
        </button>
        {guideOpen ? (
          <div className="w-full max-w-sm rounded-drive-lg border border-drive-border bg-drive-surface p-4 text-sm shadow-drive-card backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-drive-action">Thi thử</p>
                <h2 className="mt-1 text-lg font-bold text-white">Cách dùng màn hình này</h2>
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="rounded-full border border-drive-border px-2 py-1 text-xs text-drive-muted transition hover:text-white"
                aria-label="Đóng hướng dẫn"
              >
                ×
              </button>
            </div>

            <ul className="mt-4 space-y-3 text-drive-muted">
              <li>
                <span className="font-semibold text-drive-text">Chọn đề:</span> dùng hộp chọn ở trên để đổi bộ đề thi thử hiện tại.
              </li>
              <li>
                <span className="font-semibold text-drive-text">Ảnh câu hỏi:</span> biển báo/sa hình được đặt trong khung vuông để bạn nhìn đủ ảnh.
              </li>
              <li>
                <span className="font-semibold text-drive-text">Đáp án:</span> chọn một đáp án cho từng câu, có thể đổi lại trước khi nộp.
              </li>
              <li>
                <span className="font-semibold text-drive-text">Thanh số câu:</span> bấm số câu phía dưới để nhảy nhanh; màu xanh là câu đã trả lời.
              </li>
              <li>
                <span className="font-semibold text-drive-text">Đồng hồ:</span> hết giờ hệ thống sẽ tự nộp bài nếu đang làm.
              </li>
              <li>
                <span className="font-semibold text-drive-text">Điểm liệt:</span> nếu sai câu có nhãn điểm liệt thì không đạt dù đủ điểm.
              </li>
            </ul>

            <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-drive border border-drive-border bg-drive-elevated px-3 py-2">
              <span className="text-drive-text">Tự mở hướng dẫn</span>
              <input
                type="checkbox"
                checked={guideAutoOpen}
                onChange={(e) => handleGuideAutoOpenChange(e.target.checked)}
                className="size-4 accent-drive-action"
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="lg:col-span-2">
        <HelpCard
          title="Lưu ý khi làm bài thi thử"
          items={[
            `Bạn cần đạt tối thiểu ${passMin}/${totalQuestions} câu và không sai câu điểm liệt.`,
            "Hệ thống chỉ cho nộp khi đã trả lời đủ tất cả câu hỏi.",
            "Kết quả thi thử được lưu vào lịch sử để bạn theo dõi tiến độ ôn tập.",
          ]}
        />
      </div>

      <div className="lg:col-span-2 space-y-2">
        <p className="text-sm text-drive-muted">
          Hạng {activeClass} · {totalQuestions} câu · {examRules.durationMinutes} phút · Đạt từ{" "}
          {passMin}/{totalQuestions} + không sai điểm liệt
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-drive-elevated">
          <div
            className="h-full bg-drive-action transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-drive-muted">
          Đã trả lời {answeredCount}/{totalQuestions} câu
        </p>
      </div>

      {papers.length > 1 ? (
        <div className="lg:col-span-2">
          <select
            value={selectedPaperId ?? ""}
            onChange={(e) => setSelectedPaperId(e.target.value)}
            className="rounded-drive border border-drive-border bg-drive-elevated px-4 py-2 text-sm text-drive-text"
          >
            {papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.questionCount} câu)
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <UiCard variant="panel" className="space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-2 rounded-drive border border-drive-border-soft bg-drive-sidebar p-4">
          <div>
            <p className="text-sm font-medium text-drive-action">
              {paper.title} — {t("pages.exam.questionLabel")} {question.index}/{questions.length}
            </p>
            <h1 className="mt-2 text-lg font-semibold text-white">{question.body}</h1>
          </div>
          {question.isCritical ? (
            <span className="rounded-drive-pill bg-drive-danger/20 px-3 py-1 text-xs font-semibold text-drive-danger">
              Điểm liệt
            </span>
          ) : null}
        </header>

        <div className="mx-auto flex aspect-square w-full max-w-[420px] items-center justify-center overflow-hidden rounded-drive border border-drive-border-soft bg-white p-3">
          {question.imageUrl ? (
            <img
              src={question.imageUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex size-full items-center justify-center rounded-drive bg-gradient-to-r from-drive-panel to-drive-action/25 text-sm text-drive-muted">
              {t("license.examQuestionLabel", { code: activeClass })}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {question.answers.map((answer, idx) => {
            const selected = answers[question.id] === idx
            const borderClass = selected
              ? "border-drive-action bg-drive-action/10"
              : "border-drive-border hover:border-drive-action"

            return (
              <label
                key={`${question.id}-${idx}`}
                className={`flex cursor-pointer items-start gap-3 rounded-drive border bg-drive-elevated p-3 text-sm text-drive-text transition ${borderClass}`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  className="mt-1 accent-drive-action"
                  checked={selected}
                  onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: idx }))}
                />
                <span>{answer}</span>
              </label>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-3">
          <PrimaryButton
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => i - 1)}
          >
            Câu trước
          </PrimaryButton>
          {!isLast ? (
            <PrimaryButton variant="outline" onClick={() => setCurrentIndex((i) => i + 1)}>
              Câu sau
            </PrimaryButton>
          ) : null}
          {allAnswered ? (
            <PrimaryButton variant="action" disabled={submitting || secondsLeft === 0} onClick={handleSubmitExam}>
              {submitting ? "Đang nộp…" : "Nộp bài"}
            </PrimaryButton>
          ) : (
            <span className="self-center text-xs text-drive-muted">
              Trả lời đủ {totalQuestions} câu để nộp bài
            </span>
          )}
        </div>
        {error ? (
          <p className="text-sm text-drive-danger">
            {error}{" "}
            {error.includes("Premium") || error.includes("miễn phí") ? (
              <Link to="/upgrade" className="font-medium text-drive-action underline">
                Nâng cấp ngay
              </Link>
            ) : null}
            {error.includes("đăng ký") && error.includes("khóa") ? (
              <Link to="/enroll" className="font-medium text-drive-action underline">
                Đăng ký khóa
              </Link>
            ) : null}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-2">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`size-8 rounded-lg text-xs font-medium ${
                idx === currentIndex
                  ? "bg-drive-action text-drive-action-contrast"
                  : answers[q.id] !== undefined
                    ? "bg-drive-success/20 text-drive-success"
                    : "bg-drive-elevated text-drive-muted"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </UiCard>

      <aside className="space-y-4">
        <UiCard variant="panel">
          <p className="text-sm text-drive-muted">{t("pages.exam.timeLeft")}</p>
          <p
            className={`text-4xl font-bold ${secondsLeft < 60 ? "text-drive-danger" : "text-drive-action"}`}
          >
            {formatTime(secondsLeft)}
          </p>
          {secondsLeft === 0 ? (
            <p className="mt-1 text-xs text-drive-danger">Hết giờ — đang nộp bài…</p>
          ) : null}
        </UiCard>
        <UiCard variant="panel">
          <p className="text-sm text-drive-muted">Tiến độ làm bài</p>
          <p className="mt-2 text-2xl font-bold text-drive-action">
            {answeredCount}/{totalQuestions}
          </p>
        </UiCard>
        <UiCard variant="panel" className="text-sm text-drive-muted">
          <p>{t("license.examAside", { count: String(totalQuestions), code: activeClass })}</p>
          <Link to="/theory" className="mt-2 inline-block text-drive-action hover:underline">
            Ôn lý thuyết trước khi thi
          </Link>
        </UiCard>
      </aside>
    </section>
  )

  return (
    <EnrollmentConsentCard
      storageKey="drivego_consent_exam_v1"
      title={t("consent.examTitle")}
      bullets={[t("consent.examBullet1"), t("consent.examBullet2")]}
      confirmLabel={t("consent.examConfirm")}
    >
      {examUi}
    </EnrollmentConsentCard>
  )
}
