const fs = require('node:fs');
const expected = 'draft/firestore-rules-gems-foundation-2026-11-21';
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== expected) throw new Error('Draft branch only.');

const file = 'index.html';
let source = fs.readFileSync(file, 'utf8');
const start = source.indexOf('function ownerEventDraftCard()');
const end = source.indexOf('function ownerTab()', start);
if (start < 0 || end <= start) throw new Error('Owner event draft card boundaries not found.');
let block = source.slice(start, end);

if (!block.includes('async function refreshManagedEvents()')) {
  const marker = '  const save = btn("Save event draft",';
  const i = block.indexOf(marker);
  if (i < 0) throw new Error('Owner event save button marker not found.');
  const management = `  const managedEvents = elx("div", "adm-info");
  const refreshEvents = btn("Refresh event list", "btn-ghost btn-sm", refreshManagedEvents);
  async function ownerEventAction(pathname, managedEventId) {
    const user = firebase.auth().currentUser;
    if (!user || user.uid !== S.uid) throw new Error("Please reconnect your sign-in.");
    if (!GEMS_API_URL) throw new Error("The secure event service is not configured.");
    const token = await user.getIdToken();
    let baseUrl = GEMS_API_URL;
    if (baseUrl.endsWith("/gems")) baseUrl = baseUrl.slice(0, -5);
    while (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
    const response = await fetch(baseUrl + pathname, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      credentials: "omit", cache: "no-store",
      body: JSON.stringify({ eventId: managedEventId })
    });
    let data; try { data = await response.json(); } catch { throw new Error("The event service returned an unreadable response."); }
    if (!response.ok || !data || !data.ok) throw new Error(data && data.error ? data.error : "The event action failed.");
    return data.result || {};
  }
  async function refreshManagedEvents() {
    if (!S.isOwner) return App.toast("Owner access required.", "warn");
    if (!S.db) return App.toast("Please reconnect your sign-in.", "warn");
    refreshEvents.disabled = true;
    refreshEvents.textContent = "Refreshing…";
    managedEvents.replaceChildren(elx("p", "adm-info", "Loading saved events…"));
    try {
      const snapshot = await S.db.collection("gemEvents").limit(100).get();
      const docs = [...snapshot.docs].sort((a, b) => {
        const rank = status => status === "active" ? 0 : status === "draft" ? 1 : status === "settled" ? 2 : 3;
        return rank(a.data().status) - rank(b.data().status)
          || String(a.id).localeCompare(String(b.id));
      });
      managedEvents.replaceChildren();
      if (!docs.length) managedEvents.append(elx("p", "adm-info", "No saved events yet."));
      for (const doc of docs) {
        const data = doc.data() || {};
        const row = elx("div", "adm-row");
        const titleText = (data.title || doc.id) + " · " + (data.status || "unknown");
        const prize = data.prizeGems || {};
        const detailText = "ID: " + doc.id
          + " · Entries: " + (Number(data.entryCount) || 0)
          + " · Unfinished: " + (Number(data.openAttempts) || 0)
          + " · Closes: " + (Number.isSafeInteger(data.closesAt) ? new Date(data.closesAt).toLocaleString() : "not set")
          + " · Prizes: " + (Number(prize.first) || 0) + "/" + (Number(prize.second) || 0) + "/" + (Number(prize.third) || 0) + " Gems";
        row.append(elx("strong", "", titleText), elx("span", "adm-info", detailText));
        const use = btn("Use ID", "btn-ghost btn-sm", () => {
          eventId.input.value = doc.id;
          App.toast("Loaded event ID into the draft controls.");
        });
        row.append(use);
        if (data.status === "active") {
          const close = btn("Close now", "btn-ghost btn-sm", async () => {
            if (!window.confirm("Close " + (data.title || doc.id) + " to new entries and paid retries now? Existing paid attempts keep their 24-hour finish window.")) return;
            close.disabled = true; close.textContent = "Closing…";
            try {
              await ownerEventAction("/events/close", doc.id);
              App.toast("Event closed to new entries. Existing paid attempts have 24 hours to finish.");
              await refreshManagedEvents();
            } catch (error) {
              App.toast("Could not close event. " + ((error && error.message) || "Please try again."), "warn");
              close.disabled = false; close.textContent = "Close now";
            }
          });
          row.append(close);
        }
        managedEvents.append(row);
      }
    } catch (error) {
      managedEvents.replaceChildren(elx("p", "adm-info", "Could not load events: " + ((error && error.message) || "Please try again.")));
    } finally {
      refreshEvents.disabled = false;
      refreshEvents.textContent = "Refresh event list";
    }
  }`;
  block = block.slice(0, i) + management + "\n" + block.slice(i);
}

const endMarker = '  return card;';
if (!block.includes('card.append(elx("h4", "", "Saved events")')) {
  const i = block.lastIndexOf(endMarker);
  if (i < 0) throw new Error('Owner event card return marker not found.');
  const insert = `  card.append(elx("h4", "", "Saved events"), elx("p", "adm-info", "Review event status, entry counts and Gem prizes. You can close active events here; already-paid attempts keep their finish window."), elx("div", "adm-btns", refreshEvents), managedEvents);
  if (S.isOwner && S.db) refreshManagedEvents();
`;
  block = block.slice(0, i) + insert + block.slice(i);
}

source = source.slice(0, start) + block + source.slice(end);
fs.writeFileSync(file, source, 'utf8');
console.log('Added an Owner event management list and early-close control.');
