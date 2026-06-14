import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
import { fileURLToPath } from "url"

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)))
const CODES = ["A1", "A2", "B1", "B2"]
const RULES = {
  A1: { papersCount: 10, questionsPerPaper: 25, criticalPerPaper: 1 },
  A2: { papersCount: 10, questionsPerPaper: 25, criticalPerPaper: 1 },
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
  let text = value
    .normalize("NFC")
    .replace(/\u0011/g, "a")
    .replace(/\u001b/g, "G")
    .replace(/[\u0000-\u001F]/g, "")
    .replace(/#/g, "a")
    .replace(/!/g, "o")
    .replace(/Q/g, '"')
    .replace(/eơ(?=[a-zà-ỹ])/gu, "eG")
    .replace(/(^|[\s(])ơ(?=[a-zà-ỹ])/gu, "$1G")
    .replace(/ơ(?=[A-ZÀ-ỴĐ])/gu, "G")
    .replace(/(?<=[A-ZÀ-ỴĐ])ơ(?=\b|[\s,.;:])/gu, "G")
    .replace(/phưGng/g, "phương")
    .replace(/PhưGng/g, "Phương")
    .replace(/tưGng/g, "tương")
    .replace(/TưGng/g, "Tương")
    .replace(/dưGng/g, "dương")
    .replace(/DưGng/g, "Dương")
    .replace(/thô ng/g, "thông")
    .replace(/Thô ng/g, "Thông")
    .replace(/\beuan/g, "Quan")
    .replace(/\bEuan/g, "Quan")
    .replace(/(?<=\p{L})1|1(?=\p{L})/gu, "u")
    .replace(/(?<=\p{L})\.(?=\p{L})/gu, "o")
    .replace(/(?<=\p{L})\.(?=\s+\p{Ll})/gu, "o")

  text = text
    .replace(/(^|[\s(])e([A-ZÀ-ỴĐ][^"\n]{1,90}?)e(?=[?.!,)]|$)/gu, '$1"$2"')
    .replace(/\bCHƯƠNG\s+[IVX]+\.?.*$/giu, "")
    .replace(/the\.\./g, "theo.")
    .replace(/nà\.\./g, "nào.")
    .replace(/khôn\.\./g, "không.")
    .replace(/Cả(?=hai|ba|bốn)/g, "Cả ")
    .replace(/Ý(?=\d)/g, "Ý ")

  const stickyWords = [
    "bị",
    "bộ",
    "cấm",
    "chỉ",
    "chở",
    "có",
    "của",
    "dành",
    "để",
    "đến",
    "đường",
    "được",
    "giảm",
    "giới",
    "giữ",
    "hạn",
    "hết",
    "hoặc",
    "kể",
    "khả",
    "không",
    "kỹ",
    "lái",
    "lề",
    "lớn",
    "mặt",
    "mức",
    "người",
    "nhỏ",
    "nơi",
    "phải",
    "phương",
    "rẽ",
    "rộng",
    "sử",
    "sự",
    "thế",
    "thô",
    "thông",
    "thuật",
    "tối",
    "trẻ",
    "trở",
    "từ",
    "tự",
    "tuổi",
    "tốc",
    "toàn",
    "trên",
    "trừ",
    "về",
    "vệ",
    "vị",
    "vụ",
    "xử",
    "xe",
  ]

  for (const word of stickyWords) {
    const capitalized = word.charAt(0).toLocaleUpperCase("vi-VN") + word.slice(1)
    text = text
      .replace(new RegExp(`(^|[^\\p{L}])${word}(?=[a-zà-ỹ])`, "gu"), `$1${word} `)
      .replace(new RegExp(`(^|[^\\p{L}])${capitalized}(?=[a-zà-ỹ])`, "gu"), `$1${capitalized} `)
  }

  return text
    .replace(/thô ng/g, "thông")
    .replace(/Thô ng/g, "Thông")
    .replace(/phưGng/g, "phương")
    .replace(/PhưGng/g, "Phương")
    .replace(/tưGng/g, "tương")
    .replace(/TưGng/g, "Tương")
    .replace(/sưGng/g, "sương")
    .replace(/SưGng/g, "Sương")
    .replace(/thưGng/g, "thương")
    .replace(/ThưGng/g, "Thương")
    .replace(/tốc độ(?=[a-zà-ỹ])/gu, "tốc độ ")
    .replace(/mức độ(?=[a-zà-ỹ])/gu, "mức độ ")
    .replace(/tốc độthiết kế/g, "tốc độ thiết kế")
    .replace(/số(?=lượng|khung|động|thấp)/gu, "số ")
    .replace(/ở(?=mức|nơi|ven|biển|bất)/gu, "ở ")
    .replace(/đỏ(?=sáng)/gu, "đỏ ")
    .replace(/đỗ(?=an toàn|vi phạm)/gu, "đỗ ")
    .replace(/đội(?= mũ|mũ)/gu, "đội ")
    .replace(/Độ i/g, "Đội")
    .replace(/độ i/g, "đội")
    .replace(/giữ a/g, "giữa")
    .replace(/chỉ nh/g, "chỉnh")
    .replace(/hỗtrợ/g, "hỗ trợ")
    .replace(/đỡvà/g, "đỡ và")
    .replace(/điện tử(?=[a-zà-ỹ])/gu, "điện tử ")
    .replace(/tuân thủ(?=[a-zà-ỹ])/gu, "tuân thủ ")
    .replace(/thể(?=hiện)/gu, "thể ")
    .replace(/lở(?=bất)/gu, "lở ")
    .replace(/hộ(?=và)/gu, "hộ ")
    .replace(/Câu(\d+)\./g, "Câu $1. ")
    .replace(/Biểnnày/g, "Biển này")
    .replace(/ké\./g, "kéo")
    .replace(/gia\.\./g, "giao.")
    .replace(/sử a/g, "sửa")
    .replace(/NGi /g, "Nơi ")
    .replace(/độ(?=dốc|tuổi)/gu, "độ ")
    .replace(/tốc độ(?=tối|khai|thiết|quy|cao|nhanh|chậm|cho|sau)/gu, "tốc độ ")
    .replace(/nồng độ(?=cồn)/gu, "nồng độ ")
    .replace(/hơi thở(?=có)/gu, "hơi thở ")
    .replace(/số(?=trên|người|thấp|trong)/gu, "số ")
    .replace(/chỗ(?=không|của|người|tránh)/gu, "chỗ ")
    .replace(/khổ(?=giới)/gu, "khổ ")
    .replace(/cố(?=ý|định)/gu, "cố ")
    .replace(/cơ sở(?=khám)/gu, "cơ sở ")
    .replace(/có thể(?=sử|điều)/gu, "có thể ")
    .replace(/thiết kế(?=nhỏ|lớn|đến)/gu, "thiết kế ")
    .replace(/hệ(?=thống)/gu, "hệ ")
    .replace(/thở(?=có)/gu, "thở ")
    .replace(/đỗ(?=xe|vi phạm|an toàn)/gu, "đỗ ")
    .replace(/cố(?=kỹ thuật)/gu, "cố ")
    .replace(/sự cố(?=kỹ)/gu, "sự cố ")
    .replace(/mở(?=rộng)/gu, "mở ")
    .replace(/hạ(?=xuống)/gu, "hạ ")
    .replace(/nhẹ(?=và)/gu, "nhẹ ")
    .replace(/ở(?=bên|phía|các|tất|trong|một|tốc|nơi)/gu, "ở ")
    .replace(/cm3(?=hoặc)/gu, "cm3 ")
    .replace(/hộ(?=đê)/gu, "hộ ")
    .replace(/sự cố(?=thiên)/gu, "sự cố ")
    .replace(/trên từ ng/g, "trên từng")
    .replace(/từ ng/g, "từng")
    .replace(/dưới đ ây/g, "dưới đây")
    .replace(/emũ bảo hiểm cho người đi mô tô, xe máye/g, '"mũ bảo hiểm cho người đi mô tô, xe máy"')
    .replace(/ e /g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .normalize("NFC")
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
  if (code === "A1" || code === "A2") {
    return papers
  }

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
