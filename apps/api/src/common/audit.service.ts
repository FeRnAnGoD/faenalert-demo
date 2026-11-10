import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { Actor } from "../auth/auth";
const tables: Record<string, string> = {
  inspection: "inspections",
  finding: "findings",
  action: "actions",
  agreement: "agreements",
  minute: "minutes",
  committee: "committees",
  member: "members",
  meetings: "meetings",
  minutes: "minutes",
  trainings: "trainings",
  training_participant: "training_participants",
  commissions: "commissions",
  incidents: "incidents",
  documents: "documents",
};
@Injectable()
export class AuditService {
  async record(
    c: PoolClient,
    actor: Actor,
    site: string,
    entity: string,
    event: string,
    details: unknown = {},
  ) {
    const table = tables[event.split(".")[0]];
    let metadata: Record<string, unknown> = {};
    if (table)
      metadata =
        (
          await c.query(
            "UPDATE " +
              table +
              " SET created_by=CASE WHEN $3 THEN $2 ELSE created_by END,updated_by=$2 WHERE id=$1 RETURNING created_by,updated_by,updated_at",
            [entity, actor.id, event.endsWith(".created")],
          )
        ).rows[0] ?? {};
    await c.query(
      "INSERT INTO audit_events(site_id,actor_id,entity_id,event,details) VALUES($1,$2,$3,$4,$5)",
      [site, actor.id, entity, event, JSON.stringify(details)],
    );
    return metadata;
  }
}
