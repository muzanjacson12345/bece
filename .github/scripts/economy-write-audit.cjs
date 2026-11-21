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
  console.log("\\n=== " + label + " ===");
  if (index < 0) {
    console.log("Not found: " + needle);
    return;
  }
  const excerpt = source.slice(Math.max(0, index - before), Math.min(source.length, index + after));
  console.log("Starts at line " + (source.slice(0, index).split("\\n").length));
  console.log(excerpt.replace(/\\s+/g, " ").trim());
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
