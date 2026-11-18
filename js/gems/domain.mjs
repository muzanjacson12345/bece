/**
 * Gems and special-event domain rules.
 * This module is independent from the app UI and Firebase SDK.
 */

export const EVENT_STATUS = Object.freeze({
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

const MAX_ENTRIES = 10;
const MAX_RETRIES = 10;

function isWholeNumber(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function readTime(value) {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.toMillis === "function") return value.toMillis();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

function addError(errors, condition, message) {
  if (!condition) errors.push(message);
}

/** Validate an Owner/Admin event configuration. */
export function validateEventConfig(input) {
  const source = input && typeof input === "object" ? input : {};
  const errors = [];

  addError(errors, typeof source.name === "string" && source.name.trim().length >= 3 && source.name.trim().length <= 70,
    "Event name must contain 3–70 characters.");
  addError(errors, typeof source.description === "string" && source.description.trim().length <= 600,
    "Event description must be 600 characters or fewer.");
  addError(errors, isWholeNumber(source.entryFeeCoins) && source.entryFeeCoins > 0,
    "Entry fee must be a positive whole number of Coins.");
  addError(errors, isWholeNumber(source.maxEntriesPerUser) && source.maxEntriesPerUser >= 1 && source.maxEntriesPerUser <= MAX_ENTRIES,
    `Maximum entries must be between 1 and ${MAX_ENTRIES}.`);
  addError(errors, typeof source.retriesEnabled === "boolean",
    "Retry availability must be explicitly enabled or disabled.");

  if (source.retriesEnabled === true) {
    addError(errors, isWholeNumber(source.retryFeeCoins) && source.retryFeeCoins > 0,
      "Retry fee must be a positive whole number of Coins.");
    addError(errors, isWholeNumber(source.maxRetriesPerUser) && source.maxRetriesPerUser >= 1 && source.maxRetriesPerUser <= MAX_RETRIES,
      `Maximum retries must be between 1 and ${MAX_RETRIES}.`);
  }

  const startAt = readTime(source.startAt);
  const endAt = readTime(source.endAt);
  addError(errors, Number.isFinite(startAt), "A valid event start time is required.");
  addError(errors, Number.isFinite(endAt) && endAt > startAt, "Event end time must be after its start time.");

  const allowedStatuses = Object.values(EVENT_STATUS);
  addError(errors, allowedStatuses.includes(source.status), "Event status is invalid.");

  const rewards = source.gemRewards && typeof source.gemRewards === "object" ? source.gemRewards : {};
  for (const field of ["participation", "completion", "firstPlace", "secondPlace", "thirdPlace"]) {
    addError(errors, isWholeNumber(rewards[field] ?? 0), `Gem reward "${field}" must be a non-negative whole number.`);
  }

  const maxParticipants = source.maxParticipants;
  addError(errors, maxParticipants == null || (isWholeNumber(maxParticipants) && maxParticipants >= 1 && maxParticipants <= 100000),
    "Maximum participants must be blank or between 1 and 100,000.");

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    value: {
      name: source.name.trim(),
      description: source.description.trim(),
      entryFeeCoins: source.entryFeeCoins,
      maxEntriesPerUser: source.maxEntriesPerUser,
      retriesEnabled: source.retriesEnabled,
      retryFeeCoins: source.retriesEnabled ? source.retryFeeCoins : 0,
      maxRetriesPerUser: source.retriesEnabled ? source.maxRetriesPerUser : 0,
      startAt: source.startAt,
      endAt: source.endAt,
      status: source.status,
      maxParticipants: maxParticipants ?? null,
      gemRewards: {
        participation: rewards.participation ?? 0,
        completion: rewards.completion ?? 0,
        firstPlace: rewards.firstPlace ?? 0,
        secondPlace: rewards.secondPlace ?? 0,
        thirdPlace: rewards.thirdPlace ?? 0,
      },
    },
  };
}

/** Calculate maximum Coins one user could spend on this event. */
export function calculateMaxEventCost(event) {
  if (!event || !isWholeNumber(event.entryFeeCoins) || !isWholeNumber(event.maxEntriesPerUser)) {
    throw new TypeError("A valid event entry fee and entry limit are required.");
  }
  const retryFee = event.retriesEnabled === true ? event.retryFeeCoins : 0;
  const maxRetries = event.retriesEnabled === true ? event.maxRetriesPerUser : 0;
  if (!isWholeNumber(retryFee) || !isWholeNumber(maxRetries)) {
    throw new TypeError("Retry fee and retry limit must be non-negative whole numbers.");
  }
  return (event.entryFeeCoins * event.maxEntriesPerUser) + (retryFee * maxRetries);
}

/** Calculate remaining entries and event-wide retries. */
export function getEventUsage(event, participant = {}) {
  const entriesUsed = isWholeNumber(participant.entriesUsed) ? participant.entriesUsed : 0;
  const retriesUsed = isWholeNumber(participant.retriesUsed) ? participant.retriesUsed : 0;
  const maxEntries = event?.maxEntriesPerUser ?? 0;
  const retriesEnabled = event?.retriesEnabled === true;
  const maxRetries = retriesEnabled ? (event?.maxRetriesPerUser ?? 0) : 0;

  return {
    entriesUsed,
    retriesUsed,
    entriesRemaining: Math.max(0, maxEntries - entriesUsed),
    retriesRemaining: Math.max(0, maxRetries - retriesUsed),
    maxPossibleCostCoins: calculateMaxEventCost(event),
  };
}

/** Return a reasoned decision for whether a paid event entry can be purchased. */
export function canPurchaseEventEntry(event, participant = {}, options = {}) {
  const now = readTime(options.now ?? Date.now());
  const startAt = readTime(event?.startAt);
  const endAt = readTime(event?.endAt);
  const coins = options.coins ?? 0;
  const participantsCount = options.participantsCount ?? 0;
  const usage = getEventUsage(event, participant);

  if (event?.status !== EVENT_STATUS.ACTIVE) return { allowed: false, reason: "This event is not open.", usage };
  if (!Number.isFinite(now) || now < startAt || now >= endAt) return { allowed: false, reason: "This event is outside its entry period.", usage };
  if (usage.entriesRemaining <= 0) return { allowed: false, reason: "You have reached this event's entry limit.", usage };
  if (!isWholeNumber(coins) || coins < event.entryFeeCoins) return { allowed: false, reason: "You do not have enough Coins for this entry.", usage };
  if (event.maxParticipants != null && participantsCount >= event.maxParticipants) {
    return { allowed: false, reason: "This event has reached its participant limit.", usage };
  }
  return { allowed: true, feeCoins: event.entryFeeCoins, usage };
}

/** Return a reasoned decision for whether a paid retry can be purchased. */
export function canPurchaseEventRetry(event, participant = {}, options = {}) {
  const now = readTime(options.now ?? Date.now());
  const startAt = readTime(event?.startAt);
  const endAt = readTime(event?.endAt);
  const coins = options.coins ?? 0;
  const usage = getEventUsage(event, participant);

  if (event?.status !== EVENT_STATUS.ACTIVE) return { allowed: false, reason: "This event is not open.", usage };
  if (!Number.isFinite(now) || now < startAt || now >= endAt) return { allowed: false, reason: "This event is outside its retry period.", usage };
  if (event?.retriesEnabled !== true) return { allowed: false, reason: "Retries are disabled for this event.", usage };
  if (usage.entriesUsed <= 0) return { allowed: false, reason: "Enter the event before purchasing a retry.", usage };
  if (usage.retriesRemaining <= 0) return { allowed: false, reason: "You have reached this event's retry limit.", usage };
  if (!isWholeNumber(coins) || coins < event.retryFeeCoins) return { allowed: false, reason: "You do not have enough Coins for this retry.", usage };
  return { allowed: true, feeCoins: event.retryFeeCoins, usage };
}

/** Check an item before it is added to the Gem Marketplace. */
export function validateGemMarketplaceItem(input) {
  const item = input && typeof input === "object" ? input : {};
  const errors = [];
  addError(errors, typeof item.name === "string" && item.name.trim().length >= 2 && item.name.trim().length <= 60,
    "Item name must contain 2–60 characters.");
  addError(errors, typeof item.description === "string" && item.description.trim().length <= 300,
    "Item description must be 300 characters or fewer.");
  addError(errors, isWholeNumber(item.priceGems) && item.priceGems > 0,
    "Gem price must be a positive whole number.");
  addError(errors, item.category === "cosmetic", "Gems can only purchase cosmetic items.");
  addError(errors, ["permanent", "consumable"].includes(item.purchaseType),
    "Purchase type must be permanent or consumable.");
  addError(errors, typeof item.active === "boolean", "Item must have an explicit active setting.");
  addError(errors, item.randomReward !== true, "Random-reward purchases are not supported.");

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    errors: [],
    value: {
      name: item.name.trim(),
      description: item.description.trim(),
      priceGems: item.priceGems,
      category: "cosmetic",
      purchaseType: item.purchaseType,
      active: item.active,
      randomReward: false,
    },
  };
}
