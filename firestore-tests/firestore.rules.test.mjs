import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  serverTimestamp
} from "firebase/firestore";

const PROJECT_ID = "demo-bece-hub-rules";
const RULES_PATH = fileURLToPath(new URL("../firestore.rules", import.meta.url));
let testEnv;

before(async () => {
  const rules = await readFile(RULES_PATH, "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules }
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv?.cleanup();
});

async function seed(data) {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const [path, value] of Object.entries(data)) {
      await setDoc(doc(db, path), value);
    }
  });
}

test("wallets can be read by their owner but never written by clients", async () => {
  await seed({ "wallets/alice": { coins: 20, gems: 5 } });
  const alice = testEnv.authenticatedContext("alice").firestore();
  const bob = testEnv.authenticatedContext("bob").firestore();

  await assertSucceeds(getDoc(doc(alice, "wallets/alice")));
  await assertFails(getDoc(doc(bob, "wallets/alice")));
  await assertFails(setDoc(doc(alice, "wallets/alice"), { coins: 999, gems: 999 }));
  await assertFails(updateDoc(doc(alice, "wallets/alice"), { gems: 999 }));
});

test("practice reward state is owner-readable and server-write-only, while receipts are private", async () => {
  await seed({
    "rewardState/alice": { achievementClaims: ["first-answer"] },
    "rewardOperations/alice_test-op": { uid: "alice", xpEarned: 10 }
  });
  const alice = testEnv.authenticatedContext("alice").firestore();
  const bob = testEnv.authenticatedContext("bob").firestore();

  await assertSucceeds(getDoc(doc(alice, "rewardState/alice")));
  await assertFails(getDoc(doc(bob, "rewardState/alice")));
  await assertFails(setDoc(doc(alice, "rewardState/alice"), { achievementClaims: [] }));
  await assertFails(updateDoc(doc(alice, "rewardState/alice"), { achievementClaims: [] }));
  await assertFails(getDoc(doc(alice, "rewardOperations/alice_test-op")));
  await assertFails(setDoc(doc(alice, "rewardOperations/alice_fake"), { uid: "alice" }));
});

test("Gem transaction and reward-claim records are server-write-only", async () => {
  await seed({
    "gemTransactions/tx1": { uid: "alice", amount: 5 },
    "gemRewardClaims/claim1": { uid: "alice", rewardId: "first-answer" }
  });
  const alice = testEnv.authenticatedContext("alice").firestore();

  await assertSucceeds(getDoc(doc(alice, "gemTransactions/tx1")));
  await assertSucceeds(getDoc(doc(alice, "gemRewardClaims/claim1")));
  await assertFails(setDoc(doc(alice, "gemTransactions/tx2"), { uid: "alice", amount: 50 }));
  await assertFails(setDoc(doc(alice, "gemRewardClaims/claim2"), { uid: "alice" }));
});

test("players cannot create or change server-managed Gems, shop ownership or power-up fields", async () => {
  const alice = testEnv.authenticatedContext("alice").firestore();

  await assertSucceeds(setDoc(doc(alice, "players/alice"), { displayName: "Alice", coins: 10, eq: {} }));
  for (const field of ["gems", "gemOps", "owned", "p50", "sfreezes", "xpBoost"]) {
    const createUid = field + "-create";
    const createDb = testEnv.authenticatedContext(createUid).firestore();
    await assertFails(setDoc(doc(createDb, "players/" + createUid), {
      displayName: "Alice",
      [field]: field === "owned" ? { t_legend: true } : field === "gemOps" ? ["fake-credit"] : 1
    }));
    await assertFails(updateDoc(doc(alice, "players/alice"), {
      [field]: field === "owned" ? { t_legend: true } : field === "gemOps" ? ["fake-credit"] : 1
    }));
  }
  await assertSucceeds(updateDoc(doc(alice, "players/alice"), { coins: 11 }));
  await assertSucceeds(updateDoc(doc(alice, "players/alice"), { eq: { title: "t_legend" } }));
});

test("power-up use receipts are private and cannot be client-written", async () => {
  const alice = testEnv.authenticatedContext("alice").firestore();
  await assertFails(setDoc(doc(alice, "powerupOperations/alice_use-1"), {
    uid: "alice", itemId: "p50", operationId: "use-1"
  }));
  await assertFails(getDoc(doc(alice, "powerupOperations/alice_use-1")));
});

test("temporary bans block player writes until their expiry", async () => {
  const now = Date.now();
  await seed({
    "bans/temporary": {
      at: now - 1000, by: "owner", name: "Temp", reason: "test",
      until: now + 60_000
    },
    "players/temporary": { displayName: "Temp", coins: 1 }
  });
  const temp = testEnv.authenticatedContext("temporary").firestore();
  await assertFails(updateDoc(doc(temp, "players/temporary"), { coins: 2 }));
});

test("expired temporary bans no longer block player writes", async () => {
  const now = Date.now();
  await seed({
    "bans/expired": {
      at: now - 60_000, by: "owner", name: "Expired", reason: "test",
      until: now - 1000
    },
    "players/expired": { displayName: "Expired", coins: 1 }
  });
  const expired = testEnv.authenticatedContext("expired").firestore();
  await assertSucceeds(updateDoc(doc(expired, "players/expired"), { coins: 2 }));
});

test("zero, missing and malformed ban expiry fail closed as legacy permanent bans", async () => {
  const now = Date.now();
  await seed({
    "bans/permanent": { at: now, by: "owner", name: "Permanent", reason: "test", until: 0 },
    "bans/missing": { at: now, by: "owner", name: "Missing", reason: "legacy" },
    "bans/malformed": { at: now, by: "owner", name: "Malformed", reason: "test", until: "soon" },
    "players/permanent": { coins: 1 },
    "players/missing": { coins: 1 },
    "players/malformed": { coins: 1 }
  });
  for (const uid of ["permanent", "missing", "malformed"]) {
    const db = testEnv.authenticatedContext(uid).firestore();
    await assertFails(updateDoc(doc(db, "players/" + uid), { coins: 2 }));
  }
});

test("Owner can create valid temporary and permanent bans but not already-expired bans", async () => {
  const now = Date.now();
  await seed({
    "config/owner": { pw1: "owner-secret-one", pw2: "owner-secret-two" },
    "ownerSessions/owner-user": {
      pw1: "owner-secret-one",
      pw2: "owner-secret-two",
      at: Timestamp.now()
    }
  });
  const db = testEnv.authenticatedContext("owner-user").firestore();

  await assertSucceeds(setDoc(doc(db, "bans/timed-player"), {
    at: now, by: "owner-user", name: "Timed Player", reason: "temporary",
    until: now + 60_000
  }));
  await assertSucceeds(setDoc(doc(db, "bans/permanent-player"), {
    at: now, by: "owner-user", name: "Permanent Player", reason: "permanent",
    until: 0
  }));
  await assertFails(setDoc(doc(db, "bans/expired-on-arrival"), {
    at: now, by: "owner-user", name: "Expired Player", reason: "invalid",
    until: now - 1000
  }));
});

test("a banned Admin cannot use an unexpired Admin session", async () => {
  const now = Date.now();
  await seed({
    "config/admin": { pin: "1234" },
    "adminSessions/banned-admin": { pin: "1234", at: Timestamp.now() },
    "bans/banned-admin": {
      at: now, by: "owner", name: "Admin", reason: "test", until: now + 60_000
    }
  });
  const db = testEnv.authenticatedContext("banned-admin").firestore();
  await assertFails(setDoc(doc(db, "adminNotes/player1"), {
    text: "Should be blocked", by: "banned-admin", at: now
  }));
  await assertFails(setDoc(doc(db, "adminSessions/banned-admin"), {
    pin: "1234", at: serverTimestamp()
  }));
});

test("an expired ban does not prevent a valid Admin session", async () => {
  const now = Date.now();
  await seed({
    "config/admin": { pin: "1234" },
    "adminSessions/formerly-banned-admin": { pin: "1234", at: Timestamp.now() },
    "bans/formerly-banned-admin": {
      at: now - 60_000, by: "owner", name: "Admin", reason: "test", until: now - 1000
    }
  });
  const db = testEnv.authenticatedContext("formerly-banned-admin").firestore();
  await assertSucceeds(setDoc(doc(db, "adminSessions/formerly-banned-admin"), {
    pin: "1234", at: serverTimestamp()
  }));
  await assertSucceeds(setDoc(doc(db, "adminNotes/player1"), {
    text: "Allowed after expiry", by: "formerly-banned-admin", at: now
  }));
});

test("Duel creation accepts the app's subjects field and rejects duplicate subjects", async () => {
  const db = testEnv.authenticatedContext("duel-host").firestore();
  const now = Date.now();
  const base = {
    host: "duel-host",
    hostName: "Duel Host",
    guest: null,
    guestName: "",
    subject: "maths",
    subjects: ["maths"],
    secs: 30,
    vis: "public",
    qids: ["mat-1", "mat-2"],
    state: "waiting",
    created: now,
    hb: now,
    res: {}
  };

  await assertSucceeds(setDoc(doc(db, "duels/VALID1"), base));
  await assertFails(setDoc(doc(db, "duels/DUPES1"), {
    ...base, subjects: ["maths", "maths"]
  }));
});
