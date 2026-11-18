/**
 * Currency data helpers.
 *
 * These helpers validate/display wallet data only. They do not authorise or
 * perform balance changes. All balance mutations must go through trusted
 * server-side transactions before this module is connected to the app.
 */

export const CURRENCY = Object.freeze({
  COINS: "coins",
  GEMS: "gems",
});

export const TRANSACTION_KIND = Object.freeze({
  EVENT_ENTRY: "event_entry",
  EVENT_RETRY: "event_retry",
  EVENT_REWARD: "event_reward",
  ACHIEVEMENT_REWARD: "achievement_reward",
  DAILY_REWARD: "daily_reward",
  COMMUNITY_REWARD: "community_reward",
  MARKETPLACE_PURCHASE: "marketplace_purchase",
  OWNER_ADJUSTMENT: "owner_adjustment",
});

export function normalizeWallet(data = {}) {
  const coins = Number.isSafeInteger(data.coins) && data.coins >= 0 ? data.coins : 0;
  const gems = Number.isSafeInteger(data.gems) && data.gems >= 0 ? data.gems : 0;

  return Object.freeze({
    coins,
    gems,
    updatedAt: data.updatedAt ?? null,
  });
}

export function validateTransactionRecord(input) {
  const item = input && typeof input === "object" ? input : {};
  const errors = [];
  const currencies = Object.values(CURRENCY);
  const kinds = Object.values(TRANSACTION_KIND);

  if (!currencies.includes(item.currency)) errors.push("Transaction currency is invalid.");
  if (!kinds.includes(item.kind)) errors.push("Transaction type is invalid.");
  if (!Number.isSafeInteger(item.amount) || item.amount <= 0) errors.push("Transaction amount must be a positive whole number.");
  if (!["credit", "debit"].includes(item.direction)) errors.push("Transaction direction is invalid.");
  if (typeof item.referenceId !== "string" || item.referenceId.length < 1 || item.referenceId.length > 128) {
    errors.push("A valid transaction reference is required.");
  }
  if (typeof item.description !== "string" || item.description.length > 160) {
    errors.push("Transaction description must be 160 characters or fewer.");
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    errors: [],
    value: {
      currency: item.currency,
      kind: item.kind,
      amount: item.amount,
      direction: item.direction,
      referenceId: item.referenceId,
      description: item.description.trim(),
    },
  };
}

export function formatCurrencyAmount(amount, currency) {
  const safeAmount = Number.isSafeInteger(amount) && amount >= 0 ? amount : 0;
  if (currency === CURRENCY.COINS) return `${safeAmount.toLocaleString()} Coins`;
  if (currency === CURRENCY.GEMS) return `${safeAmount.toLocaleString()} Gems`;
  throw new TypeError("Unknown currency.");
}
