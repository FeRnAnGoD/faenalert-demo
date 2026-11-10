import { Injectable, Inject } from "@nestjs/common";
import { Database } from "../database/database";
import { AccessService } from "./access.service";
import { AuditService } from "./audit.service";
import { PoolClient } from "pg";
import { Actor } from "../auth/auth";
/** Shared transaction, authorization and audit dependencies; no prevention business rules. */
@Injectable()
export class DomainContext {
  constructor(
    @Inject(Database) readonly db: Database,
    @Inject(AccessService) readonly permissions: AccessService,
    @Inject(AuditService) private events: AuditService,
  ) {}
  access(c: PoolClient, actor: Actor, site: string, write = false) {
    return this.permissions.authorize(c, actor, site, write ? "write" : "read");
  }
  audit(
    c: PoolClient,
    actor: Actor,
    site: string,
    entity: string,
    event: string,
    details: unknown = {},
  ) {
    return this.events.record(c, actor, site, entity, event, details);
  }
}
