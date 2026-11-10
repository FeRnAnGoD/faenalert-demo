import "dotenv/config";
import { z } from "zod";
export const config = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.enum(["127.0.0.1", "0.0.0.0"]).default("127.0.0.1"),
    DATABASE_URL: z.url(),
    CORS_ORIGIN: z.url().default("http://127.0.0.1:4200"),
    JWT_SECRET: z.string().min(32),
    LOCAL_AUTH_ENABLED: z.enum(["true", "false"]).default("false"),
  })
  .parse(process.env);
if (config.NODE_ENV === "production" && config.LOCAL_AUTH_ENABLED === "true")
  throw new Error(
    "Local authentication must be disabled in production; configure the identity adapter first.",
  );
