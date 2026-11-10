import "dotenv/config";
import { Pool } from "pg";
import { performance } from "node:perf_hooks";
import { mkdir, writeFile } from "node:fs/promises";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  try {
    await pool.query(
      "INSERT INTO inspections(site_id,title,area,inspected_on,inspector_id,created_at) SELECT '20000000-0000-4000-8000-000000000001','Benchmark '||i,'Synthetic benchmark','2026-11-07','30000000-0000-4000-8000-000000000001',now()-(i||' minutes')::interval FROM generate_series(1,20000) i",
    );
    await pool.query("ANALYZE inspections");
    const sql =
      "SELECT * FROM inspections WHERE site_id='20000000-0000-4000-8000-000000000001' ORDER BY created_at DESC,id LIMIT 20";
    const c = await pool.connect();
    let before: unknown;
    let after: unknown;
    try {
      await c.query("BEGIN");
      await c.query("DROP INDEX inspections_site_created");
      before = (await c.query("EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) " + sql))
        .rows[0]["QUERY PLAN"];
      await c.query("ROLLBACK");
      after = (await c.query("EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) " + sql))
        .rows[0]["QUERY PLAN"];
    } finally {
      c.release();
    }
    const times: number[] = [];
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      await pool.query(sql);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    const report = {
      date: new Date().toISOString(),
      scenario:
        "20,000 extra synthetic inspections; one local PostgreSQL instance; warm read; not a concurrent HTTP capacity test",
      samples: 50,
      clientRoundtripMs: { median: times[25], p95: times[47] },
      beforeIndex: before,
      afterIndex: after,
    };
    await mkdir("../../output/qa", { recursive: true });
    await writeFile(
      "../../output/qa/performance.json",
      JSON.stringify(report, null, 2),
    );
    console.log(
      "SQL benchmark passed: " +
        JSON.stringify(report.clientRoundtripMs) +
        "; plans saved to output/qa/performance.json",
    );
  } finally {
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
