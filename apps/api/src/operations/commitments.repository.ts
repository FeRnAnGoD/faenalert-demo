import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
@Injectable()
export class CommitmentsRepository {
  async list(
    c: PoolClient,
    site: string,
    query: { page: number; pageSize: number; state: string; owner?: string },
  ) {
    const { page, pageSize, state, owner } = query;
    const calendar = (
      await c.query(
        "SELECT (now() AT TIME ZONE timezone)::date AS today,timezone FROM sites WHERE id=$1",
        [site],
      )
    ).rows[0];
    const params: unknown[] = [site, calendar.today];
    let where = "c.site_id=$1 AND $2::date IS NOT NULL";
    if (state === "pending") where += " AND NOT c.closed";
    if (state === "overdue") where += " AND NOT c.closed AND c.due_on<$2::date";
    if (state === "upcoming")
      where +=
        " AND NOT c.closed AND c.due_on BETWEEN $2::date AND ($2::date+7)";
    if (state === "closed") where += " AND c.closed";
    if (owner) {
      params.push(owner);
      where += " AND c.owner_id=$3";
    }
    const total = (
      await c.query(
        "SELECT count(*)::int AS total FROM commitments c WHERE " + where,
        params,
      )
    ).rows[0].total;
    const items = (
      await c.query(
        "SELECT c.*,u.name AS owner_name,(NOT c.closed AND c.due_on<$2::date) AS overdue,COALESCE(a.version,g.version) AS version FROM commitments c JOIN users u ON u.id=c.owner_id LEFT JOIN actions a ON c.source<>'MEETING' AND a.id=c.id LEFT JOIN agreements g ON c.source='MEETING' AND g.id=c.id WHERE " +
          where +
          " ORDER BY c.closed,c.due_on,c.id LIMIT $" +
          (params.length + 1) +
          " OFFSET $" +
          (params.length + 2),
        [...params, pageSize, (page - 1) * pageSize],
      )
    ).rows;
    const summary = (
      await c.query(
        "SELECT count(*)::int AS total,count(*) FILTER(WHERE NOT closed)::int AS pending,count(*) FILTER(WHERE NOT closed AND due_on<$2::date)::int AS overdue,count(*) FILTER(WHERE NOT closed AND due_on BETWEEN $2::date AND ($2::date+7))::int AS upcoming,count(*) FILTER(WHERE closed)::int AS closed FROM commitments WHERE site_id=$1 AND ($3::uuid IS NULL OR owner_id=$3)",
        [site, calendar.today, owner ?? null],
      )
    ).rows[0];
    const owners = (
      await c.query(
        "SELECT DISTINCT u.id,u.name,u.active FROM commitments c JOIN users u ON u.id=c.owner_id WHERE c.site_id=$1 ORDER BY u.name",
        [site],
      )
    ).rows;
    return {
      items,
      total,
      page,
      pageSize,
      owners,
      summary: {
        ...summary,
        asOf: calendar.today,
        timezone: calendar.timezone,
      },
    };
  }
}
