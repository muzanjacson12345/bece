// Shared reward policy used by the BECE Hub Gems/Rewards Worker.
export const DAILY_CHALLENGE_XP_BASE = 12;
export const DAILY_CHALLENGE_XP_CAP_BONUS = 24;
export const DAILY_CHALLENGE_COIN_DIVISOR = 4;

export const ACHIEVEMENT_GEM_REWARDS = Object.freeze({
  // Question milestones
  "first-answer": 3,
  "curious-mind": 4,
  "question-pro": 6,
  "question-veteran": 8,
  "question-master": 10,
  "question-legend": 12,
  "question-1500": 15,
  "question-2500": 20,

  // Accuracy milestones
  "getting-sharp": 3,
  "accuracy-star": 5,
  "accuracy-250": 8,
  "accuracy-500": 12,
  "accuracy-1000": 16,
  "accuracy-2000": 22,

  // Quiz milestones
  "quiz-beginner": 3,
  "quiz-regular": 5,
  "quiz-25": 8,
  "quiz-50": 12,
  "quiz-100": 16,
  "quiz-250": 22,

  // Subject exploration
  "subject-explorer": 4,
  "all-rounder": 7,
  "all-six-subjects": 10,
  "science-starter": 3,
  "science-scholar": 5,
  "science-master": 8,
  "all-seven-subjects": 12,
  "french-starter": 3,
  "french-learner": 5,
  "french-confident": 8,
  "career-starter": 3,
  "career-learner": 5,
  "career-master": 8,
  "all-nine-subjects": 15,

  // Perfect quizzes
  "perfect-round": 5,
  "perfect-5": 10,
  "perfect-10": 15,
  "perfect-25": 22,

  // Study streaks
  "three-day-streak": 5,
  "week-streak": 8,
  "streak-14": 12,
  "streak-30": 18,
  "streak-60": 25,
  "streak-100": 35
});

export function dailyChallengeRewards(target) {
  if (!Number.isSafeInteger(target) || target < 1 || target > 100) {
    throw new RangeError("INVALID_CHALLENGE_TARGET");
  }
  const xp = DAILY_CHALLENGE_XP_BASE
    + Math.min(DAILY_CHALLENGE_XP_CAP_BONUS, Math.ceil(target * 1.5));
  const coins = Math.max(1, Math.floor(xp / DAILY_CHALLENGE_COIN_DIVISOR));
  return { xp, coins };
}

export function achievementGemReward(achievementId) {
  if (typeof achievementId !== "string") return 0;
  return ACHIEVEMENT_GEM_REWARDS[achievementId] || 0;
}
