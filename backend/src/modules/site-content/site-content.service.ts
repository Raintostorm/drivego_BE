import { Injectable } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { SiteContent } from "../../entities/site-content.entity"
import { DEFAULT_HOME_CONTENT, normalizeHomeContent } from "./default-site-content"

@Injectable()
export class SiteContentService {
  constructor(
    @InjectRepository(SiteContent)
    private readonly siteContentRepo: Repository<SiteContent>,
  ) {}

  async getHomeContent() {
    const row = await this.siteContentRepo.findOne({ where: { key: "home" } })
    return normalizeHomeContent(row?.value ?? DEFAULT_HOME_CONTENT)
  }

  async updateHomeContent(value: unknown) {
    const normalized = normalizeHomeContent(value)
    await this.siteContentRepo.save({ key: "home", value: normalized })
    return normalized
  }
}
