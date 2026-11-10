import "dotenv/config";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const server = spawn(process.execPath, ["dist/main.js"], {
  env: { ...process.env, PORT: "3001", NODE_ENV: "test" },
  stdio: "pipe",
});
let logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
async function request(
  path: string,
  token = "",
  method = "GET",
  body?: unknown,
) {
  const r = await fetch("http://127.0.0.1:3001/api/v1/" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, body: await r.json() };
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
      verifier = await login("verificador@demo.local"),
      reader = await login("lector@demo.local");
    assert.ok(admin && verifier && reader);
    const site = (await request("sites", admin)).body.items[0].id;
    const owner = "30000000-0000-4000-8000-000000000001";
    const other = (
      await pool.query(
        "INSERT INTO sites(organization_id,name) SELECT organization_id,'Isolated integration fixture' FROM sites WHERE id=$1 RETURNING id",
        [site],
      )
    ).rows[0].id;
    assert.equal((await request("sites/" + site + "/search", admin, "POST", { q: "x" })).status, 422);
    assert.equal((await request("sites/" + site + "/search", "", "POST", { q: "faena" })).status, 401);
    assert.equal((await request("sites/" + other + "/search", admin, "POST", { q: "faena" })).status, 403);
    const readOnlySearch = await request("sites/" + site + "/search", reader, "POST", { q: "Sofía Prevención" });
    assert.equal(readOnlySearch.status, 200, JSON.stringify(readOnlySearch.body));
    const committee = (await pool.query("SELECT id FROM committees WHERE site_id=$1 ORDER BY valid_from DESC LIMIT 1", [site])).rows[0].id;
    await pool.query(
      "INSERT INTO meetings(site_id,title,scheduled_at,location,agenda,committee_id,created_at) SELECT $1,'Search page-depth fixture recent '||n,'2026-11-10T18:00:00Z','Synthetic archive','Search fixture',$2,now() FROM generate_series(1,24) n",
      [site, committee],
    );
    await pool.query(
      "INSERT INTO meetings(site_id,title,scheduled_at,location,agenda,committee_id,created_at) VALUES($1,'Search page-depth fixture older target','2026-11-10T18:00:00Z','Synthetic archive','Deep page result',$2,now()-interval '90 days')",
      [site, committee],
    );
    const deepSearch = await request("sites/" + site + "/search", admin, "POST", { q: "page-depth fixture older target" });
    assert.equal(deepSearch.status, 200);
    assert.equal(deepSearch.body.items.length, 1);
    assert.equal(deepSearch.body.items[0].page, "reuniones");
    assert.equal(deepSearch.body.items[0].record.agenda, "Deep page result");
    const incidentSearch = await request("sites/" + site + "/search", admin, "POST", { q: "Observación preventiva ficticia" });
    assert.equal(incidentSearch.body.items.some((item: any) => item.page === "accidentes"), true);
    const memberSearch = await request("sites/" + site + "/search", admin, "POST", { q: "Sofía Prevención" });
    assert.equal(memberSearch.body.items.some((item: any) => item.page === "integrantes"), true);
    const cappedSearch = await request("sites/" + site + "/search", admin, "POST", { q: "page-depth fixture recent" });
    assert.equal(cappedSearch.body.items.length, 8);
    assert.equal(new Set(cappedSearch.body.items.map((item: any) => item.id + item.page)).size, 8);
    const wildcardSearch = await request("sites/" + site + "/search", admin, "POST", { q: "%%" });
    assert.deepEqual(wildcardSearch.body.items, []);
    assert.equal((await request("sites/" + site + "/search", admin, "POST", { q: "x".repeat(101) })).status, 422);
    await pool.query("DELETE FROM meetings WHERE site_id=$1 AND title LIKE 'Search page-depth fixture%'", [site]);
    assert.equal(
      (await request("sites/" + other + "/inspections", admin)).status,
      403,
    );
    assert.equal((await request("sites/" + site + "/inspections")).status, 401);
    const payload = {
      title: "Integration inspection",
      area: "Synthetic",
      inspectedOn: "2026-11-07",
      inspectorId: owner,
    };
    assert.equal(
      (await request("sites/" + site + "/inspections", reader, "POST", payload))
        .status,
      403,
    );
    assert.equal(
      (
        await request("sites/" + site + "/inspections", admin, "POST", {
          ...payload,
          area: "",
        })
      ).status,
      422,
    );
    const inspection = (
      await request("sites/" + site + "/inspections", admin, "POST", payload)
    ).body;
    assert.ok(inspection.id);
    const finding = (
      await request(
        "inspections/" + inspection.id + "/findings",
        admin,
        "POST",
        { description: "Synthetic finding" },
      )
    ).body;
    const action = (
      await request("findings/" + finding.id + "/actions", admin, "POST", {
        title: "Corrective measure",
        ownerId: owner,
        dueOn: "2026-11-15",
        priority: "HIGH",
      })
    ).body;
    assert.ok(action.id);
    assert.equal(
      (
        await request("actions/" + action.id, admin, "PATCH", {
          version: 1,
          status: "PENDING_VERIFICATION",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("actions/" + action.id, admin, "PATCH", {
          version: 1,
          status: "IN_PROGRESS",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request("actions/" + action.id, admin, "PATCH", {
          version: 1,
          status: "IN_PROGRESS",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("actions/" + action.id, admin, "PATCH", {
          version: 2,
          status: "PENDING_VERIFICATION",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("actions/" + action.id + "/evidence", admin, "POST", {
          description: "Evidence synthetic note",
        })
      ).status,
      201,
    );
    assert.equal(
      (
        await request("actions/" + action.id, admin, "PATCH", {
          version: 2,
          status: "PENDING_VERIFICATION",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request("actions/" + action.id + "/verification", admin, "POST", {
          version: 3,
          approved: true,
          note: "Self verification",
        })
      ).status,
      403,
    );
    const closed = await request(
      "actions/" + action.id + "/verification",
      verifier,
      "POST",
      { version: 3, approved: true, note: "Independently verified" },
    );
    assert.equal(closed.body.status, "CLOSED");
    const stored = (await request("inspections/" + inspection.id, admin)).body;
    assert.equal(stored.findings[0].actions[0].status, "CLOSED");
    const meeting = (
      await request("sites/" + site + "/records/meetings", admin, "POST", {
        title: "Synthetic meeting",
        committee_id: "40000000-0000-4000-8000-000000000001",
        scheduled_at: "2026-11-09T10:00:00-03:00",
        location: "Local",
        agenda: "Review",
      })
    ).body;
    assert.ok(meeting.id);
    assert.equal(
      (
        await request(
          "sites/" + other + "/records/meetings/" + meeting.id,
          admin,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request(
          "sites/" + site + "/records/meetings/" + meeting.id,
          reader,
          "PATCH",
          {
            version: 1,
            title: "x",
            committee_id: "40000000-0000-4000-8000-000000000001",
            scheduled_at: "2026-11-09T10:00:00Z",
            location: "x",
            agenda: "x",
          },
        )
      ).status,
      403,
    );
    assert.ok(
      (
        await pool.query("SELECT 1 FROM audit_events WHERE entity_id=$1", [
          action.id,
        ])
      ).rowCount,
    );
    await pool.query("DELETE FROM sites WHERE id=$1", [other]);
    console.log(
      "Integration passed: auth, permissions, validation, version conflicts, evidence, independent closure, persistence, operations and audit",
    );
  } finally {
    server.kill();
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
