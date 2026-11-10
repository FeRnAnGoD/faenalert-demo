import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Actor, AuthGuard } from "../auth/auth";
import { OperationsService } from "./operations.service";

interface ActorRequest {
  actor: Actor;
}

@Controller("trainings/:trainingId")
@UseGuards(AuthGuard)
export class TrainingWorkflowController {
  constructor(@Inject(OperationsService) private service: OperationsService) {}

  @Get("participants")
  participants(
    @Req() req: ActorRequest,
    @Param("trainingId") training: string,
    @Query() query: unknown,
  ) {
    return this.service.participants(req.actor, training, query);
  }

  @Post("participants")
  addParticipant(
    @Req() req: ActorRequest,
    @Param("trainingId") training: string,
    @Body() body: unknown,
  ) {
    return this.service.addParticipant(req.actor, training, body);
  }

  @Patch("participants/:participantId")
  updateParticipant(
    @Req() req: ActorRequest,
    @Param("trainingId") training: string,
    @Param("participantId") participant: string,
    @Body() body: unknown,
  ) {
    return this.service.updateParticipant(req.actor, training, participant, body);
  }

  @Get("evidence")
  evidence(
    @Req() req: ActorRequest,
    @Param("trainingId") training: string,
    @Query() query: unknown,
  ) {
    return this.service.trainingEvidence(req.actor, training, query);
  }

  @Post("evidence")
  addEvidence(
    @Req() req: ActorRequest,
    @Param("trainingId") training: string,
    @Body() body: unknown,
  ) {
    return this.service.addTrainingEvidence(req.actor, training, body);
  }
}
