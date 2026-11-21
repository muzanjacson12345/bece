import test from "node:test";
import assert from "node:assert/strict";
import { getPowerupUse, validatePowerupUseReceiptRetry } from "../src/powerup-utils.mjs";

test("Second Chance is the only currently supported power-up use", () => {
  assert.deepEqual(getPowerupUse("p50"), { id: "p50", field: "p50" });
});

test("power-up use rejects unknown or malformed identifiers", () => {
  assert.equal(getPowerupUse("sfreeze"), null);
  assert.equal(getPowerupUse("xpboost"), null);
  assert.equal(getPowerupUse("p50-custom"), null);
  assert.equal(getPowerupUse(null), null);
});

const receiptContext = () => ({
  stored: {
    uid: "alice",
    itemId: "p50",
    duelCode: "ROOM1",
    questionIndex: 2
  },
  uid: "alice",
  itemId: "p50",
  duelCode: "ROOM1",
  duel: { host: "alice", guest: "bob", state: "playing", settled: false },
  progress: { nextIndex: 2, secondChanceIndexes: [2], secondChancesUsed: 1 }
});

test("a Second Chance retry reuses a receipt only for the same active question", () => {
  assert.equal(validatePowerupUseReceiptRetry(receiptContext()), true);
});

test("a Second Chance receipt cannot be reused for another duel or account", () => {
  assert.throws(() => validatePowerupUseReceiptRetry({
    ...receiptContext(), duelCode: "ROOM2"
  }), /IDEMPOTENCY_KEY_REUSED/);
  assert.throws(() => validatePowerupUseReceiptRetry({
    ...receiptContext(), uid: "mallory"
  }), /IDEMPOTENCY_KEY_REUSED/);
  assert.throws(() => validatePowerupUseReceiptRetry({
    ...receiptContext(), itemId: "xpboost"
  }), /IDEMPOTENCY_KEY_REUSED/);
});

test("a Second Chance receipt cannot be replayed for a later question", () => {
  assert.throws(() => validatePowerupUseReceiptRetry({
    ...receiptContext(),
    progress: { nextIndex: 3, secondChanceIndexes: [2], secondChancesUsed: 1 }
  }), /IDEMPOTENCY_KEY_REUSED/);
});

test("a Second Chance receipt cannot be replayed after the duel ends or settles", () => {
  assert.throws(() => validatePowerupUseReceiptRetry({
    ...receiptContext(),
    duel: { ...receiptContext().duel, state: "finished", settled: true }
  }), /IDEMPOTENCY_KEY_REUSED/);
});

test("a Second Chance retry requires its server-owned use marker", () => {
  assert.throws(() => validatePowerupUseReceiptRetry({
    ...receiptContext(),
    progress: { nextIndex: 2, secondChanceIndexes: [], secondChancesUsed: 0 }
  }), /IDEMPOTENCY_KEY_REUSED/);
});
