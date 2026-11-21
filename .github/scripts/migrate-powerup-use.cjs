const fs = require("node:fs");

const EXPECTED_BRANCH = "draft/firestore-rules-gems-foundation-2026-11-21";
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== EXPECTED_BRANCH) {
  throw new Error("This draft-only migration must not run outside " + EXPECTED_BRANCH);
}

const file = "index.html";
let source = fs.readFileSync(file, "utf8");
if (source.includes("https://bece-hub-gems-api.abeikcrentsil.workers.dev/powerups/use")) {
  console.log("Second Chance use already calls the trusted Worker.");
  process.exit(0);
}

const startToken = "      scBtn.onclick = () => {";
const endToken = "      const nextBtn = document.createElement('button');";
const start = source.indexOf(startToken);
if (start < 0 || source.indexOf(startToken, start + startToken.length) >= 0) {
  throw new Error("Expected exactly one Second Chance click handler.");
}
const end = source.indexOf(endToken, start);
if (end < 0) throw new Error("Could not locate the end of the Second Chance click handler.");

const replacement = [
  "      scBtn.onclick = async () => {",
  "        if (scBtn.disabled) return;",
  "        scBtn.disabled = true;",
  "        clearInterval(D.scT);",
  "        try {",
  "          const user = firebase.auth().currentUser;",
  "          if (!user) throw new Error('Please reconnect your sign-in.');",
  "          const token = await user.getIdToken();",
  "          const operationId = crypto.randomUUID();",
  "          const response = await fetch('https://bece-hub-gems-api.abeikcrentsil.workers.dev/powerups/use', {",
  "            method: 'POST',",
  "            headers: {",
  "              'Authorization': 'Bearer ' + token,",
  "              'Content-Type': 'application/json'",
  "            },",
  "            credentials: 'omit',",
  "            cache: 'no-store',",
  "            body: JSON.stringify({ itemId: 'p50', operationId })",
  "          });",
  "          let data;",
  "          try { data = await response.json(); }",
  "          catch { throw new Error('The power-up service returned an unreadable response.'); }",
  "          if (!response.ok || !data || !data.ok || !data.result) {",
  "            if (response.status === 401) throw new Error('Please reconnect your sign-in.');",
  "            throw new Error(data && data.error ? data.error : 'The power-up could not be used.');",
  "          }",
  "          const result = data.result;",
  "          if (!Number.isSafeInteger(result.quantity) || result.quantity < 0 || result.itemId !== 'p50') {",
  "            throw new Error('The power-up service returned an invalid result.');",
  "          }",
  "          D.used++;",
  "          S.doc = { ...S.doc, p50: result.quantity };",
  "          choice.remove();",
  "          bar.remove();",
  "          D.fb.textContent = '\\u{1F3AF} Pick again — no hints, choose wisely!';",
  "          D.fb.className = 'duel-fb';",
  "          box.querySelectorAll('.option').forEach(b => {",
  "            if (b.dataset.key === key) return;",
  "            b.disabled = false;",
  "            b.onclick = () => answer(b.dataset.key, true);",
  "          });",
  "          D.locked = false;",
  "          D.qStart = Date.now();",
  "          D.timer = setInterval(() => {",
  "            if (Date.now() - D.qStart > secs() * 1000) answer(null, true);",
  "          }, 250);",
  "        } catch (e) {",
  "          App.toast('Could not use Second Chance. ' + ((e && e.message) || 'Please try again.'), 'warn');",
  "          scBtn.disabled = false;",
  "          D.scT = setInterval(() => {",
  "            left--;",
  "            if (left <= 0) nextBtn.onclick();",
  "            else msg();",
  "          }, 1000);",
  "        }",
  "      };",
  ""
].join("\n");

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(file, source, "utf8");
console.log("Patched Second Chance to consume one item through the authenticated Worker.");
