import { test } from "node:test";
import assert from "node:assert/strict";
import { DraftBook } from "../../web/src/app/platform/drafts";
test("managing an agreement or refreshing a workspace preserves unsaved text and its base version", () => {
  const book = new DraftBook();
  book.open("u:meeting", "Original", 1);
  book.edit("u:meeting", "My pending changes");
  assert.equal(
    book.open("u:meeting", "Original", 1).content,
    "My pending changes",
  );
  const conflict = book.open("u:meeting", "Changed by another user", 2);
  assert.equal(conflict.content, "My pending changes");
  assert.equal(conflict.baseVersion, 1);
  assert.equal(book.dirty("u:meeting"), true);
});
test("drafts recover after reloading and remain separate by user and meeting", () => {
  const a = new DraftBook();
  a.open("alice:m1", "one", 1);
  a.edit("alice:m1", "draft1");
  a.open("alice:m2", "two", 1);
  a.edit("alice:m2", "draft2");
  const b = new DraftBook();
  b.restore(JSON.parse(JSON.stringify(a.snapshot())));
  assert.equal(b.open("alice:m1", "server", 2).content, "draft1");
  assert.equal(b.open("bob:m1", "server", 2).content, "server");
  assert.equal(b.dirtyFor("bob:"), false);
  b.clearPrefix("alice:");
  assert.equal(b.dirtyFor("alice:"), false);
});
test("explicit save and conflict rebase advance the base without losing local text", () => {
  const b = new DraftBook();
  b.open("u:m", "old", 1);
  b.edit("u:m", "mine");
  const mine = b.open("u:m", "theirs", 2).content;
  b.saved("u:m", "theirs", 2);
  b.edit("u:m", mine);
  assert.equal(b.open("u:m", "theirs", 2).baseVersion, 2);
  b.saved("u:m", "mine", 3);
  assert.equal(b.dirty("u:m"), false);
  assert.equal(b.open("u:m", "new server text", 4).content, "new server text");
});
