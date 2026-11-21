import { isKnownQuestionId, isCorrectAnswer } from "./question-keys.mjs";
import { EVENT_FINISH_GRACE_MS, validateEventPrizeGems, validateGemEventConfig } from "./event-utils.mjs";

const MAX_QUESTIONS = 50;

function fail(code) {
  throw new Error(code);
}

function safeCount(value, max = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && value >= 0 && value <= max ? value : 0;
}

function validatePaidAttemptEvent(event, now) {
  // Event windows stop new entries/retries; paid attempts get a 24-hour finish grace.
  validateGemEventConfig({ ...event, opensAt: null, closesAt: null }, now);
  if (Number.isSafeInteger(event.closesAt) && now >= event.closesAt + EVENT_FINISH_GRACE_MS) {
    fail("EVENT_ATTEMPT_EXPIRED");
  }
}

export function validateEventQuestionIds(questionIds) {
  if (!Array.isArray(questionIds) || questionIds.length < 3 || questionIds.length > MAX_QUESTIONS
      || new Set(questionIds).size !== questionIds.length
      || questionIds.some(id => !isKnownQuestionId(id))) {
    fail("INVALID_EVENT_QUESTIONS");
  }
  return [...questionIds];
}

export function buildGemEventQuestionStart({ event, attempt, uid, eventId, attemptId, now = Date.now() }) {
  validatePaidAttemptEvent(event, now);
  const questionIds = validateEventQuestionIds(event.questionIds);
  if (!attempt || attempt.uid !== uid || attempt.eventId !== eventId
      || !attemptId || attempt.attemptId !== attemptId) {
    fail("EVENT_ATTEMPT_NOT_FOUND");
  }
  if (!["ready", "in_progress"].includes(attempt.status)) fail("EVENT_ATTEMPT_NOT_PLAYABLE");
  const index = safeCount(attempt.questionIndex, questionIds.length);
  if (index >= questionIds.length) fail("EVENT_ATTEMPT_FINISHED");
  if (!Number.isSafeInteger(now) || now < 0) fail("INVALID_EVENT_TIME");

  const existingStart = attempt.questionStartedAt;
  if (existingStart !== null && existingStart !== undefined) {
    if (!Number.isSafeInteger(existingStart) || existingStart > now) fail("INVALID_EVENT_ATTEMPT");
    return {
      duplicate: true,
      attempt,
      result: { questionId: questionIds[index], questionIndex: index, totalQuestions: questionIds.length, startedAt: existingStart }
    };
  }
  const nextAttempt = {
    ...attempt,
    status: "in_progress",
    startedAt: Number.isSafeInteger(attempt.startedAt) ? attempt.startedAt : now,
    questionStartedAt: now,
    updatedAt: now
  };
  return {
    duplicate: false,
    attempt: nextAttempt,
    result: { questionId: questionIds[index], questionIndex: index, totalQuestions: questionIds.length, startedAt: now }
  };
}

export function buildGemEventAnswerResult({
  event, attempt, uid, eventId, attemptId, questionId, answerKey,
  operationId, now = Date.now()
}) {
  validatePaidAttemptEvent(event, now);
  const questionIds = validateEventQuestionIds(event.questionIds);
  if (!attempt || attempt.uid !== uid || attempt.eventId !== eventId
      || !attemptId || attempt.attemptId !== attemptId
      || attempt.status !== "in_progress") fail("EVENT_ATTEMPT_NOT_PLAYABLE");
  if (typeof operationId !== "string"
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) {
    fail("INVALID_OPERATION_ID");
  }
  if (answerKey !== null && (typeof answerKey !== "string" || !/^[A-D]$/.test(answerKey))) {
    fail("INVALID_EVENT_ANSWER");
  }
  if (!Number.isSafeInteger(now) || now < 0) fail("INVALID_EVENT_TIME");

  const previousAnswers = Array.isArray(attempt.answers) ? attempt.answers : [];
  const oldAnswer = previousAnswers.find(item => item && item.operationId === operationId);
  if (oldAnswer) {
    if (oldAnswer.questionId !== questionId || oldAnswer.requestedKey !== answerKey) fail("IDEMPOTENCY_KEY_REUSED");
    return { duplicate: true, attempt, result: oldAnswer.response };
  }
  const index = safeCount(attempt.questionIndex, questionIds.length);
  if (index >= questionIds.length || questionIds[index] !== questionId) fail("EVENT_QUESTION_SEQUENCE");
  if (!Number.isSafeInteger(attempt.questionStartedAt) || attempt.questionStartedAt > now) {
    fail("EVENT_QUESTION_NOT_STARTED");
  }
  const elapsedMs = now - attempt.questionStartedAt;
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0) fail("INVALID_EVENT_TIME");
  const correct = answerKey !== null && isCorrectAnswer(questionId, answerKey);
  const correctCount = safeCount(attempt.correctCount) + (correct ? 1 : 0);
  const nextIndex = index + 1;
  const totalMs = safeCount(attempt.totalMs) + elapsedMs;
  const done = nextIndex >= questionIds.length;
  const score = { correctCount, totalQuestions: questionIds.length, elapsedMs: totalMs };
  const response = { questionId, correct, answerKey, elapsedMs, score, done, nextIndex };
  const answer = { index, questionId, answerKey, requestedKey: answerKey, correct, elapsedMs, operationId, response };
  const nextAttempt = {
    ...attempt,
    status: done ? "completed" : "in_progress",
    answers: [...previousAnswers, answer],
    questionIndex: nextIndex,
    correctCount,
    totalMs,
    questionStartedAt: null,
    updatedAt: now,
    ...(done ? { completedAt: now, result: score } : {})
  };
  return { duplicate: false, attempt: nextAttempt, result: response };
}

function eventRankKey({ correctCount, totalQuestions, elapsedMs, completedAt, uid }) {
  const pad = (value, width) => String(value).padStart(width, "0");
  return [
    pad(totalQuestions - correctCount, 2),
    pad(elapsedMs, 16),
    pad(completedAt, 16),
    String(uid)
  ].join("|");
}

function compareEventRanks(a, b) {
  return (b.correctCount - a.correctCount)
    || (a.elapsedMs - b.elapsedMs)
    || ((a.completedAt || Number.MAX_SAFE_INTEGER) - (b.completedAt || Number.MAX_SAFE_INTEGER))
    || String(a.uid).localeCompare(String(b.uid));
}

export function buildGemEventLeaderboardEntry({ attempt, previous, uid, displayName, now = Date.now() }) {
  if (!attempt || attempt.uid !== uid || attempt.status !== "completed") fail("EVENT_ATTEMPT_NOT_FINISHED");
  const correctCount = safeCount(attempt.correctCount, MAX_QUESTIONS);
  const totalQuestions = safeCount(attempt.questionIndex, MAX_QUESTIONS);
  const elapsedMs = safeCount(attempt.totalMs);
  const completedAt = Number.isSafeInteger(attempt.completedAt) ? attempt.completedAt : now;
  if (totalQuestions < 3 || correctCount > totalQuestions || completedAt < 0) fail("INVALID_EVENT_ATTEMPT");
  if (!Number.isSafeInteger(now) || now < 0) fail("INVALID_EVENT_TIME");
  const candidate = {
    uid,
    displayName: typeof displayName === "string" && displayName.trim()
      ? displayName.trim().slice(0, 60) : "Student",
    correctCount,
    totalQuestions,
    elapsedMs,
    completedAt,
    attemptId: attempt.attemptId || "",
    updatedAt: now,
    rankKey: eventRankKey({ correctCount, totalQuestions, elapsedMs, completedAt, uid })
  };
  const prior = previous && previous.uid === uid
    && Number.isSafeInteger(previous.correctCount)
    && Number.isSafeInteger(previous.totalQuestions)
    && Number.isSafeInteger(previous.elapsedMs)
    ? previous : null;
  if (prior && (
    prior.correctCount > candidate.correctCount
    || (prior.correctCount === candidate.correctCount && prior.elapsedMs < candidate.elapsedMs)
    || (prior.correctCount === candidate.correctCount && prior.elapsedMs === candidate.elapsedMs
      && Number(prior.completedAt || Number.MAX_SAFE_INTEGER) <= candidate.completedAt)
  )) {
    return { changed: false, entry: prior };
  }
  return { changed: true, entry: candidate };
}

const MAX_GEM_BALANCE = 1_000_000_000;

export function buildGemEventSettlement({ event, leaderboardEntries, playerByUid, now = Date.now() }) {
  if (!event || event.status !== "active") fail("EVENT_NOT_ACTIVE");
  if (!Number.isSafeInteger(now) || now < 0) fail("INVALID_EVENT_TIME");
  if (!Number.isSafeInteger(event.closesAt)) fail("EVENT_CLOSE_REQUIRED");
  if (now < event.closesAt + EVENT_FINISH_GRACE_MS) fail("EVENT_SETTLEMENT_NOT_READY");
  const prizes = validateEventPrizeGems(event.prizeGems);
  const entries = Array.isArray(leaderboardEntries) ? leaderboardEntries.filter(entry =>
    entry && typeof entry.uid === "string" && entry.uid
      && Number.isSafeInteger(entry.correctCount) && entry.correctCount >= 0
      && Number.isSafeInteger(entry.totalQuestions) && entry.totalQuestions === event.questionCount
      && Number.isSafeInteger(entry.elapsedMs) && entry.elapsedMs >= 0
      && entry.correctCount <= entry.totalQuestions
      && Number.isSafeInteger(entry.completedAt) && entry.completedAt >= 0
  ).sort(compareEventRanks) : [];
  const prizeByPlace = [prizes.first, prizes.second, prizes.third];
  const winners = entries.slice(0, 3).map((entry, index) => ({
    rank: index + 1,
    uid: entry.uid,
    displayName: typeof entry.displayName === "string" ? entry.displayName.slice(0, 60) : "Student",
    correctCount: entry.correctCount,
    totalQuestions: entry.totalQuestions,
    elapsedMs: entry.elapsedMs,
    completedAt: entry.completedAt,
    prizeGems: prizeByPlace[index]
  }));
  const payouts = [];
  let totalGemsAwarded = 0;
  for (const winner of winners) {
    if (winner.prizeGems === 0) continue;
    const player = playerByUid && playerByUid[winner.uid];
    if (!player) fail("PLAYER_PROFILE_NOT_READY");
    const before = player.gems === undefined ? 0 : player.gems;
    if (!Number.isSafeInteger(before) || before < 0 || before > MAX_GEM_BALANCE) fail("INVALID_GEM_BALANCE");
    const balance = before + winner.prizeGems;
    if (!Number.isSafeInteger(balance) || balance > MAX_GEM_BALANCE) fail("PLAYER_BALANCE_LIMIT");
    payouts.push({
      uid: winner.uid,
      rank: winner.rank,
      amount: winner.prizeGems,
      balance
    });
    totalGemsAwarded += winner.prizeGems;
  }
  return {
    status: "settled",
    settledAt: now,
    totalGemsAwarded,
    winners,
    payouts,
    uncompletedAttempts: safeCount(event.openAttempts)
  };
}
