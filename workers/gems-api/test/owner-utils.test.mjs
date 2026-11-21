import test from "node:test";
import assert from "node:assert/strict";
import { hasValidOwnerSession } from "../src/owner-utils.mjs";

const NOW = 1_800_000_000_000;
const iso = ms => new Date(ms).toISOString();

function ownerDocs({ role = "owner", at = NOW - 60_000, sessionPw1 = "secret-one",
  sessionPw2 = "secret-two", configPw1 = "secret-one", configPw2 = "secret-two" } = {}) {
  return [
    { fields: { role: { stringValue: role } } },
    { fields: {
      at: { timestampValue: iso(at) },
      pw1: { stringValue: sessionPw1 },
      pw2: { stringValue: sessionPw2 }
    } },
    { fields: {
      pw1: { stringValue: configPw1 },
      pw2: { stringValue: configPw2 }
    } }
  ];
}

test("valid Owner roster and current matching session is accepted", () => {
  assert.equal(hasValidOwnerSession(...ownerDocs(), NOW), true);
});

test("non-Owner staff roster is rejected", () => {
  assert.equal(hasValidOwnerSession(...ownerDocs({ role: "admin" }), NOW), false);
});

test("missing Owner documents are rejected", () => {
  assert.equal(hasValidOwnerSession(null, ownerDocs()[1], ownerDocs()[2], NOW), false);
});

test("session expires after thirty minutes", () => {
  assert.equal(hasValidOwnerSession(...ownerDocs({ at: NOW - 30 * 60 * 1000 }), NOW), false);
});

test("future-dated session beyond allowed clock skew is rejected", () => {
  assert.equal(hasValidOwnerSession(...ownerDocs({ at: NOW + 60_001 }), NOW), false);
});

test("wrong or changed Owner passwords invalidate the session", () => {
  assert.equal(hasValidOwnerSession(...ownerDocs({ sessionPw2: "old-secret" }), NOW), false);
  assert.equal(hasValidOwnerSession(...ownerDocs({ configPw1: "changed-secret" }), NOW), false);
});

test("malformed session timestamp is rejected", () => {
  const [roster, session, config] = ownerDocs();
  session.fields.at.timestampValue = "not-a-timestamp";
  assert.equal(hasValidOwnerSession(roster, session, config, NOW), false);
});
