import { achievementGemReward } from "./reward-policy.mjs";

const MAX_GEM_BALANCE = 1_000_000_000;
const MAX_EVENT_PRIZE_POOL = 1_000_000;

function requireText(value, maxLength, code) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength || value.includes("/")) {
    throw new TypeError(code);
  }
  return value.trim();
}

function requireBalance(value, code) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_GEM_BALANCE) {
    throw new TypeError(code);
  }
  return value;
}

function requireTime(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError("INVALID_GEM_HISTORY_TIME");
  return value;
}

/**
 * Build one aggregate history record and permanent per-achievement claim
 * records for a verified practice result. Call this inside the same
 * Firestore transaction that updates the player's Gems and reward state.
 */
export function buildAchievementGemHistory({
  uid,
  operationId,
  achievementIds,
  balanceBefore,
  balanceAfter,
  now = Date.now()
}) {
  const safeUid = requireText(uid, 128, "INVALID_GEM_HISTORY_UID");
  const safeOperationId = requireText(operationId, 128, "INVALID_GEM_HISTORY_OPERATION");
  const before = requireBalance(balanceBefore, "INVALID_GEM_HISTORY_BALANCE");
  const after = requireBalance(balanceAfter, "INVALID_GEM_HISTORY_BALANCE");
  const createdAt = requireTime(now);

  if (!Array.isArray(achievementIds) || achievementIds.length < 1 || achievementIds.length > 44) {
    throw new TypeError("INVALID_GEM_HISTORY_ACHIEVEMENTS");
  }
  const ids = achievementIds.map(id => requireText(id, 80, "INVALID_GEM_HISTORY_ACHIEVEMENT"));
  if (new Set(ids).size !== ids.length) throw new TypeError("DUPLICATE_GEM_HISTORY_ACHIEVEMENT");

  const claims = ids.map(achievementId => {
    const amount = achievementGemReward(achievementId);
    if (!Number.isSafeInteger(amount) || amount < 1) throw new TypeError("UNKNOWN_GEM_ACHIEVEMENT");
    return {
      uid: safeUid,
      achievementId,
      amount,
      source: "achievement",
      transactionId: safeUid + "_practice_" + safeOperationId,
      createdAt
    };
  });
  const amount = claims.reduce((sum, claim) => sum + claim.amount, 0);
  if (amount < 1 || amount > MAX_GEM_BALANCE || after - before !== amount) {
    throw new TypeError("GEM_HISTORY_BALANCE_MISMATCH");
  }

  const transactionId = safeUid + "_practice_" + safeOperationId;
  const transaction = {
    uid: safeUid,
    transactionId,
    operationId: safeOperationId,
    currency: "gems",
    kind: "achievement_reward",
    amount,
    direction: "credit",
    referenceId: safeOperationId,
    description: ids.length === 1 ? "First-time achievement reward" : ids.length + " first-time achievement rewards",
    balanceBefore: before,
    balanceAfter: after,
    achievementIds: ids,
    source: "achievement",
    createdAt
  };

  return { transaction, claims };
}

/**
 * Build read-only Gem history entries for verified event prize payouts.
 * The Worker writes these together with the balance changes and one-time
 * event prize receipts.
 */
export function buildEventGemPrizeHistory({ eventId, eventTitle, payouts, now = Date.now() }) {
  const safeEventId = requireText(eventId, 80, "INVALID_GEM_HISTORY_EVENT");
  const title = typeof eventTitle === "string" && eventTitle.trim()
    ? eventTitle.trim().slice(0, 80) : "Gem event";
  const createdAt = requireTime(now);

  if (!Array.isArray(payouts) || payouts.length > 3) {
    throw new TypeError("INVALID_GEM_HISTORY_PAYOUTS");
  }
  const seenUids = new Set();
  const seenRanks = new Set();
  let total = 0;

  const transactions = payouts.map(payout => {
    const uid = requireText(payout && payout.uid, 128, "INVALID_GEM_HISTORY_UID");
    const rank = payout && payout.rank;
    const amount = payout && payout.amount;
    const balanceAfter = requireBalance(payout && payout.balance, "INVALID_GEM_HISTORY_BALANCE");
    if (!Number.isSafeInteger(rank) || rank < 1 || rank > 3
        || seenRanks.has(rank) || seenUids.has(uid)
        || !Number.isSafeInteger(amount) || amount < 1
        || balanceAfter < amount) {
      throw new TypeError("INVALID_GEM_HISTORY_PAYOUT");
    }
    seenRanks.add(rank);
    seenUids.add(uid);
    total += amount;
    if (total > MAX_EVENT_PRIZE_POOL) throw new TypeError("GEM_HISTORY_PRIZE_POOL_LIMIT");

    const place = rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd";
    const transactionId = uid + "_event_" + safeEventId;
    return {
      uid,
      transactionId,
      eventId: safeEventId,
      rank,
      currency: "gems",
      kind: "event_reward",
      amount,
      direction: "credit",
      referenceId: safeEventId,
      description: title + " — " + place + " place prize",
      balanceBefore: balanceAfter - amount,
      balanceAfter,
      source: "event",
      createdAt
    };
  });

  return { transactions, totalGemsAwarded: total };
}
