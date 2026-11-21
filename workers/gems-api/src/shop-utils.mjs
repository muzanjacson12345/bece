// Server-authoritative Coin shop catalog. Never accept a price from the browser.
const SHOP_ITEMS = Object.freeze({
  t_bookworm: Object.freeze({ id: "t_bookworm", type: "title", price: 80 }),
  t_scholar: Object.freeze({ id: "t_scholar", type: "title", price: 120 }),
  t_champion: Object.freeze({ id: "t_champion", type: "title", price: 160 }),
  t_legend: Object.freeze({ id: "t_legend", type: "title", price: 300 }),
  sfreeze: Object.freeze({ id: "sfreeze", type: "consumable", field: "sfreezes", price: 30 }),
  xpboost: Object.freeze({ id: "xpboost", type: "consumable", field: "xpBoost", price: 50 }),
  p50: Object.freeze({ id: "p50", type: "consumable", field: "p50", price: 15 })
});

export function getShopItem(itemId) {
  if (typeof itemId !== "string") return null;
  return SHOP_ITEMS[itemId] || null;
}

export function listShopItems() {
  return Object.values(SHOP_ITEMS).map(item => ({ ...item }));
}
