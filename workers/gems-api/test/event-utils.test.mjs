import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGemEventEntry,
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

test("event opening and closing timestamps are enforced", () => {
  const timed = { ...baseEvent, opensAt: 2000, closesAt: 5000 };
  assert.throws(() => validateGemEventConfig(timed, 1999), /EVENT_NOT_OPEN/);
  assert.equal(validateGemEventConfig(timed, 2000).entryCostCoins, 35);
  assert.equal(validateGemEventConfig(timed, 4999).entryCostCoins, 35);
  assert.throws(() => validateGemEventConfig(timed, 5000), /EVENT_CLOSED/);
  assert.throws(() => validateGemEventConfig({ ...timed, closesAt: 2000 }, 3000), /INVALID_EVENT_CONFIG/);
});

test("entry allowance and Coin balance are enforced", () => {
  assert.throws(() => buildGemEventEntry({
    event: baseEvent,
    participant: { entriesUsed: 2, totalRetries: 0 },
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
    currentAttempt: first.attempt,
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
    currentAttempt: { ...first.attempt, retriesUsed: 1, attemptNo: 2 },
    uid: "alice", eventId: "event-a", currentAttemptId: "attempt-2",
    nextAttemptId: "attempt-3", now: 3000
  });
  assert.equal(retry1.retriesUsed, 2);
  assert.throws(() => buildGemEventRetry({
    event: baseEvent, participant: retry1.participant, player: { coins: 76 },
    currentAttempt: retry1.attempt,
    uid: "alice", eventId: "event-a", currentAttemptId: "attempt-3",
    nextAttemptId: "attempt-4", now: 4000
  }), /EVENT_RETRY_LIMIT_REACHED/);

  const noRetryEvent = { ...baseEvent, retryEnabled: false, retryCostCoins: 0, maxRetriesPerEntry: 0 };
  assert.throws(() => buildGemEventRetry({
    event: noRetryEvent, participant: first.participant, player: { coins: 100 },
    currentAttempt: first.attempt,
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
    currentAttempt: { ...first.attempt, uid: "bob" },
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
