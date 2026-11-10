import "dotenv/config";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const server = spawn(process.execPath, ["dist/main.js"], {
  env: { ...process.env, PORT: "3005", NODE_ENV: "test" },
  stdio: "pipe",
});
let logs = "";
server.stdout.on("data", (data) => (logs += data));
server.stderr.on("data", (data) => (logs += data));
let checks = 0;

function eq(actual: unknown, expected: unknown, label: string) {
  assert.deepEqual(actual, expected, label);
  checks++;
}

async function call(
  path: string,
  token = "",
  method = "GET",
  body?: unknown,
) {
  const response = await fetch("http://127.0.0.1:3005/api/v1/" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, data: await response.json() };
}

async function main() {
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        if ((await call("health/ready")).status === 200) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, logs);
    const login = async (email: string) => {
      const response = await call("auth/login", "", "POST", {
        email,
        password: process.env.SEED_PASSWORD,
      });
      if (response.status !== 201 && response.status !== 200)
        throw new Error(`Login failed for ${email}: ${response.status}`);
      return response.data.accessToken as string;
    };
    const admin = await login("admin@demo.local");
    const reader = await login("lector@demo.local");
    // The preceding platform integration deliberately deactivates the verifier account.
    await pool.query(
      "UPDATE users SET active=true WHERE id='30000000-0000-4000-8000-000000000002'",
    );
    const reviewer = await login("verificador@demo.local");
    const me = await call("me", admin);
    eq(me.data.platform_roles.includes("PLATFORM_ADMIN"), true, "demo platform role seeded");
    eq((await call("me", reader)).data.platform_roles, [], "reader has no global role");
    eq((await call("organizations", reader)).status, 403, "reader cannot list customer companies");
    eq((await call("platform/users", reader)).status, 403, "reader cannot list platform accounts");

    const suffix = randomUUID().slice(0, 8);
    const organizationName = "QA Workspace " + suffix;
    const createdResponse = await call("organizations", admin, "POST", {
      name: organizationName,
      firstSiteName: "Faena QA " + suffix,
      committee: {
        name: "Comité Paritario QA",
        validFrom: "2026-01-01",
        validUntil: "2027-12-31",
      },
    });
    eq(createdResponse.status, 201, "company, first faena and committee created");
    const organizationId = createdResponse.data.organization.id as string;
    const firstSiteId = createdResponse.data.site.id as string;
    const managerId = randomUUID();
    const managerEmail = `manager-${suffix}@demo.local`;
    await pool.query("INSERT INTO people(id,display_name) VALUES($1,$2)", [
      managerId,
      "Administrador de empresa QA",
    ]);
    const passwordHash = (
      await pool.query(
        "SELECT password_hash FROM users WHERE id='30000000-0000-4000-8000-000000000001'",
      )
    ).rows[0].password_hash;
    await pool.query(
      "INSERT INTO users(id,email,name,password_hash,person_id) VALUES($1,$2,$3,$4,$1)",
      [managerId, managerEmail, "Administrador de empresa QA", passwordHash],
    );
    const manager = await login(managerEmail);
    eq(createdResponse.data.committee.site_id, firstSiteId, "first committee tied to site");
    eq(
      (
        await pool.query(
          "SELECT role FROM site_access WHERE site_id=$1 AND user_id='30000000-0000-4000-8000-000000000001' AND revoked_at IS NULL",
          [firstSiteId],
        )
      ).rows[0].role,
      "ADMIN",
      "creator receives explicit site administration",
    );
    eq(
      (
        await call("sites/" + firstSiteId + "/users/" + managerId, admin, "PUT", {
          role: "ADMIN",
        })
      ).status,
      200,
      "platform admin can assign an existing account as a site administrator",
    );
    const siteCandidates = await call(
      "sites/" + firstSiteId + "/access-candidates",
      manager,
    );
    eq(siteCandidates.status, 200, "site admin can view its company access candidates");
    eq(
      siteCandidates.data.items.some(
        (user: { email: string }) => user.email === "admin@demo.local",
      ),
      true,
      "site access candidates include account email for assignment",
    );
    eq(
      siteCandidates.data.items.some(
        (user: { email: string }) => user.email === "verificador@demo.local",
      ),
      false,
      "site admins cannot browse accounts outside their company",
    );
    eq(
      (
        await call(
          "sites/" + firstSiteId + "/users/30000000-0000-4000-8000-000000000002",
          manager,
          "PUT",
          { role: "VIEWER" },
        )
      ).status,
      404,
      "site admins cannot assign accounts from another company",
    );
    eq(
      (await call("sites/" + firstSiteId + "/access-candidates", reviewer)).status,
      403,
      "review-only accounts cannot list access candidates",
    );
    eq(
      (
        await call("sites/" + firstSiteId + "/users/" + managerId, manager, "DELETE")
      ).status,
      409,
      "a site admin cannot remove their only active-site access",
    );
    eq(
      (
        await call("organizations", admin, "POST", {
          name: organizationName.toLowerCase(),
          firstSiteName: "Duplicate faena",
          committee: { name: "Comité", validFrom: "2026-01-01" },
        })
      ).status,
      409,
      "company names are unique ignoring case",
    );
    eq(
      (
        await call("organizations", admin, "POST", {
          name: "Invalid QA " + suffix,
          firstSiteName: "Invalid site",
          committee: {
            name: "Comité",
            validFrom: "2027-01-01",
            validUntil: "2026-01-01",
          },
        })
      ).status,
      422,
      "invalid committee period rejected",
    );

    const secondSite = await call(
      "organizations/" + organizationId + "/sites",
      admin,
      "POST",
      {
        name: "Segunda Faena QA " + suffix,
        committee: { name: "Comité Segundo", validFrom: "2026-03-01" },
      },
    );
    eq(secondSite.status, 201, "additional faena created with its own committee");
    const secondSiteId = secondSite.data.site.id as string;
    eq(
      (await call("organizations/" + organizationId + "/sites", admin)).data.items.length,
      2,
      "faenas listed under their company",
    );
    eq(
      (await call("organizations/" + organizationId + "/users", admin)).data.items.length,
      2,
      "company directory contains only users already assigned within it",
    );
    eq((await call("platform/users", admin)).data.items.length >= 3, true, "platform can list active accounts");

    eq(
      (
        await call("sites/" + secondSiteId + "/users/30000000-0000-4000-8000-000000000003", reader, "PUT", {
          role: "VIEWER",
        })
      ).status,
      403,
      "reader cannot assign users",
    );
    const assigned = await call(
      "sites/" + secondSiteId + "/users/30000000-0000-4000-8000-000000000003",
      admin,
      "PUT",
      { role: "VIEWER" },
    );
    eq(assigned.status, 200, "existing account assigned to a faena");
    eq(
      (
        await call("sites/" + secondSiteId + "/users/30000000-0000-4000-8000-000000000003", admin, "PUT", {
          role: "VIEWER",
        })
      ).data.role,
      "VIEWER",
      "repeating the same assignment is idempotent",
    );
    await call(
      "sites/" + secondSiteId + "/users/30000000-0000-4000-8000-000000000003",
      admin,
      "PUT",
      { role: "EDITOR" },
    );
    eq(
      (
        await call("sites/" + secondSiteId + "/users", admin)
      ).data.items.find((user: { id: string }) => user.id === "30000000-0000-4000-8000-000000000003").role,
      "EDITOR",
      "role change is visible to site admins",
    );
    eq(
      (await call("sites/" + secondSiteId + "/records/meetings", reader)).status,
      200,
      "new access is immediately usable",
    );
    eq(
      (
        await call("sites/" + secondSiteId + "/users/30000000-0000-4000-8000-000000000003", admin, "DELETE")
      ).data.revoked,
      true,
      "site access can be revoked without deleting history",
    );
    eq(
      (await call("sites/" + secondSiteId + "/records/meetings", reader)).status,
      403,
      "revoked access stops working",
    );
    await call(
      "sites/" + secondSiteId + "/users/30000000-0000-4000-8000-000000000003",
      admin,
      "PUT",
      { role: "REVIEWER" },
    );
    eq(
      (await call("sites/" + secondSiteId + "/records/meetings", reader)).status,
      200,
      "a revoked user can be granted access again",
    );
    eq(
      (
        await pool.query(
          "SELECT event FROM site_access_events WHERE site_id=$1 AND user_id='30000000-0000-4000-8000-000000000003' ORDER BY id",
          [secondSiteId],
        )
      ).rows.map((row) => row.event),
      ["GRANTED", "ROLE_CHANGED", "REVOKED", "GRANTED"],
      "all access changes are retained in order",
    );
    await assert.rejects(
      pool.query("UPDATE site_access_events SET event='REVOKED' WHERE site_id=$1", [secondSiteId]),
      /append-only/,
    );
    checks++;

    eq(
      (
        await call("sites/" + secondSiteId + "/users/30000000-0000-4000-8000-000000000001", admin, "DELETE")
      ).status,
      409,
      "the last site administrator cannot remove their own access",
    );
    eq(
      (
        await call("sites/" + firstSiteId, admin, "PUT", {
          name: "Updated Faena QA " + suffix,
          active: true,
          version: 1,
        })
      ).data.version,
      2,
      "site updates use optimistic versioning",
    );
    eq(
      (
        await call("sites/" + firstSiteId, admin, "PUT", {
          name: "Stale Faena QA " + suffix,
          active: true,
          version: 1,
        })
      ).status,
      409,
      "stale site edits are rejected",
    );
    const duplicateSite = await call(
      "organizations/" + organizationId + "/sites",
      admin,
      "POST",
      {
        name: "updated faena qa " + suffix,
        committee: { name: "Comité", validFrom: "2026-01-01" },
      },
    );
    eq(duplicateSite.status, 409, "faena names are unique ignoring case within a company");

    const accessHistoryCount = Number(
      (
        await pool.query("SELECT count(*)::int AS count FROM site_access_events WHERE site_id=$1", [secondSiteId])
      ).rows[0].count,
    );
    eq(accessHistoryCount, 5, "access ledger contains the administrator grant and all user changes");
    const auditCount = Number(
      (
        await pool.query("SELECT count(*)::int AS count FROM audit_events WHERE site_id IN ($1,$2)", [firstSiteId, secondSiteId])
      ).rows[0].count,
    );
    eq(auditCount >= 6, true, "organization, site and access operations are audited");

    console.log(`Workspace integration: ${checks} assertions passed.`);
  } finally {
    server.kill();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
