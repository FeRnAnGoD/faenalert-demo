import {
  Controller,
  Get,
  Post,
  Patch,
  Req,
  Param,
  Body,
  Inject,
  UseGuards,
} from "@nestjs/common";
import { Actor, AuthGuard } from "../auth/auth";
import { CommitteeService } from "./committee.service";
interface ActorRequest {
  actor: Actor;
}
@Controller()
@UseGuards(AuthGuard)
export class CommitteesController {
  constructor(@Inject(CommitteeService) private service: CommitteeService) {}
  @Get("sites/:siteId/committees") list(
    @Req() r: ActorRequest,
    @Param("siteId") site: string,
  ) {
    return this.service.list(r.actor, site);
  }
  @Post("sites/:siteId/committees") create(
    @Req() r: ActorRequest,
    @Param("siteId") site: string,
    @Body() body: unknown,
  ) {
    return this.service.create(r.actor, site, body);
  }
  @Get("committees/:committeeId/members") members(
    @Req() r: ActorRequest,
    @Param("committeeId") id: string,
  ) {
    return this.service.members(r.actor, id);
  }
  @Post("committees/:committeeId/members") add(
    @Req() r: ActorRequest,
    @Param("committeeId") id: string,
    @Body() body: unknown,
  ) {
    return this.service.add(r.actor, id, body);
  }
  @Get("sites/:siteId/people") people(
    @Req() r: ActorRequest,
    @Param("siteId") site: string,
  ) {
    return this.service.people(r.actor, site);
  }
  @Patch("members/:memberId/end") end(
    @Req() r: ActorRequest,
    @Param("memberId") id: string,
    @Body() body: unknown,
  ) {
    return this.service.end(r.actor, id, body);
  }
  @Patch("members/:memberId") update(
    @Req() r: ActorRequest,
    @Param("memberId") id: string,
    @Body() body: unknown,
  ) {
    return this.service.updateMember(r.actor, id, body);
  }
}
