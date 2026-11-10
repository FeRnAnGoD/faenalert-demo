import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PoolClient } from "pg";
import { Actor } from "../auth/auth";
import { DomainContext } from "../common/domain-context";
import {
  organizationCreateSchema,
  organizationUpdateSchema,
  siteCreateSchema,
  siteRoleSchema,
  siteUpdateSchema,
  uuidSchema,
} from "./workspace.schemas";
import { WorkspaceRepository } from "./workspace.repository";

@Injectable()
export class WorkspaceService {
  constructor(
    @Inject(DomainContext) private context: DomainContext,
    @Inject(WorkspaceRepository) private repo: WorkspaceRepository,
  ) {}

  private async mutate<T>(work: (c: PoolClient) => Promise<T>) {
    try {
      return await this.context.db.transaction(work);
    } catch (error) {
      if ((error as { code?: string })?.code === "23505")
        throw new ConflictException(
          "Ya existe una empresa o faena con ese nombre en este espacio",
        );
      throw error;
    }
  }

  private async requirePlatformAdmin(c: PoolClient, actor: Actor) {
    if (!(await this.repo.isPlatformAdmin(c, actor.id)))
      throw new ForbiddenException(
        "Esta acción requiere administración de plataforma",
      );
  }

  private async requireSiteManager(
    c: PoolClient,
    actor: Actor,
    siteId: string,
    lock = false,
  ) {
    const site = await this.repo.site(c, uuidSchema.parse(siteId), lock);
    if (!site) throw new NotFoundException("Faena no encontrada");
    if (!site.active || !site.organization_active)
      throw new ConflictException("La empresa o faena está inactiva");
    const platformAdmin = await this.repo.isPlatformAdmin(c, actor.id);
    if (!platformAdmin)
      await this.context.permissions.authorize(c, actor, site.id, "manage");
    return { site, platformAdmin };
  }

  async me(actor: Actor) {
    return this.context.db.read(async (c) => ({
      platform_roles: await this.repo.platformRoles(c, actor.id),
    }));
  }

  organizations(actor: Actor) {
    return this.context.db.read(async (c) => {
      await this.requirePlatformAdmin(c, actor);
      return { items: await this.repo.organizations(c) };
    });
  }

  createOrganization(actor: Actor, body: unknown) {
    const input = organizationCreateSchema.parse(body);
    return this.mutate(async (c) => {
      await this.requirePlatformAdmin(c, actor);
      const created = await this.repo.createOrganization(c, input);
      await this.repo.assign(c, created.site.id, actor.id, "ADMIN", actor.id);
      await this.repo.logAccessEvent(
        c,
        created.site.id,
        actor.id,
        actor.id,
        "ADMIN",
        "GRANTED",
        { source: "organization_created" },
      );
      await this.repo.audit(
        c,
        created.site.id,
        actor.id,
        created.organization.id,
        "organization.created",
        {
          organizationName: created.organization.name,
          initialSiteId: created.site.id,
          initialCommitteeId: created.committee.id,
        },
      );
      return created;
    });
  }

  sites(actor: Actor, organizationId: string) {
    const id = uuidSchema.parse(organizationId);
    return this.context.db.read(async (c) => {
      await this.requirePlatformAdmin(c, actor);
      if (!(await this.repo.organization(c, id)))
        throw new NotFoundException("Empresa no encontrada");
      return { items: await this.repo.sites(c, id) };
    });
  }

  createSite(actor: Actor, organizationId: string, body: unknown) {
    const id = uuidSchema.parse(organizationId),
      input = siteCreateSchema.parse(body);
    return this.mutate(async (c) => {
      await this.requirePlatformAdmin(c, actor);
      const organization = await this.repo.organization(c, id, true);
      if (!organization) throw new NotFoundException("Empresa no encontrada");
      if (!organization.active)
        throw new ConflictException("Activa la empresa antes de agregar faenas");
      const created = await this.repo.createSite(c, id, input);
      await this.repo.assign(c, created.site.id, actor.id, "ADMIN", actor.id);
      await this.repo.logAccessEvent(
        c,
        created.site.id,
        actor.id,
        actor.id,
        "ADMIN",
        "GRANTED",
        { source: "site_created" },
      );
      await this.repo.audit(
        c,
        created.site.id,
        actor.id,
        created.site.id,
        "site.created",
        { organizationId: id, name: created.site.name, committeeId: created.committee.id },
      );
      return created;
    });
  }

  updateOrganization(actor: Actor, organizationId: string, body: unknown) {
    const id = uuidSchema.parse(organizationId),
      input = organizationUpdateSchema.parse(body);
    return this.mutate(async (c) => {
      await this.requirePlatformAdmin(c, actor);
      const current = await this.repo.organization(c, id, true);
      if (!current) throw new NotFoundException("Empresa no encontrada");
      if (
        current.active &&
        !input.active &&
        !(await this.repo.hasActiveSiteOutsideOrganization(c, actor.id, id))
      )
        throw new ConflictException(
          "Mantén al menos una faena activa asignada a tu cuenta antes de desactivar esta empresa",
        );
      const updated = await this.repo.updateOrganization(c, id, input.version, input);
      if (!updated)
        throw new ConflictException("La empresa cambió; actualiza la vista e inténtalo otra vez");
      const anchor = await c.query(
        "SELECT id FROM sites WHERE organization_id=$1 ORDER BY id LIMIT 1",
        [id],
      );
      if (anchor.rowCount)
        await this.repo.audit(
          c,
          anchor.rows[0].id,
          actor.id,
          id,
          "organization.updated",
          { name: updated.name, active: updated.active, version: updated.version },
        );
      return updated;
    });
  }

  updateSite(actor: Actor, siteId: string, body: unknown) {
    const id = uuidSchema.parse(siteId), input = siteUpdateSchema.parse(body);
    return this.mutate(async (c) => {
      await this.requirePlatformAdmin(c, actor);
      const current = await this.repo.site(c, id, true);
      if (!current) throw new NotFoundException("Faena no encontrada");
      if (
        current.active &&
        !input.active &&
        !(await this.repo.hasOtherActiveSite(c, actor.id, id))
      )
        throw new ConflictException(
          "Mantén al menos una faena activa asignada a tu cuenta antes de desactivar esta",
        );
      const updated = await this.repo.updateSite(c, id, input.version, input);
      if (!updated)
        throw new ConflictException("La faena cambió; actualiza la vista e inténtalo otra vez");
      await this.repo.audit(
        c,
        id,
        actor.id,
        id,
        "site.updated",
        { name: updated.name, active: updated.active, version: updated.version },
      );
      return updated;
    });
  }

  roles(actor: Actor) {
    return this.context.db.read(async (c) => {
      await this.repo.platformRoles(c, actor.id);
      return { items: await this.repo.roles(c) };
    });
  }

  users(actor: Actor) {
    return this.context.db.read(async (c) => {
      await this.requirePlatformAdmin(c, actor);
      return { items: await this.repo.users(c) };
    });
  }

  accessCandidates(actor: Actor, siteId: string) {
    const site = uuidSchema.parse(siteId);
    return this.context.db.read(async (c) => {
      const { site: siteRow, platformAdmin } = await this.requireSiteManager(
        c,
        actor,
        site,
      );
      const items = platformAdmin
        ? await this.repo.users(c)
        : await this.repo.usersInOrganization(c, siteRow.organization_id);
      return { items };
    });
  }

  organizationUsers(actor: Actor, organizationId: string) {
    const id = uuidSchema.parse(organizationId);
    return this.context.db.read(async (c) => {
      await this.requirePlatformAdmin(c, actor);
      if (!(await this.repo.organization(c, id)))
        throw new NotFoundException("Empresa no encontrada");
      return { items: await this.repo.usersInOrganization(c, id) };
    });
  }

  assignUser(actor: Actor, siteId: string, userId: string, body: unknown) {
    const site = uuidSchema.parse(siteId), user = uuidSchema.parse(userId),
      input = siteRoleSchema.parse(body);
    return this.mutate(async (c) => {
      const { site: siteRow, platformAdmin } = await this.requireSiteManager(
        c,
        actor,
        site,
        true,
      );
      if (!(await this.repo.activeUser(c, user)))
        throw new NotFoundException("Usuario no encontrado");
      if (!(await this.repo.roleExists(c, input.role)))
        throw new UnprocessableEntityException("El rol seleccionado no existe");
      if (
        !platformAdmin &&
        !(await this.repo.userBelongsToOrganization(c, siteRow.organization_id, user))
      )
        throw new NotFoundException("Usuario no disponible para esta empresa");
      const previous = await this.repo.findAssignment(c, site, user, true);
      if (previous?.revoked_at == null && previous?.role === input.role)
        return previous;
      if (
        previous?.revoked_at == null &&
        previous?.role === "ADMIN" &&
        input.role !== "ADMIN" &&
        (await this.repo.activeAdminCount(c, site)) <= 1
      )
        throw new ConflictException("Asigna otro administrador antes de quitar este rol");
      const assigned = await this.repo.assign(c, site, user, input.role, actor.id);
      const event = previous?.revoked_at
        ? "GRANTED"
        : previous
          ? "ROLE_CHANGED"
          : "GRANTED";
      await this.repo.logAccessEvent(c, site, user, actor.id, input.role, event, {
        fromRole: previous?.role ?? null,
        toRole: input.role,
      });
      await this.repo.audit(c, site, actor.id, user, "site_access." + event.toLowerCase(), {
        fromRole: previous?.role ?? null,
        toRole: input.role,
      });
      return assigned;
    });
  }

  revokeUser(actor: Actor, siteId: string, userId: string) {
    const site = uuidSchema.parse(siteId), user = uuidSchema.parse(userId);
    return this.mutate(async (c) => {
      await this.requireSiteManager(c, actor, site, true);
      const previous = await this.repo.findAssignment(c, site, user, true);
      if (!previous || previous.revoked_at)
        throw new NotFoundException("La asignación activa no existe");
      if (
        previous.role === "ADMIN" &&
        (await this.repo.activeAdminCount(c, site)) <= 1
      )
        throw new ConflictException("Asigna otro administrador antes de quitar este acceso");
      if (
        actor.id === user &&
        !(await this.repo.hasOtherActiveSite(c, user, site))
      )
        throw new ConflictException(
          "Asigna otra faena activa a tu cuenta antes de quitar tu último acceso",
        );
      await this.repo.revoke(c, site, user, actor.id);
      await this.repo.logAccessEvent(
        c,
        site,
        user,
        actor.id,
        previous.role,
        "REVOKED",
        { previousRole: previous.role },
      );
      await this.repo.audit(c, site, actor.id, user, "site_access.revoked", {
        previousRole: previous.role,
      });
      return { revoked: true };
    });
  }
}
