import { Module } from "@nestjs/common";
import { FaenaCatalogController } from "./faena-catalog.controller";
import { FaenaCatalogRepository } from "./faena-catalog.repository";
import { FaenaCatalogService } from "./faena-catalog.service";

@Module({
  controllers: [FaenaCatalogController],
  providers: [FaenaCatalogService, FaenaCatalogRepository],
})
export class FaenaCatalogModule {}
