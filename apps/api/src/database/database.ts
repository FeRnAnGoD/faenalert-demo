import { Injectable, Logger, OnApplicationShutdown } from "@nestjs/common";
import { Pool, PoolClient, types } from "pg";
import { config } from "../config";
// SQL DATE is a calendar date, not a timestamp. Preserve it across server timezones.
types.setTypeParser(types.builtins.DATE, (value: string) => value);
@Injectable()
export class Database implements OnApplicationShutdown {
  private readonly logger = new Logger(Database.name);
  constructor() {
    this.pool.on("error", () =>
      this.logger.warn(
        "PostgreSQL connection interrupted; pool will reconnect",
      ),
    );
  }
  readonly pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  read<T>(fn: (client: PoolClient) => Promise<T>) {
    return this.transaction(fn, true);
  }
  async transaction<T>(
    fn: (client: PoolClient) => Promise<T>,
    readOnly = false,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query(
        readOnly ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN",
      );
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async onApplicationShutdown() {
    await this.pool.end();
  }
}
