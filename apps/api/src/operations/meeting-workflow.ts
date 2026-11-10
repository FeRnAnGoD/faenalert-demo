import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  Inject,
} from "@nestjs/common";
import { AuthGuard, Actor } from "../auth/auth";
import { MeetingService } from "./meeting.service";
interface ActorRequest {
  actor: Actor;
}
@Controller()
@UseGuards(AuthGuard)
export class MeetingWorkflowController {
  constructor(@Inject(MeetingService) private service: MeetingService) {}
  @Get("meetings/:id/workspace") workspace(
    @Req() r: ActorRequest,
    @Param("id") id: string,
    @Query() query: unknown,
  ) {
    return this.service.workspace(r.actor, id, query);
  }
  @Get("meetings/:id/attendance") attendance(
    @Req() r: ActorRequest,
    @Param("id") id: string,
  ) {
    return this.service.attendance(r.actor, id);
  }
  @Patch("meetings/:id/attendance") saveAttendance(
    @Req() r: ActorRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.saveAttendance(r.actor, id, body);
  }
  @Patch("meetings/:id/agenda") agenda(
    @Req() r: ActorRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.agenda(r.actor, id, body);
  }
  @Post("meetings/:id/minutes") generate(
    @Req() r: ActorRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.generate(r.actor, id, body);
  }
  @Patch("minutes/:id/draft") draft(
    @Req() r: ActorRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.draft(r.actor, id, body);
  }
  @Get("minutes/:id/revisions") revisions(
    @Req() r: ActorRequest,
    @Param("id") id: string,
    @Query() query: unknown,
  ) {
    return this.service.revisions(r.actor, id, query);
  }
  @Post("minutes/:id/agreements") agreement(
    @Req() r: ActorRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.agreement(r.actor, id, body);
  }
  @Patch("agreements/:id") transition(
    @Req() r: ActorRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.transition(r.actor, id, body);
  }
  @Get("agreements/:id/evidence") agreementEvidence(
    @Req() r: ActorRequest,
    @Param("id") id: string,
    @Query() query: unknown,
  ) {
    return this.service.agreementEvidence(r.actor, id, query);
  }
  @Post("agreements/:id/evidence") addAgreementEvidence(
    @Req() r: ActorRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.addAgreementEvidence(r.actor, id, body);
  }
  @Post("agreements/:id/verification") verifyAgreement(
    @Req() r: ActorRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.verifyAgreement(r.actor, id, body);
  }
}
