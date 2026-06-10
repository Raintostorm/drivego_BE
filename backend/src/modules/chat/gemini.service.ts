import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

const SYSTEM_PROMPT = `Bạn là trợ lý AI của DriveGo — nền tảng ôn thi GPLX tại Việt Nam.
Nhiệm vụ: giải thích quy định giao thông, biển báo, kỹ năng lái xe, điểm liệt, mức phạt (tham chiếu luật VN, không bịa số liệu).
Trả lời ngắn gọn, rõ ràng, tiếng Việt. Nếu không chắc, nói rõ và khuyên học viên xem tài liệu chính thức hoặc hỏi giáo viên.
Không đưa lời khuyên nguy hiểm hoặc vi phạm pháp luật.`

type GeminiContent = {
  role: "user" | "model"
  parts: { text: string }[]
}

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] }
  }[]
  error?: { message?: string }
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name)

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const key = this.config.get<string>("GEMINI_API_KEY")
    return Boolean(key?.trim())
  }

  async generateReply(
    history: { role: "user" | "assistant"; content: string }[],
    userMessage: string,
  ): Promise<string> {
    const apiKey = this.config.get<string>("GEMINI_API_KEY")?.trim()
    if (!apiKey) {
      this.logger.warn("Gemini unavailable: missing GEMINI_API_KEY")
      throw new ServiceUnavailableException(
        "AI hiện tạm thời chưa sẵn sàng. Vui lòng thử lại sau.",
      )
    }

    const model = this.config.get<string>("GEMINI_MODEL")?.trim() || "gemini-2.0-flash"
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

    const contents: GeminiContent[] = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }))
    contents.push({ role: "user", parts: [{ text: userMessage }] })

    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    }

    let response: Response
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    } catch (err) {
      this.logger.error("Gemini network error", err)
      throw new ServiceUnavailableException("AI hiện tạm thời chưa sẵn sàng. Vui lòng thử lại sau.")
    }

    const data = (await response.json()) as GeminiResponse

    if (!response.ok) {
      const msg = data.error?.message ?? response.statusText
      this.logger.warn(`Gemini HTTP ${response.status}: ${msg}`)
      throw new ServiceUnavailableException(
        "AI hiện tạm thời chưa sẵn sàng. Vui lòng thử lại sau.",
      )
    }

    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim()

    if (!text) {
      this.logger.warn("Gemini returned an empty response")
      throw new ServiceUnavailableException("AI hiện tạm thời chưa sẵn sàng. Vui lòng thử lại sau.")
    }

    return text
  }
}
