const fs = require('node:fs');

const EXPECTED_BRANCH = 'draft/firestore-rules-gems-foundation-2026-11-21';
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== EXPECTED_BRANCH) {
  throw new Error('This Owner event migration must not run outside ' + EXPECTED_BRANCH);
}

const file = 'index.html';
let source = fs.readFileSync(file, 'utf8');
if (source.includes('function ownerEventDraftCard()') && source.includes("part('Gem event drafts', () => ownerEventDraftCard())")) {
  console.log('Owner event draft editor already exists.');
  process.exit(0);
}

const ownerTabMarker = 'function ownerTab() {';
if (source.split(ownerTabMarker).length - 1 !== 1) throw new Error('Expected exactly one Owner tab function.');

const helper = [
  'function ownerEventDraftCard() {',
  '  const card = elx("div", "adm-card");',
  '  card.append(elx("h4", "", "Gem event drafts"), elx("p", "adm-info", "Set this event entry fee, entry allowance and optional paid retry rules. Saving creates or updates a draft only; it cannot activate the event or charge players."));',
  '  const field = (labelText, type, placeholder, maxLength) => {',
  '    const input = document.createElement("input"); input.type = type; input.className = "adm-search"; input.placeholder = placeholder || ""; input.setAttribute("aria-label", labelText);',
  '    if (maxLength) input.maxLength = maxLength;',
  '    if (type === "number") { input.min = "0"; input.step = "1"; input.inputMode = "numeric"; }',
  '    return { label: elx("label", "adm-info", labelText, input), input };',
  '  };',
  '  const eventId = field("Event ID (letters, numbers, - and _)", "text", "e.g. maths-weekend", 80);',
  '  const title = field("Event name", "text", "Event title", 80);',
  '  const entryFee = field("Coins per entry", "number", "Whole Coin amount");',
  '  const entryLimit = field("Maximum paid entries per player", "number", "1–100");',
  '  const retryFee = field("Coins per retry", "number", "Only used when retries are enabled");',
  '  const retryLimit = field("Maximum retries per entry", "number", "1–20");',
  '  const retryEnabled = document.createElement("select"); retryEnabled.className = "adm-sel"; retryEnabled.setAttribute("aria-label", "Paid retries");',
  '  retryEnabled.append(new Option("No paid retries", "no"), new Option("Paid retries enabled", "yes"));',
  '  const retryField = elx("label", "adm-info", "Retry policy", retryEnabled);',
  '  const description = document.createElement("textarea"); description.className = "adm-search"; description.rows = 2; description.maxLength = 500; description.placeholder = "Short description (optional)"; description.setAttribute("aria-label", "Event description");',
  '  card.append(elx("div", "adm-two", eventId.label, title.label, entryFee.label, entryLimit.label, retryField, retryFee.label, retryLimit.label), elx("label", "adm-info", "Description", description));',
  '  card.append(elx("p", "adm-info", "Technical ceilings: 100 entries per player and 20 retries per entry. Settings lock after the first paid entry. New drafts remain inactive."));',
  '  const save = btn("Save event draft", "btn-primary btn-sm", async () => {',
  '    if (!S.isOwner) return App.toast("Owner access required.", "warn");',
  '    if (!S.db || !S.uid) return App.toast("Please reconnect your sign-in.", "warn");',
  '    const id = eventId.input.value.trim(), name = title.input.value.trim();',
  '    const cost = Number(entryFee.input.value), limit = Number(entryLimit.input.value), retry = retryEnabled.value === "yes";',
  '    const retryCost = retry ? Number(retryFee.input.value) : 0, retries = retry ? Number(retryLimit.input.value) : 0;',
  '    if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) return App.toast("Enter a valid event ID using letters, numbers, - or _.", "warn");',
  '    if (name.length < 3 || name.length > 80) return App.toast("The event name must be 3–80 characters.", "warn");',
  '    if (!Number.isSafeInteger(cost) || cost < 1 || cost > 1000000) return App.toast("Entry cost must be 1–1,000,000 Coins.", "warn");',
  '    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) return App.toast("Entry allowance must be 1–100.", "warn");',
  '    if (retry && (!Number.isSafeInteger(retryCost) || retryCost < 1 || retryCost > 1000000)) return App.toast("Retry cost must be 1–1,000,000 Coins.", "warn");',
  '    if (retry && (!Number.isSafeInteger(retries) || retries < 1 || retries > 20)) return App.toast("Retry limit must be 1–20 per entry.", "warn");',
  '    const user = firebase.auth().currentUser;',
  '    if (!user || user.uid !== S.uid) return App.toast("Please reconnect your sign-in.", "warn");',
  '    if (!GEMS_API_URL) return App.toast("The secure event service is not configured.", "warn");',
  '    save.disabled = true; save.textContent = "Saving draft…";',
  '    try {',
  '      const token = await user.getIdToken(); let baseUrl = GEMS_API_URL;',
  '      if (baseUrl.endsWith("/gems")) baseUrl = baseUrl.slice(0, -5);',
  '      while (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);',
  '      const response = await fetch(baseUrl + "/events/configure", {',
  '        method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },',
  '        credentials: "omit", cache: "no-store",',
  '        body: JSON.stringify({ eventId: id, title: name, description: description.value.trim(), entryCostCoins: cost, maxEntriesPerUser: limit, retryEnabled: retry, retryCostCoins: retryCost, maxRetriesPerEntry: retries })',
  '      });',
  '      let data; try { data = await response.json(); } catch { throw new Error("The event service returned an unreadable response."); }',
  '      if (!response.ok || !data || !data.ok || !data.result || data.result.status !== "draft") {',
  '        if (response.status === 401) throw new Error("Please reconnect your sign-in.");',
  '        throw new Error(data && data.error ? data.error : "The event draft could not be saved.");',
  '      }',
  '      App.toast("Event draft saved. It stays inactive until its gameplay and prize rules are finished.");',
  '      if (typeof logAct === "function") logAct("event-draft-save", "", id + " · entry " + cost + " Coins · " + limit + " entries");',
  '    } catch (error) { App.toast("Could not save event draft. " + ((error && error.message) || "Please try again."), "warn"); }',
  '    finally { save.disabled = false; save.textContent = "Save event draft"; }',
  '  });',
  '  card.append(elx("div", "adm-btns", save));',
  '  return card;',
  '}',
].join('\n');

source = source.replace(ownerTabMarker, helper + '\n' + ownerTabMarker);
const cardMarker = "part('Shop control', () => card(";
if (source.split(cardMarker).length - 1 !== 1) throw new Error('Expected exactly one Shop control Owner card marker.');
source = source.replace(cardMarker, "part('Gem event drafts', () => ownerEventDraftCard()), " + cardMarker);
fs.writeFileSync(file, source, 'utf8');
console.log('Added an Owner event draft form. It saves drafts only; events stay inactive.');
