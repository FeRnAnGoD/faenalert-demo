import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { Pool } from "pg";
import { hashPassword } from "../src/auth/password";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const server = spawn(process.execPath, ["dist/main.js"], {
  env: { ...process.env, PORT: "3006", NODE_ENV: "test" },
  stdio: "pipe",
});
let logs = "";
server.stdout.on("data", (data) => (logs += data));
server.stderr.on("data", (data) => (logs += data));
let checks = 0;

async function call(path: string, token = "", method = "GET", body?: unknown) {
  const response = await fetch("http://127.0.0.1:3006/api/v1/" + path, {
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

function equal(actual: unknown, expected: unknown, label: string) {
  assert.deepEqual(actual, expected, label);
  checks++;
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
    const login = async (email: string) =>
      (
        await call("auth/login", "", "POST", {
          email,
          password: process.env.SEED_PASSWORD,
        })
      ).data.accessToken;
    const admin = await login("admin@demo.local");
    const reader = await login("lector@demo.local");
    await pool.query(
      "UPDATE users SET active=true WHERE email='verificador@demo.local'",
    );
    const verifier = await login("verificador@demo.local");
    const site = (await call("sites", admin)).data.items[0].id;

    const training = (
      await call("sites/" + site + "/records/trainings", admin, "POST", {
        title: "Capacitación de demostración",
        scheduled_at: "2026-11-12T10:00:00-03:00",
        instructor: "Relator ficticio",
        description: "Contenido formativo sintético",
      })
    ).data;
    const participantPath = "trainings/" + training.id + "/participants";
    equal((await call(participantPath, reader)).status, 200, "reader sees roster");
    equal(
      (await call(participantPath, reader, "POST", { participant_name: "Persona ficticia" })).status,
      403,
      "reader cannot add participant",
    );
    equal(
      (await call(participantPath, admin, "POST", { participant_name: " " })).status,
      422,
      "blank participant rejected",
    );
    equal(
      (await call(participantPath, admin, "POST", { participant_name: "Persona ficticia", extra: true })).status,
      422,
      "unknown participant fields rejected",
    );
    const participant = (
      await call(participantPath, admin, "POST", { participant_name: "Persona ficticia" })
    ).data;
    const secondTraining = (
      await call("sites/" + site + "/records/trainings", admin, "POST", {
        title: "Otra capacitación de demostración",
        scheduled_at: "2026-11-13T10:00:00-03:00",
        instructor: "Relator ficticio",
        description: "Segundo registro sintético",
      })
    ).data;
    equal(participant.attended, null, "attendance begins unrecorded");
    const marked = await call(
      participantPath + "/" + participant.id,
      admin,
      "PATCH",
      { version: participant.version, attended: true },
    );
    equal(marked.data.attended, true, "attendance saved");
    equal(marked.data.version, 2, "attendance version advances");
    equal(
      (await call(participantPath + "/" + participant.id, admin, "PATCH", {
        version: participant.version,
        attended: false,
      })).status,
      409,
      "stale attendance update rejected",
    );
    equal(
      (await call(participantPath, admin)).data.items[0].participant_name,
      "Persona ficticia",
      "roster is scoped to training",
    );

    const evidencePath = "trainings/" + training.id + "/evidence";
    equal(
      (await call(evidencePath, reader, "POST", { description: "No autorizado" })).status,
      403,
      "reader cannot record evidence",
    );
    equal(
      (await call(evidencePath, admin, "POST", { description: " " })).status,
      422,
      "blank training evidence rejected",
    );
    const trainingEvidence = await call(evidencePath, admin, "POST", {
      description: "Lista de asistencia de demostración revisada",
    });
    equal(trainingEvidence.status, 201, "descriptive training evidence recorded");
    equal(
      (await call(evidencePath, reader)).data.items[0].description,
      "Lista de asistencia de demostración revisada",
      "reader can inspect evidence",
    );
    equal(
      (await pool.query("SELECT count(*)::int AS total FROM audit_events WHERE entity_id=$1 AND event='training_evidence.created'", [trainingEvidence.data.id])).rows[0].total,
      1,
      "training evidence audit recorded",
    );

    const commission = (
      await call("sites/" + site + "/records/commissions", admin, "POST", {
        title: "Comisión de demostración",
        objective: "Objetivo sintético de seguimiento",
      })
    ).data;
    const actionPath = "commissions/" + commission.id + "/actions";
    equal(
      (await call(actionPath, reader, "POST", {
        title: "Tarea no autorizada",
        ownerId: (await call("me", admin)).data.id,
        dueOn: "2026-11-20",
        priority: "MEDIUM",
      })).status,
      403,
      "reader cannot create commission action",
    );
    const adminId = (await call("me", admin)).data.id;
    const action = (
      await call(actionPath, admin, "POST", {
        title: "Revisar procedimiento de trabajo",
        ownerId: adminId,
        dueOn: "2026-11-20",
        priority: "HIGH",
      })
    ).data;
    equal(action.commission_id, commission.id, "action remains linked to commission");
    equal(
      (await call(actionPath, reader)).data.items[0].id,
      action.id,
      "read access lists commission actions",
    );
    const commitments = await call("sites/" + site + "/commitments?state=all", admin);
    const commissionCommitment = commitments.data.items.find(
      (item: { id: string; source: string; source_id: string }) =>
        item.id === action.id &&
        item.source === "COMMISSION" &&
        item.source_id === commission.id,
    );
    equal(
      commissionCommitment?.version,
      action.version,
      "unified commitments expose the action version for review",
    );
    await call("actions/" + action.id, admin, "PATCH", {
      version: 1,
      status: "IN_PROGRESS",
    });
    await call("actions/" + action.id + "/evidence", admin, "POST", {
      description: "Registro textual ficticio",
    });
    await call("actions/" + action.id, admin, "PATCH", {
      version: 2,
      status: "PENDING_VERIFICATION",
    });
    const verified = await call(
      "actions/" + action.id + "/verification",
      verifier,
      "POST",
      { version: 3, approved: true, note: "Revisión de demostración" },
    );
    assert.equal(verified.status, 201, JSON.stringify(verified.data) + logs);
    equal(verified.data.status, "CLOSED", "commission action uses independent verification");

    const orgId = randomUUID();
    const otherSite = randomUUID();
    const outsiderId = randomUUID();
    const otherTraining = randomUUID();
    const otherCommission = randomUUID();
    await pool.query("INSERT INTO organizations(id,name) VALUES($1,'Training isolation')", [orgId]);
    await pool.query("INSERT INTO sites(id,organization_id,name) VALUES($1,$2,'Other site')", [otherSite, orgId]);
    await pool.query(
      "INSERT INTO users(id,email,name,password_hash) VALUES($1,$2,'Outsider',$3)",
      [outsiderId, "workflow-outsider-" + outsiderId + "@demo.local", hashPassword(process.env.SEED_PASSWORD!)],
    );
    await pool.query("INSERT INTO site_access(site_id,user_id,role) VALUES($1,$2,'EDITOR')", [otherSite, outsiderId]);
    await pool.query(
      "INSERT INTO trainings(id,site_id,title,scheduled_at,instructor,description) VALUES($1,$2,'Other training',now(),'Synthetic','Synthetic')",
      [otherTraining, otherSite],
    );
    await pool.query("INSERT INTO commissions(id,site_id,title,objective) VALUES($1,$2,'Other commission','Synthetic')", [otherCommission, otherSite]);
    const outsider = await login("workflow-outsider-" + outsiderId + "@demo.local");
    equal((await call("trainings/" + training.id + "/participants", outsider)).status, 403, "cross-site roster denied");
    equal((await call("trainings/" + otherTraining + "/participants", admin)).status, 403, "foreign training denied");
    equal((await call("commissions/" + otherCommission + "/actions", admin)).status, 403, "foreign commission tasks denied");
    equal(
      (await call("trainings/" + secondTraining.id + "/participants/" + participant.id, admin, "PATCH", {
        version: marked.data.version,
        participant_name: "Changed from another training",
      })).status,
      404,
      "participant cannot be attached to another training route",
    );
    equal(
      (await call(actionPath, admin, "POST", {
        title: "Cross site owner blocked",
        ownerId: outsiderId,
        dueOn: "2026-11-20",
        priority: "LOW",
      })).status,
      403,
      "commission action owner must have write access in the same site",
    );
    const raw = await pool.query(
      "SELECT (SELECT count(*)::int FROM training_participants WHERE training_id=$1) AS participants,(SELECT count(*)::int FROM training_evidence WHERE training_id=$1) AS evidence,(SELECT count(*)::int FROM actions WHERE commission_id=$2) AS tasks",
      [training.id, commission.id],
    );
    equal(raw.rows[0], { participants: 1, evidence: 1, tasks: 1 }, "records persist in their parent workflow");
    console.log(`Training and commission workflows passed: ${checks} assertions.`);
  } finally {
    server.kill();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
