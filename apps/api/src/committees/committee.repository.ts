import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { CommitteeInput, MemberInput } from "./committee.schemas";
@Injectable()
export class CommitteeRepository {
  async list(c: PoolClient, site: string) {
    return {
      items: (
        await c.query(
          "SELECT * FROM committees WHERE site_id=$1 ORDER BY valid_from DESC,id",
          [site],
        )
      ).rows,
    };
  }
  async create(c: PoolClient, site: string, input: CommitteeInput) {
    return (
      await c.query(
        "INSERT INTO committees(site_id,name,valid_from,valid_until) VALUES($1,$2,$3,$4) RETURNING *",
        [site, input.name, input.validFrom, input.validUntil ?? null],
      )
    ).rows[0];
  }
  async committee(c: PoolClient, id: string, lock = false) {
    return (await c.query("SELECT * FROM committees WHERE id=$1" + (lock ? " FOR UPDATE" : ""), [id]))
      .rows[0];
  }
  async members(c: PoolClient, committee: string) {
    return {
      items: (
        await c.query(
          "SELECT m.*,p.display_name AS current_person_name FROM members m LEFT JOIN people p ON p.id=m.person_id WHERE committee_id=$1 ORDER BY name,id",
          [committee],
        )
      ).rows,
    };
  }
  async add(
    c: PoolClient,
    committee: string,
    person: { id: string; display_name: string },
    input: MemberInput,
    until: string | null,
  ) {
    return (
      await c.query(
        "INSERT INTO members(committee_id,name,job,role,contact_email,member_kind,office,representation,participation,valid_from,valid_until,person_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *",
        [
          committee,
          person.display_name,
          input.job,
          input.role,
          input.contactEmail,
          input.memberKind,
          input.office ?? null,
          input.representation,
          input.participation,
          input.validFrom,
          until,
          person.id,
        ],
      )
    ).rows[0];
  }
  async member(c: PoolClient, id: string) {
    return (
      await c.query(
        "SELECT m.*,committee.site_id,committee.valid_until AS committee_end FROM members m JOIN committees committee ON committee.id=m.committee_id WHERE m.id=$1 FOR UPDATE OF m",
        [id],
      )
    ).rows[0];
  }
  async end(c: PoolClient, id: string, until: string) {
    return (
      await c.query(
        "UPDATE members SET valid_until=$2,version=version+1 WHERE id=$1 RETURNING *",
        [id, until],
      )
    ).rows[0];
  }
  async updateMember(
    c: PoolClient,
    id: string,
    version: number,
    input: {
      job: string;
      role: string;
      contactEmail: string;
      memberKind: string;
      office: string | null;
      representation: string | null;
      participation: string | null;
    },
  ) {
    return (
      await c.query(
        "UPDATE members SET job=$3,role=$4,contact_email=$5,member_kind=$6,office=$7,representation=$8,participation=$9,version=version+1 WHERE id=$1 AND version=$2 RETURNING *",
        [
          id,
          version,
          input.job,
          input.role,
          input.contactEmail,
          input.memberKind,
          input.office,
          input.representation,
          input.participation,
        ],
      )
    ).rows[0];
  }
  async seatCount(
    c: PoolClient,
    committee: string,
    representation: string,
    participation: string,
    from: string,
    until: string | null,
    exceptMember?: string,
  ) {
    return (
      await c.query(
        "SELECT count(*)::int AS total FROM members WHERE committee_id=$1 AND member_kind='REPRESENTATIVE' AND representation=$2 AND participation=$3 AND valid_from<=COALESCE($5::date,'infinity'::date) AND COALESCE(valid_until,'infinity'::date)>=$4 AND ($6::uuid IS NULL OR id<>$6)",
        [committee, representation, participation, from, until, exceptMember ?? null],
      )
    ).rows[0].total as number;
  }
  async officeOccupied(
    c: PoolClient,
    committee: string,
    office: string,
    from: string,
    until: string | null,
    exceptMember?: string,
  ) {
    return (
      await c.query(
        "SELECT 1 FROM members WHERE committee_id=$1 AND office=$2 AND valid_from<=COALESCE($4::date,'infinity'::date) AND COALESCE(valid_until,'infinity'::date)>=$3 AND ($5::uuid IS NULL OR id<>$5) LIMIT 1",
        [committee, office, from, until, exceptMember ?? null],
      )
    ).rowCount !== 0;
  }
  async people(c: PoolClient, site: string) {
    return {
      items: (
        await c.query(
          "SELECT p.id,p.display_name FROM people p WHERE EXISTS(SELECT 1 FROM users u JOIN site_access a ON a.user_id=u.id WHERE u.person_id=p.id AND a.site_id=$1 AND a.revoked_at IS NULL) OR EXISTS(SELECT 1 FROM members m JOIN committees committee ON committee.id=m.committee_id WHERE m.person_id=p.id AND committee.site_id=$1) ORDER BY p.display_name",
          [site],
        )
      ).rows,
    };
  }
}
