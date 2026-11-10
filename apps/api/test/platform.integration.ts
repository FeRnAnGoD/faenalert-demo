import { readdirSync } from "node:fs";
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { Pool } from "pg";
import { SignJWT } from "jose";
import { hashPassword } from "../src/auth/password";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const server = spawn(process.execPath, ["dist/main.js"], {
  env: { ...process.env, PORT: "3002", NODE_ENV: "test" },
  stdio: "pipe",
});
let logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
let checks = 0;
async function request(
  path: string,
  token = "",
  method = "GET",
  body?: unknown,
) {
  const response = await fetch("http://127.0.0.1:3002/api/v1/" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  return {
    status: response.status,
    body: await response.json(),
    headers: response.headers,
  };
}
function equal(actual: unknown, expected: unknown, label: string) {
  assert.deepEqual(actual, expected, label);
  checks++;
}
async function main() {
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        if ((await request("health/ready")).status === 200) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(ready, logs);
    const login = async (email: string) =>
      (
        await request("auth/login", "", "POST", {
          email,
          password: process.env.SEED_PASSWORD,
        })
      ).body.accessToken;
    const admin = await login("admin@demo.local"),
      reader = await login("lector@demo.local"),
      verifier = await login("verificador@demo.local");
    equal(
      (
        await request("auth/login", "", "POST", {
          email: "admin@demo.local",
          password: "wrong",
        })
      ).status,
      401,
      "wrong password",
    );
    const authError = await request("me", "broken-token");
    equal(authError.status, 401, "tampered token");
    assert.ok(authError.body.requestId);
    assert.ok(authError.headers.get("x-request-id"));
    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("30000000-0000-4000-8000-000000000001")
      .setIssuer("faenalert-local")
      .setAudience("faenalert-api")
      .setExpirationTime(1)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    equal((await request("me", expired)).status, 401, "expired token");
    equal((await request("me", admin)).status, 200, "current user");
    const sites = await request("sites", admin);
    const site = sites.body.items[0].id;
    const org = randomUUID(),
      other = randomUUID(),
      outsider = randomUUID();
    await pool.query(
      "INSERT INTO organizations(id,name) VALUES($1,'Isolated tenant')",
      [org],
    );
    await pool.query(
      "INSERT INTO sites(id,organization_id,name) VALUES($1,$2,'Other organization')",
      [other, org],
    );
    await pool.query(
      "INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,'Outsider',$3)",
      [
        outsider,
        "outsider@demo.local",
        hashPassword(process.env.SEED_PASSWORD!),
      ],
    );
    await pool.query(
      "INSERT INTO site_access(site_id,user_id,role) VALUES($1,$2,'EDITOR')",
      [other, outsider],
    );
    const stranger = await login("outsider@demo.local");
    equal(
      (await request("sites", stranger)).body.items.map((s: any) => s.id),
      [other],
      "site lists do not leak other tenants",
    );
    equal(
      (await request("sites/" + site + "/users", stranger)).status,
      403,
      "cross-tenant user list",
    );
    equal(
      (await request("sites/" + other + "/inspections", admin)).status,
      403,
      "cross-tenant inspections",
    );
    equal(
      (await request("sites/" + site + "/inspections?pageSize=101", admin))
        .status,
      422,
      "page bound",
    );
    equal(
      (await request("sites/not-a-uuid/inspections", admin)).status,
      422,
      "invalid identifier",
    );
    equal(
      (await request("inspections/" + randomUUID(), admin)).status,
      404,
      "missing inspection",
    );
    const input = {
      title: "Platform synthetic inspection",
      area: "Test",
      inspectedOn: "2026-11-07",
      inspectorId: "30000000-0000-4000-8000-000000000001",
    };
    equal(
      (
        await request("sites/" + site + "/inspections", admin, "POST", {
          ...input,
          unexpected: true,
        })
      ).status,
      422,
      "unknown fields rejected",
    );
    equal(
      (
        await request("sites/" + site + "/inspections", admin, "POST", {
          ...input,
          inspectorId: outsider,
        })
      ).status,
      403,
      "cross-tenant inspector",
    );
    const inspection = (
      await request("sites/" + site + "/inspections", admin, "POST", input)
    ).body;
    equal(
      inspection.inspected_on,
      input.inspectedOn,
      "SQL DATE remains a calendar date across timezones",
    );
    equal(
      (await request("inspections/" + inspection.id, stranger)).status,
      403,
      "cross-tenant detail",
    );
    equal(
      (
        await request(
          "inspections/" + inspection.id + "/findings",
          stranger,
          "POST",
          { description: "unauthorized" },
        )
      ).status,
      403,
      "cross-tenant mutation",
    );
    const finding = (
      await request(
        "inspections/" + inspection.id + "/findings",
        admin,
        "POST",
        { description: "Fixture finding" },
      )
    ).body;
    const actionInput = {
      title: "Concurrent action",
      ownerId: input.inspectorId,
      dueOn: "2026-11-15",
      priority: "LOW",
    };
    equal(
      (
        await request("findings/" + finding.id + "/actions", admin, "POST", {
          ...actionInput,
          ownerId: outsider,
        })
      ).status,
      403,
      "cross-tenant action owner",
    );
    const action = (
      await request(
        "findings/" + finding.id + "/actions",
        admin,
        "POST",
        actionInput,
      )
    ).body;
    const concurrent = await Promise.all([
      request("actions/" + action.id, admin, "PATCH", {
        version: 1,
        status: "IN_PROGRESS",
      }),
      request("actions/" + action.id, admin, "PATCH", {
        version: 1,
        status: "IN_PROGRESS",
      }),
    ]);
    equal(
      concurrent.map((r) => r.status).sort(),
      [200, 409],
      "one concurrent transition succeeds",
    );
    equal(
      (
        await request("actions/" + action.id + "/evidence", reader, "POST", {
          description: "forbidden",
        })
      ).status,
      403,
      "reader cannot attach evidence",
    );
    equal(
      (await request("actions/" + action.id + "/evidence", stranger)).status,
      403,
      "cross-tenant evidence read",
    );
    await request("actions/" + action.id + "/evidence", admin, "POST", {
      description: "Evidence",
    });
    await request("actions/" + action.id, admin, "PATCH", {
      version: 2,
      status: "PENDING_VERIFICATION",
    });
    equal(
      (
        await request(
          "actions/" + action.id + "/verification",
          verifier,
          "POST",
          { version: 3, approved: false, note: "Needs more detail" },
        )
      ).body.status,
      "IN_PROGRESS",
      "rejected closure reopens work",
    );
    await request("actions/" + action.id, admin, "PATCH", {
      version: 4,
      status: "PENDING_VERIFICATION",
    });
    equal(
      (
        await request(
          "actions/" + action.id + "/verification",
          verifier,
          "POST",
          { version: 5, approved: true, note: "Verified" },
        )
      ).body.status,
      "CLOSED",
      "subsequent verified closure",
    );
    equal(
      (
        await request("actions/" + action.id + "/evidence", admin, "POST", {
          description: "late",
        })
      ).status,
      409,
      "closed action immutable",
    );
    const domains: Record<string, Record<string, string>> = {
      meetings: {
        title: "Meeting",
        committee_id: "40000000-0000-4000-8000-000000000001",
        scheduled_at: "2026-11-09T10:00:00-03:00",
        location: "Local",
        agenda: "Review",
      },
      minutes: { title: "Minutes", content: "Draft", status: "DRAFT" },
      trainings: {
        title: "Training",
        scheduled_at: "2026-11-10T10:00:00Z",
        instructor: "Synthetic",
        description: "Training program",
      },
      commissions: { title: "Commission", objective: "Synthetic objective" },
      incidents: {
        title: "Incident",
        occurred_at: "2026-11-07T10:00:00Z",
        location: "Test",
        facts: "Synthetic facts",
        kind: "INCIDENT",
      },
      documents: { title: "Document metadata", description: "Metadata only" },
    };
    for (const [domain, payload] of Object.entries(domains)) {
      const path = "sites/" + site + "/records/" + domain;
      const created = await request(path, admin, "POST", payload);
      equal(created.status, 201, domain + " create");
      equal(
        (await request(path, admin)).body.items.some(
          (r: any) => r.id === created.body.id,
        ),
        true,
        domain + " list",
      );
      equal(
        (await request(path + "/" + created.body.id, admin)).status,
        200,
        domain + " detail",
      );
      equal(
        (
          await request(path + "/" + created.body.id, admin, "PATCH", {
            ...payload,
            title: "Updated",
            version: 1,
          })
        ).body.version,
        2,
        domain + " update",
      );
      equal(
        (
          await request(path + "/" + created.body.id, admin, "PATCH", {
            ...payload,
            version: 1,
          })
        ).status,
        409,
        domain + " stale write",
      );
      equal(
        (await request(path, reader, "POST", payload)).status,
        403,
        domain + " reader blocked",
      );
      equal(
        (await request(path + "/" + created.body.id, stranger)).status,
        403,
        domain + " cross-tenant blocked",
      );
    }
    const incident = (
      await request("sites/" + site + "/records/incidents", admin, "POST", {
        title: "Incident timeline fixture",
        occurred_at: "2026-11-07T10:00:00Z",
        location: "Synthetic location",
        facts: "Synthetic facts only",
        kind: "INCIDENT",
      })
    ).body;
    const timelinePath = "incidents/" + incident.id + "/timeline";
    equal(
      (await request(timelinePath, stranger)).status,
      403,
      "incident timeline cross-tenant read",
    );
    equal(
      (
        await request(timelinePath, stranger, "POST", {
          eventAt: "2026-11-07T10:00:00-03:00",
          description: "Cross-tenant write",
        })
      ).status,
      403,
      "incident timeline cross-tenant write",
    );
    equal(
      (
        await request(timelinePath, reader, "POST", {
          eventAt: "2026-11-07T10:00:00-03:00",
          description: "Reader cannot append",
        })
      ).status,
      403,
      "reader cannot append incident timeline",
    );
    equal(
      (
        await request(timelinePath, admin, "POST", {
          eventAt: "2026-11-07T10:00:00",
          description: "Missing timezone",
        })
      ).status,
      422,
      "incident timeline requires an explicit timezone",
    );
    const laterEntry = await request(timelinePath, admin, "POST", {
      eventAt: "2026-11-08T10:00:00-03:00",
      description: "Synthetic follow-up note",
    });
    equal(laterEntry.status, 201, "incident timeline entry created");
    const earlierEntry = await request(timelinePath, admin, "POST", {
      eventAt: "2026-11-07T10:00:00-03:00",
      description: "Synthetic initial note",
    });
    equal(earlierEntry.status, 201, "earlier event can be added later");
    const timeline = await request(timelinePath, admin, "GET", undefined);
    equal(timeline.body.total, 2, "incident timeline count");
    equal(
      timeline.body.items.map((entry: any) => entry.description),
      ["Synthetic initial note", "Synthetic follow-up note"],
      "incident timeline sorts by event time",
    );
    equal(
      timeline.body.items[0].recorded_by_name,
      "Alex Demo",
      "incident timeline author recorded",
    );
    equal(
      (
        await pool.query(
          "SELECT 1 FROM audit_events WHERE entity_id=$1 AND event='incident.timeline_entry.created'",
          [laterEntry.body.id],
        )
      ).rowCount,
      1,
      "incident timeline append is audited",
    );
    await assert.rejects(
      pool.query("UPDATE incident_timeline SET description='changed' WHERE id=$1", [laterEntry.body.id]),
      /append-only/,
      "incident timeline is append-only",
    );
    checks++;
    const incidentActionsPath = "incidents/" + incident.id + "/actions";
    const incidentActionInput = {
      title: "Synthetic incident follow-up",
      ownerId: input.inspectorId,
      dueOn: "2026-11-15",
      priority: "MEDIUM",
    };
    equal(
      (
        await request(incidentActionsPath, reader, "POST", incidentActionInput)
      ).status,
      403,
      "reader cannot create incident action",
    );
    equal(
      (
        await request(incidentActionsPath, admin, "POST", {
          ...incidentActionInput,
          ownerId: outsider,
        })
      ).status,
      403,
      "incident action owner must belong to the site",
    );
    equal(
      (
        await request(incidentActionsPath, stranger, "POST", incidentActionInput)
      ).status,
      403,
      "cross-tenant incident action create",
    );
    const incidentAction = await request(
      incidentActionsPath,
      admin,
      "POST",
      incidentActionInput,
    );
    equal(incidentAction.status, 201, "incident action created");
    const existingCommission = (
      await pool.query("SELECT id FROM commissions WHERE site_id=$1 LIMIT 1", [site])
    ).rows[0];
    await assert.rejects(
      pool.query(
        "INSERT INTO actions(incident_id,commission_id,title,owner_id,due_on,priority) VALUES($1,$2,'Invalid dual-source action',$3,'2026-11-15','MEDIUM')",
        [incident.id, existingCommission.id, input.inspectorId],
      ),
      /actions_one_source/,
      "an action can belong to only one source",
    );
    checks++;
    equal(
      (await request(incidentActionsPath, reader)).body.items[0].id,
      incidentAction.body.id,
      "incident action readable within site",
    );
    const boardAction = (
      await request("sites/" + site + "/commitments?state=all&page=1", admin)
    ).body.items.find((item: any) => item.id === incidentAction.body.id);
    equal(
      [boardAction?.source, boardAction?.source_id],
      ["INCIDENT", incident.id],
      "incident action appears in shared commitments board",
    );
    const startedAction = await request(
      "actions/" + incidentAction.body.id,
      admin,
      "PATCH",
      { version: 1, status: "IN_PROGRESS" },
    );
    equal(startedAction.body.status, "IN_PROGRESS", "incident action starts");
    await request("actions/" + incidentAction.body.id + "/evidence", admin, "POST", {
      description: "Synthetic progress evidence",
    });
    await request("actions/" + incidentAction.body.id, admin, "PATCH", {
      version: 2,
      status: "PENDING_VERIFICATION",
    });
    const reviewedIncidentAction = await request(
      "actions/" + incidentAction.body.id + "/verification",
      verifier,
      "POST",
      { version: 3, approved: true, note: "Synthetic independent review" },
    );
    equal(
      reviewedIncidentAction.body.status,
      "CLOSED",
      "incident action uses independent verification",
    );
    equal(
      (await request("sites/" + site + "/records/users", admin)).status,
      422,
      "unknown catalog table blocked",
    );
    const committee = (
      await request("sites/" + site + "/committees", admin, "POST", {
        name: "Synthetic committee",
        validFrom: "2026-01-01",
        validUntil: "2026-12-31",
      })
    ).body;
    assert.ok(committee.id);
    equal(
      (await request("sites/" + site + "/committees", admin)).body.items.some(
        (c: any) => c.id === committee.id,
      ),
      true,
      "committee list",
    );
    equal(
      (
        await request("sites/" + site + "/committees", admin, "POST", {
          name: "Invalid dates",
          validFrom: "2026-12-01",
          validUntil: "2026-01-01",
        })
      ).status,
      422,
      "committee date order",
    );
    const memberInput = {
      name: "Synthetic person",
      representation: "WORKER",
      participation: "PRINCIPAL",
      validFrom: "2026-01-01",
    };
    equal(
      (
        await request(
          "committees/" + committee.id + "/members",
          admin,
          "POST",
          memberInput,
        )
      ).status,
      201,
      "member create",
    );
    equal(
      (await request("committees/" + committee.id + "/members", admin)).body
        .items.length,
      1,
      "member list",
    );
    equal(
      (await request("committees/" + committee.id + "/members", stranger))
        .status,
      403,
      "member cross-tenant",
    );
    equal(
      (
        await request(
          "committees/" + committee.id + "/members",
          reader,
          "POST",
          memberInput,
        )
      ).status,
      403,
      "reader member write",
    );
    const audits = await pool.query(
      "SELECT * FROM audit_events WHERE entity_id=$1 ORDER BY id",
      [action.id],
    );
    assert.ok(audits.rowCount! >= 6);
    checks++;
    await assert.rejects(
      pool.query("UPDATE audit_events SET event='changed' WHERE id=$1", [
        audits.rows[0].id,
      ]),
      /append-only/,
    );
    checks++;
    await assert.rejects(
      pool.query("DELETE FROM audit_events WHERE id=$1", [audits.rows[0].id]),
      /append-only/,
    );
    checks++;
    equal(
      (await pool.query("SELECT count(*)::int AS total FROM schema_migrations"))
        .rows[0].total,
      readdirSync("migrations").filter((f) => f.endsWith(".sql")).length,
      "all migrations applied",
    );
    equal(
      (
        await pool.query(
          "SELECT count(*)::int AS total FROM users WHERE email IN ('admin@demo.local','lector@demo.local','verificador@demo.local')",
        )
      ).rows[0].total,
      3,
      "seed idempotent",
    );
    await pool.query("UPDATE users SET active=false WHERE id=$1", [outsider]);
    equal(
      (await request("me", stranger)).status,
      401,
      "disabled user token rejected",
    );
    const verifierId = "30000000-0000-4000-8000-000000000002";
    await pool.query("UPDATE users SET active=false WHERE id=$1", [verifierId]);
    equal(
      (
        await request("sites/" + site + "/inspections", admin, "POST", {
          ...input,
          inspectorId: verifierId,
        })
      ).status,
      403,
      "inactive inspector rejected",
    );
    equal(
      (
        await request("findings/" + finding.id + "/actions", admin, "POST", {
          ...actionInput,
          ownerId: verifierId,
        })
      ).status,
      403,
      "inactive action owner rejected",
    );
    const prod = spawnSync(
      process.execPath,
      ["-e", "require('./dist/config.js')"],
      {
        env: {
          ...process.env,
          NODE_ENV: "production",
          LOCAL_AUTH_ENABLED: "true",
        },
        encoding: "utf8",
      },
    );
    assert.notEqual(prod.status, 0);
    assert.match(prod.stderr, /Local authentication must be disabled/);
    checks++;
    console.log(
      "Platform integration: " +
        checks +
        " assertions passed (all domains, two tenants, concurrency, audit and production guard).",
    );
  } finally {
    await pool.query(
      "UPDATE users SET active=true WHERE id='30000000-0000-4000-8000-000000000002'",
    );
    server.kill();
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
