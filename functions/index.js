"use strict";

const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");

admin.initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

function fail(code, message) { throw new HttpsError(code, message); }
function uidOf(req) {
  if (!req.auth || !req.auth.uid) fail("unauthenticated", "Sign in before using this feature.");
  return req.auth.uid;
}
function intIn(value, min, max, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) fail("invalid-argument", label + " is outside the permitted range.");
  return n;
}
function strIn(value, min, max, label) {
  const s = String(value ?? "").trim();
  if (s.length < min || s.length > max) fail("invalid-argument", label + " must be between " + min + " and " + max + " characters.");
  return s;
}
function millis(value) {
  if (value && typeof value.toMillis === "function") return value.toMillis();
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
function utcDate(ms = Date.now()) { return new Date(ms).toISOString().slice(0, 10); }
const wallet = uid => db.collection("gemWallets").doc(uid);
const gemTx = () => db.collection("gemTransactions").doc();
const coinTx = () => db.collection("coinTransactions").doc();
const eventDoc = id => db.collection("gemEvents").doc(String(id || ""));
const participant = (eventId, uid) => eventDoc(eventId).collection("participants").doc(uid);
const attempt = (eventId, uid, attemptId) => participant(eventId, uid).collection("attempts").doc(attemptId);
const answerKey = id => db.collection("gemEventAnswerKeys").doc(id);

async function activeStaffRole(uid) {
  const [ownerSession, ownerConfig, adminSession, adminConfig, roster] = await Promise.all([
    db.collection("ownerSessions").doc(uid).get(),
    db.collection("config").doc("owner").get(),
    db.collection("adminSessions").doc(uid).get(),
    db.collection("config").doc("admin").get(),
    db.collection("staffRoster").doc(uid).get()
  ]);
  const now = Date.now();
  if (ownerSession.exists && ownerConfig.exists) {
    const s = ownerSession.data(), c = ownerConfig.data(), age = now - millis(s.at);
    if (age >= 0 && age <= 30 * 60 * 1000 && s.pw1 === c.pw1 && s.pw2 === c.pw2) return "owner";
  }
  if (adminSession.exists) {
    const s = adminSession.data(), age = now - millis(s.at);
    if (age >= 0 && age <= 2 * 60 * 60 * 1000) {
      if (roster.exists && roster.data().appointed === true) return "admin";
      if (adminConfig.exists && s.pin === adminConfig.data().pin) return "admin";
    }
  }
  return null;
}
async function requireStaff(req) {
  const uid = uidOf(req), role = await activeStaffRole(uid);
  if (!role) fail("permission-denied", "An active Owner or Admin session is required.");
  return { uid, role };
}
function requireActiveEvent(data) {
  const now = Date.now();
  if (data.status !== "active") fail("failed-precondition", "This event is not open for entry.");
  if (millis(data.startsAt) > now) fail("failed-precondition", "This event has not started yet.");
  if (millis(data.endsAt) < now) fail("failed-precondition", "This event has ended.");
}
function safeEvent(id, d) {
  return {
    id, name: d.name, description: d.description, status: d.status,
    entryFeeCoins: d.entryFeeCoins, maxEntriesPerUser: d.maxEntriesPerUser,
    retriesEnabled: d.retriesEnabled, retryFeeCoins: d.retryFeeCoins,
    maxRetriesPerUser: d.maxRetriesPerUser, startsAt: millis(d.startsAt),
    endsAt: millis(d.endsAt), questionCount: d.questionCount,
    participantCount: d.participantCount || 0, maxParticipants: d.maxParticipants || 0,
    ranked: d.ranked === true, participationGems: d.participationGems || 0,
    completionGems: d.completionGems || 0, completionThreshold: d.completionThreshold || 0,
    placementRewards: d.placementRewards || {}, timeLimitSeconds: d.timeLimitSeconds || 0
  };
}
function questionShape(q, index) {
  const prompt = strIn(q && q.prompt, 5, 700, "Question " + (index + 1));
  const options = Array.isArray(q.options) ? q.options : [];
  if (options.length < 2 || options.length > 5) fail("invalid-argument", "Each question needs 2 to 5 answer options.");
  const seen = new Set();
  const clean = options.map(option => {
    const id = strIn(option && option.id, 1, 8, "Option ID");
    const text = strIn(option && option.text, 1, 240, "Option text");
    if (seen.has(id)) fail("invalid-argument", "Option IDs must be unique within each question.");
    seen.add(id);
    return { id, text };
  });
  const correctOptionId = String(q.correctOptionId || "");
  if (!seen.has(correctOptionId)) fail("invalid-argument", "Choose a correct answer for each question.");
  return {
    id: "q" + String(index + 1).padStart(2, "0"), prompt,
    topic: String(q.topic || "General").trim().slice(0, 80),
    options: clean, correctOptionId,
    explanation: String(q.explanation || "").trim().slice(0, 700)
  };
}
function publicQuestion(q) {
  return { id: q.id, prompt: q.prompt, topic: q.topic, options: q.options };
}
function eventQuestionOptions(qs) {
  const result = {};
  for (const q of qs) result[q.id] = {
    correctOptionId: q.correctOptionId,
    allowedOptionIds: q.options.map(x => x.id),
    explanation: q.explanation
  };
  return result;
}

// Wallet and history
exports.getGemWallet = onCall(async req => {
  const uid = uidOf(req), ref = wallet(uid);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) tx.create(ref, {
      uid, balance: 0, dailyStreak: 0, lastDailyClaimDate: "",
      createdAt: Timestamp.now(), updatedAt: Timestamp.now()
    });
  });
  const d = (await ref.get()).data();
  return { balance: Math.max(0, Number(d.balance || 0)), dailyStreak: d.dailyStreak || 0, lastDailyClaimDate: d.lastDailyClaimDate || "" };
});

exports.getGemTransactions = onCall(async req => {
  const uid = uidOf(req);
  const limit = intIn(req.data && req.data.limit || 30, 1, 100, "History limit");
  const snap = await db.collection("gemTransactions").where("uid", "==", uid).orderBy("createdAt", "desc").limit(limit).get();
  return { transactions: snap.docs.map(d => {
    const x = d.data();
    return { id: d.id, amount: x.amount, balanceAfter: x.balanceAfter, type: x.type, reason: x.reason, createdAt: millis(x.createdAt) };
  }) };
});

exports.claimDailyGemReward = onCall(async req => {
  const uid = uidOf(req), today = utcDate(), yesterday = utcDate(Date.now() - 86400000);
  const pRef = db.collection("players").doc(uid), wRef = wallet(uid), tRef = gemTx();
  let result;
  await db.runTransaction(async tx => {
    const [pSnap, wSnap] = await Promise.all([tx.get(pRef), tx.get(wRef)]);
    if (!pSnap.exists) fail("failed-precondition", "Your study profile is not ready yet.");
    const p = pSnap.data();
    if (p.lastDay !== today || Number(p.dayExp || 0) < 1) fail("failed-precondition", "Complete a learning activity today before claiming the daily Gem.");
    const w = wSnap.exists ? wSnap.data() : {};
    if (w.lastDailyClaimDate === today) fail("already-exists", "Today's daily reward has already been claimed.");
    const streak = w.lastDailyClaimDate === yesterday ? Number(w.dailyStreak || 0) + 1 : 1;
    const reward = streak % 7 === 0 ? 5 : 1;
    const balance = Number(w.balance || 0) + reward;
    tx.set(wRef, { uid, balance, dailyStreak: streak, lastDailyClaimDate: today, updatedAt: Timestamp.now() }, { merge: true });
    tx.create(tRef, { uid, amount: reward, balanceAfter: balance, type: "daily_reward", reason: streak % 7 === 0 ? "Seven-day learning streak bonus" : "Daily learning reward", createdAt: Timestamp.now() });
    result = { reward, balance, streak, weeklyBonus: streak % 7 === 0 };
  });
  return result;
});

// Events
exports.listGemEvents = onCall(async req => {
  const uid = uidOf(req), role = await activeStaffRole(uid);
  const snap = await db.collection("gemEvents").orderBy("startsAt", "desc").limit(60).get();
  const events = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    if (role || d.status === "active") {
      const p = await participant(doc.id, uid).get();
      const pd = p.exists ? p.data() : {};
      events.push({
        ...safeEvent(doc.id, d),
        entriesUsed: pd.entriesUsed || 0, retriesUsed: pd.retriesUsed || 0,
        retriesRemaining: Math.max(0, Number(d.maxRetriesPerUser || 0) - Number(pd.retriesUsed || 0)),
        bestScore: pd.bestScore ?? null, lastAttemptStatus: pd.lastAttemptStatus || "",
        participationRewardPaid: pd.participationRewardPaid === true
      });
    }
  }
  return { events };
});

exports.createGemEvent = onCall(async req => {
  const { uid } = await requireStaff(req), d = req.data || {};
  const name = strIn(d.name, 4, 80, "Event name");
  const description = String(d.description || "").trim().slice(0, 800);
  const entryFeeCoins = intIn(d.entryFeeCoins, 1, 100000, "Entry fee");
  const maxEntriesPerUser = intIn(d.maxEntriesPerUser, 1, 10, "Entry limit");
  const retriesEnabled = d.retriesEnabled === true;
  const retryFeeCoins = retriesEnabled ? intIn(d.retryFeeCoins, 1, 100000, "Retry fee") : 0;
  const maxRetriesPerUser = retriesEnabled ? intIn(d.maxRetriesPerUser, 1, 5, "Retry limit") : 0;
  const startsAt = intIn(d.startsAt, Date.now() - 86400000, Date.now() + 365 * 86400000, "Start time");
  const endsAt = intIn(d.endsAt, startsAt + 60000, startsAt + 90 * 86400000, "End time");
  const timeLimitSeconds = intIn(d.timeLimitSeconds || 0, 0, 7200, "Time limit");
  const input = Array.isArray(d.questions) ? d.questions : [];
  if (input.length < 3 || input.length > 30) fail("invalid-argument", "Add between 3 and 30 questions.");
  const qs = input.map(questionShape), keys = eventQuestionOptions(qs);
  const ref = eventDoc();
  const participationGems = intIn(d.participationGems ?? 1, 0, 100, "Participation reward");
  const completionGems = intIn(d.completionGems ?? 0, 0, 100, "Completion reward");
  const completionThreshold = intIn(d.completionThreshold ?? 50, 0, 100, "Completion threshold");
  const placementRewards = {
    first: intIn(d.firstPlaceGems ?? 10, 0, 500, "First-place reward"),
    second: intIn(d.secondPlaceGems ?? 7, 0, 500, "Second-place reward"),
    third: intIn(d.thirdPlaceGems ?? 5, 0, 500, "Third-place reward")
  };
  const batch = db.batch();
  batch.create(ref, {
    name, description, entryFeeCoins, maxEntriesPerUser, retriesEnabled, retryFeeCoins,
    maxRetriesPerUser, startsAt, endsAt, timeLimitSeconds, status: "draft",
    ranked: d.ranked !== false, maxParticipants: Math.max(0, Math.min(100000, Number(d.maxParticipants || 0))),
    participationGems, completionGems, completionThreshold, placementRewards,
    questionCount: qs.length, participantCount: 0,
    createdBy: uid, createdAt: Timestamp.now(), updatedAt: Timestamp.now()
  });
  for (const q of qs) batch.create(ref.collection("questions").doc(q.id), publicQuestion(q));
  batch.create(answerKey(ref.id), { answers: keys, createdAt: Timestamp.now() });
  await batch.commit();
  return { eventId: ref.id, status: "draft" };
});

exports.setGemEventStatus = onCall(async req => {
  const { uid } = await requireStaff(req), d = req.data || {}, ref = eventDoc(d.eventId);
  const next = String(d.status || "");
  if (!["active", "paused", "cancelled", "completed"].includes(next)) fail("invalid-argument", "Choose a valid event status.");
  const snap = await ref.get();
  if (!snap.exists) fail("not-found", "Event not found.");
  const current = snap.data().status;
  const allowed = {
    draft: ["active", "cancelled"], active: ["paused", "cancelled", "completed"],
    paused: ["active", "cancelled", "completed"], completed: [], cancelled: []
  };
  if (!(allowed[current] || []).includes(next)) fail("failed-precondition", "That status change is not permitted.");
  await ref.update({ status: next, updatedAt: Timestamp.now(), updatedBy: uid });
  return { eventId: ref.id, status: next };
});

exports.enterGemEvent = onCall(async req => {
  const uid = uidOf(req), id = String((req.data || {}).eventId || "");
  if (!id) fail("invalid-argument", "An event ID is required.");
  const eRef = eventDoc(id), pRef = db.collection("players").doc(uid), partRef = participant(id, uid);
  const aRef = partRef.collection("attempts").doc(), cRef = coinTx();
  let result;
  await db.runTransaction(async tx => {
    const [eSnap, pSnap, partSnap] = await Promise.all([tx.get(eRef), tx.get(pRef), tx.get(partRef)]);
    if (!eSnap.exists || !pSnap.exists) fail("not-found", "Event or player profile not found.");
    const e = eSnap.data(), p = pSnap.data(), part = partSnap.exists ? partSnap.data() : {};
    requireActiveEvent(e);
    if (Number(part.entriesUsed || 0) >= e.maxEntriesPerUser) fail("resource-exhausted", "You have used all entries for this event.");
    if (["ready", "in_progress"].includes(part.lastAttemptStatus)) fail("failed-precondition", "Finish your current attempt before entering again.");
    if (e.maxParticipants > 0 && !partSnap.exists && Number(e.participantCount || 0) >= e.maxParticipants) fail("resource-exhausted", "This event is full.");
    const fee = Number(e.entryFeeCoins), balance = Number(p.coins || 0);
    if (balance < fee) fail("failed-precondition", "You do not have enough Coins for this entry.");
    const entriesUsed = Number(part.entriesUsed || 0) + 1;
    const ranked = e.ranked === true && entriesUsed === 1;
    tx.update(pRef, { coins: balance - fee });
    tx.set(partRef, {
      uid, entriesUsed, retriesUsed: Number(part.retriesUsed || 0),
      lastAttemptId: aRef.id, lastAttemptStatus: "ready",
      totalCoinsSpent: Number(part.totalCoinsSpent || 0) + fee,
      participationRewardPaid: part.participationRewardPaid === true,
      firstEntryAt: part.firstEntryAt || Timestamp.now(), updatedAt: Timestamp.now()
    }, { merge: true });
    tx.create(aRef, {
      uid, eventId: id, kind: "entry", entryNumber: entriesUsed, retryNumber: 0,
      paidCoins: fee, isRanked: ranked, status: "ready", createdAt: Timestamp.now()
    });
    if (!partSnap.exists) tx.update(eRef, { participantCount: FieldValue.increment(1) });
    tx.create(cRef, { uid, amount: -fee, eventId: id, type: "event_entry", createdAt: Timestamp.now() });
    result = {
      attemptId: aRef.id, entriesUsed, retriesUsed: Number(part.retriesUsed || 0),
      retriesRemaining: Math.max(0, Number(e.maxRetriesPerUser || 0) - Number(part.retriesUsed || 0)),
      ranked, coinsRemaining: balance - fee, maximumTotalCost: Number(e.maxEntriesPerUser) * fee + Number(e.maxRetriesPerUser || 0) * Number(e.retryFeeCoins || 0)
    };
  });
  return result;
});

exports.retryGemEvent = onCall(async req => {
  const uid = uidOf(req), id = String((req.data || {}).eventId || "");
  if (!id) fail("invalid-argument", "An event ID is required.");
  const eRef = eventDoc(id), pRef = db.collection("players").doc(uid), partRef = participant(id, uid);
  const aRef = partRef.collection("attempts").doc(), cRef = coinTx();
  let result;
  await db.runTransaction(async tx => {
    const [eSnap, pSnap, partSnap] = await Promise.all([tx.get(eRef), tx.get(pRef), tx.get(partRef)]);
    if (!eSnap.exists || !pSnap.exists || !partSnap.exists) fail("not-found", "Event participation not found.");
    const e = eSnap.data(), p = pSnap.data(), part = partSnap.data();
    requireActiveEvent(e);
    if (!e.retriesEnabled || Number(e.maxRetriesPerUser || 0) < 1) fail("failed-precondition", "Retries are disabled for this event.");
    if (Number(part.retriesUsed || 0) >= e.maxRetriesPerUser) fail("resource-exhausted", "You have used all permitted retries.");
    if (part.lastAttemptStatus !== "submitted" || !part.lastAttemptId) fail("failed-precondition", "Complete your current attempt before retrying.");
    const previous = await tx.get(attempt(id, uid, part.lastAttemptId));
    if (!previous.exists || previous.data().status !== "submitted") fail("failed-precondition", "Your previous attempt is not complete.");
    const fee = Number(e.retryFeeCoins), balance = Number(p.coins || 0);
    if (balance < fee) fail("failed-precondition", "You do not have enough Coins for a retry.");
    const retriesUsed = Number(part.retriesUsed || 0) + 1;
    tx.update(pRef, { coins: balance - fee });
    tx.update(partRef, {
      retriesUsed, lastAttemptId: aRef.id, lastAttemptStatus: "ready",
      totalCoinsSpent: Number(part.totalCoinsSpent || 0) + fee, updatedAt: Timestamp.now()
    });
    tx.create(aRef, {
      uid, eventId: id, kind: "retry", entryNumber: Number(part.entriesUsed || 1),
      retryNumber: retriesUsed, paidCoins: fee, isRanked: false, status: "ready", createdAt: Timestamp.now()
    });
    tx.create(cRef, { uid, amount: -fee, eventId: id, type: "event_retry", createdAt: Timestamp.now() });
    result = { attemptId: aRef.id, retriesUsed, retriesRemaining: e.maxRetriesPerUser - retriesUsed, coinsRemaining: balance - fee };
  });
  return result;
});

exports.startGemEventAttempt = onCall(async req => {
  const uid = uidOf(req), d = req.data || {}, id = String(d.eventId || ""), aid = String(d.attemptId || "");
  if (!id || !aid) fail("invalid-argument", "Event and attempt IDs are required.");
  const eRef = eventDoc(id), aRef = attempt(id, uid, aid), pRef = participant(id, uid);
  await db.runTransaction(async tx => {
    const [eSnap, aSnap, pSnap] = await Promise.all([tx.get(eRef), tx.get(aRef), tx.get(pRef)]);
    if (!eSnap.exists || !aSnap.exists || !pSnap.exists) fail("not-found", "Attempt not found.");
    const e = eSnap.data(), a = aSnap.data();
    if (a.status === "submitted") fail("failed-precondition", "This attempt has already been submitted.");
    if (a.status === "ready") {
      requireActiveEvent(e);
      tx.update(aRef, { status: "in_progress", startedAt: Timestamp.now() });
      tx.update(pRef, { lastAttemptStatus: "in_progress", updatedAt: Timestamp.now() });
    } else if (a.status !== "in_progress") fail("failed-precondition", "This attempt cannot be started.");
  });
  const [questionsSnap, eSnap] = await Promise.all([
    eRef.collection("questions").orderBy("id").get(), eRef.get()
  ]);
  return {
    attemptId: aid, questions: questionsSnap.docs.map(doc => doc.data()),
    timeLimitSeconds: Number(eSnap.data().timeLimitSeconds || 0)
  };
});

exports.submitGemEventAttempt = onCall(async req => {
  const uid = uidOf(req), d = req.data || {}, id = String(d.eventId || ""), aid = String(d.attemptId || "");
  const answers = d.answers && typeof d.answers === "object" && !Array.isArray(d.answers) ? d.answers : {};
  if (!id || !aid) fail("invalid-argument", "Event and attempt IDs are required.");
  const eRef = eventDoc(id), aRef = attempt(id, uid, aid), pRef = participant(id, uid), wRef = wallet(uid), kRef = answerKey(id);
  const tRef = gemTx();
  let result;
  await db.runTransaction(async tx => {
    const [eSnap, aSnap, pSnap, kSnap, wSnap] = await Promise.all([
      tx.get(eRef), tx.get(aRef), tx.get(pRef), tx.get(kRef), tx.get(wRef)
    ]);
    if (!eSnap.exists || !aSnap.exists || !pSnap.exists || !kSnap.exists) fail("not-found", "Event attempt data is incomplete.");
    const e = eSnap.data(), a = aSnap.data(), part = pSnap.data(), keys = kSnap.data().answers || {};
    if (a.status !== "in_progress") fail("failed-precondition", "This attempt is not awaiting submission.");
    const ids = Object.keys(keys);
    if (Object.keys(answers).length !== ids.length) fail("invalid-argument", "Answer every question before submitting.");
    let correct = 0;
    for (const qid of ids) {
      const choice = String(answers[qid] || "");
      const key = keys[qid];
      if (!key || !Array.isArray(key.allowedOptionIds) || !key.allowedOptionIds.includes(choice)) fail("invalid-argument", "One or more answers are invalid.");
      if (choice === key.correctOptionId) correct++;
    }
    const percent = Math.round(correct / ids.length * 100);
    const w = wSnap.exists ? wSnap.data() : { balance: 0 };
    let gemsAwarded = 0;
    const firstCompletion = part.participationRewardPaid !== true;
    if (firstCompletion) {
      gemsAwarded += Number(e.participationGems || 0);
      if (percent >= Number(e.completionThreshold || 0)) gemsAwarded += Number(e.completionGems || 0);
    }
    const balance = Number(w.balance || 0) + gemsAwarded;
    tx.update(aRef, { status: "submitted", answers, correct, total: ids.length, percent, submittedAt: Timestamp.now() });
    tx.update(pRef, {
      lastAttemptStatus: "submitted",
      bestScore: Math.max(Number(part.bestScore || 0), percent),
      rankedScore: a.isRanked ? percent : Number(part.rankedScore || 0),
      completedAttempts: Number(part.completedAttempts || 0) + 1,
      participationRewardPaid: true, updatedAt: Timestamp.now()
    });
    if (a.isRanked) {
      tx.set(eRef.collection("leaderboard").doc(uid), {
        uid, displayName: String(d.displayName || "Player").slice(0, 40),
        percent, correct, total: ids.length, submittedAt: Timestamp.now()
      }, { merge: true });
    }
    if (gemsAwarded > 0) {
      tx.set(wRef, { uid, balance, updatedAt: Timestamp.now() }, { merge: true });
      tx.create(tRef, {
        uid, amount: gemsAwarded, balanceAfter: balance, type: "event_reward",
        reason: "Completed " + String(e.name || "event").slice(0, 70),
        eventId: id, attemptId: aid, createdAt: Timestamp.now()
      });
    }
    result = {
      correct, total: ids.length, percent, gemsAwarded, balance,
      ranked: a.isRanked === true,
      explanations: ids.map(qid => ({
        questionId: qid, correctOptionId: keys[qid].correctOptionId,
        explanation: keys[qid].explanation || ""
      }))
    };
  });
  return result;
});

exports.getGemEventLeaderboard = onCall(async req => {
  const uid = uidOf(req), id = String((req.data || {}).eventId || "");
  const ref = eventDoc(id), snap = await ref.get();
  if (!snap.exists || snap.data().status === "draft") fail("not-found", "Event not found.");
  const board = await ref.collection("leaderboard").orderBy("percent", "desc").limit(100).get();
  return { leaderboard: board.docs.map((d, index) => ({ place: index + 1, uid: d.id, displayName: d.data().displayName || "Player", percent: d.data().percent, correct: d.data().correct, total: d.data().total })) };
});

exports.settleGemEvent = onCall(async req => {
  const { uid } = await requireStaff(req), id = String((req.data || {}).eventId || "");
  const ref = eventDoc(id), snap = await ref.get();
  if (!snap.exists) fail("not-found", "Event not found.");
  const event = snap.data();
  if (event.status === "cancelled") fail("failed-precondition", "Cancelled events cannot be settled.");
  if (Date.now() < millis(event.endsAt)) fail("failed-precondition", "This event has not ended.");
  if (event.settledAt) fail("already-exists", "This event has already been settled.");
  const board = await ref.collection("leaderboard").orderBy("percent", "desc").limit(3).get();
  const winners = board.docs.map(d => ({ uid: d.id, ...d.data() }));
  const rewards = event.placementRewards || {};
  const prizes = [Number(rewards.first || 0), Number(rewards.second || 0), Number(rewards.third || 0)];
  await db.runTransaction(async tx => {
    const fresh = await tx.get(ref);
    if (!fresh.exists || fresh.data().settledAt) fail("already-exists", "This event has already been settled.");
    const wRefs = winners.map(w => wallet(w.uid));
    const pRefs = winners.map(w => participant(id, w.uid));
    const wSnaps = [], pSnaps = [];
    for (let i = 0; i < winners.length; i++) {
      wSnaps.push(await tx.get(wRefs[i]));
      pSnaps.push(await tx.get(pRefs[i]));
    }
    for (let i = 0; i < winners.length; i++) {
      const prize = prizes[i] || 0;
      if (!prize || (pSnaps[i].exists && pSnaps[i].data().placementAwarded)) continue;
      const current = wSnaps[i].exists ? Number(wSnaps[i].data().balance || 0) : 0;
      const next = current + prize, tRef = gemTx();
      tx.set(wRefs[i], { uid: winners[i].uid, balance: next, updatedAt: Timestamp.now() }, { merge: true });
      tx.create(tRef, {
        uid: winners[i].uid, amount: prize, balanceAfter: next,
        type: "event_placement", reason: "Event placement reward",
        eventId: id, place: i + 1, createdAt: Timestamp.now()
      });
      tx.set(pRefs[i], { placementAwarded: true, placement: i + 1 }, { merge: true });
    }
    tx.update(ref, { status: "completed", settledAt: Timestamp.now(), settledBy: uid, updatedAt: Timestamp.now() });
  });
  return { settled: true, winners: winners.map((w, i) => ({ uid: w.uid, displayName: w.displayName || "Player", percent: w.percent, place: i + 1, gems: prizes[i] || 0 })) };
});

// Marketplace: direct, transparent cosmetic purchases only. No random paid boxes.
exports.listGemMarketplace = onCall(async req => {
  uidOf(req);
  const snap = await db.collection("gemMarketplace").where("active", "==", true).limit(100).get();
  return { items: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
});

exports.createGemMarketplaceItem = onCall(async req => {
  const { uid } = await requireStaff(req), d = req.data || {};
  const name = strIn(d.name, 2, 70, "Item name");
  const description = String(d.description || "").trim().slice(0, 300);
  const type = d.type === "consumable" ? "consumable" : "permanent";
  const priceGems = intIn(d.priceGems, 1, 10000, "Gem price");
  const durationHours = type === "consumable" ? intIn(d.durationHours || 24, 1, 720, "Duration") : 0;
  const ref = db.collection("gemMarketplace").doc();
  await ref.set({
    name, description, type, category: "cosmetic", priceGems, durationHours,
    icon: String(d.icon || "💎").slice(0, 8), active: d.active !== false,
    createdBy: uid, createdAt: Timestamp.now(), updatedAt: Timestamp.now()
  });
  return { itemId: ref.id };
});

exports.setGemMarketplaceItemStatus = onCall(async req => {
  const { uid } = await requireStaff(req), d = req.data || {}, id = String(d.itemId || "");
  if (!id) fail("invalid-argument", "An item ID is required.");
  await db.collection("gemMarketplace").doc(id).update({ active: d.active === true, updatedAt: Timestamp.now(), updatedBy: uid });
  return { itemId: id, active: d.active === true };
});

exports.purchaseGemMarketplaceItem = onCall(async req => {
  const uid = uidOf(req), id = String((req.data || {}).itemId || "");
  if (!id) fail("invalid-argument", "Select an item first.");
  const itemRef = db.collection("gemMarketplace").doc(id), wRef = wallet(uid);
  const invRef = db.collection("gemInventories").doc(uid).collection("items").doc(id);
  const tRef = gemTx();
  let result;
  await db.runTransaction(async tx => {
    const [iSnap, wSnap, invSnap] = await Promise.all([tx.get(itemRef), tx.get(wRef), tx.get(invRef)]);
    if (!iSnap.exists || iSnap.data().active !== true) fail("not-found", "This item is no longer available.");
    if (!wSnap.exists) fail("failed-precondition", "Your Gems wallet is not ready.");
    const item = iSnap.data(), inv = invSnap.exists ? invSnap.data() : {};
    if (item.category !== "cosmetic") fail("failed-precondition", "Gems can only purchase cosmetic items.");
    if (item.type === "permanent" && inv.owned === true) fail("already-exists", "You already own this item.");
    const current = Number(wSnap.data().balance || 0), cost = Number(item.priceGems || 0);
    if (current < cost) fail("failed-precondition", "You do not have enough Gems.");
    const next = current - cost;
    tx.update(wRef, { balance: next, updatedAt: Timestamp.now() });
    if (item.type === "permanent") {
      tx.set(invRef, { itemId: id, name: item.name, icon: item.icon, type: item.type, owned: true, purchasedAt: Timestamp.now() });
    } else {
      tx.set(invRef, {
        itemId: id, name: item.name, icon: item.icon, type: item.type,
        quantity: Number(inv.quantity || 0) + 1, durationHours: item.durationHours,
        purchasedAt: Timestamp.now()
      }, { merge: true });
    }
    tx.create(tRef, { uid, amount: -cost, balanceAfter: next, type: "cosmetic_purchase", reason: "Purchased " + String(item.name).slice(0, 70), itemId: id, createdAt: Timestamp.now() });
    result = { balance: next, itemName: item.name, type: item.type };
  });
  return result;
});

exports.listGemInventory = onCall(async req => {
  const uid = uidOf(req);
  const snap = await db.collection("gemInventories").doc(uid).collection("items").get();
  return { items: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
});

// Shared goals allow either currency, with capped voluntary contributions.
exports.listGemCommunityGoals = onCall(async req => {
  const uid = uidOf(req);
  const snap = await db.collection("gemCommunityGoals").orderBy("createdAt", "desc").limit(40).get();
  const goals = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    const c = await doc.ref.collection("contributions").doc(uid).get();
    goals.push({
      id: doc.id, title: d.title, description: d.description, target: d.target,
      contributionCurrency: d.contributionCurrency, totalContributed: d.totalContributed || 0,
      participantCount: d.participantCount || 0, startsAt: millis(d.startsAt), endsAt: millis(d.endsAt),
      status: d.status, individualRewardGems: d.individualRewardGems || 0,
      sharedRewardGems: d.sharedRewardGems || 0, myContribution: c.exists ? c.data().amount || 0 : 0,
      rewardClaimed: c.exists && c.data().rewardClaimed === true
    });
  }
  return { goals };
});

exports.createGemCommunityGoal = onCall(async req => {
  const { uid } = await requireStaff(req), d = req.data || {};
  const title = strIn(d.title, 3, 80, "Goal title");
  const description = String(d.description || "").trim().slice(0, 400);
  const target = intIn(d.target, 10, 100000000, "Goal target");
  const currency = d.contributionCurrency === "gems" ? "gems" : "coins";
  const maxPerUser = intIn(d.maxContributionPerUser || 1000, 1, 50000, "Per-user contribution limit");
  const individualRewardGems = intIn(d.individualRewardGems || 0, 0, 100, "Individual reward");
  const sharedRewardGems = intIn(d.sharedRewardGems || 0, 0, 1000, "Shared reward");
  const startsAt = intIn(d.startsAt || Date.now(), Date.now() - 86400000, Date.now() + 365 * 86400000, "Start time");
  const endsAt = intIn(d.endsAt, startsAt + 60000, startsAt + 90 * 86400000, "End time");
  const ref = db.collection("gemCommunityGoals").doc();
  await ref.set({
    title, description, target, contributionCurrency: currency, maxContributionPerUser: maxPerUser,
    totalContributed: 0, individualRewardGems, sharedRewardGems,
    startsAt, endsAt, status: "active", participantCount: 0, createdBy: uid, createdAt: Timestamp.now()
  });
  return { goalId: ref.id };
});

exports.contributeGemCommunityGoal = onCall(async req => {
  const uid = uidOf(req), d = req.data || {}, id = String(d.goalId || "");
  if (!id) fail("invalid-argument", "A goal ID is required.");
  const amount = intIn(d.amount, 1, 50000, "Contribution");
  const gRef = db.collection("gemCommunityGoals").doc(id), pRef = db.collection("players").doc(uid), wRef = wallet(uid);
  const cRef = gRef.collection("contributions").doc(uid), cCoinRef = coinTx();
  const debitRef = gemTx(), rewardRef = gemTx();
  let result;
  await db.runTransaction(async tx => {
    const [gSnap, cSnap, pSnap, wSnap] = await Promise.all([tx.get(gRef), tx.get(cRef), tx.get(pRef), tx.get(wRef)]);
    if (!gSnap.exists) fail("not-found", "Community goal not found.");
    const g = gSnap.data();
    if (g.status !== "active" || Date.now() < millis(g.startsAt) || Date.now() > millis(g.endsAt)) fail("failed-precondition", "This goal is not accepting contributions.");
    const old = cSnap.exists ? cSnap.data() : {}, prior = Number(old.amount || 0);
    if (prior + amount > Number(g.maxContributionPerUser || 1000)) fail("resource-exhausted", "You have reached your contribution limit for this goal.");
    const isNew = !cSnap.exists, individual = isNew ? Number(g.individualRewardGems || 0) : 0;
    let gemBalance = wSnap.exists ? Number(wSnap.data().balance || 0) : 0;
    if (g.contributionCurrency === "gems") {
      if (gemBalance < amount) fail("failed-precondition", "You do not have enough Gems.");
      gemBalance -= amount;
      if (individual > 0) gemBalance += individual;
      tx.set(wRef, { uid, balance: gemBalance, updatedAt: Timestamp.now() }, { merge: true });
      tx.create(debitRef, { uid, amount: -amount, balanceAfter: gemBalance - individual, type: "community_contribution", reason: "Contributed Gems to a community goal", goalId: id, createdAt: Timestamp.now() });
      if (individual > 0) tx.create(rewardRef, { uid, amount: individual, balanceAfter: gemBalance, type: "community_participation", reason: "Joined a community goal", goalId: id, createdAt: Timestamp.now() });
    } else {
      if (!pSnap.exists || Number(pSnap.data().coins || 0) < amount) fail("failed-precondition", "You do not have enough Coins.");
      const nextCoins = Number(pSnap.data().coins || 0) - amount;
      tx.update(pRef, { coins: nextCoins });
      tx.create(cCoinRef, { uid, amount: -amount, type: "community_contribution", goalId: id, createdAt: Timestamp.now() });
      if (individual > 0) {
        gemBalance += individual;
        tx.set(wRef, { uid, balance: gemBalance, updatedAt: Timestamp.now() }, { merge: true });
        tx.create(rewardRef, { uid, amount: individual, balanceAfter: gemBalance, type: "community_participation", reason: "Joined a community goal", goalId: id, createdAt: Timestamp.now() });
      }
    }
    const total = Number(g.totalContributed || 0) + amount;
    tx.set(cRef, { uid, amount: prior + amount, joinedAt: old.joinedAt || Timestamp.now(), updatedAt: Timestamp.now() }, { merge: true });
    tx.update(gRef, {
      totalContributed: total, participantCount: Number(g.participantCount || 0) + (isNew ? 1 : 0),
      status: total >= g.target ? "completed" : "active", completedAt: total >= g.target ? Timestamp.now() : null
    });
    result = { totalContributed: total, target: g.target, completed: total >= g.target, individualRewardGems: individual, gemBalance };
  });
  return result;
});

exports.claimCommunityGoalReward = onCall(async req => {
  const uid = uidOf(req), id = String((req.data || {}).goalId || "");
  if (!id) fail("invalid-argument", "A goal ID is required.");
  const gRef = db.collection("gemCommunityGoals").doc(id), cRef = gRef.collection("contributions").doc(uid);
  const wRef = wallet(uid), tRef = gemTx();
  let result;
  await db.runTransaction(async tx => {
    const [gSnap, cSnap, wSnap] = await Promise.all([tx.get(gRef), tx.get(cRef), tx.get(wRef)]);
    if (!gSnap.exists || !cSnap.exists || Number(cSnap.data().amount || 0) < 1) fail("permission-denied", "Contribute to this goal before claiming its shared reward.");
    const g = gSnap.data(), c = cSnap.data();
    if (g.totalContributed < g.target) fail("failed-precondition", "The community has not reached its target yet.");
    if (c.rewardClaimed) fail("already-exists", "Your shared reward has already been claimed.");
    const reward = Number(g.sharedRewardGems || 0), current = wSnap.exists ? Number(wSnap.data().balance || 0) : 0, next = current + reward;
    tx.update(cRef, { rewardClaimed: true, rewardClaimedAt: Timestamp.now() });
    if (reward > 0) {
      tx.set(wRef, { uid, balance: next, updatedAt: Timestamp.now() }, { merge: true });
      tx.create(tRef, { uid, amount: reward, balanceAfter: next, type: "community_goal_reward", reason: "Shared community goal completed", goalId: id, createdAt: Timestamp.now() });
    }
    result = { reward, balance: next };
  });
  return result;
});
