import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PoolClient } from "pg";
import { Actor } from "../auth/auth";
import { DomainContext } from "../common/domain-context";
import {
  id,
  inspectionSchema,
  findingSchema,
  actionSchema,
  transitionSchema,
  verificationSchema,
  pagination,
  canTransition,
} from "./schemas";
import { PreventionRepository } from "./prevention.repository";
@Injectable()
export class PreventionService {
  constructor(
    @Inject(DomainContext) private context: DomainContext,
    @Inject(PreventionRepository) private repo: PreventionRepository,
  ) {}
  private async inspection(
    c: PoolClient,
    actor: Actor,
    record: string,
    write = false,
  ) {
    const row = await this.repo.inspection(c, id.parse(record));
    if (!row) throw new NotFoundException();
    await this.context.access(c, actor, row.site_id, write);
    return row;
  }
  private async action(
    c: PoolClient,
    actor: Actor,
    record: string,
    write = false,
  ) {
    const row = await this.repo.action(c, id.parse(record));
    if (!row) throw new NotFoundException();
    await this.context.access(c, actor, row.site_id, write);
    return write ? this.repo.action(c, record, true) : row;
  }
  me(actor: Actor) {
    return this.context.db.read((c) => this.repo.me(c, actor.id));
  }
  sites(actor: Actor) {
    return this.context.db.read(async (c) => ({
      items: await this.repo.sites(c, actor.id),
    }));
  }
  users(actor: Actor, site: string) {
    return this.context.db.read(async (c) => {
      await this.context.access(c, actor, site);
      return { items: await this.repo.users(c, site) };
    });
  }
  list(actor: Actor, site: string, query: unknown) {
    const { page, pageSize } = pagination.parse(query);
    return this.context.db.read(async (c) => {
      await this.context.access(c, actor, site);
      return this.repo.inspections(c, site, page, pageSize);
    });
  }
  create(actor: Actor, site: string, body: unknown) {
    const input = inspectionSchema.parse(body);
    return this.context.db.transaction(async (c) => {
      await this.context.access(c, actor, site, true);
      await this.context.access(c, { id: input.inspectorId }, site);
      const row = await this.repo.createInspection(c, site, input);
      const metadata = await this.context.audit(
        c,
        actor,
        site,
        row.id,
        "inspection.created",
      );
      return { ...row, ...metadata };
    });
  }
  detail(actor: Actor, inspection: string, query: unknown) {
    const { page } = pagination.parse(query);
    return this.context.db.read(async (c) => {
      const row = await this.inspection(c, actor, inspection);
      const findingsPage = await this.repo.findings(c, inspection, page);
      const stats = await this.repo.stats(c, inspection);
      return { ...row, findings: findingsPage.items, findingsPage, stats };
    });
  }
  finding(actor: Actor, inspection: string, body: unknown) {
    const input = findingSchema.parse(body);
    return this.context.db.transaction(async (c) => {
      const row = await this.inspection(c, actor, inspection, true);
      const finding = await this.repo.createFinding(
        c,
        inspection,
        input.description,
      );
      const metadata = await this.context.audit(
        c,
        actor,
        row.site_id,
        finding.id,
        "finding.created",
      );
      return { ...finding, ...metadata };
    });
  }
  createAction(actor: Actor, findingId: string, body: unknown) {
    const input = actionSchema.parse(body);
    return this.context.db.transaction(async (c) => {
      const finding = await this.repo.finding(c, id.parse(findingId));
      if (!finding) throw new NotFoundException();
      await this.context.access(c, actor, finding.site_id, true);
      await this.context.access(
        c,
        { id: input.ownerId },
        finding.site_id,
        true,
      );
      const row = await this.repo.createAction(c, findingId, input);
      const metadata = await this.context.audit(
        c,
        actor,
        finding.site_id,
        row.id,
        "action.created",
      );
      return { ...row, ...metadata };
    });
  }
  actions(actor: Actor, findingId: string, query: unknown) {
    const { page } = pagination.parse(query);
    return this.context.db.read(async (c) => {
      const finding = await this.repo.finding(c, id.parse(findingId));
      if (!finding) throw new NotFoundException();
      await this.context.access(c, actor, finding.site_id);
      return this.repo.actions(c, findingId, page);
    });
  }
  createCommissionAction(actor: Actor, commissionId: string, body: unknown) {
    const input = actionSchema.parse(body);
    return this.context.db.transaction(async (c) => {
      const commission = await this.repo.commission(c, id.parse(commissionId));
      if (!commission) throw new NotFoundException();
      await this.context.access(c, actor, commission.site_id, true);
      await this.context.access(c, { id: input.ownerId }, commission.site_id, true);
      const row = await this.repo.createCommissionAction(
        c,
        commissionId,
        input,
      );
      const metadata = await this.context.audit(
        c,
        actor,
        commission.site_id,
        row.id,
        "action.created",
        { source: "COMMISSION", sourceId: commissionId },
      );
      return { ...row, ...metadata };
    });
  }
  commissionActions(actor: Actor, commissionId: string, query: unknown) {
    const { page } = pagination.parse(query);
    return this.context.db.read(async (c) => {
      const commission = await this.repo.commission(c, id.parse(commissionId));
      if (!commission) throw new NotFoundException();
      await this.context.access(c, actor, commission.site_id);
      return this.repo.commissionActions(c, commissionId, page);
    });
  }
  createIncidentAction(actor: Actor, incidentId: string, body: unknown) {
    const input = actionSchema.parse(body);
    return this.context.db.transaction(async (c) => {
      const incident = await this.repo.incident(c, id.parse(incidentId));
      if (!incident) throw new NotFoundException();
      await this.context.access(c, actor, incident.site_id, true);
      await this.context.access(c, { id: input.ownerId }, incident.site_id, true);
      const row = await this.repo.createIncidentAction(
        c,
        incident.id,
        input,
      );
      const metadata = await this.context.audit(
        c,
        actor,
        incident.site_id,
        row.id,
        "action.created",
        { source: "INCIDENT", sourceId: incident.id },
      );
      return { ...row, ...metadata };
    });
  }
  incidentActions(actor: Actor, incidentId: string, query: unknown) {
    const { page } = pagination.parse(query);
    return this.context.db.read(async (c) => {
      const incident = await this.repo.incident(c, id.parse(incidentId));
      if (!incident) throw new NotFoundException();
      await this.context.access(c, actor, incident.site_id);
      return this.repo.incidentActions(c, incident.id, page);
    });
  }
  transition(actor: Actor, action: string, body: unknown) {
    const input = transitionSchema.parse(body);
    return this.context.db.transaction(async (c) => {
      const row = await this.action(c, actor, action, true);
      if (
        row.version !== input.version ||
        !canTransition(row.status, input.status)
      )
        throw new ConflictException("Estado o versión de acción inválida");
      if (
        input.status === "PENDING_VERIFICATION" &&
        !(await this.repo.hasEvidence(c, action))
      )
        throw new ConflictException(
          "Registra evidencia antes de solicitar cierre",
        );
      const updated = await this.repo.changeAction(c, action, input.status);
      const metadata = await this.context.audit(
        c,
        actor,
        row.site_id,
        action,
        "action.transition",
        { from: row.status, to: input.status },
      );
      return { ...updated, ...metadata };
    });
  }
  evidence(actor: Actor, action: string, body: unknown) {
    const input = findingSchema.parse(body);
    return this.context.db.transaction(async (c) => {
      const row = await this.action(c, actor, action, true);
      if (row.status === "CLOSED")
        throw new ConflictException("La acción está cerrada");
      const evidence = await this.repo.createEvidence(
        c,
        action,
        actor.id,
        input.description,
      );
      await this.context.audit(
        c,
        actor,
        row.site_id,
        action,
        "evidence.created",
      );
      return evidence;
    });
  }
  verify(actor: Actor, action: string, body: unknown) {
    const input = verificationSchema.parse(body);
    return this.context.db.transaction(async (c) => {
      const visible = await this.action(c, actor, action);
      await this.context.permissions.authorize(
        c,
        actor,
        visible.site_id,
        "review",
      );
      const row = await this.repo.action(c, id.parse(action), true);
      if (!row) throw new NotFoundException();
      if (row.owner_id === actor.id)
        throw new ForbiddenException(
          "El responsable no puede verificar su propia acción",
        );
      if (
        row.status !== "PENDING_VERIFICATION" ||
        row.version !== input.version
      )
        throw new ConflictException("Estado o versión de acción inválida");
      await this.repo.verify(c, action, actor.id, input.approved, input.note);
      const updated = await this.repo.changeAction(
        c,
        action,
        input.approved ? "CLOSED" : "IN_PROGRESS",
      );
      const metadata = await this.context.audit(
        c,
        actor,
        row.site_id,
        action,
        "action.verified",
        { approved: input.approved, from: row.status, to: updated.status },
      );
      return { ...updated, ...metadata };
    });
  }
  evidenceList(actor: Actor, action: string, query: unknown) {
    const { page } = pagination.parse(query);
    return this.context.db.read(async (c) => {
      await this.action(c, actor, action);
      return this.repo.evidence(c, action, page);
    });
  }
}
