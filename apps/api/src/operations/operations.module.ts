import { CommitteeRepository } from "../committees/committee.repository";
import { CommitteeService } from "../committees/committee.service";
import { CommitmentsRepository } from "./commitments.repository";
import { CommitmentsService } from "./commitments.service";
import { PeopleService } from "../committees/people.service";
import { OperationsRepository } from "./operations.repository";
import { OperationsService } from "./operations.service";
import { MeetingRepository } from "./meeting.repository";
import { MeetingService } from "./meeting.service";
import { CommitmentsController } from "./commitments";
import { MeetingWorkflowController } from "./meeting-workflow";
import { Module } from "@nestjs/common";
import { OperationsController, WorkspaceSearchController } from "./operations";
import { CommitteesController } from "../committees/committees";
import { TrainingWorkflowController } from "./training-workflow";
import { IncidentWorkflowController } from "./incident-workflow";

@Module({
  providers: [
    CommitteeRepository,
    CommitteeService,
    CommitmentsService,
    CommitmentsRepository,
    PeopleService,
    OperationsRepository,
    OperationsService,
    MeetingRepository,
    MeetingService,
  ],
  imports: [],
  controllers: [
    CommitmentsController,
    OperationsController,
    WorkspaceSearchController,
    CommitteesController,
    MeetingWorkflowController,
    TrainingWorkflowController,
    IncidentWorkflowController,
  ],
})
export class OperationsModule {}
