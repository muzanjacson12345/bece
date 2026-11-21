import { isKnownQuestionId, isCorrectAnswer } from "./question-keys.mjs";
import { validateGemEventConfig } from "./event-utils.mjs";

const MAX_QUESTIONS = 50;

function fail(code) {
  throw new Error(code);
}

function safeCount(value, max = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && value >= 0 && value <= max ? value : 0;
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
  validateGemEventConfig(event, now);
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
  validateGemEventConfig(event, now);
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

export function buildGemEventLeaderboardEntry({ attempt, previous, uid, displayName, now = Date.now() }) {
  if (!attempt || attempt.uid !== uid || attempt.status !== "completed") fail("EVENT_ATTEMPT_NOT_FINISHED");
  const correctCount = safeCount(attempt.correctCount, MAX_QUESTIONS);
  const totalQuestions = safeCount(attempt.questionIndex, MAX_QUESTIONS);
  const elapsedMs = safeCount(attempt.totalMs);
  if (totalQuestions < 3 || correctCount > totalQuestions) fail("INVALID_EVENT_ATTEMPT");
  if (!Number.isSafeInteger(now) || now < 0) fail("INVALID_EVENT_TIME");
  const candidate = {
    uid,
    displayName: typeof displayName === "string" && displayName.trim()
      ? displayName.trim().slice(0, 60) : "Student",
    correctCount,
    totalQuestions,
    elapsedMs,
    attemptId: attempt.attemptId || "",
    updatedAt: now
  };
  const prior = previous && previous.uid === uid
    && Number.isSafeInteger(previous.correctCount)
    && Number.isSafeInteger(previous.totalQuestions)
    && Number.isSafeInteger(previous.elapsedMs)
    ? previous : null;
  if (prior && (
    prior.correctCount > candidate.correctCount
    || (prior.correctCount === candidate.correctCount && prior.elapsedMs <= candidate.elapsedMs)
  )) {
    return { changed: false, entry: prior };
  }
  return { changed: true, entry: candidate };
}
