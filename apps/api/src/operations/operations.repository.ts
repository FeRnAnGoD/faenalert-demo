import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { Domain } from "./catalog";
@Injectable()
export class OperationsRepository {
  async search(c: PoolClient, site: string, term: string) {
    const rows = await c.query(
      `WITH matches AS (
        SELECT m.id::text, m.title, m.location AS subtitle, 'reuniones'::text AS page, 'meeting'::text AS entity,
          jsonb_build_object('id',m.id,'title',m.title,'scheduled_at',m.scheduled_at,'location',m.location,'agenda',m.agenda,'status',m.status,'version',m.version,'committee_id',m.committee_id) AS record,
          CASE WHEN strpos(lower(m.title),lower($2))=1 THEN 0 ELSE 1 END AS rank, m.created_at
        FROM meetings m WHERE m.site_id=$1 AND strpos(lower(concat_ws(' ',m.title,m.location,m.agenda)),lower($2))>0
        UNION ALL
        SELECT m.id::text, m.title, 'Acta del comité'::text, 'actas'::text, 'minute'::text,
          jsonb_build_object('id',m.id,'title',m.title,'content',m.content,'status',m.status,'version',m.version,'meeting_id',m.meeting_id,'created_at',m.created_at),
          CASE WHEN strpos(lower(m.title),lower($2))=1 THEN 0 ELSE 1 END, m.created_at
        FROM minutes m WHERE m.site_id=$1 AND strpos(lower(concat_ws(' ',m.title,m.content)),lower($2))>0
        UNION ALL
        SELECT c.id::text, c.title, u.name, 'acuerdos'::text, 'action'::text,
          jsonb_build_object('id',c.id,'title',c.title,'owner',u.name,'ownerId',c.owner_id,'sourceCode',c.source,'relatedApiId',c.source_id,'version',COALESCE(a.version,g.version),'apiStatus',c.status,'status',CASE WHEN c.closed THEN 'Completado' WHEN c.status='IN_PROGRESS' THEN 'En curso' WHEN c.status='PENDING_VERIFICATION' THEN 'Por verificar' ELSE 'Pendiente' END,'date',c.due_on,'subtitle',CASE c.source WHEN 'MEETING' THEN 'Acuerdo de reunión' WHEN 'INCIDENT' THEN 'Acción asociada a evento' WHEN 'COMMISSION' THEN 'Acción de comisión' ELSE 'Acción de inspección' END,'type',CASE c.source WHEN 'MEETING' THEN 'Acuerdo' WHEN 'COMMISSION' THEN 'Comisión' ELSE 'Prevención' END,'priority',CASE COALESCE(a.priority,'MEDIUM') WHEN 'HIGH' THEN 'Alta' WHEN 'LOW' THEN 'Baja' ELSE 'Media' END),
          CASE WHEN strpos(lower(c.title),lower($2))=1 THEN 0 ELSE 1 END, COALESCE(a.created_at,g.created_at)
        FROM commitments c JOIN users u ON u.id=c.owner_id
        LEFT JOIN actions a ON c.source<>'MEETING' AND a.id=c.id
        LEFT JOIN agreements g ON c.source='MEETING' AND g.id=c.id
        WHERE c.site_id=$1 AND strpos(lower(concat_ws(' ',c.title,u.name)),lower($2))>0
        UNION ALL
        SELECT i.id::text, i.title, i.location, 'accidentes'::text, 'incident'::text,
          jsonb_build_object('id',i.id,'title',i.title,'location',i.location,'facts',i.facts,'kind',i.kind,'occurred_at',i.occurred_at,'version',i.version),
          CASE WHEN strpos(lower(i.title),lower($2))=1 THEN 0 ELSE 1 END, i.created_at
        FROM incidents i WHERE i.site_id=$1 AND strpos(lower(concat_ws(' ',i.title,i.location,i.facts)),lower($2))>0
        UNION ALL
        SELECT i.id::text, i.title, concat_ws(' · ',i.area,'Inspección'), 'inspecciones'::text, 'inspection'::text,
          jsonb_build_object('id',i.id,'title',i.title,'area',i.area,'inspected_on',i.inspected_on,'status',i.status,'version',i.version,'inspector_id',i.inspector_id),
          CASE WHEN strpos(lower(i.title),lower($2))=1 THEN 0 ELSE 1 END, i.created_at
        FROM inspections i WHERE i.site_id=$1 AND strpos(lower(concat_ws(' ',i.title,i.area)),lower($2))>0
        UNION ALL
        SELECT i.id::text, i.title, concat_ws(' · ',i.area,'Hallazgo relacionado'), 'inspecciones'::text, 'inspection'::text,
          jsonb_build_object('id',i.id,'title',i.title,'area',i.area,'inspected_on',i.inspected_on,'status',i.status,'version',i.version,'inspector_id',i.inspector_id),
          CASE WHEN strpos(lower(i.title),lower($2))=1 THEN 0 ELSE 1 END, i.created_at
        FROM findings f JOIN inspections i ON i.id=f.inspection_id AND i.site_id=f.site_id
        WHERE f.site_id=$1 AND strpos(lower(f.description),lower($2))>0
        UNION ALL
        SELECT d.id::text, d.title, d.description, 'documentos'::text, 'document'::text,
          jsonb_build_object('id',d.id,'title',d.title,'description',d.description,'version',d.version,'created_at',d.created_at),
          CASE WHEN strpos(lower(d.title),lower($2))=1 THEN 0 ELSE 1 END, d.created_at
        FROM documents d WHERE d.site_id=$1 AND strpos(lower(concat_ws(' ',d.title,d.description)),lower($2))>0
        UNION ALL
        SELECT t.id::text, t.title, t.instructor, 'capacitaciones'::text, 'training'::text,
          jsonb_build_object('id',t.id,'title',t.title,'scheduled_at',t.scheduled_at,'instructor',t.instructor,'description',t.description,'version',t.version),
          CASE WHEN strpos(lower(t.title),lower($2))=1 THEN 0 ELSE 1 END, t.created_at
        FROM trainings t WHERE t.site_id=$1 AND strpos(lower(concat_ws(' ',t.title,t.instructor,t.description)),lower($2))>0
        UNION ALL
        SELECT c.id::text, c.title, c.objective, 'comisiones'::text, 'commission'::text,
          jsonb_build_object('id',c.id,'title',c.title,'objective',c.objective,'version',c.version,'created_at',c.created_at),
          CASE WHEN strpos(lower(c.title),lower($2))=1 THEN 0 ELSE 1 END, c.created_at
        FROM commissions c WHERE c.site_id=$1 AND strpos(lower(concat_ws(' ',c.title,c.objective)),lower($2))>0
        UNION ALL
        SELECT m.id::text, COALESCE(p.display_name,m.name), concat_ws(' · ',m.role,m.job), 'integrantes'::text, 'member'::text,
          jsonb_build_object('id',m.id,'name',COALESCE(p.display_name,m.name),'job',m.job,'role',m.role,'contact_email',m.contact_email,'member_kind',m.member_kind,'office',m.office,'representation',m.representation,'participation',m.participation,'valid_until',m.valid_until,'version',m.version),
          CASE WHEN strpos(lower(COALESCE(p.display_name,m.name)),lower($2))=1 THEN 0 ELSE 1 END, m.valid_from::timestamptz
        FROM members m JOIN committees committee ON committee.id=m.committee_id
        LEFT JOIN people p ON p.id=m.person_id
        WHERE committee.site_id=$1 AND strpos(lower(concat_ws(' ',COALESCE(p.display_name,m.name),m.job,m.role,m.contact_email)),lower($2))>0
      ), unique_matches AS (
        SELECT DISTINCT ON (page,id) id,title,subtitle,page,entity,record,rank,created_at
        FROM matches ORDER BY page,id,rank,created_at DESC
      )
      SELECT id,title,subtitle,page,entity,record FROM unique_matches
      ORDER BY rank,created_at DESC,id LIMIT 8`,
      [site, term],
    );
    return { items: rows.rows };
  }
  async incident(c: PoolClient, record: string) {
    return (
      await c.query("SELECT * FROM incidents WHERE id=$1", [record])
    ).rows[0];
  }
  async incidentTimeline(
    c: PoolClient,
    incident: string,
    page: number,
    pageSize: number,
  ) {
    const items = (
      await c.query(
        "SELECT t.*,u.name AS recorded_by_name FROM incident_timeline t JOIN users u ON u.id=t.recorded_by WHERE t.incident_id=$1 ORDER BY t.event_at,t.created_at,t.id LIMIT $2 OFFSET $3",
        [incident, pageSize, (page - 1) * pageSize],
      )
    ).rows;
    const total = (
      await c.query(
        "SELECT count(*)::int AS total FROM incident_timeline WHERE incident_id=$1",
        [incident],
      )
    ).rows[0].total;
    return { items, total, page, pageSize };
  }
  async createIncidentTimelineEntry(
    c: PoolClient,
    incident: string,
    site: string,
    actor: string,
    eventAt: string,
    description: string,
  ) {
    return (
      await c.query(
        "INSERT INTO incident_timeline(incident_id,site_id,recorded_by,event_at,description) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [incident, site, actor, eventAt, description],
      )
    ).rows[0];
  }
  async commission(c: PoolClient, record: string) {
    return (
      await c.query("SELECT * FROM commissions WHERE id=$1", [record])
    ).rows[0];
  }
  async training(c: PoolClient, record: string, lock = false) {
    return (
      await c.query(
        "SELECT * FROM trainings WHERE id=$1" + (lock ? " FOR UPDATE" : ""),
        [record],
      )
    ).rows[0];
  }
  async participants(c: PoolClient, training: string, page: number, pageSize: number) {
    const items = (
      await c.query(
        "SELECT * FROM training_participants WHERE training_id=$1 ORDER BY created_at,id LIMIT $2 OFFSET $3",
        [training, pageSize, (page - 1) * pageSize],
      )
    ).rows;
    const total = (
      await c.query(
        "SELECT count(*)::int AS total FROM training_participants WHERE training_id=$1",
        [training],
      )
    ).rows[0].total;
    return { items, total, page, pageSize };
  }
  async participant(c: PoolClient, training: string, participant: string, lock = false) {
    return (
      await c.query(
        "SELECT * FROM training_participants WHERE training_id=$1 AND id=$2" + (lock ? " FOR UPDATE" : ""),
        [training, participant],
      )
    ).rows[0];
  }
  async createParticipant(c: PoolClient, training: string, site: string, name: string) {
    return (
      await c.query(
        "INSERT INTO training_participants(training_id,site_id,participant_name) VALUES($1,$2,$3) RETURNING *",
        [training, site, name],
      )
    ).rows[0];
  }
  async updateParticipant(c: PoolClient, id: string, name: string, attended: boolean | null) {
    return (
      await c.query(
        "UPDATE training_participants SET participant_name=$2,attended=$3,version=version+1 WHERE id=$1 RETURNING *",
        [id, name, attended],
      )
    ).rows[0];
  }
  async trainingEvidence(c: PoolClient, training: string, page: number, pageSize: number) {
    const items = (
      await c.query(
        "SELECT e.*,u.name AS recorded_by_name FROM training_evidence e JOIN users u ON u.id=e.recorded_by WHERE e.training_id=$1 ORDER BY e.created_at DESC,e.id LIMIT $2 OFFSET $3",
        [training, pageSize, (page - 1) * pageSize],
      )
    ).rows;
    const total = (
      await c.query(
        "SELECT count(*)::int AS total FROM training_evidence WHERE training_id=$1",
        [training],
      )
    ).rows[0].total;
    return { items, total, page, pageSize };
  }
  async createTrainingEvidence(c: PoolClient, training: string, site: string, actor: string, description: string) {
    return (
      await c.query(
        "INSERT INTO training_evidence(training_id,site_id,recorded_by,description) VALUES($1,$2,$3,$4) RETURNING *",
        [training, site, actor, description],
      )
    ).rows[0];
  }
  async list(
    c: PoolClient,
    table: Domain,
    site: string,
    page: number,
    pageSize: number,
  ) {
    const selection =
      table === "meetings"
        ? "SELECT t.*,committee.name AS committee_name FROM meetings t LEFT JOIN committees committee ON committee.id=t.committee_id"
        : "SELECT t.* FROM " + table + " t";
    const items = (
      await c.query(
        selection +
          " WHERE t.site_id=$1 ORDER BY t.created_at DESC,t.id LIMIT $2 OFFSET $3",
        [site, pageSize, (page - 1) * pageSize],
      )
    ).rows;
    const total = (
      await c.query(
        "SELECT count(*)::int AS total FROM " + table + " WHERE site_id=$1",
        [site],
      )
    ).rows[0].total;
    return { items, page, pageSize, total };
  }
  async find(
    c: PoolClient,
    table: Domain,
    site: string,
    record: string,
    lock = false,
  ) {
    return (
      await c.query(
        "SELECT * FROM " +
          table +
          " WHERE site_id=$1 AND id=$2" +
          (lock ? " FOR UPDATE" : ""),
        [site, record],
      )
    ).rows[0];
  }
  async insert(
    c: PoolClient,
    table: Domain,
    site: string,
    input: Record<string, unknown>,
  ) {
    const keys = Object.keys(input);
    return (
      await c.query(
        "INSERT INTO " +
          table +
          "(site_id," +
          keys.join(",") +
          ") VALUES($1," +
          keys.map((_, i) => "$" + (i + 2)).join(",") +
          ") RETURNING *",
        [site, ...Object.values(input)],
      )
    ).rows[0];
  }
  async replace(
    c: PoolClient,
    table: Domain,
    site: string,
    record: string,
    version: number,
    input: Record<string, unknown>,
  ) {
    const keys = Object.keys(input);
    return (
      await c.query(
        "UPDATE " +
          table +
          " SET " +
          keys.map((k, i) => k + "=$" + (i + 4)).join(",") +
          ",version=version+1 WHERE site_id=$1 AND id=$2 AND version=$3" +
          (table === "minutes" ? " AND meeting_id IS NULL" : "") +
          " RETURNING *",
        [site, record, version, ...Object.values(input)],
      )
    ).rows[0];
  }
  async committeeIsValid(
    c: PoolClient,
    committee: string,
    site: string,
    scheduled: string,
  ) {
    return !!(
      await c.query(
        "SELECT 1 FROM committees c JOIN sites s ON s.id=c.site_id WHERE c.id=$1 AND c.site_id=$2 AND ($3::timestamptz AT TIME ZONE s.timezone)::date>=c.valid_from AND (c.valid_until IS NULL OR ($3::timestamptz AT TIME ZONE s.timezone)::date<=c.valid_until)",
        [committee, site, scheduled],
      )
    ).rowCount;
  }
}
