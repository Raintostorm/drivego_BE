import { Controller, Get, Query } from "@nestjs/common"
import { LookupService } from "./lookup.service"

@Controller("lookup")
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  @Get("centers")
  listCenters() {
    return this.lookupService.listCenters()
  }

  @Get()
  lookup(@Query("code") code?: string) {
    return this.lookupService.search(code ?? "")
  }
}
