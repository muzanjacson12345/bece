const fs = require("node:fs");

const EXPECTED_BRANCH = "draft/firestore-rules-gems-foundation-2026-11-21";
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== EXPECTED_BRANCH) {
  throw new Error("This draft-only migration must not run outside " + EXPECTED_BRANCH);
}

const file = "index.html";
let source = fs.readFileSync(file, "utf8");
if (source.includes("https://bece-hub-gems-api.abeikcrentsil.workers.dev/shop")) {
  console.log("Shop purchase flow already uses the trusted Worker.");
  process.exit(0);
}

const startToken = "  async function buy(it, slot) {";
const endToken = "  function wideItem(";
const start = source.indexOf(startToken);
if (start < 0 || source.indexOf(startToken, start + startToken.length) >= 0) {
  throw new Error("Expected exactly one Shop.buy function.");
}
const end = source.indexOf(endToken, start);
if (end < 0) throw new Error("Could not locate the end of Shop.buy.");

const replacement = \`  let shopPurchaseInFlight = false;
  async function buy(it, slot) {
    if (shopPurchaseInFlight) return;
    shopPurchaseInFlight = true;
    try {
      if (S.settings.shopPaused && !S.isOwner) return warn('Shop purchases are temporarily paused.');
      if (!S.db) return warn('You need to be online to buy.');
      const user = firebase.auth().currentUser;
      if (!user) return warn('Please sign in again before buying.');
      const token = await user.getIdToken();
      const operationId = crypto.randomUUID();
      const response = await fetch('https://bece-hub-gems-api.abeikcrentsil.workers.dev/shop', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        credentials: 'omit',
        cache: 'no-store',
        body: JSON.stringify({ itemId: it.id, operationId })
      });
      let data;
      try { data = await response.json(); }
      catch { throw new Error('The shop service returned an unreadable response.'); }
      if (!response.ok || !data || !data.ok || !data.result) {
        if (response.status === 401) throw new Error('Please reconnect your sign-in, then try again.');
        if (data && data.code === 'USER_BANNED') throw new Error('This account cannot make purchases while it is banned.');
        throw new Error(data && data.error ? data.error : 'The shop could not complete this purchase.');
      }

      const result = data.result;
      if (!Number.isSafeInteger(result.coins) || result.coins < 0) {
        throw new Error('The shop returned an invalid balance.');
      }
      const current = S.doc || {};
      const next = { ...current, coins: result.coins };
      if (result.type === 'title') {
        if (!result.owned || typeof result.owned !== 'object') throw new Error('The shop returned invalid ownership data.');
        next.owned = result.owned;
      } else if (result.type === 'consumable'
          && typeof result.field === 'string'
          && Number.isSafeInteger(result.quantity)
          && result.quantity >= 0) {
        next[result.field] = result.quantity;
      } else {
        throw new Error('The shop returned an unknown item type.');
      }

      S.doc = next;
      App.toast('Bought ' + it.name + '!');
      if (['p50', 'sfreeze', 'xpboost'].includes(slot)) render();
      else equip(slot, it.id);
    } catch (e) {
      warn('Could not buy that (' + ((e && e.message) || 'error') + ').');
    } finally {
      shopPurchaseInFlight = false;
    }
  }
\`;
source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(file, source, "utf8");
console.log("Patched Shop.buy to use the authenticated, server-priced /shop endpoint.");
