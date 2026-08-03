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
import { displayLicenseClass } from "../lib/license-class.js"

const DEFAULT_EXAM_RULES = {
  questionsPerExam: 30,
  durationMinutes: 22,
  passMinCorrect: 26,
}

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
  const [randomReady, setRandomReady] = useState(false)
  const [selectedPaperId, setSelectedPaperId] = useState(null)
  const [randomMode, setRandomMode] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString())
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds)
  const autoSubmittedRef = useRef(false)

  useEffect(() => {
    setSecondsLeft(durationSeconds)
    autoSubmittedRef.current = false
  }, [durationSeconds, paper?.id])

  const generateRandom = useCallback(async () => {
    setGenerating(true)
    setLoading(true)
    setError(null)
    try {
      const detail = await apiFetch(`/exams/random?licenseClass=${activeClass}`, {
        method: "POST",
        auth: true,
      })
      setPaper(detail)
      setSelectedPaperId(null)
      setCurrentIndex(0)
      setAnswers({})
      setResult(null)
      setStartedAt(new Date().toISOString())
      autoSubmittedRef.current = false
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được đề ngẫu nhiên")
    } finally {
      setGenerating(false)
      setLoading(false)
    }
  }, [activeClass])

  useEffect(() => {
    if (enrollmentsLoading) return undefined
    if (!enrolled) {
      setLoading(false)
      setPapers([])
      setPaper(null)
      setExamContentReady(false)
      setRandomReady(false)
      setSelectedPaperId(null)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch(`/exams/papers?licenseClass=${activeClass}`, { auth: true })
      .then((data) => {
        if (!cancelled) {
          const list = data.fixedPapers ?? data.papers ?? (Array.isArray(data) ? data : [])
          const canGenerateRandom = Boolean(data.randomReady ?? data.randomExam?.available)
          setPapers(list)
          setRandomReady(canGenerateRandom)
          setExamContentReady(Boolean(data.contentReady ?? (canGenerateRandom || list.length > 0)))
          setPaper(null)
          setSelectedPaperId(null)
          setLoading(false)
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

  // Initial load: random by default, or first fixed paper when in fixed mode.
  useEffect(() => {
    if (!enrolled || !examContentReady || paper || selectedPaperId || generating) return
    if (randomMode && randomReady) {
      generateRandom()
    } else if (papers[0]) {
      setRandomMode(false)
      setSelectedPaperId(papers[0].id)
    }
  }, [
    enrolled,
    examContentReady,
    randomMode,
    randomReady,
    papers,
    paper,
    selectedPaperId,
    generating,
    generateRandom,
  ])

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
          <PrimaryButton
            variant="outline"
            onClick={() => {
              if (randomMode) {
                generateRandom()
              } else {
                window.location.reload()
              }
            }}
          >
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
    <section className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
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
          Hạng {displayLicenseClass(activeClass)} · {totalQuestions} câu · {examRules.durationMinutes} phút · Đạt từ{" "}
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

      <div className="lg:col-span-2 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <PrimaryButton
          variant={randomMode ? "action" : "outline"}
          disabled={generating || !randomReady}
          onClick={() => {
            if (!randomReady) return
            setRandomMode(true)
            setSelectedPaperId(null)
            generateRandom()
          }}
        >
          {generating ? "Đang tạo đề…" : "🎲 Tạo đề ngẫu nhiên"}
        </PrimaryButton>

        {papers.length > 0 ? (
          <>
            <span className="text-xs text-drive-muted">hoặc đề cố định:</span>
            <select
              value={!randomMode ? selectedPaperId ?? "" : ""}
              onChange={(e) => {
                setRandomMode(false)
                setPaper(null)
                setSelectedPaperId(e.target.value)
              }}
              className="min-w-0 rounded-drive border border-drive-border bg-drive-elevated px-4 py-2 text-sm text-drive-text"
            >
              <option value="" disabled>
                Chọn đề…
              </option>
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.questionCount} câu)
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      <UiCard variant="panel" className="min-w-0 space-y-4">
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

        {question.imageUrl ? (
          <div className="mx-auto flex aspect-square w-full max-w-[420px] items-center justify-center overflow-hidden rounded-drive border border-drive-border-soft bg-white p-3">
            <img
              src={question.imageUrl}
              alt=""
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : null}

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

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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

        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pt-2 sm:max-h-none">
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

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
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
