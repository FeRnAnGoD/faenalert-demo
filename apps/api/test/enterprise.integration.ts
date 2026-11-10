import "dotenv/config";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { hashPassword } from "../src/auth/password";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const server = spawn(process.execPath, ["dist/main.js"], {
  env: { ...process.env, PORT: "3004", NODE_ENV: "test" },
  stdio: "pipe",
});
let logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
let checks = 0;
function eq(a: unknown, b: unknown, label: string) {
  assert.deepEqual(a, b, label);
  checks++;
}
async function call(path: string, token = "", method = "GET", body?: unknown) {
  const r = await fetch("http://127.0.0.1:3004/api/v1/" + path, {
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
    const login = async (email: string) =>
      (
        await call("auth/login", "", "POST", {
          email,
          password: process.env.SEED_PASSWORD,
        })
      ).data.accessToken;
    const admin = await login("admin@demo.local"),
      reader = await login("lector@demo.local");
    const site = (await call("sites", admin)).data.items[0].id,
      committee = "40000000-0000-4000-8000-000000000001";
    const editorId = randomUUID(),
      foreignSite = randomUUID(),
      foreignOrg = randomUUID(),
      foreignCommittee = randomUUID();
    await pool.query("INSERT INTO people(id,display_name) VALUES($1,$2)", [
      editorId,
      "Enterprise editor",
    ]);
    await pool.query(
      "INSERT INTO users(id,email,name,password_hash,person_id) VALUES($1,'enterprise-editor@demo.local','Enterprise editor',$2,$1)",
      [editorId, hashPassword(process.env.SEED_PASSWORD!)],
    );
    await pool.query(
      "INSERT INTO site_access(site_id,user_id,role) VALUES($1,$2,'EDITOR')",
      [site, editorId],
    );
    const editor = await login("enterprise-editor@demo.local");
    await pool.query(
      "INSERT INTO organizations(id,name) VALUES($1,'Enterprise isolated tenant')",
      [foreignOrg],
    );
    await pool.query(
      "INSERT INTO sites(id,organization_id,name) VALUES($1,$2,'Foreign site')",
      [foreignSite, foreignOrg],
    );
    await pool.query(
      "INSERT INTO committees(id,site_id,name,valid_from,valid_until) VALUES($1,$2,'Foreign committee','2026-01-01','2030-01-01')",
      [foreignCommittee, foreignSite],
    );
    const foreignMeetingId = randomUUID();
    const foreignMinuteId = randomUUID();
    const foreignAgreementId = randomUUID();
    await pool.query(
      "INSERT INTO meetings(id,site_id,committee_id,title,scheduled_at,location,agenda,created_by,updated_by) VALUES($1,$2,$3,'Foreign meeting','2026-11-10T18:00:00-03:00','Synthetic','Foreign agenda',$4,$4)",
      [foreignMeetingId, foreignSite, foreignCommittee, editorId],
    );
    await pool.query(
      "INSERT INTO minutes(id,site_id,meeting_id,title,content,status,created_by,updated_by) VALUES($1,$2,$3,'Foreign minute','Foreign content','DRAFT',$4,$4)",
      [foreignMinuteId, foreignSite, foreignMeetingId, editorId],
    );
    await pool.query(
      "INSERT INTO agreements(id,minute_id,title,owner_id,due_on) VALUES($1,$2,'Foreign agreement',$3,'2026-11-20')",
      [foreignAgreementId, foreignMinuteId, editorId],
    );
    eq(
      (
        await call(
          "agreements/" + foreignAgreementId + "/evidence",
          reader,
        )
      ).status,
      403,
      "agreement evidence read stays within the faena",
    );
    eq(
      (
        await call(
          "agreements/" + foreignAgreementId + "/evidence",
          editor,
          "POST",
          { description: "Cross-faena write" },
        )
      ).status,
      403,
      "agreement evidence write stays within the faena",
    );
    eq(
      (
        await call("agreements/" + foreignAgreementId, editor, "PATCH", {
          version: 1,
          status: "IN_PROGRESS",
        })
      ).status,
      403,
      "agreement transition stays within the faena",
    );
    eq(
      (
        await call(
          "agreements/" + foreignAgreementId + "/verification",
          admin,
          "POST",
          {
            version: 1,
            approved: true,
            note: "Cross-faena review",
          },
        )
      ).status,
      403,
      "agreement verification stays within the faena",
    );
    const input = {
      title: "Enterprise meeting",
      committee_id: committee,
      scheduled_at: "2026-11-10T18:00:00-03:00",
      location: "Synthetic",
      agenda: "Committee follow-up",
    };
    eq(
      (
        await call("sites/" + site + "/records/meetings", admin, "POST", {
          ...input,
          committee_id: foreignCommittee,
        })
      ).status,
      422,
      "cross-site committee rejected",
    );
    eq(
      (
        await call("sites/" + site + "/records/meetings", admin, "POST", {
          ...input,
          scheduled_at: "2040-01-01T18:00:00Z",
        })
      ).status,
      422,
      "out-of-period meeting rejected",
    );
    const meeting = (
      await call("sites/" + site + "/records/meetings", admin, "POST", input)
    ).data;
    assert.ok(meeting.id);
    eq(
      (await call("meetings/" + meeting.id + "/workspace", reader)).data.meeting
        .committee_id,
      committee,
      "committee context preserved",
    );
    const minute = (
      await call("meetings/" + meeting.id + "/minutes", admin, "POST", {
        content: "Initial enterprise draft",
      })
    ).data;
    const revised = (
      await call("minutes/" + minute.id + "/draft", editor, "PATCH", {
        version: 1,
        content: "Text under review",
        status: "IN_REVIEW",
      })
    ).data;
    eq(revised.version, 2, "editor can prepare review");
    const revisions = (
      await call("minutes/" + minute.id + "/revisions", reader)
    ).data;
    eq(revisions.items[0].title, minute.title, "revision includes title");
    eq(revisions.items[0].status, "IN_REVIEW", "revision includes status");
    eq(revisions.items[0].meeting_id, meeting.id, "revision includes meeting");
    eq(
      revisions.items[0].actor_name,
      "Enterprise editor",
      "revision attribution",
    );
    await assert.rejects(
      pool.query("UPDATE minute_revisions SET content=$1 WHERE minute_id=$2", [
        "changed",
        minute.id,
      ]),
      /append-only/,
    );
    checks++;
    await assert.rejects(
      pool.query("DELETE FROM minute_revisions WHERE minute_id=$1", [
        minute.id,
      ]),
      /append-only/,
    );
    checks++;
    const metadata = (
      await pool.query(
        "SELECT created_by,updated_by FROM minutes WHERE id=$1",
        [minute.id],
      )
    ).rows[0];
    eq(
      metadata.created_by,
      "30000000-0000-4000-8000-000000000001",
      "original author preserved",
    );
    eq(metadata.updated_by, editorId, "editor tracked");
    const calendar = (
      await pool.query(
        "SELECT (now() AT TIME ZONE timezone)::date AS today FROM sites WHERE id=$1",
        [site],
      )
    ).rows[0].today;
    // Read ISO calendar string without relying on the Node process timezone.
    const due = (
      await pool.query(
        "SELECT to_char((now() AT TIME ZONE timezone)::date-1,'YYYY-MM-DD') AS date FROM sites WHERE id=$1",
        [site],
      )
    ).rows[0].date;
    const agreement = (
      await call("minutes/" + minute.id + "/agreements", admin, "POST", {
        title: "Enterprise overdue agreement",
        ownerId: editorId,
        dueOn: due,
      })
    ).data;
    const list = (
      await call(
        "sites/" + site + "/commitments?state=overdue&owner=" + editorId,
        reader,
      )
    ).data;
    eq(
      list.items.some((r: { id: string }) => r.id === agreement.id),
      true,
      "metric drilldown includes record",
    );
    eq(list.summary.overdue, list.total, "metric matches filtered records");
    eq(list.items[0].source_id, meeting.id, "meeting source link");
    eq(
      (await call("sites/" + foreignSite + "/commitments", admin)).status,
      403,
      "commitment isolation",
    );
    eq(
      (await call("sites/" + site + "/commitments?pageSize=101", reader))
        .status,
      422,
      "bounded page size",
    );
    await call("agreements/" + agreement.id, editor, "PATCH", {
      version: 1,
      status: "IN_PROGRESS",
    });
    await call("agreements/" + agreement.id + "/evidence", editor, "POST", {
      description: "Synthetic evidence for the overdue agreement",
    });
    await call("agreements/" + agreement.id, editor, "PATCH", {
      version: 2,
      status: "PENDING_VERIFICATION",
    });
    await call(
      "agreements/" + agreement.id + "/verification",
      admin,
      "POST",
      {
        version: 3,
        approved: true,
        note: "Synthetic independent review",
      },
    );
    const closed = (
      await pool.query("SELECT closed_at FROM agreements WHERE id=$1", [
        agreement.id,
      ])
    ).rows[0];
    assert.ok(closed.closed_at);
    checks++;
    await assert.rejects(
      pool.query("UPDATE evidence SET note='tampered' WHERE agreement_id=$1", [
        agreement.id,
      ]),
      /append-only/,
    );
    checks++;
    await assert.rejects(
      pool.query(
        "DELETE FROM verifications WHERE agreement_id=$1",
        [agreement.id],
      ),
      /append-only/,
    );
    checks++;
    await assert.rejects(
      pool.query(
        "INSERT INTO evidence(action_id,agreement_id,author_id,note) VALUES($1,$2,$3,'invalid dual link')",
        [
          "c0000000-0000-4000-8000-000000000001",
          agreement.id,
          "30000000-0000-4000-8000-000000000001",
        ],
      ),
      /evidence_exactly_one_parent/,
    );
    checks++;
    const noLongerOverdue = (
      await call(
        "sites/" + site + "/commitments?state=overdue&owner=" + editorId,
        reader,
      )
    ).data;
    eq(
      noLongerOverdue.items.some((r: { id: string }) => r.id === agreement.id),
      false,
      "closure leaves overdue metric",
    );
    await pool.query(
      "INSERT INTO audit_events(site_id,actor_id,entity_id,event,details) SELECT $1,$2,$3,'minute.updated',jsonb_build_object('toVersion',i) FROM generate_series(1,25) i",
      [site, editorId, minute.id],
    );
    const history = (
      await call("meetings/" + meeting.id + "/workspace?historyPage=2", reader)
    ).data;
    eq(history.historyPage.page, 2, "history paginated");
    eq(history.history.length > 0, true, "history second page");
    eq(
      history.history.every((h: { actor_name: string }) => !!h.actor_name),
      true,
      "human-readable actor",
    );
    const memberInput = {
      name: "Enterprise editor",
      personId: editorId,
      representation: "WORKER",
      participation: "PRINCIPAL",
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
    };
    eq(
      (
        await call(
          "committees/" + committee + "/members",
          admin,
          "POST",
          memberInput,
        )
      ).status,
      422,
      "full committee seat capacity enforced",
    );
    const membershipCommittee = randomUUID();
    await pool.query(
      "INSERT INTO committees(id,site_id,name,valid_from,valid_until) VALUES($1,$2,'Membership fixture','2026-01-01','2027-12-31')",
      [membershipCommittee, site],
    );
    const member = (
      await call(
        "committees/" + membershipCommittee + "/members",
        admin,
        "POST",
        memberInput,
      )
    ).data;
    assert.ok(member.id);
    eq(member.person_id, editorId, "person reused for membership");
    eq(
      (
        await call(
          "committees/" + membershipCommittee + "/members",
          admin,
          "POST",
          memberInput,
        )
      ).status,
      409,
      "overlapping participation blocked",
    );
    eq(
      (
        await call("members/" + member.id + "/end", editor, "PATCH", {
          version: 1,
          validUntil: "2026-11-07",
        })
      ).status,
      403,
      "manage permission distinct from editing",
    );
    eq(
      (
        await call("members/" + member.id + "/end", admin, "PATCH", {
          version: 1,
          validUntil: "2026-11-07",
        })
      ).data.version,
      2,
      "membership history ended without deletion",
    );
    eq(
      (
        await call("members/" + member.id + "/end", admin, "PATCH", {
          version: 1,
          validUntil: "2026-11-07",
        })
      ).status,
      409,
      "membership concurrency",
    );

    const secondMeeting = (
      await call("sites/" + site + "/records/meetings", admin, "POST", {
        ...input,
        title: "Constraint fixture",
      })
    ).data;
    await assert.rejects(
      pool.query(
        "INSERT INTO minutes(site_id,meeting_id,title,content) VALUES($1,$2,'Bad link','Bad link')",
        [foreignSite, secondMeeting.id],
      ),
      (error) => (error as { code: string }).code === "23503",
    );
    checks++;
    const inspection = (
      await call("sites/" + site + "/inspections", admin, "POST", {
        title: "Enterprise permission inspection",
        area: "QA",
        inspectedOn: "2026-11-07",
        inspectorId: editorId,
      })
    ).data;
    const finding = (
      await call("inspections/" + inspection.id + "/findings", admin, "POST", {
        description: "Enterprise finding",
      })
    ).data;
    const action = (
      await call("findings/" + finding.id + "/actions", admin, "POST", {
        title: "Enterprise action",
        ownerId: editorId,
        dueOn: due,
        priority: "HIGH",
      })
    ).data;
    await call("actions/" + action.id, editor, "PATCH", {
      version: 1,
      status: "IN_PROGRESS",
    });
    await call("actions/" + action.id + "/evidence", editor, "POST", {
      description: "Synthetic evidence",
    });
    await call("actions/" + action.id, editor, "PATCH", {
      version: 2,
      status: "PENDING_VERIFICATION",
    });
    eq(
      (
        await call("actions/" + action.id + "/verification", editor, "POST", {
          version: 3,
          approved: true,
          note: "Attempt",
        })
      ).status,
      403,
      "editor cannot perform independent review",
    );
    eq(
      (
        await call("actions/" + action.id + "/verification", admin, "POST", {
          version: 3,
          approved: true,
          note: "Reviewed",
        })
      ).data.status,
      "CLOSED",
      "admin review allowed",
    );
    const unified = (
      await call(
        "sites/" + site + "/commitments?state=closed&owner=" + editorId,
        reader,
      )
    ).data;
    eq(
      unified.items.some((r: { source: string }) => r.source === "INSPECTION"),
      true,
      "inspection in common view",
    );
    eq(
      unified.items.some((r: { source: string }) => r.source === "MEETING"),
      true,
      "agreement in common view",
    );

    eq(
      inspection.created_by,
      "30000000-0000-4000-8000-000000000001",
      "creation response includes attribution",
    );
    await pool.query(
      "INSERT INTO findings(inspection_id,description) SELECT $1,'Paged finding '||i FROM generate_series(1,21) i",
      [inspection.id],
    );
    await pool.query(
      "INSERT INTO actions(finding_id,title,owner_id,due_on,priority) SELECT $1,'Paged action '||i,$2,$3,'LOW' FROM generate_series(1,21) i",
      [finding.id, editorId, due],
    );
    const pagedFindings = (
      await call("inspections/" + inspection.id + "?page=2", reader)
    ).data;
    eq(pagedFindings.findings.length, 2, "findings page is bounded");
    eq(
      pagedFindings.findingsPage.total,
      22,
      "findings count includes all pages",
    );
    eq(
      pagedFindings.stats.actions,
      22,
      "inspection metrics include all actions, not only visible ones",
    );
    const pagedActions = (
      await call("findings/" + finding.id + "/actions?page=2", reader)
    ).data;
    eq(pagedActions.items.length, 2, "actions independently paginated");
    await pool.query(
      "INSERT INTO evidence(action_id,author_id,note) SELECT $1,$2,'Paged evidence '||i FROM generate_series(1,21) i",
      [action.id, editorId],
    );
    const pagedEvidence = (
      await call("actions/" + action.id + "/evidence?page=2", reader)
    ).data;
    eq(pagedEvidence.items.length, 2, "evidence paginated");
    eq(pagedEvidence.total, 22, "evidence total correct");
    const standalone = (
      await call("sites/" + site + "/records/minutes", admin, "POST", {
        title: "Standalone historical document",
        content: "First captured text",
        status: "DRAFT",
      })
    ).data;
    await call(
      "sites/" + site + "/records/minutes/" + standalone.id,
      admin,
      "PATCH",
      {
        version: 1,
        title: "Standalone revision",
        content: "Second captured text",
        status: "IN_REVIEW",
      },
    );
    const standaloneHistory = (
      await call("minutes/" + standalone.id + "/revisions", reader)
    ).data;
    eq(
      standaloneHistory.items.length,
      2,
      "legacy API also preserves document revisions",
    );
    eq(
      standaloneHistory.items[1].content,
      "First captured text",
      "original standalone content retained",
    );
    console.log(
      "Enterprise integration: " +
        checks +
        " assertions passed (data integrity, periods, attribution, history, permissions, metrics and drilldown).",
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
