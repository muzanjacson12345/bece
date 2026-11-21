import { isFirestoreBanActive } from "./ban-utils.mjs";
import { hasValidOwnerSession } from "./owner-utils.mjs";

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
    if (request.method !== 'POST' || url.pathname !== '/gems') {
      return json({ ok: false, error: 'NOT_FOUND' }, 404, origin);
    }
    let payload;
    try {
      const raw = await request.text();
      if (raw.length > 2048) return json({ ok: false, error: 'REQUEST_TOO_LARGE' }, 413, origin);
      payload = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: 'INVALID_JSON' }, 400, origin);
    }
    const authHeader = request.headers.get('authorization') || '';
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) return json({ ok: false, error: 'UNAUTHORIZED' }, 401, origin);
    try {
      const identity = await verifyFirebaseIdToken(tokenMatch[1]);
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
      const accessToken = await getFirestoreAccessToken(env);
      if (await isUserBanned(identity.uid, accessToken)) return json({ ok: false, code: 'USER_BANNED', error: 'This account cannot use Gems while banned.' }, 403, origin);
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