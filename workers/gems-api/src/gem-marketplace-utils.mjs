// Server-authoritative Gem Marketplace catalog and purchase calculations.
// The browser may display this catalog, but only this module determines prices,
// item types, inventory effects and the amount deducted from a player's balance.

const GEM_ITEMS = Object.freeze({
  frame_sapphire: Object.freeze({
    id: "frame_sapphire", name: "Sapphire Frame", category: "cosmetic",
    slot: "frame", style: "sapphire", price: 40,
    description: "A cool blue frame for your profile avatar."
  }),
  frame_royal: Object.freeze({
    id: "frame_royal", name: "Royal Frame", category: "cosmetic",
    slot: "frame", style: "royal", price: 70,
    description: "A rich violet frame for your profile avatar."
  }),
  frame_aurora: Object.freeze({
    id: "frame_aurora", name: "Aurora Frame", category: "cosmetic",
    slot: "frame", style: "aurora", price: 100,
    description: "A bright multi-tone frame for your profile avatar."
  }),
});

const MAX_GEMS = 1_000_000_000;

function requireText(value, code, maxLength = 128) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength || value.includes("/")) {
    throw new TypeError(code);
  }
  return value.trim();
}

function requireBalance(value, code) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_GEMS) {
    throw new TypeError(code);
  }
  return value;
}

export function getGemMarketplaceItem(itemId) {
  if (typeof itemId !== "string") return null;
  return GEM_ITEMS[itemId] || null;
}

export function listGemMarketplaceItems() {
  return Object.values(GEM_ITEMS).map(item => ({ ...item }));
}

export function buildGemMarketplacePurchase({
  uid,
  operationId,
  itemId,
  balanceBefore,
  inventoryItem = null,
  quantityBefore = 0,
  now = Date.now()
}) {
  const safeUid = requireText(uid, "INVALID_GEM_SHOP_UID");
  const safeOperationId = requireText(operationId, "INVALID_GEM_SHOP_OPERATION", 128);
  const item = getGemMarketplaceItem(itemId);
  if (!item) throw new TypeError("INVALID_GEM_SHOP_ITEM");
  const before = requireBalance(balanceBefore, "INVALID_GEM_SHOP_BALANCE");
  if (!Number.isSafeInteger(now) || now < 0) throw new TypeError("INVALID_GEM_SHOP_TIME");
  if (before < item.price) throw new RangeError("INSUFFICIENT_GEMS");

  const after = before - item.price;
  let playerUpdates = { gems: after };
  let inventoryRecord = null;
  let result;

  if (item.category !== "cosmetic") throw new TypeError("INVALID_GEM_SHOP_ITEM");
  if (item.category === "cosmetic") {
    if (inventoryItem && inventoryItem.owned === true) throw new Error("GEM_ITEM_ALREADY_OWNED");
    inventoryRecord = {
      uid: safeUid,
      itemId: item.id,
      category: "cosmetic",
      slot: item.slot,
      style: item.style,
      owned: true,
      purchasedAt: now
    };
    result = {
      itemId: item.id,
      category: "cosmetic",
      price: item.price,
      gems: after,
      owned: true
    };
  }

  const transactionId = safeUid + "_gemshop_" + safeOperationId;
  const transaction = {
    uid: safeUid,
    transactionId,
    operationId: safeOperationId,
    currency: "gems",
    kind: "marketplace_purchase",
    amount: item.price,
    direction: "debit",
    referenceId: item.id,
    description: item.name,
    balanceBefore: before,
    balanceAfter: after,
    source: "gem_marketplace",
    createdAt: now
  };

  return {
    item: { ...item },
    playerUpdates,
    inventoryRecord,
    transaction,
    result
  };
}
