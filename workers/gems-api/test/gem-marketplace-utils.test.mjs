import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGemMarketplacePurchase,
  getGemMarketplaceItem,
  listGemMarketplaceItems
} from "../src/gem-marketplace-utils.mjs";

test("catalog contains only permanent cosmetic Gem items with server prices", () => {
  const items = listGemMarketplaceItems();
  assert.equal(items.length, 3);
  assert.equal(items.filter(item => item.category === "cosmetic").length, 3);
  assert.equal(items.every(item => item.category === "cosmetic"), true);
  assert.equal(getGemMarketplaceItem("frame_sapphire").price, 40);
  assert.equal(getGemMarketplaceItem("streak_freeze"), null);
  assert.equal(getGemMarketplaceItem("client_invented_item"), null);
});

test("cosmetic purchase deducts Gems and creates a permanent inventory record", () => {
  const purchase = buildGemMarketplacePurchase({
    uid: "student-1",
    operationId: "operation-1",
    itemId: "frame_sapphire",
    balanceBefore: 100,
    now: 1000
  });
  assert.deepEqual(purchase.playerUpdates, { gems: 60 });
  assert.equal(purchase.inventoryRecord.owned, true);
  assert.equal(purchase.inventoryRecord.slot, "frame");
  assert.equal(purchase.inventoryRecord.style, "sapphire");
  assert.equal(purchase.transaction.amount, 40);
  assert.equal(purchase.transaction.direction, "debit");
  assert.equal(purchase.transaction.balanceBefore, 100);
  assert.equal(purchase.transaction.balanceAfter, 60);
  assert.equal(purchase.result.gems, 60);
});

test("marketplace purchase rejects insufficient Gems and repeat cosmetic ownership", () => {
  assert.throws(() => buildGemMarketplacePurchase({
    uid: "student-1", operationId: "operation-3",
    itemId: "frame_royal", balanceBefore: 69, now: 1000
  }), /INSUFFICIENT_GEMS/);

  assert.throws(() => buildGemMarketplacePurchase({
    uid: "student-1", operationId: "operation-4",
    itemId: "frame_royal", balanceBefore: 100,
    inventoryItem: { owned: true }, now: 1000
  }), /GEM_ITEM_ALREADY_OWNED/);
});

test("marketplace purchase rejects invalid balances, quantities and item IDs", () => {
  const base = {
    uid: "student-1", operationId: "operation-5",
    itemId: "frame_sapphire", balanceBefore: 100, now: 1000
  };
  assert.throws(() => buildGemMarketplacePurchase({ ...base, balanceBefore: -1 }), /INVALID_GEM_SHOP_BALANCE/);
  assert.throws(() => buildGemMarketplacePurchase({ ...base, itemId: "fake_item" }), /INVALID_GEM_SHOP_ITEM/);
  assert.throws(() => buildGemMarketplacePurchase({ ...base, itemId: "xp_boost" }), /INVALID_GEM_SHOP_ITEM/);
});
