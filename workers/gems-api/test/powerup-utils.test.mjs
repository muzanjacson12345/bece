import test from "node:test";
import assert from "node:assert/strict";
import { getPowerupUse } from "../src/powerup-utils.mjs";

test("Second Chance is the only currently supported power-up use", () => {
  assert.deepEqual(getPowerupUse("p50"), { id: "p50", field: "p50" });
});

test("power-up use rejects unknown or malformed identifiers", () => {
  assert.equal(getPowerupUse("sfreeze"), null);
  assert.equal(getPowerupUse("xpboost"), null);
  assert.equal(getPowerupUse("p50-custom"), null);
  assert.equal(getPowerupUse(null), null);
});
