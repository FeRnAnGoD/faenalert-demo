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
} from "@nestjs/common";
import { AuthGuard, Actor } from "../auth/auth";
import { PreventionService } from "./prevention.service";
interface ActorRequest {
  actor: Actor;
}
@Controller()
@UseGuards(AuthGuard)
export class PreventionController {
  constructor(@Inject(PreventionService) private service: PreventionService) {}
  @Get("me") me(@Req() r: ActorRequest) {
    return this.service.me(r.actor);
  }
  @Get("sites") sites(@Req() r: ActorRequest) {
    return this.service.sites(r.actor);
  }
  @Get("sites/:siteId/users") users(
    @Req() r: ActorRequest,
    @Param("siteId") site: string,
  ) {
    return this.service.users(r.actor, site);
  }
  @Get("sites/:siteId/inspections") inspections(
    @Req() r: ActorRequest,
    @Param("siteId") site: string,
    @Query() query: unknown,
  ) {
    return this.service.list(r.actor, site, query);
  }
  @Post("sites/:siteId/inspections") create(
    @Req() r: ActorRequest,
    @Param("siteId") site: string,
    @Body() body: unknown,
  ) {
    return this.service.create(r.actor, site, body);
  }
  @Get("inspections/:inspectionId") detail(
    @Req() r: ActorRequest,
    @Param("inspectionId") id: string,
    @Query() query: unknown,
  ) {
    return this.service.detail(r.actor, id, query);
  }
  @Post("inspections/:inspectionId/findings") finding(
    @Req() r: ActorRequest,
    @Param("inspectionId") id: string,
    @Body() body: unknown,
  ) {
    return this.service.finding(r.actor, id, body);
  }
  @Post("findings/:findingId/actions") action(
    @Req() r: ActorRequest,
    @Param("findingId") id: string,
    @Body() body: unknown,
  ) {
    return this.service.createAction(r.actor, id, body);
  }
  @Get("findings/:findingId/actions") actions(
    @Req() r: ActorRequest,
    @Param("findingId") id: string,
    @Query() query: unknown,
  ) {
    return this.service.actions(r.actor, id, query);
  }
  @Post("commissions/:commissionId/actions") commissionAction(
    @Req() r: ActorRequest,
    @Param("commissionId") id: string,
    @Body() body: unknown,
  ) {
    return this.service.createCommissionAction(r.actor, id, body);
  }
  @Get("commissions/:commissionId/actions") commissionActions(
    @Req() r: ActorRequest,
    @Param("commissionId") id: string,
    @Query() query: unknown,
  ) {
    return this.service.commissionActions(r.actor, id, query);
  }
  @Post("incidents/:incidentId/actions") incidentAction(
    @Req() r: ActorRequest,
    @Param("incidentId") id: string,
    @Body() body: unknown,
  ) {
    return this.service.createIncidentAction(r.actor, id, body);
  }
  @Get("incidents/:incidentId/actions") incidentActions(
    @Req() r: ActorRequest,
    @Param("incidentId") id: string,
    @Query() query: unknown,
  ) {
    return this.service.incidentActions(r.actor, id, query);
  }
  @Patch("actions/:actionId") transition(
    @Req() r: ActorRequest,
    @Param("actionId") id: string,
    @Body() body: unknown,
  ) {
    return this.service.transition(r.actor, id, body);
  }
  @Post("actions/:actionId/evidence") evidence(
    @Req() r: ActorRequest,
    @Param("actionId") id: string,
    @Body() body: unknown,
  ) {
    return this.service.evidence(r.actor, id, body);
  }
  @Post("actions/:actionId/verification") verify(
    @Req() r: ActorRequest,
    @Param("actionId") id: string,
    @Body() body: unknown,
  ) {
    return this.service.verify(r.actor, id, body);
  }
  @Get("actions/:actionId/evidence") evidenceList(
    @Req() r: ActorRequest,
    @Param("actionId") id: string,
    @Query() query: unknown,
  ) {
    return this.service.evidenceList(r.actor, id, query);
  }
}
