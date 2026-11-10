import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  inspectionSchema,
  pagination,
  verificationSchema,
} from "../src/prevention/schemas";
import { hashPassword, verifyPassword } from "../src/auth/password";
test("workflow rejects shortcuts and reopening closed actions", () => {
  assert.equal(canTransition("PENDING", "IN_PROGRESS"), true);
  assert.equal(canTransition("IN_PROGRESS", "PENDING_VERIFICATION"), true);
  for (const from of ["PENDING", "CLOSED", "PENDING_VERIFICATION"])
    assert.equal(canTransition(from, "CLOSED"), false);
  assert.equal(canTransition("CLOSED", "IN_PROGRESS"), false);
});
test("input validation rejects invalid dates, unknown fields, unbounded pages and blank closure", () => {
  assert.equal(
    inspectionSchema.safeParse({
      title: "x",
      area: "a",
      inspectedOn: "2026-02-30",
      inspectorId: "30000000-0000-4000-8000-000000000001",
    }).success,
    false,
  );
  assert.equal(pagination.safeParse({ pageSize: 101 }).success, false);
  assert.equal(
    verificationSchema.safeParse({ version: 1, approved: true, note: "  " })
      .success,
    false,
  );
});
test("passwords are salted and checked in constant time", async () => {
  const hash = hashPassword("valid password");
  assert.notEqual(hash, hashPassword("valid password"));
  assert.equal(await verifyPassword("valid password", hash), true);
  assert.equal(await verifyPassword("wrong", hash), false);
});
