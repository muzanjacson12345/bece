const fs = require('node:fs');
const expected = 'draft/firestore-rules-gems-foundation-2026-11-21';
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== expected) throw new Error('Draft branch only.');

const file = 'index.html';
let source = fs.readFileSync(file, 'utf8');
const start = source.indexOf('function ownerEventDraftCard()');
const end = source.indexOf('function ownerTab()', start);
if (start < 0 || end <= start) throw new Error('Owner event draft card boundaries not found.');
let block = source.slice(start, end);

const closeField = '  const closesAt = field("Closes at (optional)", "datetime-local", "");';
const prizeFields = closeField + '\n' +
  '  const firstPrize = field("First-place prize (Gems)", "number", "Required · e.g. 100");\n' +
  '  const secondPrize = field("Second-place prize (Gems)", "number", "0 disables this prize");\n' +
  '  const thirdPrize = field("Third-place prize (Gems)", "number", "0 disables this prize");';
if (!block.includes('const firstPrize = field(')) {
  if (!block.includes(closeField)) throw new Error('Event closing-time field marker not found.');
  block = block.replace(closeField, prizeFields);
}

const layoutOld = 'opensAt.label, closesAt.label)';
const layoutNew = 'opensAt.label, closesAt.label, firstPrize.label, secondPrize.label, thirdPrize.label)';
if (block.includes(layoutOld)) block = block.replace(layoutOld, layoutNew);
else if (!block.includes('firstPrize.label, secondPrize.label, thirdPrize.label')) {
  throw new Error('Event form layout marker not found.');
}

const userMarker = '    const user = firebase.auth().currentUser;';
const prizeValidation = [
  '    const prizeFirst = Number(firstPrize.input.value), prizeSecond = Number(secondPrize.input.value || 0), prizeThird = Number(thirdPrize.input.value || 0);',
  '    if (!Number.isSafeInteger(prizeFirst) || prizeFirst < 1 || prizeFirst > 1000000) return App.toast("First-place prize must be 1–1,000,000 Gems.", "warn");',
  '    if (!Number.isSafeInteger(prizeSecond) || prizeSecond < 0 || prizeSecond > 1000000 || !Number.isSafeInteger(prizeThird) || prizeThird < 0 || prizeThird > 1000000) return App.toast("Second- and third-place prizes must be whole Gems or zero.", "warn");',
  '    if (prizeFirst + prizeSecond + prizeThird > 1000000) return App.toast("The total event Gem prize pool cannot exceed 1,000,000 Gems.", "warn");'
].join('\n');
if (!block.includes('const prizeFirst = Number(firstPrize.input.value)')) {
  const i = block.indexOf(userMarker);
  if (i < 0) throw new Error('Event save handler insertion point not found.');
  block = block.slice(0, i) + prizeValidation + '\n' + block.slice(i);
}

const payloadOld = 'maxRetriesPerEntry: retries, opensAt: openTime, closesAt: closeTime })';
const payloadNew = 'maxRetriesPerEntry: retries, prizeGems: { first: prizeFirst, second: prizeSecond, third: prizeThird }, opensAt: openTime, closesAt: closeTime })';
if (block.includes(payloadOld)) block = block.replace(payloadOld, payloadNew);
else if (!block.includes('prizeGems: { first: prizeFirst')) throw new Error('Event draft request payload marker not found.');

const appendOld = '  card.append(elx("div", "adm-btns", save));\n  return card;';
const activate = [
  '  const activate = btn("Activate saved draft", "btn-secondary btn-sm", async () => {',
  '    if (!S.isOwner) return App.toast("Owner access required.", "warn");',
  '    if (!S.db || !S.uid) return App.toast("Please reconnect your sign-in.", "warn");',
  '    const idValue = eventId.input.value.trim();',
  '    if (!/^[A-Za-z0-9_-]{1,80}$/.test(idValue)) return App.toast("Enter the saved event ID first.", "warn");',
  '    if (!window.confirm("Activate " + idValue + "? Players will be able to enter when its opening time arrives. Its questions, fees and prize amounts will be locked. Gem prizes are paid after the event closes and the 24-hour finish window ends.")) return;',
  '    const user = firebase.auth().currentUser;',
  '    if (!user || user.uid !== S.uid) return App.toast("Please reconnect your sign-in.", "warn");',
  '    if (!GEMS_API_URL) return App.toast("The secure event service is not configured.", "warn");',
  '    activate.disabled = true; activate.textContent = "Activating…";',
  '    try {',
  '      const token = await user.getIdToken(); let baseUrl = GEMS_API_URL;',
  '      if (baseUrl.endsWith("/gems")) baseUrl = baseUrl.slice(0, -5);',
  '      while (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);',
  '      const response = await fetch(baseUrl + "/events/activate", {',
  '        method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },',
  '        credentials: "omit", cache: "no-store", body: JSON.stringify({ eventId: idValue })',
  '      });',
  '      let data; try { data = await response.json(); } catch { throw new Error("The event service returned an unreadable response."); }',
  '      if (!response.ok || !data || !data.ok || !data.result || data.result.status !== "active") throw new Error(data && data.error ? data.error : "The event could not be activated.");',
  '      App.toast("Event activated. Entry opens according to its schedule.");',
  '      if (typeof logAct === "function") logAct("event-activate", "", idValue);',
  '    } catch (error) { App.toast("Could not activate event. " + ((error && error.message) || "Please try again."), "warn"); }',
  '    finally { activate.disabled = false; activate.textContent = "Activate saved draft"; }',
  '  });'
].join('\n');
if (!block.includes('const activate = btn("Activate saved draft"')) {
  if (!block.includes(appendOld)) throw new Error('Owner event card button insertion marker not found.');
  block = block.replace(appendOld, activate + '\n  card.append(elx("div", "adm-btns", save, activate));\n  return card;');
}

source = source.slice(0, start) + block + source.slice(end);
fs.writeFileSync(file, source, 'utf8');
console.log('Owner event drafts now include top-three Gem prizes and an explicit activation control.');
