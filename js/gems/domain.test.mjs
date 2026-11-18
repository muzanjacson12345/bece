import test from "node:test";
import assert from "node:assert/strict";
import {
  EVENT_STATUS,
  calculateMaxEventCost,
  getEventUsage,
  canPurchaseEventEntry,
  canPurchaseEventRetry,
  validateEventConfig,
  validateGemMarketplaceItem,
} from "./domain.js";

const event = {
  name: "Science Championship",
  description: "A special Science competition.",
  entryFeeCoins: 15,
  maxEntriesPerUser: 3,
  retriesEnabled: true,
  retryFeeCoins: 5,
  maxRetriesPerUser: 2,
  startAt: "2026-11-18T00:00:00.000Z",
  endAt: "2026-11-25T00:00:00.000Z",
  status: EVENT_STATUS.ACTIVE,
  maxParticipants: 250,
  gemRewards: { participation: 2, completion: 3, firstPlace: 10, secondPlace: 7, thirdPlace: 5 },
};

test("maximum event cost includes event-wide entries and retries", () => {
  assert.equal(calculateMaxEventCost(event), 55);
});
test("retry allowance is shared across all entries", () => {
  assert.deepEqual(getEventUsage(event, { entriesUsed: 2, retriesUsed: 1 }), {
    entriesUsed: 2, retriesUsed: 1, entriesRemaining: 1,
    retriesRemaining: 1, maxPossibleCostCoins: 55,
  });
});
test("entry limit blocks additional entries", () => {
  assert.equal(canPurchaseEventEntry(event, { entriesUsed: 3 }, {
    coins: 100, now: "2026-11-19T12:00:00.000Z",
  }).allowed, false);
});
test("retry limit blocks additional retries", () => {
  assert.equal(canPurchaseEventRetry(event, { entriesUsed: 1, retriesUsed: 2 }, {
    coins: 100, now: "2026-11-19T12:00:00.000Z",
  }).allowed, false);
});
test("insufficient Coins block entries and retries", () => {
  assert.equal(canPurchaseEventEntry(event, {}, {
    coins: 14, now: "2026-11-19T12:00:00.000Z",
  }).allowed, false);
  assert.equal(canPurchaseEventRetry(event, { entriesUsed: 1 }, {
    coins: 4, now: "2026-11-19T12:00:00.000Z",
  }).allowed, false);
});
test("invalid event configuration rejects zero fees and excessive retry limits", () => {
  const result = validateEventConfig({ ...event, entryFeeCoins: 0, maxRetriesPerUser: 999 });
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 2);
});
test("direct permanent cosmetic purchase is valid", () => {
  const result = validateGemMarketplaceItem({
    name: "Purple Frame", description: "A permanent profile frame.",
    priceGems: 20, category: "cosmetic", purchaseType: "permanent",
    active: true, randomReward: false,
  });
  assert.equal(result.ok, true);
});
test("academic advantages and random reward purchases are rejected", () => {
  const result = validateGemMarketplaceItem({
    name: "Extra Hint", description: "An academic advantage.",
    priceGems: 5, category: "learning", purchaseType: "consumable",
    active: true, randomReward: true,
  });
  assert.equal(result.ok, false);
});
