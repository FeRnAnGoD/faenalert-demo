import {
  Injectable,
  Inject,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { PoolClient } from "pg";
@Injectable()
export class PeopleService {
  async resolve(c: PoolClient, site: string, name: string, personId?: string) {
    if (personId) {
      const row = (
        await c.query(
          "SELECT p.* FROM people p WHERE p.id=$1 AND (EXISTS(SELECT 1 FROM users u JOIN site_access a ON a.user_id=u.id WHERE u.person_id=p.id AND a.site_id=$2 AND a.revoked_at IS NULL) OR EXISTS(SELECT 1 FROM members m JOIN committees committee ON committee.id=m.committee_id WHERE m.person_id=p.id AND committee.site_id=$2))",
          [personId, site],
        )
      ).rows[0];
      if (!row)
        throw new ForbiddenException(
          "La persona no está disponible en esta faena",
        );
      return row;
    }
    return (
      await c.query("INSERT INTO people(display_name) VALUES($1) RETURNING *", [
        name,
      ])
    ).rows[0];
  }
  async checkMembership(
    c: PoolClient,
    committee: string,
    person: string,
    from: string,
    until?: string,
  ) {
    await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      committee + ":" + person,
    ]);
    if (
      (
        await c.query(
          "SELECT 1 FROM members WHERE committee_id=$1 AND person_id=$2 AND daterange(valid_from,valid_until,'[]') && daterange($3::date,$4::date,'[]')",
          [committee, person, from, until ?? null],
        )
      ).rowCount
    )
      throw new ConflictException(
        "La persona ya tiene una participación que se superpone con este período",
      );
  }
}
