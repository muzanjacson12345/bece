import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const sourcePath = fileURLToPath(new URL("../src/index.js", import.meta.url));
let source;
test("load the Worker source for route-boundary regression checks", async () => {
  source = await readFile(sourcePath, "utf8");
  assert.ok(source.includes("async function applyPracticeRewardChange("));
  assert.ok(source.includes("async function applyPowerupUse("));
});

test("practice reward handling contains no Duel or power-up-only references", () => {
  const start = source.indexOf("async function applyPracticeRewardChange(");
  const end = source.indexOf("\nasync function isUserBanned", start);
  assert.ok(start >= 0 && end > start, "practice function boundaries must be found");
  const practice = source.slice(start, end);
  for (const forbidden of ["duelCode", "duelDoc", "progressDoc", "validatePowerupUseReceiptRetry", "itemId"]) {
    assert.equal(practice.includes(forbidden), false, "practice handler must not contain " + forbidden);
  }
  assert.ok(practice.includes("if (operationDoc)"));
  assert.ok(practice.includes("return { duplicate: true, result: stored.result || null }"));
});

test("Second Chance receipt validation is scoped to the power-up handler", () => {
  const start = source.indexOf("async function applyPowerupUse(");
  const end = source.indexOf("\nfunction duelDocumentPath", start);
  assert.ok(start >= 0 && end > start, "power-up function boundaries must be found");
  const powerup = source.slice(start, end);
  assert.ok(powerup.includes("validatePowerupUseReceiptRetry("));
  assert.ok(powerup.includes("duelCode"));
  assert.ok(powerup.includes("questionIndex: nextProgress.nextIndex"));
  const practiceStart = source.indexOf("async function applyPracticeRewardChange(");
  const practiceEnd = source.indexOf("\nasync function isUserBanned", practiceStart);
  const practice = source.slice(practiceStart, practiceEnd);
  assert.equal(practice.includes("validatePowerupUseReceiptRetry("), false);
});

