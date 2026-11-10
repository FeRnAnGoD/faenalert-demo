import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
@Injectable()
export class PreventionRepository {
  async incident(c: PoolClient, id: string) {
    return (await c.query("SELECT id,site_id FROM incidents WHERE id=$1", [id]))
      .rows[0];
  }
  async createIncidentAction(
    c: PoolClient,
    incident: string,
    input: { title: string; ownerId: string; dueOn: string; priority: string },
  ) {
    return (
      await c.query(
        "INSERT INTO actions(incident_id,title,owner_id,due_on,priority) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [incident, input.title, input.ownerId, input.dueOn, input.priority],
      )
    ).rows[0];
  }
  async incidentActions(c: PoolClient, incident: string, page: number) {
    return {
      items: (
        await c.query(
          "SELECT * FROM actions WHERE incident_id=$1 ORDER BY created_at,id LIMIT 20 OFFSET $2",
          [incident, (page - 1) * 20],
        )
      ).rows,
      total: (
        await c.query(
          "SELECT count(*)::int AS total FROM actions WHERE incident_id=$1",
          [incident],
        )
      ).rows[0].total,
      page,
      pageSize: 20,
    };
  }
  async stats(c: PoolClient, inspection: string) {
    return (
      await c.query(
        "SELECT count(*)::int AS actions,count(*) FILTER(WHERE a.status='CLOSED')::int AS closed FROM actions a JOIN findings f ON f.id=a.finding_id WHERE f.inspection_id=$1",
        [inspection],
      )
    ).rows[0];
  }
  async me(c: PoolClient, user: string) {
    return (
      await c.query(
        `SELECT u.id,u.name,u.email,
          COALESCE((SELECT array_agg(upa.role_code ORDER BY upa.role_code)
            FROM user_platform_access upa WHERE upa.user_id=u.id),'{}') AS platform_roles
        FROM users u WHERE u.id=$1`,
        [user],
      )
    ).rows[0];
  }
  async sites(c: PoolClient, user: string) {
    return (
      await c.query(
        "SELECT s.id,s.name,a.role,r.name AS role_name,r.permissions,s.organization_id,o.name AS organization_name FROM sites s JOIN organizations o ON o.id=s.organization_id JOIN site_access a ON a.site_id=s.id JOIN roles r ON r.code=a.role WHERE a.user_id=$1 AND a.revoked_at IS NULL AND s.active=true AND o.active=true ORDER BY o.name,s.name",
        [user],
      )
    ).rows;
  }
  async users(c: PoolClient, site: string) {
    return (
      await c.query(
        "SELECT u.id,u.name,a.role,r.name AS role_name,r.permissions FROM users u JOIN site_access a ON a.user_id=u.id JOIN roles r ON r.code=a.role WHERE a.site_id=$1 AND a.revoked_at IS NULL AND u.active=true ORDER BY u.name",
        [site],
      )
    ).rows;
  }
  async inspections(
    c: PoolClient,
    site: string,
    page: number,
    pageSize: number,
  ) {
    const items = (
      await c.query(
        "SELECT * FROM inspections WHERE site_id=$1 ORDER BY created_at DESC,id LIMIT $2 OFFSET $3",
        [site, pageSize, (page - 1) * pageSize],
      )
    ).rows;
    const total = (
      await c.query(
        "SELECT count(*)::int AS total FROM inspections WHERE site_id=$1",
        [site],
      )
    ).rows[0].total;
    return { items, total, page, pageSize };
  }
  async createInspection(
    c: PoolClient,
    site: string,
    input: {
      title: string;
      area: string;
      inspectedOn: string;
      inspectorId: string;
    },
  ) {
    return (
      await c.query(
        "INSERT INTO inspections(site_id,title,area,inspected_on,inspector_id) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [site, input.title, input.area, input.inspectedOn, input.inspectorId],
      )
    ).rows[0];
  }
  async inspection(c: PoolClient, id: string) {
    return (await c.query("SELECT * FROM inspections WHERE id=$1", [id]))
      .rows[0];
  }
  async findings(c: PoolClient, inspection: string, page: number) {
    const items = (
      await c.query(
        "SELECT f.*,COALESCE((SELECT jsonb_agg(a ORDER BY a.created_at,a.id) FROM (SELECT * FROM actions WHERE finding_id=f.id ORDER BY created_at,id LIMIT 20) a),'[]') AS actions,(SELECT count(*)::int FROM actions WHERE finding_id=f.id) AS actions_total FROM findings f WHERE f.inspection_id=$1 ORDER BY f.created_at,f.id LIMIT 20 OFFSET $2",
        [inspection, (page - 1) * 20],
      )
    ).rows;
    const total = (
      await c.query(
        "SELECT count(*)::int AS total FROM findings WHERE inspection_id=$1",
        [inspection],
      )
    ).rows[0].total;
    return { items, total, page, pageSize: 20 };
  }
  async createFinding(c: PoolClient, inspection: string, description: string) {
    return (
      await c.query(
        "INSERT INTO findings(inspection_id,description) VALUES($1,$2) RETURNING *",
        [inspection, description],
      )
    ).rows[0];
  }
  async finding(c: PoolClient, id: string) {
    return (
      await c.query(
        "SELECT f.*,i.site_id FROM findings f JOIN inspections i ON i.id=f.inspection_id WHERE f.id=$1",
        [id],
      )
    ).rows[0];
  }
  async createAction(
    c: PoolClient,
    finding: string,
    input: { title: string; ownerId: string; dueOn: string; priority: string },
  ) {
    return (
      await c.query(
        "INSERT INTO actions(finding_id,title,owner_id,due_on,priority) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [finding, input.title, input.ownerId, input.dueOn, input.priority],
      )
    ).rows[0];
  }
  async commission(c: PoolClient, id: string) {
    return (
      await c.query("SELECT id,site_id FROM commissions WHERE id=$1", [id])
    ).rows[0];
  }
  async createCommissionAction(
    c: PoolClient,
    commission: string,
    input: { title: string; ownerId: string; dueOn: string; priority: string },
  ) {
    return (
      await c.query(
        "INSERT INTO actions(commission_id,title,owner_id,due_on,priority) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [commission, input.title, input.ownerId, input.dueOn, input.priority],
      )
    ).rows[0];
  }
  async commissionActions(c: PoolClient, commission: string, page: number) {
    return {
      items: (
        await c.query(
          "SELECT * FROM actions WHERE commission_id=$1 ORDER BY created_at,id LIMIT 20 OFFSET $2",
          [commission, (page - 1) * 20],
        )
      ).rows,
      total: (
        await c.query(
          "SELECT count(*)::int AS total FROM actions WHERE commission_id=$1",
          [commission],
        )
      ).rows[0].total,
      page,
      pageSize: 20,
    };
  }
  async action(c: PoolClient, id: string, lock = false) {
    return (
      await c.query(
        "SELECT a.*,a.site_id FROM actions a WHERE a.id=$1" +
          (lock ? " FOR UPDATE OF a" : ""),
        [id],
      )
    ).rows[0];
  }
  async actions(c: PoolClient, finding: string, page: number) {
    return {
      items: (
        await c.query(
          "SELECT * FROM actions WHERE finding_id=$1 ORDER BY created_at,id LIMIT 20 OFFSET $2",
          [finding, (page - 1) * 20],
        )
      ).rows,
      total: (
        await c.query(
          "SELECT count(*)::int AS total FROM actions WHERE finding_id=$1",
          [finding],
        )
      ).rows[0].total,
      page,
      pageSize: 20,
    };
  }
  async hasEvidence(c: PoolClient, action: string) {
    return !!(
      await c.query("SELECT 1 FROM evidence WHERE action_id=$1 LIMIT 1", [
        action,
      ])
    ).rowCount;
  }
  async changeAction(c: PoolClient, action: string, status: string) {
    return (
      await c.query(
        "UPDATE actions SET status=$2,version=version+1 WHERE id=$1 RETURNING *",
        [action, status],
      )
    ).rows[0];
  }
  async createEvidence(
    c: PoolClient,
    action: string,
    user: string,
    note: string,
  ) {
    return (
      await c.query(
        "INSERT INTO evidence(action_id,author_id,note) VALUES($1,$2,$3) RETURNING *",
        [action, user, note],
      )
    ).rows[0];
  }
  async verify(
    c: PoolClient,
    action: string,
    user: string,
    approved: boolean,
    note: string,
  ) {
    await c.query(
      "INSERT INTO verifications(action_id,verifier_id,approved,note) VALUES($1,$2,$3,$4)",
      [action, user, approved, note],
    );
  }
  async evidence(c: PoolClient, action: string, page: number) {
    return {
      items: (
        await c.query(
          "SELECT * FROM evidence WHERE action_id=$1 ORDER BY created_at DESC,id LIMIT 20 OFFSET $2",
          [action, (page - 1) * 20],
        )
      ).rows,
      total: (
        await c.query(
          "SELECT count(*)::int AS total FROM evidence WHERE action_id=$1",
          [action],
        )
      ).rows[0].total,
      page,
      pageSize: 20,
    };
  }
}
