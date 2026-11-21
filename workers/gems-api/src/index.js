import { isFirestoreBanActive } from "./ban-utils.mjs";
import { hasValidOwnerSession } from "./owner-utils.mjs";
import { buildPracticeRewardResult } from "./practice-utils.mjs";
import { isKnownQuestionId } from "./question-keys.mjs";

const PROJECT_ID = 'bece-hub-d9ad5';
const APP_ORIGIN = 'https://muzanjacson12345.github.io';
const ISSUER = 'https://securetoken.google.com/' + PROJECT_ID;
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FIRESTORE_ROOT = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents';
const MAX_BALANCE = 1000000000;
const MAX_OPERATION_AMOUNT = 1000000;
const MAX_RECENT_OPS = 100;

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
    .filter(Boolean).slice(-MAX_RECENT_OPS);
}


function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(value, 'stringValue')) return value.stringValue;
  if (Object.prototype.hasOwnProperty.call(value, 'integerValue')) return Number(value.integerValue);
  if (Object.prototype.hasOwnProperty.call(value, 'doubleValue')) return Number(value.doubleValue);
  if (Object.prototype.hasOwnProperty.call(value, 'booleanValue')) return value.booleanValue;
  if (Object.prototype.hasOwnProperty.call(value, 'nullValue')) return null;
  if (value.arrayValue) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if (value.mapValue) return decodeFirestoreFields(value.mapValue.fields || {});
  if (Object.prototype.hasOwnProperty.call(value, 'timestampValue')) return value.timestampValue;
  return undefined;
}

function decodeFirestoreFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]));
}

function encodeFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: 'NULL_VALUE' };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('INVALID_REWARD_NUMBER');
    return Number.isSafeInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (typeof value === 'object') return { mapValue: { fields: encodeFirestoreFields(value) } };
  throw new Error('INVALID_REWARD_VALUE');
}

function encodeFirestoreFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, encodeFirestoreValue(value)]));
}

function safeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : fallback;
}

function combineAchievementDisplay(legacy, verified) {
  const old = legacy && typeof legacy === 'object' ? legacy : {};
  const next = verified && typeof verified === 'object' ? verified : {};
  const oldStats = old.stats && typeof old.stats === 'object' ? old.stats : {};
  const newStats = next.stats && typeof next.stats === 'object' ? next.stats : {};
  const stats = { ...oldStats };
  Object.entries(newStats).forEach(([key, value]) => {
    stats[key] = Math.max(safeInteger(stats[key]), safeInteger(value));
  });
  return {
    stats,
    subjects: [...new Set([
      ...(Array.isArray(old.subjects) ? old.subjects : []),
      ...(Array.isArray(next.subjects) ? next.subjects : [])
    ])],
    unlocked: [...new Set([
      ...(Array.isArray(old.unlocked) ? old.unlocked : []),
      ...(Array.isArray(next.unlocked) ? next.unlocked : [])
    ])]
  };
}

async function applyPracticeRewardChange(uid, operationId, questionIds, answers, kind, accessToken) {
  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const playerPath = 'players/' + encodeURIComponent(uid);
  const statePath = 'rewardState/' + encodeURIComponent(uid);
  const operationPath = 'rewardOperations/' + encodeURIComponent(uid + '_' + operationId);
  const playerName = base + playerPath;
  const stateName = base + statePath;
  const operationName = base + operationPath;

  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken,
    { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const [playerDoc, stateDoc, settingsDoc, operationDoc] = await Promise.all([
      getDocument(playerPath, accessToken, transaction),
      getDocument(statePath, accessToken, transaction),
      getDocument('settings/app', accessToken, transaction),
      getDocument(operationPath, accessToken, transaction)
    ]);

    if (operationDoc) {
      const stored = decodeFirestoreFields(operationDoc.fields || {});
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken,
        { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      return { duplicate: true, result: stored.result || null };
    }

    if (!playerDoc) throw new Error('PLAYER_PROFILE_NOT_READY');
    const player = decodeFirestoreFields(playerDoc.fields);
    const trustedState = decodeFirestoreFields(stateDoc && stateDoc.fields);
    const settings = decodeFirestoreFields(settingsDoc && settingsDoc.fields);
    const currentCoins = player.coins === undefined ? 0 : Number(player.coins);
    const currentGems = player.gems === undefined ? 0 : Number(player.gems);
    const currentExp = player.totalExp === undefined ? 0 : Number(player.totalExp);
    if (![currentCoins, currentGems, currentExp].every(n => Number.isSafeInteger(n) && n >= 0 && n <= MAX_BALANCE)) {
      throw new Error('INVALID_PLAYER_BALANCE');
    }

    // Separate server-owned counters from legacy client-written values. The
    // display copy can preserve old badges, but only these verified counters
    // are used to issue new achievement Gem awards.
    const enginePlayer = {
      ...player,
      counted: trustedState.counted || player.counted,
      challengeState: trustedState.challengeState,
      achievements: trustedState.achievements || { stats: {}, subjects: [], unlocked: [] }
    };
    const claimedAchievements = Array.isArray(trustedState.achievementClaims)
      ? trustedState.achievementClaims.filter(id => typeof id === 'string') : [];
    const day = new Date().toISOString().slice(0, 10);
    const result = buildPracticeRewardResult({
      player: enginePlayer,
      settings,
      questionIds,
      answers,
      day,
      kind,
      claimedAchievements
    });
    const balances = [result.coins, result.gems, result.totalExp, result.weekExp, result.dayExp];
    if (!balances.every(value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_BALANCE)) {
      throw new Error('PLAYER_BALANCE_LIMIT');
    }

    const achievementClaims = [...new Set([...claimedAchievements, ...result.gemAchievementIds])];
    const displayAchievements = combineAchievementDisplay(player.achievements, result.achievements);
    const recentGemOps = Array.isArray(player.gemOps) ? player.gemOps.filter(x => typeof x === 'string') : [];
    if (result.gemsEarned > 0) recentGemOps.push(operationId);

    const playerUpdates = {
      totalExp: result.totalExp,
      weekKey: result.weekKey,
      weekExp: result.weekExp,
      dayKey: day,
      dayExp: result.dayExp,
      streak: result.streak,
      bestStreak: result.streakBest,
      lastDay: day,
      coins: result.coins,
      gems: result.gems,
      gemOps: [...new Set(recentGemOps)].slice(-MAX_RECENT_OPS),
      sfreezes: result.sfreezes,
      xpBoost: result.xpBoost,
      counted: result.counted,
      challengeState: result.challengeState,
      achievements: displayAchievements,
      recent: result.recent
    };
    const stateUpdates = {
      counted: result.counted,
      challengeState: result.challengeState,
      achievements: result.achievements,
      achievementClaims,
      updatedAt: Date.now()
    };
    const responseResult = {
      totalExpEarned: result.totalExpEarned,
      baseExpEarned: result.baseExpEarned,
      bonusExpEarned: result.bonusExpEarned,
      totalCoinsEarned: result.totalCoinsEarned,
      coins: result.coins,
      gems: result.gems,
      gemsEarned: result.gemsEarned,
      newAchievements: result.gemAchievementIds,
      scaledXpParts: result.scaledXpParts,
      scaledCoinParts: result.scaledCoinParts,
      correctCount: result.correctCount,
      alreadyCounted: result.alreadyCounted,
      totalExp: result.totalExp,
      weekKey: result.weekKey,
      weekExp: result.weekExp,
      dayKey: day,
      dayExp: result.dayExp,
      streak: result.streak,
      streakBest: result.streakBest,
      extended: result.extended,
      usedFreeze: result.usedFreeze,
      xpMult: result.xpMult,
      expRate: result.expRate,
      coinRate: result.coinRate,
      sfreezes: result.sfreezes,
      xpBoost: result.xpBoost,
      counted: result.counted,
      challengeState: result.challengeState,
      achievements: displayAchievements,
      recent: result.recent
    };

    const operationRecord = {
      uid,
      operationId,
      day,
      createdAt: Date.now(),
      result: responseResult
    };
    const writes = [
      {
        update: { name: playerName, fields: encodeFirestoreFields(playerUpdates) },
        updateMask: { fieldPaths: Object.keys(playerUpdates) },
        currentDocument: { exists: !!playerDoc }
      },
      {
        update: { name: stateName, fields: encodeFirestoreFields(stateUpdates) },
        updateMask: { fieldPaths: Object.keys(stateUpdates) },
        currentDocument: { exists: !!stateDoc }
      },
      {
        update: { name: operationName, fields: encodeFirestoreFields(operationRecord) },
        updateMask: { fieldPaths: Object.keys(operationRecord) },
        currentDocument: { exists: false }
      }
    ];
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      { method: 'POST', body: { transaction, writes } }
    );
    finished = true;
    return { duplicate: false, result: responseResult };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

async function isUserBanned(uid, accessToken) {
  const doc = await getDocument('bans/' + encodeURIComponent(uid), accessToken);
  return isFirestoreBanActive(doc);
}

async function hasActiveOwnerSession(uid, accessToken) {
  // The app's actual staff model is staffRoster + ownerSessions + config/owner.
  // It does not use users/{uid}.role for Owner authorization.
  const [roster, session, config] = await Promise.all([
    getDocument('staffRoster/' + encodeURIComponent(uid), accessToken),
    getDocument('ownerSessions/' + encodeURIComponent(uid), accessToken),
    getDocument('config/owner', accessToken)
  ]);
  return hasValidOwnerSession(roster, session, config);
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
    const operations = [...recentOps, operationId].slice(-MAX_RECENT_OPS);
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
    if (request.method !== 'POST' || !['/gems', '/practice'].includes(url.pathname)) {
      return json({ ok: false, error: 'NOT_FOUND' }, 404, origin);
    }
    let payload;
    try {
      const raw = await request.text();
      const maxBytes = url.pathname === '/practice' ? 12000 : 2048;
      if (raw.length > maxBytes) return json({ ok: false, error: 'REQUEST_TOO_LARGE' }, 413, origin);
      payload = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: 'INVALID_JSON' }, 400, origin);
    }
    const authHeader = request.headers.get('authorization') || '';
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) return json({ ok: false, error: 'UNAUTHORIZED' }, 401, origin);
    try {
      const identity = await verifyFirebaseIdToken(tokenMatch[1]);
      const accessToken = await getFirestoreAccessToken(env);
      if (await isUserBanned(identity.uid, accessToken)) return json({ ok: false, code: 'USER_BANNED', error: 'This account cannot use rewards while banned.' }, 403, origin);

      if (url.pathname === '/practice') {
        const questionIds = payload && payload.questionIds;
        const answers = payload && payload.answers;
        const operationId = payload && typeof payload.operationId === 'string' ? payload.operationId.trim() : '';
        const kind = payload && payload.kind;
        if (!Array.isArray(questionIds) || questionIds.length < 1 || questionIds.length > 100
          || questionIds.some(id => typeof id !== 'string' || !isKnownQuestionId(id))
          || new Set(questionIds).size !== questionIds.length) {
          return json({ ok: false, code: 'INVALID_QUESTION_SET', error: 'The quiz question list is invalid.' }, 400, origin);
        }
        if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
          return json({ ok: false, code: 'INVALID_ANSWERS', error: 'The submitted answers are invalid.' }, 400, origin);
        }
        const answerIds = Object.keys(answers);
        if (!answerIds.length || answerIds.length > questionIds.length
          || answerIds.some(id => !questionIds.includes(id) || !['A', 'B', 'C', 'D'].includes(answers[id]))) {
          return json({ ok: false, code: 'INVALID_ANSWERS', error: 'The submitted answers are invalid.' }, 400, origin);
        }
        if (kind !== 'practice' && kind !== 'daily') {
          return json({ ok: false, code: 'INVALID_QUIZ_KIND', error: 'The quiz type is invalid.' }, 400, origin);
        }
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) {
          return json({ ok: false, code: 'INVALID_OPERATION_ID', error: 'A valid session ID is required.' }, 400, origin);
        }
        const outcome = await applyPracticeRewardChange(identity.uid, operationId, questionIds, answers, kind, accessToken);
        return json({ ok: true, ...outcome }, 200, origin);
      }

      const action = payload && payload.action;
      const amount = payload && payload.amount;
      const operationId = payload && typeof payload.operationId === 'string' ? payload.operationId.trim() : '';
      if (!['earn', 'spend'].includes(action)) return json({ ok: false, error: 'INVALID_ACTION' }, 400, origin);
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_OPERATION_AMOUNT) {
        return json({ ok: false, error: 'INVALID_GEM_AMOUNT' }, 400, origin);
      }
      if (!/^[a-zA-Z0-9._:-]{1,120}$/.test(operationId)) {
        return json({ ok: false, error: 'INVALID_GEM_OPERATION_ID' }, 400, origin);
      }
      if (action === 'earn') {
        const owner = await hasActiveOwnerSession(identity.uid, accessToken);
        if (!owner) return json({ ok: false, code: 'EARN_REQUIRES_OWNER', error: 'Gems can only be granted by an authenticated Owner until approved reward rules are added.' }, 403, origin);
      }
      const outcome = await applyGemChange(identity.uid, action, amount, operationId, accessToken);
      return json({ ok: true, ...outcome }, 200, origin);
    } catch (error) {
      if (error && error.message === 'INSUFFICIENT_GEMS') {
        return json({ ok: false, code: 'INSUFFICIENT_GEMS', error: 'You do not have enough Gems.' }, 409, origin);
      }
      if (error && error.message === 'PLAYER_PROFILE_NOT_READY') {
        return json({ ok: false, code: 'PLAYER_PROFILE_NOT_READY', error: 'Your player profile is still being created. Please try again shortly.' }, 409, origin);
      }
      if (error && error.message === 'PLAYER_BALANCE_LIMIT') {
        return json({ ok: false, code: 'PLAYER_BALANCE_LIMIT', error: 'This account has reached the maximum supported reward balance.' }, 409, origin);
      }
      if (error && error.message === 'SERVICE_NOT_CONFIGURED') {
        return json({ ok: false, code: 'SERVICE_NOT_CONFIGURED', error: 'The secure Gems service has not been configured yet.' }, 503, origin);
      }
      if (error && error.message === 'INVALID_GEM_BALANCE') {
        return json({ ok: false, code: 'INVALID_GEM_BALANCE', error: 'Your Gems balance needs Owner review.' }, 409, origin);
      }
      console.error('Gems API request failed:', error && error.message ? error.message : 'unknown error');
      return json({ ok: false, code: 'GEMS_SERVICE_ERROR', error: 'The secure Gems service could not complete this request.' }, 502, origin);
    }
  }
};