import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Req,
  Body,
  UseGuards,
  Inject,
  HttpCode,
} from "@nestjs/common";
import { AuthGuard, Actor } from "../auth/auth";
import { OperationsService } from "./operations.service";
interface ActorRequest {
  actor: Actor;
}
@Controller("sites/:siteId/records/:domain")
@UseGuards(AuthGuard)
export class OperationsController {
  constructor(@Inject(OperationsService) private service: OperationsService) {}
  @Get() list(
    @Req() req: ActorRequest,
    @Param("siteId") site: string,
    @Param("domain") name: string,
    @Query() query: unknown,
  ) {
    return this.service.list(req.actor, site, name, query);
  }
  @Post() create(
    @Req() req: ActorRequest,
    @Param("siteId") site: string,
    @Param("domain") name: string,
    @Body() body: unknown,
  ) {
    return this.service.create(req.actor, site, name, body);
  }
  @Get(":id") detail(
    @Req() req: ActorRequest,
    @Param("siteId") site: string,
    @Param("domain") name: string,
    @Param("id") record: string,
  ) {
    return this.service.get(req.actor, site, name, record);
  }
  @Patch(":id") update(
    @Req() req: ActorRequest,
    @Param("siteId") site: string,
    @Param("domain") name: string,
    @Param("id") record: string,
    @Body() body: unknown,
  ) {
    return this.service.update(req.actor, site, name, record, body);
  }
}

@Controller("sites/:siteId/search")
@UseGuards(AuthGuard)
export class WorkspaceSearchController {
  constructor(@Inject(OperationsService) private service: OperationsService) {}
  @Post() @HttpCode(200) search(
    @Req() req: ActorRequest,
    @Param("siteId") site: string,
    @Body() query: unknown,
  ) {
    return this.service.search(req.actor, site, query);
  }
}
