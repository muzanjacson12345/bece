import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDuelAnswerResult,
  buildDuelForfeitProgress,
  buildDuelSecondChanceProgress,
  buildDuelSettlement,
  createDuelProgress,
  DUEL_SETTLEMENT_GRACE_MS
} from "../src/duel-utils.mjs";

const duel = {
  host: "host",
  guest: "guest",
  state: "playing",
  secs: 15,
  qids: ["soc-1", "soc-2", "soc-3"]
};

test("server verifies each final answer and advances only the expected question", () => {
  const started = createDuelProgress("host", "ROOM1", 1000);
  const first = buildDuelAnswerResult({
    duel, progress: started, uid: "host", questionId: "soc-1",
    answerKey: "B", operationId: "11111111-1111-4111-8111-111111111111", now: 5000
  });
  assert.equal(first.result.correct, true);
  assert.deepEqual(first.result.score, { c: 1, n: 1, ms: 4000, done: false });
  assert.equal(first.progress.streak, 1);

  assert.throws(() => buildDuelAnswerResult({
    duel, progress: first.progress, uid: "host", questionId: "soc-3",
    answerKey: "B", operationId: "22222222-2222-4222-8222-222222222222", now: 6000
  }), /DUEL_QUESTION_SEQUENCE/);
});

test("wrong and timed-out answers cannot increase the correct score", () => {
  const started = createDuelProgress("host", "ROOM1", 1000);
  const wrong = buildDuelAnswerResult({
    duel, progress: started, uid: "host", questionId: "soc-1",
    answerKey: "A", operationId: "11111111-1111-4111-8111-111111111111", now: 2000
  });
  assert.equal(wrong.result.correct, false);
  assert.equal(wrong.result.score.c, 0);
  const late = buildDuelAnswerResult({
    duel, progress: wrong.progress, uid: "host", questionId: "soc-2",
    answerKey: "C", operationId: "22222222-2222-4222-8222-222222222222", now: 19000
  });
  assert.equal(late.result.timedOut, true);
  assert.equal(late.result.answerKey, null);
  assert.equal(late.result.correct, false);
  assert.equal(late.result.score.c, 0);
});

test("answer operation IDs are idempotent and cannot be reused for another answer", () => {
  const started = createDuelProgress("host", "ROOM1", 1000);
  const input = {
    duel, progress: started, uid: "host", questionId: "soc-1",
    answerKey: "B", operationId: "11111111-1111-4111-8111-111111111111", now: 2000
  };
  const first = buildDuelAnswerResult(input);
  const retry = buildDuelAnswerResult({ ...input, progress: first.progress, now: 9000 });
  assert.equal(retry.duplicate, true);
  assert.deepEqual(retry.result, first.result);
  assert.throws(() => buildDuelAnswerResult({
    ...input, progress: first.progress, answerKey: "A", now: 9000
  }), /IDEMPOTENCY_KEY_REUSED/);
});

test("players cannot submit another participant's answers or unsupported question IDs", () => {
  const started = createDuelProgress("host", "ROOM1", 1000);
  assert.throws(() => buildDuelAnswerResult({
    duel, progress: started, uid: "stranger", questionId: "soc-1",
    answerKey: "B", operationId: "11111111-1111-4111-8111-111111111111", now: 2000
  }), /DUEL_NOT_PARTICIPANT/);
  assert.throws(() => buildDuelAnswerResult({
    duel: { ...duel, qids: ["unknown-999"] }, progress: started, uid: "host",
    questionId: "unknown-999", answerKey: "A",
    operationId: "11111111-1111-4111-8111-111111111111", now: 2000
  }), /INVALID_DUEL_QUESTIONS/);
});

test("Second Chance is limited to two uses per duel and one use per question", () => {
  const started = createDuelProgress("host", "ROOM1", 1000);
  const first = buildDuelSecondChanceProgress({ duel, progress: started, uid: "host", now: 2000 });
  assert.equal(first.secondChancesUsed, 1);
  assert.equal(first.lastAnsweredAt, 2000);
  assert.throws(() => buildDuelSecondChanceProgress({
    duel, progress: first, uid: "host", now: 2500
  }), /DUEL_SECOND_CHANCE_LIMIT/);

  const nextQuestion = buildDuelAnswerResult({
    duel, progress: first, uid: "host", questionId: "soc-1", answerKey: "B",
    operationId: "11111111-1111-4111-8111-111111111111", now: 3000
  });
  const second = buildDuelSecondChanceProgress({
    duel, progress: nextQuestion.progress, uid: "host", now: 4000
  });
  assert.equal(second.secondChancesUsed, 2);
  assert.throws(() => buildDuelSecondChanceProgress({
    duel, progress: second, uid: "host", now: 5000
  }), /DUEL_SECOND_CHANCE_LIMIT/);
});

test("forfeit marks unanswered questions wrong without allowing browser score claims", () => {
  const started = createDuelProgress("host", "ROOM1", 1000);
  const first = buildDuelAnswerResult({
    duel, progress: started, uid: "host", questionId: "soc-1", answerKey: "B",
    operationId: "11111111-1111-4111-8111-111111111111", now: 2000
  });
  const forfeited = buildDuelForfeitProgress({
    duel, progress: first.progress, uid: "host", now: 3000
  });
  assert.equal(forfeited.done, true);
  assert.equal(forfeited.forfeit, true);
  assert.equal(forfeited.nextIndex, 3);
  assert.equal(forfeited.totalMs, 2000 + 2 * 15000);
});

test("settlement waits until both finish or the two-minute opponent grace expires", () => {
  const host = {
    uid: "host", startedAt: 1000, nextIndex: 3, correctCount: 2, totalMs: 6000,
    bestStreak: 2, done: true, forfeit: false, completedAt: 10000
  };
  const guest = {
    uid: "guest", startedAt: 1000, nextIndex: 1, correctCount: 1, totalMs: 3000,
    bestStreak: 1, done: false, forfeit: false
  };
  const early = buildDuelSettlement({
    duel, progressByUid: { host, guest }, playerByUid: { host: {}, guest: {} },
    day: "2026-11-21", now: 10000 + DUEL_SETTLEMENT_GRACE_MS - 1
  });
  assert.equal(early.waiting, true);

  const late = buildDuelSettlement({
    duel, progressByUid: { host, guest }, playerByUid: { host: {}, guest: {} },
    day: "2026-11-21", now: 10000 + DUEL_SETTLEMENT_GRACE_MS
  });
  assert.equal(late.waiting, false);
  assert.equal(late.progress.guest.forfeit, true);
  assert.equal(late.outcome.host, "win");
  assert.equal(late.outcome.guest, "loss");
});

test("settlement preserves the Duel reward formula and respects the daily limit", () => {
  const host = {
    uid: "host", nextIndex: 3, correctCount: 3, totalMs: 3000,
    bestStreak: 3, done: true, forfeit: false, completedAt: 10000
  };
  const guest = {
    uid: "guest", nextIndex: 3, correctCount: 2, totalMs: 4000,
    bestStreak: 1, done: true, forfeit: false, completedAt: 11000
  };
  const result = buildDuelSettlement({
    duel,
    progressByUid: { host, guest },
    playerByUid: {
      host: { coins: 10, duelW: 1, dcDay: "2026-11-21", dcN: 9, lastDay: "2026-11-21", streak: 6 },
      guest: { coins: 20, duelL: 2, dcDay: "2026-11-21", dcN: 10 }
    },
    day: "2026-11-21",
    now: 12000
  });
  assert.equal(result.waiting, false);
  assert.equal(result.outcome.host, "win");
  assert.equal(result.rewards.host.coinsEarned, 10); // 5 win + 1 run + 2 perfect + 2 day streak
  assert.equal(result.rewards.host.balance, 20);
  assert.equal(result.rewards.host.playerUpdates.duelW, 2);
  assert.equal(result.rewards.host.playerUpdates.dcN, 10);
  assert.equal(result.rewards.guest.dailyLimit, true);
  assert.equal(result.rewards.guest.coinsEarned, 0);
  assert.equal(result.rewards.guest.playerUpdates.duelL, 3);
});

test("forfeiting players receive no Coins, but their Duel result stat is still recorded", () => {
  const host = {
    uid: "host", nextIndex: 1, correctCount: 1, totalMs: 15000,
    bestStreak: 1, done: true, forfeit: true, completedAt: 10000
  };
  const guest = {
    uid: "guest", nextIndex: 3, correctCount: 2, totalMs: 4000,
    bestStreak: 2, done: true, forfeit: false, completedAt: 11000
  };
  const result = buildDuelSettlement({
    duel, progressByUid: { host, guest },
    playerByUid: { host: { coins: 5, duelL: 1 }, guest: { coins: 8 } },
    day: "2026-11-21", now: 12000
  });
  assert.equal(result.outcome.host, "loss");
  assert.equal(result.outcome.guest, "win");
  assert.equal(result.rewards.host.coinsEarned, 0);
  assert.equal(result.rewards.host.playerUpdates.duelL, 2);
  assert.equal(result.rewards.guest.coinsEarned, 5);
});
