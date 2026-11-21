const fs = require('node:fs');
const expected = 'draft/firestore-rules-gems-foundation-2026-11-21';
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== expected) throw new Error('Draft branch only.');

const file = 'index.html';
let source = fs.readFileSync(file, 'utf8');

const oldScreens = "'duels', 'shop', 'me'";
const newScreens = "'duels', 'events', 'shop', 'me'";
if (source.includes(oldScreens)) source = source.replace(oldScreens, newScreens);
else if (!source.includes("'events', 'shop', 'me'")) throw new Error('Could not update the screen registry.');

const oldRoutes = "duels: 'duels', shop: 'shop', me: 'me'";
const newRoutes = "duels: 'duels', events: 'events', shop: 'shop', me: 'me'";
if (source.includes(oldRoutes)) source = source.replace(oldRoutes, newRoutes);
else if (!source.includes("events: 'events'")) throw new Error('Could not update the route registry.');

const eventScreen = '<section id="screen-events" class="screen" data-screen="events" hidden> <div class="container container-wide"><a class="back-link" href="#/">← Back to overview</a><div class="page-intro"><p class="eyebrow">Spend Coins · compete for Gems</p><h1>Gem events</h1><p class="muted">Join special events, answer questions and compare your best result on the leaderboard.</p></div><div id="events-body"></div></div></section> ';
if (!source.includes('id="screen-events"')) {
  const meStart = source.indexOf('<section id="screen-me"');
  const shopStart = source.indexOf('<section id="screen-shop"');
  const insertAt = meStart > shopStart ? source.lastIndexOf('</section>', meStart) + '</section>'.length : -1;
  if (meStart < 0 || shopStart < 0 || insertAt <= 0) throw new Error('Could not locate the Shop/Me screen boundary.');
  source = source.slice(0, insertAt) + ' ' + eventScreen + source.slice(insertAt);
}

const navMarker = '<a href="#/notes" data-nav="notes">';
const eventNav = '<a href="#/events" data-nav="events"><span aria-hidden="true">💎</span><span>Events</span></a> ';
if (!source.includes('data-nav="events"')) {
  if (!source.includes(navMarker)) throw new Error('Could not locate the mobile navigation insertion point.');
  source = source.replace(navMarker, eventNav + navMarker);
}

const scriptTag = '<script type="module" src="./events.js"></script>';
if (!source.includes(scriptTag)) {
  const bodyEnd = source.lastIndexOf('</body>');
  if (bodyEnd < 0) throw new Error('Could not locate the end of the document.');
  source = source.slice(0, bodyEnd) + scriptTag + source.slice(bodyEnd);
}

fs.writeFileSync(file, source, 'utf8');
console.log('Added the Gem Events screen, route, navigation item and events.js module.');
