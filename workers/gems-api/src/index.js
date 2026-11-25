const PROJECT_ID = 'bece-hub-d9ad5';
const APP_ORIGIN = 'https://muzanjacson12345.github.io';
const ISSUER = 'https://securetoken.google.com/' + PROJECT_ID;
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FIRESTORE_ROOT = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents';
const MAX_BALANCE = 1000000000;
const MAX_OPERATION_AMOUNT = 1000000;
const GEM_COSMETICS = Object.freeze({
  'profile-ring-gold': Object.freeze({ price: 50 })
});
const GEM_ACHIEVEMENT_REWARDS = Object.freeze({
  'first-answer': Object.freeze({ amount: 1, metric: 'answered', target: 1 }),
  'curious-mind': Object.freeze({ amount: 2, metric: 'answered', target: 25 }),
  'question-pro': Object.freeze({ amount: 3, metric: 'answered', target: 100 }),
  'question-veteran': Object.freeze({ amount: 5, metric: 'answered', target: 250 }),
  'question-master': Object.freeze({ amount: 7, metric: 'answered', target: 500 }),
  'question-legend': Object.freeze({ amount: 10, metric: 'answered', target: 1000 }),
  'question-1500': Object.freeze({ amount: 13, metric: 'answered', target: 1500 }),
  'question-2500': Object.freeze({ amount: 17, metric: 'answered', target: 2500 }),
  'getting-sharp': Object.freeze({ amount: 2, metric: 'correct', target: 25 }),
  'high-score-90': Object.freeze({ amount: 3, metric: 'highScore', target: 1 }),
  'accuracy-star': Object.freeze({ amount: 4, metric: 'correct', target: 100 }),
  'accuracy-250': Object.freeze({ amount: 6, metric: 'correct', target: 250 }),
  'accuracy-500': Object.freeze({ amount: 9, metric: 'correct', target: 500 }),
  'accuracy-1000': Object.freeze({ amount: 13, metric: 'correct', target: 1000 }),
  'accuracy-2000': Object.freeze({ amount: 18, metric: 'correct', target: 2000 }),
  'quiz-beginner': Object.freeze({ amount: 2, metric: 'quizzes', target: 1 }),
  'quiz-five': Object.freeze({ amount: 4, metric: 'quizzes', target: 5 }),
  'quiz-regular': Object.freeze({ amount: 6, metric: 'quizzes', target: 10 }),
  'quiz-25': Object.freeze({ amount: 9, metric: 'quizzes', target: 25 }),
  'quiz-50': Object.freeze({ amount: 13, metric: 'quizzes', target: 50 }),
  'quiz-100': Object.freeze({ amount: 17, metric: 'quizzes', target: 100 }),
  'quiz-250': Object.freeze({ amount: 22, metric: 'quizzes', target: 250 }),
  'subject-explorer': Object.freeze({ amount: 4, metric: 'subjects', target: 3 }),
  'all-rounder': Object.freeze({ amount: 6, metric: 'subjects', target: 5 }),
  'all-six-subjects': Object.freeze({ amount: 8, metric: 'subjects', target: 6 }),
  'science-starter': Object.freeze({ amount: 3, metric: 'sci', target: 10 }),
  'science-scholar': Object.freeze({ amount: 6, metric: 'sci', target: 50 }),
  'science-master': Object.freeze({ amount: 10, metric: 'sci', target: 100 }),
  'all-seven-subjects': Object.freeze({ amount: 11, metric: 'subjects', target: 7 }),
  'french-starter': Object.freeze({ amount: 3, metric: 'fre', target: 10 }),
  'french-learner': Object.freeze({ amount: 6, metric: 'fre', target: 50 }),
  'french-confident': Object.freeze({ amount: 10, metric: 'fre', target: 100 }),
  'career-starter': Object.freeze({ amount: 3, metric: 'ct', target: 10 }),
  'career-learner': Object.freeze({ amount: 6, metric: 'ct', target: 50 }),
  'career-master': Object.freeze({ amount: 10, metric: 'ct', target: 100 }),
  'all-nine-subjects': Object.freeze({ amount: 13, metric: 'subjects', target: 8 }),
  'perfect-round': Object.freeze({ amount: 4, metric: 'perfect', target: 1 }),
  'perfect-5': Object.freeze({ amount: 7, metric: 'perfect', target: 5 }),
  'perfect-10': Object.freeze({ amount: 11, metric: 'perfect', target: 10 }),
  'perfect-25': Object.freeze({ amount: 16, metric: 'perfect', target: 25 }),
  'three-day-streak': Object.freeze({ amount: 4, metric: 'streak', target: 3 }),
  'week-streak': Object.freeze({ amount: 8, metric: 'streak', target: 7 }),
  'streak-14': Object.freeze({ amount: 13, metric: 'streak', target: 14 }),
  'streak-30': Object.freeze({ amount: 22, metric: 'streak', target: 30 }),
  'streak-60': Object.freeze({ amount: 35, metric: 'streak', target: 60 }),
  'streak-100': Object.freeze({ amount: 50, metric: 'streak', target: 100 }),
  'achievement-ten': Object.freeze({ amount: 10, metric: 'achievementCount', target: 10 })
});

let jwksCache = { keys: null, expiresAt: 0 };
let accessTokenCache = { token: '', expiresAt: 0 };
let serviceKeyCache = { raw: '', key: null, account: null };

function json(data, status, origin) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'vary': 'Origin'
  };
  if (origin === APP_ORIGIN) {
    headers['access-control-allow-origin'] = APP_ORIGIN;
    headers['access-control-allow-headers'] = 'Authorization, Content-Type';
    headers['access-control-allow-methods'] = 'GET, POST, OPTIONS';
    headers['access-control-max-age'] = '86400';
  }
  return new Response(JSON.stringify(data), { status: status || 200, headers });
}

function decodeBase64Url(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function encodeBase64Url(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function encodeJsonBase64Url(value) {
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function parseJwtPart(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

async function getJwks() {
  const now = Date.now();
  if (jwksCache.keys && jwksCache.expiresAt > now) return jwksCache.keys;
  const response = await fetch(JWKS_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!response.ok) throw new Error('FIREBASE_SIGNING_KEYS_UNAVAILABLE');
  const data = await response.json();
  if (!Array.isArray(data.keys)) throw new Error('FIREBASE_SIGNING_KEYS_INVALID');
  const cacheControl = response.headers.get('cache-control') || '';
  const match = cacheControl.match(/max-age=(\d+)/i);
  const ttlSeconds = match ? Math.max(60, Math.min(21600, Number(match[1]))) : 3600;
  jwksCache = { keys: data.keys, expiresAt: now + ttlSeconds * 1000 };
  return jwksCache.keys;
}

async function verifyFirebaseIdToken(token) {
  if (typeof token !== 'string' || token.length > 10000) throw new Error('UNAUTHORIZED');
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('UNAUTHORIZED');
  const header = parseJwtPart(parts[0]);
  const claims = parseJwtPart(parts[1]);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('UNAUTHORIZED');
  const keys = await getJwks();
  const jwk = keys.find(key => key.kid === header.kid && key.kty === 'RSA' && key.use === 'sig');
  if (!jwk) {
    jwksCache.expiresAt = 0;
    throw new Error('UNAUTHORIZED');
  }
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const signedBytes = new TextEncoder().encode(parts[0] + '.' + parts[1]);
  const signature = decodeBase64Url(parts[2]);
  const validSignature = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, signature, signedBytes);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!validSignature
      || claims.aud !== PROJECT_ID
      || claims.iss !== ISSUER
      || typeof claims.sub !== 'string'
      || claims.sub.length < 1
      || claims.sub.length > 128
      || !Number.isFinite(claims.exp)
      || claims.exp <= nowSeconds
      || !Number.isFinite(claims.iat)
      || claims.iat > nowSeconds + 60
      || !Number.isFinite(claims.auth_time)
      || claims.auth_time > nowSeconds + 60) {
    throw new Error('UNAUTHORIZED');
  }
  return { uid: claims.sub };
}

function pemToBytes(pem) {
  const clean = String(pem).replace(/\\n/g, '\n').replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  return decodeBase64Url(clean.replace(/\+/g, '-').replace(/\//g, '_'));
}

async function serviceAccount(env) {
  const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('SERVICE_NOT_CONFIGURED');
  if (serviceKeyCache.raw === raw && serviceKeyCache.key && serviceKeyCache.account) {
    return serviceKeyCache;
  }
  let account;
  try { account = JSON.parse(raw); } catch { throw new Error('SERVICE_ACCOUNT_SECRET_INVALID'); }
  if (account.type !== 'service_account'
      || account.project_id !== PROJECT_ID
      || typeof account.client_email !== 'string'
      || typeof account.private_key !== 'string') {
    throw new Error('SERVICE_ACCOUNT_SECRET_INVALID');
  }
  const der = pemToBytes(account.private_key);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  serviceKeyCache = { raw, key, account };
  return serviceKeyCache;
}

async function signServiceJwt(key, account, nowSeconds) {
  const header = encodeJsonBase64Url({ alg: 'RS256', typ: 'JWT', ...(account.private_key_id ? { kid: account.private_key_id } : {}) });
  const payload = encodeJsonBase64Url({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: OAUTH_TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600
  });
  const message = header + '.' + payload;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(message));
  return message + '.' + encodeBase64Url(signature);
}

async function getFirestoreAccessToken(env) {
  const now = Date.now();
  if (accessTokenCache.token && accessTokenCache.expiresAt > now + 60000) return accessTokenCache.token;
  const { key, account } = await serviceAccount(env);
  const assertion = await signServiceJwt(key, account, Math.floor(now / 1000));
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) throw new Error('GOOGLE_ACCESS_TOKEN_FAILED');
  const expiresIn = Number(result.expires_in) || 3600;
  accessTokenCache = { token: result.access_token, expiresAt: now + Math.max(60, expiresIn - 60) * 1000 };
  return accessTokenCache.token;
}

async function firestoreRequest(path, accessToken, options) {
  const response = await fetch('https://firestore.googleapis.com/v1/' + path, {
    method: options && options.method ? options.method : 'GET',
    headers: {
      'authorization': 'Bearer ' + accessToken,
      'content-type': 'application/json'
    },
    ...(options && options.body ? { body: JSON.stringify(options.body) } : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(response.status === 404 ? 'DOCUMENT_NOT_FOUND' : 'FIRESTORE_REQUEST_FAILED');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function getDocument(path, accessToken, transaction) {
  const url = FIRESTORE_ROOT + '/' + path;
  const query = transaction ? '?transaction=' + encodeURIComponent(transaction) : '';
  try {
    return await firestoreRequest(url.replace('https://firestore.googleapis.com/v1/', '') + query, accessToken);
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

async function rollbackTransaction(transaction, accessToken) {
  try {
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:rollback',
      accessToken,
      { method: 'POST', body: { transaction } }
    );
  } catch {}
}

function parseIntegerField(field, fallback) {
  if (!field) return fallback;
  const raw = field.integerValue !== undefined ? field.integerValue : field.doubleValue;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : NaN;
}

function parseStringArray(field) {
  const values = field && field.arrayValue && Array.isArray(field.arrayValue.values)
    ? field.arrayValue.values : [];
  return values.map(item => item && typeof item.stringValue === 'string' ? item.stringValue : '')
    .filter(Boolean);
}

async function isUserBanned(uid, accessToken) {
  const doc = await getDocument('bans/' + encodeURIComponent(uid), accessToken);
  return !!(doc && doc.fields && doc.fields.active && doc.fields.active.booleanValue === true);
}

async function userRole(uid, accessToken) {
  const doc = await getDocument('users/' + encodeURIComponent(uid), accessToken);
  return doc && doc.fields && doc.fields.role && typeof doc.fields.role.stringValue === 'string'
    ? doc.fields.role.stringValue : null;
}

// Bug triage follows the same live Firestore sessions as the app.
// A visible Owner badge or stale roster record is not enough for access.
function firestoreTimestampMs(document, key) {
  const raw = document && document.fields && document.fields[key] && document.fields[key].timestampValue;
  const value = raw ? Date.parse(raw) : NaN;
  return Number.isFinite(value) ? value : 0;
}
function firestoreString(document, key) {
  const field = document && document.fields && document.fields[key];
  return field && typeof field.stringValue === 'string' ? field.stringValue : '';
}
function bugBanUntil(document) {
  const field = document && document.fields && document.fields.until;
  if (!field) return 0;
  const raw = field.integerValue !== undefined ? field.integerValue : field.doubleValue;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}
async function isBugUserBanned(uid, accessToken) {
  const document = await getDocument('bans/' + encodeURIComponent(uid), accessToken);
  if (!document) return false;
  const until = bugBanUntil(document);
  return until === 0 || until > Date.now();
}
async function verifyBugStaffRole(uid, accessToken) {
  const [ownerSession, ownerConfig, adminSession, adminConfig, roster] = await Promise.all([
    getDocument('ownerSessions/' + encodeURIComponent(uid), accessToken),
    getDocument('config/owner', accessToken),
    getDocument('adminSessions/' + encodeURIComponent(uid), accessToken),
    getDocument('config/admin', accessToken),
    getDocument('staffRoster/' + encodeURIComponent(uid), accessToken)
  ]);
  const now = Date.now();
  const ownerAt = firestoreTimestampMs(ownerSession, 'at');
  const ownerActive = !!ownerAt
    && now - ownerAt >= 0
    && now - ownerAt < 30 * 60 * 1000
    && !!ownerConfig
    && firestoreString(ownerSession, 'pw1') === firestoreString(ownerConfig, 'pw1')
    && firestoreString(ownerSession, 'pw2') === firestoreString(ownerConfig, 'pw2');
  if (ownerActive) return 'owner';

  const adminAt = firestoreTimestampMs(adminSession, 'at');
  const adminActive = !!adminAt && now - adminAt >= 0 && now - adminAt < 2 * 60 * 60 * 1000;
  const appointed = !!roster
    && !!(roster.fields && roster.fields.appointed && roster.fields.appointed.booleanValue === true)
    && firestoreString(roster, 'role') === 'admin';
  const pinMatches = !!adminConfig
    && !!firestoreString(adminSession, 'pin')
    && firestoreString(adminSession, 'pin') === firestoreString(adminConfig, 'pin');
  return adminActive && (appointed || pinMatches) ? 'admin' : null;
}


function bugStringField(document, key, fallback = '') {
  const field = document && document.fields && document.fields[key];
  return field && typeof field.stringValue === 'string' ? field.stringValue : fallback;
}
function bugIssueNumber(document) {
  const field = document && document.fields && document.fields.githubIssueNumber;
  const raw = field && (field.integerValue !== undefined ? field.integerValue : field.doubleValue);
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}
async function githubJson(path, token, options = {}) {
  const response = await fetch('https://api.github.com/' + path, {
    method: options.method || 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'BECE-Hub-Bug-Reporter',
      ...(options.body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('GITHUB_API_REQUEST_FAILED');
    error.status = response.status;
    throw error;
  }
  return data;
}
async function saveGithubBugLink(reportId, issue, accessToken) {
  const mask = new URLSearchParams();
  ['githubIssueNumber', 'githubIssueUrl', 'githubSyncedAt'].forEach(key => mask.append('updateMask.fieldPaths', key));
  const path = 'projects/' + PROJECT_ID + '/databases/(default)/documents/bugReports/'
    + encodeURIComponent(reportId) + '?' + mask.toString();
  await firestoreRequest(path, accessToken, {
    method: 'PATCH',
    body: {
      fields: {
        githubIssueNumber: { integerValue: String(issue.number) },
        githubIssueUrl: { stringValue: issue.html_url },
        githubSyncedAt: { timestampValue: new Date().toISOString() }
      }
    }
  });
}
async function createOrFindGithubBugIssue(reportId, report, githubToken, accessToken) {
  const existingNumber = bugIssueNumber(report);
  const existingUrl = bugStringField(report, 'githubIssueUrl');
  if (existingNumber && existingUrl) {
    return { issueNumber: existingNumber, issueUrl: existingUrl, alreadyLinked: true };
  }
  const marker = 'BECE_REPORT_ID:' + reportId;
  let issue = null;
  try {
    const query = 'repo:muzanjacson12345/bece "' + marker + '"';
    const found = await githubJson('search/issues?q=' + encodeURIComponent(query) + '&per_page=1', githubToken);
    if (Array.isArray(found.items) && found.items.length) issue = found.items[0];
  } catch (error) {
    // The issue body retains this stable marker so a later retry can reconcile it.
  }
  if (!issue) {
    const category = bugStringField(report, 'cat', 'other').toLowerCase();
    const screen = bugStringField(report, 'screen', 'unknown').slice(0, 30);
    const device = bugStringField(report, 'device', 'Not supplied').slice(0, 160);
    const createdAt = report && report.fields && report.fields.at && report.fields.at.timestampValue
      ? report.fields.at.timestampValue : 'Unknown';
    const titleCategory = ({
      bug: 'Something is broken',
      display: 'Display or layout problem',
      content: 'Content problem',
      idea: 'Suggestion',
      other: 'Other report'
    })[category] || 'Other report';
    const title = '[BECE report] ' + titleCategory + ' — ' + screen;
    const body = [
      '## BECE Hub report',
      '',
      '- Report reference: ' + reportId,
      '- Category: ' + category,
      '- App section: ' + screen,
      '- Device/browser: ' + device.replace(/[<>]/g, ''),
      '- Originally submitted: ' + createdAt,
      '',
      '## Private report details',
      '',
      'The full description and any screenshots are stored in private BECE Hub Firestore. Authorized staff can inspect them in the Admin bug-report queue. They are intentionally not copied into this public issue.',
      '',
      '<!-- ' + marker + ' -->'
    ].join('\n');
    issue = await githubJson('repos/muzanjacson12345/bece/issues', githubToken, {
      method: 'POST',
      body: { title: title.slice(0, 180), body }
    });
  }
  if (!issue || !Number.isSafeInteger(Number(issue.number)) || typeof issue.html_url !== 'string') {
    throw new Error('GITHUB_ISSUE_RESPONSE_INVALID');
  }
  await saveGithubBugLink(reportId, issue, accessToken);
  return { issueNumber: Number(issue.number), issueUrl: issue.html_url, alreadyLinked: false };
}

async function handleBugSync(payload, identity, env, origin) {
  const action = payload && payload.action;
  if (!['syncOne', 'migrate'].includes(action)) {
    return json({ ok: false, code: 'INVALID_BUG_ACTION', error: 'Unsupported bug-report action.' }, 400, origin);
  }
  if (!env.GITHUB_TOKEN) {
    return json({
      ok: false,
      code: 'GITHUB_SYNC_NOT_CONFIGURED',
      error: 'The private GitHub integration credential has not been configured on the Worker yet. The report remains safely stored in BECE Hub.'
    }, 503, origin);
  }
  const accessToken = await getFirestoreAccessToken(env);
  if (await isBugUserBanned(identity.uid, accessToken)) {
    return json({ ok: false, code: 'USER_BANNED', error: 'This account cannot sync reports while banned.' }, 403, origin);
  }
  const role = await verifyBugStaffRole(identity.uid, accessToken);
  if (action === 'syncOne') {
    const reportId = typeof payload.reportId === 'string' ? payload.reportId.trim() : '';
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(reportId)) {
      return json({ ok: false, code: 'INVALID_REPORT_ID', error: 'The report reference is invalid.' }, 400, origin);
    }
    const report = await getDocument('bugReports/' + encodeURIComponent(reportId), accessToken);
    if (!report) return json({ ok: false, code: 'REPORT_NOT_FOUND', error: 'This bug report could not be found.' }, 404, origin);
    const reporterUid = bugStringField(report, 'uid');
    if (reporterUid !== identity.uid && !['admin', 'owner'].includes(role)) {
      return json({ ok: false, code: 'REPORT_ACCESS_DENIED', error: 'You cannot sync another player report.' }, 403, origin);
    }
    const issue = await createOrFindGithubBugIssue(reportId, report, env.GITHUB_TOKEN, accessToken);
    return json({ ok: true, ...issue }, 200, origin);
  }
  if (role !== 'owner') {
    return json({ ok: false, code: 'OWNER_REQUIRED', error: 'Only the Owner can migrate older reports.' }, 403, origin);
  }
  const pageSize = Math.max(1, Math.min(10, Math.floor(Number(payload.pageSize) || 10)));
  const query = new URLSearchParams({ pageSize: String(pageSize), orderBy: 'at desc' });
  if (typeof payload.pageToken === 'string' && payload.pageToken.length <= 4096) query.set('pageToken', payload.pageToken);
  const page = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents/bugReports?' + query.toString(),
    accessToken
  );
  const documents = Array.isArray(page.documents) ? page.documents : [];
  const totals = { scanned: 0, synced: 0, skipped: 0, failed: 0 };
  for (const report of documents) {
    totals.scanned++;
    const name = String(report.name || '');
    const reportId = name.split('/').pop();
    if (!reportId || (bugIssueNumber(report) && bugStringField(report, 'githubIssueUrl'))) {
      totals.skipped++;
      continue;
    }
    try {
      await createOrFindGithubBugIssue(reportId, report, env.GITHUB_TOKEN, accessToken);
      totals.synced++;
    } catch (error) {
      totals.failed++;
    }
  }
  return json({ ok: true, ...totals, nextPageToken: page.nextPageToken || '' }, 200, origin);
}

async function applyGemCosmeticPurchase(uid, itemId, operationId, accessToken) {
  const item = GEM_COSMETICS[itemId];
  if (!item) throw new Error('INVALID_GEM_ITEM');
  const documentName = 'projects/' + PROJECT_ID + '/databases/(default)/documents/players/' + uid;
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken,
    { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const player = await getDocument('players/' + encodeURIComponent(uid), accessToken, transaction);
    if (!player) throw new Error('PLAYER_PROFILE_NOT_READY');
    const fields = player.fields || {};
    const before = fields.gems ? parseIntegerField(fields.gems, 0) : 0;
    if (!Number.isSafeInteger(before) || before < 0 || before > MAX_BALANCE) throw new Error('INVALID_GEM_BALANCE');
    const recentOps = parseStringArray(fields.gemOps);
    const cosmeticFields = fields.gemCosmetics && fields.gemCosmetics.mapValue
      && fields.gemCosmetics.mapValue.fields ? fields.gemCosmetics.mapValue.fields : {};
    const ownedCosmetics = Object.fromEntries(Object.entries(cosmeticFields)
      .filter(([, value]) => value && value.booleanValue === true)
      .map(([key]) => [key, true]));
    const equippedGemCosmetic = fields.equippedGemCosmetic && typeof fields.equippedGemCosmetic.stringValue === 'string'
      ? fields.equippedGemCosmetic.stringValue : '';
    const finishWithoutWrite = async () => {
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken,
        { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      return {
        previous: before, balance: before, change: 0, duplicate: true,
        operations: recentOps, gemCosmetics: ownedCosmetics, equippedGemCosmetic
      };
    };
    if (ownedCosmetics[itemId]) return await finishWithoutWrite();
    if (recentOps.includes(operationId)) return await finishWithoutWrite();
    if (before < item.price) {
      const error = new Error('INSUFFICIENT_GEMS');
      error.code = 'INSUFFICIENT_GEMS';
      throw error;
    }
    const after = before - item.price;
    if (!Number.isSafeInteger(after) || after < 0 || after > MAX_BALANCE) throw new Error('GEM_BALANCE_LIMIT');
    const operations = [...recentOps, operationId];
    const nextCosmetics = { ...cosmeticFields, [itemId]: { booleanValue: true } };
    const nextOwnedCosmetics = { ...ownedCosmetics, [itemId]: true };
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      {
        method: 'POST',
        body: {
          transaction,
          writes: [{
            update: {
              name: documentName,
              fields: {
                gems: { integerValue: String(after) },
                gemOps: { arrayValue: { values: operations.map(value => ({ stringValue: value })) } },
                gemCosmetics: { mapValue: { fields: nextCosmetics } },
                equippedGemCosmetic: { stringValue: itemId }
              }
            },
            updateMask: { fieldPaths: ['gems', 'gemOps', 'gemCosmetics', 'equippedGemCosmetic'] }
          }]
        }
      }
    );
    finished = true;
    return {
      previous: before, balance: after, change: -item.price, duplicate: false,
      operations, gemCosmetics: nextOwnedCosmetics, equippedGemCosmetic: itemId
    };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

async function applyGemReward(uid, action, achievementId, operationId, accessToken) {
  const documentName = 'projects/' + PROJECT_ID + '/databases/(default)/documents/players/' + uid;
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken,
    { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const player = await getDocument('players/' + encodeURIComponent(uid), accessToken, transaction);
    if (!player) throw new Error('PLAYER_PROFILE_NOT_READY');
    const fields = player.fields || {};
    const before = fields.gems ? parseIntegerField(fields.gems, 0) : 0;
    if (!Number.isSafeInteger(before) || before < 0 || before > MAX_BALANCE) throw new Error('INVALID_GEM_BALANCE');
    const recentOps = parseStringArray(fields.gemOps);
    const day = new Date().toISOString().slice(0, 10);
    const finish = async (extra) => {
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken,
        { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      return { previous: before, balance: before, change: 0, duplicate: true, operations: recentOps, ...(extra || {}) };
    };

    let amount = 0, storedOperationId = operationId, rewardDay = null, bonusAmount = 0;
    if (action === 'achievement') {
      const reward = GEM_ACHIEVEMENT_REWARDS[achievementId];
      if (!reward || operationId !== 'achievement:' + achievementId) throw new Error('INVALID_ACHIEVEMENT_REWARD');
      if (recentOps.includes(operationId)) return await finish();
      const achievementFields = fields.achievements && fields.achievements.mapValue
        && fields.achievements.mapValue.fields ? fields.achievements.mapValue.fields : {};
      const unlocked = parseStringArray(achievementFields.unlocked);
      const stats = achievementFields.stats && achievementFields.stats.mapValue
        && achievementFields.stats.mapValue.fields ? achievementFields.stats.mapValue.fields : {};
      let progress = 0;
      if (reward.metric === 'subjects') progress = parseStringArray(achievementFields.subjects).length;
      else if (reward.metric === 'achievementCount') progress = unlocked.length;
      else if (reward.metric === 'streak') progress = parseIntegerField(fields.streak, 0);
      else progress = parseIntegerField(stats[reward.metric], 0);
      if (!unlocked.includes(achievementId) || !Number.isSafeInteger(progress) || progress < reward.target) {
        throw new Error('ACHIEVEMENT_NOT_READY');
      }
      amount = reward.amount;
    } else if (action === 'daily') {
      if (operationId !== 'daily:' + day) throw new Error('INVALID_DAILY_OPERATION_ID');
      const sameDay = recentOps.find(value => value.startsWith('daily:' + day + ':'));
      if (sameDay) return await finish({ rewardDay: Number(sameDay.split(':')[2]) || 1 });
      const challengeFields = fields.challengeState && fields.challengeState.mapValue
        && fields.challengeState.mapValue.fields ? fields.challengeState.mapValue.fields : {};
      const progressFields = challengeFields.progress && challengeFields.progress.mapValue
        && challengeFields.progress.mapValue.fields ? challengeFields.progress.mapValue.fields : {};
      const quizzesToday = parseIntegerField(progressFields.quizzes, 0);
      if (!challengeFields.day || challengeFields.day.stringValue !== day
          || !Number.isSafeInteger(quizzesToday) || quizzesToday < 1) {
        throw new Error('DAILY_ACTIVITY_REQUIRED');
      }
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const previousClaim = recentOps.find(value => value.startsWith('daily:' + yesterday + ':'));
      const previousDayNumber = previousClaim ? Number(previousClaim.split(':')[2]) || 0 : 0;
      rewardDay = previousDayNumber >= 1 && previousDayNumber < 7 ? previousDayNumber + 1 : 1;
      amount = rewardDay === 7 ? 6 : 1;
      bonusAmount = rewardDay === 7 ? 5 : 0;
      storedOperationId = 'daily:' + day + ':' + rewardDay;
    } else {
      throw new Error('INVALID_REWARD_ACTION');
    }

    const after = before + amount;
    if (!Number.isSafeInteger(after) || after < 0 || after > MAX_BALANCE) throw new Error('GEM_BALANCE_LIMIT');
    // The server-protected gemOps history is append-only so achievement:<id> claims remain permanent.
    const operations = [...recentOps, storedOperationId];
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      {
        method: 'POST',
        body: {
          transaction,
          writes: [{
            update: {
              name: documentName,
              fields: {
                gems: { integerValue: String(after) },
                gemOps: { arrayValue: { values: operations.map(value => ({ stringValue: value })) } }
              }
            },
            updateMask: { fieldPaths: ['gems', 'gemOps'] }
          }]
        }
      }
    );
    finished = true;
    return {
      previous: before, balance: after, change: amount, duplicate: false, operations,
      ...(rewardDay ? { rewardDay, bonusAmount } : {})
    };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

function encodeFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (value && typeof value === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encodeFirestoreValue(item)])) } };
  }
  throw new Error('INVALID_RESET_VALUE');
}

async function applyFullReset(uid, accessToken) {
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken,
    { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const player = await getDocument('players/' + encodeURIComponent(uid), accessToken, transaction);
    if (!player) throw new Error('PLAYER_PROFILE_NOT_READY');
    const currentFields = player.fields || {};
    const displayName = currentFields.displayName && typeof currentFields.displayName.stringValue === 'string'
      ? currentFields.displayName.stringValue : '';
    const resetProfile = {
      displayName,
      totalExp: 0, weekKey: '', weekExp: 0, dayKey: '', dayExp: 0,
      streak: 0, bestStreak: 0, lastDay: '',
      duelW: 0, duelL: 0, duelD: 0,
      coins: 0, owned: {}, eq: {}, p50: 0, sfreezes: 0, xpBoost: 0,
      dcDay: '', dcN: 0,
      counted: { day: '', ids: [] },
      challengeState: { day: new Date().toISOString().slice(0, 10), progress: {}, subjects: [], claimed: [], coinClaimed: false },
      achievements: { stats: {}, subjects: [], unlocked: [] },
      avatar: '', photo: '', color: '', bio: '',
      gems: 0, gemOps: [], gemCosmetics: {}, equippedGemCosmetic: ''
    };
    if (currentFields.role && typeof currentFields.role.stringValue === 'string') resetProfile.role = currentFields.role.stringValue;
    const encodedFields = Object.fromEntries(Object.entries(resetProfile).map(([key, value]) => [key, encodeFirestoreValue(value)]));
    const fieldPaths = [...new Set([...Object.keys(currentFields), ...Object.keys(encodedFields)])];
    const documentName = 'projects/' + PROJECT_ID + '/databases/(default)/documents/players/' + uid;
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      { method: 'POST', body: { transaction, writes: [{
        update: { name: documentName, fields: encodedFields },
        updateMask: { fieldPaths }
      }] } }
    );
    finished = true;
    const previous = currentFields.gems ? parseIntegerField(currentFields.gems, 0) : 0;
    return {
      previous, balance: 0, change: -previous, duplicate: false,
      operations: [], gemCosmetics: {}, equippedGemCosmetic: '',
      reset: true, profile: resetProfile
    };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

async function applyGemChange(uid, action, amount, operationId, accessToken) {
  const documentName = 'projects/' + PROJECT_ID + '/databases/(default)/documents/players/' + uid;
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken,
    { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const player = await getDocument('players/' + encodeURIComponent(uid), accessToken, transaction);
    if (!player) throw new Error('PLAYER_PROFILE_NOT_READY');
    const fields = player.fields || {};
    const before = fields.gems ? parseIntegerField(fields.gems, 0) : 0;
    if (!Number.isSafeInteger(before) || before < 0 || before > MAX_BALANCE) throw new Error('INVALID_GEM_BALANCE');
    const recentOps = parseStringArray(fields.gemOps);
    if (recentOps.includes(operationId)) {
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken,
        { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      return { previous: before, balance: before, change: 0, duplicate: true, operations: recentOps };
    }
    if (action === 'spend' && before < amount) {
      const error = new Error('INSUFFICIENT_GEMS');
      error.code = 'INSUFFICIENT_GEMS';
      throw error;
    }
    const after = action === 'earn' ? before + amount : before - amount;
    if (!Number.isSafeInteger(after) || after < 0 || after > MAX_BALANCE) throw new Error('GEM_BALANCE_LIMIT');
    const operations = [...recentOps, operationId];
    const fieldsToWrite = {
      gems: { integerValue: String(after) },
      gemOps: { arrayValue: { values: operations.map(value => ({ stringValue: value })) } }
    };
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      {
        method: 'POST',
        body: {
          transaction,
          writes: [{
            update: { name: documentName, fields: fieldsToWrite },
            updateMask: { fieldPaths: ['gems', 'gemOps'] }
          }]
        }
      }
    );
    finished = true;
    return { previous: before, balance: after, change: action === 'earn' ? amount : -amount, duplicate: false, operations };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      if (origin && origin !== APP_ORIGIN) return json({ ok: false, error: 'ORIGIN_NOT_ALLOWED' }, 403, '');
      return json({ ok: true }, 200, origin);
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, configured: !!env.GOOGLE_SERVICE_ACCOUNT_JSON, project: PROJECT_ID }, 200, origin);
    }
    if (origin && origin !== APP_ORIGIN) return json({ ok: false, error: 'ORIGIN_NOT_ALLOWED' }, 403, '');
    if (request.method !== 'POST' || !['/gems', '/bugs'].includes(url.pathname)) {
      return json({ ok: false, error: 'NOT_FOUND' }, 404, origin);
    }
    let payload;
    try {
      const raw = await request.text();
      if (raw.length > (url.pathname === '/bugs' ? 8192 : 2048)) return json({ ok: false, error: 'REQUEST_TOO_LARGE' }, 413, origin);
      payload = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: 'INVALID_JSON' }, 400, origin);
    }
    const authHeader = request.headers.get('authorization') || '';
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) return json({ ok: false, error: 'UNAUTHORIZED' }, 401, origin);
    try {
      const identity = await verifyFirebaseIdToken(tokenMatch[1]);
      if (url.pathname === '/bugs') return await handleBugSync(payload, identity, env, origin);
      const action = payload && payload.action;
      const amount = payload && payload.amount;
      const operationId = payload && typeof payload.operationId === 'string' ? payload.operationId.trim() : '';
      if (!['earn', 'spend', 'purchase', 'achievement', 'daily', 'reset'].includes(action)) return json({ ok: false, error: 'INVALID_ACTION' }, 400, origin);
      if (action === 'purchase' && (typeof (payload && payload.itemId) !== 'string' || !GEM_COSMETICS[payload.itemId])) {
        return json({ ok: false, error: 'INVALID_GEM_ITEM' }, 400, origin);
      }
      const achievementId = payload && typeof payload.achievementId === 'string' ? payload.achievementId : '';
      if (action === 'achievement' && !Object.prototype.hasOwnProperty.call(GEM_ACHIEVEMENT_REWARDS, achievementId)) {
        return json({ ok: false, error: 'INVALID_ACHIEVEMENT_REWARD' }, 400, origin);
      }
      if (['earn', 'spend'].includes(action) && (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_OPERATION_AMOUNT)) {
        return json({ ok: false, error: 'INVALID_GEM_AMOUNT' }, 400, origin);
      }
      if (action === 'daily' && operationId !== 'daily:' + new Date().toISOString().slice(0, 10)) {
        return json({ ok: false, error: 'INVALID_DAILY_OPERATION_ID' }, 400, origin);
      }
      if (action === 'achievement' && operationId !== 'achievement:' + achievementId) {
        return json({ ok: false, error: 'INVALID_ACHIEVEMENT_OPERATION_ID' }, 400, origin);
      }
      if (action === 'reset' && !operationId.startsWith('reset:')) return json({ ok: false, error: 'INVALID_RESET_OPERATION_ID' }, 400, origin);
      if (!/^[a-zA-Z0-9._:-]{1,120}$/.test(operationId)) {
        return json({ ok: false, error: 'INVALID_GEM_OPERATION_ID' }, 400, origin);
      }
      const accessToken = await getFirestoreAccessToken(env);
      if (await isUserBanned(identity.uid, accessToken)) return json({ ok: false, code: 'USER_BANNED', error: 'This account cannot use Gems while banned.' }, 403, origin);
      if (action === 'earn') {
        const role = await userRole(identity.uid, accessToken);
        if (role !== 'owner') return json({ ok: false, code: 'EARN_REQUIRES_OWNER', error: 'Gems can only be granted by the Owner until approved reward rules are added.' }, 403, origin);
      }
      const outcome = action === 'reset'
        ? await applyFullReset(identity.uid, accessToken)
        : action === 'purchase'
          ? await applyGemCosmeticPurchase(identity.uid, payload.itemId, operationId, accessToken)
          : (action === 'achievement' || action === 'daily')
            ? await applyGemReward(identity.uid, action, achievementId, operationId, accessToken)
            : await applyGemChange(identity.uid, action, amount, operationId, accessToken);
      return json({ ok: true, ...outcome }, 200, origin);
    } catch (error) {
      if (error && error.message === 'INSUFFICIENT_GEMS') {
        return json({ ok: false, code: 'INSUFFICIENT_GEMS', error: 'You do not have enough Gems.' }, 409, origin);
      }
      if (error && error.message === 'PLAYER_PROFILE_NOT_READY') {
        return json({ ok: false, code: 'PLAYER_PROFILE_NOT_READY', error: 'Your player profile is still being created. Please try again shortly.' }, 409, origin);
      }
      if (error && error.message === 'SERVICE_NOT_CONFIGURED') {
        return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED', error: 'The secure Gems service has not been configured yet.' }, 503, origin);
      }
      if (error && error.message === 'INVALID_GEM_BALANCE') {
        return json({ ok: false, code: 'INVALID_GEM_BALANCE', error: 'Your Gems balance needs Owner review.' }, 409, origin);
      }
      if (error && error.message === 'ACHIEVEMENT_NOT_READY') {
        return json({ ok: false, code: 'ACHIEVEMENT_NOT_READY', error: 'This achievement is not ready to claim.' }, 409, origin);
      }
      if (error && error.message === 'DAILY_ACTIVITY_REQUIRED') {
        return json({ ok: false, code: 'DAILY_ACTIVITY_REQUIRED', error: 'Complete a normal practice quiz before claiming today’s Gems.' }, 409, origin);
      }
      console.error('Gems API request failed:', error && error.message ? error.message : 'unknown error');
      return json({ ok: false, code: 'GEMS_SERVICE_ERROR', error: 'The secure Gems service could not complete this request.' }, 502, origin);
    }
  }
};