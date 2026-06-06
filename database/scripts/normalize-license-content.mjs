import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
import { fileURLToPath } from "url"

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const CODES = ["A1", "A2", "B1", "B2"]

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

function rebalanceCriticalQuestions(papers) {
  const all = papers.flatMap((paper) => paper.questions ?? [])
  const critical = all.filter((q) => q.isCritical)
  const normal = all.filter((q) => !q.isCritical)
  if (!critical.length || !normal.length) return papers

  const perPaper = papers[0]?.questionCount ?? papers[0]?.questions?.length ?? 0
  const paperCount = papers.length
  const baseCritical = Math.floor(critical.length / paperCount)
  let remainder = critical.length % paperCount
  let criticalIndex = 0
  let normalIndex = 0

  return papers.map((paper, index) => {
    const targetCritical = baseCritical + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder -= 1

    const nextQuestions = []
    for (let i = 0; i < targetCritical && criticalIndex < critical.length; i += 1) {
      nextQuestions.push(critical[criticalIndex])
      criticalIndex += 1
    }
    while (nextQuestions.length < perPaper && normalIndex < normal.length) {
      nextQuestions.push(normal[normalIndex])
      normalIndex += 1
    }
    while (nextQuestions.length < perPaper && criticalIndex < critical.length) {
      nextQuestions.push(critical[criticalIndex])
      criticalIndex += 1
    }

    return {
      ...paper,
      paperNumber: index + 1,
      questionCount: nextQuestions.length,
      questions: nextQuestions,
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

  data.papers = rebalanceCriticalQuestions(data.papers)
  writeJson(path, data)
  console.log(`Normalized ${code}: ${data.papers.length} papers`)
}
