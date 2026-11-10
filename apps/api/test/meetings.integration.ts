import "dotenv/config";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const server = spawn(process.execPath, ["dist/main.js"], {
  env: { ...process.env, PORT: "3003" },
  stdio: "pipe",
});
let logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
async function call(path: string, token = "", method = "GET", body?: unknown) {
  const r = await fetch("http://127.0.0.1:3003/api/v1/" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  return { status: r.status, data: await r.json() };
}
async function main() {
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      try {
        if ((await call("health/ready")).status === 200) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(ready, logs);
    const login = async (email: string) => {
      const response = await call("auth/login", "", "POST", {
        email,
        password: process.env.SEED_PASSWORD,
      });
      assert.equal(response.status, 201, JSON.stringify(response.data));
      return response.data.accessToken as string;
    };
    const admin = await login("admin@demo.local"),
      reader = await login("lector@demo.local");
    const site = (await call("sites", admin)).data.items[0].id;
    const meeting = (
      await call("sites/" + site + "/records/meetings", admin, "POST", {
        title: "Workflow meeting QA",
        committee_id: "40000000-0000-4000-8000-000000000001",
        scheduled_at: "2026-11-09T18:00:00-03:00",
        location: "Local",
        agenda: "Agenda QA",
      })
    ).data;
    assert.ok(meeting.id);
    assert.equal(
      (await call("meetings/" + meeting.id + "/workspace", reader)).status,
      200,
    );
    assert.equal(
      (
        await call("meetings/" + meeting.id + "/minutes", reader, "POST", {
          content: "Unauthorized",
        })
      ).status,
      403,
    );
    const minute = (
      await call("meetings/" + meeting.id + "/minutes", admin, "POST", {
        content: "Initial draft",
      })
    ).data;
    assert.ok(minute.id);
    assert.equal(
      (
        await call("meetings/" + meeting.id + "/minutes", admin, "POST", {
          content: "Duplicate",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call("minutes/" + minute.id + "/draft", admin, "PATCH", {
          version: 1,
          content: "Reviewed text",
          status: "IN_REVIEW",
        })
      ).data.version,
      2,
    );
    assert.equal(
      (
        await call("minutes/" + minute.id + "/draft", admin, "PATCH", {
          version: 1,
          content: "Stale",
          status: "DRAFT",
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await call(
          "sites/" + site + "/records/minutes/" + minute.id,
          admin,
          "PATCH",
          { version: 2, title: "Bypass", content: "Bypass", status: "DRAFT" },
        )
      ).status,
      409,
    );
    const revisions = (
      await call("minutes/" + minute.id + "/revisions", reader)
    ).data.items;
    assert.equal(revisions.length, 2);
    assert.equal(revisions[1].content, "Initial draft");
    const input = {
      title: "Follow-up agreement",
      ownerId: "30000000-0000-4000-8000-000000000001",
      dueOn: "2026-11-20",
    };
    assert.equal(
      (
        await call(
          "minutes/" + minute.id + "/agreements",
          reader,
          "POST",
          input,
        )
      ).status,
      403,
    );
    const agreement = (
      await call("minutes/" + minute.id + "/agreements", admin, "POST", input)
    ).data;
    assert.ok(agreement.id);
    assert.equal(
      (
        await call("agreements/" + agreement.id, admin, "PATCH", {
          version: 1,
          status: "COMPLETED",
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await call("agreements/" + agreement.id, admin, "PATCH", {
          version: 1,
          status: "IN_PROGRESS",
        })
      ).data.version,
      2,
    );
    assert.equal(
      (
        await call("agreements/" + agreement.id, reader, "PATCH", {
          version: 2,
          status: "PENDING_VERIFICATION",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call("agreements/" + agreement.id, admin, "PATCH", {
          version: 2,
          status: "PENDING_VERIFICATION",
        })
      ).status,
      409,
    );
    const firstEvidence = (
      await call("agreements/" + agreement.id + "/evidence", admin, "POST", {
        description: "Registro sintético de cumplimiento",
      })
    ).data;
    assert.equal(firstEvidence.note, "Registro sintético de cumplimiento");
    const visibleEvidence = (
      await call("agreements/" + agreement.id + "/evidence", reader)
    ).data.items;
    assert.equal(visibleEvidence[0].id, firstEvidence.id);
    assert.equal(
      (
        await call("agreements/" + agreement.id, admin, "PATCH", {
          version: 2,
          status: "PENDING_VERIFICATION",
        })
      ).data.version,
      3,
    );
    const verifyBody = {
      version: 3,
      approved: false,
      note: "Falta documentar una comprobación sintética",
    };
    assert.equal(
      (
        await call(
          "agreements/" + agreement.id + "/verification",
          admin,
          "POST",
          verifyBody,
        )
      ).status,
      403,
      "el responsable no debe revisar su propio acuerdo",
    );
    assert.equal(
      (
        await call(
          "agreements/" + agreement.id + "/verification",
          reader,
          "POST",
          verifyBody,
        )
      ).status,
      403,
    );
    const verifier = await login("verificador@demo.local");
    const returnedResponse = await call(
      "agreements/" + agreement.id + "/verification",
      verifier,
      "POST",
      verifyBody,
    );
    assert.equal(returnedResponse.status, 201, JSON.stringify(returnedResponse.data));
    const returned = returnedResponse.data;
    assert.equal(returned.status, "IN_PROGRESS");
    assert.equal(returned.version, 4);
    await call("agreements/" + agreement.id + "/evidence", admin, "POST", {
      description: "Comprobación sintética agregada",
    });
    const submitted = (
      await call("agreements/" + agreement.id, admin, "PATCH", {
        version: 4,
        status: "PENDING_VERIFICATION",
      })
    ).data;
    assert.equal(submitted.version, 5);
    const closed = (
      await call(
        "agreements/" + agreement.id + "/verification",
        verifier,
        "POST",
        {
          version: 5,
          approved: true,
          note: "Verificación sintética registrada",
        },
      )
    ).data;
    assert.equal(closed.status, "COMPLETED");
    assert.equal(closed.version, 6);
    assert.equal(
      (
        await call("agreements/" + agreement.id, admin, "PATCH", {
          version: 6,
          status: "IN_PROGRESS",
        })
      ).status,
      409,
      "un acuerdo cerrado no puede reabrirse directamente",
    );
    const workspace = (
      await call("meetings/" + meeting.id + "/workspace", reader)
    ).data;
    assert.equal(workspace.minute.content, "Reviewed text");
    assert.equal(workspace.agreements[0].status, "COMPLETED");
    assert.ok(
      workspace.history.some(
        (event: { event: string }) => event.event === "agreement.verified",
      ),
    );
    console.log(
      "Meeting workflow passed: linked minute, immutable snapshots, duplicate prevention, permissions, agreement evidence and independent review, concurrency and audit",
    );
  } finally {
    server.kill();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
