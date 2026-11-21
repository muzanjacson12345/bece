import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGemEventAnswerResult,
  buildGemEventLeaderboardEntry,
  buildGemEventQuestionStart,
  validateEventQuestionIds
} from "../src/event-game-utils.mjs";

const event = {
  status: "active",
  entryCostCoins: 30,
  maxEntriesPerUser: 2,
  retryEnabled: true,
  retryCostCoins: 10,
  maxRetriesPerEntry: 2,
  opensAt: null,
  closesAt: null,
  questionIds: ["soc-1", "soc-2", "soc-3"]
};
const attempt = {
  uid: "alice",
  eventId: "event-1",
  attemptId: "attempt-1",
  entryNo: 1,
  attemptNo: 1,
  retriesUsed: 0,
  status: "ready",
  questionIndex: 0,
  correctCount: 0,
  totalMs: 0,
  answers: [],
  questionStartedAt: null
};
const op = "11111111-1111-4111-8111-111111111111";
const op2 = "22222222-2222-4222-8222-222222222222";
const op3 = "33333333-3333-4333-8333-333333333333";

test("event question IDs must be known, unique and between 3 and 50", () => {
  assert.deepEqual(validateEventQuestionIds(event.questionIds), event.questionIds);
  assert.throws(() => validateEventQuestionIds(["soc-1", "soc-2"]), /INVALID_EVENT_QUESTIONS/);
  assert.throws(() => validateEventQuestionIds(["soc-1", "soc-1", "soc-3"]), /INVALID_EVENT_QUESTIONS/);
  assert.throws(() => validateEventQuestionIds(["soc-1", "soc-2", "unknown-1"]), /INVALID_EVENT_QUESTIONS/);
  assert.throws(() => validateEventQuestionIds(Array.from({ length: 51 }, (_, i) => "soc-" + (i + 1))), /INVALID_EVENT_QUESTIONS/);
});

test("next question follows Owner-configured order and repeated reads do not reset the clock", () => {
  const first = buildGemEventQuestionStart({
    event, attempt, uid: "alice", eventId: "event-1", attemptId: "attempt-1", now: 1000
  });
  assert.equal(first.result.questionId, "soc-1");
  assert.equal(first.result.questionIndex, 0);
  assert.equal(first.attempt.status, "in_progress");
  assert.equal(first.attempt.questionStartedAt, 1000);

  const repeated = buildGemEventQuestionStart({
    event, attempt: first.attempt, uid: "alice", eventId: "event-1", attemptId: "attempt-1", now: 5000
  });
  assert.equal(repeated.duplicate, true);
  assert.equal(repeated.result.startedAt, 1000);
  assert.equal(repeated.result.questionId, "soc-1");
});

test("event question start rejects the wrong participant, event and inactive event", () => {
  assert.throws(() => buildGemEventQuestionStart({
    event, attempt, uid: "bob", eventId: "event-1", attemptId: "attempt-1", now: 1000
  }), /EVENT_ATTEMPT_NOT_FOUND/);
  assert.throws(() => buildGemEventQuestionStart({
    event, attempt, uid: "alice", eventId: "other-event", attemptId: "attempt-1", now: 1000
  }), /EVENT_ATTEMPT_NOT_FOUND/);
  assert.throws(() => buildGemEventQuestionStart({
    event: { ...event, status: "draft" }, attempt, uid: "alice",
    eventId: "event-1", attemptId: "attempt-1", now: 1000
  }), /EVENT_NOT_ACTIVE/);
});

test("a paid event attempt can finish after the event closes", () => {
  const closedEvent = { ...event, closesAt: 1500 };
  const started = buildGemEventQuestionStart({
    event: closedEvent,
    attempt,
    uid: "alice",
    eventId: "event-1",
    attemptId: "attempt-1",
    now: 2000
  });
  assert.equal(started.result.questionId, "soc-1");
  const answered = buildGemEventAnswerResult({
    event: closedEvent,
    attempt: started.attempt,
    uid: "alice",
    eventId: "event-1",
    attemptId: "attempt-1",
    questionId: "soc-1",
    answerKey: "B",
    operationId: op,
    now: 2500
  });
  assert.equal(answered.result.correct, true);
  assert.equal(answered.attempt.questionIndex, 1);
});

test("event answers are verified against the server answer key and update score", () => {
  const started = buildGemEventQuestionStart({
    event, attempt, uid: "alice", eventId: "event-1", attemptId: "attempt-1", now: 1000
  });
  const first = buildGemEventAnswerResult({
    event, attempt: started.attempt, uid: "alice", eventId: "event-1",
    attemptId: "attempt-1", questionId: "soc-1", answerKey: "B", operationId: op, now: 3500
  });
  assert.equal(first.result.correct, true);
  assert.equal(first.result.score.correctCount, 1);
  assert.equal(first.result.elapsedMs, 2500);
  assert.equal(first.attempt.questionIndex, 1);
  assert.equal(first.attempt.status, "in_progress");
  assert.equal(first.attempt.questionStartedAt, null);
});

test("event answer operation IDs are idempotent and cannot be reused with different answers", () => {
  const started = buildGemEventQuestionStart({
    event, attempt, uid: "alice", eventId: "event-1", attemptId: "attempt-1", now: 1000
  });
  const first = buildGemEventAnswerResult({
    event, attempt: started.attempt, uid: "alice", eventId: "event-1",
    attemptId: "attempt-1", questionId: "soc-1", answerKey: "B", operationId: op, now: 2000
  });
  const repeated = buildGemEventAnswerResult({
    event, attempt: first.attempt, uid: "alice", eventId: "event-1",
    attemptId: "attempt-1", questionId: "soc-1", answerKey: "B", operationId: op, now: 9000
  });
  assert.equal(repeated.duplicate, true);
  assert.deepEqual(repeated.result, first.result);
  assert.throws(() => buildGemEventAnswerResult({
    event, attempt: first.attempt, uid: "alice", eventId: "event-1",
    attemptId: "attempt-1", questionId: "soc-1", answerKey: "A", operationId: op, now: 9000
  }), /IDEMPOTENCY_KEY_REUSED/);
});

test("event answer order cannot be skipped or forged", () => {
  const started = buildGemEventQuestionStart({
    event, attempt, uid: "alice", eventId: "event-1", attemptId: "attempt-1", now: 1000
  });
  assert.throws(() => buildGemEventAnswerResult({
    event, attempt: started.attempt, uid: "alice", eventId: "event-1",
    attemptId: "attempt-1", questionId: "soc-2", answerKey: "C", operationId: op, now: 2000
  }), /EVENT_QUESTION_SEQUENCE/);
  assert.throws(() => buildGemEventAnswerResult({
    event, attempt: started.attempt, uid: "alice", eventId: "event-1",
    attemptId: "attempt-1", questionId: "soc-1", answerKey: "Z", operationId: op, now: 2000
  }), /INVALID_EVENT_ANSWER/);
});

test("event attempts finish only after all configured questions are answered", () => {
  let current = attempt;
  const answers = [
    ["soc-1", "A", op, 1000],
    ["soc-2", "C", op2, 2000],
    ["soc-3", "B", op3, 3000]
  ];
  for (const [questionId, key, operationId, time] of answers) {
    const start = buildGemEventQuestionStart({
      event, attempt: current, uid: "alice", eventId: "event-1", attemptId: "attempt-1", now: time
    });
    const result = buildGemEventAnswerResult({
      event, attempt: start.attempt, uid: "alice", eventId: "event-1",
      attemptId: "attempt-1", questionId, answerKey: key, operationId, now: time + 500
    });
    current = result.attempt;
  }
  assert.equal(current.status, "completed");
  assert.equal(current.questionIndex, 3);
  assert.equal(current.correctCount, 2);
  assert.equal(current.result.totalQuestions, 3);
  assert.equal(current.result.elapsedMs, 1500);
  assert.throws(() => buildGemEventQuestionStart({
    event, attempt: current, uid: "alice", eventId: "event-1", attemptId: "attempt-1", now: 5000
  }), /EVENT_ATTEMPT_NOT_PLAYABLE/);
});

test("leaderboard keeps each player's best score and uses faster time to break ties", () => {
  const current = {
    uid: "alice", attemptId: "attempt-1", status: "completed",
    questionIndex: 3, correctCount: 2, totalMs: 9000
  };
  const first = buildGemEventLeaderboardEntry({
    attempt: current, previous: null, uid: "alice", displayName: "Alice", now: 10000
  });
  assert.equal(first.changed, true);
  assert.equal(first.entry.correctCount, 2);

  const worse = buildGemEventLeaderboardEntry({
    attempt: { ...current, correctCount: 1, totalMs: 2000 },
    previous: first.entry, uid: "alice", displayName: "Alice", now: 11000
  });
  assert.equal(worse.changed, false);
  assert.equal(worse.entry.correctCount, 2);

  const tieFaster = buildGemEventLeaderboardEntry({
    attempt: { ...current, totalMs: 7000 },
    previous: first.entry, uid: "alice", displayName: "Alice", now: 12000
  });
  assert.equal(tieFaster.changed, true);
  assert.equal(tieFaster.entry.elapsedMs, 7000);
});
