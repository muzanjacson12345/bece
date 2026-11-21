import test from "node:test";
import assert from "node:assert/strict";
import { isFirestoreBanActive } from "../src/ban-utils.mjs";

const NOW = 1_800_000_000_000;

test("missing ban document does not ban a user", () => {
  assert.equal(isFirestoreBanActive(null, NOW), false);
});

test("legacy record without until remains permanently banned", () => {
  assert.equal(isFirestoreBanActive({ fields: { reason: { stringValue: "legacy" } } }, NOW), true);
});

test("null and zero until values mean permanent ban", () => {
  assert.equal(isFirestoreBanActive({ fields: { until: { nullValue: null } } }, NOW), true);
  assert.equal(isFirestoreBanActive({ fields: { until: { integerValue: "0" } } }, NOW), true);
});

test("future Unix-millisecond timestamp means temporary active ban", () => {
  assert.equal(isFirestoreBanActive({ fields: { until: { integerValue: String(NOW + 60_000) } } }, NOW), true);
});

test("expired temporary ban is no longer active", () => {
  assert.equal(isFirestoreBanActive({ fields: { until: { integerValue: String(NOW - 1) } } }, NOW), false);
});

test("ban expires exactly at its until timestamp", () => {
  assert.equal(isFirestoreBanActive({ fields: { until: { integerValue: String(NOW) } } }, NOW), false);
});

test("malformed ban expiry fails closed", () => {
  assert.equal(isFirestoreBanActive({ fields: { until: { stringValue: "tomorrow" } } }, NOW), true);
  assert.equal(isFirestoreBanActive({ fields: { until: { integerValue: "-1" } } }, NOW), true);
  assert.equal(isFirestoreBanActive({ fields: { until: { integerValue: "not-a-number" } } }, NOW), true);
});
