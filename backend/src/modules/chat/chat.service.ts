import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { PremiumService } from "../../common/premium.service"
import { ChatMessage } from "../../entities/chat-message.entity"
import { ChatSession } from "../../entities/chat-session.entity"
import { GeminiService } from "./gemini.service"

const DEMO_REPLIES: Record<string, string> = {
  default:
    "Đây là trợ lý demo DriveGo. Tôi có thể giải thích quy định giao thông cơ bản. Hãy hỏi về biển báo, điểm liệt hoặc mức phạt.",
  "đèn đỏ":
    "Vượt đèn đỏ: phạt 800.000 – 1.000.000 VNĐ (xe máy), có thể tước GPLX 1–3 tháng theo mức độ vi phạm.",
  cồn: "Không uống rượu bia khi lái xe. Vi phạm nồng độ cồn bị phạt nặng, tước GPLX và có thể bị truy cứu hình sự.",
  "điểm liệt":
    "Câu điểm liệt bắt buộc phải trả lời đúng — sai một câu là trượt toàn bài thi lý thuyết.",
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionsRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private readonly messagesRepo: Repository<ChatMessage>,
    private readonly premium: PremiumService,
    private readonly gemini: GeminiService,
  ) {}

  private readonly logger = new Logger(ChatService.name)

  async listSessions(userId: string) {
    const sessions = await this.sessionsRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    })
    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
    }))
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId, userId },
    })
    if (!session) throw new NotFoundException("Không tìm thấy phiên chat")

    const messages = await this.messagesRepo.find({
      where: { sessionId },
      order: { createdAt: "ASC" },
    })

    return {
      id: session.id,
      title: session.title,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    }
  }

  async createSession(userId: string, title?: string) {
    await this.premium.assertPremiumForChat(userId)

    const session = this.sessionsRepo.create({
      userId,
      title: title ?? "Cuộc trò chuyện mới",
    })
    await this.sessionsRepo.save(session)

    const welcome = this.messagesRepo.create({
      sessionId: session.id,
      role: "assistant",
      content: this.gemini.isConfigured()
        ? "Xin chào! Tôi là trợ lý AI DriveGo (Gemini) — hỏi tôi về luật giao thông và ôn GPLX nhé."
        : "Xin chào! Tôi là trợ lý DriveGo — hỏi tôi về luật giao thông nhé.",
    })
    await this.messagesRepo.save(welcome)

    return this.getSession(userId, session.id)
  }

  private demoReply(content: string): string {
    const lower = content.toLowerCase()
    if (lower.includes("đèn đỏ")) return DEMO_REPLIES["đèn đỏ"]
    if (lower.includes("cồn") || lower.includes("rượu")) return DEMO_REPLIES.cồn
    if (lower.includes("điểm liệt")) return DEMO_REPLIES["điểm liệt"]
    return DEMO_REPLIES.default
  }

  private async buildReply(sessionId: string, userContent: string): Promise<string> {
    if (!this.gemini.isConfigured()) {
      return this.demoReply(userContent)
    }

    try {
      const prior = await this.messagesRepo.find({
        where: { sessionId },
        order: { createdAt: "ASC" },
        take: 20,
      })

      const history = prior
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))

      return await this.gemini.generateReply(history, userContent)
    } catch (err) {
      this.logger.warn(
        `Gemini failed, using demo reply: ${err instanceof Error ? err.message : err}`,
      )
      return this.demoReply(userContent)
    }
  }

  async sendMessage(userId: string, sessionId: string, content: string) {
    await this.premium.assertPremiumForChat(userId)

    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId, userId },
    })
    if (!session) throw new NotFoundException("Không tìm thấy phiên chat")

    const trimmed = content.trim()
    if (!trimmed) {
      throw new BadRequestException("Nội dung tin nhắn trống")
    }

    const reply = await this.buildReply(sessionId, trimmed)

    const userMsg = this.messagesRepo.create({
      sessionId,
      role: "user",
      content: trimmed,
    })
    await this.messagesRepo.save(userMsg)

    const assistantMsg = this.messagesRepo.create({
      sessionId,
      role: "assistant",
      content: reply,
    })
    await this.messagesRepo.save(assistantMsg)

    return {
      user: { role: "user", content: trimmed },
      assistant: { role: "assistant", content: reply },
    }
  }
}
