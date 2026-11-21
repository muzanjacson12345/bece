import test from "node:test";
import assert from "node:assert/strict";
import {
  ACHIEVEMENT_GEM_REWARDS,
  achievementGemReward,
  dailyChallengeRewards
} from "../src/reward-policy.mjs";

test("daily challenge rewards preserve the current XP scale and add Coins", () => {
  assert.deepEqual(dailyChallengeRewards(1), { xp: 14, coins: 3 });
  assert.deepEqual(dailyChallengeRewards(5), { xp: 20, coins: 5 });
  assert.deepEqual(dailyChallengeRewards(25), { xp: 36, coins: 9 });
});

test("daily challenge targets outside the supported range are rejected", () => {
  for (const target of [0, -1, 1.5, 101, NaN, Infinity, "5"]) {
    assert.throws(() => dailyChallengeRewards(target), {
      name: "RangeError",
      message: "INVALID_CHALLENGE_TARGET"
    });
  }
});

test("all 44 current achievements have one positive, bounded Gem reward", () => {
  const ids = Object.keys(ACHIEVEMENT_GEM_REWARDS);
  assert.equal(ids.length, 44);
  for (const id of ids) {
    const reward = ACHIEVEMENT_GEM_REWARDS[id];
    assert.ok(Number.isSafeInteger(reward) && reward >= 1 && reward <= 100, id);
    assert.equal(achievementGemReward(id), reward);
  }
});

test("unknown achievement IDs cannot earn Gems", () => {
  assert.equal(achievementGemReward("not-an-achievement"), 0);
  assert.equal(achievementGemReward(""), 0);
  assert.equal(achievementGemReward(null), 0);
});
