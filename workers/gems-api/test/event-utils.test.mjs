import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGemEventEntry,
  buildGemEventDraftConfig,
  buildGemEventRetry,
  validateGemEventConfig
} from "../src/event-utils.mjs";

const baseEvent = {
  status: "active",
  entryCostCoins: 35,
  maxEntriesPerUser: 2,
  retryEnabled: true,
  retryCostCoins: 12,
  maxRetriesPerEntry: 2
};

test("event-specific entry fees and entry allowances are read from the event config", () => {
  const first = buildGemEventEntry({
    event: baseEvent, participant: null, player: { coins: 100 },
    uid: "alice", eventId: "event-a", attemptId: "attempt-1", now: 1000
  });
  assert.equal(first.costCoins, 35);
  assert.equal(first.coins, 65);
  assert.equal(first.entryNo, 1);
  assert.equal(first.attempt.entryNo, 1);
  assert.equal(first.attempt.retriesUsed, 0);

  const second = buildGemEventEntry({
    event: { ...baseEvent, entryCostCoins: 80, maxEntriesPerUser: 4 },
    participant: first.participant,
    player: { coins: 100 },
    uid: "alice", eventId: "event-a", attemptId: "attempt-2", now: 2000
  });
  assert.equal(second.costCoins, 80);
  assert.equal(second.coins, 20);
  assert.equal(second.entryNo, 2);
});

test("event config rejects missing, unsafe or inconsistent prices and limits", () => {
  for (const invalid of [
    {},
    { ...baseEvent, entryCostCoins: 0 },
    { ...baseEvent, entryCostCoins: -1 },
    { ...baseEvent, entryCostCoins: 1.5 },
    { ...baseEvent, maxEntriesPerUser: 0 },
    { ...baseEvent, retryEnabled: "yes" },
    { ...baseEvent, retryEnabled: false, retryCostCoins: 12 },
    { ...baseEvent, retryEnabled: true, retryCostCoins: 0 },
    { ...baseEvent, retryEnabled: true, maxRetriesPerEntry: 0 },
    { ...baseEvent, maxRetriesPerEntry: 21 }
  ]) {
    assert.throws(() => validateGemEventConfig(invalid, 1000));
  }
});

test("event opening and closing timestamps accept real Unix milliseconds and are enforced", () => {
  const opensAt = 1_800_000_000_000;
  const closesAt = opensAt + 3_600_000;
  const timed = { ...baseEvent, opensAt, closesAt };
  assert.throws(() => validateGemEventConfig(timed, opensAt - 1), /EVENT_NOT_OPEN/);
  assert.equal(validateGemEventConfig(timed, opensAt).entryCostCoins, 35);
  assert.equal(validateGemEventConfig(timed, closesAt - 1).entryCostCoins, 35);
  assert.throws(() => validateGemEventConfig(timed, closesAt), /EVENT_CLOSED/);
  assert.throws(() => validateGemEventConfig({ ...timed, closesAt: opensAt }, opensAt), /INVALID_EVENT_CONFIG/);
  assert.throws(() => validateGemEventConfig({ ...timed, opensAt: Number.MAX_SAFE_INTEGER + 1 }, opensAt), /INVALID_EVENT_CONFIG/);
});

test("entry allowance and Coin balance are enforced", () => {
  assert.throws(() => buildGemEventEntry({
    event: baseEvent,
    participant: { uid: "alice", entriesUsed: 2, totalRetries: 0 },
    player: { coins: 100 },
    uid: "alice", eventId: "event-a", attemptId: "attempt-3", now: 3000
  }), /EVENT_ENTRY_LIMIT_REACHED/);
  assert.throws(() => buildGemEventEntry({
    event: baseEvent, participant: null, player: { coins: 34 },
    uid: "alice", eventId: "event-a", attemptId: "attempt-1", now: 1000
  }), /INSUFFICIENT_COINS/);
  assert.throws(() => buildGemEventEntry({
    event: baseEvent, participant: null, player: { coins: -1 },
    uid: "alice", eventId: "event-a", attemptId: "attempt-1", now: 1000
  }), /INVALID_COIN_BALANCE/);
});

test("retry charges the configured event fee and creates a new attempt within the entry", () => {
  const first = buildGemEventEntry({
    event: baseEvent, participant: null, player: { coins: 100 },
    uid: "alice", eventId: "event-a", attemptId: "attempt-1", now: 1000
  });
  const retry = buildGemEventRetry({
    event: baseEvent,
    participant: first.participant,
    player: { coins: first.coins },
    currentAttempt: { ...first.attempt, status: "completed", questionIndex: 3, correctCount: 2, totalMs: 9000 },
    uid: "alice",
    eventId: "event-a",
    currentAttemptId: "attempt-1",
    nextAttemptId: "attempt-2",
    now: 2000
  });
  assert.equal(retry.costCoins, 12);
  assert.equal(retry.coins, 53);
  assert.equal(retry.entryNo, 1);
  assert.equal(retry.attemptNo, 2);
  assert.equal(retry.retriesUsed, 1);
  assert.equal(retry.previousAttempt.status, "replaced");
  assert.equal(retry.attempt.retryOf, "attempt-1");
  assert.equal(retry.participant.totalRetries, 1);
});

test("retry policy is bounded per entry and rejects disabled or exhausted retries", () => {
  const first = buildGemEventEntry({
    event: baseEvent, participant: null, player: { coins: 100 },
    uid: "alice", eventId: "event-a", attemptId: "attempt-1", now: 1000
  });
  const retry1 = buildGemEventRetry({
    event: baseEvent, participant: first.participant, player: { coins: 88 },
    currentAttempt: { ...first.attempt, status: "completed", retriesUsed: 1, attemptNo: 2 },
    uid: "alice", eventId: "event-a", currentAttemptId: "attempt-2",
    nextAttemptId: "attempt-3", now: 3000
  });
  assert.equal(retry1.retriesUsed, 2);
  assert.throws(() => buildGemEventRetry({
    event: baseEvent, participant: retry1.participant, player: { coins: 76 },
    currentAttempt: { ...retry1.attempt, status: "completed" },
    uid: "alice", eventId: "event-a", currentAttemptId: "attempt-3",
    nextAttemptId: "attempt-4", now: 4000
  }), /EVENT_RETRY_LIMIT_REACHED/);

  const noRetryEvent = { ...baseEvent, retryEnabled: false, retryCostCoins: 0, maxRetriesPerEntry: 0 };
  assert.throws(() => buildGemEventRetry({
    event: noRetryEvent, participant: first.participant, player: { coins: 100 },
    currentAttempt: { ...first.attempt, status: "completed" },
    uid: "alice", eventId: "event-a", currentAttemptId: "attempt-1",
    nextAttemptId: "attempt-2", now: 2000
  }), /EVENT_RETRY_DISABLED/);
});

test("retry validates participant, attempt ownership and available Coins", () => {
  const first = buildGemEventEntry({
    event: baseEvent, participant: null, player: { coins: 100 },
    uid: "alice", eventId: "event-a", attemptId: "attempt-1", now: 1000
  });
  assert.throws(() => buildGemEventRetry({
    event: baseEvent, participant: first.participant, player: { coins: 100 },
    currentAttempt: { ...first.attempt, status: "completed", uid: "bob" },
    uid: "alice", eventId: "event-a", currentAttemptId: "attempt-1",
    nextAttemptId: "attempt-2", now: 2000
  }), /EVENT_ATTEMPT_NOT_FOUND/);
  assert.throws(() => buildGemEventRetry({
    event: baseEvent, participant: first.participant, player: { coins: 11 },
    currentAttempt: first.attempt,
    uid: "alice", eventId: "event-a", currentAttemptId: "attempt-1",
    nextAttemptId: "attempt-2", now: 2000
  }), /INSUFFICIENT_COINS/);
  assert.throws(() => buildGemEventRetry({
    event: baseEvent, participant: first.participant, player: { coins: 100 },
    currentAttempt: { ...first.attempt, status: "replaced" },
    uid: "alice", eventId: "event-a", currentAttemptId: "attempt-1",
    nextAttemptId: "attempt-2", now: 2000
  }), /EVENT_ATTEMPT_NOT_RETRYABLE/);
});

test("Owner event configuration is saved as a validated inactive draft", () => {
  const draft = buildGemEventDraftConfig({
    eventId: "maths-challenge",
    title: "Maths Challenge",
    questionIds: ["soc-1", "soc-2", "soc-3"],
    description: "A timed maths event.",
    entryCostCoins: 40,
    maxEntriesPerUser: 3,
    retryEnabled: true,
    retryCostCoins: 15,
    maxRetriesPerEntry: 2,
    opensAt: 1_800_000_000_000,
    closesAt: 1_800_000_900_000,
    ownerUid: "owner-1",
    now: 1_799_999_000_000
  });
  assert.equal(draft.status, "draft");
  assert.equal(draft.entryCostCoins, 40);
  assert.equal(draft.maxEntriesPerUser, 3);
  assert.equal(draft.retryEnabled, true);
  assert.equal(draft.retryCostCoins, 15);
  assert.equal(draft.maxRetriesPerEntry, 2);
  assert.equal(draft.entryCount, 0);
  assert.equal(draft.createdBy, "owner-1");
});

test("event draft creation rejects unsafe names, fees, limits, times and Owner identity", () => {
  const valid = {
    eventId: "event-1", title: "Event One", questionIds: ["soc-1", "soc-2", "soc-3"], entryCostCoins: 20,
    maxEntriesPerUser: 2, retryEnabled: false, ownerUid: "owner-1", now: 1000
  };
  for (const invalid of [
    { ...valid, eventId: "../players/alice" },
    { ...valid, title: "x" },
    { ...valid, entryCostCoins: 0 },
    { ...valid, maxEntriesPerUser: 101 },
    { ...valid, retryEnabled: true },
    { ...valid, opensAt: 5000, closesAt: 4000 },
    { ...valid, ownerUid: "" }
  ]) {
    assert.throws(() => buildGemEventDraftConfig(invalid));
  }
});
