/**
 * Bootstrap content folders:
 * - B2: stable paper IDs (requires papers.json from parse:b2-pdf)
 * - B1: clone exam papers from B2, custom chapters
 * - A1: chapters only (papers from parse:motor-docx)
 * - A2: clone papers from A1 + copy images
 *
 * Usage: npm run bootstrap:content
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs"
import { join, resolve } from "path"
import { fileURLToPath } from "url"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const ROOT = resolve(__dirname, "../..")
const B2_DIR = join(ROOT, "database/content/B2")
const A1_DIR = join(ROOT, "database/content/A1")

const CLASS_META = {
  A1: {
    chapterPrefix: "44444444-4444-4444-8441",
    label: "xe máy A1",
    chapterTitles: [
      "Chương 1: Biển báo & hiệu lệnh (A1)",
      "Chương 2: Quy tắc giao thông xe máy",
      "Chương 3: Kỹ năng lái xe máy an toàn",
      "Chương 4: Ôn đề thi thử A1",
    ],
    chapterDesc: [
      "Biển báo và quy tắc cơ bản cho bằng A1.",
      "Ưu tiên, làn đường và khoảng cách khi điều khiển xe máy.",
      "Thao tác an toàn ban ngày/đêm và thời tiết xấu.",
      "Luyện 250 câu lý thuyết (đề thi thử).",
    ],
  },
  A2: {
    chapterPrefix: "44444444-4444-4444-8442",
    paperPrefix: "55555555-5555-4555-8502",
    label: "xe máy A2",
    chapterTitles: [
      "Chương 1: Biển báo & hiệu lệnh (A2)",
      "Chương 2: Quy tắc giao thông",
      "Chương 3: Kỹ năng lái xe máy",
      "Chương 4: Ôn đề thi thử A2",
    ],
    chapterDesc: [
      "Nhận biết biển báo cho hạng A2.",
      "Quy tắc ưu tiên và an toàn giao thông.",
      "Kỹ thuật lái xe máy trong đô thị.",
      "Luyện 250 câu lý thuyết (đề thi thử).",
    ],
  },
  B1: {
    chapterPrefix: "44444444-4444-4444-8443",
    paperPrefix: "55555555-5555-4555-8503",
    label: "ô tô B1",
    chapterTitles: [
      "Chương 1: Biển báo hiệu đường bộ (B1)",
      "Chương 2: Quy tắc giao thông",
      "Chương 3: Kỹ thuật lái ô tô",
      "Chương 4: Giải đề thi thử B1",
    ],
    chapterDesc: [
      "Biển báo cho người điều khiển ô tô hạng B1.",
      "Quy tắc ưu tiên, làn đường và khoảng cách.",
      "Lái ban đêm, mưa và cao tốc.",
      "Luyện 600 câu lý thuyết (đề thi thử).",
    ],
  },
  B2: {
    chapterPrefix: "44444444-4444-4444-8444",
    paperPrefix: "55555555-5555-4555-8555",
    label: "ô tô B2",
    chapterTitles: null,
    chapterDesc: null,
  },
}

const B2_VIDEOS = [
  "https://www.youtube-nocookie.com/embed/8ndOIY5FNeo?rel=0&modestbranding=1",
  "https://www.youtube-nocookie.com/embed/jEqaK9lvlvA?rel=0&modestbranding=1",
  "https://www.youtube-nocookie.com/embed/MFx-VLUi4tw?rel=0&modestbranding=1",
  "https://www.youtube-nocookie.com/embed/Uv_j-wkRFHE?rel=0&modestbranding=1",
]

function paperId(prefix, paperNumber) {
  const n = String(paperNumber).padStart(3, "0")
  return `${prefix}-0000000${n}01`
}

function chapterId(prefix, sortOrder) {
  return `${prefix}-44444444440${sortOrder}`
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}

function writeJson(dir, name, data) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, name), `${JSON.stringify(data, null, 2)}\n`, "utf8")
}

function readB2Papers() {
  const path = join(B2_DIR, "papers.json")
  if (!existsSync(path)) {
    console.error("Missing database/content/B2/papers.json — run npm run parse:b2-pdf first.")
    process.exit(1)
  }
  return readJson(path)
}

function readA1Papers() {
  const path = join(A1_DIR, "papers.json")
  if (!existsSync(path)) {
    console.error("Missing database/content/A1/papers.json — run npm run parse:motor-docx first.")
    process.exit(1)
  }
  return readJson(path)
}

function clonePapersForClass(source, code, imageFrom, imageTo) {
  const meta = CLASS_META[code]
  return {
    papers: source.papers.map((p) => ({
      id: paperId(meta.paperPrefix, p.paperNumber),
      paperNumber: p.paperNumber,
      questionCount: p.questionCount,
      isMock: p.isMock ?? true,
      questions: (p.questions ?? []).map((q) => ({
        ...q,
        imageUrl: q.imageUrl
          ? q.imageUrl.replace(imageFrom, imageTo)
          : null,
      })),
    })),
  }
}

function buildChapters(code) {
  const meta = CLASS_META[code]
  const b2Chapters = readJson(join(B2_DIR, "chapters.json")).chapters

  return {
    chapters: b2Chapters.map((ch, i) => ({
      id: chapterId(meta.chapterPrefix, ch.sortOrder ?? i + 1),
      title: meta.chapterTitles?.[i] ?? ch.title,
      sortOrder: ch.sortOrder ?? i + 1,
      durationMinutes: ch.durationMinutes ?? 30,
      videoUrl: ch.videoUrl ?? B2_VIDEOS[i],
      description: meta.chapterDesc?.[i] ?? ch.description,
    })),
  }
}

function copyA1ImagesToA2() {
  const src = join(A1_DIR, "images")
  const destDb = join(ROOT, "database/content/A2/images")
  const destPublic = join(ROOT, "frontend/public/content/A2/images")
  if (!existsSync(src)) {
    console.warn("A1/images missing — skip image copy to A2")
    return
  }
  mkdirSync(destDb, { recursive: true })
  mkdirSync(destPublic, { recursive: true })
  for (const name of readdirSync(src)) {
    if (!name.endsWith(".png")) continue
    cpSync(join(src, name), join(destDb, name))
    cpSync(join(src, name), join(destPublic, name))
  }
  console.log("A2: copied images from A1")
}

const b2Source = readB2Papers()

// B2: stable IDs
const b2Papers = clonePapersForClass(b2Source, "B2", "/content/B2/images", "/content/B2/images")
writeJson(B2_DIR, "papers.json", b2Papers)
console.log(`B2 papers.json: ${b2Papers.papers.length} papers`)

if (!existsSync(join(B2_DIR, "chapters.json"))) {
  console.error("Missing B2/chapters.json")
  process.exit(1)
}

// A1: chapters only (papers from parse:motor-docx)
const a1Dir = join(ROOT, "database/content/A1")
writeJson(a1Dir, "chapters.json", buildChapters("A1"))
if (existsSync(join(a1Dir, "papers.json"))) {
  console.log(`A1: kept papers.json from parse:motor-docx`)
} else {
  console.warn("A1: no papers.json — run npm run parse:motor-docx")
}

// A2: keep parsed papers when available, otherwise clone from A1
const a2Dir = join(ROOT, "database/content/A2")
const a2PapersPath = join(a2Dir, "papers.json")
const a1Source = existsSync(join(A1_DIR, "papers.json")) ? readA1Papers() : null
if (existsSync(a2PapersPath)) {
  console.log(`A2: kept papers.json from parse:motor-docx`)
} else if (a1Source) {
  writeJson(
    a2Dir,
    "papers.json",
    clonePapersForClass(a1Source, "A2", "/content/A1/images", "/content/A2/images"),
  )
  copyA1ImagesToA2()
  console.log(`A2: ${a1Source.papers.length} papers from A1`)
}
writeJson(a2Dir, "chapters.json", buildChapters("A2"))

// B1: papers from B2
const b1Dir = join(ROOT, "database/content/B1")
writeJson(b1Dir, "papers.json", clonePapersForClass(b2Source, "B1", "/content/B2/images", "/content/B2/images"))
writeJson(b1Dir, "chapters.json", buildChapters("B1"))
console.log(`B1: ${b2Source.papers.length} papers from B2`)

console.log("Bootstrap done. Run: npm run migrate:exam-rules && npm run import:content:all")
