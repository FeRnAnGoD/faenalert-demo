import { test } from "node:test";
import assert from "node:assert/strict";
import { localDate } from "../../web/src/app/date-utils";
test("calendar dates preserve the local day at midnight and late at night", () => {
  assert.equal(localDate(new Date(2026, 10, 7, 0, 1)), "2026-11-07");
  assert.equal(localDate(new Date(2026, 10, 7, 23, 59)), "2026-11-07");
  assert.equal(localDate(new Date(2026, 0, 2, 12)), "2026-01-02");
});
