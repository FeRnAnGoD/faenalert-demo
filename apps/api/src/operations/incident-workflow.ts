import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Actor, AuthGuard } from "../auth/auth";
import { OperationsService } from "./operations.service";

@Controller("incidents/:incidentId/timeline")
@UseGuards(AuthGuard)
export class IncidentWorkflowController {
  constructor(@Inject(OperationsService) private service: OperationsService) {}

  @Get()
  timeline(
    @Req() req: { actor: Actor },
    @Param("incidentId") incident: string,
    @Query() query: unknown,
  ) {
    return this.service.incidentTimeline(req.actor, incident, query);
  }

  @Post()
  addEntry(
    @Req() req: { actor: Actor },
    @Param("incidentId") incident: string,
    @Body() body: unknown,
  ) {
    return this.service.addIncidentTimelineEntry(req.actor, incident, body);
  }
}
