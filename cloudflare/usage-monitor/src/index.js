import {
  CLOUDFLARE_FREE_LIMITS,
  calculateQuotaUsage,
  getDataFreshness,
  getUtcDayWindow,
  parseD1RowUsage,
  parseD1StorageUsage,
  parseWorkersUsage,
} from "../../../js/infra/cloudflare-usage.mjs";

const FIREBASE_LOOKUP = "https://identitytoolkit.googleapis.com/v1/accounts:lookup";
const FIRESTORE_ROOT = "https://firestore.googleapis.com/v1/projects";
const CLOUDFLARE_GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";
const WORKER_REQUEST_LIMIT = CLOUDFLARE_FREE_LIMITS.workerRequestsDaily;
const D1_ROWS_READ_LIMIT = CLOUDFLARE_FREE_LIMITS.d1RowsReadDaily;
const D1_ROWS_WRITE_LIMIT = CLOUDFLARE_FREE_LIMITS.d1RowsWrittenDaily;
const D1_STORAGE_LIMIT = CLOUDFLARE_FREE_LIMITS.d1StorageAccountBytes;
const D1_DATABASE_LIMIT = CLOUDFLARE_FREE_LIMITS.d1StorageDatabaseBytes;
const GRAPHQL_ROW_LIMIT = 10000;
const OWNER_SESSION_MS = 30 * 60 * 1000;

let metricCache = { key: "", expiresAt: 0, value: null };

function json(body, status, origin) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store",
    "Vary": "Origin"
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    headers.set("Access-Control-Max-Age", "600");
  }
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

function configuredOrigin(env) {
  try {
    const url = new URL(env.APP_ORIGIN || "");
    if (url.origin !== env.APP_ORIGIN || !["https:", "http:"].includes(url.protocol)) return null;
    if (url.protocol === "http:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function numberOrNull(value) {
  if (value === null || value === undefined || typeof value === "boolean") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

function levelForThreshold(threshold) {
  return threshold === null ? "normal"
    : threshold >= 95 ? "critical"
    : threshold >= 85 ? "high"
    : threshold >= 70 ? "medium"
    : threshold >= 50 ? "notice"
    : "normal";
}

export function getThreshold(used, limit) {
  const metric = calculateQuotaUsage(used, limit);
  if (metric.status === "unavailable") return { percent: null, level: "unavailable" };
  return {
    percent: Math.min(100, metric.percent),
    level: levelForThreshold(metric.warningThresholdPercent)
  };
}

export function quotaMetric(used, limit) {
  const metric = calculateQuotaUsage(used, limit);
  return {
    used: metric.used,
    limit: metric.limit,
    remaining: metric.remaining,
    percent: metric.percent === null ? null : Math.min(100, metric.percent),
    level: metric.status === "unavailable" ? "unavailable" : levelForThreshold(metric.warningThresholdPercent),
    exceeded: metric.status === "exceeded"
  };
}

function dateParts(now) {
  const day = getUtcDayWindow(now);
  return {
    startIso: day.start,
    endIso: new Date(now).toISOString(),
    date: day.start.slice(0, 10)
  };
}

async function postJson(fetchFn, url, headers, body) {
  const response = await fetchFn(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  let data;
  try { data = await response.json(); }
  catch { throw new Error("upstream_invalid_json"); }
  return { response, data };
}

async function verifyFirebaseUser(idToken, env, fetchFn) {
  if (!idToken || idToken.length > 10000) return null;
  const url = `${FIREBASE_LOOKUP}?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`;
  const { response, data } = await postJson(fetchFn, url, {}, { idToken });
  if (!response.ok || !Array.isArray(data.users) || data.users.length !== 1) return null;
  const user = data.users[0];
  if (!user || user.disabled === true || typeof user.localId !== "string" || !user.localId) return null;
  return { uid: user.localId };
}

async function verifyCurrentOwnerRules(idToken, env, fetchFn) {
  const project = encodeURIComponent(env.FIREBASE_PROJECT_ID);
  // The audit log collection is readable only when Firestore's current isOwner()
  // rule succeeds. Ask for at most one record and discard the response. This
  // re-checks current passwords/role, not merely the timestamp on an old session.
  const url = `${FIRESTORE_ROOT}/${project}/databases/(default)/documents/auditLogs?pageSize=1`;
  const response = await fetchFn(url, {
    method: "GET",
    headers: { "Authorization": `Bearer ${idToken}`, "Accept": "application/json" }
  });
  if (response.status === 403 || response.status === 401) return false;
  if (!response.ok) throw new Error("owner_rule_check_failed");
  return true;
}

async function verifyOwnerSession(uid, idToken, env, fetchFn, nowMs) {
  const project = encodeURIComponent(env.FIREBASE_PROJECT_ID);
  const user = encodeURIComponent(uid);
  const url = `${FIRESTORE_ROOT}/${project}/databases/(default)/documents/ownerSessions/${user}`;
  const response = await fetchFn(url, {
    method: "GET",
    headers: { "Authorization": `Bearer ${idToken}`, "Accept": "application/json" }
  });
  if (response.status === 404 || response.status === 403 || response.status === 401) return false;
  if (!response.ok) throw new Error("owner_session_lookup_failed");

  let data;
  try { data = await response.json(); }
  catch { throw new Error("owner_session_invalid"); }

  const fields = data && data.fields;
  const at = fields && fields.at && fields.at.timestampValue;
  if (!fields || !fields.pw1 || !fields.pw1.stringValue ||
      !fields.pw2 || !fields.pw2.stringValue || typeof at !== "string") return false;

  const timestamp = Date.parse(at);
  if (!Number.isFinite(timestamp) || timestamp > nowMs + 60000 ||
      nowMs - timestamp >= OWNER_SESSION_MS) return false;

  // A second, rules-protected read confirms the Owner session is still valid
  // under the latest config/owner passwords and Firestore rules.
  return verifyCurrentOwnerRules(idToken, env, fetchFn);
}

function sumRows(rows, firstKey, secondKey) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length >= GRAPHQL_ROW_LIMIT) return null;
  let total = 0;
  for (const row of rows) {
    const value = numberOrNull(row && row.sum && row.sum[firstKey]);
    const extra = secondKey ? numberOrNull(row && row.sum && row.sum[secondKey]) : 0;
    if (value === null || (secondKey && extra === null)) return null;
    total += value + (secondKey ? extra : 0);
  }
  return total;
}

function readWorkersMetrics(account) {
  const rows = account && account.workersInvocationsAdaptive;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length >= GRAPHQL_ROW_LIMIT) {
    return { complete: false, requests: null, subrequests: null, latestEventAt: null, records: Array.isArray(rows) ? rows.length : 0 };
  }
  let requests = 0;
  let subrequests = 0;
  let latest = 0;
  for (const row of rows) {
    const requestCount = numberOrNull(row && row.sum && row.sum.requests);
    const subrequestCount = numberOrNull(row && row.sum && row.sum.subrequests);
    if (requestCount === null || subrequestCount === null) {
      return { complete: false, requests: null, subrequests: null, latestEventAt: null, records: rows.length };
    }
    requests += requestCount;
    subrequests += subrequestCount;
    const at = Date.parse(row && row.dimensions && row.dimensions.datetime || "");
    if (Number.isFinite(at) && at > latest) latest = at;
  }
  return {
    complete: true,
    requests,
    subrequests,
    latestEventAt: latest ? new Date(latest).toISOString() : null,
    records: rows.length
  };
}

function readD1Rows(account) {
  const rows = account && account.d1AnalyticsAdaptiveGroups;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length >= GRAPHQL_ROW_LIMIT) {
    return { complete: false, rowsRead: null, rowsWritten: null, records: Array.isArray(rows) ? rows.length : 0 };
  }
  let rowsRead = 0;
  let rowsWritten = 0;
  for (const row of rows) {
    const read = numberOrNull(row && row.sum && row.sum.rowsRead);
    const written = numberOrNull(row && row.sum && row.sum.rowsWritten);
    if (read === null || written === null) {
      return { complete: false, rowsRead: null, rowsWritten: null, records: rows.length };
    }
    rowsRead += read;
    rowsWritten += written;
  }
  return { complete: true, rowsRead, rowsWritten, records: rows.length };
}

function readD1Storage(account) {
  const rows = account && account.d1StorageAdaptiveGroups;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length >= GRAPHQL_ROW_LIMIT) {
    return { complete: false, totalBytes: null, largestDatabaseBytes: null, records: Array.isArray(rows) ? rows.length : 0 };
  }
  const latestByDatabase = new Map();
  for (const row of rows) {
    const databaseId = row && row.dimensions && row.dimensions.databaseId;
    const bytes = numberOrNull(row && row.max && row.max.databaseSizeBytes);
    if (!databaseId || bytes === null) {
      return { complete: false, totalBytes: null, largestDatabaseBytes: null, records: rows.length };
    }
    const prior = latestByDatabase.get(databaseId);
    if (!prior || bytes > prior) latestByDatabase.set(databaseId, bytes);
  }
  const sizes = [...latestByDatabase.values()];
  return {
    complete: sizes.length > 0,
    totalBytes: sizes.reduce((sum, value) => sum + value, 0),
    largestDatabaseBytes: sizes.length ? Math.max(...sizes) : null,
    records: rows.length
  };
}

async function cloudflareGraphql(query, variables, env, fetchFn) {
  const { response, data } = await postJson(fetchFn, CLOUDFLARE_GRAPHQL, {
    "Authorization": `Bearer ${env.CF_API_TOKEN}`,
    "Accept": "application/json"
  }, { query, variables });
  if (!response.ok || (Array.isArray(data.errors) && data.errors.length) || !data.data) {
    throw new Error("cloudflare_analytics_unavailable");
  }
  const accounts = data.data.viewer && data.data.viewer.accounts;
  if (!Array.isArray(accounts) || accounts.length !== 1) throw new Error("cloudflare_account_unavailable");
  return accounts[0];
}

async function fetchCloudflareMetrics(env, fetchFn, nowMs) {
  const periods = dateParts(nowMs);
  const workerQuery = `query WorkerUsage($accountTag: string!, $start: string!, $end: string!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        workersInvocationsAdaptive(
          limit: ${GRAPHQL_ROW_LIMIT}
          filter: { datetime_geq: $start, datetime_leq: $end }
        ) {
          sum { requests subrequests }
          dimensions { datetime scriptName status }
        }
      }
    }
  }`;
  const d1RowsQuery = `query D1RowUsage($accountTag: string!, $dateStart: Date!, $dateEnd: Date!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        d1AnalyticsAdaptiveGroups(
          limit: ${GRAPHQL_ROW_LIMIT}
          filter: { date_geq: $dateStart, date_leq: $dateEnd }
        ) {
          sum { rowsRead rowsWritten }
          dimensions { date databaseId }
        }
      }
    }
  }`;
  const d1StorageQuery = `query D1StorageUsage($accountTag: string!, $dateStart: Date!, $dateEnd: Date!) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        d1StorageAdaptiveGroups(
          limit: ${GRAPHQL_ROW_LIMIT}
          filter: { date_geq: $dateStart, date_leq: $dateEnd }
        ) {
          max { databaseSizeBytes }
          dimensions { date databaseId }
        }
      }
    }
  }`;
  const accountVariables = { accountTag: env.CF_ACCOUNT_ID };
  const dateVariables = { ...accountVariables, dateStart: periods.date, dateEnd: periods.date };

  const workerAccount = await cloudflareGraphql(workerQuery, {
    ...accountVariables, start: periods.startIso, end: periods.endIso
  }, env, fetchFn);
  const worker = readWorkersMetrics(workerAccount);

  let d1 = { complete: false, rowsRead: null, rowsWritten: null, records: 0 };
  try {
    const d1Account = await cloudflareGraphql(d1RowsQuery, dateVariables, env, fetchFn);
    d1 = readD1Rows(d1Account);
  } catch {
    // D1 may not be enabled in this Cloudflare account. Keep Worker metrics usable.
  }

  let storage = { complete: false, totalBytes: null, largestDatabaseBytes: null, records: 0 };
  try {
    const storageAccount = await cloudflareGraphql(d1StorageQuery, dateVariables, env, fetchFn);
    storage = readD1Storage(storageAccount);
  } catch {
    // Storage remains unavailable until Cloudflare returns a supported storage aggregate.
  }

  const workerQuota = quotaMetric(worker.complete ? worker.requests : null, WORKER_REQUEST_LIMIT);
  const d1ReadQuota = quotaMetric(d1.complete ? d1.rowsRead : null, D1_ROWS_READ_LIMIT);
  const d1WriteQuota = quotaMetric(d1.complete ? d1.rowsWritten : null, D1_ROWS_WRITE_LIMIT);
  const d1StorageQuota = quotaMetric(storage.complete ? storage.totalBytes : null, D1_STORAGE_LIMIT);
  const freshnessMs = worker.latestEventAt ? nowMs - Date.parse(worker.latestEventAt) : null;

  return {
    status: "ok",
    generatedAt: new Date(nowMs).toISOString(),
    timezone: "UTC",
    day: periods.date,
    source: "Cloudflare GraphQL Analytics API",
    analyticsNote: "Cloudflare analytics can lag behind live traffic. These are provider-reported analytics, not a real-time billing meter.",
    worker: {
      ...workerQuota,
      subrequests: worker.complete ? worker.subrequests : null,
      records: worker.records,
      complete: worker.complete,
      latestEventAt: worker.latestEventAt,
      freshness: freshnessMs === null ? "unknown" : freshnessMs > 10 * 60 * 1000 ? "delayed" : "recent"
    },
    d1: {
      detected: d1.complete || storage.complete,
      rowsRead: { ...d1ReadQuota, complete: d1.complete, records: d1.records },
      rowsWritten: { ...d1WriteQuota, complete: d1.complete, records: d1.records },
      storage: {
        ...d1StorageQuota,
        complete: storage.complete,
        largestDatabaseBytes: storage.largestDatabaseBytes,
        records: storage.records,
        databaseLimitBytes: D1_DATABASE_LIMIT
      }
    }
  };
}

export async function handleRequest(request, env, dependencies = {}) {
  const fetchFn = dependencies.fetch || fetch;
  const nowMs = typeof dependencies.now === "number" ? dependencies.now : Date.now();
  const origin = request.headers.get("Origin");
  const allowedOrigin = configuredOrigin(env);
  if (!allowedOrigin || !origin || origin !== allowedOrigin) {
    return json({ error: "origin_not_allowed" }, 403);
  }
  if (request.method === "OPTIONS") return json({}, 204, origin);
  if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405, origin);

  const required = ["FIREBASE_API_KEY", "FIREBASE_PROJECT_ID", "CF_ACCOUNT_ID", "CF_API_TOKEN"];
  if (required.some(key => !env[key]) || !allowedOrigin) {
    return json({ error: "service_not_configured" }, 503, origin);
  }

  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) return json({ error: "authentication_required" }, 401, origin);

  try {
    const user = await verifyFirebaseUser(match[1], env, fetchFn);
    if (!user) return json({ error: "authentication_invalid" }, 401, origin);
    const owner = await verifyOwnerSession(user.uid, match[1], env, fetchFn, nowMs);
    if (!owner) return json({ error: "owner_session_required" }, 403, origin);

    const cacheKey = `${env.CF_ACCOUNT_ID}:${new Date(nowMs).toISOString().slice(0, 10)}`;
    let snapshot;
    if (metricCache.key === cacheKey && metricCache.expiresAt > nowMs && metricCache.value) {
      snapshot = metricCache.value;
    } else {
      snapshot = await fetchCloudflareMetrics(env, fetchFn, nowMs);
      metricCache = { key: cacheKey, expiresAt: nowMs + 60000, value: snapshot };
    }
    return json(snapshot, 200, origin);
  } catch {
    return json({ error: "usage_metrics_unavailable", message: "Cloudflare usage data could not be verified. Try again later or check the server configuration." }, 502, origin);
  }
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  }
};
