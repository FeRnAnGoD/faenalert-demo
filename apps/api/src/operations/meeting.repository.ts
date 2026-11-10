import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
@Injectable()
export class MeetingRepository {
  async document(c: PoolClient, id: string) {
    return (await c.query("SELECT * FROM minutes WHERE id=$1", [id])).rows[0];
  }
  async captureIfMissing(
    c: PoolClient,
    minute: Parameters<MeetingRepository["revision"]>[1],
    actor: string,
  ) {
    if (
      !(
        await c.query(
          "SELECT 1 FROM minute_revisions WHERE minute_id=$1 AND version=$2",
          [minute.id, minute.version],
        )
      ).rowCount
    )
      await this.revision(c, minute, actor);
  }

  async meeting(c: PoolClient, id: string, lock = false) {
    return (
      await c.query(
        "SELECT m.*,committee.name AS committee_name FROM meetings m LEFT JOIN committees committee ON committee.id=m.committee_id WHERE m.id=$1" +
          (lock ? " FOR UPDATE OF m" : ""),
        [id],
      )
    ).rows[0];
  }
  async minute(c: PoolClient, id: string, lock = false) {
    return (
      await c.query(
        "SELECT * FROM minutes WHERE id=$1 AND meeting_id IS NOT NULL" +
          (lock ? " FOR UPDATE" : ""),
        [id],
      )
    ).rows[0];
  }
  async minuteForMeeting(c: PoolClient, meeting: string) {
    return (
      await c.query("SELECT * FROM minutes WHERE meeting_id=$1", [meeting])
    ).rows[0];
  }
  async createMinute(
    c: PoolClient,
    site: string,
    meeting: string,
    title: string,
    content: string,
  ) {
    return (
      await c.query(
        "INSERT INTO minutes(site_id,meeting_id,title,content) VALUES($1,$2,$3,$4) RETURNING *",
        [site, meeting, title, content],
      )
    ).rows[0];
  }
  async saveMinute(c: PoolClient, id: string, content: string, status: string) {
    return (
      await c.query(
        "UPDATE minutes SET content=$2,status=$3,version=version+1 WHERE id=$1 RETURNING *",
        [id, content, status],
      )
    ).rows[0];
  }
  async revision(
    c: PoolClient,
    minute: {
      id: string;
      version: number;
      title: string;
      content: string;
      status: string;
      meeting_id: string;
    },
    actor: string,
  ) {
    await c.query(
      "INSERT INTO minute_revisions(minute_id,version,content,actor_id,title,status,meeting_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        minute.id,
        minute.version,
        minute.content,
        actor,
        minute.title,
        minute.status,
        minute.meeting_id,
      ],
    );
  }
  async revisions(c: PoolClient, minute: string, page: number) {
    const items = (
      await c.query(
        "SELECT r.*,u.name AS actor_name FROM minute_revisions r JOIN users u ON u.id=r.actor_id WHERE minute_id=$1 ORDER BY version DESC LIMIT 20 OFFSET $2",
        [minute, (page - 1) * 20],
      )
    ).rows;
    const total = (
      await c.query(
        "SELECT count(*)::int AS total FROM minute_revisions WHERE minute_id=$1",
        [minute],
      )
    ).rows[0].total;
    return { items, total, page, pageSize: 20 };
  }
  async agreements(c: PoolClient, minute: string, page: number) {
    const items = (
      await c.query(
        "SELECT * FROM agreements WHERE minute_id=$1 ORDER BY created_at,id LIMIT 20 OFFSET $2",
        [minute, (page - 1) * 20],
      )
    ).rows;
    const total = (
      await c.query(
        "SELECT count(*)::int AS total FROM agreements WHERE minute_id=$1",
        [minute],
      )
    ).rows[0].total;
    return { items, total, page, pageSize: 20 };
  }
  async history(c: PoolClient, site: string, meeting: string, page: number) {
    const where =
      "e.site_id=$1 AND (e.entity_id=$2 OR e.entity_id IN(SELECT id FROM minutes WHERE meeting_id=$2) OR e.entity_id IN(SELECT a.id FROM agreements a JOIN minutes m ON m.id=a.minute_id WHERE m.meeting_id=$2))";
    const items = (
      await c.query(
        "SELECT e.id::text,e.event,e.details,e.created_at,u.name AS actor_name FROM audit_events e JOIN users u ON u.id=e.actor_id WHERE " +
          where +
          " ORDER BY e.id DESC LIMIT 20 OFFSET $3",
        [site, meeting, (page - 1) * 20],
      )
    ).rows;
    const total = (
      await c.query(
        "SELECT count(*)::int AS total FROM audit_events e WHERE " + where,
        [site, meeting],
      )
    ).rows[0].total;
    return { items, total, page, pageSize: 20 };
  }
  async createAgreement(
    c: PoolClient,
    minute: string,
    input: { title: string; ownerId: string; dueOn: string },
  ) {
    return (
      await c.query(
        "INSERT INTO agreements(minute_id,title,owner_id,due_on) VALUES($1,$2,$3,$4) RETURNING *",
        [minute, input.title, input.ownerId, input.dueOn],
      )
    ).rows[0];
  }
  async agreement(c: PoolClient, id: string, lock = false) {
    return (
      await c.query(
        "SELECT a.*,m.site_id FROM agreements a JOIN minutes m ON m.id=a.minute_id WHERE a.id=$1" +
          (lock ? " FOR UPDATE OF a" : ""),
        [id],
      )
    ).rows[0];
  }
  async agreementHasEvidence(c: PoolClient, id: string) {
    return !!(
      await c.query(
        "SELECT 1 FROM evidence WHERE agreement_id=$1 LIMIT 1",
        [id],
      )
    ).rowCount;
  }
  async addAgreementEvidence(
    c: PoolClient,
    agreement: string,
    author: string,
    note: string,
  ) {
    return (
      await c.query(
        "INSERT INTO evidence(agreement_id,author_id,note) VALUES($1,$2,$3) RETURNING *",
        [agreement, author, note],
      )
    ).rows[0];
  }
  async agreementEvidence(c: PoolClient, agreement: string, page: number) {
    return {
      items: (
        await c.query(
          "SELECT * FROM evidence WHERE agreement_id=$1 ORDER BY created_at DESC,id LIMIT 20 OFFSET $2",
          [agreement, (page - 1) * 20],
        )
      ).rows,
      total: (
        await c.query(
          "SELECT count(*)::int AS total FROM evidence WHERE agreement_id=$1",
          [agreement],
        )
      ).rows[0].total,
      page,
      pageSize: 20,
    };
  }
  async verifyAgreement(
    c: PoolClient,
    agreement: string,
    verifier: string,
    approved: boolean,
    note: string,
  ) {
    await c.query(
      "INSERT INTO verifications(agreement_id,verifier_id,approved,note) VALUES($1,$2,$3,$4)",
      [agreement, verifier, approved, note],
    );
  }
  async transition(c: PoolClient, id: string, status: string) {
    return (
      await c.query(
        "UPDATE agreements SET status=$2,version=version+1 WHERE id=$1 RETURNING *",
        [id, status],
      )
    ).rows[0];
  }
}
