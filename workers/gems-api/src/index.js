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
  if (!doc || !doc.fields) return false;

  // Current app rules store ban expiry as Unix milliseconds in `until`.
  // Keep active=true support for legacy records during migration.
  if (doc.fields.active && doc.fields.active.booleanValue === true) return true;
  const until = parseIntegerField(doc.fields.until, NaN);
  return Number.isSafeInteger(until) && (until === 0 || until > Date.now());
}

async function isOwnerSession(uid, accessToken) {
  // Use the same Owner session model as the website and Firestore rules.
  const results = await Promise.all([
    getDocument('ownerSessions/' + encodeURIComponent(uid), accessToken),
    getDocument('config/owner', accessToken)
  ]);
  const session = results[0];
  const config = results[1];
  if (!session || !config || !session.fields || !config.fields) return false;

  const atValue = session.fields.at && session.fields.at.timestampValue;
  const createdAt = typeof atValue === 'string' ? Date.parse(atValue) : NaN;
  if (!Number.isFinite(createdAt) || createdAt + 30 * 60 * 1000 <= Date.now()) return false;

  const sessionPw1 = session.fields.pw1 && session.fields.pw1.stringValue;
  const sessionPw2 = session.fields.pw2 && session.fields.pw2.stringValue;
  const configPw1 = config.fields.pw1 && config.fields.pw1.stringValue;
  const configPw2 = config.fields.pw2 && config.fields.pw2.stringValue;
  return typeof sessionPw1 === 'string' && typeof sessionPw2 === 'string'
    && sessionPw1 === configPw1 && sessionPw2 === configPw2;
}


/* Generated from index.html. Rebuild whenever question IDs or answer keys change. */
const QUIZ_ANSWER_KEY = {"soc-1":"B","soc-2":"C","soc-3":"B","soc-4":"A","soc-5":"B","soc-6":"B","soc-7":"B","soc-8":"B","soc-9":"A","soc-10":"B","soc-11":"B","soc-12":"B","soc-13":"B","soc-14":"C","soc-15":"C","soc-16":"B","soc-17":"C","soc-18":"B","soc-19":"C","soc-20":"C","soc-21":"B","soc-22":"B","soc-23":"A","soc-24":"C","soc-25":"B","soc-26":"B","soc-27":"A","soc-28":"C","soc-29":"C","soc-30":"B","soc-31":"B","soc-32":"B","soc-33":"C","soc-34":"B","soc-35":"C","soc-36":"B","soc-37":"B","soc-38":"C","soc-39":"C","soc-40":"C","soc-41":"B","soc-42":"B","soc-43":"B","soc-44":"C","soc-45":"B","soc-46":"B","soc-47":"C","soc-48":"B","soc-49":"B","soc-50":"B","soc-51":"B","soc-52":"C","soc-53":"B","soc-54":"B","soc-55":"C","soc-56":"B","soc-57":"B","soc-58":"C","soc-59":"B","soc-60":"B","soc-61":"B","soc-62":"B","soc-63":"C","soc-64":"B","soc-65":"B","soc-66":"C","soc-67":"B","soc-68":"C","soc-69":"B","soc-70":"B","soc-71":"C","soc-72":"B","soc-73":"B","soc-74":"B","soc-75":"B","soc-76":"C","soc-77":"B","soc-78":"C","soc-79":"B","soc-80":"C","soc-81":"B","soc-82":"B","soc-83":"B","soc-84":"C","soc-85":"B","soc-86":"B","soc-87":"A","soc-88":"B","soc-89":"B","soc-90":"B","soc-91":"B","soc-92":"B","soc-93":"C","soc-94":"B","soc-95":"B","soc-96":"B","soc-97":"B","soc-98":"C","soc-99":"C","soc-100":"C","soc-101":"D","soc-102":"C","soc-103":"B","soc-104":"A","soc-105":"D","soc-106":"C","soc-107":"B","soc-108":"A","soc-109":"D","soc-110":"C","soc-111":"B","soc-112":"A","soc-113":"D","soc-114":"C","soc-115":"B","soc-116":"A","soc-117":"D","soc-118":"C","soc-119":"B","soc-120":"A","soc-121":"D","soc-122":"C","soc-123":"B","soc-124":"A","soc-125":"D","soc-126":"C","soc-127":"B","soc-128":"A","soc-129":"D","soc-130":"C","soc-131":"B","soc-132":"A","soc-133":"D","soc-134":"C","soc-135":"B","soc-136":"A","soc-137":"D","soc-138":"C","soc-139":"B","soc-140":"A","soc-141":"D","soc-142":"C","soc-143":"B","soc-144":"A","soc-145":"D","soc-146":"C","soc-147":"B","soc-148":"A","soc-149":"D","soc-150":"C","soc-151":"B","soc-152":"A","soc-153":"D","soc-154":"C","soc-155":"B","soc-156":"A","soc-157":"D","soc-158":"C","soc-159":"B","soc-160":"A","soc-161":"D","soc-162":"C","soc-163":"B","soc-164":"A","soc-165":"D","soc-166":"C","soc-167":"B","soc-168":"A","soc-169":"D","soc-170":"C","soc-171":"B","soc-172":"A","soc-173":"D","soc-174":"C","soc-175":"B","soc-176":"A","soc-177":"D","soc-178":"C","soc-179":"B","soc-180":"A","soc-181":"D","soc-182":"C","soc-183":"B","soc-184":"A","soc-185":"D","soc-186":"C","soc-187":"B","soc-188":"A","soc-189":"D","soc-190":"C","soc-191":"B","soc-192":"A","soc-193":"D","soc-194":"C","soc-195":"B","soc-196":"A","soc-197":"D","soc-198":"C","soc-199":"B","soc-200":"A","art-1":"B","art-2":"B","art-3":"C","art-4":"B","art-5":"A","art-6":"A","art-7":"A","art-8":"B","art-9":"A","art-10":"A","art-11":"B","art-12":"B","art-13":"C","art-14":"A","art-15":"B","art-16":"B","art-17":"B","art-18":"C","art-19":"B","art-20":"B","art-21":"C","art-22":"B","art-23":"C","art-24":"D","art-25":"B","art-26":"C","art-27":"C","art-28":"B","art-29":"B","art-30":"B","art-31":"C","art-32":"D","art-33":"B","art-34":"B","art-35":"B","art-36":"C","art-37":"C","art-38":"C","art-39":"C","art-40":"B","art-41":"C","art-42":"B","art-43":"C","art-44":"B","art-45":"C","art-46":"C","art-47":"C","art-48":"C","art-49":"B","art-50":"C","art-51":"C","art-52":"B","art-53":"B","art-54":"B","art-55":"C","art-56":"B","art-57":"B","art-58":"B","art-59":"C","art-60":"C","art-61":"B","art-62":"C","art-63":"B","art-64":"B","art-65":"B","art-66":"C","art-67":"D","art-68":"A","art-69":"C","art-70":"C","art-71":"C","art-72":"C","art-73":"B","art-74":"D","art-75":"C","art-76":"C","art-77":"B","art-78":"B","art-79":"C","art-80":"B","art-81":"B","art-82":"C","art-83":"C","art-84":"B","art-85":"C","art-86":"A","art-87":"B","art-88":"B","art-89":"B","art-90":"C","art-91":"B","art-92":"C","art-93":"C","art-94":"B","art-95":"D","art-96":"B","art-97":"B","art-98":"B","art-99":"B","art-100":"B","art-101":"D","art-102":"C","art-103":"B","art-104":"A","art-105":"D","art-106":"C","art-107":"B","art-108":"A","art-109":"D","art-110":"C","art-111":"B","art-112":"A","art-113":"D","art-114":"C","art-115":"B","art-116":"A","art-117":"D","art-118":"C","art-119":"B","art-120":"A","art-121":"D","art-122":"C","art-123":"B","art-124":"A","art-125":"D","art-126":"C","art-127":"B","art-128":"A","art-129":"D","art-130":"C","art-131":"B","art-132":"A","art-133":"D","art-134":"C","art-135":"B","art-136":"A","art-137":"D","art-138":"C","art-139":"B","art-140":"A","art-141":"D","art-142":"C","art-143":"B","art-144":"A","art-145":"D","art-146":"C","art-147":"B","art-148":"A","art-149":"D","art-150":"C","art-151":"B","art-152":"A","art-153":"D","art-154":"C","art-155":"B","art-156":"A","art-157":"D","art-158":"C","art-159":"B","art-160":"A","art-161":"D","art-162":"C","art-163":"B","art-164":"A","art-165":"D","art-166":"C","art-167":"B","art-168":"A","art-169":"D","art-170":"C","art-171":"B","art-172":"A","art-173":"D","art-174":"C","art-175":"B","art-176":"A","art-177":"D","art-178":"C","art-179":"B","art-180":"A","art-181":"D","art-182":"C","art-183":"B","art-184":"A","art-185":"D","art-186":"C","art-187":"B","art-188":"A","art-189":"D","art-190":"C","art-191":"B","art-192":"A","art-193":"D","art-194":"C","art-195":"B","art-196":"A","art-197":"D","art-198":"C","art-199":"B","art-200":"A","sci-1":"B","sci-2":"B","sci-3":"A","sci-4":"B","sci-5":"C","sci-6":"A","sci-7":"C","sci-8":"D","sci-9":"A","sci-10":"A","sci-11":"B","sci-12":"C","sci-13":"B","sci-14":"C","sci-15":"C","sci-16":"A","sci-17":"B","sci-18":"C","sci-19":"D","sci-20":"A","sci-21":"B","sci-22":"B","sci-23":"C","sci-24":"B","sci-25":"B","sci-26":"C","sci-27":"B","sci-28":"A","sci-29":"D","sci-30":"C","sci-31":"B","sci-32":"A","sci-33":"D","sci-34":"C","sci-35":"B","sci-36":"A","sci-37":"D","sci-38":"C","sci-39":"B","sci-40":"A","sci-41":"D","sci-42":"C","sci-43":"B","sci-44":"A","sci-45":"D","sci-46":"C","sci-47":"B","sci-48":"A","sci-49":"D","sci-50":"C","sci-51":"B","sci-52":"A","sci-53":"D","sci-54":"C","sci-55":"B","sci-56":"A","sci-57":"D","sci-58":"C","sci-59":"B","sci-60":"A","sci-61":"D","sci-62":"C","sci-63":"B","sci-64":"A","sci-65":"D","sci-66":"C","sci-67":"B","sci-68":"A","sci-69":"D","sci-70":"C","sci-71":"B","sci-72":"A","sci-73":"D","sci-74":"C","sci-75":"B","sci-76":"A","sci-77":"D","sci-78":"C","sci-79":"B","sci-80":"A","sci-81":"D","sci-82":"C","sci-83":"B","sci-84":"A","sci-85":"D","sci-86":"C","sci-87":"B","sci-88":"A","sci-89":"D","sci-90":"C","sci-91":"B","sci-92":"A","sci-93":"D","sci-94":"C","sci-95":"B","sci-96":"A","sci-97":"D","sci-98":"C","sci-99":"B","sci-100":"A","sci-101":"D","sci-102":"C","sci-103":"B","sci-104":"A","sci-105":"D","sci-106":"C","sci-107":"B","sci-108":"A","sci-109":"D","sci-110":"C","sci-111":"B","sci-112":"A","sci-113":"D","sci-114":"C","sci-115":"B","sci-116":"A","sci-117":"D","sci-118":"C","sci-119":"B","sci-120":"A","sci-121":"D","sci-122":"C","sci-123":"B","sci-124":"A","sci-125":"D","sci-126":"C","sci-127":"B","sci-128":"A","sci-129":"D","sci-130":"C","sci-131":"B","sci-132":"A","sci-133":"D","sci-134":"C","sci-135":"B","sci-136":"A","sci-137":"D","sci-138":"C","sci-139":"B","sci-140":"A","sci-141":"D","sci-142":"C","sci-143":"B","sci-144":"A","sci-145":"D","sci-146":"C","sci-147":"B","sci-148":"A","sci-149":"D","sci-150":"C","sci-151":"B","sci-152":"A","sci-153":"D","sci-154":"C","sci-155":"B","sci-156":"A","sci-157":"D","sci-158":"C","sci-159":"B","sci-160":"A","sci-161":"D","sci-162":"C","sci-163":"B","sci-164":"A","sci-165":"D","sci-166":"C","sci-167":"B","sci-168":"A","sci-169":"D","sci-170":"C","sci-171":"B","sci-172":"A","sci-173":"D","sci-174":"C","sci-175":"B","sci-176":"A","sci-177":"D","sci-178":"C","sci-179":"B","sci-180":"A","sci-181":"D","sci-182":"C","sci-183":"B","sci-184":"A","sci-185":"D","sci-186":"C","sci-187":"B","sci-188":"A","sci-189":"D","sci-190":"C","sci-191":"B","sci-192":"A","sci-193":"D","sci-194":"C","sci-195":"B","sci-196":"A","sci-197":"D","sci-198":"C","sci-199":"B","sci-200":"A","mat-1":"B","mat-2":"A","mat-3":"C","mat-4":"C","mat-5":"B","mat-6":"B","mat-7":"B","mat-8":"A","mat-9":"C","mat-10":"C","mat-11":"B","mat-12":"B","mat-13":"A","mat-14":"C","mat-15":"B","mat-16":"B","mat-17":"B","mat-18":"A","mat-19":"A","mat-20":"B","mat-21":"B","mat-22":"B","mat-23":"B","mat-24":"B","mat-25":"B","mat-26":"B","mat-27":"B","mat-28":"A","mat-29":"C","mat-30":"B","mat-31":"B","mat-32":"B","mat-33":"B","mat-34":"B","mat-35":"B","mat-36":"B","mat-37":"B","mat-38":"B","mat-39":"A","mat-40":"B","mat-41":"B","mat-42":"C","mat-43":"B","mat-44":"A","mat-45":"B","mat-46":"B","mat-47":"B","mat-48":"A","mat-49":"B","mat-50":"D","mat-51":"D","mat-52":"C","mat-53":"A","mat-54":"D","mat-55":"C","mat-56":"D","mat-57":"C","mat-58":"B","mat-59":"B","mat-60":"D","mat-61":"A","mat-62":"A","mat-63":"A","mat-64":"C","mat-65":"A","mat-66":"D","mat-67":"C","mat-68":"D","mat-69":"C","mat-70":"B","mat-71":"D","mat-72":"C","mat-73":"B","mat-74":"B","mat-75":"C","mat-76":"B","mat-77":"D","mat-78":"A","mat-79":"B","mat-80":"C","mat-81":"A","mat-82":"D","mat-83":"A","mat-84":"D","mat-85":"B","mat-86":"B","mat-87":"B","mat-88":"C","mat-89":"A","mat-90":"C","mat-91":"B","mat-92":"C","mat-93":"B","mat-94":"B","mat-95":"B","mat-96":"A","mat-97":"B","mat-98":"B","mat-99":"B","mat-100":"B","mat-101":"D","mat-102":"C","mat-103":"B","mat-104":"A","mat-105":"D","mat-106":"C","mat-107":"B","mat-108":"A","mat-109":"D","mat-110":"C","mat-111":"B","mat-112":"A","mat-113":"D","mat-114":"C","mat-115":"B","mat-116":"A","mat-117":"D","mat-118":"C","mat-119":"B","mat-120":"A","mat-121":"D","mat-122":"C","mat-123":"B","mat-124":"A","mat-125":"D","mat-126":"C","mat-127":"B","mat-128":"A","mat-129":"D","mat-130":"C","mat-131":"B","mat-132":"A","mat-133":"D","mat-134":"C","mat-135":"B","mat-136":"A","mat-137":"D","mat-138":"C","mat-139":"B","mat-140":"A","mat-141":"D","mat-142":"C","mat-143":"B","mat-144":"A","mat-145":"D","mat-146":"C","mat-147":"B","mat-148":"A","mat-149":"D","mat-150":"C","mat-151":"B","mat-152":"A","mat-153":"D","mat-154":"C","mat-155":"B","mat-156":"A","mat-157":"D","mat-158":"C","mat-159":"B","mat-160":"A","mat-161":"D","mat-162":"C","mat-163":"B","mat-164":"A","mat-165":"D","mat-166":"C","mat-167":"B","mat-168":"A","mat-169":"D","mat-170":"C","mat-171":"B","mat-172":"A","mat-173":"D","mat-174":"C","mat-175":"B","mat-176":"A","mat-177":"D","mat-178":"C","mat-179":"B","mat-180":"A","mat-181":"D","mat-182":"C","mat-183":"B","mat-184":"A","mat-185":"D","mat-186":"C","mat-187":"B","mat-188":"A","mat-189":"D","mat-190":"C","mat-191":"B","mat-192":"A","mat-193":"D","mat-194":"C","mat-195":"B","mat-196":"A","mat-197":"D","mat-198":"C","mat-199":"B","mat-200":"A","com-1":"D","com-2":"A","com-3":"A","com-4":"C","com-5":"D","com-6":"C","com-7":"C","com-8":"A","com-9":"B","com-10":"C","com-11":"B","com-12":"C","com-13":"A","com-14":"D","com-15":"D","com-16":"A","com-17":"A","com-18":"D","com-19":"C","com-20":"B","com-21":"C","com-22":"A","com-23":"A","com-24":"A","com-25":"B","com-26":"B","com-27":"D","com-28":"B","com-29":"A","com-30":"A","com-31":"B","com-32":"A","com-33":"D","com-34":"C","com-35":"C","com-36":"B","com-37":"A","com-38":"B","com-39":"D","com-40":"D","com-41":"C","com-42":"A","com-43":"C","com-44":"B","com-45":"B","com-46":"C","com-47":"C","com-48":"B","com-49":"B","com-50":"D","com-51":"D","com-52":"D","com-53":"A","com-54":"B","com-55":"B","com-56":"B","com-57":"A","com-58":"B","com-59":"D","com-60":"D","com-61":"D","com-62":"B","com-63":"B","com-64":"B","com-65":"C","com-66":"A","com-67":"C","com-68":"C","com-69":"A","com-70":"A","com-71":"C","com-72":"B","com-73":"C","com-74":"C","com-75":"A","com-76":"B","com-77":"D","com-78":"B","com-79":"D","com-80":"A","com-81":"B","com-82":"D","com-83":"C","com-84":"D","com-85":"D","com-86":"B","com-87":"B","com-88":"B","com-89":"D","com-90":"C","com-91":"D","com-92":"C","com-93":"A","com-94":"D","com-95":"A","com-96":"B","com-97":"A","com-98":"A","com-99":"D","com-100":"D","com-101":"D","com-102":"C","com-103":"B","com-104":"A","com-105":"D","com-106":"C","com-107":"B","com-108":"A","com-109":"D","com-110":"C","com-111":"B","com-112":"A","com-113":"D","com-114":"C","com-115":"B","com-116":"A","com-117":"D","com-118":"C","com-119":"B","com-120":"A","com-121":"D","com-122":"C","com-123":"B","com-124":"A","com-125":"D","com-126":"C","com-127":"B","com-128":"A","com-129":"D","com-130":"C","com-131":"B","com-132":"A","com-133":"D","com-134":"C","com-135":"B","com-136":"A","com-137":"D","com-138":"C","com-139":"B","com-140":"A","com-141":"D","com-142":"C","com-143":"B","com-144":"A","com-145":"D","com-146":"C","com-147":"B","com-148":"A","com-149":"D","com-150":"C","com-151":"B","com-152":"A","com-153":"D","com-154":"C","com-155":"B","com-156":"A","com-157":"D","com-158":"C","com-159":"B","com-160":"A","com-161":"D","com-162":"C","com-163":"B","com-164":"A","com-165":"D","com-166":"C","com-167":"B","com-168":"A","com-169":"D","com-170":"C","com-171":"B","com-172":"A","com-173":"D","com-174":"C","com-175":"B","com-176":"A","com-177":"D","com-178":"C","com-179":"B","com-180":"A","com-181":"D","com-182":"C","com-183":"B","com-184":"A","com-185":"D","com-186":"C","com-187":"B","com-188":"A","com-189":"D","com-190":"C","com-191":"B","com-192":"A","com-193":"D","com-194":"C","com-195":"B","com-196":"A","com-197":"D","com-198":"C","com-199":"B","com-200":"A","rme-1":"A","rme-2":"B","rme-3":"C","rme-4":"D","rme-5":"A","rme-6":"B","rme-7":"C","rme-8":"D","rme-9":"A","rme-10":"B","rme-11":"C","rme-12":"D","rme-13":"A","rme-14":"B","rme-15":"C","rme-16":"D","rme-17":"A","rme-18":"B","rme-19":"C","rme-20":"D","rme-21":"A","rme-22":"B","rme-23":"C","rme-24":"D","rme-25":"A","rme-26":"B","rme-27":"C","rme-28":"D","rme-29":"A","rme-30":"B","rme-31":"C","rme-32":"D","rme-33":"A","rme-34":"B","rme-35":"C","rme-36":"D","rme-37":"A","rme-38":"B","rme-39":"C","rme-40":"D","rme-41":"A","rme-42":"B","rme-43":"C","rme-44":"D","rme-45":"A","rme-46":"B","rme-47":"C","rme-48":"D","rme-49":"A","rme-50":"B","rme-51":"C","rme-52":"D","rme-53":"A","rme-54":"B","rme-55":"C","rme-56":"D","rme-57":"A","rme-58":"B","rme-59":"C","rme-60":"D","rme-61":"A","rme-62":"B","rme-63":"C","rme-64":"D","rme-65":"A","rme-66":"B","rme-67":"C","rme-68":"D","rme-69":"A","rme-70":"B","rme-71":"C","rme-72":"D","rme-73":"A","rme-74":"B","rme-75":"C","rme-76":"D","rme-77":"A","rme-78":"B","rme-79":"C","rme-80":"D","rme-81":"A","rme-82":"B","rme-83":"C","rme-84":"D","rme-85":"A","rme-86":"B","rme-87":"C","rme-88":"D","rme-89":"A","rme-90":"B","rme-91":"C","rme-92":"D","rme-93":"A","rme-94":"B","rme-95":"C","rme-96":"D","rme-97":"A","rme-98":"B","rme-99":"C","rme-100":"D","rme-101":"A","rme-102":"B","rme-103":"C","rme-104":"D","rme-105":"A","rme-106":"B","rme-107":"C","rme-108":"D","rme-109":"A","rme-110":"B","rme-111":"C","rme-112":"D","rme-113":"A","rme-114":"B","rme-115":"B","rme-116":"A","rme-117":"D","rme-118":"C","rme-119":"B","rme-120":"A","rme-121":"D","rme-122":"C","rme-123":"B","rme-124":"A","rme-125":"D","rme-126":"C","rme-127":"B","rme-128":"A","rme-129":"D","rme-130":"C","rme-131":"B","rme-132":"A","rme-133":"D","rme-134":"C","rme-135":"B","rme-136":"A","rme-137":"D","rme-138":"C","rme-139":"B","rme-140":"A","rme-141":"D","rme-142":"C","rme-143":"B","rme-144":"A","rme-145":"D","rme-146":"C","rme-147":"B","rme-148":"A","rme-149":"D","rme-150":"C","rme-151":"B","rme-152":"A","rme-153":"D","rme-154":"C","rme-155":"B","rme-156":"A","rme-157":"D","rme-158":"C","rme-159":"B","rme-160":"A","rme-161":"D","rme-162":"C","rme-163":"B","rme-164":"A","rme-165":"D","rme-166":"C","rme-167":"B","rme-168":"A","rme-169":"D","rme-170":"C","rme-171":"B","rme-172":"A","rme-173":"D","rme-174":"C","rme-175":"B","rme-176":"A","rme-177":"D","rme-178":"C","rme-179":"B","rme-180":"A","rme-181":"D","rme-182":"C","rme-183":"B","rme-184":"A","rme-185":"D","rme-186":"C","rme-187":"B","rme-188":"A","rme-189":"D","rme-190":"C","rme-191":"B","rme-192":"A","rme-193":"D","rme-194":"C","rme-195":"B","rme-196":"A","rme-197":"D","rme-198":"C","rme-199":"B","rme-200":"A","fre-1":"D","fre-2":"C","fre-3":"B","fre-4":"A","fre-5":"D","fre-6":"C","fre-7":"B","fre-8":"A","fre-9":"D","fre-10":"C","fre-11":"B","fre-12":"A","fre-13":"D","fre-14":"C","fre-15":"B","fre-16":"A","fre-17":"D","fre-18":"C","fre-19":"B","fre-20":"A","fre-21":"D","fre-22":"C","fre-23":"B","fre-24":"A","fre-25":"D","fre-26":"C","fre-27":"B","fre-28":"A","fre-29":"D","fre-30":"C","fre-31":"B","fre-32":"A","fre-33":"D","fre-34":"C","fre-35":"B","fre-36":"A","fre-37":"D","fre-38":"C","fre-39":"B","fre-40":"A","fre-41":"D","fre-42":"C","fre-43":"B","fre-44":"A","fre-45":"D","fre-46":"C","fre-47":"B","fre-48":"A","fre-49":"D","fre-50":"C","fre-51":"B","fre-52":"A","fre-53":"D","fre-54":"C","fre-55":"B","fre-56":"A","fre-57":"D","fre-58":"C","fre-59":"B","fre-60":"A","fre-61":"D","fre-62":"C","fre-63":"B","fre-64":"A","fre-65":"D","fre-66":"C","fre-67":"B","fre-68":"A","fre-69":"D","fre-70":"C","fre-71":"B","fre-72":"A","fre-73":"D","fre-74":"C","fre-75":"B","fre-76":"A","fre-77":"D","fre-78":"C","fre-79":"B","fre-80":"A","fre-81":"D","fre-82":"C","fre-83":"B","fre-84":"A","fre-85":"D","fre-86":"C","fre-87":"B","fre-88":"A","fre-89":"D","fre-90":"C","fre-91":"B","fre-92":"A","fre-93":"D","fre-94":"C","fre-95":"B","fre-96":"A","fre-97":"D","fre-98":"C","fre-99":"B","fre-100":"A","fre-101":"D","fre-102":"C","fre-103":"B","fre-104":"A","fre-105":"D","fre-106":"C","fre-107":"B","fre-108":"A","fre-109":"D","fre-110":"C","fre-111":"B","fre-112":"A","fre-113":"D","fre-114":"C","fre-115":"B","fre-116":"A","fre-117":"D","fre-118":"C","fre-119":"B","fre-120":"A","fre-121":"D","fre-122":"C","fre-123":"B","fre-124":"A","fre-125":"D","fre-126":"C","fre-127":"B","fre-128":"A","fre-129":"D","fre-130":"C","fre-131":"B","fre-132":"A","fre-133":"D","fre-134":"C","fre-135":"B","fre-136":"A","fre-137":"D","fre-138":"C","fre-139":"B","fre-140":"A","fre-141":"D","fre-142":"C","fre-143":"B","fre-144":"A","fre-145":"D","fre-146":"C","fre-147":"B","fre-148":"A","fre-149":"D","fre-150":"C","fre-151":"B","fre-152":"A","fre-153":"D","fre-154":"C","fre-155":"B","fre-156":"A","fre-157":"D","fre-158":"C","fre-159":"B","fre-160":"A","fre-161":"D","fre-162":"C","fre-163":"B","fre-164":"A","fre-165":"D","fre-166":"C","fre-167":"B","fre-168":"A","fre-169":"D","fre-170":"C","fre-171":"B","fre-172":"A","fre-173":"D","fre-174":"C","fre-175":"B","fre-176":"A","fre-177":"D","fre-178":"C","fre-179":"B","fre-180":"A","fre-181":"D","fre-182":"C","fre-183":"B","fre-184":"A","fre-185":"D","fre-186":"C","fre-187":"B","fre-188":"A","fre-189":"D","fre-190":"C","fre-191":"B","fre-192":"A","fre-193":"D","fre-194":"C","fre-195":"B","fre-196":"A","fre-197":"D","fre-198":"C","fre-199":"B","fre-200":"A","ct-1":"D","ct-2":"C","ct-3":"B","ct-4":"A","ct-5":"D","ct-6":"C","ct-7":"B","ct-8":"A","ct-9":"D","ct-10":"C","ct-11":"B","ct-12":"A","ct-13":"D","ct-14":"C","ct-15":"B","ct-16":"A","ct-17":"D","ct-18":"C","ct-19":"B","ct-20":"A","ct-21":"D","ct-22":"C","ct-23":"B","ct-24":"A","ct-25":"D","ct-26":"C","ct-27":"B","ct-28":"A","ct-29":"D","ct-30":"C","ct-31":"B","ct-32":"A","ct-33":"D","ct-34":"C","ct-35":"B","ct-36":"A","ct-37":"D","ct-38":"C","ct-39":"B","ct-40":"A","ct-41":"D","ct-42":"C","ct-43":"B","ct-44":"A","ct-45":"D","ct-46":"C","ct-47":"B","ct-48":"A","ct-49":"D","ct-50":"C","ct-51":"B","ct-52":"A","ct-53":"D","ct-54":"C","ct-55":"B","ct-56":"A","ct-57":"D","ct-58":"C","ct-59":"B","ct-60":"A","ct-61":"D","ct-62":"C","ct-63":"B","ct-64":"A","ct-65":"D","ct-66":"C","ct-67":"B","ct-68":"A","ct-69":"D","ct-70":"C","ct-71":"B","ct-72":"A","ct-73":"D","ct-74":"C","ct-75":"B","ct-76":"A","ct-77":"D","ct-78":"C","ct-79":"B","ct-80":"A","ct-81":"D","ct-82":"C","ct-83":"B","ct-84":"A","ct-85":"D","ct-86":"C","ct-87":"B","ct-88":"A","ct-89":"D","ct-90":"C","ct-91":"B","ct-92":"A","ct-93":"D","ct-94":"C","ct-95":"B","ct-96":"A","ct-97":"D","ct-98":"C","ct-99":"B","ct-100":"A","ct-101":"D","ct-102":"C","ct-103":"B","ct-104":"A","ct-105":"D","ct-106":"C","ct-107":"B","ct-108":"A","ct-109":"D","ct-110":"C","ct-111":"B","ct-112":"A","ct-113":"D","ct-114":"C","ct-115":"B","ct-116":"A","ct-117":"D","ct-118":"C","ct-119":"B","ct-120":"A","ct-121":"D","ct-122":"C","ct-123":"B","ct-124":"A","ct-125":"D","ct-126":"C","ct-127":"B","ct-128":"A","ct-129":"D","ct-130":"C","ct-131":"B","ct-132":"A","ct-133":"D","ct-134":"C","ct-135":"B","ct-136":"A","ct-137":"D","ct-138":"C","ct-139":"B","ct-140":"A","ct-141":"D","ct-142":"C","ct-143":"B","ct-144":"A","ct-145":"D","ct-146":"C","ct-147":"B","ct-148":"A","ct-149":"D","ct-150":"C","ct-151":"B","ct-152":"A","ct-153":"D","ct-154":"C","ct-155":"B","ct-156":"A","ct-157":"D","ct-158":"C","ct-159":"B","ct-160":"A","ct-161":"D","ct-162":"C","ct-163":"B","ct-164":"A","ct-165":"D","ct-166":"C","ct-167":"B","ct-168":"A","ct-169":"D","ct-170":"C","ct-171":"B","ct-172":"A","ct-173":"D","ct-174":"C","ct-175":"B","ct-176":"A","ct-177":"D","ct-178":"C","ct-179":"B","ct-180":"A","ct-181":"D","ct-182":"C","ct-183":"B","ct-184":"A","ct-185":"D","ct-186":"C","ct-187":"B","ct-188":"A","ct-189":"D","ct-190":"C","ct-191":"B","ct-192":"A","ct-193":"D","ct-194":"C","ct-195":"B","ct-196":"A","ct-197":"D","ct-198":"C","ct-199":"B","ct-200":"A"};
const QUIZ_CHALLENGE_POOL = [{"id":"answered-5","metric":"answered","target":5,"reward":20,"detail":"Answer 5 questions in your practice sessions"},{"id":"answered-8","metric":"answered","target":8,"reward":24,"detail":"Answer 8 questions in your practice sessions"},{"id":"answered-10","metric":"answered","target":10,"reward":27,"detail":"Answer 10 questions in your practice sessions"},{"id":"answered-12","metric":"answered","target":12,"reward":30,"detail":"Answer 12 questions in your practice sessions"},{"id":"answered-15","metric":"answered","target":15,"reward":35,"detail":"Answer 15 questions in your practice sessions"},{"id":"answered-20","metric":"answered","target":20,"reward":36,"detail":"Answer 20 questions in your practice sessions"},{"id":"answered-25","metric":"answered","target":25,"reward":36,"detail":"Answer 25 questions in your practice sessions"},{"id":"correct-3","metric":"correct","target":3,"reward":17,"detail":"Get 3 answers correct"},{"id":"correct-5","metric":"correct","target":5,"reward":20,"detail":"Get 5 answers correct"},{"id":"correct-8","metric":"correct","target":8,"reward":24,"detail":"Get 8 answers correct"},{"id":"correct-10","metric":"correct","target":10,"reward":27,"detail":"Get 10 answers correct"},{"id":"correct-12","metric":"correct","target":12,"reward":30,"detail":"Get 12 answers correct"},{"id":"correct-15","metric":"correct","target":15,"reward":35,"detail":"Get 15 answers correct"},{"id":"correct-20","metric":"correct","target":20,"reward":36,"detail":"Get 20 answers correct"},{"id":"quizzes-1","metric":"quizzes","target":1,"reward":14,"detail":"Finish 1 practice quiz"},{"id":"quizzes-2","metric":"quizzes","target":2,"reward":15,"detail":"Finish 2 practice quizzes"},{"id":"quizzes-3","metric":"quizzes","target":3,"reward":17,"detail":"Finish 3 practice quizzes"},{"id":"quizzes-4","metric":"quizzes","target":4,"reward":18,"detail":"Finish 4 practice quizzes"},{"id":"subjects-2","metric":"subjects","target":2,"reward":15,"detail":"Practise questions from 2 different subjects"},{"id":"subjects-3","metric":"subjects","target":3,"reward":17,"detail":"Practise questions from 3 different subjects"},{"id":"subjects-4","metric":"subjects","target":4,"reward":18,"detail":"Practise questions from 4 different subjects"},{"id":"subjects-5","metric":"subjects","target":5,"reward":20,"detail":"Practise questions from 5 different subjects"},{"id":"perfect-1","metric":"perfect","target":1,"reward":14,"detail":"Complete 1 quiz with every answer correct"},{"id":"perfect-2","metric":"perfect","target":2,"reward":15,"detail":"Complete 2 quizzes with every answer correct"},{"id":"perfect-3","metric":"perfect","target":3,"reward":17,"detail":"Complete 3 quizzes with every answer correct"},{"id":"longQuiz-1","metric":"longQuiz","target":1,"reward":14,"detail":"Complete 1 quiz with at least 10 questions"},{"id":"longQuiz-2","metric":"longQuiz","target":2,"reward":15,"detail":"Complete 2 quizzes with at least 10 questions"},{"id":"longQuiz-3","metric":"longQuiz","target":3,"reward":17,"detail":"Complete 3 quizzes with at least 10 questions"},{"id":"mixed-1","metric":"mixed","target":1,"reward":14,"detail":"Complete 1 quiz covering 3 or more subjects"},{"id":"mixed-2","metric":"mixed","target":2,"reward":15,"detail":"Complete 2 quizzes covering 3 or more subjects"},{"id":"mixed-3","metric":"mixed","target":3,"reward":17,"detail":"Complete 3 quizzes covering 3 or more subjects"},{"id":"soc-4","metric":"soc","target":4,"reward":18,"detail":"Answer 4 Social Studies questions"},{"id":"soc-6","metric":"soc","target":6,"reward":21,"detail":"Answer 6 Social Studies questions"},{"id":"soc-8","metric":"soc","target":8,"reward":24,"detail":"Answer 8 Social Studies questions"},{"id":"soc-10","metric":"soc","target":10,"reward":27,"detail":"Answer 10 Social Studies questions"},{"id":"art-3","metric":"art","target":3,"reward":17,"detail":"Answer 3 Creative Arts questions"},{"id":"art-5","metric":"art","target":5,"reward":20,"detail":"Answer 5 Creative Arts questions"},{"id":"art-7","metric":"art","target":7,"reward":23,"detail":"Answer 7 Creative Arts questions"},{"id":"art-9","metric":"art","target":9,"reward":26,"detail":"Answer 9 Creative Arts questions"},{"id":"mat-4","metric":"mat","target":4,"reward":18,"detail":"Answer 4 Mathematics questions"},{"id":"mat-6","metric":"mat","target":6,"reward":21,"detail":"Answer 6 Mathematics questions"},{"id":"mat-8","metric":"mat","target":8,"reward":24,"detail":"Answer 8 Mathematics questions"},{"id":"mat-10","metric":"mat","target":10,"reward":27,"detail":"Answer 10 Mathematics questions"},{"id":"mat-12","metric":"mat","target":12,"reward":30,"detail":"Answer 12 Mathematics questions"},{"id":"com-3","metric":"com","target":3,"reward":17,"detail":"Answer 3 Computing questions"},{"id":"com-5","metric":"com","target":5,"reward":20,"detail":"Answer 5 Computing questions"},{"id":"com-7","metric":"com","target":7,"reward":23,"detail":"Answer 7 Computing questions"},{"id":"com-9","metric":"com","target":9,"reward":26,"detail":"Answer 9 Computing questions"},{"id":"rme-3","metric":"rme","target":3,"reward":17,"detail":"Answer 3 RME questions"},{"id":"rme-5","metric":"rme","target":5,"reward":20,"detail":"Answer 5 RME questions"},{"id":"rme-7","metric":"rme","target":7,"reward":23,"detail":"Answer 7 RME questions"},{"id":"rme-9","metric":"rme","target":9,"reward":26,"detail":"Answer 9 RME questions"},{"id":"sci-3","metric":"sci","target":3,"reward":17,"detail":"Answer 3 Integrated Science questions"},{"id":"sci-5","metric":"sci","target":5,"reward":20,"detail":"Answer 5 Integrated Science questions"},{"id":"sci-7","metric":"sci","target":7,"reward":23,"detail":"Answer 7 Integrated Science questions"},{"id":"sci-9","metric":"sci","target":9,"reward":26,"detail":"Answer 9 Integrated Science questions"},{"id":"sci-12","metric":"sci","target":12,"reward":30,"detail":"Answer 12 Integrated Science questions"},{"id":"fre-3","metric":"fre","target":3,"reward":17,"detail":"Answer 3 French questions"},{"id":"fre-5","metric":"fre","target":5,"reward":20,"detail":"Answer 5 French questions"},{"id":"fre-7","metric":"fre","target":7,"reward":23,"detail":"Answer 7 French questions"},{"id":"fre-9","metric":"fre","target":9,"reward":26,"detail":"Answer 9 French questions"},{"id":"fre-12","metric":"fre","target":12,"reward":30,"detail":"Answer 12 French questions"},{"id":"ct-3","metric":"ct","target":3,"reward":17,"detail":"Answer 3 Career Technology questions"},{"id":"ct-5","metric":"ct","target":5,"reward":20,"detail":"Answer 5 Career Technology questions"},{"id":"ct-7","metric":"ct","target":7,"reward":23,"detail":"Answer 7 Career Technology questions"},{"id":"ct-9","metric":"ct","target":9,"reward":26,"detail":"Answer 9 Career Technology questions"},{"id":"ct-12","metric":"ct","target":12,"reward":30,"detail":"Answer 12 Career Technology questions"}];
const QUIZ_ACHIEVEMENTS = [{"id":"first-answer","metric":"answered","target":1},{"id":"curious-mind","metric":"answered","target":25},{"id":"question-pro","metric":"answered","target":100},{"id":"question-veteran","metric":"answered","target":250},{"id":"question-master","metric":"answered","target":500},{"id":"question-legend","metric":"answered","target":1000},{"id":"question-1500","metric":"answered","target":1500},{"id":"question-2500","metric":"answered","target":2500},{"id":"getting-sharp","metric":"correct","target":25},{"id":"accuracy-star","metric":"correct","target":100},{"id":"accuracy-250","metric":"correct","target":250},{"id":"accuracy-500","metric":"correct","target":500},{"id":"accuracy-1000","metric":"correct","target":1000},{"id":"accuracy-2000","metric":"correct","target":2000},{"id":"quiz-beginner","metric":"quizzes","target":1},{"id":"quiz-regular","metric":"quizzes","target":10},{"id":"quiz-25","metric":"quizzes","target":25},{"id":"quiz-50","metric":"quizzes","target":50},{"id":"quiz-100","metric":"quizzes","target":100},{"id":"quiz-250","metric":"quizzes","target":250},{"id":"subject-explorer","metric":"subjects","target":3},{"id":"all-rounder","metric":"subjects","target":5},{"id":"all-six-subjects","metric":"subjects","target":6},{"id":"science-starter","metric":"sci","target":10},{"id":"science-scholar","metric":"sci","target":50},{"id":"science-master","metric":"sci","target":100},{"id":"all-seven-subjects","metric":"subjects","target":7},{"id":"french-starter","metric":"fre","target":10},{"id":"french-learner","metric":"fre","target":50},{"id":"french-confident","metric":"fre","target":100},{"id":"career-starter","metric":"ct","target":10},{"id":"career-learner","metric":"ct","target":50},{"id":"career-master","metric":"ct","target":100},{"id":"all-nine-subjects","metric":"subjects","target":8},{"id":"perfect-round","metric":"perfect","target":1},{"id":"perfect-5","metric":"perfect","target":5},{"id":"perfect-10","metric":"perfect","target":10},{"id":"perfect-25","metric":"perfect","target":25},{"id":"three-day-streak","metric":"streak","target":3},{"id":"week-streak","metric":"streak","target":7},{"id":"streak-14","metric":"streak","target":14},{"id":"streak-30","metric":"streak","target":30},{"id":"streak-60","metric":"streak","target":60},{"id":"streak-100","metric":"streak","target":100}];
const QUIZ_SUBJECT_NAMES = {
  soc:'Social Studies', art:'Creative Arts', mat:'Mathematics',
  com:'Computing', rme:'Religious & Moral Education',
  sci:'Integrated Science', fre:'French', 'ct-':'Career Technology'
};
function quizChallengeHash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function quizDailyChallengeSet(day) {
  const pool = QUIZ_CHALLENGE_POOL.slice();
  let seed = quizChallengeHash('bece-challenges-' + day);
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}
function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') return value;
  if (Object.prototype.hasOwnProperty.call(value, 'stringValue')) return value.stringValue;
  if (Object.prototype.hasOwnProperty.call(value, 'integerValue')) return Number(value.integerValue);
  if (Object.prototype.hasOwnProperty.call(value, 'doubleValue')) return Number(value.doubleValue);
  if (Object.prototype.hasOwnProperty.call(value, 'booleanValue')) return value.booleanValue;
  if (Object.prototype.hasOwnProperty.call(value, 'timestampValue')) return value.timestampValue;
  if (Object.prototype.hasOwnProperty.call(value, 'nullValue')) return null;
  if (Object.prototype.hasOwnProperty.call(value, 'arrayValue')) {
    return (value.arrayValue && value.arrayValue.values || []).map(decodeFirestoreValue);
  }
  if (Object.prototype.hasOwnProperty.call(value, 'mapValue')) {
    return Object.fromEntries(Object.entries(value.mapValue && value.mapValue.fields || {}).map(([k, v]) => [k, decodeFirestoreValue(v)]));
  }
  return null;
}
function decodeFirestoreDocument(doc) {
  return Object.fromEntries(Object.entries(doc && doc.fields || {}).map(([k, v]) => [k, decodeFirestoreValue(v)]));
}
function encodeFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isSafeInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  if (typeof value === 'object') {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encodeFirestoreValue(v)])) } };
  }
  throw new Error('UNSUPPORTED_FIRESTORE_VALUE');
}
function encodeFirestoreFields(value) {
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encodeFirestoreValue(v)]));
}
function quizDateParts(now) {
  const day = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  const weekday = (now.getUTCDay() + 6) % 7;
  const weekKey = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - weekday)).toISOString().slice(0, 10);
  return { day, yesterday, weekKey };
}
function isDocumentBanned(doc, nowMs) {
  if (!doc || !doc.fields) return false;
  if (doc.fields.active && doc.fields.active.booleanValue === true) return true;
  const until = parseIntegerField(doc.fields.until, NaN);
  return Number.isSafeInteger(until) && (until === 0 || until > nowMs);
}
function clampRewardRate(value) {
  const n = Number(value) || 1;
  return Math.min(3, Math.max(0.5, n));
}
async function applyQuizReward(uid, payload, accessToken) {
  const qids = payload && payload.questionIds;
  const answers = payload && payload.answers;
  const kind = payload && payload.kind === 'daily' ? 'daily' : 'practice';
  if (!Array.isArray(qids) || qids.length < 1 || qids.length > 200) throw new Error('INVALID_QUIZ_QUESTIONS');
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new Error('INVALID_QUIZ_ANSWERS');
  if (new Set(qids).size !== qids.length) throw new Error('DUPLICATE_QUIZ_QUESTIONS');

  const qidSet = new Set();
  for (const id of qids) {
    if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(QUIZ_ANSWER_KEY, id)) throw new Error('UNKNOWN_QUIZ_QUESTION');
    qidSet.add(id);
  }
  const answerIds = Object.keys(answers);
  if (answerIds.length < 1 || answerIds.length > qids.length) throw new Error('NO_QUIZ_ANSWERS');
  for (const id of answerIds) {
    if (!qidSet.has(id) || !['A', 'B', 'C', 'D'].includes(answers[id])) throw new Error('INVALID_QUIZ_ANSWER');
  }

  const now = new Date();
  const nowMs = now.getTime();
  const { day, yesterday, weekKey } = quizDateParts(now);
  const started = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken, { method: 'POST', body: {} }
  );
  const transaction = started.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let complete = false;

  try {
    const docs = await Promise.all([
      getDocument('players/' + encodeURIComponent(uid), accessToken, transaction),
      getDocument('settings/app', accessToken, transaction),
      getDocument('bans/' + encodeURIComponent(uid), accessToken, transaction)
    ]);
    if (!docs[0]) throw new Error('PLAYER_PROFILE_NOT_READY');
    const d = decodeFirestoreDocument(docs[0]);
    const settings = decodeFirestoreDocument(docs[1]);
    const banned = isDocumentBanned(docs[2], nowMs);

    const current = d.counted && d.counted.day === day ? d.counted : { day, ids: [], seen: [] };
    const countedIds = Array.isArray(current.ids) ? current.ids.slice() : [];
    const seenIds = Array.isArray(current.seen) ? current.seen.slice() : [];
    const countedSet = new Set(countedIds);
    const seenSet = new Set(seenIds);
    const ordered = qids.filter(id => Object.prototype.hasOwnProperty.call(answers, id));
    const correctIds = ordered.filter(id => answers[id] === QUIZ_ANSWER_KEY[id]);
    const freshIds = correctIds.filter(id => !countedSet.has(id));
    const already = correctIds.length - freshIds.length;
    const newAnswered = ordered.filter(id => !seenSet.has(id));
    const newCorrect = newAnswered.filter(id => answers[id] === QUIZ_ANSWER_KEY[id]);
    const correct = correctIds.length;

    if (!newAnswered.length && !freshIds.length) {
      const result = {
        coins: 0, coinParts: [], balance: Number(d.coins) || 0,
        earned: 0, bonusExp: 0, correct, already,
        parts: [], total: Number(d.totalExp) || 0,
        streak: Number(d.streak) || 0, extended: false,
        usedFreeze: false, xpMult: 1,
        expRate: clampRewardRate(settings.expMultiplier),
        coinRate: clampRewardRate(settings.coinMultiplier),
        duplicate: true
      };
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken, { method: 'POST', body: { transaction, writes: [] } }
      );
      complete = true;
      return { result, player: {}, banned };
    }

    const counted = [...new Set([...countedIds, ...freshIds])];
    const seen = [...new Set([...seenIds, ...ordered])];
    let streak = Number(d.streak) || 0;
    let extended = false;
    let usedFreeze = false;
    if (d.lastDay !== day) {
      if (d.lastDay === yesterday) { streak += 1; extended = true; }
      else if ((Number(d.sfreezes) || 0) > 0 && streak > 0) { usedFreeze = true; extended = true; }
      else { streak = 1; extended = true; }
    }

    const parts = [];
    const previous = d.achievements || {};
    const achievementStats = { ...(previous.stats || {}) };
    const prefix = id => id.slice(0, 3);
    const achievementSubjects = [...new Set([
      ...(Array.isArray(previous.subjects) ? previous.subjects.filter(code => code !== 'ga-') : []),
      ...newAnswered.map(prefix).filter(code => code !== 'ga-')
    ])];
    achievementStats.answered = (Number(achievementStats.answered) || 0) + newAnswered.length;
    achievementStats.correct = (Number(achievementStats.correct) || 0) + newCorrect.length;
    achievementStats.quizzes = (Number(achievementStats.quizzes) || 0) + (newAnswered.length ? 1 : 0);
    if (newAnswered.length && newCorrect.length === newAnswered.length) {
      achievementStats.perfect = (Number(achievementStats.perfect) || 0) + 1;
    }

    const metrics = {};
    for (const id of newAnswered) {
      const code = id.startsWith('ct-') ? 'ct' : id.slice(0, 3);
      metrics[code] = (metrics[code] || 0) + 1;
    }
    for (const [code, count] of Object.entries(metrics)) {
      achievementStats[code] = (Number(achievementStats[code]) || 0) + count;
    }
    const unlocked = Array.isArray(previous.unlocked) ? previous.unlocked.slice() : [];
    for (const achievement of QUIZ_ACHIEVEMENTS) {
      const value = achievement.metric === 'subjects'
        ? achievementSubjects.length
        : achievement.metric === 'streak'
          ? streak
          : Number(achievementStats[achievement.metric]) || 0;
      if (value >= achievement.target && !unlocked.includes(achievement.id)) unlocked.push(achievement.id);
    }
    const achievements = { stats: achievementStats, subjects: achievementSubjects, unlocked };

    const oldChallenge = d.challengeState && d.challengeState.day === day
      ? d.challengeState
      : { day, progress: {}, claimed: [] };
    const challengeState = {
      day,
      progress: { ...(oldChallenge.progress || {}) },
      subjects: [...new Set(Array.isArray(oldChallenge.subjects) ? oldChallenge.subjects.filter(x => x !== 'ga-') : [])],
      claimed: Array.isArray(oldChallenge.claimed) ? oldChallenge.claimed.slice() : []
    };
    if (kind !== 'daily' && newAnswered.length) {
      const add = (key, amount) => {
        challengeState.progress[key] = (Number(challengeState.progress[key]) || 0) + amount;
      };
      const subjects = new Set();
      const subjectCounts = {};
      for (const id of newAnswered) {
        const code = id.startsWith('ct-') ? 'ct' : id.slice(0, 3);
        subjects.add(code);
        subjectCounts[code] = (subjectCounts[code] || 0) + 1;
      }
      add('answered', newAnswered.length);
      add('correct', newCorrect.length);
      add('quizzes', 1);
      for (const code of subjects) if (!challengeState.subjects.includes(code)) challengeState.subjects.push(code);
      challengeState.progress.subjects = challengeState.subjects.length;
      if (newCorrect.length === newAnswered.length) add('perfect', 1);
      if (newAnswered.length >= 10) add('longQuiz', 1);
      if (subjects.size >= 3) add('mixed', 1);
      for (const [code, count] of Object.entries(subjectCounts)) {
        if (['soc', 'art', 'mat', 'com', 'rme', 'sci', 'fre', 'ct'].includes(code)) add(code, count);
      }
      for (const task of quizDailyChallengeSet(day)) {
        if ((Number(challengeState.progress[task.metric]) || 0) >= task.target && !challengeState.claimed.includes(task.id)) {
          challengeState.claimed.push(task.id);
          parts.push({ label: 'Daily challenge: ' + task.detail, exp: task.reward });
        }
      }
    }

    const bonusExp = parts.reduce((sum, part) => sum + part.exp, 0);
    const xpMult = (Number(d.xpBoost) || 0) > 0 ? 2 : 1;
    if (xpMult > 1) parts.push({ label: '⚡ XP Boost active', exp: freshIds.length * 10 });
    const earned = freshIds.length * 10 * xpMult;
    const coinParts = [];
    if (freshIds.length) coinParts.push({ label: freshIds.length + ' new correct answer' + (freshIds.length === 1 ? '' : 's'), n: freshIds.length });
    if (Math.floor(bonusExp / 4)) coinParts.push({ label: 'Daily challenge bonus', n: Math.floor(bonusExp / 4) });
    const streakCoins = freshIds.length ? Math.min(5, Math.floor(streak / 3)) : 0;
    if (streakCoins) coinParts.push({ label: '🔥 ' + streak + '-day streak bonus', n: streakCoins });

    const expRate = clampRewardRate(settings.expMultiplier);
    const coinRate = clampRewardRate(settings.coinMultiplier);
    const awardedExp = Math.floor((earned + bonusExp) * expRate);
    const awardedEarned = Math.floor(earned * expRate);
    const awardedBonus = awardedExp - awardedEarned;
    const scaledParts = parts.map(part => ({ ...part, exp: Math.floor(part.exp * expRate) }));
    if (scaledParts.length) {
      const shown = scaledParts.reduce((sum, part) => sum + part.exp, 0);
      scaledParts[scaledParts.length - 1].exp += awardedBonus - shown;
    }
    const baseCoins = coinParts.reduce((sum, part) => sum + part.n, 0);
    const coinsEarned = banned ? 0 : Math.floor(baseCoins * coinRate);
    const scaledCoins = banned ? [] : coinParts.map(part => ({ ...part, n: Math.floor(part.n * coinRate) }));
    if (scaledCoins.length) {
      const shown = scaledCoins.reduce((sum, part) => sum + part.n, 0);
      scaledCoins[scaledCoins.length - 1].n += coinsEarned - shown;
    }

    const prefixes = [...new Set(qids.map(prefix))];
    const subject = prefixes.length === 1 ? (QUIZ_SUBJECT_NAMES[prefixes[0]] || 'Mixed subjects') : 'Mixed subjects';
    const recent = [{ kind, subject, correct, total: qids.length, exp: awardedExp, at: nowMs }, ...(Array.isArray(d.recent) ? d.recent : [])].slice(0, 5);
    const sfreezes = usedFreeze ? Math.max(0, (Number(d.sfreezes) || 0) - 1) : (Number(d.sfreezes) || 0);
    const xpBoost = xpMult > 1 ? Math.max(0, (Number(d.xpBoost) || 0) - 1) : (Number(d.xpBoost) || 0);

    const next = {
      totalExp: (Number(d.totalExp) || 0) + awardedExp,
      weekKey,
      weekExp: (d.weekKey === weekKey ? Number(d.weekExp) || 0 : 0) + awardedExp,
      streak,
      bestStreak: Math.max(Number(d.bestStreak) || 0, streak),
      lastDay: day,
      dayKey: day,
      dayExp: (d.dayKey === day ? Number(d.dayExp) || 0 : 0) + awardedExp,
      coins: (Number(d.coins) || 0) + coinsEarned,
      sfreezes,
      xpBoost,
      counted: { day, ids: counted, seen },
      challengeState,
      achievements,
      recent
    };
    const writes = {
      totalExp: next.totalExp, weekKey: next.weekKey, weekExp: next.weekExp,
      streak: next.streak, bestStreak: next.bestStreak, lastDay: next.lastDay,
      dayKey: next.dayKey, dayExp: next.dayExp, sfreezes: next.sfreezes,
      xpBoost: next.xpBoost, counted: next.counted,
      challengeState: next.challengeState, achievements: next.achievements,
      recent: next.recent
    };
    if (!banned && coinsEarned > 0) writes.coins = next.coins;

    const fields = encodeFirestoreFields(writes);
    const name = 'projects/' + PROJECT_ID + '/databases/(default)/documents/players/' + uid;
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      {
        method: 'POST',
        body: {
          transaction,
          writes: [{
            update: { name, fields },
            updateMask: { fieldPaths: Object.keys(fields) }
          }]
        }
      }
    );
    complete = true;
    const result = {
      coins: coinsEarned, coinParts: scaledCoins, balance: next.coins,
      earned: awardedEarned, bonusExp: awardedBonus, correct, already,
      parts: scaledParts, total: next.totalExp, streak, extended, usedFreeze,
      xpMult, expRate, coinRate, duplicate: false
    };
    return { result, player: { ...writes, coins: next.coins }, banned };
  } finally {
    if (!complete) await rollbackTransaction(transaction, accessToken);
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
    if (request.method !== 'POST' || !['/gems', '/quiz-reward'].includes(url.pathname)) {
      return json({ ok: false, error: 'NOT_FOUND' }, 404, origin);
    }
    let payload;
    try {
      const raw = await request.text();
      if (raw.length > (url.pathname === '/quiz-reward' ? 24000 : 2048)) return json({ ok: false, error: 'REQUEST_TOO_LARGE' }, 413, origin);
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
      if (url.pathname === '/quiz-reward') {
        const outcome = await applyQuizReward(identity.uid, payload, accessToken);
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
      if (await isUserBanned(identity.uid, accessToken)) return json({ ok: false, code: 'USER_BANNED', error: 'This account cannot use Gems while banned.' }, 403, origin);
      if (action === 'earn') {
        const owner = await isOwnerSession(identity.uid, accessToken);
        if (!owner) return json({ ok: false, code: 'EARN_REQUIRES_OWNER', error: 'Gems can only be granted by the active Owner.' }, 403, origin);
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
      if (error && ['INVALID_QUIZ_QUESTIONS','INVALID_QUIZ_ANSWERS','DUPLICATE_QUIZ_QUESTIONS','UNKNOWN_QUIZ_QUESTION','INVALID_QUIZ_ANSWER','NO_QUIZ_ANSWERS'].includes(error.message)) {
        return json({ ok: false, code: error.message, error: 'The quiz submission could not be verified.' }, 400, origin);
      }
      if (error && error.message === 'INVALID_GEM_BALANCE') {
        return json({ ok: false, code: 'INVALID_GEM_BALANCE', error: 'Your Gems balance needs Owner review.' }, 409, origin);
      }
      console.error('Gems API request failed:', error && error.message ? error.message : 'unknown error');
      return json({ ok: false, code: 'GEMS_SERVICE_ERROR', error: 'The secure Gems service could not complete this request.' }, 502, origin);
    }
  }
};