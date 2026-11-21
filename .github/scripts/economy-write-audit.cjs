const fs = require("node:fs");

const source = fs.readFileSync("index.html", "utf8");
const sensitive = /coins?|gems?|totalExp|weekExp|dayExp|streak|xpBoost|sfreezes|owned|(?:^|\W)eq(?:\W|$)|p50|challengeState|achievement|gemEvent|retry|entry/i;
const patterns = [
  /\b(?:runTransaction|setDoc|updateDoc|addDoc|writeBatch)\s*\(/g,
  /\btransaction\s*\.\s*(?:set|update|delete)\s*\(/g,
  /\bbatch\s*\.\s*(?:set|update|delete)\s*\(/g,
  /\b(?:increment|arrayUnion|arrayRemove)\s*\(/g,
  /\bS\.doc\s*(?:\?\.)?\.?\s*[A-Za-z_$][\w$]*\s*(?:\+\+|--|\+=|-=|=)/g
];

const found = new Map();
for (const pattern of patterns) {
  for (const match of source.matchAll(pattern)) {
    const start = match.index;
    const end = start + match[0].length;
    const context = source.slice(Math.max(0, start - 650), Math.min(source.length, end + 950));
    if (!sensitive.test(context)) continue;
    const line = source.slice(0, start).split("\n").length;
    const normalized = context.replace(/\s+/g, " ").trim();
    found.set(start, { line, match: match[0], context: normalized.slice(0, 1100) });
  }
}

const results = [...found.entries()].sort((a, b) => a[0] - b[0]).map(([, item]) => item);
console.log("BECE economy client-write audit");
console.log("Source bytes:", Buffer.byteLength(source));
console.log("Sensitive write candidates:", results.length);
for (const [index, item] of results.entries()) {
  console.log("\n[" + (index + 1) + "] line " + item.line + " — " + item.match);
  console.log(item.context);
}
if (!results.length) console.log("No candidate writes matched the audit patterns; manually verify the source patterns.");

function showSection(label, needle, before = 3000, after = 3000) {
  const index = source.indexOf(needle);
  console.log("\n=== " + label + " ===");
  if (index < 0) {
    console.log("Not found: " + needle);
    return;
  }
  const excerpt = source.slice(Math.max(0, index - before), Math.min(source.length, index + after));
  console.log("Starts at line " + (source.slice(0, index).split("\n").length));
  console.log(excerpt.replace(/\s+/g, " ").trim());
}

showSection("SHOP CATALOG AND PURCHASE FLOW", "async function buy(it, slot)", 6500, 3500);
showSection("DUEL REWARD FLOW", "D.coinParts = parts", 2800, 1800);
showSection("SECOND-CHANCE CONSUMPTION", "Use Second Chance", 900, 1500);
showSection("OWNER COIN GIFT FLOW", "Gave " + "${n} coins to", 2600, 1200);
showSection("OWNER EXP AWARD FLOW", "Awarded ' + n + ' EXP", 2600, 1200);


showSection("DUEL ANSWER HANDLER", "function answer(", 1000, 11000);
showSection("DUEL QUESTION / STEP HANDLER", "function step(", 4200, 4200);
showSection("DUEL START / CREATE FLOW", "function create(", 2600, 3000);
showSection("DUEL SUBMIT RESULT FLOW", "function push()", 2200, 2200);
showSection("DUEL REWARD RECORD FUNCTION", "function record(out, forceCoins)", 1800, 3600);

showSection("DUEL WAIT AND FINISH FLOW", "waitOrResult", 400, 6000);
showSection("DUEL WAIT DEFINITION", "waitOrResult =", 1200, 4500);
showSection("DUEL ANSWER COMPLETE", "function answer(key, secondAttempt)", 300, 9000);
showSection("DUEL PROFILE INIT", "duelW", 1000, 5000);

showSection("MIGRATED DUEL ANSWER SUBMISSION", "const pending = D.pendingAnswer", 300, 5200);
showSection("MIGRATED DUEL SETTLEMENT UI", "async function result(r)", 300, 8500);
showSection("MIGRATED DUEL FORFEIT CALL", "duelApi('/duels/forfeit'", 300, 1800);
showSection("SECOND CHANCE DUEL BINDING", "duelCode: tok", 300, 1800);

console.log("\n=== PLAYER PROFILE SAVE AND WRITE CALL SITES ===");
for (const match of source.matchAll(/\bqueueSave\s*\(/g)) {
  const at = match.index;
  const context = source.slice(Math.max(0, at - 220), Math.min(source.length, at + 700));
  console.log("line " + (source.slice(0, at).split("\n").length) + ": " + context.replace(/\s+/g, " ").trim());
}
showSection("PLAYER PROFILE SAVE IMPLEMENTATION", "function queueSave(patch)", 350, 2800);
showSection("PLAYER PROFILE FLUSH IMPLEMENTATION", "async function flushSave()", 250, 2100);
showSection("PLAYER REWARD WRITE / PRACTICE CALL", "totalCoinsEarned", 500, 2400);

console.log("\n=== PROFILE DOCUMENT SET CALLS ===");
let shownProfileWrites = 0;
for (const match of source.matchAll(/\.set\s*\(/g)) {
  const at = match.index;
  const context = source.slice(Math.max(0, at - 850), Math.min(source.length, at + 1200));
  if (!/(players\/|player|profile)/i.test(context)) continue;
  console.log("line " + (source.slice(0, at).split("\n").length) + ": " + context.replace(/\s+/g, " ").trim());
  if (++shownProfileWrites >= 15) break;
}

showSection("PLAYER INITIALIZATION HOOK", "if (!playerSnap.exists)", 1100, 2400);
showSection("PLAYER INITIALIZATION DOCUMENT", "players/' + uid", 700, 2200);

showSection("OWNER CLOUDFLARE USAGE DASHBOARD", "bece-hub-usage-monitor", 1300, 8000);
showSection("OWNER CLOUDFLARE REQUEST REMAINING DISPLAY", "workerRequestsDaily", 1000, 5000);
showSection("OWNER USAGE REFRESH AND FRESHNESS", "usageMonitor", 900, 5000);

console.log("\n=== CLOUDFLARE USAGE UI MATCHES ===");
for (const needle of ["usage", "cloudflare", "quota", "remaining"]) {
  const re = new RegExp(needle, "gi");
  let match, shown = 0;
  while ((match = re.exec(source)) && shown < 18) {
    const at = match.index;
    if (at < 900000) continue;
    const context = source.slice(Math.max(0, at - 500), Math.min(source.length, at + 1000));
    console.log("[" + needle + "] line " + (source.slice(0, at).split("\n").length) + ": " + context.replace(/\s+/g, " ").trim());
    shown++;
  }
}

showSection("OWNER CLOUDFLARE CARD IMPLEMENTATION", "function cloudflareUsageCard()", 250, 14000);
showSection("OWNER QUOTA CALCULATOR", "function setQuota(", 300, 3600);
showSection("OWNER WORKER USAGE METER CREATION", "const workerMetric", 400, 2800);
showSection("OWNER USAGE REFRESH ACTION", "async function refreshUsage", 300, 4500);

console.log("\n=== EVENT ENTRY / RETRY IMPLEMENTATION AUDIT ===");
for (const term of ["gemEvents", "gemEventAnswerKeys", "entryCost", "entryPrice", "entryLimit", "retryCost", "retryLimit", "eventEntry", "eventRetry"]) {
  const re = new RegExp(term, "gi");
  const hits = [...source.matchAll(re)];
  console.log(term + ": " + hits.length + " occurrence(s)");
  for (const hit of hits.slice(0, 4)) {
    const at = hit.index;
    console.log("  line " + (source.slice(0, at).split("\n").length) + ": " + source.slice(Math.max(0, at - 240), Math.min(source.length, at + 600)).replace(/\s+/g, " ").trim());
  }
}

showSection("OWNER TAB FULL LAYOUT", "function ownerTab()", 700, 17000);
showSection("ADMIN TAB NAVIGATION", "function adminTab()", 600, 5000);
showSection("GEM EVENT RULES AND PLACEHOLDERS", "gemEventOperations", 800, 2600);

showSection("OWNER ASK MODAL FIELDS", "async function ask(", 300, 6500);
showSection("OWNER REWARD RATE ACTION", "async function setRewardRates()", 400, 4500);
showSection("OWNER CONFIGURATION CONSTANTS", "const OWNER_MS", 300, 1800);

console.log("\n=== ASK DIALOG IMPLEMENTATION MATCHES ===");
for (const needle of ["async function ask", "function ask(", "const ask =", "GEMS_API_URL =", "bece-gems-api"]) {
  const at = source.indexOf(needle);
  console.log("\n" + needle + ": " + at);
  if (at >= 0) console.log(source.slice(Math.max(0, at - 300), Math.min(source.length, at + 4200)).replace(/\\s+/g, " ").trim());
}

showSection("QUESTION LOOKUP FUNCTION", "function questionById(", 800, 5000);
showSection("QUESTION LOOKUP ALIAS", "questionById(id)", 500, 3000);
showSection("QUESTION BANK INDEX AND REGISTRY", "const questionIndex", 900, 4200);
showSection("QUESTION ID GENERATOR", "function makeExtraMCQ(", 800, 5000);
showSection("APP QUESTION API", "questionById:", 800, 3500);
showSection("CURRENT EVENT SCREEN PLACEHOLDERS", "gemEvents", 500, 4000);
