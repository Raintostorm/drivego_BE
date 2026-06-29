import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { SiteContent } from "../../entities/site-content.entity"
import { SiteContentController } from "./site-content.controller"
import { SiteContentService } from "./site-content.service"

@Module({
  imports: [TypeOrmModule.forFeature([SiteContent])],
  controllers: [SiteContentController],
  providers: [SiteContentService],
  exports: [SiteContentService],
})
export class SiteContentModule {}
