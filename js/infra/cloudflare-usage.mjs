/**
 * Pure Cloudflare usage parsing and quota calculations.
 *
 * This module does not make network requests or handle credentials.
 * Missing, malformed, partial, or stale data must never be displayed as zero.
 */

export const CLOUDFLARE_FREE_LIMITS = Object.freeze({
  workerRequestsDaily: 100_000,
  d1RowsReadDaily: 5_000_000,
  d1RowsWrittenDaily: 100_000,
  d1StorageAccountBytes: 5 * 1024 ** 3,
  d1StorageDatabaseBytes: 500 * 1024 ** 2,
  workerSubrequestsPerInvocation: 50,
});

export const WARNING_THRESHOLDS = Object.freeze([50, 70, 85, 95]);
export const DEFAULT_STALE_AFTER_MS = 15 * 60 * 1000;

function parseTimestamp(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  if (value && typeof value.toMillis === "function") {
    const parsed = value.toMillis();
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

function safeCount(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function getSingleAccount(response) {
  if (!response || (Array.isArray(response.errors) && response.errors.length > 0)) return null;
  const accounts = response?.data?.viewer?.accounts;
  return Array.isArray(accounts) && accounts.length === 1 ? accounts[0] : null;
}

function sumD1RowMetrics(groups) {
  if (!Array.isArray(groups) || groups.length === 0) return null;
  let rowsRead = 0;
  let rowsWritten = 0;
  for (const group of groups) {
    const read = safeCount(group?.sum?.rowsRead);
    const written = safeCount(group?.sum?.rowsWritten);
    // A partial row-count group makes both daily totals incomplete.
    if (read === null || written === null) return null;
    rowsRead += read;
    rowsWritten += written;
    if (!Number.isSafeInteger(rowsRead) || !Number.isSafeInteger(rowsWritten)) return null;
  }
  return { rowsRead, rowsWritten };
}

/** Parse Workers Analytics response data for one Cloudflare account. */
export function parseWorkersUsage(response) {
  const account = getSingleAccount(response);
  if (!account || !Array.isArray(account.workersInvocationsAdaptive) ||
      account.workersInvocationsAdaptive.length === 0) {
    return { requests: null, subrequests: null };
  }

  let requests = 0;
  let subrequests = 0;
  for (const group of account.workersInvocationsAdaptive) {
    const requestCount = safeCount(group?.sum?.requests);
    const subrequestCount = safeCount(group?.sum?.subrequests);
    if (requestCount === null || subrequestCount === null) {
      return { requests: null, subrequests: null };
    }
    requests += requestCount;
    subrequests += subrequestCount;
    if (!Number.isSafeInteger(requests) || !Number.isSafeInteger(subrequests)) {
      return { requests: null, subrequests: null };
    }
  }
  return { requests, subrequests };
}

/** Parse D1 quota row counters. Query counts are intentionally not used. */
export function parseD1RowUsage(response) {
  const account = getSingleAccount(response);
  if (!account) return { rowsRead: null, rowsWritten: null };
  const totals = sumD1RowMetrics(account.d1AnalyticsAdaptiveGroups);
  return totals || { rowsRead: null, rowsWritten: null };
}

/**
 * Parse the latest storage sample for each database and sum those latest
 * per-database snapshots. Historical samples for the same database are not
 * added together.
 */
export function parseD1StorageUsage(response) {
  const account = getSingleAccount(response);
  const groups = account?.d1StorageAdaptiveGroups;
  if (!Array.isArray(groups) || groups.length === 0) {
    return { bytes: null, asOf: null };
  }

  const latestByDatabase = new Map();
  for (const group of groups) {
    const databaseId = group?.dimensions?.databaseId;
    const timeValue = group?.dimensions?.datetime ?? group?.dimensions?.date;
    const timestamp = parseTimestamp(timeValue);
    const bytes = safeCount(group?.max?.databaseSizeBytes);
    if (typeof databaseId !== "string" || !databaseId.trim() ||
        !Number.isFinite(timestamp) || bytes === null) {
      return { bytes: null, asOf: null };
    }

    const current = latestByDatabase.get(databaseId);
    if (!current || timestamp > current.timestamp) {
      latestByDatabase.set(databaseId, { timestamp, bytes });
    }
  }

  if (latestByDatabase.size === 0) return { bytes: null, asOf: null };

  let totalBytes = 0;
  let oldestLatestSample = Infinity;
  for (const sample of latestByDatabase.values()) {
    totalBytes += sample.bytes;
    oldestLatestSample = Math.min(oldestLatestSample, sample.timestamp);
    if (!Number.isSafeInteger(totalBytes)) return { bytes: null, asOf: null };
  }

  return { bytes: totalBytes, asOf: new Date(oldestLatestSample).toISOString() };
}

/** Parse all supported Cloudflare analytics responses into normalized counts. */
export function parseCloudflareUsage({ workers, d1Rows, d1Storage } = {}) {
  const workerUsage = parseWorkersUsage(workers);
  const rowUsage = parseD1RowUsage(d1Rows);
  const storageUsage = parseD1StorageUsage(d1Storage);
  return {
    workerRequests: workerUsage.requests,
    workerSubrequests: workerUsage.subrequests,
    d1RowsRead: rowUsage.rowsRead,
    d1RowsWritten: rowUsage.rowsWritten,
    d1StorageBytes: storageUsage.bytes,
    d1StorageAsOf: storageUsage.asOf,
  };
}

/** Create a quota meter without converting missing/invalid data into zero. */
export function calculateQuotaUsage(usedValue, limitValue) {
  const used = safeCount(usedValue);
  const limit = safeCount(limitValue);
  if (used === null || limit === null || limit === 0) {
    return {
      status: "unavailable",
      used: null,
      limit: limit ?? null,
      remaining: null,
      percent: null,
      warningThresholdPercent: null,
    };
  }

  const percent = (used / limit) * 100;
  const warningThresholdPercent = [...WARNING_THRESHOLDS]
    .reverse()
    .find((threshold) => percent >= threshold) ?? null;

  return {
    status: used >= limit ? "exceeded" : "available",
    used,
    limit,
    remaining: Math.max(0, limit - used),
    percent: Number(percent.toFixed(2)),
    warningThresholdPercent,
  };
}

/** Check retrieval freshness. A future timestamp is treated as invalid. */
export function getDataFreshness(
  retrievedAt,
  now = Date.now(),
  staleAfterMs = DEFAULT_STALE_AFTER_MS,
) {
  const retrievedMs = parseTimestamp(retrievedAt);
  const nowMs = parseTimestamp(now);
  if (!Number.isFinite(retrievedMs) || !Number.isFinite(nowMs) ||
      !Number.isFinite(staleAfterMs) || staleAfterMs < 0 ||
      retrievedMs > nowMs) {
    return { status: "unavailable", ageMs: null };
  }

  const ageMs = nowMs - retrievedMs;
  return {
    status: ageMs > staleAfterMs ? "stale" : "fresh",
    ageMs,
  };
}

/** Return the UTC day containing the supplied instant. */
export function getUtcDayWindow(value = Date.now()) {
  const timestamp = parseTimestamp(value);
  if (!Number.isFinite(timestamp)) throw new TypeError("A valid timestamp is required.");
  const instant = new Date(timestamp);
  const start = Date.UTC(
    instant.getUTCFullYear(),
    instant.getUTCMonth(),
    instant.getUTCDate(),
  );
  return {
    start: new Date(start).toISOString(),
    end: new Date(start + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/** The next daily quota reset, which occurs at midnight UTC. */
export function getNextUtcReset(value = Date.now()) {
  return getUtcDayWindow(value).end;
}
