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

test("maximum event cost includes entries and the event-wide retry limit", () => {
  assert.equal(calculateMaxEventCost(event), 55);
});

test("usage counts retries once across the event, not once per entry", () => {
  assert.deepEqual(getEventUsage(event, { entriesUsed: 2, retriesUsed: 1 }), {
    entriesUsed: 2,
    retriesUsed: 1,
    entriesRemaining: 1,
    retriesRemaining: 1,
    maxPossibleCostCoins: 55,
  });
});

test("entry is blocked after the configured entry limit", () => {
  const result = canPurchaseEventEntry(event, { entriesUsed: 3 }, {
    coins: 100,
    now: "2026-11-19T12:00:00.000Z",
  });
  assert.equal(result.allowed, false);
  assert.match(result.reason, /entry limit/i);
});

test("retry is blocked after the event-wide retry limit", () => {
  const result = canPurchaseEventRetry(event, { entriesUsed: 1, retriesUsed: 2 }, {
    coins: 100,
    now: "2026-11-19T12:00:00.000Z",
  });
  assert.equal(result.allowed, false);
  assert.match(result.reason, /retry limit/i);
});

test("entry and retry require sufficient Coins", () => {
  assert.equal(canPurchaseEventEntry(event, {}, {
    coins: 14,
    now: "2026-11-19T12:00:00.000Z",
  }).allowed, false);
  assert.equal(canPurchaseEventRetry(event, { entriesUsed: 1 }, {
    coins: 4,
    now: "2026-11-19T12:00:00.000Z",
  }).allowed, false);
});

test("event configuration rejects free entries and unbounded retries", () => {
  const invalid = validateEventConfig({
    ...event,
    entryFeeCoins: 0,
    maxRetriesPerUser: 999,
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.length >= 2);
});

test("Gem Marketplace accepts direct permanent cosmetics", () => {
  const result = validateGemMarketplaceItem({
    name: "Purple Frame",
    description: "A permanent profile frame.",
    priceGems: 20,
    category: "cosmetic",
    purchaseType: "permanent",
    active: true,
    randomReward: false,
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.purchaseType, "permanent");
});

test("Gem Marketplace rejects learning advantages and random rewards", () => {
  const result = validateGemMarketplaceItem({
    name: "Extra Hint",
    description: "An academic advantage.",
    priceGems: 5,
    category: "learning",
    purchaseType: "consumable",
    active: true,
    randomReward: true,
  });
  assert.equal(result.ok, false);
});
