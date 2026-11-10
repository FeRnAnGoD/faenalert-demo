import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth";
import { FaenaCatalogService } from "./faena-catalog.service";

@Controller("faena-references")
@UseGuards(AuthGuard)
export class FaenaCatalogController {
  constructor(@Inject(FaenaCatalogService) private service: FaenaCatalogService) {}

  @Get()
  list() {
    return this.service.list();
  }
}
