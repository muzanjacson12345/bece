const MAX_BALANCE = 1_000_000_000;
const MAX_EVENT_COIN_COST = 1_000_000;
const MAX_ENTRIES_PER_USER = 100;
const MAX_RETRIES_PER_ENTRY = 20;

function fail(code) {
  throw new Error(code);
}

function integer(value, code, min = 0, max = MAX_BALANCE) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(code);
  return value;
}

export function validateGemEventConfig(event, now = Date.now()) {
  if (!event || event.status !== "active") fail("EVENT_NOT_ACTIVE");
  const entryCostCoins = integer(event.entryCostCoins, "INVALID_EVENT_CONFIG", 1, MAX_EVENT_COIN_COST);
  const maxEntriesPerUser = integer(
    event.maxEntriesPerUser, "INVALID_EVENT_CONFIG", 1, MAX_ENTRIES_PER_USER
  );
  if (typeof event.retryEnabled !== "boolean") fail("INVALID_EVENT_CONFIG");

  let retryCostCoins = 0;
  let maxRetriesPerEntry = 0;
  if (event.retryEnabled) {
    retryCostCoins = integer(
      event.retryCostCoins, "INVALID_EVENT_CONFIG", 1, MAX_EVENT_COIN_COST
    );
    maxRetriesPerEntry = integer(
      event.maxRetriesPerEntry, "INVALID_EVENT_CONFIG", 1, MAX_RETRIES_PER_ENTRY
    );
  } else if (
    (event.retryCostCoins !== undefined && event.retryCostCoins !== 0)
    || (event.maxRetriesPerEntry !== undefined && event.maxRetriesPerEntry !== 0)
  ) {
    fail("INVALID_EVENT_CONFIG");
  }

  const opensAt = event.opensAt === undefined ? null : integer(event.opensAt, "INVALID_EVENT_CONFIG");
  const closesAt = event.closesAt === undefined ? null : integer(event.closesAt, "INVALID_EVENT_CONFIG");
  if (opensAt !== null && closesAt !== null && opensAt >= closesAt) {
    fail("INVALID_EVENT_CONFIG");
  }
  if (!Number.isSafeInteger(now) || now < 0) fail("INVALID_EVENT_TIME");
  if (opensAt !== null && now < opensAt) fail("EVENT_NOT_OPEN");
  if (closesAt !== null && now >= closesAt) fail("EVENT_CLOSED");

  return { entryCostCoins, maxEntriesPerUser, retryEnabled: event.retryEnabled, retryCostCoins, maxRetriesPerEntry };
}

export function buildGemEventEntry({ event, participant, player, uid, eventId, attemptId, now = Date.now() }) {
  if (typeof uid !== "string" || !uid || typeof eventId !== "string" || !eventId
      || typeof attemptId !== "string" || !attemptId) fail("INVALID_EVENT_REQUEST");
  const policy = validateGemEventConfig(event, now);
  if (participant && participant.uid !== uid) fail("INVALID_EVENT_PARTICIPATION");
  const entriesUsed = integer(participant && participant.entriesUsed !== undefined
    ? participant.entriesUsed : 0, "INVALID_EVENT_PARTICIPATION", 0, policy.maxEntriesPerUser);
  if (entriesUsed >= policy.maxEntriesPerUser) fail("EVENT_ENTRY_LIMIT_REACHED");

  const coins = integer(player && player.coins !== undefined ? player.coins : 0, "INVALID_COIN_BALANCE");
  if (coins < policy.entryCostCoins) fail("INSUFFICIENT_COINS");

  const entryNo = entriesUsed + 1;
  const balance = coins - policy.entryCostCoins;
  const nextParticipant = {
    uid,
    entriesUsed: entryNo,
    totalRetries: integer(participant && participant.totalRetries !== undefined
      ? participant.totalRetries : 0, "INVALID_EVENT_PARTICIPATION"),
    createdAt: participant && participant.createdAt ? participant.createdAt : now,
    updatedAt: now,
    lastEntryAt: now,
    lastAttemptId: attemptId
  };
  const attempt = {
    uid,
    eventId,
    entryNo,
    attemptNo: 1,
    retriesUsed: 0,
    status: "ready",
    createdAt: now,
    updatedAt: now
  };
  return {
    eventId,
    entryNo,
    attemptId,
    costCoins: policy.entryCostCoins,
    coins: balance,
    participant: nextParticipant,
    attempt
  };
}

export function buildGemEventRetry({
  event, participant, player, currentAttempt, uid, eventId, currentAttemptId,
  nextAttemptId, now = Date.now()
}) {
  if (typeof uid !== "string" || !uid || typeof eventId !== "string" || !eventId
      || typeof currentAttemptId !== "string" || !currentAttemptId
      || typeof nextAttemptId !== "string" || !nextAttemptId
      || currentAttemptId === nextAttemptId) fail("INVALID_EVENT_REQUEST");
  const policy = validateGemEventConfig(event, now);
  if (!policy.retryEnabled || policy.maxRetriesPerEntry < 1) fail("EVENT_RETRY_DISABLED");
  if (!participant || participant.uid !== uid) fail("EVENT_PARTICIPATION_NOT_FOUND");
  if (!currentAttempt || currentAttempt.uid !== uid || currentAttempt.eventId !== eventId) {
    fail("EVENT_ATTEMPT_NOT_FOUND");
  }
  if (currentAttempt.status === "replaced" || currentAttempt.status === "cancelled") {
    fail("EVENT_ATTEMPT_NOT_RETRYABLE");
  }
  const entryNo = integer(currentAttempt.entryNo, "INVALID_EVENT_ATTEMPT", 1, policy.maxEntriesPerUser);
  const attemptNo = integer(currentAttempt.attemptNo, "INVALID_EVENT_ATTEMPT", 1, policy.maxRetriesPerEntry + 1);
  const retriesUsed = integer(currentAttempt.retriesUsed, "INVALID_EVENT_ATTEMPT", 0, policy.maxRetriesPerEntry);
  if (retriesUsed >= policy.maxRetriesPerEntry) fail("EVENT_RETRY_LIMIT_REACHED");
  if (attemptNo !== retriesUsed + 1) fail("INVALID_EVENT_ATTEMPT");
  if (integer(participant.entriesUsed, "INVALID_EVENT_PARTICIPATION", 0, policy.maxEntriesPerUser) < entryNo) {
    fail("EVENT_PARTICIPATION_NOT_FOUND");
  }
  const coins = integer(player && player.coins !== undefined ? player.coins : 0, "INVALID_COIN_BALANCE");
  if (coins < policy.retryCostCoins) fail("INSUFFICIENT_COINS");

  const balance = coins - policy.retryCostCoins;
  const nextAttemptNo = attemptNo + 1;
  const nextRetriesUsed = retriesUsed + 1;
  const nextAttempt = {
    uid,
    eventId,
    entryNo,
    attemptNo: nextAttemptNo,
    retriesUsed: nextRetriesUsed,
    retryOf: currentAttemptId,
    status: "ready",
    createdAt: now,
    updatedAt: now
  };
  const updatedParticipant = {
    ...participant,
    totalRetries: integer(participant.totalRetries === undefined ? 0 : participant.totalRetries, "INVALID_EVENT_PARTICIPATION") + 1,
    updatedAt: now,
    lastAttemptId: nextAttemptId
  };
  return {
    eventId,
    entryNo,
    previousAttemptId: currentAttemptId,
    attemptId: nextAttemptId,
    attemptNo: nextAttemptNo,
    retriesUsed: nextRetriesUsed,
    costCoins: policy.retryCostCoins,
    coins: balance,
    participant: updatedParticipant,
    previousAttempt: { ...currentAttempt, status: "replaced", replacedBy: nextAttemptId, updatedAt: now },
    attempt: nextAttempt
  };
}
