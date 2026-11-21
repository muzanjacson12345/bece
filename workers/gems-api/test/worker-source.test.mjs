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
  for (const clientControlledValue of [
    "payload.costCoins", "payload.retryCostCoins", "payload.entryCostCoins",
    "payload.maxEntriesPerUser", "payload.maxRetriesPerEntry", "payload.price", "payload.uid"
  ]) {
    assert.equal(routes.includes(clientControlledValue), false,
      "event payment route must not accept " + clientControlledValue);
  }
});

test("event configuration is Owner-only and saved as an inactive draft", () => {
  assert.ok(source.includes("async function applyGemEventDraftConfig("));
  const start = source.indexOf("async function applyGemEventDraftConfig(");
  const end = source.indexOf("\nasync function applyGemEventEntry", start);
  assert.ok(start >= 0 && end > start, "event draft config function boundaries must be found");
  const configure = source.slice(start, end);
  assert.ok(configure.includes("hasActiveOwnerSession(uid, accessToken)"));
  assert.ok(configure.includes("EVENT_OWNER_REQUIRED"));
  assert.ok(configure.includes("EVENT_CONFIG_LOCKED"));
  assert.ok(configure.includes("buildGemEventDraftConfig("));
  assert.ok(configure.includes("currentDocument: { exists: !!eventDoc }"));

  const routeStart = source.indexOf("if (url.pathname === '/events/configure')");
  const routeEnd = source.indexOf("if (url.pathname === '/events/enter' || url.pathname === '/events/retry')", routeStart);
  assert.ok(routeStart >= 0 && routeEnd > routeStart, "Owner event config route must exist");
  const route = source.slice(routeStart, routeEnd);
  assert.ok(route.includes("applyGemEventDraftConfig(identity.uid, eventId, payload || {}, accessToken)"));
  assert.equal(route.includes("payload.status"), false);
});

test("each paid event entry increments the event entry count in the same transaction", () => {
  const start = source.indexOf("async function applyGemEventEntry(");
  const end = source.indexOf("\nasync function applyGemEventRetry", start);
  assert.ok(start >= 0 && end > start, "event entry function boundaries must be found");
  const entry = source.slice(start, end);
  assert.ok(entry.includes("currentEntryCount + 1"));
  assert.ok(entry.includes("openAttempts: currentOpenAttempts + 1"));
  assert.ok(entry.includes("updateMask: { fieldPaths: ['entryCount', 'openAttempts'] }"));
  assert.ok(entry.includes("currentDocument: { exists: true }"));
});

test("event question start and answer routes use private attempt state and authenticated user identity", () => {
  assert.ok(source.includes("async function startGemEventQuestion("));
  assert.ok(source.includes("async function submitGemEventAnswer("));
  assert.ok(source.includes("buildGemEventQuestionStart("));
  assert.ok(source.includes("buildGemEventAnswerResult("));
  assert.ok(source.includes("buildGemEventLeaderboardEntry("));
  assert.ok(source.includes("gemEventAnswerOperationPath(uid, operationId)"));
  assert.ok(source.includes("'/events/next'"));
  assert.ok(source.includes("'/events/answer'"));
  assert.ok(source.includes("startGemEventQuestion(identity.uid, eventId, attemptId, accessToken)"));
  assert.ok(source.includes("submitGemEventAnswer("));

  const start = source.indexOf("async function startGemEventQuestion(");
  const end = source.indexOf("\nasync function submitGemEventAnswer", start);
  assert.ok(start >= 0 && end > start);
  const startFunction = source.slice(start, end);
  assert.ok(startFunction.includes("getDocument(eventPath"));
  assert.ok(startFunction.includes("getDocument(participantPath"));
  assert.ok(startFunction.includes("getDocument(attemptPath"));
  assert.ok(startFunction.includes("currentDocument: { exists: true }"));

  const answerStart = source.indexOf("async function submitGemEventAnswer(");
  const answerEnd = source.indexOf("\nasync function applyGemChange", answerStart);
  assert.ok(answerStart >= 0 && answerEnd > answerStart);
  const answerFunction = source.slice(answerStart, answerEnd);
  assert.ok(answerFunction.includes("buildGemEventAnswerResult("));
  assert.ok(answerFunction.includes("IDEMPOTENCY_KEY_REUSED"));
  assert.ok(answerFunction.includes("gemEventAnswerOperationPath(uid, operationId)"));
  assert.ok(answerFunction.includes("buildGemEventLeaderboardEntry("));
  assert.ok(answerFunction.includes("currentDocument: { exists: false }"));

  const routeStart = source.indexOf("if (url.pathname === '/events/next' || url.pathname === '/events/answer')");
  const routeEnd = source.indexOf("if (url.pathname === '/events/enter' || url.pathname === '/events/retry')", routeStart);
  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  const routes = source.slice(routeStart, routeEnd);
  for (const forbidden of ["payload.correctCount", "payload.score", "payload.coins", "payload.gems", "payload.uid"]) {
    assert.equal(routes.includes(forbidden), false, "event answer route must not accept " + forbidden);
  }
});

test("event activation is Owner-only and settlement is Worker-controlled and one-time", () => {
  assert.ok(source.includes("async function applyGemEventActivation("));
  assert.ok(source.includes("async function applyGemEventSettlement("));
  assert.ok(source.includes("buildGemEventActivation("));
  assert.ok(source.includes("buildGemEventSettlement("));
  assert.ok(source.includes("gemEventPrizeOperations/"));
  assert.ok(source.includes("EVENT_PRIZE_ALREADY_PAID"));
  assert.ok(source.includes("collectionId: 'leaderboard'"));
  assert.ok(source.includes("fieldPath: 'rankKey'"));
  assert.ok(source.includes("'/events/activate'"));
  assert.ok(source.includes("'/events/settle'"));
  assert.ok(source.includes("applyGemEventActivation(identity.uid, eventId, accessToken)"));
  assert.ok(source.includes("applyGemEventSettlement(eventId, accessToken)"));

  const activationStart = source.indexOf("async function applyGemEventActivation(");
  const activationEnd = source.indexOf("\nasync function applyGemEventSettlement", activationStart);
  assert.ok(activationStart >= 0 && activationEnd > activationStart);
  const activation = source.slice(activationStart, activationEnd);
  assert.ok(activation.includes("hasActiveOwnerSession(uid, accessToken)"));
  assert.ok(activation.includes("buildGemEventActivation("));
  assert.ok(activation.includes("currentDocument: { exists: true }"));

  const settlementStart = source.indexOf("async function applyGemEventSettlement(");
  const settlementEnd = source.indexOf("\nasync function startGemEventQuestion", settlementStart);
  assert.ok(settlementStart >= 0 && settlementEnd > settlementStart);
  const settlement = source.slice(settlementStart, settlementEnd);
  assert.ok(settlement.includes("if (event.status === 'settled')"));
  assert.ok(settlement.includes("buildGemEventSettlement("));
  assert.ok(settlement.includes("gemEventPrizeOperations/"));
  assert.ok(settlement.includes("currentDocument: { exists: false }"));
  assert.ok(settlement.includes("updateMask: { fieldPaths: Object.keys(eventUpdates) }"));

  const routesStart = source.indexOf("if (url.pathname === '/events/activate' || url.pathname === '/events/settle')");
  const routesEnd = source.indexOf("if (url.pathname === '/events/next' || url.pathname === '/events/answer')", routesStart);
  assert.ok(routesStart >= 0 && routesEnd > routesStart);
  const routes = source.slice(routesStart, routesEnd);
  assert.ok(routes.includes("applyGemEventActivation(identity.uid, eventId, accessToken)"));
  assert.ok(routes.includes("applyGemEventSettlement(eventId, accessToken)"));
});
