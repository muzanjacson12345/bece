import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAchievementGemHistory,
  buildEventGemPrizeHistory
} from "../src/gem-history.mjs";

test("achievement history records the exact approved Gem amounts and one claim per achievement", () => {
  const result = buildAchievementGemHistory({
    uid: "student-1",
    operationId: "quiz-operation-1",
    achievementIds: ["first-answer", "curious-mind", "quiz-beginner"],
    balanceBefore: 4,
    balanceAfter: 14,
    now: 1000
  });

  assert.equal(result.transaction.currency, "gems");
  assert.equal(result.transaction.kind, "achievement_reward");
  assert.equal(result.transaction.amount, 10);
  assert.equal(result.transaction.balanceBefore, 4);
  assert.equal(result.transaction.balanceAfter, 14);
  assert.deepEqual(result.claims.map(item => item.amount), [3, 4, 3]);
  assert.equal(new Set(result.claims.map(item => item.achievementId)).size, 3);
  assert.ok(result.claims.every(item => item.uid === "student-1"));
});

test("achievement history rejects duplicate, unknown or mismatched claims", () => {
  const base = {
    uid: "student-1",
    operationId: "quiz-operation-1",
    achievementIds: ["first-answer"],
    balanceBefore: 0,
    balanceAfter: 3,
    now: 1000
  };
  assert.throws(() => buildAchievementGemHistory({
    ...base, achievementIds: ["first-answer", "first-answer"], balanceAfter: 6
  }), /DUPLICATE_GEM_HISTORY_ACHIEVEMENT/);
  assert.throws(() => buildAchievementGemHistory({
    ...base, achievementIds: ["not-a-real-achievement"]
  }), /UNKNOWN_GEM_ACHIEVEMENT/);
  assert.throws(() => buildAchievementGemHistory({
    ...base, balanceAfter: 2
  }), /GEM_HISTORY_BALANCE_MISMATCH/);
});

test("event prize history records each winner with the correct previous and new balance", () => {
  const result = buildEventGemPrizeHistory({
    eventId: "science-week",
    eventTitle: "Science Week",
    payouts: [
      { uid: "student-a", rank: 1, amount: 100, balance: 125 },
      { uid: "student-b", rank: 2, amount: 50, balance: 60 },
      { uid: "student-c", rank: 3, amount: 25, balance: 25 }
    ],
    now: 2000
  });

  assert.equal(result.totalGemsAwarded, 175);
  assert.deepEqual(result.transactions.map(item => item.amount), [100, 50, 25]);
  assert.deepEqual(result.transactions.map(item => item.balanceBefore), [25, 10, 0]);
  assert.deepEqual(result.transactions.map(item => item.balanceAfter), [125, 60, 25]);
  assert.deepEqual(result.transactions.map(item => item.kind), [
    "event_reward", "event_reward", "event_reward"
  ]);
});

test("event prize history rejects duplicate winners, invalid ranks and oversized prize pools", () => {
  assert.throws(() => buildEventGemPrizeHistory({
    eventId: "science-week",
    payouts: [
      { uid: "student-a", rank: 1, amount: 10, balance: 10 },
      { uid: "student-a", rank: 2, amount: 5, balance: 15 }
    ],
    now: 2000
  }), /INVALID_GEM_HISTORY_PAYOUT/);

  assert.throws(() => buildEventGemPrizeHistory({
    eventId: "science-week",
    payouts: [{ uid: "student-a", rank: 4, amount: 10, balance: 10 }],
    now: 2000
  }), /INVALID_GEM_HISTORY_PAYOUT/);

  assert.throws(() => buildEventGemPrizeHistory({
    eventId: "science-week",
    payouts: [
      { uid: "student-a", rank: 1, amount: 800000, balance: 800000 },
      { uid: "student-b", rank: 2, amount: 200001, balance: 200001 }
    ],
    now: 2000
  }), /GEM_HISTORY_PRIZE_POOL_LIMIT/);
});
