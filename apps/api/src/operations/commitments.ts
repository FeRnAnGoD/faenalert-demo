import {
  Controller,
  Get,
  Query,
  Param,
  Req,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { AuthGuard, Actor } from "../auth/auth";
import { CommitmentsService } from "./commitments.service";
@Controller("sites/:siteId/commitments")
@UseGuards(AuthGuard)
export class CommitmentsController {
  constructor(
    @Inject(CommitmentsService) private service: CommitmentsService,
  ) {}
  @Get() list(
    @Req() req: { actor: Actor },
    @Param("siteId") site: string,
    @Query() query: unknown,
  ) {
    return this.service.list(req.actor, site, query);
  }
}
