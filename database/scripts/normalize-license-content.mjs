import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
import { fileURLToPath } from "url"

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const CODES = ["A1", "A2", "B1", "B2"]
const RULES = {
  A1: { papersCount: 10, questionsPerPaper: 25, criticalPerPaper: 5 },
  A2: { papersCount: 10, questionsPerPaper: 25, criticalPerPaper: 5 },
  B1: { papersCount: 20, questionsPerPaper: 30, criticalPerPaper: 5 },
  B2: { papersCount: 20, questionsPerPaper: 30, criticalPerPaper: 5 },
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8")
}

function cleanMotorText(value) {
  if (typeof value !== "string") return value
  return value
    .replace(/\u0011/g, "a")
    .replace(/\u001b/g, "ơ")
    .replace(/#/g, "a")
    .replace(/!/g, "o")
    .replace(/G/g, "ơ")
    .replace(/Q/g, "e")
    .replace(/"/g, "e")
    .replace(/(?<=\p{L})1|1(?=\p{L})/gu, "u")
    .replace(/(?<=\p{L})\.(?=\p{L})/gu, "o")
    .replace(/(?<=\p{L})\.(?=\s+\p{Ll})/gu, "o")
    .replace(/(bị|vụ|đủ|trợ|để|về|của|cho|hoặc)(?=[a-zà-ỹ])/g, "$1 ")
    .replace(/(bộ|lề|sử|chở|tuổi|giới|đường|thông|được|người|không|cấm|trên|dụng|rộng|toàn)(?=[a-zà-ỹ])/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim()
}

function fingerprintQuestion(q) {
  return [
    q.body ?? "",
    q.imageUrl ?? "",
    JSON.stringify(q.answers ?? []),
    q.correctIndex ?? 0,
    q.isCritical ? "1" : "0",
  ].join("|")
}

function dedupeQuestions(questions) {
  const seen = new Set()
  return questions.filter((q) => {
    const key = fingerprintQuestion(q)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function hashString(value) {
  let hash = 2166136261
  for (const ch of value) {
    hash ^= ch.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededShuffle(items, seed) {
  const result = [...items]
  let state = hashString(seed) || 1
  for (let i = result.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const j = state % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function pickCycled(pool, count, start) {
  if (!pool.length) return []
  return Array.from({ length: count }, (_, i) => pool[(start + i) % pool.length])
}

function buildDistinctPapers(code, papers) {
  const rule = RULES[code]
  if (!rule) return papers

  const paperCount = rule.papersCount ?? papers.length
  const all = dedupeQuestions(papers.flatMap((paper) => paper.questions ?? []))
  const critical = seededShuffle(all.filter((q) => q.isCritical), `${code}:critical`)
  const normal = seededShuffle(all.filter((q) => !q.isCritical), `${code}:normal`)
  if (!critical.length || !normal.length) return papers

  const normalPerPaper = rule.questionsPerPaper - rule.criticalPerPaper
  const normalStep = normalPerPaper
  const criticalStep = Math.max(1, Math.ceil(critical.length / paperCount))
  const signatures = new Set()

  return Array.from({ length: paperCount }, (_, index) => {
    const paper = papers[index] ?? papers[0] ?? {}
    let criticalStart = index * criticalStep
    let normalStart = index * normalStep
    let questions = []

    for (let attempt = 0; attempt < paperCount + 3; attempt += 1) {
      const selectedCritical = pickCycled(
        critical,
        rule.criticalPerPaper,
        criticalStart + attempt,
      )
      const selectedNormal = pickCycled(normal, normalPerPaper, normalStart + attempt * normalPerPaper)
      questions = seededShuffle(
        [...selectedCritical, ...selectedNormal],
        `${code}:paper:${index + 1}:attempt:${attempt}`,
      )
      const signature = questions
        .map(fingerprintQuestion)
        .sort()
        .join("\n")
      if (!signatures.has(signature)) {
        signatures.add(signature)
        break
      }
    }

    return {
      ...paper,
      paperNumber: index + 1,
      questionCount: questions.length,
      questions,
    }
  })
}

for (const code of CODES) {
  const path = resolve(ROOT, "database", "content", code, "papers.json")
  const data = readJson(path)

  if (code === "A1" || code === "A2") {
    for (const paper of data.papers) {
      for (const q of paper.questions ?? []) {
        q.body = cleanMotorText(q.body)
        q.answers = (q.answers ?? []).map(cleanMotorText)
      }
    }
  }

  data.papers = buildDistinctPapers(code, data.papers)
  writeJson(path, data)
  const criticalCounts = data.papers.map(
    (paper) => (paper.questions ?? []).filter((q) => q.isCritical).length,
  )
  console.log(
    `Normalized ${code}: ${data.papers.length} papers, critical per paper: ${criticalCounts.join(", ")}`,
  )
}
