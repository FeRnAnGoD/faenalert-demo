import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";

@Injectable()
export class WorkspaceRepository {
  async isPlatformAdmin(c: PoolClient, user: string) {
    return !!(
      await c.query(
        "SELECT 1 FROM user_platform_access WHERE user_id=$1 AND role_code='PLATFORM_ADMIN'",
        [user],
      )
    ).rowCount;
  }

  async platformRoles(c: PoolClient, user: string) {
    return (
      await c.query(
        "SELECT role_code FROM user_platform_access WHERE user_id=$1 ORDER BY role_code",
        [user],
      )
    ).rows.map((row) => row.role_code as string);
  }

  async organizations(c: PoolClient) {
    return (
      await c.query(
        `SELECT o.id,o.name,o.active,o.version,o.updated_at,
          COALESCE((SELECT jsonb_agg(jsonb_build_object(
            'id',s.id,'name',s.name,'active',s.active,'version',s.version,
            'timezone',s.timezone,'access_count',(
              SELECT count(*)::int FROM site_access a
              WHERE a.site_id=s.id AND a.revoked_at IS NULL
            ),'committee',(
              SELECT jsonb_build_object('id',c.id,'name',c.name,
                'valid_from',c.valid_from,'valid_until',c.valid_until)
              FROM committees c WHERE c.site_id=s.id
              ORDER BY c.valid_from DESC,c.id LIMIT 1
            )
          ) ORDER BY s.name,s.id) FROM sites s WHERE s.organization_id=o.id),'[]') AS sites
        FROM organizations o ORDER BY o.name,o.id`,
      )
    ).rows;
  }

  async createOrganization(
    c: PoolClient,
    input: { name: string; firstSiteName: string; committee: { name: string; validFrom: string; validUntil?: string } },
  ) {
    const organization = (
      await c.query(
        "INSERT INTO organizations(name,updated_at) VALUES($1,now()) RETURNING *",
        [input.name],
      )
    ).rows[0];
    const site = (
      await c.query(
        "INSERT INTO sites(organization_id,name,timezone,updated_at) VALUES($1,$2,'America/Santiago',now()) RETURNING *",
        [organization.id, input.firstSiteName],
      )
    ).rows[0];
    const committee = (
      await c.query(
        "INSERT INTO committees(site_id,name,valid_from,valid_until) VALUES($1,$2,$3,$4) RETURNING *",
        [site.id, input.committee.name, input.committee.validFrom, input.committee.validUntil ?? null],
      )
    ).rows[0];
    return { organization, site, committee };
  }

  async sites(c: PoolClient, organization: string) {
    return (
      await c.query(
        `SELECT s.id,s.organization_id,s.name,s.timezone,s.active,s.version,
          s.updated_at,
          (SELECT count(*)::int FROM site_access a WHERE a.site_id=s.id AND a.revoked_at IS NULL) AS access_count,
          (SELECT jsonb_build_object('id',c.id,'name',c.name,'valid_from',c.valid_from,'valid_until',c.valid_until)
            FROM committees c WHERE c.site_id=s.id ORDER BY c.valid_from DESC,c.id LIMIT 1) AS committee
        FROM sites s WHERE s.organization_id=$1 ORDER BY s.name,s.id`,
        [organization],
      )
    ).rows;
  }

  async createSite(
    c: PoolClient,
    organization: string,
    input: { name: string; committee: { name: string; validFrom: string; validUntil?: string } },
  ) {
    const site = (
      await c.query(
        "INSERT INTO sites(organization_id,name,timezone,updated_at) VALUES($1,$2,'America/Santiago',now()) RETURNING *",
        [organization, input.name],
      )
    ).rows[0];
    const committee = (
      await c.query(
        "INSERT INTO committees(site_id,name,valid_from,valid_until) VALUES($1,$2,$3,$4) RETURNING *",
        [site.id, input.committee.name, input.committee.validFrom, input.committee.validUntil ?? null],
      )
    ).rows[0];
    return { site, committee };
  }

  async organization(c: PoolClient, id: string, lock = false) {
    return (
      await c.query(
        "SELECT * FROM organizations WHERE id=$1" + (lock ? " FOR UPDATE" : ""),
        [id],
      )
    ).rows[0];
  }

  async updateOrganization(
    c: PoolClient,
    id: string,
    version: number,
    input: { name: string; active: boolean },
  ) {
    return (
      await c.query(
        "UPDATE organizations SET name=$3,active=$4,version=version+1,updated_at=now() WHERE id=$1 AND version=$2 RETURNING *",
        [id, version, input.name, input.active],
      )
    ).rows[0];
  }

  async site(c: PoolClient, id: string, lock = false) {
    return (
      await c.query(
        "SELECT s.*,o.name AS organization_name,o.active AS organization_active FROM sites s JOIN organizations o ON o.id=s.organization_id WHERE s.id=$1" + (lock ? " FOR UPDATE OF s" : ""),
        [id],
      )
    ).rows[0];
  }

  async updateSite(
    c: PoolClient,
    id: string,
    version: number,
    input: { name: string; active: boolean },
  ) {
    return (
      await c.query(
        "UPDATE sites SET name=$3,active=$4,version=version+1,updated_at=now() WHERE id=$1 AND version=$2 RETURNING *",
        [id, version, input.name, input.active],
      )
    ).rows[0];
  }

  async users(c: PoolClient) {
    return (
      await c.query(
        "SELECT id,email,name,active FROM users WHERE active=true ORDER BY name,email LIMIT 500",
      )
    ).rows;
  }

  async roles(c: PoolClient) {
    return (
      await c.query(
        "SELECT code,name,description,permissions FROM roles ORDER BY name,code",
      )
    ).rows;
  }

  async activeUser(c: PoolClient, user: string) {
    const result = await c.query(
      "SELECT id FROM users WHERE id=$1 AND active=true",
      [user],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async activeAdminCount(c: PoolClient, site: string) {
    return Number(
      (
        await c.query(
          "SELECT count(*)::int AS total FROM site_access WHERE site_id=$1 AND role='ADMIN' AND revoked_at IS NULL",
          [site],
        )
      ).rows[0].total,
    );
  }

  async hasOtherActiveSite(c: PoolClient, user: string, site: string) {
    return !!(
      await c.query(
        `SELECT 1 FROM site_access a JOIN sites s ON s.id=a.site_id
        JOIN organizations o ON o.id=s.organization_id
        WHERE a.user_id=$1 AND a.revoked_at IS NULL AND s.active=true
          AND o.active=true AND s.id<>$2 LIMIT 1`,
        [user, site],
      )
    ).rowCount;
  }

  async hasActiveSiteOutsideOrganization(c: PoolClient, user: string, organization: string) {
    return !!(
      await c.query(
        `SELECT 1 FROM site_access a JOIN sites s ON s.id=a.site_id
        JOIN organizations o ON o.id=s.organization_id
        WHERE a.user_id=$1 AND a.revoked_at IS NULL AND s.active=true
          AND o.active=true AND s.organization_id<>$2 LIMIT 1`,
        [user, organization],
      )
    ).rowCount;
  }

  async audit(
    c: PoolClient,
    site: string,
    actor: string,
    entity: string,
    event: string,
    details: unknown,
  ) {
    await c.query(
      "INSERT INTO audit_events(site_id,actor_id,entity_id,event,details) VALUES($1,$2,$3,$4,$5)",
      [site, actor, entity, event, JSON.stringify(details)],
    );
  }

  async usersInOrganization(c: PoolClient, organization: string) {
    return (
      await c.query(
        `SELECT DISTINCT u.id,u.name,u.email,u.active
        FROM users u JOIN site_access a ON a.user_id=u.id AND a.revoked_at IS NULL
        JOIN sites s ON s.id=a.site_id
        WHERE s.organization_id=$1 AND u.active=true ORDER BY u.name,u.email LIMIT 500`,
        [organization],
      )
    ).rows;
  }

  async usersForSite(c: PoolClient, site: string) {
    return (
      await c.query(
        `SELECT u.id,u.email,u.name,a.role,r.name AS role_name,r.permissions,a.granted_at
        FROM users u JOIN site_access a ON a.user_id=u.id AND a.revoked_at IS NULL
        JOIN roles r ON r.code=a.role WHERE a.site_id=$1 AND u.active=true
        ORDER BY u.name,u.email`,
        [site],
      )
    ).rows;
  }

  async findAssignment(c: PoolClient, site: string, user: string, lock = false) {
    return (
      await c.query(
        "SELECT * FROM site_access WHERE site_id=$1 AND user_id=$2" + (lock ? " FOR UPDATE" : ""),
        [site, user],
      )
    ).rows[0];
  }

  async userBelongsToOrganization(c: PoolClient, organization: string, user: string) {
    return !!(
      await c.query(
        `SELECT 1 FROM site_access a JOIN sites s ON s.id=a.site_id
        WHERE s.organization_id=$1 AND a.user_id=$2 AND a.revoked_at IS NULL LIMIT 1`,
        [organization, user],
      )
    ).rowCount;
  }

  async assign(c: PoolClient, site: string, user: string, role: string, actor: string) {
    return (
      await c.query(
        `INSERT INTO site_access(site_id,user_id,role,granted_at,granted_by,revoked_at,revoked_by)
        VALUES($1,$2,$3,now(),$4,NULL,NULL)
        ON CONFLICT(site_id,user_id) DO UPDATE SET role=EXCLUDED.role,
          granted_at=now(),granted_by=EXCLUDED.granted_by,revoked_at=NULL,revoked_by=NULL
        RETURNING *`,
        [site, user, role, actor],
      )
    ).rows[0];
  }

  async revoke(c: PoolClient, site: string, user: string, actor: string) {
    return (
      await c.query(
        "UPDATE site_access SET revoked_at=now(),revoked_by=$3 WHERE site_id=$1 AND user_id=$2 AND revoked_at IS NULL RETURNING *",
        [site, user, actor],
      )
    ).rows[0];
  }

  async logAccessEvent(
    c: PoolClient,
    site: string,
    user: string,
    actor: string,
    role: string,
    event: string,
    details: unknown,
  ) {
    await c.query(
      "INSERT INTO site_access_events(site_id,user_id,actor_id,role,event,details) VALUES($1,$2,$3,$4,$5,$6)",
      [site, user, actor, role, event, JSON.stringify(details)],
    );
  }

  async roleExists(c: PoolClient, role: string) {
    return !!(await c.query("SELECT 1 FROM roles WHERE code=$1", [role])).rowCount;
  }
}
