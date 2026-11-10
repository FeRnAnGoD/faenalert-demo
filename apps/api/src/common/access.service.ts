import { Injectable, Inject, ForbiddenException } from "@nestjs/common";
import { PoolClient } from "pg";
import { Database } from "../database/database";
import { Actor } from "../auth/auth";
import { id } from "../prevention/schemas";
export type Permission = "read" | "write" | "review" | "manage";
@Injectable()
export class AccessService {
  constructor(@Inject(Database) readonly db: Database) {}
  async authorize(
    client: PoolClient,
    actor: Actor,
    site: string,
    permission: Permission = "read",
  ) {
    const result = await client.query(
      "SELECT r.code AS role,r.permissions FROM site_access a JOIN roles r ON r.code=a.role JOIN users u ON u.id=a.user_id JOIN sites s ON s.id=a.site_id JOIN organizations o ON o.id=s.organization_id WHERE a.site_id=$1 AND a.user_id=$2 AND a.revoked_at IS NULL AND s.active=true AND o.active=true AND u.active=true",
      [id.parse(site), actor.id],
    );
    const assignment = result.rows[0] as
      | { role: string; permissions: Permission[] }
      | undefined;
    if (!assignment?.permissions.includes(permission))
      throw new ForbiddenException(
        "No tienes permiso para esta acción en la faena",
      );
    return assignment.role;
  }
}
