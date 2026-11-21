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


test("event entry and retry endpoints use the authenticated user and server-configured fees", () => {
  assert.ok(source.includes("'/events/enter'"));
  assert.ok(source.includes("'/events/retry'"));
  assert.ok(source.includes("applyGemEventEntry(identity.uid, eventId, operationId, accessToken)"));
  assert.ok(source.includes("applyGemEventRetry(identity.uid, eventId, attemptId, operationId, accessToken)"));

  const entryStart = source.indexOf("async function applyGemEventEntry(");
  const entryEnd = source.indexOf("\nasync function applyGemEventRetry", entryStart);
  assert.ok(entryStart >= 0 && entryEnd > entryStart, "event entry function boundaries must be found");
  const entry = source.slice(entryStart, entryEnd);
  assert.ok(entry.includes("buildGemEventEntry("));
  assert.ok(entry.includes("gemEventOperationPath(uid, operationId)"));
  assert.ok(entry.includes("crypto.randomUUID()"));
  assert.ok(entry.includes("currentDocument: { exists: false }"));

  const retryStart = source.indexOf("async function applyGemEventRetry(");
  const retryEnd = source.indexOf("\nasync function applyGemChange", retryStart);
  assert.ok(retryStart >= 0 && retryEnd > retryStart, "event retry function boundaries must be found");
  const retry = source.slice(retryStart, retryEnd);
  assert.ok(retry.includes("buildGemEventRetry("));
  assert.ok(retry.includes("gemEventOperationPath(uid, operationId)"));
  assert.ok(retry.includes("previousAttempt"));
  assert.ok(retry.includes("crypto.randomUUID()"));

  const routesStart = source.indexOf("if (url.pathname === '/events/enter' || url.pathname === '/events/retry')");
  const routesEnd = source.indexOf("if (url.pathname.startsWith('/duels/'))", routesStart);
  assert.ok(routesStart >= 0 && routesEnd > routesStart, "event routes must be isolated");
  const routes = source.slice(routesStart, routesEnd);
  assert.equal(routes.includes("payload.costCoins"), false);
  assert.equal(routes.includes("payload.price"), false);
  assert.equal(routes.includes("payload.uid"), false);
});
