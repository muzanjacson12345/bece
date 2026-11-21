import { isKnownQuestionId, isCorrectAnswer } from "./question-keys.mjs";

const MAX_BALANCE = 1000000000;
const ANSWER_TIME_GRACE_MS = 1500;
export const DUEL_SETTLEMENT_GRACE_MS = 120000;

function fail(code) {
  throw new Error(code);
}

function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function validateDuel(duel, uid) {
  if (!duel || duel.state !== "playing") fail("DUEL_NOT_PLAYING");
  if (typeof uid !== "string" || (duel.host !== uid && duel.guest !== uid)) {
    fail("DUEL_NOT_PARTICIPANT");
  }
  if (typeof duel.host !== "string" || typeof duel.guest !== "string" || duel.host === duel.guest) {
    fail("INVALID_DUEL");
  }
  if (!Array.isArray(duel.qids) || duel.qids.length < 1 || duel.qids.length > 50
      || new Set(duel.qids).size !== duel.qids.length
      || duel.qids.some(id => !isKnownQuestionId(id))) {
    fail("INVALID_DUEL_QUESTIONS");
  }
  if (!Number.isSafeInteger(duel.secs) || duel.secs < 5 || duel.secs > 60) {
    fail("INVALID_DUEL_SETTINGS");
  }
}

function progressScore(progress, total, doneOverride) {
  return {
    c: safeCount(progress && progress.correctCount),
    n: doneOverride ? total : Math.min(total, safeCount(progress && progress.nextIndex)),
    ms: safeCount(progress && progress.totalMs),
    done: doneOverride === undefined ? !!(progress && progress.done) : !!doneOverride
  };
}

export function createDuelProgress(uid, code, now = Date.now()) {
  if (typeof uid !== "string" || !uid || typeof code !== "string" || !code) {
    fail("INVALID_DUEL_SESSION");
  }
  if (!Number.isSafeInteger(now) || now < 0) fail("INVALID_DUEL_TIME");
  return {
    uid,
    code,
    startedAt: now,
    lastAnsweredAt: now,
    questionStartedAt: now,
    nextIndex: 0,
    correctCount: 0,
    totalMs: 0,
    streak: 0,
    bestStreak: 0,
    secondChancesUsed: 0,
    secondChanceIndexes: [],
    answers: [],
    done: false,
    forfeit: false
  };
}


export function buildDuelQuestionStart({ duel, progress, uid, questionId, now = Date.now() }) {
  validateDuel(duel, uid);
  if (!progress || progress.uid !== uid) fail("DUEL_NOT_STARTED");
  if (progress.done) fail("DUEL_ALREADY_FINISHED");
  if (!Number.isSafeInteger(now) || now < progress.startedAt) fail("INVALID_DUEL_TIME");
  const index = safeCount(progress.nextIndex);
  if (index >= duel.qids.length || duel.qids[index] !== questionId) {
    fail("DUEL_QUESTION_SEQUENCE");
  }
  if (Number.isSafeInteger(progress.questionStartedAt)) {
    return {
      duplicate: true,
      progress,
      result: { questionId, startedAt: progress.questionStartedAt, index }
    };
  }
  const nextProgress = { ...progress, questionStartedAt: now };
  return {
    duplicate: false,
    progress: nextProgress,
    result: { questionId, startedAt: now, index }
  };
}

export function buildDuelAnswerResult({
  duel, progress, uid, questionId, answerKey, operationId, now = Date.now()
}) {
  validateDuel(duel, uid);
  if (!progress || progress.uid !== uid) fail("DUEL_NOT_STARTED");
  if (typeof operationId !== "string"
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) {
    fail("INVALID_OPERATION_ID");
  }
  if (answerKey !== null && (typeof answerKey !== "string" || !/^[A-D]$/.test(answerKey))) {
    fail("INVALID_DUEL_ANSWER");
  }
  if (!Number.isSafeInteger(now) || now < 0) fail("INVALID_DUEL_TIME");

  const previous = Array.isArray(progress.answers) ? progress.answers : [];
  const duplicate = previous.find(item => item && item.operationId === operationId);
  if (duplicate) {
    if (duplicate.questionId !== questionId || duplicate.requestedKey !== answerKey) {
      fail("IDEMPOTENCY_KEY_REUSED");
    }
    return { duplicate: true, progress, result: duplicate.response };
  }
  if (progress.done) fail("DUEL_ALREADY_FINISHED");

  const index = safeCount(progress.nextIndex);
  if (index >= duel.qids.length || duel.qids[index] !== questionId) {
    fail("DUEL_QUESTION_SEQUENCE");
  }
  const startedAt = Number(progress.startedAt);
  const questionStartedAt = Number(progress.questionStartedAt);
  if (!Number.isSafeInteger(startedAt) || startedAt <= 0
      || !Number.isSafeInteger(questionStartedAt) || questionStartedAt < startedAt) {
    fail("INVALID_DUEL_SESSION");
  }

  const rawElapsed = Math.max(0, now - questionStartedAt);
  const limit = duel.secs * 1000;
  const timedOut = rawElapsed > limit + ANSWER_TIME_GRACE_MS;
  const acceptedKey = timedOut ? null : answerKey;
  const correct = acceptedKey !== null && isCorrectAnswer(questionId, acceptedKey);
  const elapsedMs = Math.min(limit, rawElapsed);
  const correctCount = safeCount(progress.correctCount) + (correct ? 1 : 0);
  const streak = correct ? safeCount(progress.streak) + 1 : 0;
  const bestStreak = Math.max(safeCount(progress.bestStreak), streak);
  const nextIndex = index + 1;
  const done = nextIndex >= duel.qids.length;
  const score = { c: correctCount, n: nextIndex, ms: safeCount(progress.totalMs) + elapsedMs, done };
  const response = {
    questionId,
    answerKey: acceptedKey,
    correct,
    timedOut,
    elapsedMs,
    score,
    streak,
    best: bestStreak,
    done,
    nextIndex
  };
  const answer = {
    index,
    questionId,
    answerKey: acceptedKey,
    requestedKey: answerKey,
    correct,
    elapsedMs,
    operationId,
    response
  };
  const nextProgress = {
    ...progress,
    answers: [...previous, answer],
    nextIndex,
    correctCount,
    totalMs: score.ms,
    streak,
    bestStreak,
    lastAnsweredAt: now,
    questionStartedAt: null,
    done,
    ...(done ? { completedAt: now } : {})
  };
  return { duplicate: false, progress: nextProgress, result: response };
}

export function buildDuelSecondChanceProgress({ duel, progress, uid, now = Date.now() }) {
  validateDuel(duel, uid);
  if (!progress || progress.uid !== uid || !Number.isSafeInteger(progress.startedAt)) {
    fail("DUEL_NOT_STARTED");
  }
  if (progress.done) fail("DUEL_ALREADY_FINISHED");
  const index = safeCount(progress.nextIndex);
  const used = safeCount(progress.secondChancesUsed);
  const indexes = Array.isArray(progress.secondChanceIndexes) ? progress.secondChanceIndexes : [];
  if (index >= duel.qids.length || used >= 2 || indexes.includes(index)) {
    fail("DUEL_SECOND_CHANCE_LIMIT");
  }
  if (!Number.isSafeInteger(now) || now < progress.startedAt) fail("INVALID_DUEL_TIME");
  return {
    ...progress,
    secondChancesUsed: used + 1,
    secondChanceIndexes: [...indexes, index],
    lastAnsweredAt: now,
    questionStartedAt: now
  };
}

export function buildDuelForfeitProgress({ duel, progress, uid, now = Date.now() }) {
  validateDuel(duel, uid);
  if (!progress || progress.uid !== uid || !Number.isSafeInteger(progress.startedAt)) {
    fail("DUEL_NOT_STARTED");
  }
  if (progress.done) return progress;
  if (!Number.isSafeInteger(now) || now < progress.startedAt) fail("INVALID_DUEL_TIME");
  const unanswered = Math.max(0, duel.qids.length - safeCount(progress.nextIndex));
  return {
    ...progress,
    nextIndex: duel.qids.length,
    totalMs: safeCount(progress.totalMs) + unanswered * duel.secs * 1000,
    done: true,
    forfeit: true,
    completedAt: now,
    lastAnsweredAt: now
  };
}

function utcYesterday(day) {
  const date = new Date(day + "T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function playerBalance(player, field) {
  const raw = player && player[field] !== undefined ? player[field] : 0;
  if (!Number.isSafeInteger(raw) || raw < 0 || raw > MAX_BALANCE) {
    fail("INVALID_PLAYER_BALANCE");
  }
  return raw;
}

function rewardFor({ uid, progress, outcome, player, total, day }) {
  const coins = playerBalance(player, "coins");
  const statField = outcome === "win" ? "duelW" : outcome === "draw" ? "duelD" : "duelL";
  const statCount = playerBalance(player, statField);
  const currentDayCount = player && player.dcDay === day ? playerBalance(player, "dcN") : 0;
  const dailyLimit = currentDayCount >= 10;
  const parts = [];
  let earned = 0;

  if (!progress.forfeit && !dailyLimit) {
    const base = outcome === "win" ? 5 : outcome === "draw" ? 2 : 1;
    parts.push({
      label: outcome === "win" ? "🏆 Duel won" : outcome === "draw" ? "🤝 Draw" : "⚔️ Duel played",
      n: base
    });
    const run = Math.min(3, Math.floor(safeCount(progress.bestStreak) / 3));
    if (run) parts.push({ label: "🔥 Best run: " + safeCount(progress.bestStreak) + " in a row", n: run });
    if (safeCount(progress.correctCount) === total && total >= 3) {
      parts.push({ label: "🌟 Perfect score", n: 2 });
    }
    const lastDay = player && player.lastDay;
    const streak = lastDay === day || lastDay === utcYesterday(day) ? safeCount(player.streak) : 0;
    const dayBonus = Math.min(3, Math.floor(streak / 3));
    if (dayBonus) parts.push({ label: "📅 " + streak + "-day streak bonus", n: dayBonus });
    earned = parts.reduce((sum, item) => sum + item.n, 0);
  }

  const balance = coins + earned;
  if (!Number.isSafeInteger(balance) || balance > MAX_BALANCE) fail("PLAYER_BALANCE_LIMIT");
  return {
    uid,
    outcome,
    coinsEarned: earned,
    balance,
    parts,
    dailyLimit,
    forfeit: !!progress.forfeit,
    playerUpdates: {
      coins: balance,
      [statField]: statCount + 1,
      ...(!progress.forfeit && !dailyLimit
        ? { dcDay: day, dcN: currentDayCount + 1 }
        : {})
    }
  };
}

export function buildDuelSettlement({
  duel, progressByUid, playerByUid, day, now = Date.now(),
  graceMs = DUEL_SETTLEMENT_GRACE_MS
}) {
  if (!duel || typeof duel.host !== "string" || typeof duel.guest !== "string"
      || duel.host === duel.guest || !Array.isArray(duel.qids)
      || duel.qids.length < 1 || duel.qids.length > 50
      || duel.qids.some(id => !isKnownQuestionId(id))
      || !Number.isSafeInteger(duel.secs) || duel.secs < 5 || duel.secs > 60) {
    fail("INVALID_DUEL");
  }
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) fail("INVALID_DUEL_DAY");

  const host = duel.host, guest = duel.guest, total = duel.qids.length;
  const original = {
    [host]: progressByUid && progressByUid[host] || {
      uid: host, nextIndex: 0, correctCount: 0, totalMs: 0, bestStreak: 0,
      done: false, forfeit: false, answers: []
    },
    [guest]: progressByUid && progressByUid[guest] || {
      uid: guest, nextIndex: 0, correctCount: 0, totalMs: 0, bestStreak: 0,
      done: false, forfeit: false, answers: []
    }
  };
  const hostProgress = original[host], guestProgress = original[guest];
  const hostDoneAt = Number(hostProgress.completedAt) || 0;
  const guestDoneAt = Number(guestProgress.completedAt) || 0;
  const bothDone = hostProgress.done === true && guestProgress.done === true;
  const hostWaitExpired = hostProgress.done === true && hostDoneAt > 0 && now - hostDoneAt >= graceMs;
  const guestWaitExpired = guestProgress.done === true && guestDoneAt > 0 && now - guestDoneAt >= graceMs;

  if (!bothDone && !hostWaitExpired && !guestWaitExpired) {
    const completedAt = [hostDoneAt, guestDoneAt].filter(Boolean);
    const nextAt = completedAt.length ? Math.min(...completedAt) + graceMs : now + graceMs;
    return { waiting: true, retryAfterMs: Math.max(1000, Math.min(15000, nextAt - now)) };
  }

  const progress = {
    [host]: hostProgress.done === true ? hostProgress : {
      ...hostProgress,
      nextIndex: total,
      totalMs: safeCount(hostProgress.totalMs) + Math.max(0, total - safeCount(hostProgress.nextIndex)) * duel.secs * 1000,
      done: true,
      forfeit: true,
      completedAt: now
    },
    [guest]: guestProgress.done === true ? guestProgress : {
      ...guestProgress,
      nextIndex: total,
      totalMs: safeCount(guestProgress.totalMs) + Math.max(0, total - safeCount(guestProgress.nextIndex)) * duel.secs * 1000,
      done: true,
      forfeit: true,
      completedAt: now
    }
  };

  const score = {
    [host]: progressScore(progress[host], total, true),
    [guest]: progressScore(progress[guest], total, true)
  };
  let winner = null;
  if (progress[host].forfeit && !progress[guest].forfeit) winner = guest;
  else if (progress[guest].forfeit && !progress[host].forfeit) winner = host;
  else if (!progress[host].forfeit && !progress[guest].forfeit) {
    if (score[host].c !== score[guest].c) winner = score[host].c > score[guest].c ? host : guest;
    else if (score[host].ms !== score[guest].ms) winner = score[host].ms < score[guest].ms ? host : guest;
  }

  const outcome = {
    [host]: winner === null ? "draw" : winner === host ? "win" : "loss",
    [guest]: winner === null ? "draw" : winner === guest ? "win" : "loss"
  };
  const players = playerByUid || {};
  const rewards = {
    [host]: rewardFor({ uid: host, progress: progress[host], outcome: outcome[host], player: players[host] || {}, total, day }),
    [guest]: rewardFor({ uid: guest, progress: progress[guest], outcome: outcome[guest], player: players[guest] || {}, total, day })
  };
  const byUid = {};
  for (const uid of [host, guest]) {
    const opponent = uid === host ? guest : host;
    byUid[uid] = {
      outcome: outcome[uid],
      me: score[uid],
      opponent: score[opponent],
      reward: {
        coinsEarned: rewards[uid].coinsEarned,
        balance: rewards[uid].balance,
        parts: rewards[uid].parts,
        dailyLimit: rewards[uid].dailyLimit,
        forfeit: rewards[uid].forfeit
      }
    };
  }

  return {
    waiting: false,
    progress,
    score,
    outcome,
    rewards,
    byUid,
    settledAt: now
  };
}
