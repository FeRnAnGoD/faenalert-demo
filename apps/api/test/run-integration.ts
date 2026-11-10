import dotenv from "dotenv";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repositoryRoot = resolve(process.cwd(), "../..");
dotenv.config({ path: resolve(repositoryRoot, ".env"), quiet: true });
const name = "faenalert_test_" + randomUUID().replaceAll("-", "");
const databaseUrl =
  process.env.DATABASE_URL ??
  (process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD
    ? `postgresql://${encodeURIComponent(process.env.POSTGRES_USER)}:${encodeURIComponent(process.env.POSTGRES_PASSWORD)}@127.0.0.1:${process.env.POSTGRES_PORT ?? "5432"}/${process.env.POSTGRES_DB ?? "faenalert"}`
    : undefined);
if (!databaseUrl)
  throw new Error("DATABASE_URL or local PostgreSQL settings are required");
const url = new URL(databaseUrl);
if (
  process.env.NODE_ENV === "production" ||
  !["127.0.0.1", "localhost", "db"].includes(url.hostname)
)
  throw new Error("Integration requires a local, non-production PostgreSQL");
const admin = new Pool({ connectionString: url.toString() });
function run(script: string, env: NodeJS.ProcessEnv) {
  const result = spawnSync(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", script],
    { env, stdio: "inherit", timeout: 120000 },
  );
  if (result.status !== 0)
    throw new Error("Integration command failed: " + script);
}
async function main() {
  let created = false;
  try {
    await admin.query('CREATE DATABASE "' + name + '"');
    created = true;
    url.pathname = "/" + name;
    const env = {
      ...process.env,
      DATABASE_URL: url.toString(),
      NODE_ENV: "test",
      LOCAL_AUTH_ENABLED: "true",
    };
    run("scripts/migrate.ts", env);
    run("scripts/migrate.ts", env);
    run("scripts/seed.ts", env);
    run("scripts/seed.ts", env);
    run("test/integration.ts", env);
    run("test/platform.integration.ts", env);
    run("test/meetings.integration.ts", env);
    run("test/training-commission.integration.ts", env);
    run("test/enterprise.integration.ts", env);
    run("test/workspace.integration.ts", env);
    run("test/performance.ts", env);
    console.log(
      "All integration checks passed in an isolated database; development data unchanged.",
    );
  } finally {
    if (created) await admin.query('DROP DATABASE "' + name + '" WITH (FORCE)');
    await admin.end();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
