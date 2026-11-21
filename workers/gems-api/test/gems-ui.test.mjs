import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const sourcePath = fileURLToPath(new URL("../../gems.js", import.meta.url));
const source = await readFile(sourcePath, "utf8");

test("Gem wallet reads only the signed-in student's balance and transaction history", () => {
  assert.match(source, /doc\(user\.uid\)/);
  assert.match(source, /where\("uid", "==", user\.uid\)/);
  assert.match(source, /orderBy\("createdAt", "desc"\)/);
  assert.match(source, /limit\(50\)/);
  assert.match(source, /window\.renderGems = renderGems/);
});

test("Gem wallet is read-only and sends no balance or reward changes from the browser", () => {
  assert.equal(source.includes(".collection(\"gemTransactions\").add("), false);
  assert.equal(source.includes(".collection(\"gemTransactions\").doc("), false);
  assert.equal(source.includes("payload.amount"), false);
  assert.equal(source.includes("payload.gems"), false);
});

test("Gem history labels distinguish achievements, event prizes and Owner adjustments", () => {
  assert.match(source, /achievement_reward/);
  assert.match(source, /event_reward/);
  assert.match(source, /owner_adjustment/);
  assert.match(source, /Balance after/);
});
