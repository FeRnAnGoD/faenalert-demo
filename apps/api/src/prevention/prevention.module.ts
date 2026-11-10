import { Module } from "@nestjs/common";
import { PreventionController } from "./prevention";
import { PreventionService } from "./prevention.service";
import { PreventionRepository } from "./prevention.repository";
@Module({
  controllers: [PreventionController],
  providers: [PreventionService, PreventionRepository],
})
export class PreventionModule {}
