import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { scrypt } from "node:crypto";
import { promisify } from "node:util";
const derive = promisify(scrypt);
export function hashPassword(value: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(value, salt, 64).toString("hex");
}
export async function verifyPassword(value: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const actual = (await derive(value, salt, 64)) as Buffer;
  const expected = Buffer.from(key, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
