import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Actor, AuthGuard } from "../auth/auth";
import { WorkspaceService } from "./workspace.service";

interface ActorRequest {
  actor: Actor;
}

@Controller()
@UseGuards(AuthGuard)
export class WorkspaceController {
  constructor(@Inject(WorkspaceService) private service: WorkspaceService) {}

  @Get("organizations") organizations(@Req() req: ActorRequest) {
    return this.service.organizations(req.actor);
  }

  @Post("organizations") createOrganization(
    @Req() req: ActorRequest,
    @Body() body: unknown,
  ) {
    return this.service.createOrganization(req.actor, body);
  }

  @Get("organizations/:organizationId/sites") sites(
    @Req() req: ActorRequest,
    @Param("organizationId") id: string,
  ) {
    return this.service.sites(req.actor, id);
  }

  @Post("organizations/:organizationId/sites") createSite(
    @Req() req: ActorRequest,
    @Param("organizationId") id: string,
    @Body() body: unknown,
  ) {
    return this.service.createSite(req.actor, id, body);
  }

  @Put("organizations/:organizationId") updateOrganization(
    @Req() req: ActorRequest,
    @Param("organizationId") id: string,
    @Body() body: unknown,
  ) {
    return this.service.updateOrganization(req.actor, id, body);
  }

  @Put("sites/:siteId") updateSite(
    @Req() req: ActorRequest,
    @Param("siteId") id: string,
    @Body() body: unknown,
  ) {
    return this.service.updateSite(req.actor, id, body);
  }

  @Get("roles") roles(@Req() req: ActorRequest) {
    return this.service.roles(req.actor);
  }

  @Get("platform/users") users(@Req() req: ActorRequest) {
    return this.service.users(req.actor);
  }

  @Get("sites/:siteId/access-candidates") accessCandidates(
    @Req() req: ActorRequest,
    @Param("siteId") site: string,
  ) {
    return this.service.accessCandidates(req.actor, site);
  }

  @Get("organizations/:organizationId/users") organizationUsers(
    @Req() req: ActorRequest,
    @Param("organizationId") id: string,
  ) {
    return this.service.organizationUsers(req.actor, id);
  }

  @Put("sites/:siteId/users/:userId") assignUser(
    @Req() req: ActorRequest,
    @Param("siteId") site: string,
    @Param("userId") user: string,
    @Body() body: unknown,
  ) {
    return this.service.assignUser(req.actor, site, user, body);
  }

  @Delete("sites/:siteId/users/:userId") revokeUser(
    @Req() req: ActorRequest,
    @Param("siteId") site: string,
    @Param("userId") user: string,
  ) {
    return this.service.revokeUser(req.actor, site, user);
  }
}
