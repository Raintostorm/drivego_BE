/**
 * Verify the random-exam assembly logic against the real bank data (no DB).
 * Mirrors ExamAssemblyService: draws CRITICAL from điểm-liệt, chapter slots
 * from non-critical of each category, asserts invariants over many draws.
 *
 * Run: node database/scripts/verify-assembly.mjs
 */
import { readFileSync } from "fs"
import { resolve } from "path"
import { fileURLToPath } from "url"

const CONTENT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../content")
const bank = JSON.parse(readFileSync(resolve(CONTENT, "bank.json"), "utf8")).bank
const pools = JSON.parse(readFileSync(resolve(CONTENT, "pools.json"), "utf8"))

// Same quotas as migration 015_exam_structure.sql
const STRUCTURE = {
  A1: { CRITICAL: 1, I: 8, II: 1, III: 1, IV: 0, V: 8, VI: 6 },
  A2: { CRITICAL: 1, I: 8, II: 1, III: 1, IV: 0, V: 8, VI: 6 },
  B1: { CRITICAL: 1, I: 8, II: 1, III: 1, IV: 1, V: 9, VI: 9 },
  B2: { CRITICAL: 1, I: 8, II: 1, III: 1, IV: 1, V: 9, VI: 9 },
}

const byNumber = new Map(bank.map((q) => [q.number, q]))

function pick(items, n) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

function assemble(code) {
  const poolQs = pools[code].map((n) => byNumber.get(n)).filter(Boolean)
  const critical = poolQs.filter((q) => q.isCritical)
  const byCat = {}
  for (const q of poolQs) {
    if (q.isCritical) continue
    ;(byCat[q.category] ??= []).push(q)
  }
  const structure = STRUCTURE[code]
  const selected = []
  for (const [slot, quota] of Object.entries(structure)) {
    if (quota <= 0) continue
    const source = slot === "CRITICAL" ? critical : byCat[slot] ?? []
    if (source.length < quota) throw new Error(`${code}: thiếu ${slot} (cần ${quota}, có ${source.length})`)
    selected.push(...pick(source, quota))
  }
  return selected
}

let failures = 0
for (const code of Object.keys(STRUCTURE)) {
  const expectedTotal = Object.values(STRUCTURE[code]).reduce((a, b) => a + b, 0)
  const catTally = {}
  let minCrit = 99
  let maxCrit = 0
  const seenDup = new Set()
  let dupErr = 0
  const RUNS = 2000
  for (let r = 0; r < RUNS; r += 1) {
    const exam = assemble(code)
    if (exam.length !== expectedTotal) { failures++; console.log(`✗ ${code} size ${exam.length}≠${expectedTotal}`); break }
    const ids = new Set(exam.map((q) => q.number))
    if (ids.size !== exam.length) dupErr++
    const ncrit = exam.filter((q) => q.isCritical).length
    minCrit = Math.min(minCrit, ncrit)
    maxCrit = Math.max(maxCrit, ncrit)
    for (const q of exam) catTally[q.category] = (catTally[q.category] ?? 0) + 1
    if (r === 0) for (const q of exam) seenDup.add(q.number)
  }
  // coverage: across runs, how many distinct bank numbers appear (randomness sanity)
  const coverage = new Set()
  for (let r = 0; r < 500; r += 1) for (const q of assemble(code)) coverage.add(q.number)
  const ok = dupErr === 0 && minCrit === 1 && maxCrit === 1
  if (!ok) failures++
  console.log(
    `${ok ? "✓" : "✗"} ${code}: total=${expectedTotal} crit/exam=${minCrit}..${maxCrit} ` +
      `dupErrs=${dupErr} coverage=${coverage.size}/${pools[code].length} câu`,
  )
}

console.log(failures === 0 ? "\nPASS — assembly đúng trên dữ liệu thật." : `\nFAIL — ${failures} lỗi.`)
process.exit(failures === 0 ? 0 : 1)
