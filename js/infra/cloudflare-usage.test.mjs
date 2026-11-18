import test from "node:test";
import assert from "node:assert/strict";
import {
  CLOUDFLARE_FREE_LIMITS,
  calculateQuotaUsage,
  getDataFreshness,
  getNextUtcReset,
  getUtcDayWindow,
  parseCloudflareUsage,
  parseD1RowUsage,
  parseD1StorageUsage,
  parseWorkersUsage,
} from "./cloudflare-usage.mjs";

const workersResponse = {
  data: { viewer: { accounts: [{
    workersInvocationsAdaptive: [
      { sum: { requests: 40, subrequests: 3 } },
      { sum: { requests: "60", subrequests: "7" } },
    ],
  }] } },
};

const d1RowsResponse = {
  data: { viewer: { accounts: [{
    d1AnalyticsAdaptiveGroups: [
      { sum: { rowsRead: 120, rowsWritten: 4, readQueries: 8, writeQueries: 2 } },
      { sum: { rowsRead: 80, rowsWritten: 6, readQueries: 5, writeQueries: 1 } },
    ],
  }] } },
};

test("Worker usage sums requests and subrequests across returned groups", () => {
  assert.deepEqual(parseWorkersUsage(workersResponse), {
    requests: 100,
    subrequests: 10,
  });
});

test("D1 quota parser sums rows read/written, not query counts", () => {
  assert.deepEqual(parseD1RowUsage(d1RowsResponse), {
    rowsRead: 200,
    rowsWritten: 10,
  });
});

test("D1 storage uses latest sample per database, not every historical sample", () => {
  const response = {
    data: { viewer: { accounts: [{
      d1StorageAdaptiveGroups: [
        { dimensions: { databaseId: "db-a", datetime: "2026-11-18T00:00:00Z" }, max: { databaseSizeBytes: 100 } },
        { dimensions: { databaseId: "db-a", datetime: "2026-11-18T12:00:00Z" }, max: { databaseSizeBytes: 150 } },
        { dimensions: { databaseId: "db-b", datetime: "2026-11-18T11:00:00Z" }, max: { databaseSizeBytes: 50 } },
      ],
    }] } },
  };
  assert.deepEqual(parseD1StorageUsage(response), {
    bytes: 200,
    asOf: "2026-11-18T11:00:00.000Z",
  });
});

test("missing datasets stay unavailable instead of becoming zero", () => {
  assert.deepEqual(parseWorkersUsage({ data: { viewer: { accounts: [{}] } } }), {
    requests: null, subrequests: null,
  });
  assert.deepEqual(parseD1RowUsage({ data: { viewer: { accounts: [{}] } } }), {
    rowsRead: null, rowsWritten: null,
  });
});

test("GraphQL errors and partial metric groups are not reported as zero", () => {
  assert.deepEqual(parseWorkersUsage({ ...workersResponse, errors: [{ message: "denied" }] }), {
    requests: null, subrequests: null,
  });
  const partial = { data: { viewer: { accounts: [{
    d1AnalyticsAdaptiveGroups: [{ sum: { rowsRead: 5, rowsWritten: null } }],
  }] } } };
  assert.deepEqual(parseD1RowUsage(partial), { rowsRead: null, rowsWritten: null });
});

test("unexpected multiple account payloads are rejected to prevent accidental aggregation", () => {
  const response = { data: { viewer: { accounts: [{ workersInvocationsAdaptive: [] }, { workersInvocationsAdaptive: [] }] } } };
  assert.deepEqual(parseWorkersUsage(response), { requests: null, subrequests: null });
});

test("quota meters calculate remaining use and warning thresholds", () => {
  assert.deepEqual(calculateQuotaUsage(70, 100), {
    status: "available",
    used: 70,
    limit: 100,
    remaining: 30,
    percent: 70,
    warningThresholdPercent: 70,
  });
  assert.equal(calculateQuotaUsage(95, 100).warningThresholdPercent, 95);
});

test("a quota over its limit is reported as exceeded without negative remaining use", () => {
  const result = calculateQuotaUsage(105, 100);
  assert.equal(result.status, "exceeded");
  assert.equal(result.remaining, 0);
  assert.equal(result.percent, 105);
});

test("invalid or missing quota readings remain unavailable", () => {
  assert.equal(calculateQuotaUsage(null, 100).status, "unavailable");
  assert.equal(calculateQuotaUsage(-1, 100).used, null);
  assert.equal(calculateQuotaUsage(10, 0).status, "unavailable");
});

test("retrieval freshness distinguishes fresh, stale and invalid timestamps", () => {
  const now = "2026-11-18T12:00:00Z";
  assert.equal(getDataFreshness("2026-11-18T11:50:00Z", now).status, "fresh");
  assert.equal(getDataFreshness("2026-11-18T11:40:00Z", now).status, "stale");
  assert.equal(getDataFreshness("2026-11-18T12:01:00Z", now).status, "unavailable");
  assert.equal(getDataFreshness(null, now).status, "unavailable");
});

test("UTC daily window handles a Ghana-midnight boundary correctly", () => {
  assert.deepEqual(getUtcDayWindow("2026-11-18T23:59:59Z"), {
    start: "2026-11-18T00:00:00.000Z",
    end: "2026-11-19T00:00:00.000Z",
  });
  assert.equal(getNextUtcReset("2026-11-19T00:00:00Z"), "2026-11-20T00:00:00.000Z");
});

test("quota constants are documented separately by limit type", () => {
  assert.equal(CLOUDFLARE_FREE_LIMITS.workerRequestsDaily, 100_000);
  assert.equal(CLOUDFLARE_FREE_LIMITS.d1RowsReadDaily, 5_000_000);
  assert.equal(CLOUDFLARE_FREE_LIMITS.d1RowsWrittenDaily, 100_000);
  assert.equal(CLOUDFLARE_FREE_LIMITS.workerSubrequestsPerInvocation, 50);
});

test("combined parser keeps each metric independent", () => {
  const output = parseCloudflareUsage({
    workers: workersResponse,
    d1Rows: d1RowsResponse,
  });
  assert.equal(output.workerRequests, 100);
  assert.equal(output.d1RowsRead, 200);
  assert.equal(output.d1StorageBytes, null);
  assert.equal(output.d1StorageAsOf, null);
});
