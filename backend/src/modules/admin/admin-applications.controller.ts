import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common"
import { ZipArchive } from "archiver"
import type { Response } from "express"
import { Roles } from "../../common/decorators/roles.decorator"
import { CurrentUser } from "../../common/current-user.decorator"
import { RolesGuard } from "../../common/guards/roles.guard"
import { AuthUser } from "../auth/jwt.strategy"
import { JwtAuthGuard } from "../auth/jwt-auth.guard"
import { AdminApplicationsService } from "./admin-applications.service"
import { PatchApplicationAdminDto } from "./dto/patch-application-admin.dto"
import { RequestDossierDto } from "./dto/request-dossier.dto"

@Controller("admin/applications")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("center_admin", "system_admin")
export class AdminApplicationsController {
  constructor(private readonly service: AdminApplicationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query("status") status?: string,
    @Query("licenseClass") licenseClass?: string,
  ) {
    return this.service.list(user, status, licenseClass)
  }

  @Get("documents/:documentId/file")
  async downloadFile(
    @CurrentUser() user: AuthUser,
    @Param("documentId") documentId: string,
    @Res() res: Response,
  ) {
    const { stream, mimeType, originalName } =
      await this.service.getDocumentFile(user, documentId)
    res.setHeader("Content-Type", mimeType)
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(originalName)}"`,
    )
    stream.pipe(res)
  }

  @Get(":id/documents/archive")
  async downloadArchive(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const archive = new ZipArchive({ zlib: { level: 9 } })
    archive.on("error", (error: Error) => {
      if (!res.headersSent) {
        res.status(500).json({ message: "Không tạo được file ZIP" })
        return
      }
      res.destroy(error)
    })

    const { filename } = await this.service.appendDocumentsArchive(user, id, archive)
    res.setHeader("Content-Type", "application/zip")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(filename)}"`,
    )
    archive.pipe(res)
    await archive.finalize()
  }

  @Get(":id")
  getOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.service.getOne(user, id)
  }

  @Patch(":id")
  patch(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: PatchApplicationAdminDto,
  ) {
    return this.service.patchStatus(user, id, body)
  }

  @Post(":id/request-dossier")
  requestDossier(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: RequestDossierDto,
  ) {
    return this.service.requestDossier(user, id, body)
  }
}
