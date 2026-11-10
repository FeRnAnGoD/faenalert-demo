import { MeetingRepository } from "./meeting.repository";
import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { z } from "zod";
import { PoolClient } from "pg";
import { DomainContext } from "../common/domain-context";
import { Actor } from "../auth/auth";
import { id, pagination } from "../prevention/schemas";
import { domain, domains } from "./catalog";
import { OperationsRepository } from "./operations.repository";
import {
  incidentTimelineEntrySchema,
  trainingEvidenceSchema,
  trainingParticipantCreateSchema,
  trainingParticipantUpdateSchema,
} from "./training.schemas";
const workspaceSearchQuery = z.object({ q: z.string().trim().min(2).max(100) }).strict();
@Injectable()
export class OperationsService {
  constructor(
    @Inject(DomainContext) private context: DomainContext,
    @Inject(OperationsRepository) private repo: OperationsRepository,
    @Inject(MeetingRepository) private documents: MeetingRepository,
  ) {}
  incidentTimeline(actor: Actor, incident: string, query: unknown) {
    const { page, pageSize } = pagination.parse(query);
    return this.context.db.read(async (c) => {
      const row = await this.repo.incident(c, id.parse(incident));
      if (!row) throw new NotFoundException();
      await this.context.access(c, actor, row.site_id);
      return this.repo.incidentTimeline(c, row.id, page, pageSize);
    });
  }
  addIncidentTimelineEntry(actor: Actor, incident: string, body: unknown) {
    const input = incidentTimelineEntrySchema.parse(body);
    return this.context.db.transaction(async (c) => {
      const row = await this.repo.incident(c, id.parse(incident));
      if (!row) throw new NotFoundException();
      await this.context.access(c, actor, row.site_id, true);
      const entry = await this.repo.createIncidentTimelineEntry(
        c,
        row.id,
        row.site_id,
        actor.id,
        input.eventAt,
        input.description,
      );
      const metadata = await this.context.audit(
        c,
        actor,
        row.site_id,
        entry.id,
        "incident.timeline_entry.created",
        { incidentId: row.id },
      );
      return { ...entry, ...metadata };
    });
  }
  private async authorizedTraining(
    c: PoolClient,
    actor: Actor,
    training: string,
    write = false,
  ) {
    const row = await this.repo.training(c, id.parse(training));
    if (!row) throw new NotFoundException();
    await this.context.access(c, actor, row.site_id, write);
    return row;
  }
  participants(actor: Actor, training: string, query: unknown) {
    const { page, pageSize } = pagination.parse(query);
    return this.context.db.read(async (c) => {
      await this.authorizedTraining(c, actor, training);
      return this.repo.participants(c, training, page, pageSize);
    });
  }
  addParticipant(actor: Actor, training: string, body: unknown) {
    const input = trainingParticipantCreateSchema.parse(body);
    return this.context.db.transaction(async (c) => {
      const row = await this.authorizedTraining(c, actor, training, true);
      const participant = await this.repo.createParticipant(
        c,
        row.id,
        row.site_id,
        input.participant_name,
      );
      const metadata = await this.context.audit(
        c,
        actor,
        row.site_id,
        participant.id,
        "training_participant.created",
      );
      return { ...participant, ...metadata };
    });
  }
  updateParticipant(
    actor: Actor,
    training: string,
    participantId: string,
    body: unknown,
  ) {
    const input = trainingParticipantUpdateSchema.parse(body);
    return this.context.db.transaction(async (c) => {
      const trainingRow = await this.authorizedTraining(c, actor, training, true);
      const existing = await this.repo.participant(
        c,
        trainingRow.id,
        id.parse(participantId),
        true,
      );
      if (!existing) throw new NotFoundException();
      if (existing.version !== input.version)
        throw new ConflictException("La asistencia cambió; vuelve a cargar la lista");
      const participant = await this.repo.updateParticipant(
        c,
        existing.id,
        input.participant_name ?? existing.participant_name,
        input.attended === undefined ? existing.attended : input.attended,
      );
      const metadata = await this.context.audit(
        c,
        actor,
        trainingRow.site_id,
        participant.id,
        "training_participant.updated",
        { fromVersion: input.version, toVersion: participant.version },
      );
      return { ...participant, ...metadata };
    });
  }
  trainingEvidence(actor: Actor, training: string, query: unknown) {
    const { page, pageSize } = pagination.parse(query);
    return this.context.db.read(async (c) => {
      await this.authorizedTraining(c, actor, training);
      return this.repo.trainingEvidence(c, training, page, pageSize);
    });
  }
  addTrainingEvidence(actor: Actor, training: string, body: unknown) {
    const input = trainingEvidenceSchema.parse(body);
    return this.context.db.transaction(async (c) => {
      const row = await this.authorizedTraining(c, actor, training, true);
      const evidence = await this.repo.createTrainingEvidence(
        c,
        row.id,
        row.site_id,
        actor.id,
        input.description,
      );
      const metadata = await this.context.audit(
        c,
        actor,
        row.site_id,
        evidence.id,
        "training_evidence.created",
      );
      return { ...evidence, ...metadata };
    });
  }
  list(actor: Actor, site: string, name: string, query: unknown) {
    const table = domain(name),
      { page, pageSize } = pagination.parse(query);
    return this.context.db.read(async (c) => {
      await this.context.access(c, actor, site);
      return this.repo.list(c, table, site, page, pageSize);
    });
  }
  search(actor: Actor, site: string, query: unknown) {
    const { q } = workspaceSearchQuery.parse(query);
    const siteId = id.parse(site);
    return this.context.db.read(async (c) => {
      await this.context.access(c, actor, siteId);
      return this.repo.search(c, siteId, q);
    });
  }
  get(actor: Actor, site: string, name: string, record: string) {
    const table = domain(name);
    return this.context.db.read(async (c) => {
      await this.context.access(c, actor, site);
      const row = await this.repo.find(c, table, site, id.parse(record));
      if (!row) throw new NotFoundException();
      return row;
    });
  }
  create(actor: Actor, site: string, name: string, body: unknown) {
    const table = domain(name),
      input = domains[table].parse(body);
    return this.context.db.transaction(async (c) => {
      await this.context.access(c, actor, site, true);
      if (
        table === "meetings" &&
        !(await this.repo.committeeIsValid(
          c,
          (input as { committee_id: string }).committee_id,
          site,
          (input as { scheduled_at: string }).scheduled_at,
        ))
      )
        throw new UnprocessableEntityException(
          "El comité no pertenece a esta faena o su período no cubre la fecha de reunión",
        );
      const row = await this.repo.insert(c, table, site, input);
      if (table === "minutes") await this.documents.revision(c, row, actor.id);
      const metadata = await this.context.audit(
        c,
        actor,
        site,
        row.id,
        table + ".created",
      );
      return { ...row, ...metadata };
    });
  }
  update(
    actor: Actor,
    site: string,
    name: string,
    record: string,
    body: unknown,
  ) {
    const table = domain(name),
      { version, ...fields } = z
        .object({ version: z.number().int().positive() })
        .passthrough()
        .parse(body),
      input = domains[table].parse(fields);
    return this.context.db.transaction(async (c) => {
      await this.context.access(c, actor, site, true);
      if (
        table === "meetings" &&
        !(await this.repo.committeeIsValid(
          c,
          (input as { committee_id: string }).committee_id,
          site,
          (input as { scheduled_at: string }).scheduled_at,
        ))
      )
        throw new UnprocessableEntityException(
          "Comité o período inválido para esta reunión",
        );
      if (table === "minutes") {
        const previous = await this.repo.find(
          c,
          table,
          site,
          id.parse(record),
          true,
        );
        if (previous)
          await this.documents.captureIfMissing(c, previous, actor.id);
      }
      const row = await this.repo.replace(
        c,
        table,
        site,
        id.parse(record),
        version,
        input,
      );
      if (!row)
        throw new ConflictException(
          "El registro cambió o requiere su editor específico",
        );
      if (table === "minutes") await this.documents.revision(c, row, actor.id);
      const metadata = await this.context.audit(
        c,
        actor,
        site,
        row.id,
        table + ".updated",
        {
          fromVersion: version,
          toVersion: row.version,
        },
      );
      return { ...row, ...metadata };
    });
  }
}
