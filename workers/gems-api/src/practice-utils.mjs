import { dailyChallengeRewards, achievementGemReward } from "./reward-policy.mjs";
import { isCorrectAnswer } from "./question-keys.mjs";

export const CHALLENGE_GROUPS = Object.freeze([{"metric":"answered","targets":[5,8,10,12,15,20,25]},{"metric":"correct","targets":[3,5,8,10,12,15,20]},{"metric":"quizzes","targets":[1,2,3,4]},{"metric":"subjects","targets":[2,3,4,5]},{"metric":"perfect","targets":[1,2,3]},{"metric":"longQuiz","targets":[1,2,3]},{"metric":"mixed","targets":[1,2,3]},{"metric":"soc","targets":[4,6,8,10]},{"metric":"art","targets":[3,5,7,9]},{"metric":"mat","targets":[4,6,8,10,12]},{"metric":"com","targets":[3,5,7,9]},{"metric":"rme","targets":[3,5,7,9]},{"metric":"sci","targets":[3,5,7,9,12]},{"metric":"fre","targets":[3,5,7,9,12]},{"metric":"ct","targets":[3,5,7,9,12]}]);
export const ACHIEVEMENT_REQUIREMENTS = Object.freeze([{"id":"first-answer","metric":"answered","target":1},{"id":"curious-mind","metric":"answered","target":25},{"id":"question-pro","metric":"answered","target":100},{"id":"question-veteran","metric":"answered","target":250},{"id":"question-master","metric":"answered","target":500},{"id":"question-legend","metric":"answered","target":1000},{"id":"question-1500","metric":"answered","target":1500},{"id":"question-2500","metric":"answered","target":2500},{"id":"getting-sharp","metric":"correct","target":25},{"id":"accuracy-star","metric":"correct","target":100},{"id":"accuracy-250","metric":"correct","target":250},{"id":"accuracy-500","metric":"correct","target":500},{"id":"accuracy-1000","metric":"correct","target":1000},{"id":"accuracy-2000","metric":"correct","target":2000},{"id":"quiz-beginner","metric":"quizzes","target":1},{"id":"quiz-regular","metric":"quizzes","target":10},{"id":"quiz-25","metric":"quizzes","target":25},{"id":"quiz-50","metric":"quizzes","target":50},{"id":"quiz-100","metric":"quizzes","target":100},{"id":"quiz-250","metric":"quizzes","target":250},{"id":"subject-explorer","metric":"subjects","target":3},{"id":"all-rounder","metric":"subjects","target":5},{"id":"all-six-subjects","metric":"subjects","target":6},{"id":"science-starter","metric":"sci","target":10},{"id":"science-scholar","metric":"sci","target":50},{"id":"science-master","metric":"sci","target":100},{"id":"all-seven-subjects","metric":"subjects","target":7},{"id":"french-starter","metric":"fre","target":10},{"id":"french-learner","metric":"fre","target":50},{"id":"french-confident","metric":"fre","target":100},{"id":"career-starter","metric":"ct","target":10},{"id":"career-learner","metric":"ct","target":50},{"id":"career-master","metric":"ct","target":100},{"id":"all-nine-subjects","metric":"subjects","target":8},{"id":"perfect-round","metric":"perfect","target":1},{"id":"perfect-5","metric":"perfect","target":5},{"id":"perfect-10","metric":"perfect","target":10},{"id":"perfect-25","metric":"perfect","target":25},{"id":"three-day-streak","metric":"streak","target":3},{"id":"week-streak","metric":"streak","target":7},{"id":"streak-14","metric":"streak","target":14},{"id":"streak-30","metric":"streak","target":30},{"id":"streak-60","metric":"streak","target":60},{"id":"streak-100","metric":"streak","target":100}]);

const SUBJECT_CODES = Object.freeze({
  soc: "soc", art: "art", mat: "mat", com: "com",
  rme: "rme", sci: "sci", fre: "fre", ct: "ct"
});
const DAY_MS = 86400000;

export function challengeHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function dailyChallengeSet(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new TypeError("INVALID_DAY");
  const pool = CHALLENGE_GROUPS.flatMap(group => group.targets.map(target => ({
    id: group.metric + "-" + target,
    metric: group.metric,
    target
  })));
  let seed = challengeHash("bece-challenges-" + day);
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3).map(task => ({
    ...task,
    ...dailyChallengeRewards(task.target)
  }));
}

function safeCount(value) {
  const number = Number(value || 0);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
}

function clampRate(value) {
  const number = Number(value) || 1;
  return Math.min(3, Math.max(0.5, number));
}

function utcWeekStart(day) {
  const date = new Date(day + "T00:00:00.000Z");
  const weekday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekday);
  return date.toISOString().slice(0, 10);
}

function utcYesterday(day) {
  return new Date(Date.parse(day + "T00:00:00.000Z") - DAY_MS).toISOString().slice(0, 10);
}

function parseExistingCounted(player, day) {
  const counted = player && player.counted;
  if (!counted || counted.day !== day || !Array.isArray(counted.ids)) return [];
  return [...new Set(counted.ids.filter(id => typeof id === "string"))];
}

function metricForQuestion(id) {
  const prefix = String(id).split("-")[0];
  return SUBJECT_CODES[prefix] || null;
}

export function buildPracticeRewardResult({
  player = {},
  settings = {},
  questionIds,
  answers,
  day,
  kind = "practice",
  claimedAchievements = []
}) {
  if (!Array.isArray(questionIds) || !questionIds.length || questionIds.length > 100) {
    throw new TypeError("INVALID_QUESTION_IDS");
  }
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    throw new TypeError("INVALID_ANSWERS");
  }
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new TypeError("INVALID_DAY");
  }

  const uniqueQuestions = [...new Set(questionIds)];
  if (uniqueQuestions.length !== questionIds.length) throw new TypeError("DUPLICATE_QUESTION_IDS");
  const questionSet = new Set(uniqueQuestions);
  const answeredIds = Object.keys(answers);
  if (answeredIds.some(id => !questionSet.has(id))) throw new TypeError("ANSWER_NOT_IN_QUESTION_SET");

  const correctIds = answeredIds.filter(id => isCorrectAnswer(id, answers[id]));
  const correctCount = correctIds.length;
  const counted = parseExistingCounted(player, day);
  const countedSet = new Set(counted);
  const freshCorrectIds = correctIds.filter(id => !countedSet.has(id));
  const alreadyCounted = correctCount - freshCorrectIds.length;
  const fresh = freshCorrectIds.length;

  const yesterday = utcYesterday(day);
  let streak = safeCount(player.streak), extended = false, usedFreeze = false;
  if (player.lastDay !== day) {
    if (player.lastDay === yesterday) {
      streak += 1;
      extended = true;
    } else if (safeCount(player.sfreezes) > 0 && streak > 0) {
      usedFreeze = true;
      extended = true;
    } else {
      streak = 1;
      extended = true;
    }
  }

  const previousAchievements = player.achievements && typeof player.achievements === "object"
    ? player.achievements : {};
  const achievementStats = { ...(previousAchievements.stats || {}) };
  const achievementSubjects = [...new Set([
    ...(Array.isArray(previousAchievements.subjects) ? previousAchievements.subjects : [])
      .map(metricForQuestion).filter(Boolean),
    ...answeredIds.map(metricForQuestion).filter(Boolean)
  ])];

  achievementStats.answered = safeCount(achievementStats.answered) + answeredIds.length;
  achievementStats.correct = safeCount(achievementStats.correct) + correctCount;
  achievementStats.quizzes = safeCount(achievementStats.quizzes) + 1;
  if (answeredIds.length === questionIds.length && answeredIds.length > 0 && correctCount === answeredIds.length) {
    achievementStats.perfect = safeCount(achievementStats.perfect) + 1;
  }
  const subjectMetrics = {};
  answeredIds.forEach(id => {
    const metric = metricForQuestion(id);
    if (metric) subjectMetrics[metric] = (subjectMetrics[metric] || 0) + 1;
  });
  Object.entries(subjectMetrics).forEach(([metric, count]) => {
    achievementStats[metric] = safeCount(achievementStats[metric]) + count;
  });

  const previousUnlocked = Array.isArray(previousAchievements.unlocked)
    ? previousAchievements.unlocked.filter(id => typeof id === "string") : [];
  const unlocked = new Set(previousUnlocked);
  const newlyUnlocked = [];
  ACHIEVEMENT_REQUIREMENTS.forEach(achievement => {
    const value = achievement.metric === "subjects"
      ? achievementSubjects.length
      : achievement.metric === "streak"
        ? streak
        : safeCount(achievementStats[achievement.metric]);
    if (value >= achievement.target && !unlocked.has(achievement.id)) {
      unlocked.add(achievement.id);
      newlyUnlocked.push(achievement.id);
    }
  });
  const gemEligible = newlyUnlocked.filter(id => !claimedAchievements.includes(id));
  const gemsEarned = gemEligible.reduce((total, id) => total + achievementGemReward(id), 0);

  const achievements = {
    stats: achievementStats,
    subjects: achievementSubjects,
    unlocked: [...unlocked]
  };

  const oldChallenge = player.challengeState && player.challengeState.day === day
    ? player.challengeState : { day, progress: {}, claimed: [] };
  const challengeState = {
    day,
    progress: { ...(oldChallenge.progress || {}) },
    subjects: [...(Array.isArray(oldChallenge.subjects) ? oldChallenge.subjects : [])],
    claimed: [...new Set(Array.isArray(oldChallenge.claimed) ? oldChallenge.claimed : [])]
  };
  const xpParts = [];
  const challengeCoinParts = [];
  const challengeClaimed = [];
  if (kind !== "daily") {
    const add = (metric, amount) => {
      challengeState.progress[metric] = safeCount(challengeState.progress[metric]) + amount;
    };
    const subjects = new Set(), subjectCounts = {};
    answeredIds.forEach(id => {
      const code = metricForQuestion(id);
      if (!code) return;
      subjects.add(code);
      subjectCounts[code] = (subjectCounts[code] || 0) + 1;
    });
    add("answered", answeredIds.length);
    add("correct", correctCount);
    add("quizzes", 1);
    subjects.forEach(code => {
      if (!challengeState.subjects.includes(code)) challengeState.subjects.push(code);
    });
    challengeState.progress.subjects = challengeState.subjects.length;
    if (answeredIds.length > 0 && correctCount === answeredIds.length) add("perfect", 1);
    if (answeredIds.length >= 10) add("longQuiz", 1);
    if (subjects.size >= 3) add("mixed", 1);
    Object.entries(subjectCounts).forEach(([code, count]) => add(code, count));

    dailyChallengeSet(day).forEach(task => {
      const current = safeCount(challengeState.progress[task.metric]);
      if (current >= task.target && !challengeState.claimed.includes(task.id)) {
        challengeState.claimed.push(task.id);
        challengeClaimed.push(task.id);
        xpParts.push({ id: task.id, label: "Daily challenge: " + task.id, xp: task.xp, coins: task.coins });
        challengeCoinParts.push({ id: task.id, label: "Daily challenge: " + task.id, coins: task.coins });
      }
    });
  }

  const xpMult = safeCount(player.xpBoost) > 0 ? 2 : 1;
  const expRate = clampRate(settings.expMultiplier);
  const coinRate = clampRate(settings.coinMultiplier);
  const baseXp = fresh * 10 * xpMult;
  const bonusXp = xpParts.reduce((sum, part) => sum + part.xp, 0);
  const totalExpEarned = Math.floor((baseXp + bonusXp) * expRate);
  const baseExpEarned = Math.floor(baseXp * expRate);
  const bonusExpEarned = totalExpEarned - baseExpEarned;
  const scaledXpParts = xpParts.map(part => ({
    ...part, xp: Math.floor(part.xp * expRate)
  }));
  if (scaledXpParts.length) {
    const shown = scaledXpParts.reduce((sum, part) => sum + part.xp, 0);
    scaledXpParts[scaledXpParts.length - 1].xp += bonusExpEarned - shown;
  }

  const coinParts = [];
  if (fresh) coinParts.push({ label: "New correct answers", coins: fresh });
  challengeCoinParts.forEach(part => coinParts.push(part));
  const streakCoins = fresh > 0 ? Math.min(5, Math.floor(streak / 3)) : 0;
  if (streakCoins) coinParts.push({ label: "Study streak bonus", coins: streakCoins });
  const totalCoinsEarned = Math.floor(coinParts.reduce((sum, part) => sum + part.coins, 0) * coinRate);
  const scaledCoinParts = coinParts.map(part => ({
    ...part, coins: Math.floor(part.coins * coinRate)
  }));
  if (scaledCoinParts.length) {
    const shown = scaledCoinParts.reduce((sum, part) => sum + part.coins, 0);
    scaledCoinParts[scaledCoinParts.length - 1].coins += totalCoinsEarned - shown;
  }

  const weekKey = utcWeekStart(day);
  const totalBefore = safeCount(player.totalExp);
  const weekBefore = player.weekKey === weekKey ? safeCount(player.weekExp) : 0;
  const dayBefore = player.dayKey === day ? safeCount(player.dayExp) : 0;
  const sfreezes = usedFreeze ? Math.max(0, safeCount(player.sfreezes) - 1) : safeCount(player.sfreezes);
  const xpBoost = xpMult > 1 ? Math.max(0, safeCount(player.xpBoost) - 1) : safeCount(player.xpBoost);
  const recent = [{
    kind, subject: [...new Set(answeredIds.map(id => metricForQuestion(id)).filter(Boolean))].join("+") || "mixed",
    correct: correctCount, total: answeredIds.length, exp: totalExpEarned, at: Date.now()
  }, ...(Array.isArray(player.recent) ? player.recent : [])].slice(0, 5);

  return {
    totalExpEarned,
    baseExpEarned,
    bonusExpEarned,
    totalCoinsEarned,
    scaledXpParts,
    scaledCoinParts,
    correctCount,
    alreadyCounted,
    freshCorrectIds,
    counted: { day, ids: [...new Set([...counted, ...freshCorrectIds])] },
    streak,
    extended,
    usedFreeze,
    xpMult,
    expRate,
    coinRate,
    sfreezes,
    xpBoost,
    coins: safeCount(player.coins) + totalCoinsEarned,
    gems: safeCount(player.gems) + gemsEarned,
    gemsEarned,
    gemAchievementIds: gemEligible,
    achievements,
    challengeState,
    challengeClaimed,
    recent,
    weekKey,
    weekExp: weekBefore + totalExpEarned,
    dayExp: dayBefore + totalExpEarned,
    totalExp: totalBefore + totalExpEarned,
    streakBest: Math.max(safeCount(player.bestStreak), streak)
  };
}
