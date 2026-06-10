import { Module } from "@nestjs/common"
import { RolesGuard } from "../../common/guards/roles.guard"
import { AuthModule } from "../auth/auth.module"
import { HealthController } from "./health.controller"

@Module({
  imports: [AuthModule],
  controllers: [HealthController],
  providers: [RolesGuard],
})
export class HealthModule {}
