import test from "node:test";
import assert from "node:assert/strict";
import { getShopItem, listShopItems } from "../src/shop-utils.mjs";

test("server shop catalog contains the published fixed prices", () => {
  assert.deepEqual(
    Object.fromEntries(listShopItems().map(item => [item.id, item.price])),
    {
      t_bookworm: 80,
      t_scholar: 120,
      t_champion: 160,
      t_legend: 300,
      sfreeze: 30,
      xpboost: 50,
      p50: 15
    }
  );
});

test("shop catalog rejects unknown and malformed item IDs", () => {
  assert.equal(getShopItem("custom-price-item"), null);
  assert.equal(getShopItem("coins"), null);
  assert.equal(getShopItem(null), null);
  assert.equal(getShopItem({ id: "t_bookworm", price: 0 }), null);
});

test("browser-supplied price is not part of the shop item contract", () => {
  const item = getShopItem("t_bookworm");
  assert.equal(item.price, 80);
  assert.equal(item.price, 80);
  assert.equal(Object.hasOwn(item, "amount"), false);
});
