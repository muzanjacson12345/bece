import test from "node:test";
import assert from "node:assert/strict";
import { getThreshold, quotaMetric, handleRequest } from "../src/index.js";

const ORIGIN = "https://bece-hub.example";
const NOW = Date.parse("2026-11-18T12:00:00.000Z");
const envFor = (suffix = "test") => ({
  APP_ORIGIN: ORIGIN,
  FIREBASE_API_KEY: "public-firebase-web-key",
  FIREBASE_PROJECT_ID: "bece-hub-d9ad5",
  CF_ACCOUNT_ID: "account-" + suffix,
  CF_API_TOKEN: "cf-secret-token"
});
const makeRequest = (path = "/usage", token = "firebase-id-token", origin = ORIGIN, method = "GET") => {
  const headers = new Headers();
  if (origin) headers.set("Origin", origin);
  if (token) headers.set("Authorization", "Bearer " + token);
  return new Request("https://usage.example" + path, { method, headers });
};
const responseJson = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json" }
});

test("quota warning thresholds are applied at the agreed boundaries", () => {
  assert.equal(getThreshold(499, 1000).level, "normal");
  assert.equal(getThreshold(500, 1000).level, "notice");
  assert.equal(getThreshold(700, 1000).level, "medium");
  assert.equal(getThreshold(850, 1000).level, "high");
  assert.equal(getThreshold(950, 1000).level, "critical");
  assert.deepEqual(getThreshold(null, 1000), { percent: null, level: "unavailable" });
});

test("quota metrics calculate remaining without going below zero", () => {
  assert.deepEqual(quotaMetric(250, 1000), {
    used: 250, limit: 1000, remaining: 750, percent: 25, level: "normal"
  });
  assert.equal(quotaMetric(1100, 1000).remaining, 0);
  assert.equal(quotaMetric(null, 1000).remaining, null);
});

test("requests from an unapproved origin are rejected before any upstream call", async () => {
  let calls = 0;
  const response = await handleRequest(makeRequest("/usage", "token", "https://attacker.example"), envFor("origin"), {
    now: NOW, fetch: async () => { calls++; throw new Error("must not be called"); }
  });
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});

test("preflight requests return an empty 204 response with exact origin", async () => {
  const response = await handleRequest(makeRequest("/usage", null, ORIGIN, "OPTIONS"), envFor("preflight"), {
    now: NOW, fetch: async () => { throw new Error("must not be called"); }
  });
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert.equal(response.headers.get("Access-Control-Allow-Headers"), "Authorization, Content-Type");
});

test("unsupported methods and missing authentication are rejected", async () => {
  const methodResponse = await handleRequest(makeRequest("/usage", null, ORIGIN, "POST"), envFor("method"), {
    now: NOW, fetch: async () => { throw new Error("must not be called"); }
  });
  assert.equal(methodResponse.status, 405);

  const authResponse = await handleRequest(makeRequest("/usage", null), envFor("no-auth"), {
    now: NOW, fetch: async () => { throw new Error("must not be called"); }
  });
  assert.equal(authResponse.status, 401);
});

test("an invalid Firebase user never reaches the Owner-session or Cloudflare checks", async () => {
  const calls = [];
  const response = await handleRequest(makeRequest(), envFor("invalid-user"), {
    now: NOW,
    fetch: async (url, options) => {
      calls.push(String(url));
      return responseJson({ users: [] });
    }
  });
  assert.equal(response.status, 401);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /identitytoolkit.googleapis.com/);
});

test("a caller without a readable live Owner session is denied before Cloudflare is queried", async () => {
  const urls = [];
  const response = await handleRequest(makeRequest(), envFor("not-owner"), {
    now: NOW,
    fetch: async (url) => {
      urls.push(String(url));
      if (String(url).includes("identitytoolkit.googleapis.com")) {
        return responseJson({ users: [{ localId: "ordinary-user" }] });
      }
      return responseJson({ error: { status: "NOT_FOUND" } }, 404);
    }
  });
  assert.equal(response.status, 403);
  assert.equal(urls.length, 2);
  assert.ok(urls[1].endsWith("/ownerSessions/ordinary-user"));
  assert.ok(!urls.some(url => url.includes("api.cloudflare.com")));
});

test("a recently opened session is denied when current Firestore Owner rules reject it", async () => {
  const urls = [];
  const response = await handleRequest(makeRequest(), envFor("changed-owner-passwords"), {
    now: NOW,
    fetch: async (url) => {
      const target = String(url);
      urls.push(target);
      if (target.includes("identitytoolkit.googleapis.com")) {
        return responseJson({ users: [{ localId: "owner-password-changed" }] });
      }
      if (target.includes("/ownerSessions/")) {
        return responseJson({
          fields: {
            pw1: { stringValue: "old-secret-one" },
            pw2: { stringValue: "old-secret-two" },
            at: { timestampValue: new Date(NOW - 2 * 60 * 1000).toISOString() }
          }
        });
      }
      if (target.includes("/auditLogs")) {
        return responseJson({ error: { status: "PERMISSION_DENIED" } }, 403);
      }
      throw new Error("Cloudflare must not be queried for an invalid Owner session.");
    }
  });
  assert.equal(response.status, 403);
  assert.ok(urls.some(url => url.includes("/auditLogs?pageSize=1")));
  assert.ok(!urls.some(url => url.includes("api.cloudflare.com")));
});

test("a stale Owner session is denied", async () => {
  const urls = [];
  const response = await handleRequest(makeRequest(), envFor("stale-owner"), {
    now: NOW,
    fetch: async (url) => {
      urls.push(String(url));
      if (String(url).includes("identitytoolkit.googleapis.com")) {
        return responseJson({ users: [{ localId: "owner-user" }] });
      }
      return responseJson({
        fields: {
          pw1: { stringValue: "secret-one" },
          pw2: { stringValue: "secret-two" },
          at: { timestampValue: new Date(NOW - 31 * 60 * 1000).toISOString() }
        }
      });
    }
  });
  assert.equal(response.status, 403);
  assert.ok(!urls.some(url => url.includes("api.cloudflare.com")));
});

test("a verified Owner receives quota values while secrets stay out of the response", async () => {
  const account = envFor("successful-owner");
  const calls = [];
  const response = await handleRequest(makeRequest(), account, {
    now: NOW,
    fetch: async (url, options = {}) => {
      const target = String(url);
      calls.push({ target, options });
      if (target.includes("identitytoolkit.googleapis.com")) {
        const body = JSON.parse(options.body);
        assert.equal(body.idToken, "firebase-id-token");
        return responseJson({ users: [{ localId: "verified-owner" }] });
      }
      if (target.includes("firestore.googleapis.com")) {
        assert.equal(options.headers.Authorization, "Bearer firebase-id-token");
        if (target.includes("/auditLogs?pageSize=1")) {
          return responseJson({ documents: [] });
        }
        assert.ok(target.endsWith("/ownerSessions/verified-owner"));
        return responseJson({
          fields: {
            pw1: { stringValue: "never-return-this-secret" },
            pw2: { stringValue: "also-private" },
            at: { timestampValue: new Date(NOW - 5 * 60 * 1000).toISOString() }
          }
        });
      }
      if (target.includes("api.cloudflare.com")) {
        assert.equal(options.headers.Authorization, "Bearer cf-secret-token");
        const body = JSON.parse(options.body);
        if (body.query.includes("WorkerUsage")) {
          return responseJson({ data: { viewer: { accounts: [{
            workersInvocationsAdaptive: [{
              sum: { requests: 50000, subrequests: 12 },
              dimensions: { datetime: "2026-11-18T11:58:00Z", scriptName: "usage-worker", status: "success" }
            }]
          }] } } });
        }
        if (body.query.includes("D1RowUsage")) {
          return responseJson({ data: { viewer: { accounts: [{
            d1AnalyticsAdaptiveGroups: [{
              sum: { rowsRead: 2500000, rowsWritten: 50000 },
              dimensions: { date: "2026-11-18", databaseId: "db-1" }
            }]
          }] } } });
        }
        if (body.query.includes("D1StorageUsage")) {
          return responseJson({ data: { viewer: { accounts: [{
            d1StorageAdaptiveGroups: [
              {
                max: { databaseSizeBytes: 1024 * 1024 * 12 },
                dimensions: { datetime: "2026-11-18T08:00:00Z", databaseId: "db-1" }
              },
              {
                max: { databaseSizeBytes: 1024 * 1024 * 10 },
                dimensions: { datetime: "2026-11-18T11:55:00Z", databaseId: "db-1" }
              }
            ]
          }] } } });
        }
      }
      throw new Error("Unexpected upstream URL: " + target);
    }
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.worker.used, 50000);
  assert.equal(body.worker.remaining, 50000);
  assert.equal(body.worker.level, "notice");
  assert.equal(body.worker.subrequests, 12);
  assert.equal(body.d1.rowsRead.used, 2500000);
  assert.equal(body.d1.rowsRead.remaining, 2500000);
  assert.equal(body.d1.rowsWritten.used, 50000);
  assert.equal(body.d1.rowsWritten.remaining, 50000);
  assert.equal(body.d1.storage.complete, true);
  assert.equal(body.d1.storage.used, 10 * 1024 * 1024);
  assert.equal(body.d1.storage.asOf, "2026-11-18T11:55:00.000Z");
  const serialized = JSON.stringify(body);
  assert.ok(!serialized.includes("never-return-this-secret"));
  assert.ok(!serialized.includes("also-private"));
  assert.ok(!serialized.includes("cf-secret-token"));
  assert.ok(calls.some(call => call.target.includes("/ownerSessions/verified-owner")));
  assert.ok(calls.some(call => call.target.includes("/auditLogs?pageSize=1")));
  assert.equal(body.timezone, "UTC");
});

test("D1 analytics failure does not hide valid Worker request metrics", async () => {
  const account = envFor("no-d1");
  const response = await handleRequest(makeRequest(), account, {
    now: NOW,
    fetch: async (url, options = {}) => {
      const target = String(url);
      if (target.includes("identitytoolkit.googleapis.com")) {
        return responseJson({ users: [{ localId: "owner-no-d1" }] });
      }
      if (target.includes("firestore.googleapis.com")) {
        return responseJson({
          fields: {
            pw1: { stringValue: "secret-one" },
            pw2: { stringValue: "secret-two" },
            at: { timestampValue: new Date(NOW - 1000).toISOString() }
          }
        });
      }
      const query = JSON.parse(options.body).query;
      if (query.includes("WorkerUsage")) {
        return responseJson({ data: { viewer: { accounts: [{
          workersInvocationsAdaptive: [{
            sum: { requests: 400, subrequests: 2 },
            dimensions: { datetime: "2026-11-18T11:59:00Z" }
          }]
        }] } } });
      }
      return responseJson({ errors: [{ message: "D1 is not configured on this account" }] }, 200);
    }
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.worker.used, 400);
  assert.equal(body.worker.remaining, 99600);
  assert.equal(body.d1.rowsRead.used, null);
  assert.equal(body.d1.rowsRead.remaining, null);
  assert.equal(body.d1.storage.used, null);
});

test("Cloudflare credentials are never sent to Firebase and Firebase tokens never go to Cloudflare", async () => {
  const env = envFor("separation");
  const authCalls = [];
  const response = await handleRequest(makeRequest(), env, {
    now: NOW,
    fetch: async (url, options = {}) => {
      const target = String(url);
      if (target.includes("identitytoolkit.googleapis.com")) {
        authCalls.push(options);
        return responseJson({ users: [{ localId: "owner-separation" }] });
      }
      if (target.includes("firestore.googleapis.com")) {
        authCalls.push(options);
        return responseJson({
          fields: {
            pw1: { stringValue: "x" },
            pw2: { stringValue: "y" },
            at: { timestampValue: new Date(NOW - 1000).toISOString() }
          }
        });
      }
      if (target.includes("api.cloudflare.com")) {
        assert.equal(options.headers.Authorization, "Bearer cf-secret-token");
        assert.ok(!options.headers.Authorization.includes("firebase-id-token"));
        assert.ok(!options.body.includes("firebase-id-token"));
        return responseJson({ data: { viewer: { accounts: [{
          workersInvocationsAdaptive: [{
            sum: { requests: 1, subrequests: 1 },
            dimensions: { datetime: "2026-11-18T11:59:00Z" }
          }]
        }] } } });
      }
      throw new Error("Unexpected upstream URL");
    }
  });
  assert.equal(response.status, 200);
  assert.ok(authCalls.some(call => JSON.stringify(call).includes("firebase-id-token")));
});
