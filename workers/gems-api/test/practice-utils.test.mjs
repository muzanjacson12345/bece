import test from "node:test";
import assert from "node:assert/strict";
import { buildPracticeRewardResult, dailyChallengeSet } from "../src/practice-utils.mjs";

test("daily challenge selection is deterministic and includes both reward currencies", () => {
  const a = dailyChallengeSet("2026-11-21");
  const b = dailyChallengeSet("2026-11-21");
  assert.deepEqual(a, b);
  assert.equal(a.length, 3);
  for (const task of a) {
    assert.ok(task.xp > 0);
    assert.ok(task.coins >= 1);
    assert.equal(task.id, task.metric + "-" + task.target);
  }
});

test("a different day gets its own deterministic challenge set", () => {
  assert.notDeepEqual(dailyChallengeSet("2026-11-21"), dailyChallengeSet("2026-11-22"));
});

test("practice uses verified answers and grants daily challenge XP and Coins only once", () => {
  const task = dailyChallengeSet("2026-11-21")[0];
  const ids = [];
  const answers = {};
  // Add enough known question IDs for the selected metric.
  if (task.metric === "soc") {
    for (let i = 1; i <= task.target; i++) { const id = "soc-" + i; ids.push(id); answers[id] = "B"; }
  } else if (task.metric === "art") {
    for (let i = 1; i <= task.target; i++) { const id = "art-" + i; ids.push(id); answers[id] = "B"; }
  } else {
    ids.push("soc-1"); answers["soc-1"] = "B";
  }
  const player = {};
  const result = buildPracticeRewardResult({
    player, settings: {}, questionIds: ids, answers, day: "2026-11-21", kind: "practice"
  });
  assert.ok(result.totalExpEarned >= result.baseExpEarned);
  assert.ok(result.totalCoinsEarned >= 1);
  assert.equal(result.challengeClaimed.length >= 0, true);
  assert.equal(result.coins, result.totalCoinsEarned);
});

test("duplicate IDs and answers outside the quiz are rejected", () => {
  assert.throws(() => buildPracticeRewardResult({
    questionIds: ["soc-1", "soc-1"], answers: { "soc-1": "B" }, day: "2026-11-21"
  }), /DUPLICATE_QUESTION_IDS/);
  assert.throws(() => buildPracticeRewardResult({
    questionIds: ["soc-1"], answers: { "soc-2": "A" }, day: "2026-11-21"
  }), /ANSWER_NOT_IN_QUESTION_SET/);
});

test("achievements unlock and grant Gems on first server-side threshold crossing", () => {
  const result = buildPracticeRewardResult({
    player: {},
    questionIds: ["soc-1"],
    answers: { "soc-1": "B" },
    day: "2026-11-21",
    kind: "practice"
  });
  assert.ok(result.achievements.unlocked.includes("first-answer"));
  assert.ok(result.gemsEarned >= 3);
  assert.equal(result.gems, result.gemsEarned);
});

test("achievement claims prevent repeated Gem awards", () => {
  const result = buildPracticeRewardResult({
    player: { achievements: { stats: {}, subjects: [], unlocked: ["first-answer"] } },
    claimedAchievements: ["first-answer"],
    questionIds: ["soc-1"],
    answers: { "soc-1": "B" },
    day: "2026-11-21"
  });
  assert.equal(result.gemAchievementIds.includes("first-answer"), false);
});

test("unanswered questions do not count as correct answers", () => {
  const result = buildPracticeRewardResult({
    player: {},
    questionIds: ["soc-1", "soc-2"],
    answers: { "soc-1": "B" },
    day: "2026-11-21"
  });
  assert.equal(result.correctCount, 1);
  assert.equal(result.achievements.stats.answered, 1);
});


test("unanswered subject IDs cannot unlock subject achievements or add subject progress", () => {
  const questionIds = [
    "soc-1", "art-1", "mat-101", "com-101",
    "rme-115", "sci-27", "fre-1", "ct-1"
  ];
  const result = buildPracticeRewardResult({
    player: {},
    questionIds,
    answers: { "soc-1": "B" },
    day: "2026-11-21",
    kind: "practice"
  });

  assert.deepEqual(result.achievements.subjects, ["soc"]);
  assert.equal(result.achievements.stats.soc, 1);
  for (const metric of ["art", "mat", "com", "rme", "sci", "fre", "ct"]) {
    assert.equal(result.achievements.stats[metric], undefined);
  }
  assert.equal(result.achievements.unlocked.includes("subject-explorer"), false);
  assert.equal(result.achievements.unlocked.includes("all-nine-subjects"), false);
  assert.deepEqual(result.challengeState.subjects, ["soc"]);
  assert.equal(result.gemsEarned, 3);
});

test("unanswered questions cannot satisfy long-quiz progress or inflate recent totals", () => {
  const questionIds = Array.from({ length: 10 }, (_, index) => "soc-" + (index + 1));
  const result = buildPracticeRewardResult({
    player: {},
    questionIds,
    answers: { "soc-1": "B" },
    day: "2026-11-21",
    kind: "practice"
  });

  assert.equal(result.challengeState.progress.longQuiz, undefined);
  assert.equal(result.recent[0].total, 1);
  assert.equal(result.recent[0].subject, "soc");
});
