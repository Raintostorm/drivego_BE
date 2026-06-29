import { Controller, Get } from "@nestjs/common"
import { SiteContentService } from "./site-content.service"

@Controller("site-content")
export class SiteContentController {
  constructor(private readonly service: SiteContentService) {}

  @Get("home")
  home() {
    return this.service.getHomeContent()
  }
}
