import {
  Injectable,
  Inject,
  NotFoundException,
  UnprocessableEntityException,
  ConflictException,
} from "@nestjs/common";
import { z } from "zod";
import { Actor } from "../auth/auth";
import { DomainContext } from "../common/domain-context";
import { id } from "../prevention/schemas";
import { PeopleService } from "./people.service";
import { CommitteeRepository } from "./committee.repository";
import {
  committeeSchema,
  memberSchema,
  memberUpdateSchema,
  type MemberInput,
} from "./committee.schemas";
@Injectable()
export class CommitteeService {
  constructor(
    @Inject(DomainContext) private context: DomainContext,
    @Inject(CommitteeRepository) private repo: CommitteeRepository,
    @Inject(PeopleService) private peopleService: PeopleService,
  ) {}
  private async validateMemberSeat(
    c: import("pg").PoolClient,
    committee: string,
    input: Pick<MemberInput, "memberKind" | "representation" | "participation" | "office">,
    from: string,
    until: string | null,
    exceptMember?: string,
  ) {
    if (input.memberKind !== "REPRESENTATIVE") return;
    const representation = input.representation;
    const participation = input.participation;
    if (!representation || !participation)
      throw new UnprocessableEntityException(
        "Un representante requiere representación y calidad de titular o suplente",
      );
    const occupiedSeats = await this.repo.seatCount(
      c,
      committee,
      representation,
      participation,
      from,
      until,
      exceptMember,
    );
    if (occupiedSeats >= 3)
      throw new UnprocessableEntityException(
        "El comité ya tiene tres cupos de este tipo para ese período",
      );
    if (
      input.office &&
      (await this.repo.officeOccupied(
        c,
        committee,
        input.office,
        from,
        until,
        exceptMember,
      ))
    )
      throw new ConflictException(
        input.office === "PRESIDENT"
          ? "El comité ya tiene una presidencia asignada para ese período"
          : "El comité ya tiene una secretaría asignada para ese período",
      );
  }
  list(actor: Actor, site: string) {
    return this.context.db.read(async (c) => {
      await this.context.access(c, actor, site);
      return this.repo.list(c, site);
    });
  }
  create(actor: Actor, site: string, body: unknown) {
    const input = committeeSchema.parse(body);
    return this.context.db.transaction(async (c) => {
      await this.context.permissions.authorize(c, actor, site, "manage");
      const row = await this.repo.create(c, site, input);
      const metadata = await this.context.audit(
        c,
        actor,
        site,
        row.id,
        "committee.created",
      );
      return { ...row, ...metadata };
    });
  }
  members(actor: Actor, committee: string) {
    return this.context.db.read(async (c) => {
      const row = await this.repo.committee(c, id.parse(committee));
      if (!row) throw new NotFoundException();
      await this.context.access(c, actor, row.site_id);
      return this.repo.members(c, committee);
    });
  }
  add(actor: Actor, committee: string, body: unknown) {
    const input = memberSchema.parse(body);
    return this.context.db.transaction(async (c) => {
      const row = await this.repo.committee(c, id.parse(committee), true);
      if (!row) throw new NotFoundException();
      await this.context.permissions.authorize(c, actor, row.site_id, "manage");
      const until = input.validUntil ?? row.valid_until ?? null;
      if (
        input.validFrom < row.valid_from ||
        (row.valid_until && (until ?? input.validFrom) > row.valid_until)
      )
        throw new UnprocessableEntityException(
          "La participación debe estar dentro del período del comité",
        );
      await this.validateMemberSeat(
        c,
        committee,
        input,
        input.validFrom,
        until,
      );
      const person = await this.peopleService.resolve(
        c,
        row.site_id,
        input.name,
        input.personId,
      );
      await this.peopleService.checkMembership(
        c,
        committee,
        person.id,
        input.validFrom,
        until ?? undefined,
      );
      const canonicalInput = {
        ...input,
        role:
          input.memberKind === "PREVENTION_EXPERT"
            ? "Experto en prevención"
            : input.office === "PRESIDENT"
              ? "Presidente"
              : input.office === "SECRETARY"
                ? "Secretario"
                : "Integrante",
      };
      const member = await this.repo.add(
        c,
        committee,
        person,
        canonicalInput,
        until,
      );
      const metadata = await this.context.audit(
        c,
        actor,
        row.site_id,
        member.id,
        "member.created",
      );
      return { ...member, ...metadata };
    });
  }
  people(actor: Actor, site: string) {
    return this.context.db.read(async (c) => {
      await this.context.access(c, actor, site);
      return this.repo.people(c, site);
    });
  }
  end(actor: Actor, member: string, body: unknown) {
    const input = z
      .object({
        version: z.number().int().positive(),
        validUntil: z.iso.date(),
      })
      .strict()
      .parse(body);
    return this.context.db.transaction(async (c) => {
      const row = await this.repo.member(c, id.parse(member));
      if (!row) throw new NotFoundException();
      await this.context.permissions.authorize(c, actor, row.site_id, "manage");
      if (row.version !== input.version)
        throw new ConflictException("La participación cambió");
      if (
        input.validUntil < row.valid_from ||
        (row.committee_end && input.validUntil > row.committee_end)
      )
        throw new UnprocessableEntityException(
          "Fecha fuera del período del comité",
        );
      const updated = await this.repo.end(c, member, input.validUntil);
      const metadata = await this.context.audit(
        c,
        actor,
        row.site_id,
        member,
        "member.ended",
        { from: row.valid_until, to: input.validUntil },
      );
      return { ...updated, ...metadata };
    });
  }
  updateMember(actor: Actor, member: string, body: unknown) {
    const input = memberUpdateSchema.parse(body);
    return this.context.db.transaction(async (c) => {
      const current = await this.repo.member(c, id.parse(member));
      if (!current) throw new NotFoundException();
      const committee = await this.repo.committee(c, current.committee_id, true);
      await this.context.permissions.authorize(
        c,
        actor,
        current.site_id,
        "manage",
      );
      if (current.version !== input.version)
        throw new ConflictException("La participación cambió");
      await this.validateMemberSeat(
        c,
        current.committee_id,
        input,
        current.valid_from,
        current.valid_until ?? committee.valid_until ?? null,
        member,
      );
      const { version, ...fields } = input;
      fields.role =
        input.memberKind === "PREVENTION_EXPERT"
          ? "Experto en prevención"
          : input.office === "PRESIDENT"
            ? "Presidente"
            : input.office === "SECRETARY"
              ? "Secretario"
              : "Integrante";
      const updated = await this.repo.updateMember(c, member, version, fields);
      if (!updated) throw new ConflictException("La participación cambió");
      const metadata = await this.context.audit(
        c,
        actor,
        current.site_id,
        member,
        "member.updated",
        { fromVersion: version, toVersion: updated.version },
      );
      return { ...updated, ...metadata };
    });
  }
}
