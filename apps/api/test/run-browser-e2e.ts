import dotenv from "dotenv";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const repositoryRoot = resolve(process.cwd(), "../..");
dotenv.config({ path: resolve(repositoryRoot, ".env"), quiet: true });

const databaseUrl =
  process.env.DATABASE_URL ??
  (process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD
    ? `postgresql://${encodeURIComponent(process.env.POSTGRES_USER)}:${encodeURIComponent(process.env.POSTGRES_PASSWORD)}@127.0.0.1:${process.env.POSTGRES_PORT ?? "5432"}/${process.env.POSTGRES_DB ?? "faenalert"}`
    : undefined);
if (!databaseUrl)
  throw new Error("DATABASE_URL or local PostgreSQL settings are required");
const baseUrl = new URL(databaseUrl);
if (
  process.env.NODE_ENV === "production" ||
  !["127.0.0.1", "localhost"].includes(baseUrl.hostname)
)
  throw new Error("Browser tests require a local, non-production PostgreSQL");
if (!process.env.SEED_PASSWORD || process.env.SEED_PASSWORD.length < 12)
  throw new Error("Set a demo SEED_PASSWORD (minimum 12 characters)");

const databaseName = "faenalert_e2e_" + randomUUID().replaceAll("-", "");
const admin = new Pool({ connectionString: baseUrl.toString() });
const apiRoot = process.cwd();

function runNodeScript(script: string, env: NodeJS.ProcessEnv) {
  const result = spawnSync(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", script],
    { cwd: apiRoot, env, stdio: "inherit", timeout: 120_000 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error("Browser test setup failed: " + script);
}

async function main() {
  let created = false;
  try {
    await admin.query('CREATE DATABASE "' + databaseName + '"');
    created = true;
    baseUrl.pathname = "/" + databaseName;
    const env = {
      ...process.env,
      DATABASE_URL: baseUrl.toString(),
      NODE_ENV: "test",
      LOCAL_AUTH_ENABLED: "true",
      PORT: "3010",
      HOST: "127.0.0.1",
      CORS_ORIGIN: "http://127.0.0.1:4201",
    };

    runNodeScript("scripts/migrate.ts", env);
    runNodeScript("scripts/seed.ts", env);

    const result = spawnSync(
      process.execPath,
      [resolve(repositoryRoot, "node_modules/@playwright/test/cli.js"), "test"],
      {
        cwd: repositoryRoot,
        env,
        stdio: "inherit",
        timeout: 600_000,
      },
    );
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw new Error("Browser end-to-end checks failed");
  } finally {
    try {
      if (created)
        await admin.query('DROP DATABASE "' + databaseName + '" WITH (FORCE)');
    } finally {
      await admin.end();
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Browser test failed");
  process.exitCode = 1;
});
