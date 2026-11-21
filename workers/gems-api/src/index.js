import { isFirestoreBanActive } from "./ban-utils.mjs";
import { hasValidOwnerSession } from "./owner-utils.mjs";
import { buildPracticeRewardResult } from "./practice-utils.mjs";
import { buildAchievementGemHistory, buildEventGemPrizeHistory } from "./gem-history.mjs";
import { isKnownQuestionId } from "./question-keys.mjs";
import { getShopItem } from "./shop-utils.mjs";
import { getPowerupUse, validatePowerupUseReceiptRetry } from "./powerup-utils.mjs";
import { EVENT_FINISH_GRACE_MS, buildGemEventActivation, buildGemEventDraftConfig, buildGemEventEntry, buildGemEventRetry, validateEventPrizeGems } from "./event-utils.mjs";
import { buildGemEventAnswerResult, buildGemEventLeaderboardEntry, buildGemEventQuestionStart, buildGemEventSettlement } from "./event-game-utils.mjs";
import {
  buildDuelAnswerResult,
  buildDuelForfeitProgress,
  buildDuelQuestionStart,
  buildDuelSecondChanceProgress,
  buildDuelSettlement,
  createDuelProgress
} from "./duel-utils.mjs";

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
    const gemHistory = result.gemsEarned > 0
      ? buildAchievementGemHistory({
          uid,
          operationId,
          achievementIds: result.gemAchievementIds,
          balanceBefore: currentGems,
          balanceAfter: result.gems,
          now: Date.now()
        })
      : null;
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
    if (gemHistory) {
      const transactionPath = 'gemTransactions/' + encodeURIComponent(gemHistory.transaction.transactionId);
      writes.push({
        update: { name: base + transactionPath, fields: encodeFirestoreFields(gemHistory.transaction) },
        updateMask: { fieldPaths: Object.keys(gemHistory.transaction) },
        currentDocument: { exists: false }
      });
      for (const claim of gemHistory.claims) {
        const claimId = uid + '_' + claim.achievementId;
        const claimPath = 'gemRewardClaims/' + encodeURIComponent(claimId);
        writes.push({
          update: { name: base + claimPath, fields: encodeFirestoreFields(claim) },
          updateMask: { fieldPaths: Object.keys(claim) },
          currentDocument: { exists: false }
        });
      }
    }
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


async function applyShopPurchase(uid, itemId, operationId, accessToken) {
  const item = getShopItem(itemId);
  if (!item) throw new Error('INVALID_SHOP_ITEM');

  const owner = await hasActiveOwnerSession(uid, accessToken);
  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const playerPath = 'players/' + encodeURIComponent(uid);
  const operationPath = 'shopOperations/' + encodeURIComponent(uid + '_' + operationId);
  const playerName = base + playerPath;
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
    const [playerDoc, settingsDoc, operationDoc] = await Promise.all([
      getDocument(playerPath, accessToken, transaction),
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
    const player = decodeFirestoreFields(playerDoc.fields || {});
    const settings = decodeFirestoreFields(settingsDoc && settingsDoc.fields);
    if (settings.shopPaused === true && !owner) throw new Error('SHOP_PAUSED');

    const coins = player.coins === undefined ? 0 : Number(player.coins);
    if (!Number.isSafeInteger(coins) || coins < 0 || coins > MAX_BALANCE) {
      throw new Error('INVALID_COIN_BALANCE');
    }
    if (coins < item.price) throw new Error('INSUFFICIENT_COINS');

    const updates = { coins: coins - item.price };
    let result;
    if (item.type === 'title') {
      const owned = player.owned && typeof player.owned === 'object' ? { ...player.owned } : {};
      if (owned[itemId] === true) throw new Error('ITEM_ALREADY_OWNED');
      owned[itemId] = true;
      updates.owned = owned;
      result = { itemId, type: 'title', price: item.price, coins: updates.coins, owned };
    } else {
      const current = player[item.field] === undefined ? 0 : Number(player[item.field]);
      if (!Number.isSafeInteger(current) || current < 0 || current >= MAX_BALANCE) {
        throw new Error('INVALID_POWERUP_BALANCE');
      }
      updates[item.field] = current + 1;
      result = {
        itemId,
        type: 'consumable',
        field: item.field,
        price: item.price,
        coins: updates.coins,
        quantity: updates[item.field]
      };
    }

    const operationRecord = {
      uid,
      operationId,
      itemId,
      price: item.price,
      createdAt: Date.now(),
      result
    };
    const writes = [
      {
        update: { name: playerName, fields: encodeFirestoreFields(updates) },
        updateMask: { fieldPaths: Object.keys(updates) },
        currentDocument: { exists: true }
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
    return { duplicate: false, result };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

async function applyPowerupUse(uid, itemId, operationId, accessToken, duelCode = '') {
  const item = getPowerupUse(itemId);
  if (!item) throw new Error('INVALID_POWERUP_ITEM');
  if (!validateDuelCode(duelCode)) throw new Error('DUEL_CODE_REQUIRED');

  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const playerPath = 'players/' + encodeURIComponent(uid);
  const operationPath = 'powerupOperations/' + encodeURIComponent(uid + '_' + operationId);
  const playerName = base + playerPath;
  const operationName = base + operationPath;
  const duelPath = duelCode ? duelDocumentPath(duelCode) : '';
  const progressPath = duelCode ? duelProgressPath(duelCode, uid) : '';

  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken,
    { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const [playerDoc, operationDoc, duelDoc, progressDoc] = await Promise.all([
      getDocument(playerPath, accessToken, transaction),
      getDocument(operationPath, accessToken, transaction),
      duelCode ? getDocument(duelPath, accessToken, transaction) : Promise.resolve(null),
      duelCode ? getDocument(progressPath, accessToken, transaction) : Promise.resolve(null)
    ]);

    if (operationDoc) {
      const stored = decodeFirestoreFields(operationDoc.fields || {});
      if (!duelDoc || !progressDoc) throw new Error('DUEL_NOT_STARTED');
      const duel = decodeFirestoreFields(duelDoc.fields || {});
      const progress = decodeFirestoreFields(progressDoc.fields || {});
      validatePowerupUseReceiptRetry({
        stored, uid, itemId, duelCode, duel, progress
      });
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken,
        { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      return { duplicate: true, result: stored.result || null };
    }

    if (!playerDoc) throw new Error('PLAYER_PROFILE_NOT_READY');
    const player = decodeFirestoreFields(playerDoc.fields || {});
    const current = player[item.field] === undefined ? 0 : Number(player[item.field]);
    if (!Number.isSafeInteger(current) || current < 0 || current > MAX_BALANCE) {
      throw new Error('INVALID_POWERUP_BALANCE');
    }
    if (current < 1) throw new Error('NO_POWERUP_AVAILABLE');

    const quantity = current - 1;
    let nextProgress = null;
    if (duelCode) {
      if (!duelDoc || !progressDoc) throw new Error('DUEL_NOT_STARTED');
      const duel = decodeFirestoreFields(duelDoc.fields || {});
      const progress = decodeFirestoreFields(progressDoc.fields || {});
      nextProgress = buildDuelSecondChanceProgress({ duel, progress, uid, now: Date.now() });
    }
    const result = { itemId, field: item.field, quantity };
    const operationRecord = {
      uid,
      operationId,
      itemId,
      duelCode,
      questionIndex: nextProgress.nextIndex,
      createdAt: Date.now(),
      result
    };
    const writes = [
      {
        update: { name: playerName, fields: encodeFirestoreFields({ [item.field]: quantity }) },
        updateMask: { fieldPaths: [item.field] },
        currentDocument: { exists: true }
      },
      ...(nextProgress ? [{
        update: { name: base + progressPath, fields: encodeFirestoreFields(nextProgress) },
        updateMask: { fieldPaths: Object.keys(nextProgress) },
        currentDocument: { exists: true }
      }] : []),
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
    return { duplicate: false, result };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}


function duelDocumentPath(code) {
  return 'duels/' + encodeURIComponent(code);
}

function duelProgressPath(code, uid) {
  return 'duelProgress/' + encodeURIComponent(code + '_' + uid);
}

function duelSettlementPath(code) {
  return 'duelSettlements/' + encodeURIComponent(code);
}

function validateDuelCode(code) {
  return typeof code === 'string' && /^[A-Z0-9]{4,12}$/.test(code);
}

async function startDuelProgress(uid, code, accessToken) {
  const duelPath = duelDocumentPath(code);
  const progressPath = duelProgressPath(code, uid);
  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken, { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const [duelDoc, progressDoc] = await Promise.all([
      getDocument(duelPath, accessToken, transaction),
      getDocument(progressPath, accessToken, transaction)
    ]);
    if (!duelDoc) throw new Error('DUEL_NOT_FOUND');
    const duel = decodeFirestoreFields(duelDoc.fields || {});
    if (duel.settled === true) throw new Error('DUEL_ALREADY_SETTLED');
    if (duel.state !== 'playing') throw new Error('DUEL_NOT_PLAYING');
    if (duel.host !== uid && duel.guest !== uid) throw new Error('DUEL_NOT_PARTICIPANT');
    if (progressDoc) {
      const stored = decodeFirestoreFields(progressDoc.fields || {});
      if (stored.uid !== uid || stored.code !== code) throw new Error('DUEL_SESSION_MISMATCH');
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken, { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      return { duplicate: true, result: { started: true, nextIndex: stored.nextIndex, done: !!stored.done } };
    }
    const progress = createDuelProgress(uid, code, Date.now());
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      {
        method: 'POST',
        body: {
          transaction,
          writes: [{
            update: { name: base + progressPath, fields: encodeFirestoreFields(progress) },
            updateMask: { fieldPaths: Object.keys(progress) },
            currentDocument: { exists: false }
          }]
        }
      }
    );
    finished = true;
    return { duplicate: false, result: { started: true, nextIndex: 0, done: false } };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

async function startDuelQuestion(uid, code, questionId, accessToken) {
  const duelPath = duelDocumentPath(code);
  const progressPath = duelProgressPath(code, uid);
  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken, { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const [duelDoc, progressDoc] = await Promise.all([
      getDocument(duelPath, accessToken, transaction),
      getDocument(progressPath, accessToken, transaction)
    ]);
    if (!duelDoc) throw new Error('DUEL_NOT_FOUND');
    if (!progressDoc) throw new Error('DUEL_NOT_STARTED');
    const duel = decodeFirestoreFields(duelDoc.fields || {});
    const progress = decodeFirestoreFields(progressDoc.fields || {});
    const outcome = buildDuelQuestionStart({ duel, progress, uid, questionId, now: Date.now() });
    if (outcome.duplicate) {
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken, { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      return { duplicate: true, result: outcome.result };
    }
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      {
        method: 'POST',
        body: {
          transaction,
          writes: [{
            update: { name: base + progressPath, fields: encodeFirestoreFields(outcome.progress) },
            updateMask: { fieldPaths: Object.keys(outcome.progress) },
            currentDocument: { exists: true }
          }]
        }
      }
    );
    finished = true;
    return { duplicate: false, result: outcome.result };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

async function submitDuelAnswer(uid, code, questionId, answerKey, operationId, accessToken) {
  const duelPath = duelDocumentPath(code);
  const progressPath = duelProgressPath(code, uid);
  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken, { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const [duelDoc, progressDoc] = await Promise.all([
      getDocument(duelPath, accessToken, transaction),
      getDocument(progressPath, accessToken, transaction)
    ]);
    if (!duelDoc) throw new Error('DUEL_NOT_FOUND');
    if (!progressDoc) throw new Error('DUEL_NOT_STARTED');
    const duel = decodeFirestoreFields(duelDoc.fields || {});
    const progress = decodeFirestoreFields(progressDoc.fields || {});
    const outcome = buildDuelAnswerResult({
      duel, progress, uid, questionId, answerKey, operationId, now: Date.now()
    });
    if (outcome.duplicate) {
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken, { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      return { duplicate: true, result: outcome.result };
    }
    const publicResults = {
      ...(duel.res && typeof duel.res === 'object' ? duel.res : {}),
      [uid]: outcome.result.score
    };
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      {
        method: 'POST',
        body: {
          transaction,
          writes: [
            {
              update: { name: base + progressPath, fields: encodeFirestoreFields(outcome.progress) },
              updateMask: { fieldPaths: Object.keys(outcome.progress) },
              currentDocument: { exists: true }
            },
            {
              update: {
                name: base + duelPath,
                fields: encodeFirestoreFields({ res: publicResults })
              },
              updateMask: { fieldPaths: ['res'] },
              currentDocument: { exists: true }
            }
          ]
        }
      }
    );
    finished = true;
    return { duplicate: false, result: outcome.result };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

async function forfeitDuel(uid, code, accessToken) {
  const duelPath = duelDocumentPath(code);
  const progressPath = duelProgressPath(code, uid);
  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken, { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const [duelDoc, progressDoc] = await Promise.all([
      getDocument(duelPath, accessToken, transaction),
      getDocument(progressPath, accessToken, transaction)
    ]);
    if (!duelDoc) throw new Error('DUEL_NOT_FOUND');
    if (!progressDoc) throw new Error('DUEL_NOT_STARTED');
    const duel = decodeFirestoreFields(duelDoc.fields || {});
    const progress = decodeFirestoreFields(progressDoc.fields || {});
    const next = buildDuelForfeitProgress({ duel, progress, uid, now: Date.now() });
    const score = { c: next.correctCount || 0, n: duel.qids.length, ms: next.totalMs || 0, done: true };
    const publicResults = {
      ...(duel.res && typeof duel.res === 'object' ? duel.res : {}),
      [uid]: score
    };
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      {
        method: 'POST',
        body: {
          transaction,
          writes: [
            {
              update: { name: base + progressPath, fields: encodeFirestoreFields(next) },
              updateMask: { fieldPaths: Object.keys(next) },
              currentDocument: { exists: true }
            },
            {
              update: { name: base + duelPath, fields: encodeFirestoreFields({ res: publicResults }) },
              updateMask: { fieldPaths: ['res'] },
              currentDocument: { exists: true }
            }
          ]
        }
      }
    );
    finished = true;
    const forfeitResult = { duplicate: !!progress.done, result: { ...score, forfeit: true } };
    // An explicit leave ends the match immediately and securely credits the
    // other participant, even if they have not finished every question yet.
    const settlement = await settleDuel(uid, code, accessToken);
    return { ...forfeitResult, settlement };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

async function settleDuel(uid, code, accessToken) {
  const duelPath = duelDocumentPath(code);
  const settlementPath = duelSettlementPath(code);
  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken, { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const duelDoc = await getDocument(duelPath, accessToken, transaction);
    if (!duelDoc) throw new Error('DUEL_NOT_FOUND');
    const duel = decodeFirestoreFields(duelDoc.fields || {});
    if (duel.host !== uid && duel.guest !== uid) throw new Error('DUEL_NOT_PARTICIPANT');
    const storedSettlement = await getDocument(settlementPath, accessToken, transaction);
    if (storedSettlement) {
      const stored = decodeFirestoreFields(storedSettlement.fields || {});
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken, { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      if (!stored.byUid || !stored.byUid[uid]) throw new Error('DUEL_SETTLEMENT_INVALID');
      return { duplicate: true, result: stored.byUid[uid] };
    }
    if (duel.state !== 'playing') throw new Error('DUEL_NOT_PLAYING');
    const host = duel.host, guest = duel.guest;
    if (typeof host !== 'string' || typeof guest !== 'string' || host === guest) throw new Error('INVALID_DUEL');
    const [hostProgressDoc, guestProgressDoc, hostPlayerDoc, guestPlayerDoc] = await Promise.all([
      getDocument(duelProgressPath(code, host), accessToken, transaction),
      getDocument(duelProgressPath(code, guest), accessToken, transaction),
      getDocument('players/' + encodeURIComponent(host), accessToken, transaction),
      getDocument('players/' + encodeURIComponent(guest), accessToken, transaction)
    ]);
    if (!hostPlayerDoc || !guestPlayerDoc) throw new Error('PLAYER_PROFILE_NOT_READY');
    const now = Date.now();
    const progressByUid = {
      [host]: hostProgressDoc ? decodeFirestoreFields(hostProgressDoc.fields || {}) : null,
      [guest]: guestProgressDoc ? decodeFirestoreFields(guestProgressDoc.fields || {}) : null
    };
    const playerByUid = {
      [host]: decodeFirestoreFields(hostPlayerDoc.fields || {}),
      [guest]: decodeFirestoreFields(guestPlayerDoc.fields || {})
    };
    const outcome = buildDuelSettlement({
      duel, progressByUid, playerByUid,
      day: new Date(now).toISOString().slice(0, 10), now
    });
    if (outcome.waiting) {
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken, { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      return { waiting: true, retryAfterMs: outcome.retryAfterMs };
    }
    const publicResults = {
      ...(duel.res && typeof duel.res === 'object' ? duel.res : {}),
      [host]: outcome.score[host],
      [guest]: outcome.score[guest]
    };
    const receipt = {
      code,
      settledAt: outcome.settledAt,
      byUid: outcome.byUid,
      outcomes: outcome.outcome
    };
    const writes = [
      {
        update: { name: base + 'players/' + encodeURIComponent(host), fields: encodeFirestoreFields(outcome.rewards[host].playerUpdates) },
        updateMask: { fieldPaths: Object.keys(outcome.rewards[host].playerUpdates) },
        currentDocument: { exists: true }
      },
      {
        update: { name: base + 'players/' + encodeURIComponent(guest), fields: encodeFirestoreFields(outcome.rewards[guest].playerUpdates) },
        updateMask: { fieldPaths: Object.keys(outcome.rewards[guest].playerUpdates) },
        currentDocument: { exists: true }
      },
      {
        update: { name: base + duelPath, fields: encodeFirestoreFields({ res: publicResults, state: 'finished', settled: true, settledAt: outcome.settledAt }) },
        updateMask: { fieldPaths: ['res', 'state', 'settled', 'settledAt'] },
        currentDocument: { exists: true }
      },
      {
        update: { name: base + settlementPath, fields: encodeFirestoreFields(receipt) },
        updateMask: { fieldPaths: Object.keys(receipt) },
        currentDocument: { exists: false }
      }
    ];
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken, { method: 'POST', body: { transaction, writes } }
    );
    finished = true;
    return { duplicate: false, result: outcome.byUid[uid] };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}


function validateGemEventId(eventId) {
  return typeof eventId === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(eventId);
}

function validateOperationUuid(operationId) {
  return typeof operationId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId);
}

function gemEventPath(eventId) {
  return 'gemEvents/' + encodeURIComponent(eventId);
}

function gemEventParticipantPath(eventId, uid) {
  return gemEventPath(eventId) + '/participants/' + encodeURIComponent(uid);
}

function gemEventAttemptPath(eventId, uid, attemptId) {
  return gemEventParticipantPath(eventId, uid) + '/attempts/' + encodeURIComponent(attemptId);
}

function gemEventOperationPath(uid, operationId) {
  return 'gemEventOperations/' + encodeURIComponent(uid + '_' + operationId);
}

function gemEventAnswerOperationPath(uid, operationId) {
  return 'gemEventAnswerOperations/' + encodeURIComponent(uid + '_' + operationId);
}


async function applyGemEventDraftConfig(uid, eventId, payload, accessToken) {
  const owner = await hasActiveOwnerSession(uid, accessToken);
  if (!owner) throw new Error('EVENT_OWNER_REQUIRED');

  const eventPath = gemEventPath(eventId);
  const documentName = 'projects/' + PROJECT_ID + '/databases/(default)/documents/' + eventPath;
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken, { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const eventDoc = await getDocument(eventPath, accessToken, transaction);
    let previous = null;
    if (eventDoc) {
      previous = decodeFirestoreFields(eventDoc.fields || {});
      const entryCount = previous.entryCount === undefined ? 0 : Number(previous.entryCount);
      if (previous.status !== 'draft' || !Number.isSafeInteger(entryCount) || entryCount !== 0) {
        throw new Error('EVENT_CONFIG_LOCKED');
      }
    }

    const config = buildGemEventDraftConfig({
      eventId,
      title: payload.title,
      description: payload.description === undefined ? '' : payload.description,
      questionIds: payload.questionIds,
      entryCostCoins: payload.entryCostCoins,
      maxEntriesPerUser: payload.maxEntriesPerUser,
      retryEnabled: payload.retryEnabled,
      retryCostCoins: payload.retryCostCoins === undefined ? 0 : payload.retryCostCoins,
      maxRetriesPerEntry: payload.maxRetriesPerEntry === undefined ? 0 : payload.maxRetriesPerEntry,
      prizeGems: payload.prizeGems,
      opensAt: payload.opensAt === undefined ? null : payload.opensAt,
      closesAt: payload.closesAt === undefined ? null : payload.closesAt,
      ownerUid: uid,
      now: Date.now()
    });
    if (previous) {
      config.createdAt = previous.createdAt || config.createdAt;
      config.createdBy = previous.createdBy || uid;
      config.entryCount = 0;
    }
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      {
        method: 'POST',
        body: {
          transaction,
          writes: [{
            update: { name: documentName, fields: encodeFirestoreFields(config) },
            updateMask: { fieldPaths: Object.keys(config) },
            currentDocument: { exists: !!eventDoc }
          }]
        }
      }
    );
    finished = true;
    return { duplicate: false, result: config };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

async function applyGemEventEntry(uid, eventId, operationId, accessToken) {
  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const eventPath = gemEventPath(eventId);
  const participantPath = gemEventParticipantPath(eventId, uid);
  const playerPath = 'players/' + encodeURIComponent(uid);
  const operationPath = gemEventOperationPath(uid, operationId);
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken, { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const [eventDoc, participantDoc, playerDoc, operationDoc] = await Promise.all([
      getDocument(eventPath, accessToken, transaction),
      getDocument(participantPath, accessToken, transaction),
      getDocument(playerPath, accessToken, transaction),
      getDocument(operationPath, accessToken, transaction)
    ]);
    if (operationDoc) {
      const stored = decodeFirestoreFields(operationDoc.fields || {});
      if (stored.uid !== uid || stored.eventId !== eventId || stored.action !== 'enter') {
        throw new Error('IDEMPOTENCY_KEY_REUSED');
      }
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken, { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      return { duplicate: true, result: stored.result || null };
    }
    if (!eventDoc) throw new Error('EVENT_NOT_FOUND');
    if (!playerDoc) throw new Error('PLAYER_PROFILE_NOT_READY');
    const event = decodeFirestoreFields(eventDoc.fields || {});
    const participant = decodeFirestoreFields(participantDoc && participantDoc.fields);
    const player = decodeFirestoreFields(playerDoc.fields || {});
    const attemptId = crypto.randomUUID();
    const outcome = buildGemEventEntry({
      event, participant, player, uid, eventId, attemptId, now: Date.now()
    });
    const result = {
      eventId,
      entryNo: outcome.entryNo,
      attemptId,
      costCoins: outcome.costCoins,
      coins: outcome.coins
    };
    const operationRecord = {
      uid, eventId, action: 'enter', operationId, attemptId,
      createdAt: Date.now(), result
    };
    const currentEntryCount = event.entryCount === undefined ? 0 : Number(event.entryCount);
    const currentOpenAttempts = event.openAttempts === undefined ? 0 : Number(event.openAttempts);
    if (!Number.isSafeInteger(currentEntryCount) || currentEntryCount < 0 || currentEntryCount >= MAX_BALANCE
        || !Number.isSafeInteger(currentOpenAttempts) || currentOpenAttempts < 0 || currentOpenAttempts >= MAX_BALANCE) {
      throw new Error('INVALID_EVENT_CONFIG');
    }
    const writes = [
      {
        update: { name: base + eventPath, fields: encodeFirestoreFields({
          entryCount: currentEntryCount + 1,
          openAttempts: currentOpenAttempts + 1
        }) },
        updateMask: { fieldPaths: ['entryCount', 'openAttempts'] },
        currentDocument: { exists: true }
      },
      {
        update: { name: base + playerPath, fields: encodeFirestoreFields({ coins: outcome.coins }) },
        updateMask: { fieldPaths: ['coins'] },
        currentDocument: { exists: true }
      },
      {
        update: { name: base + participantPath, fields: encodeFirestoreFields(outcome.participant) },
        updateMask: { fieldPaths: Object.keys(outcome.participant) },
        currentDocument: { exists: !!participantDoc }
      },
      {
        update: { name: base + gemEventAttemptPath(eventId, uid, attemptId), fields: encodeFirestoreFields(outcome.attempt) },
        updateMask: { fieldPaths: Object.keys(outcome.attempt) },
        currentDocument: { exists: false }
      },
      {
        update: { name: base + operationPath, fields: encodeFirestoreFields(operationRecord) },
        updateMask: { fieldPaths: Object.keys(operationRecord) },
        currentDocument: { exists: false }
      }
    ];
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken, { method: 'POST', body: { transaction, writes } }
    );
    finished = true;
    return { duplicate: false, result };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

async function applyGemEventRetry(uid, eventId, currentAttemptId, operationId, accessToken) {
  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const eventPath = gemEventPath(eventId);
  const participantPath = gemEventParticipantPath(eventId, uid);
  const playerPath = 'players/' + encodeURIComponent(uid);
  const currentAttemptPath = gemEventAttemptPath(eventId, uid, currentAttemptId);
  const operationPath = gemEventOperationPath(uid, operationId);
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken, { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const [eventDoc, participantDoc, playerDoc, attemptDoc, operationDoc] = await Promise.all([
      getDocument(eventPath, accessToken, transaction),
      getDocument(participantPath, accessToken, transaction),
      getDocument(playerPath, accessToken, transaction),
      getDocument(currentAttemptPath, accessToken, transaction),
      getDocument(operationPath, accessToken, transaction)
    ]);
    if (operationDoc) {
      const stored = decodeFirestoreFields(operationDoc.fields || {});
      if (stored.uid !== uid || stored.eventId !== eventId || stored.action !== 'retry'
          || stored.previousAttemptId !== currentAttemptId) {
        throw new Error('IDEMPOTENCY_KEY_REUSED');
      }
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken, { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      return { duplicate: true, result: stored.result || null };
    }
    if (!eventDoc) throw new Error('EVENT_NOT_FOUND');
    if (!participantDoc) throw new Error('EVENT_PARTICIPATION_NOT_FOUND');
    if (!playerDoc) throw new Error('PLAYER_PROFILE_NOT_READY');
    if (!attemptDoc) throw new Error('EVENT_ATTEMPT_NOT_FOUND');
    const event = decodeFirestoreFields(eventDoc.fields || {});
    const participant = decodeFirestoreFields(participantDoc.fields || {});
    const player = decodeFirestoreFields(playerDoc.fields || {});
    const currentAttempt = decodeFirestoreFields(attemptDoc.fields || {});
    const nextAttemptId = crypto.randomUUID();
    const outcome = buildGemEventRetry({
      event, participant, player, currentAttempt, uid, eventId,
      currentAttemptId, nextAttemptId, now: Date.now()
    });
    const result = {
      eventId,
      entryNo: outcome.entryNo,
      previousAttemptId: currentAttemptId,
      attemptId: nextAttemptId,
      attemptNo: outcome.attemptNo,
      retriesUsed: outcome.retriesUsed,
      costCoins: outcome.costCoins,
      coins: outcome.coins
    };
    const operationRecord = {
      uid, eventId, action: 'retry', operationId,
      previousAttemptId: currentAttemptId,
      attemptId: nextAttemptId,
      createdAt: Date.now(), result
    };
    const currentOpenAttempts = event.openAttempts === undefined ? 0 : Number(event.openAttempts);
    if (!Number.isSafeInteger(currentOpenAttempts) || currentOpenAttempts < 0 || currentOpenAttempts >= MAX_BALANCE) {
      throw new Error('INVALID_EVENT_CONFIG');
    }
    const writes = [
      {
        update: { name: base + eventPath, fields: encodeFirestoreFields({ openAttempts: currentOpenAttempts + 1 }) },
        updateMask: { fieldPaths: ['openAttempts'] },
        currentDocument: { exists: true }
      },
      {
        update: { name: base + playerPath, fields: encodeFirestoreFields({ coins: outcome.coins }) },
        updateMask: { fieldPaths: ['coins'] },
        currentDocument: { exists: true }
      },
      {
        update: { name: base + participantPath, fields: encodeFirestoreFields(outcome.participant) },
        updateMask: { fieldPaths: Object.keys(outcome.participant) },
        currentDocument: { exists: true }
      },
      {
        update: { name: base + currentAttemptPath, fields: encodeFirestoreFields(outcome.previousAttempt) },
        updateMask: { fieldPaths: Object.keys(outcome.previousAttempt) },
        currentDocument: { exists: true }
      },
      {
        update: { name: base + gemEventAttemptPath(eventId, uid, nextAttemptId), fields: encodeFirestoreFields(outcome.attempt) },
        updateMask: { fieldPaths: Object.keys(outcome.attempt) },
        currentDocument: { exists: false }
      },
      {
        update: { name: base + operationPath, fields: encodeFirestoreFields(operationRecord) },
        updateMask: { fieldPaths: Object.keys(operationRecord) },
        currentDocument: { exists: false }
      }
    ];
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken, { method: 'POST', body: { transaction, writes } }
    );
    finished = true;
    return { duplicate: false, result };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}




async function applyGemEventEarlyClose(uid, eventId, accessToken) {
  const owner = await hasActiveOwnerSession(uid, accessToken);
  if (!owner) throw new Error('EVENT_OWNER_REQUIRED');
  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const eventPath = gemEventPath(eventId);
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken, { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const eventDoc = await getDocument(eventPath, accessToken, transaction);
    if (!eventDoc) throw new Error('EVENT_NOT_FOUND');
    const event = decodeFirestoreFields(eventDoc.fields || {});
    if (event.status !== 'active') throw new Error('EVENT_NOT_ACTIVE');
    const now = Date.now();
    if (Number.isSafeInteger(event.closesAt) && event.closesAt <= now) {
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken, { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      return { duplicate: true, result: { eventId, status: 'active', closesAt: event.closesAt } };
    }
    const fields = {
      closesAt: now,
      closedAt: now,
      closedBy: uid,
      updatedAt: now,
      updatedBy: uid
    };
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      {
        method: 'POST',
        body: {
          transaction,
          writes: [{
            update: { name: base + eventPath, fields: encodeFirestoreFields(fields) },
            updateMask: { fieldPaths: Object.keys(fields) },
            currentDocument: { exists: true }
          }]
        }
      }
    );
    finished = true;
    return { duplicate: false, result: { eventId, status: 'active', ...fields } };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

async function applyGemEventActivation(uid, eventId, accessToken) {
  const owner = await hasActiveOwnerSession(uid, accessToken);
  if (!owner) throw new Error('EVENT_OWNER_REQUIRED');
  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const eventPath = gemEventPath(eventId);
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken, { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const eventDoc = await getDocument(eventPath, accessToken, transaction);
    if (!eventDoc) throw new Error('EVENT_NOT_FOUND');
    const event = decodeFirestoreFields(eventDoc.fields || {});
    if (event.status === 'active' && event.activatedBy === uid) {
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken, { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      return { duplicate: true, result: { eventId, status: 'active', activatedAt: event.activatedAt } };
    }
    const fields = buildGemEventActivation({ event, ownerUid: uid, now: Date.now() });
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      {
        method: 'POST',
        body: {
          transaction,
          writes: [{
            update: { name: base + eventPath, fields: encodeFirestoreFields(fields) },
            updateMask: { fieldPaths: Object.keys(fields) },
            currentDocument: { exists: true }
          }]
        }
      }
    );
    finished = true;
    return { duplicate: false, result: { eventId, ...fields } };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

async function applyGemEventSettlement(eventId, accessToken) {
  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const eventPath = gemEventPath(eventId);
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken, { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const eventDoc = await getDocument(eventPath, accessToken, transaction);
    if (!eventDoc) throw new Error('EVENT_NOT_FOUND');
    const event = decodeFirestoreFields(eventDoc.fields || {});
    if (event.status === 'settled') {
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken, { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      const saved = event.settlement || {};
      return {
        duplicate: true,
        result: {
          eventId,
          status: 'settled',
          settledAt: event.settledAt,
          winners: saved.winners || event.winners || [],
          totalGemsAwarded: saved.totalGemsAwarded || event.totalGemsAwarded || 0,
          uncompletedAttempts: saved.uncompletedAttempts || event.uncompletedAttempts || 0
        }
      };
    }
    if (event.status !== 'active') throw new Error('EVENT_NOT_ACTIVE');

    const queryPath = 'projects/' + PROJECT_ID + '/databases/(default)/documents/' + eventPath + ':runQuery';
    const queryRows = await firestoreRequest(
      queryPath,
      accessToken,
      {
        method: 'POST',
        body: {
          transaction,
          structuredQuery: {
            from: [{ collectionId: 'leaderboard' }],
            orderBy: [{ field: { fieldPath: 'rankKey' }, direction: 'ASCENDING' }],
            limit: 3
          }
        }
      }
    );
    const leaderboardEntries = (Array.isArray(queryRows) ? queryRows : [])
      .filter(row => row && row.document && row.document.fields)
      .map(row => decodeFirestoreFields(row.document.fields));

    const prizes = validateEventPrizeGems(event.prizeGems);
    const candidateWinners = leaderboardEntries.slice(0, 3);
    const paidWinners = candidateWinners.filter((entry, index) =>
      entry && typeof entry.uid === 'string'
      && [prizes.first, prizes.second, prizes.third][index] > 0
    );
    const reads = await Promise.all(paidWinners.map(async winner => {
      const playerPath = 'players/' + encodeURIComponent(winner.uid);
      const receiptPath = 'gemEventPrizeOperations/' + encodeURIComponent(eventId + '_' + winner.uid);
      const [playerDoc, receiptDoc] = await Promise.all([
        getDocument(playerPath, accessToken, transaction),
        getDocument(receiptPath, accessToken, transaction)
      ]);
      return { uid: winner.uid, playerDoc, receiptDoc };
    }));
    const playerByUid = {};
    const receiptByUid = {};
    for (const item of reads) {
      playerByUid[item.uid] = item.playerDoc ? decodeFirestoreFields(item.playerDoc.fields || {}) : null;
      receiptByUid[item.uid] = item.receiptDoc;
      if (item.receiptDoc) throw new Error('EVENT_PRIZE_ALREADY_PAID');
    }
    const summary = buildGemEventSettlement({
      event,
      leaderboardEntries,
      playerByUid,
      now: Date.now()
    });

    const gemHistory = buildEventGemPrizeHistory({
      eventId,
      eventTitle: event.title || 'Gem event',
      payouts: summary.payouts,
      now: summary.settledAt
    });
    if (gemHistory.totalGemsAwarded !== summary.totalGemsAwarded) {
      throw new Error('GEM_HISTORY_PAYOUT_MISMATCH');
    }

    const writes = [];
    for (const payout of summary.payouts) {
      const playerPath = 'players/' + encodeURIComponent(payout.uid);
      const receiptPath = 'gemEventPrizeOperations/' + encodeURIComponent(eventId + '_' + payout.uid);
      const receipt = {
        eventId,
        uid: payout.uid,
        rank: payout.rank,
        amount: payout.amount,
        balanceAfter: payout.balance,
        paidAt: summary.settledAt
      };
      writes.push({
        update: { name: base + playerPath, fields: encodeFirestoreFields({ gems: payout.balance }) },
        updateMask: { fieldPaths: ['gems'] },
        currentDocument: { exists: true }
      });
      writes.push({
        update: { name: base + receiptPath, fields: encodeFirestoreFields(receipt) },
        updateMask: { fieldPaths: Object.keys(receipt) },
        currentDocument: { exists: false }
      });
    }
    for (const record of gemHistory.transactions) {
      const historyPath = 'gemTransactions/' + encodeURIComponent(record.transactionId);
      writes.push({
        update: { name: base + historyPath, fields: encodeFirestoreFields(record) },
        updateMask: { fieldPaths: Object.keys(record) },
        currentDocument: { exists: false }
      });
    }

    const settlement = {
      eventId,
      status: 'settled',
      settledAt: summary.settledAt,
      winners: summary.winners,
      totalGemsAwarded: summary.totalGemsAwarded,
      uncompletedAttempts: summary.uncompletedAttempts
    };
    const eventUpdates = {
      status: 'settled',
      leaderboardStatus: 'settled',
      settledAt: summary.settledAt,
      settledBy: 'system',
      winners: summary.winners,
      totalGemsAwarded: summary.totalGemsAwarded,
      uncompletedAttempts: summary.uncompletedAttempts,
      openAttempts: 0,
      settlement
    };
    writes.push({
      update: { name: base + eventPath, fields: encodeFirestoreFields(eventUpdates) },
      updateMask: { fieldPaths: Object.keys(eventUpdates) },
      currentDocument: { exists: true }
    });
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken, { method: 'POST', body: { transaction, writes } }
    );
    finished = true;
    return { duplicate: false, result: settlement };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

async function startGemEventQuestion(uid, eventId, attemptId, accessToken) {
  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const eventPath = gemEventPath(eventId);
  const participantPath = gemEventParticipantPath(eventId, uid);
  const attemptPath = gemEventAttemptPath(eventId, uid, attemptId);
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken, { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const [eventDoc, participantDoc, attemptDoc] = await Promise.all([
      getDocument(eventPath, accessToken, transaction),
      getDocument(participantPath, accessToken, transaction),
      getDocument(attemptPath, accessToken, transaction)
    ]);
    if (!eventDoc) throw new Error('EVENT_NOT_FOUND');
    if (!participantDoc) throw new Error('EVENT_PARTICIPATION_NOT_FOUND');
    if (!attemptDoc) throw new Error('EVENT_ATTEMPT_NOT_FOUND');
    const event = decodeFirestoreFields(eventDoc.fields || {});
    const participant = decodeFirestoreFields(participantDoc.fields || {});
    if (participant.uid !== uid) throw new Error('EVENT_PARTICIPATION_NOT_FOUND');
    const attempt = decodeFirestoreFields(attemptDoc.fields || {});
    const outcome = buildGemEventQuestionStart({
      event, attempt, uid, eventId, attemptId, now: Date.now()
    });
    if (outcome.duplicate) {
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken, { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      return { duplicate: true, result: outcome.result };
    }
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      {
        method: 'POST',
        body: {
          transaction,
          writes: [{
            update: { name: base + attemptPath, fields: encodeFirestoreFields(outcome.attempt) },
            updateMask: { fieldPaths: Object.keys(outcome.attempt) },
            currentDocument: { exists: true }
          }]
        }
      }
    );
    finished = true;
    return { duplicate: false, result: outcome.result };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

async function submitGemEventAnswer(uid, eventId, attemptId, questionId, answerKey, operationId, accessToken) {
  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const eventPath = gemEventPath(eventId);
  const participantPath = gemEventParticipantPath(eventId, uid);
  const attemptPath = gemEventAttemptPath(eventId, uid, attemptId);
  const playerPath = 'players/' + encodeURIComponent(uid);
  const leaderboardPath = gemEventPath(eventId) + '/leaderboard/' + encodeURIComponent(uid);
  const operationPath = gemEventAnswerOperationPath(uid, operationId);
  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken, { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const [eventDoc, participantDoc, attemptDoc, playerDoc, leaderboardDoc, operationDoc] = await Promise.all([
      getDocument(eventPath, accessToken, transaction),
      getDocument(participantPath, accessToken, transaction),
      getDocument(attemptPath, accessToken, transaction),
      getDocument(playerPath, accessToken, transaction),
      getDocument(leaderboardPath, accessToken, transaction),
      getDocument(operationPath, accessToken, transaction)
    ]);
    if (operationDoc) {
      const stored = decodeFirestoreFields(operationDoc.fields || {});
      if (stored.uid !== uid || stored.eventId !== eventId || stored.attemptId !== attemptId
          || stored.questionId !== questionId || stored.answerKey !== answerKey) {
        throw new Error('IDEMPOTENCY_KEY_REUSED');
      }
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken, { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      return { duplicate: true, result: stored.result || null, leaderboardUpdated: false };
    }
    if (!eventDoc) throw new Error('EVENT_NOT_FOUND');
    if (!participantDoc) throw new Error('EVENT_PARTICIPATION_NOT_FOUND');
    if (!attemptDoc) throw new Error('EVENT_ATTEMPT_NOT_FOUND');
    if (!playerDoc) throw new Error('PLAYER_PROFILE_NOT_READY');
    const participant = decodeFirestoreFields(participantDoc.fields || {});
    if (participant.uid !== uid) throw new Error('EVENT_PARTICIPATION_NOT_FOUND');
    const event = decodeFirestoreFields(eventDoc.fields || {});
    const attempt = decodeFirestoreFields(attemptDoc.fields || {});
    const outcome = buildGemEventAnswerResult({
      event, attempt, uid, eventId, attemptId, questionId, answerKey,
      operationId, now: Date.now()
    });
    const writes = [
      {
        update: { name: base + attemptPath, fields: encodeFirestoreFields(outcome.attempt) },
        updateMask: { fieldPaths: Object.keys(outcome.attempt) },
        currentDocument: { exists: true }
      }
    ];
    let leaderboardUpdated = false;
    if (outcome.result.done) {
      const currentOpenAttempts = event.openAttempts === undefined ? 0 : Number(event.openAttempts);
      if (!Number.isSafeInteger(currentOpenAttempts) || currentOpenAttempts < 1) {
        throw new Error('INVALID_EVENT_CONFIG');
      }
      writes.push({
        update: { name: base + eventPath, fields: encodeFirestoreFields({ openAttempts: currentOpenAttempts - 1 }) },
        updateMask: { fieldPaths: ['openAttempts'] },
        currentDocument: { exists: true }
      });
      const player = decodeFirestoreFields(playerDoc.fields || {});
      const prior = decodeFirestoreFields(leaderboardDoc && leaderboardDoc.fields);
      const board = buildGemEventLeaderboardEntry({
        attempt: outcome.attempt,
        previous: prior,
        uid,
        displayName: player.displayName || 'Student',
        now: Date.now()
      });
      if (board.changed) {
        writes.push({
          update: { name: base + leaderboardPath, fields: encodeFirestoreFields(board.entry) },
          updateMask: { fieldPaths: Object.keys(board.entry) },
          currentDocument: { exists: !!leaderboardDoc }
        });
        leaderboardUpdated = true;
      }
    }
    const operationRecord = {
      uid, eventId, attemptId, questionId, answerKey,
      createdAt: Date.now(),
      result: outcome.result
    };
    writes.push({
      update: { name: base + operationPath, fields: encodeFirestoreFields(operationRecord) },
      updateMask: { fieldPaths: Object.keys(operationRecord) },
      currentDocument: { exists: false }
    });
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      { method: 'POST', body: { transaction, writes } }
    );
    finished = true;
    return { duplicate: false, result: outcome.result, leaderboardUpdated };
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}

async function applyGemChange(uid, action, amount, operationId, accessToken) {
  const base = 'projects/' + PROJECT_ID + '/databases/(default)/documents/';
  const playerPath = 'players/' + encodeURIComponent(uid);
  const receiptPath = 'gemTransactions/' + encodeURIComponent(uid + '_' + operationId);
  const playerName = base + playerPath;
  const receiptName = base + receiptPath;

  const transactionResult = await firestoreRequest(
    'projects/' + PROJECT_ID + '/databases/(default)/documents:beginTransaction',
    accessToken,
    { method: 'POST', body: {} }
  );
  const transaction = transactionResult.transaction;
  if (!transaction) throw new Error('FIRESTORE_TRANSACTION_FAILED');
  let finished = false;
  try {
    const [player, receiptDoc] = await Promise.all([
      getDocument(playerPath, accessToken, transaction),
      getDocument(receiptPath, accessToken, transaction)
    ]);
    if (!player) throw new Error('PLAYER_PROFILE_NOT_READY');

    const fields = player.fields || {};
    const before = fields.gems ? parseIntegerField(fields.gems, 0) : 0;
    if (!Number.isSafeInteger(before) || before < 0 || before > MAX_BALANCE) {
      throw new Error('INVALID_GEM_BALANCE');
    }
    const recentOps = parseStringArray(fields.gemOps);

    if (receiptDoc) {
      const stored = decodeFirestoreFields(receiptDoc.fields || {});
      if (stored.uid !== uid) throw new Error('GEM_RECEIPT_INVALID');
      if (stored.action !== 'legacy' && (stored.action !== action || stored.amount !== amount)) {
        throw new Error('IDEMPOTENCY_KEY_REUSED');
      }
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken,
        { method: 'POST', body: { transaction, writes: [] } }
      );
      finished = true;
      const prior = stored.result && typeof stored.result === 'object' ? stored.result : {
        previous: Number.isSafeInteger(stored.previous) ? stored.previous : before,
        balance: Number.isSafeInteger(stored.balance) ? stored.balance : before,
        change: Number.isSafeInteger(stored.change) ? stored.change : 0
      };
      return { ...prior, duplicate: true, operations: recentOps };
    }

    if (recentOps.includes(operationId)) {
      // Migrate a legacy rolling operation ID to a permanent receipt so it
      // cannot become replayable after it ages out of players.gemOps.
      const result = { previous: before, balance: before, change: 0, duplicate: true, operations: recentOps };
      const receipt = {
        uid, operationId, action: 'legacy', amount: 0,
        currency: 'gems', kind: 'owner_adjustment', direction: 'credit',
        referenceId: operationId, description: 'Migrated legacy Gem operation',
        previous: before, balance: before, change: 0,
        balanceBefore: before, balanceAfter: before, source: 'owner',
        createdAt: Date.now(), result
      };
      await firestoreRequest(
        'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
        accessToken,
        {
          method: 'POST',
          body: {
            transaction,
            writes: [{
              update: { name: receiptName, fields: encodeFirestoreFields(receipt) },
              updateMask: { fieldPaths: Object.keys(receipt) },
              currentDocument: { exists: false }
            }]
          }
        }
      );
      finished = true;
      return result;
    }

    if (action === 'spend' && before < amount) {
      const error = new Error('INSUFFICIENT_GEMS');
      error.code = 'INSUFFICIENT_GEMS';
      throw error;
    }
    const after = action === 'earn' ? before + amount : before - amount;
    if (!Number.isSafeInteger(after) || after < 0 || after > MAX_BALANCE) {
      throw new Error('GEM_BALANCE_LIMIT');
    }
    const operations = [...recentOps, operationId].slice(-MAX_RECENT_OPS);
    const result = {
      previous: before,
      balance: after,
      change: action === 'earn' ? amount : -amount,
      duplicate: false,
      operations
    };
    const receipt = {
      uid,
      operationId,
      action,
      amount,
      currency: 'gems',
      kind: 'owner_adjustment',
      direction: action === 'earn' ? 'credit' : 'debit',
      referenceId: operationId,
      description: action === 'earn' ? 'Owner Gem grant' : 'Owner Gem deduction',
      previous: before,
      balance: after,
      change: result.change,
      balanceBefore: before,
      balanceAfter: after,
      source: 'owner',
      createdAt: Date.now(),
      result
    };
    const writes = [
      {
        update: {
          name: playerName,
          fields: {
            gems: { integerValue: String(after) },
            gemOps: { arrayValue: { values: operations.map(value => ({ stringValue: value })) } }
          }
        },
        updateMask: { fieldPaths: ['gems', 'gemOps'] },
        currentDocument: { exists: true }
      },
      {
        update: { name: receiptName, fields: encodeFirestoreFields(receipt) },
        updateMask: { fieldPaths: Object.keys(receipt) },
        currentDocument: { exists: false }
      }
    ];
    await firestoreRequest(
      'projects/' + PROJECT_ID + '/databases/(default)/documents:commit',
      accessToken,
      { method: 'POST', body: { transaction, writes } }
    );
    finished = true;
    return result;
  } finally {
    if (!finished) await rollbackTransaction(transaction, accessToken);
  }
}


async function settleDueGemEvents(env) {
  try {
    const accessToken = await getFirestoreAccessToken(env);
    const now = Date.now();
    let pageToken = "";
    let pages = 0;
    let settledCount = 0;
    const maxSettlementsPerRun = 5;
    do {
      const query = "?pageSize=100" + (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "");
      const listing = await firestoreRequest(
        "projects/" + PROJECT_ID + "/databases/(default)/documents/gemEvents" + query,
        accessToken
      );
      for (const document of listing.documents || []) {
        if (settledCount >= maxSettlementsPerRun) break;
        const event = decodeFirestoreFields(document.fields || {});
        if (event.status !== "active" || !Number.isSafeInteger(event.closesAt)
            || now < event.closesAt + EVENT_FINISH_GRACE_MS) continue;
        const name = String(document.name || "");
        const eventId = decodeURIComponent(name.split("/").pop() || "");
        if (!validateGemEventId(eventId)) continue;
        try {
          await applyGemEventSettlement(eventId, accessToken);
          settledCount += 1;
        } catch (error) {
          console.error("Scheduled Gem event settlement failed:", eventId, error && error.message ? error.message : "unknown error");
        }
      }
      if (settledCount >= maxSettlementsPerRun) break;
      pageToken = listing.nextPageToken || "";
      pages += 1;
    } while (pageToken && pages < 10);
    return { settledCount, pages };
  } catch (error) {
    console.error("Scheduled Gem event scan failed:", error && error.message ? error.message : "unknown error");
    return { settledCount: 0, error: true };
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
    if (request.method !== 'POST' || !['/gems', '/practice', '/shop', '/powerups/use', '/duels/start', '/duels/next', '/duels/answer', '/duels/forfeit', '/duels/settle', '/events/configure', '/events/activate', '/events/close', '/events/settle', '/events/enter', '/events/retry', '/events/next', '/events/answer'].includes(url.pathname)) {
      return json({ ok: false, error: 'NOT_FOUND' }, 404, origin);
    }
    let payload;
    try {
      const raw = await request.text();
      const maxBytes = url.pathname === '/practice' ? 12000 : 4096;
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

      if (url.pathname === '/shop') {
        const itemId = payload && typeof payload.itemId === 'string' ? payload.itemId.trim() : '';
        const operationId = payload && typeof payload.operationId === 'string' ? payload.operationId.trim() : '';
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(itemId)) {
          return json({ ok: false, code: 'INVALID_SHOP_ITEM', error: 'That shop item is not available.' }, 400, origin);
        }
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) {
          return json({ ok: false, code: 'INVALID_OPERATION_ID', error: 'A valid purchase ID is required.' }, 400, origin);
        }
        const outcome = await applyShopPurchase(identity.uid, itemId, operationId, accessToken);
        return json({ ok: true, ...outcome }, 200, origin);
      }

      if (url.pathname === '/powerups/use') {
        const itemId = payload && typeof payload.itemId === 'string' ? payload.itemId.trim() : '';
        const operationId = payload && typeof payload.operationId === 'string' ? payload.operationId.trim() : '';
        const duelCode = payload && typeof payload.duelCode === 'string' ? payload.duelCode.trim().toUpperCase() : '';
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(itemId) || !getPowerupUse(itemId)) {
          return json({ ok: false, code: 'INVALID_POWERUP_ITEM', error: 'That power-up cannot be used here.' }, 400, origin);
        }
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) {
          return json({ ok: false, code: 'INVALID_OPERATION_ID', error: 'A valid use ID is required.' }, 400, origin);
        }
        if (duelCode && !validateDuelCode(duelCode)) {
          return json({ ok: false, code: 'INVALID_DUEL_CODE', error: 'The duel code is invalid.' }, 400, origin);
        }
        const outcome = await applyPowerupUse(identity.uid, itemId, operationId, accessToken, duelCode);
        return json({ ok: true, ...outcome }, 200, origin);
      }

      if (url.pathname === '/events/configure') {
        const eventId = payload && typeof payload.eventId === 'string' ? payload.eventId.trim() : '';
        if (!validateGemEventId(eventId)) {
          return json({ ok: false, code: 'INVALID_EVENT_ID', error: 'The event ID is invalid.' }, 400, origin);
        }
        const outcome = await applyGemEventDraftConfig(identity.uid, eventId, payload || {}, accessToken);
        return json({ ok: true, ...outcome }, 200, origin);
      }

      if (url.pathname === '/events/activate' || url.pathname === '/events/close' || url.pathname === '/events/settle') {
        const eventId = payload && typeof payload.eventId === 'string' ? payload.eventId.trim() : '';
        if (!validateGemEventId(eventId)) {
          return json({ ok: false, code: 'INVALID_EVENT_ID', error: 'The event ID is invalid.' }, 400, origin);
        }
        const outcome = url.pathname === '/events/activate'
          ? await applyGemEventActivation(identity.uid, eventId, accessToken)
          : url.pathname === '/events/close'
            ? await applyGemEventEarlyClose(identity.uid, eventId, accessToken)
            : await applyGemEventSettlement(eventId, accessToken);
        return json({ ok: true, ...outcome }, 200, origin);
      }

      if (url.pathname === '/events/next' || url.pathname === '/events/answer') {
        const eventId = payload && typeof payload.eventId === 'string' ? payload.eventId.trim() : '';
        const attemptId = payload && typeof payload.attemptId === 'string' ? payload.attemptId.trim() : '';
        if (!validateGemEventId(eventId)) {
          return json({ ok: false, code: 'INVALID_EVENT_ID', error: 'The event ID is invalid.' }, 400, origin);
        }
        if (!validateOperationUuid(attemptId)) {
          return json({ ok: false, code: 'INVALID_ATTEMPT_ID', error: 'The event attempt ID is invalid.' }, 400, origin);
        }
        if (url.pathname === '/events/next') {
          const outcome = await startGemEventQuestion(identity.uid, eventId, attemptId, accessToken);
          return json({ ok: true, ...outcome }, 200, origin);
        }
        const questionId = payload && typeof payload.questionId === 'string' ? payload.questionId.trim() : '';
        const answerKey = payload && Object.prototype.hasOwnProperty.call(payload, 'answerKey') ? payload.answerKey : null;
        const operationId = payload && typeof payload.operationId === 'string' ? payload.operationId.trim() : '';
        if (!isKnownQuestionId(questionId)) {
          return json({ ok: false, code: 'INVALID_QUESTION_ID', error: 'That event question is not valid.' }, 400, origin);
        }
        if (answerKey !== null && (typeof answerKey !== 'string' || !/^[A-D]$/.test(answerKey))) {
          return json({ ok: false, code: 'INVALID_EVENT_ANSWER', error: 'That event answer is not valid.' }, 400, origin);
        }
        if (!validateOperationUuid(operationId)) {
          return json({ ok: false, code: 'INVALID_OPERATION_ID', error: 'A valid event answer ID is required.' }, 400, origin);
        }
        const outcome = await submitGemEventAnswer(
          identity.uid, eventId, attemptId, questionId, answerKey, operationId, accessToken
        );
        return json({ ok: true, ...outcome }, 200, origin);
      }

      if (url.pathname === '/events/enter' || url.pathname === '/events/retry') {
        const eventId = payload && typeof payload.eventId === 'string' ? payload.eventId.trim() : '';
        const operationId = payload && typeof payload.operationId === 'string' ? payload.operationId.trim() : '';
        if (!validateGemEventId(eventId)) {
          return json({ ok: false, code: 'INVALID_EVENT_ID', error: 'The event ID is invalid.' }, 400, origin);
        }
        if (!validateOperationUuid(operationId)) {
          return json({ ok: false, code: 'INVALID_OPERATION_ID', error: 'A valid event operation ID is required.' }, 400, origin);
        }
        if (url.pathname === '/events/enter') {
          const outcome = await applyGemEventEntry(identity.uid, eventId, operationId, accessToken);
          return json({ ok: true, ...outcome }, 200, origin);
        }
        const attemptId = payload && typeof payload.attemptId === 'string' ? payload.attemptId.trim() : '';
        if (!validateOperationUuid(attemptId)) {
          return json({ ok: false, code: 'INVALID_ATTEMPT_ID', error: 'The event attempt ID is invalid.' }, 400, origin);
        }
        const outcome = await applyGemEventRetry(identity.uid, eventId, attemptId, operationId, accessToken);
        return json({ ok: true, ...outcome }, 200, origin);
      }

      if (url.pathname.startsWith('/duels/')) {
        const code = payload && typeof payload.code === 'string' ? payload.code.trim().toUpperCase() : '';
        if (!validateDuelCode(code)) {
          return json({ ok: false, code: 'INVALID_DUEL_CODE', error: 'The duel code is invalid.' }, 400, origin);
        }
        if (url.pathname === '/duels/start') {
          const outcome = await startDuelProgress(identity.uid, code, accessToken);
          return json({ ok: true, ...outcome }, 200, origin);
        }
        if (url.pathname === '/duels/next') {
          const questionId = payload && typeof payload.questionId === 'string' ? payload.questionId.trim() : '';
          if (!isKnownQuestionId(questionId)) {
            return json({ ok: false, code: 'INVALID_QUESTION_ID', error: 'That duel question is not valid.' }, 400, origin);
          }
          const outcome = await startDuelQuestion(identity.uid, code, questionId, accessToken);
          return json({ ok: true, ...outcome }, 200, origin);
        }
        if (url.pathname === '/duels/answer') {
          const questionId = payload && typeof payload.questionId === 'string' ? payload.questionId.trim() : '';
          const answerKey = payload && Object.prototype.hasOwnProperty.call(payload, 'answerKey') ? payload.answerKey : null;
          const operationId = payload && typeof payload.operationId === 'string' ? payload.operationId.trim() : '';
          if (!isKnownQuestionId(questionId)) {
            return json({ ok: false, code: 'INVALID_QUESTION_ID', error: 'That duel question is not valid.' }, 400, origin);
          }
          if (answerKey !== null && (typeof answerKey !== 'string' || !/^[A-D]$/.test(answerKey))) {
            return json({ ok: false, code: 'INVALID_DUEL_ANSWER', error: 'That answer is not valid.' }, 400, origin);
          }
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId)) {
            return json({ ok: false, code: 'INVALID_OPERATION_ID', error: 'A valid answer ID is required.' }, 400, origin);
          }
          const outcome = await submitDuelAnswer(identity.uid, code, questionId, answerKey, operationId, accessToken);
          return json({ ok: true, ...outcome }, 200, origin);
        }
        if (url.pathname === '/duels/forfeit') {
          const outcome = await forfeitDuel(identity.uid, code, accessToken);
          return json({ ok: true, ...outcome }, 200, origin);
        }
        if (url.pathname === '/duels/settle') {
          const outcome = await settleDuel(identity.uid, code, accessToken);
          return json({ ok: true, ...outcome }, 200, origin);
        }
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
      const eventErrors = {
        EVENT_NOT_FOUND: ['That event could not be found.', 404],
        EVENT_OWNER_REQUIRED: ['Only the authenticated Owner can configure events.', 403],
        EVENT_CONFIG_LOCKED: ['This event can only be changed while it is a draft with no paid entries.', 409],
        EVENT_NOT_ACTIVE: ['That event is not active.', 409],
        EVENT_NOT_DRAFT: ['Only an inactive draft can be activated.', 409],
        EVENT_CLOSE_REQUIRED: ['Set a future closing time before activating an event.', 409],
        INVALID_EVENT_PRIZES: ['Set valid first, second and third place Gem prizes. The total prize pool must not exceed 1,000,000 Gems.', 400],
        EVENT_SETTLEMENT_NOT_READY: ['The event must close and its 24-hour finish window must pass before prizes are settled.', 409],
        EVENT_ATTEMPT_EXPIRED: ['The 24-hour finish window for this event has ended.', 409],
        EVENT_PRIZE_ALREADY_PAID: ['A prize receipt already exists for this event winner. Please ask the Owner to review the event.', 409],
        INVALID_GEM_BALANCE: ['A winner Gem balance needs review before prizes can be paid.', 409],
        PLAYER_BALANCE_LIMIT: ['A prize would exceed the supported Gem balance limit.', 409],
        EVENT_NOT_OPEN: ['That event has not opened yet.', 409],
        EVENT_CLOSED: ['That event has closed.', 409],
        EVENT_ENTRY_LIMIT_REACHED: ['You have used all entries allowed for this event.', 409],
        EVENT_RETRY_DISABLED: ['Retries are not enabled for this event.', 409],
        EVENT_RETRY_LIMIT_REACHED: ['You have used all retries allowed for this entry.', 409],
        EVENT_PARTICIPATION_NOT_FOUND: ['Your event entry could not be found.', 404],
        EVENT_ATTEMPT_NOT_FOUND: ['That event attempt could not be found.', 404],
        EVENT_ATTEMPT_NOT_PLAYABLE: ['This event attempt is no longer active.', 409],
        EVENT_ATTEMPT_FINISHED: ['This event attempt has already finished.', 409],
        EVENT_ATTEMPT_NOT_FINISHED: ['Finish the attempt before claiming its leaderboard result.', 409],
        EVENT_QUESTION_SEQUENCE: ['That is not the current event question.', 409],
        EVENT_QUESTION_NOT_STARTED: ['Start the current event question before submitting an answer.', 409],
        INVALID_EVENT_ANSWER: ['That event answer is not valid.', 400],
        EVENT_ATTEMPT_NOT_RETRYABLE: ['That attempt has already been replaced or closed.', 409],
        INVALID_EVENT_CONFIG: ['The event configuration needs Owner review.', 409],
        INVALID_EVENT_QUESTIONS: ['Choose between 3 and 50 valid questions from the BECE question bank.', 400],
        INVALID_EVENT_REQUEST: ['The event request is invalid.', 400],
        INVALID_EVENT_TIME: ['The event timing is invalid.', 400],
        INVALID_EVENT_ID: ['The event ID is invalid.', 400],
        INVALID_EVENT_PARTICIPATION: ['Your event participation record needs review.', 409],
        INVALID_EVENT_ATTEMPT: ['Your event attempt record needs review.', 409],
        INVALID_COIN_BALANCE: ['Your Coin balance needs review.', 409],
        INVALID_ATTEMPT_ID: ['The event attempt ID is invalid.', 400],
        IDEMPOTENCY_KEY_REUSED: ['This operation ID was already used for a different action.', 409]
      };
      if (error && eventErrors[error.message]) {
        const [message, status] = eventErrors[error.message];
        return json({ ok: false, code: error.message, error: message }, status, origin);
      }


      const duelErrors = {
        DUEL_NOT_FOUND: 'That duel could not be found.',
        DUEL_NOT_PLAYING: 'That duel is not active.',
        DUEL_NOT_PARTICIPANT: 'You are not a participant in this duel.',
        DUEL_NOT_STARTED: 'Your secure duel session has not started.',
        DUEL_SESSION_MISMATCH: 'This duel session does not match your account.',
        DUEL_ALREADY_FINISHED: 'This duel is already finished.',
        DUEL_ALREADY_SETTLED: 'This Duel has already been settled.',
        DUEL_QUESTION_SEQUENCE: 'The answer does not match the current duel question.',
        DUEL_SECOND_CHANCE_LIMIT: 'No more Second Chances are available for this duel question.',
        DUEL_SETTLEMENT_INVALID: 'The saved duel result could not be verified.',
        DUEL_CODE_REQUIRED: 'A valid active Duel is required to use Second Chance.',
        IDEMPOTENCY_KEY_REUSED: 'This answer retry ID was already used for a different answer.',
        INVALID_DUEL: 'The duel information is invalid.',
        INVALID_DUEL_QUESTIONS: 'The duel contains an unsupported question.',
        INVALID_DUEL_SETTINGS: 'The duel settings are invalid.',
        INVALID_DUEL_TIME: 'The answer timing is invalid.',
        INVALID_DUEL_DAY: 'The settlement date is invalid.',
        INVALID_DUEL_SESSION: 'The duel session is invalid.',
        INVALID_DUEL_CODE: 'The duel code is invalid.',
        INVALID_DUEL_ANSWER: 'The submitted answer is invalid.',
        INVALID_OPERATION_ID: 'The answer operation ID is invalid.',
        INVALID_QUESTION_ID: 'The duel question is invalid.',
        INVALID_PLAYER_BALANCE: 'The player balance needs review.',
        PLAYER_BALANCE_LIMIT: 'This player has reached the maximum supported Coin balance.'
      };
      if (error && duelErrors[error.message]) {
        const status = error.message === 'DUEL_NOT_PARTICIPANT' ? 403
          : error.message === 'DUEL_NOT_FOUND' ? 404 : 409;
        return json({ ok: false, code: error.message, error: duelErrors[error.message] }, status, origin);
      }
      if (error && error.message === 'IDEMPOTENCY_KEY_REUSED') {
        return json({ ok: false, code: 'IDEMPOTENCY_KEY_REUSED', error: 'This Gem operation ID was already used for a different action.' }, 409, origin);
      }
      if (error && error.message === 'GEM_RECEIPT_INVALID') {
        return json({ ok: false, code: 'GEM_RECEIPT_INVALID', error: 'This Gem operation receipt needs Owner review.' }, 409, origin);
      }
      if (error && error.message === 'INSUFFICIENT_GEMS') {
        return json({ ok: false, code: 'INSUFFICIENT_GEMS', error: 'You do not have enough Gems.' }, 409, origin);
      }
      if (error && error.message === 'PLAYER_PROFILE_NOT_READY') {
        return json({ ok: false, code: 'PLAYER_PROFILE_NOT_READY', error: 'Your player profile is still being created. Please try again shortly.' }, 409, origin);
      }
      if (error && error.message === 'PLAYER_BALANCE_LIMIT') {
        return json({ ok: false, code: 'PLAYER_BALANCE_LIMIT', error: 'This account has reached the maximum supported reward balance.' }, 409, origin);
      }
      if (error && error.message === 'INSUFFICIENT_COINS') {
        return json({ ok: false, code: 'INSUFFICIENT_COINS', error: 'You do not have enough Coins for that purchase or event action.' }, 409, origin);
      }
      if (error && error.message === 'ITEM_ALREADY_OWNED') {
        return json({ ok: false, code: 'ITEM_ALREADY_OWNED', error: 'You already own that item.' }, 409, origin);
      }
      if (error && error.message === 'SHOP_PAUSED') {
        return json({ ok: false, code: 'SHOP_PAUSED', error: 'Shop purchases are temporarily paused.' }, 403, origin);
      }
      if (error && error.message === 'INVALID_POWERUP_BALANCE') {
        return json({ ok: false, code: 'INVALID_POWERUP_BALANCE', error: 'This power-up balance needs Owner review.' }, 409, origin);
      }
      if (error && error.message === 'NO_POWERUP_AVAILABLE') {
        return json({ ok: false, code: 'NO_POWERUP_AVAILABLE', error: 'You do not have a Second Chance available.' }, 409, origin);
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
  },
  async scheduled(controller, env, ctx) {
    await settleDueGemEvents(env);
  }
};