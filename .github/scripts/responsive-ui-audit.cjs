'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const BASE = (process.env.SITE_URL || 'https://muzanjacson12345.github.io/bece').replace(/\/+$/, '');
const EXPECTED_VIEWPORT = 'content="width=device-width, initial-scale=1, viewport-fit=cover"';
const EXPECTED_BUILD = 'bece-custom-overlay-exit-motion-2026-11-24-r31';
const ROUTES = [
  { name: 'home', hash: '#/', screen: 'home' },
  { name: 'practice', hash: '#/practice', screen: 'setup' },
  { name: 'friends', hash: '#/friends', screen: 'friends' },
  { name: 'duels', hash: '#/duels', screen: 'duels' },
  { name: 'notes', hash: '#/notes', screen: 'notes' },
  { name: 'essays', hash: '#/notes?view=essays', screen: 'notes' },
  { name: 'achievements', hash: '#/achievements', screen: 'achievements' },
  { name: 'shop', hash: '#/shop', screen: 'shop' },
  { name: 'gemshop', hash: '#/gemshop', screen: 'shop' },
  { name: 'profile', hash: '#/me', screen: 'me' },
  { name: 'admin', hash: '#/admin', screen: 'admin' },
];
const VIEWPORTS = [
  { name: 'phone-320', width: 320, height: 780, mobile: true },
  { name: 'phone-360', width: 360, height: 800, mobile: true },
  { name: 'phone-390', width: 390, height: 844, mobile: true },
  { name: 'phone-430', width: 430, height: 932, mobile: true },
  { name: 'tablet-768', width: 768, height: 1024, mobile: true },
  { name: 'laptop-1024', width: 1024, height: 768, mobile: false },
  { name: 'desktop-1366', width: 1366, height: 900, mobile: false },
  { name: 'wide-1920', width: 1920, height: 1080, mobile: false },
];

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitForLatestDeployment() {
  // PR audits already run against a local preview of the checked-out branch.
  // Do not wait for GitHub Pages to deploy that branch before testing it.
  let previewHost = '';
  try { previewHost = new URL(BASE).hostname; } catch {}
  if (previewHost === '127.0.0.1' || previewHost === 'localhost') {
    console.log('Using the local PR preview; skipping the public deployment wait.');
    return;
  }
  for (let attempt = 1; attempt <= 24; attempt++) {
    try {
      const response = await fetch(`${BASE}/?ui-audit=${Date.now()}`, { cache: 'no-store' });
      const html = await response.text();
      if (response.ok && html.includes(EXPECTED_VIEWPORT) && html.includes(`<meta name="bece-build" content="${EXPECTED_BUILD}">`)) return;
    } catch {}
    console.log(`Waiting for the latest GitHub Pages deployment (${attempt}/24)…`);
    await pause(10000);
  }
  throw new Error(`GitHub Pages did not publish build ${EXPECTED_BUILD} within four minutes.`);
}

async function main() {
  fs.mkdirSync('artifacts/ui-audit/screenshots', { recursive: true });
  await waitForLatestDeployment();

  const htmlSource = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  // The app is modular: inspect the linked local stylesheets and scripts,
  // not just the HTML shell that loads them.
  const localStyles = [...htmlSource.matchAll(/<link\b[^>]*>/g)]
    .map(([tag]) => /\brel=["']stylesheet["']/.test(tag)
      ? tag.match(/\bhref=["']([^"']+\.css)["']/)?.[1] : null)
    .filter(Boolean)
    .filter(asset => !/^(https?:)?\/\//i.test(asset));
  const localScripts = [...htmlSource.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["'][^>]*>/g)]
    .map(match => match[1])
    .filter(asset => !/^(https?:)?\/\//i.test(asset));
  const source = [
    htmlSource,
    ...localStyles.map(asset => fs.readFileSync(path.join(process.cwd(), asset), 'utf8')),
    ...localScripts.map(asset => fs.readFileSync(path.join(process.cwd(), asset), 'utf8')),
  ].join('\n');
  const ownerFeatures = [
    ['global practice reward rates', 'async function setRewardRates()'],
    ['global shop pause', 'async function toggleShop()'],
    ['owner audit CSV export', 'function downloadAuditCsv()'],
    ['owner-only reward controls', 'Global practice economy'],
    ['owner-only shop controls', 'Shop control'],
    ['owner-only exports', 'Owner exports'],
    ['in-place staff renewal', 'async function renewCurrentSession()'],
    ['Owner/Admin role-aware navigation', "label.textContent = S.isOwner ? 'Owner' : 'Admin'"],
    ['Renew button uses the in-place handler', "btn('Renew', 'btn-ghost btn-sm', renewCurrentSession)"],
  ];
  const iconFeatures = [
    ['Coin balance uses a custom coin drawing', 'id="i-coin"'],
    ['Gem balance uses a custom faceted gem drawing', 'id="i-gem"'],
    ['Duels use a proper VS icon', 'id="i-versus"'],
    ['French and Ghana subjects have custom flag icons', 'id="i-flag-france"'],
    ['Built-in avatars preserve their native emoji characters', "emoji.textContent = glyph;"],
    ['Saved avatar keys are kept intact', 'const safeAv = a => a;'],
    ['Disk and storage emoji use custom SVG drawings', '<symbol id="i-disc"'],
    ['Static footer arrow uses the SVG icon family', 'href="#i-external-link"'],
    ['Equipped title badges preserve their native emoji', "badge.textContent = t.icon + ' ' + t.name;"],
    ['Coin Shop title items preserve their emoji artwork', 's.textContent = it.icon;'],
    ['Avatar picker preserves the selected native emoji', "setAvatarGlyph(b, a, 'avatar-choice-icon')"],
    ['Player avatar badges preserve their selected emoji', 'setAvatarGlyph(bd, PF.safeAv(p.avatar))'],
    ['Avatar picker tracks saved keys instead of SVG text', 'b.dataset.avatar === cur'],
    ['Lesson and note content preserves native emoji glyphs', 'node.appendChild(document.createTextNode(text)); return;'],
    ['Lesson and note classes bypass automatic icon substitution', 'note-|essay-|lesson-|lab-'],
    ['Reward tokens use shared SVG icons while balance labels retain their currency symbols', source.includes("App.icon(kind === 'gems' ? 'gem' : 'coin'") && source.includes("kind === 'gems' ? '💎 ' : '💰 '")],
    ['Gem Shop retry labels render Gems through the shared SVG helper', "setIconAwareText(button, 'Buy 💎 ' + it.price)"],
    ['Semantic icons use coordinated subject colour families', '.ui-icon--science{color:#368D9D}']
  ];
  const gemFeatures = [
    ['Gems balance appears in account', '💎 ${Math.max(0, Number(S.doc.gems) || 0)}'],
    ['Quiz saves preserve existing Gems fields without creating missing ones', "preserveGemFields.gems = currentData.gems"],
    ['Quiz saves preserve Gem cosmetic ownership', "preserveGemFields.gemCosmetics = currentData.gemCosmetics"],
    ['The Gem Shop displays the one approved profile ring', "name: 'Golden Profile Ring'"],
    ['Gem balance shortcut opens the Gems tab in Shops', "App.navigate('gemshop')"],
    ['Coin balance shortcut opens the Coins tab in Shops', "App.navigate('shop')"],
    ['Overview shortcut is labelled Shop', '<strong>Shop</strong>'],
    ['Shops has switchable Coins and Gems tabs', 'data-shop-tab="gems"'],
    ['Gem Shop is rendered in the shared Shops screen', "const coinHost = $('shop-body'), gemHost = $('gemshop-body')"],
    ['Coin Shop contains only coin items', "content.push(cons, titlesGroup);"],
    ['Profile ring styling is applied to equipped avatars', "b.dataset.gemRing = p.gemCosmetics"],
    ['The client requests a server-verified cosmetic purchase', "purchaseCosmetic: (itemId, operationId) => applyGemChange('purchase', null, operationId, itemId)"],
    ['Client Gems API calls the trusted Worker', 'fetch(GEMS_API_URL, {'],
    ['Gems API remains available to app features', 'window.Gems = Gems;'],
    ['Achievements display one-time Gem reward claim controls', "claimAchievement: (id, sourceRect) => applyGemChange('achievement', null, 'achievement:' + id, null, id, sourceRect)"],
    ['Daily Gem rewards require a completed practice quiz', "Number(progressData.quizzes || 0) >= 1"],
    ['Daily Gem reward panel includes a seven-day track', "n===7?'+6 💎':'+1 💎'"],
    ['Mobile Daily Gem cards use a four-column layout', '.daily-gem-days{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}'],
    ['Claimed Gem day labels stay within their cards', '.daily-gem-day small{font-size:9px}'],
    ['Daily challenge EXP is awarded automatically', 'EXP added automatically'],
    ['Three completed daily missions unlock a separate coin claim', 'claimDailyChallengeCoins(day, challengeCoinAmount, sourceRect)'],
    ['Daily challenge coin claims are saved once per day', 'state.coinClaimed === true'],
    ['Daily challenge coin claim checks all three selected missions', 'tasks.every(task => state.claimed.includes(task.id))'],
    ['High-score achievement tracks 90 percent quiz results', "achievementStats.highScore = (achievementStats.highScore || 0) + 1"],
    ['Mobile achievement descriptions can wrap without clipping', '.achievement-copy small{line-height:1.55;word-break:normal}'],
    ['Achievement descriptions have a dedicated mobile layout row', '.achievement-main {'],
    ['Overview Duels uses the custom VS badge icon', 'href="#i-versus"'],
    ['Overview Shop uses the app SVG icon family', 'href="#i-shopping-bag"'],
    ['Mobile Admin uses the app SVG icon family', 'href="#i-shield"'],
    ['Duels uses a clear VS symbol', 'href="#i-versus"'],
    ['Coin and Gem currency have dedicated SVG artwork', '<symbol id="i-coin"'],
    ['Quiz streak uses a custom flame SVG', 'href="#i-flame"'],
    ['UI label glyphs are resolved through the shared SVG map', 'const UI_GLYPH_MAP = new Map('],
    ['UI icons have theme-aware currency and status colours', '.ui-icon--gem{color:#4d9ec9}'],
    ['Admin panel tabs use app SVG icons', 'icon(iconName)'],
  ];
  const gemsWorkerSource = fs.readFileSync(path.join(process.cwd(), 'workers/gems-api/src/index.js'), 'utf8');
  const gemWorkerFeatures = [
    ['Worker verifies Firebase ID tokens', 'securetoken@system.gserviceaccount.com'],
    ['Worker rejects spending without enough Gems', "error.code = 'INSUFFICIENT_GEMS'"],
    ['Worker deduplicates recent operation IDs', 'recentOps.includes(operationId)'],
    ['Worker keeps the full protected Gem operation history', 'const operations = [...recentOps, storedOperationId];'],
    ['Only the Owner role can mint Gems', "role !== 'owner'"],
    ['Worker uses a Firestore transaction commit', 'documents:commit'],
    ['Profile ring purchase saves Gems and ownership atomically', "fieldPaths: ['gems', 'gemOps', 'gemCosmetics', 'equippedGemCosmetic']"],
    ['Worker defines a fixed price for the approved Gem cosmetic', "'profile-ring-gold': Object.freeze({ price: 50 })"],
    ['Worker has fixed one-time achievement reward amounts', "'quiz-beginner': Object.freeze({ amount: 2"],
    ['Worker verifies saved achievement progress before claiming', "throw new Error('ACHIEVEMENT_NOT_READY')"],
    ['Worker verifies study-streak progress before claiming Gems', "reward.metric === 'streak'"],
    ['Worker keeps achievement claims in the protected Gem history', "operationId !== 'achievement:' + achievementId"],
    ['Worker requires a normal practice quiz for daily Gems', "throw new Error('DAILY_ACTIVITY_REQUIRED')"],
    ['Worker stores daily claims with a consecutive-day reward index', "storedOperationId = 'daily:' + day + ':' + rewardDay"],
  ];

  const glyphMapMatch = source.match(/const UI_GLYPH_MAP = new Map\((\[[\s\S]*?\])\);/);
  let allUiGlyphsResolve = false;
  if (glyphMapMatch) {
    try {
      const glyphPairs = JSON.parse(glyphMapMatch[1]);
      const symbolIds = new Set([...source.matchAll(/<symbol id="i-([^"]+)"/g)].map(match => match[1]));
      const avatarGroupStart = source.indexOf('const AVATAR_GROUPS = [');
      const avatarGroupEnd = source.indexOf('  ];', avatarGroupStart);
      const avatarText = avatarGroupStart >= 0 && avatarGroupEnd > avatarGroupStart
        ? source.slice(avatarGroupStart, avatarGroupEnd) : '';
      const avatarGlyphs = [...avatarText.matchAll(/'([^']+)'/g)].map(match => match[1])
        .filter(value => /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(value));
      const mappedGlyphs = new Set(glyphPairs.map(pair => pair[0]));
      const iconMetadataGlyphs = [...source.matchAll(/(?:\bicon\s*:\s*'([^']+)'|"icon"\s*:\s*"([^"]+)")/g)]
        .map(match => match[1] || match[2])
        .filter(glyph => /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(glyph));
      // This note-content sword is intentionally a native emoji, not a missing SVG icon.
      const intentionallyNativeEmoji = new Set(['⚔️']);
      const unmappedIconMetadata = [...new Set(iconMetadataGlyphs.filter(
        glyph => !mappedGlyphs.has(glyph) && !intentionallyNativeEmoji.has(glyph)
      ))];

      const versusSymbol = (source.match(/<symbol id="i-versus"[\s\S]*?<\/symbol>/) || [''])[0];
      const nativeEmojiPolicy = [
        source.includes('node.appendChild(document.createTextNode(String(text)))'),
        source.includes('n.appendChild(document.createTextNode(String(k)))'),
        source.includes("const b = o('button', 'profile-tab', `${emoji} ${label}`)"),
        source.includes("const icon=o('span','achievement-icon',a.icon);"),
        ['achievement-icon', 'achievement-gem-reward', 'profile-tab'].every(name => source.includes(name)),
        source.includes('.achievement-icon{display:grid;place-items:center;width:48px;height:48px;border-radius:14px;background:var(--surface);font-size:25px;filter:none;opacity:1}'),
        source.includes("emoji.className = 'avatar-glyph'"),
        source.includes('emoji.textContent = glyph;'),
        source.includes("badge.textContent = t.icon + ' ' + t.name;"),
        source.includes('s.textContent = it.icon;'),
        /<path\b[^>]*\bd=/.test(versusSymbol),
        !/<text\b/.test(versusSymbol),
        !/#[0-9a-f]{3,8}/i.test(versusSymbol)
      ].every(Boolean);
      allUiGlyphsResolve = glyphPairs.length > 0
        && glyphPairs.every(pair => pair[1] && symbolIds.has(pair[1].name))
        && source.includes('emoji.textContent = glyph;')
        && unmappedIconMetadata.length === 0
        && nativeEmojiPolicy
        && source.includes('href="#i-external-link"');
    } catch {}
  }
  const achievementStart = source.indexOf('const ACHIEVEMENTS = [');
  const clientRewardsStart = source.indexOf('const GEM_ACHIEVEMENT_REWARDS = Object.freeze({', achievementStart);
  const clientRewardsEnd = source.indexOf('});', clientRewardsStart);
  const workerRewardsStart = gemsWorkerSource.indexOf('const GEM_ACHIEVEMENT_REWARDS = Object.freeze({');
  const workerRewardsEnd = gemsWorkerSource.indexOf('});', workerRewardsStart);
  const achievementText = achievementStart >= 0 && clientRewardsStart > achievementStart
    ? source.slice(achievementStart, clientRewardsStart) : '';
  const clientRewardText = clientRewardsStart >= 0 && clientRewardsEnd > clientRewardsStart
    ? source.slice(clientRewardsStart, clientRewardsEnd) : '';
  const workerRewardText = workerRewardsStart >= 0 && workerRewardsEnd > workerRewardsStart
    ? gemsWorkerSource.slice(workerRewardsStart, workerRewardsEnd) : '';
  const achievementIds = [...achievementText.matchAll(/id:'([^']+)'/g)].map(m => m[1]);
  const clientRewardIds = [...clientRewardText.matchAll(/'([^']+)':\s*[0-9]+/g)].map(m => m[1]);
  const serverRewardIds = [...workerRewardText.matchAll(/'([^']+)':\s*Object\.freeze/g)].map(m => m[1]);
  const allAchievementRewardsPresent = achievementIds.length > 0
    && new Set(achievementIds).size === achievementIds.length
    && achievementIds.every(id => clientRewardIds.includes(id) && serverRewardIds.includes(id))
    && clientRewardIds.length === achievementIds.length
    && serverRewardIds.length === achievementIds.length;

  const firestoreRulesSource = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
  const gemRulesFeatures = [
    ['Players cannot create their own Gem cosmetic ownership', "!('gemCosmetics' in request.resource.data)"],
    ['Players can equip the ring only after server-recorded ownership', "resource.data.get('gemCosmetics', {}).get('profile-ring-gold', false) == true"],
  ];
  const rewardVisualChecks = [
    ['Flying Gems use CSS facets and no blue-stroked standard SVG', source.includes("o('span', 'reward-flight-gem-facets')") && source.includes('.reward-flight-token-gems') && source.includes('border: 0 !important') && source.includes('.reward-flight-gem-facets') && !source.includes("App.icon(item.kind === 'gems' ? 'gem' : 'coin'")],
    ['Coin reward travel is deliberately slow on phones and desktops', source.includes('const duration = isCoin ? (mobile ? 2300 : 2200) : (mobile ? 2500 : 2400)') && source.includes('const stagger = isCoin ? (mobile ? 180 : 160) : 0')],
  ];
  const sourceChecks = [
    ...rewardVisualChecks.map(([label, passed]) => ({ label, passed })),
    ...ownerFeatures.map(([label, token]) => ({ label, passed: source.includes(token) })),
    ...gemFeatures.map(([label, token]) => ({ label, passed: source.includes(token) })),
    ...iconFeatures.map(([label, token]) => ({ label, passed: source.includes(token) })),
    ...gemWorkerFeatures.map(([label, token]) => ({ label, passed: gemsWorkerSource.includes(token) })),
    ...gemRulesFeatures.map(([label, token]) => ({ label, passed: firestoreRulesSource.includes(token) })),
  ];
  sourceChecks.push({ label: 'Every achievement has a one-time client and server Gem reward', passed: allAchievementRewardsPresent });
  sourceChecks.push({ label: 'Mapped UI glyphs resolve to SVGs while expressive avatars retain native emoji', passed: allUiGlyphsResolve });
  const motionSourceChecks = [
    ['Reduced-motion preference is handled by the shared stylesheet', source.includes('@media (prefers-reduced-motion: reduce)') && source.includes('animation-duration: .01ms !important;')],
    ['Touch devices use shorter learning and reward motion', source.includes('--motion-learning-duration: 230ms') && source.includes('--motion-reward-duration: 220ms')],
    ['Quiz choices animate only when a new question is rendered', source.includes('.motion-option-enter') && source.includes("if (this.motionQuestion) button.classList.add('motion-option-enter')")],
    ['Learning and reward progress fills use transform transitions', source.includes('transition-property: transform') && source.includes('fill.style.transform=') && source.includes('D.bar.style.transform')],
    ['Stage 3 and Stage 4 effects include reduced-motion overrides', source.includes('Stage 3 — Learning motion') && source.includes('Stage 4 — Rewards and social motion') && source.includes('animation: none !important;')],
    ['Stage 6 screen, home and results motion is wired to real app state changes', source.includes('Stage 6 — Signature motion') && source.includes("screenNode.classList.add('motion-screen-major')") && source.includes("hero.classList.add('motion-home-hero-enter')") && source.includes("results.classList.add('motion-results-major')")],
    ['Stage 6 includes touch timing, dialog motion and reduced-motion overrides', source.includes('--motion-major-screen-duration: 330ms') && source.includes('--motion-major-dialog-duration: 300ms') && source.includes('motion-home-ring-turn') && source.includes('animation: none !important;')],
    ['Stage 12 animates the active mobile navigation icon', source.includes('Stage 12 — Navigation and in-page panel motion') && source.includes('.tab-bar a.is-active .icon') && source.includes('motion-nav-icon-select')],
    ['Stage 12 animates Notes/Essays and Coins/Gems panels', source.includes('#notes-content:not([hidden])') && source.includes('#notes-essay-view:not([hidden])') && source.includes('#shop-body:not([hidden])') && source.includes('#gemshop-body:not([hidden])') && source.includes('motion-tab-panel-enter')],
    ['Stage 12 navigation and panel motion has explicit reduced-motion handling', source.includes('.notes-view-tabs a[aria-selected="true"] .icon') && source.includes('#gemshop-body:not([hidden])') && source.includes('animation: none !important;')],
    ['Stage 13 replays a real entrance when a profile customisation panel is switched', source.includes("panel.classList.remove('motion-profile-panel-enter')") && source.includes("panel.classList.add('motion-profile-panel-enter')") && source.includes('#cz-panel > .cz-panel.motion-profile-panel-enter > .cz-section')],
    ['Stage 13 animates selected avatar and colour-theme choices with a check reveal', source.includes('#cz-panel .emoji-pick.is-on') && source.includes('#cz-panel .theme-tile[aria-pressed="true"]') && source.includes('motion-profile-choice-pop') && source.includes('motion-profile-check-reveal')],
    ['Stage 13 profile customisation motion respects reduced-motion settings', source.includes('#cz-panel .theme-tile[aria-pressed="true"] .tt-check') && source.includes('animation: none !important;')],
    ['Stage 14 toast messages have responsive entrance and exit transitions', source.includes('Stage 14 — Toast entrance and exit motion') && source.includes('--motion-toast-enter-duration: 195ms') && source.includes('--motion-toast-exit-duration: 165ms') && source.includes('.toast.is-out') && source.includes("item.classList.add('is-out')")],
    ['Stage 14 toast transitions respect reduced-motion settings', source.includes('.toast.is-in') && source.includes('.toast.is-out') && source.includes('transition: none !important;')],
    ['Stage 15 custom overlays close through one reduced-motion-aware helper', source.includes('function dismissOverlay(node, afterRemove)') && source.includes('motion-overlay-closing') && source.includes('App.dismissOverlay(ov, () => URL.revokeObjectURL(url))')],
    ['Stage 15 profile, cropper and admin overlays have responsive exit motion', source.includes('Stage 15 — Custom overlay entrance and exit motion') && source.includes('.friend-modal.motion-overlay-closing') && source.includes('.crop-ov.motion-overlay-closing') && source.includes('.pin-ov.motion-overlay-closing') && source.includes('--motion-overlay-exit-duration: 165ms')],
    ['Stage 15 overlay dismissal respects reduced-motion settings', source.includes("'(prefers-reduced-motion: reduce)'") && source.includes('.friend-modal.motion-overlay-closing') && source.includes('transition: none !important;')],
    ['Coin and Gem reward flights move towards live balance counters', source.includes('function animateCurrencyReward') && source.includes('function animateRewardFlight') && source.includes('reward-flight-token') && source.includes('coin-bal-value') && source.includes('daily-gem-balance')],
    ['Only confirmed non-duplicate Gem and daily coin rewards trigger currency flights', source.includes('!data.duplicate && Number(data.change) > 0') && source.includes('outcome.added > 0 && !outcome.duplicate')],
    ['Quiz XP count-up includes animated level progress and level-up feedback', source.includes('animateRewardNumber(xpHeadline') && source.includes('exp-xp-fill') && source.includes('previousTotal') && source.includes('LEVEL UP!')],
    ['Reward counters, flights and XP bars respect reduced-motion settings', source.includes('function rewardMotionReduced()') && source.includes('if (rewardMotionReduced() || startValue === endValue)') && source.includes('if (rewardMotionReduced()) return;') && source.includes('.reward-flight-token') && source.includes('.exp-xp-fill') && source.includes('transition: none !important;')],
    ['Reward counters use smooth amount-based timing for both XP and currency', source.includes('function rewardAnimationDuration(from, to)') && source.includes('Math.log10(delta + 1)') && source.includes('Math.min(5200') && source.includes('function rewardCurrencyDuration(from, to)') && source.includes('return Math.min(1900')],
    ['XP headline, total EXP and level progress share one amount-based duration', source.includes('const xpDuration = rewardAnimationDuration(previousTotal, newTotal)') && source.includes('animateRewardNumber(xpHeadline, 0, xpReward') && source.includes('animateRewardNumber(totalCount, previousTotal, newTotal') && source.includes('fill.animate(frames')],
    ['Reward count-up uses a slower 1.45–1.9 second duration', source.includes('function rewardCurrencyDuration(from, to)') && source.includes('Math.min(1900, Math.round(1450 + Math.log10(delta + 1) * 140))')],
    ['Starting a new counter update cancels the previous animation frame', source.includes('const rewardCounterAnimations = new WeakMap()') && source.includes('cancelAnimationFrame(previous.frame)')],
    ['Only one visible currency counter animates for each reward', source.includes('const visibleTargets = targets.filter(rewardElementVisible)') && source.includes('const balanceTarget = preferredVisible || accountTarget || visibleTargets[0] || null')],
    ['Achievement Gem counter stays number-only while other balances keep their symbol', source.includes("element.classList.contains('achievement-gem-balance-value')") && source.includes("element.classList.contains('coin-bal-value')")],
    ['Reward flights use a root-level overlay and a queue so new rewards never cancel active coins', source.includes("const REWARD_FLIGHT_LAYER_ID = 'bece-reward-flight-layer'") && source.includes('const rewardFlightQueues = new Map()') && source.includes('function startNextRewardFlight(kind)') && source.includes('Queue each confirmed reward; never cancel a coin that is already on its way.')],
    ['Mobile coin and EXP reward sections use compact responsive layouts', source.includes('@media (max-width: 420px)') && source.includes('.coin-top {') && source.includes('grid-template-columns: auto auto') && source.includes('.exp-xp-top {') && source.includes('grid-template-columns: auto minmax(0, 1fr)')],
    ['Duel creation stores only Firestore-whitelisted fields', source.includes('delete storedDoc.subjects;') && source.includes('await col().doc(code).set(storedDoc)') && source.includes('const hostSubjects =')],
    ['Self-service progress reset uses the trusted Gem reset action', source.includes("Gems.resetEverything('reset:' + Date.now())") && source.includes("if (!result || !result.reset) throw new Error('RESET_NOT_CONFIRMED');")],
    ['Full reset clears Gems and cosmetic ownership in one trusted Firestore transaction', source.includes("Gems.resetEverything('reset:' + Date.now())") && gemsWorkerSource.includes('async function applyFullReset(uid, accessToken)') && gemsWorkerSource.includes("gems: 0, gemOps: [], gemCosmetics: {}, equippedGemCosmetic: ''") && gemsWorkerSource.includes('documents:commit')],
    ['Admin progress reset preserves protected Gem fields', source.includes("'gemCosmetics', 'equippedGemCosmetic']")],
    ['Currency reward flights use a burst of small coins and a mobile-browser fallback', source.includes('const particleCount = isCoin') && source.includes('reward-flight-token-particle') && source.includes("parts.every(part => typeof part.token.animate === 'function')") && source.includes('part.token.animate(part.keyframes') && source.includes("token.append(isCoin ? App.icon('coin', 'reward-flight-icon') : o('span', 'reward-flight-gem-facets'))") && source.includes('Older mobile browsers keep the same staggered burst with CSS transitions')],
    ['Achievement Gem claims have a visible local balance destination', source.includes('achievement-gem-balance-value') && source.includes('Your Gems') && source.includes("action === 'achievement'") && source.includes('achievementBalance')],
    ['Achievement Gem particles begin at the reward chip', source.includes("captureRewardRect(rewardRow.querySelector('.achievement-gem-reward'))")],
    ['Currency counters use a shorter amount-based count-up', source.includes('function rewardCurrencyDuration(from, to)') && source.includes('const countDuration = rewardCurrencyDuration(from, to)') && source.includes('return Math.min(1900')],
    ['Quiz coin rewards fly to the shared account balance', source.includes("animateCurrencyReward('coins', e.previousCoins, e.balance, captureRewardRect(icon));")],
    ['Full account reset clears Gems, claim history and achievements through the trusted Worker', source.includes("Gems.resetEverything('reset:' + Date.now())") && source.includes('data.reset && data.profile') && gemsWorkerSource.includes('async function applyFullReset') && gemsWorkerSource.includes("action === 'reset'") && gemsWorkerSource.includes('gemOps: []') && gemsWorkerSource.includes('gems: 0')],
    ['Full reset also removes owned Gem cosmetics and the equipped profile ring', gemsWorkerSource.includes('gemCosmetics: {}') && gemsWorkerSource.includes("equippedGemCosmetic: ''") && source.includes('owned Gem cosmetics')],

    ['Reward arrival uses the same landing pop as its active counter', source.includes("element.classList.add('reward-count-pop')") && source.includes('@keyframes reward-count-pop') && source.includes('function animateCurrencyReward')],
    ['Owner renewal re-verifies both passwords using the strict session fields', source.includes("openPin('owner', true);") && source.includes('Enter both Owner passwords to renew your 30-minute session.') && !source.includes('const patch = owner')],
    ['Appointed Admin renewal writes only its allowed timestamp', source.includes('const appointedAdmin = !owner && typeof isAppointed') && source.includes("await ref.set({ at: fsv().FieldValue.serverTimestamp() });")],
  ];
  sourceChecks.push(...motionSourceChecks.map(([label, passed]) => ({ label, passed })));
  const sourceFailures = sourceChecks.filter(check => !check.passed).map(check => 'Source check failed: ' + check.label);

  const browser = await chromium.launch({ headless: true });
  const report = {
    site: BASE,
    createdAt: new Date().toISOString(),
    expectedRoutes: ROUTES.length,
    viewportCount: VIEWPORTS.length,
    screenshots: [],
    checks: [],
    staffPanelChecks: [],
    sourceChecks,
    pageErrors: [],
    consoleErrors: [],
    httpErrors: [],
    loadingTimeouts: [],
    failedRequests: [],
    failures: [],
    motionChecks: [],
  };

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.mobile ? 2 : 1,
        isMobile: viewport.mobile,
        hasTouch: viewport.mobile,
        reducedMotion: 'reduce',
        serviceWorkers: 'block',
      });
      const page = await context.newPage();

      page.on('pageerror', error => report.pageErrors.push({
        viewport: viewport.name, message: String(error), stack: error.stack || '',
      }));
      page.on('console', message => {
        if (message.type() === 'error') report.consoleErrors.push({
          viewport: viewport.name, message: message.text().slice(0, 500),
        });
      });
      page.on('response', response => {
        if (response.status() >= 400) report.httpErrors.push({
          viewport: viewport.name, status: response.status(),
          url: response.url().slice(0, 500),
        });
      });
      page.on('requestfailed', request => report.failedRequests.push({
        viewport: viewport.name, url: request.url().slice(0, 300),
        error: request.failure()?.errorText || 'request failed',
      }));

      for (const route of ROUTES) {
        const target = `${BASE}/${route.hash}`;
        try {
          await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await page.waitForFunction(
            expected => document.body?.dataset?.screen === expected,
            route.screen,
            { timeout: 30000 }
          );
          await page.locator('#ann-pop button').filter({ hasText: 'Got it' }).click({ timeout: 1500 }).catch(() => {});
          if (route.screen === 'friends') {
            try {
              await page.waitForFunction(() => {
                const host = document.querySelector('#friends-body');
                return !host || !host.querySelector('.skeleton-wrap');
              }, null, { timeout: 10000 });
            } catch {
              report.loadingTimeouts.push(`${viewport.name}/friends remained in its loading state`);
            }
          }
          await page.waitForTimeout(650);

          const diagnostics = await page.evaluate(() => {
            const root = document.documentElement;
            const body = document.body;
            const active = [...document.querySelectorAll('.screen')].find(node => !node.hidden);
            const viewportMeta = document.querySelector('meta[name="viewport"]')?.content || '';
            const horizontalOverflow = Math.max(root.scrollWidth, body.scrollWidth) - window.innerWidth;

            const outOfBounds = [];
            for (const node of document.querySelectorAll('body *')) {
              if (outOfBounds.length >= 12 || node.closest('[hidden]')) continue;
              const style = getComputedStyle(node);
              if (style.display === 'none' || style.visibility === 'hidden') continue;
              const rect = node.getBoundingClientRect();
              if (rect.width < 1 || rect.height < 1) continue;
              const scrollParent = node.closest(
                '.topic-list,.chip-row,.adm-subs,.note-table,.table-scroll,.f-tabs,.board-seg,.segmented,[data-horizontal-scroll]'
              );
              if (!scrollParent && (rect.left < -2 || rect.right > window.innerWidth + 2)) {
                outOfBounds.push({
                  tag: node.tagName.toLowerCase(),
                  className: String(node.className || '').slice(0, 90),
                  text: String(node.textContent || '').trim().slice(0, 120),
                  outerHTML: node.outerHTML.slice(0, 500),
                  parentHTML: node.parentElement ? node.parentElement.outerHTML.slice(0, 700) : '',
                  left: Math.round(rect.left), right: Math.round(rect.right),
                  width: Math.round(rect.width),
                });
              }
            }

            const clipped = [];
            for (const node of document.querySelectorAll('body *')) {
              if (clipped.length >= 12 || node.closest('[hidden]')) continue;
              const style = getComputedStyle(node);
              if (style.display === 'none' || style.visibility === 'hidden') continue;
              if (!['hidden', 'clip'].includes(style.overflowY)) continue;
              if (node.clientHeight < 20 || node.scrollHeight <= node.clientHeight + 8) continue;
              if (node.matches('input,textarea,select,pre')) continue;
              clipped.push({
                tag: node.tagName.toLowerCase(),
                className: String(node.className || '').slice(0, 90),
                clientHeight: node.clientHeight,
                scrollHeight: node.scrollHeight,
              });
            }

            return {
              screen: body.dataset.screen || null,
              activeScreenId: active?.id || null,
              viewportWidth: window.innerWidth,
              documentWidth: Math.max(root.scrollWidth, body.scrollWidth),
              horizontalOverflow,
              reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
              viewportMeta,
              zoomDisabled: /user-scalable\s*=\s*no|max(?:imum)?-scale\s*=\s*1(?:\.0)?/i.test(viewportMeta),
              outOfBounds,
              clipped,
              title: document.title,
              heroActions: (() => {
                const host = document.querySelector('#screen-home .hero-actions');
                if (!host) return null;
                const hostRect = host.getBoundingClientRect();
                return {
                  display: getComputedStyle(host).display,
                  columns: getComputedStyle(host).gridTemplateColumns,
                  width: Math.round(hostRect.width),
                  buttons: [...host.querySelectorAll(':scope > .btn')].map(button => {
                    const rect = button.getBoundingClientRect();
                    const range = document.createRange();
                    range.selectNodeContents(button);
                    const textRect = range.getBoundingClientRect();
                    return {
                      label: button.textContent.trim().replace(/\s+/g, ' '),
                      width: Math.round(rect.width),
                      height: Math.round(rect.height),
                      textLeft: Math.round(textRect.left),
                      textRight: Math.round(textRect.right),
                      left: Math.round(rect.left),
                      right: Math.round(rect.right),
                    };
                  }),
                };
              })(),
              flashcard: (() => {
                const node = document.querySelector('#flashcard-disclosure');
                if (!node) return { found: false };
                const rect = node.getBoundingClientRect();
                return { found: true, width: Math.round(rect.width), right: Math.round(rect.right), open: node.open };
              })(),
            };
          });

          const key = `${viewport.name}/${route.name}`;
          report.checks.push({ key, ...diagnostics });
          if (diagnostics.screen !== route.screen) {
            report.failures.push(`${key}: expected screen ${route.screen}, found ${diagnostics.screen}`);
          }
          if (diagnostics.horizontalOverflow > 2) {
            report.failures.push(`${key}: document has ${diagnostics.horizontalOverflow}px horizontal overflow`);
          }
          if (!diagnostics.reducedMotion) {
            report.failures.push(`${key}: reduced-motion audit context did not activate`);
          }
          if (diagnostics.zoomDisabled) report.failures.push(`${key}: mobile zoom is disabled by the viewport meta tag`);
          if (route.screen === 'home' && viewport.width <= 760) {
            const actions = diagnostics.heroActions;
            if (!actions || actions.display !== 'grid') {
              report.failures.push(`${key}: Overview action buttons are not using the mobile grid layout`);
            } else if (actions.buttons.length !== 2 || actions.buttons.some(button => button.width < actions.width - 4)) {
              report.failures.push(`${key}: Overview action buttons are too narrow; expected two full-width stacked buttons`);
            }
            if (actions?.buttons.some(button => button.textLeft < 0 || button.textRight > viewport.width + 2)) {
              report.failures.push(`${key}: Overview action text is clipped outside the phone viewport`);
            }
            if (!diagnostics.flashcard?.found || diagnostics.flashcard.width > viewport.width + 2) {
              report.failures.push(`${key}: Flashcards section is missing or wider than the phone viewport`);
            }
          }
          if (route.screen === 'admin') {
            const gate = await page.locator('#admin-body').innerText().catch(() => '');
            if (!/Admin access required/i.test(gate)) {
              report.failures.push(`${key}: unauthenticated admin route did not show its access gate`);
            }
          }
          if (route.screen === 'shop' && !(await page.locator('#shop-body').count())) {
            report.failures.push(`${key}: Shop content host is missing`);
          }
          if (route.screen === 'achievements' && !(await page.locator('#achievement-card').count())) {
            report.failures.push(`${key}: Achievements content host is missing`);
          }

          const screenshot = path.join('artifacts/ui-audit/screenshots', viewport.name, `${route.name}.png`);
          fs.mkdirSync(path.dirname(screenshot), { recursive: true });
          await page.screenshot({ path: screenshot, fullPage: true, animations: 'disabled' });
          report.screenshots.push(screenshot);
          console.log(`Captured ${key} — ${diagnostics.viewportWidth}px wide, overflow ${diagnostics.horizontalOverflow}px`);

          // Close an owner announcement overlay before exercising the controls beneath it.
          const announcementDismiss = page.getByRole('button', { name: 'Got it', exact: true });
          if (await announcementDismiss.isVisible().catch(() => false)) {
            await announcementDismiss.click({ timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(150);
          }

          // Check and capture the last Practice subject at every responsive width.
          if (route.screen === 'setup') {
            const countOne = page.locator('#quiz-subject-count button[data-subject-count="1"]');
            const countTwo = page.locator('#quiz-subject-count button[data-subject-count="2"]');
            const countMultiple = page.locator('#quiz-subject-count button[data-subject-count="multiple"]');
            if (await page.locator('#quiz-subject-count button').count() !== 6) {
              report.failures.push(`${viewport.name}/practice: expected six compact subject-count choices`);
            }
            // Prove that a learner can replace the default subject with a different single subject.
            await countOne.click();
            const social = page.locator('[data-setup-sub="social"]');
            const maths = page.locator('[data-setup-sub="maths"]');
            await social.click();
            if (await page.locator('[data-setup-sub][aria-pressed="true"]').count() !== 0 ||
                !(await page.locator('#setup-start').isDisabled())) {
              report.failures.push(`${viewport.name}/practice: a one-subject choice must allow an empty intermediate selection`);
            }
            await maths.click();
            if (await maths.getAttribute('aria-pressed') !== 'true' ||
                await page.locator('[data-setup-sub][aria-pressed="true"]').count() !== 1 ||
                await page.locator('#setup-start').isDisabled()) {
              report.failures.push(`${viewport.name}/practice: choose-one subject selection did not enforce exactly one`);
            }
            // Two subjects: the Start button must remain disabled until the second is selected.
            await countTwo.click();
            if (!(await page.locator('#setup-start').isDisabled())) {
              report.failures.push(`${viewport.name}/practice: choose-two should wait for the second subject`);
            }
            await page.locator('[data-setup-sub="arts"]').click();
            if (await page.locator('[data-setup-sub][aria-pressed="true"]').count() !== 2 ||
                await page.locator('#setup-start').isDisabled()) {
              report.failures.push(`${viewport.name}/practice: choose-two did not enable Start at exactly two subjects`);
            }
            // Multiple means any two or more subjects, not only all subjects.
            await countMultiple.click();
            await page.locator('[data-setup-sub="integratedScience"]').click();
            if (await page.locator('[data-setup-sub][aria-pressed="true"]').count() !== 3 ||
                await page.locator('#setup-start').isDisabled()) {
              report.failures.push(`${viewport.name}/practice: Multiple must allow any selection of at least two subjects`);
            }
            const subjectShot = path.join('artifacts/ui-audit/screenshots', viewport.name, 'practice-multi-subject.png');
            await page.screenshot({ path: subjectShot, fullPage: true, animations: 'disabled' });
            report.screenshots.push(subjectShot);
          }

          if (route.screen === 'duels') {
            const duelCreate = page.locator('.duel-modes button').filter({ hasText: 'Create' });
            await duelCreate.click({ timeout: 12000 });
            const countTwo = page.locator('.duel-create-pane .duel-subject-count button[data-count="2"]');
            const countMultiple = page.locator('.duel-create-pane .duel-subject-count button[data-count="multiple"]');
            await countTwo.waitFor({ state: 'visible', timeout: 12000 });
            if (await page.locator('.duel-create-pane .duel-subject-count button').count() !== 6) {
              report.failures.push(`${viewport.name}/duels: expected six compact subject-count choices`);
            }
            const duelCountLabels = (await page.locator('.duel-create-pane .duel-subject-count button').allTextContents()).map(label => label.trim());
            if (duelCountLabels.join('|') !== '1|2|3|4|5|Multi') {
              report.failures.push(`${viewport.name}/duels: count choices show unexpected labels: ${duelCountLabels.join(', ')}`);
            }
            if (await page.locator('.duel-create-pane #duel-create-button').count()) {
              // Current markup does not require a fixed ID; use the create-pane button below.
            }
            const createDuel = page.locator('.duel-create-pane > button.btn-primary');
            await countTwo.click();
            if (!(await createDuel.isDisabled())) {
              report.failures.push(`${viewport.name}/duels: choose-two should wait for the second subject`);
            }
            await page.locator('.duel-subject-picks button[data-subject="arts"]').click();
            if (await page.locator('.duel-subject-picks button[aria-pressed="true"]').count() !== 2 ||
                await createDuel.isDisabled()) {
              report.failures.push(`${viewport.name}/duels: choose-two did not enable creation at exactly two subjects`);
            }
            await countMultiple.click();
            await page.locator('.duel-subject-picks button[data-subject="integratedScience"]').click();
            if (await page.locator('.duel-subject-picks button[aria-pressed="true"]').count() !== 3 ||
                await createDuel.isDisabled()) {
              report.failures.push(`${viewport.name}/duels: Multiple must allow any two or more subjects`);
            }
            const duelShot = path.join('artifacts/ui-audit/screenshots', viewport.name, 'duels-subject-picker.png');
            await page.screenshot({ path: duelShot, fullPage: true, animations: 'disabled' });
            report.screenshots.push(duelShot);
          }

          if (route.screen === 'home') {
            for (const key of ['social', 'arts', 'maths', 'computing', 'rme', 'integratedScience', 'french', 'careerTechnology']) {
              const countText = await page.locator(`[data-count="${key}"]`).textContent();
              if (!/200 questions/.test(countText || '')) {
                report.failures.push(`${viewport.name}/home: ${key} does not show its 200-question bank`);
              }
            }
            for (const key of ['social', 'arts', 'maths', 'computing', 'rme', 'integratedScience', 'french', 'careerTechnology']) {
              if (await page.locator(`#flash-subject option[value="${key}"]`).count() !== 1) {
                report.failures.push(`${viewport.name}/home: ${key} is missing from the flashcard subject selector`);
              }
            }
          }

          if (route.name === 'notes') {
            for (const key of ['social', 'arts', 'maths', 'computing', 'rme', 'integratedScience', 'french', 'careerTechnology']) {
              await page.locator(`[data-notes-sub="${key}"]`).click();
              const noteCount = await page.locator('#notes-sidebar .topic-item').count();
              if (noteCount < 1) {
                report.failures.push(`${viewport.name}/notes: ${key} has no visible revision notes`);
              }
            }
          }

          if (route.name === 'essays') {
            const essayPanel = page.locator('#notes-essay-view');
            const essayQuestion = page.locator('#sb-q');
            if (!(await essayPanel.isVisible()) || !(await essayQuestion.isVisible()) || !(await essayQuestion.textContent())?.trim()) {
              report.failures.push(`${viewport.name}/essays: the essay question content did not appear`);
            }
            await page.locator('[data-sb-sub="careerTechnology"]').click();
            if (!/workshop/i.test((await essayQuestion.textContent()) || '')) {
              report.failures.push(`${viewport.name}/essays: Career Technology essay questions did not load`);
            }
          }

          // Visit all Friends tabs; a tab can be present but its content can still overflow.
          if (route.screen === 'friends') {
            const gotIt = page.getByRole('button', { name: 'Got it', exact: true });
            if (await gotIt.isVisible().catch(() => false)) {
              await gotIt.click().catch(() => {});
              await page.waitForTimeout(150);
            }
            const tabButtons = page.locator('.f-tabs > button');
            const tabCount = await tabButtons.count();
            const tabLayout = await page.evaluate(() => {
              const buttons = [...document.querySelectorAll('.f-tabs > button')];
              const tops = buttons.map(b => Math.round(b.getBoundingClientRect().top));
              return { count: buttons.length, rows: new Set(tops).size, keys: buttons.map(b => b.dataset.k) };
            });
            if (tabLayout.rows > 1) {
              report.failures.push(`${viewport.name}/friends: Friends tabs wrap onto ${tabLayout.rows} rows`);
            }
            for (let tabIndex = 0; tabIndex < tabCount; tabIndex++) {
              const tab = tabButtons.nth(tabIndex);
              const keyName = await tab.getAttribute('data-k');
              await tab.click();
              await page.waitForTimeout(250);
              const selectedKey = await page.locator('.f-tabs > button[aria-selected="true"]').getAttribute('data-k');
              if (selectedKey !== keyName) {
                report.failures.push(`${viewport.name}/friends: failed to open ${keyName} tab`);
              }
              const tabDiagnostics = await page.evaluate(() => ({
                width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
                viewport: window.innerWidth,
              }));
              if (tabDiagnostics.width - tabDiagnostics.viewport > 2) {
                report.failures.push(`${viewport.name}/friends-${keyName}: horizontal overflow ${tabDiagnostics.width - tabDiagnostics.viewport}px`);
              }
              const tabShot = path.join('artifacts/ui-audit/screenshots', viewport.name, `friends-${keyName}.png`);
              await page.screenshot({ path: tabShot, fullPage: true, animations: 'disabled' });
              report.screenshots.push(tabShot);
            }

            // Exercise all three Me sub-tabs and verify they remain a single row at phone widths.
            const meButton = page.locator('.f-tabs > button[data-k="me"]');
            if (await meButton.count()) {
              await meButton.click();
              await page.waitForTimeout(200);
              const profileTabs = page.locator('#cz-panel > .cz-tabs > button');
              const profileCount = await profileTabs.count();
              const profileLayout = await page.evaluate(() => {
                const buttons = [...document.querySelectorAll('#cz-panel > .cz-tabs > button')];
                const rects = buttons.map(b => b.getBoundingClientRect());
                const clipped = buttons.filter((b, i) => {
                  const range = document.createRange();
                  range.selectNodeContents(b);
                  const textRect = range.getBoundingClientRect();
                  const buttonRect = rects[i];
                  return textRect.width > 0 &&
                    (textRect.left < buttonRect.left - 1 || textRect.right > buttonRect.right + 1);
                }).map(b => b.textContent.trim());
                return {
                  count: buttons.length,
                  rows: new Set(rects.map(r => Math.round(r.top))).size,
                  widths: rects.map(r => Math.round(r.width)),
                  labels: buttons.map(b => b.textContent.trim()),
                  clipped,
                };
              });
              if (profileCount !== 3) {
                report.failures.push(`${viewport.name}/friends-me: expected 3 profile tabs, found ${profileCount}`);
              }
              if (profileLayout.rows > 1) {
                report.failures.push(`${viewport.name}/friends-me: Avatar, Theme and About me wrap onto ${profileLayout.rows} rows`);
              }
              if (profileLayout.clipped.length) {
                report.failures.push(`${viewport.name}/friends-me: profile tab labels are clipped: ${profileLayout.clipped.join(', ')}`);
              }
              const profilePanels = {
                avatar: '.cz-avatar-panel',
                theme: '.cz-theme-panel',
                about: '.cz-about-panel',
              };
              for (let profileIndex = 0; profileIndex < Math.min(profileCount, 3); profileIndex++) {
                const tab = profileTabs.nth(profileIndex);
                const tabId = (await tab.getAttribute('id') || '').replace('cz-tab-', '');
                await tab.click();
                await page.waitForTimeout(55);
                if (await tab.getAttribute('aria-selected') !== 'true') {
                  report.failures.push(`${viewport.name}/friends-me: failed to select ${tabId}`);
                }
                if (!profilePanels[tabId] || !(await page.locator(`#cz-panel ${profilePanels[tabId]}`).count())) {
                  report.failures.push(`${viewport.name}/friends-me: ${tabId} panel content did not appear`);
                }
                const activeProfileTabMotion = await tab.evaluate(node => getComputedStyle(node).animationName);
                const activeProfilePanelMotion = await page.locator('#cz-panel > .cz-panel > .cz-section').evaluate(node => getComputedStyle(node).animationName);
                if (activeProfileTabMotion !== 'motion-profile-choice-pop') {
                  report.failures.push(`${viewport.name}/friends-me: ${tabId} selected tab did not animate`);
                }
                if (activeProfilePanelMotion !== 'motion-profile-panel-enter') {
                  report.failures.push(`${viewport.name}/friends-me: ${tabId} panel did not animate`);
                }
                if (tabId === 'avatar' && !(await page.locator('#cz-panel .emoji-grid .emoji-pick').count())) {
                  report.failures.push(`${viewport.name}/friends-me: avatar choices did not render`);
                }
                if (tabId === 'avatar') {
                  const selectedAvatar = page.locator('#cz-panel .emoji-pick.is-on');
                  if (await selectedAvatar.count()) {
                    const avatarMotion = await selectedAvatar.evaluate(node => getComputedStyle(node).animationName);
                    if (avatarMotion !== 'motion-profile-choice-pop') {
                      report.failures.push(`${viewport.name}/friends-me: selected avatar did not animate`);
                    }
                  }
                }
                if (tabId === 'theme' && await page.locator('#cz-panel .mode-seg button[data-mode]').count() !== 3) {
                  report.failures.push(`${viewport.name}/friends-me: Light/Dark/Auto controls did not render`);
                }
                if (tabId === 'theme') {
                  const selectedTheme = page.locator('#cz-panel .theme-tile[aria-pressed="true"]');
                  const themeMotion = await selectedTheme.evaluate(node => getComputedStyle(node).animationName);
                  const checkMotion = await selectedTheme.locator('.tt-check').evaluate(node => getComputedStyle(node).animationName);
                  if (themeMotion !== 'motion-profile-choice-pop' || checkMotion !== 'motion-profile-check-reveal') {
                    report.failures.push(`${viewport.name}/friends-me: selected colour theme did not animate`);
                  }
                }
                if (tabId === 'about') {
                  if (!(await page.locator('#display-name').count()) || !(await page.locator('#bio-input').count())) {
                    report.failures.push(`${viewport.name}/friends-me: name or status-line editor is missing`);
                  }
                }
                const profileShot = path.join('artifacts/ui-audit/screenshots', viewport.name, `friends-me-${tabId}.png`);
                await page.screenshot({ path: profileShot, fullPage: true, animations: 'disabled' });
                report.screenshots.push(profileShot);
              }

              // Exercise both appearance modes without writing to any player document.
              const originalMode = await page.evaluate(() => document.documentElement.dataset.theme || 'light');
              const darkMode = page.locator('#cz-panel .mode-seg button[data-mode="dark"]');
              const lightMode = page.locator('#cz-panel .mode-seg button[data-mode="light"]');
              await page.locator('#cz-tab-theme').click();
              if (await darkMode.count() && await lightMode.count()) {
                await darkMode.click();
                await page.waitForTimeout(180);
                if (await page.evaluate(() => document.documentElement.dataset.theme) !== 'dark') {
                  report.failures.push(`${viewport.name}/friends-me: Dark mode control did not apply`);
                }
                if (['phone-390', 'desktop-1366'].includes(viewport.name)) {
                  const darkShot = path.join('artifacts/ui-audit/screenshots', viewport.name, 'friends-me-theme-dark.png');
                  await page.screenshot({ path: darkShot, fullPage: true, animations: 'disabled' });
                  report.screenshots.push(darkShot);
                }
                await lightMode.click();
                await page.waitForTimeout(180);
                if (await page.evaluate(() => document.documentElement.dataset.theme) === 'dark') {
                  report.failures.push(`${viewport.name}/friends-me: Light mode control did not apply`);
                }
                if (['phone-390', 'desktop-1366'].includes(viewport.name)) {
                  const lightShot = path.join('artifacts/ui-audit/screenshots', viewport.name, 'friends-me-theme-light.png');
                  await page.screenshot({ path: lightShot, fullPage: true, animations: 'disabled' });
                  report.screenshots.push(lightShot);
                }
                if (originalMode === 'dark') await darkMode.click();
                else await lightMode.click();
              }
            }

            // The audit browser has no staff login by default. When a staff session is available,
            // exercise each Owner/Admin section and save a real browser screenshot of it.
            const staffTab = page.locator('.f-tabs > button[data-k="admin"]');
            if (await staffTab.count()) {
              await staffTab.click();
              await page.waitForTimeout(250);
              const staffButtons = page.locator('.adm-subs > button');
              const staffCount = await staffButtons.count();
              for (let staffIndex = 0; staffIndex < staffCount; staffIndex++) {
                const staffButton = staffButtons.nth(staffIndex);
                const staffKey = await staffButton.getAttribute('data-k');
                await staffButton.click();
                await page.waitForTimeout(180);
                if (await staffButton.getAttribute('aria-selected') !== 'true') {
                  report.failures.push(`${viewport.name}/staff: failed to select ${staffKey}`);
                }
                const staffShot = path.join('artifacts/ui-audit/screenshots', viewport.name, `staff-${staffKey}.png`);
                await page.screenshot({ path: staffShot, fullPage: true, animations: 'disabled' });
                report.screenshots.push(staffShot);
              }
              report.staffPanelChecks.push({ viewport: viewport.name, available: true, tabCount: staffCount });
            } else {
              report.staffPanelChecks.push({ viewport: viewport.name, available: false, note: 'No staff session is present in the audit browser context.' });
            }
          }
        } catch (error) {
          report.failures.push(`${viewport.name}/${route.name}: ${String(error)}`);
          const fallback = path.join('artifacts/ui-audit/screenshots', viewport.name, `${route.name}-error.png`);
          try {
            fs.mkdirSync(path.dirname(fallback), { recursive: true });
            await page.screenshot({ path: fallback, fullPage: true, animations: 'disabled' });
            report.screenshots.push(fallback);
          } catch {}
        }
      }
      await context.close();
    }

    // Exercise actual motion in normal-preference contexts at a phone and a desktop size.
    // Keep each feature on its own page: leaving an active quiz intentionally opens
    // a confirmation dialog, which must not block the independent Notes/Flashcards checks.
    const motionViewports = VIEWPORTS.filter(viewport => ['phone-390', 'desktop-1366'].includes(viewport.name));
    for (const viewport of motionViewports) {
      const motionContext = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.mobile ? 2 : 1,
        isMobile: viewport.mobile,
        hasTouch: viewport.mobile,
        reducedMotion: 'no-preference',
        serviceWorkers: 'block',
      });
      const motionPage = await motionContext.newPage();
      const check = { viewport: viewport.name, reducedMotion: false, screen: false, homeHero: false, toastEnter: false, toastExit: false, overlayExit: false, overlayPanelExit: false, overlayReducedMotion: false, navigationIcon: false, mobileHeaderPinned: false, coinFlightVisible: false, coinFlightParticles: false, queuedCoinFlightVisible: false, quizWalletMarkup: false, question: false, answerFeedback: false, results: false, notes: false, notesPanel: false, essaysPanel: false, coinsPanel: false, gemsPanel: false, flashcard: false };
      let stage = 'quiz setup';
      try {
        await motionPage.goto(`${BASE}/#/practice`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await motionPage.waitForFunction(() => document.body?.dataset?.screen === 'setup', null, { timeout: 30000 });
        await motionPage.waitForTimeout(70);
        check.screen = await motionPage.evaluate(() =>
          getComputedStyle(document.querySelector('#screen-setup')).animationName === 'motion-screen-major-enter'
        );

        check.navigationIcon = viewport.width > 760 || await motionPage.evaluate(() => {
          const activeIcon = document.querySelector('.tab-bar a.is-active .icon');
          return !!activeIcon && getComputedStyle(activeIcon).animationName === 'motion-nav-icon-select';
        });

        stage = 'home hero';
        const homePage = await motionContext.newPage();
        await homePage.goto(BASE + '/#/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await homePage.waitForFunction(() => document.body?.dataset?.screen === 'home', null, { timeout: 30000 });
        await homePage.waitForTimeout(70);
        check.homeHero = await homePage.evaluate(() => {
          const screen = document.querySelector('#screen-home');
          const hero = screen?.querySelector('.hero');
          return !!hero
            && getComputedStyle(screen).animationName === 'motion-screen-major-enter'
            && getComputedStyle(hero.querySelector('.hero-art')).animationName === 'motion-home-art-enter'
            && getComputedStyle(hero.querySelector('.hero-copy h1')).animationName === 'motion-home-copy-enter';
        });
        stage = 'toast entrance and exit';
        await homePage.evaluate(() => {
          if (typeof window.App?.toast !== 'function') throw new Error('App.toast is not available.');
          window.App.toast('Responsive motion audit notice', 'good');
        });
        await homePage.waitForSelector('.toasts .toast.is-in', { timeout: 3000 });
        await homePage.waitForTimeout(70);
        check.toastEnter = await homePage.evaluate(() => {
          const item = document.querySelector('.toasts .toast.is-in');
          if (!item) return false;
          const style = getComputedStyle(item);
          const properties = style.transitionProperty.split(',').map(value => value.trim());
          const duration = Number.parseFloat(style.transitionDuration) || 0;
          const opacity = Number(style.opacity);
          return properties.includes('opacity') && properties.includes('transform')
            && duration >= .15 && duration <= .24 && opacity > 0 && opacity < 1;
        });
        await homePage.waitForSelector('.toasts .toast.is-out', { timeout: 5000 });
        await homePage.waitForTimeout(70);
        check.toastExit = await homePage.evaluate(() => {
          const item = document.querySelector('.toasts .toast.is-out');
          if (!item) return false;
          const style = getComputedStyle(item);
          const duration = Number.parseFloat(style.transitionDuration) || 0;
          return Number(style.opacity) < .98 && duration >= .15 && duration <= .21;
        });
        await homePage.waitForFunction(() => !document.querySelector('.toasts .toast'), null, { timeout: 1000 });
        stage = 'custom overlay exit motion';
        await homePage.evaluate(() => {
          const overlay = document.createElement('div');
          overlay.id = 'motion-overlay-test';
          overlay.className = 'friend-modal';
          const panel = document.createElement('div');
          panel.className = 'card friend-box';
          overlay.append(panel);
          document.body.append(overlay);
          window.__motionOverlayDone = false;
          window.App.dismissOverlay(overlay, () => { window.__motionOverlayDone = true; });
        });
        await homePage.waitForFunction(() =>
          document.querySelector('#motion-overlay-test')?.classList.contains('motion-overlay-closing'),
          null, { timeout: 2000 }
        );
        await homePage.waitForTimeout(55);
        const overlayMotionState = await homePage.evaluate(() => {
          const overlay = document.querySelector('#motion-overlay-test');
          const panel = overlay?.querySelector('.friend-box');
          if (!overlay || !panel) return null;
          const overlayStyle = getComputedStyle(overlay);
          const panelStyle = getComputedStyle(panel);
          return {
            overlayOpacity: Number(overlayStyle.opacity),
            panelOpacity: Number(panelStyle.opacity),
            overlayProperties: overlayStyle.transitionProperty.split(',').map(value => value.trim()),
            panelProperties: panelStyle.transitionProperty.split(',').map(value => value.trim()),
            duration: Number.parseFloat(overlayStyle.transitionDuration) || 0,
          };
        });
        check.overlayExit = !!overlayMotionState
          && overlayMotionState.overlayOpacity > 0 && overlayMotionState.overlayOpacity < 1
          && overlayMotionState.overlayProperties.includes('opacity')
          && overlayMotionState.overlayProperties.includes('transform')
          && overlayMotionState.duration >= .15 && overlayMotionState.duration <= .21;
        check.overlayPanelExit = !!overlayMotionState
          && overlayMotionState.panelOpacity > 0 && overlayMotionState.panelOpacity < 1
          && overlayMotionState.panelProperties.includes('opacity')
          && overlayMotionState.panelProperties.includes('transform');
        await homePage.waitForFunction(() => window.__motionOverlayDone === true
          && !document.querySelector('#motion-overlay-test'), null, { timeout: 1200 });
        await homePage.emulateMedia({ reducedMotion: 'reduce' });
        await homePage.evaluate(() => {
          const overlay = document.createElement('div');
          overlay.id = 'motion-overlay-reduced-test';
          overlay.className = 'friend-modal';
          document.body.append(overlay);
          window.__reducedOverlayDone = false;
          window.App.dismissOverlay(overlay, () => { window.__reducedOverlayDone = true; });
        });
        check.overlayReducedMotion = await homePage.evaluate(() =>
          window.__reducedOverlayDone === true && !document.querySelector('#motion-overlay-reduced-test')
        );
        await homePage.emulateMedia({ reducedMotion: 'no-preference' });
        check.mobileHeaderPinned = !viewport.mobile || await homePage.evaluate(async () => {
          window.scrollTo(0, 620);
          await new Promise(resolve => setTimeout(resolve, 120));
          const nav = document.getElementById('site-nav');
          const rect = nav?.getBoundingClientRect();
          return !!nav && getComputedStyle(nav).position === 'fixed'
            && !!rect && Math.abs(rect.top) <= 1 && rect.bottom > 0;
        });
        stage = 'mobile coin reward flight';
        await homePage.evaluate(() => {
          const source = document.createElement('div');
          source.id = 'reward-motion-test-source';
          source.style.cssText = 'position:fixed;left:18px;bottom:112px;width:36px;height:36px;z-index:2;';
          const target = document.createElement('div');
          target.id = 'reward-motion-test-target';
          target.className = 'account-coins';
          target.style.cssText = 'position:fixed;right:18px;top:18px;width:88px;height:36px;z-index:2;';
          document.body.append(source, target);
          if (typeof window.animateCurrencyReward !== 'function') throw new Error('Currency reward function is not available to the browser.');
          window.animateCurrencyReward('coins', 4, 5, source.getBoundingClientRect(), target);
        });
        await homePage.waitForSelector('#bece-reward-flight-layer .reward-flight-token', { timeout: 3000 });
        await homePage.waitForTimeout(230);
        const coinFlightState = await homePage.evaluate(() => {
          const layer = document.getElementById('bece-reward-flight-layer');
          const tokens = [...(layer?.querySelectorAll('.reward-flight-token-coins') || [])];
          const first = tokens[0];
          if (!layer || layer.parentElement !== document.documentElement || !first) return { visible: false, count: 0 };
          const rect = first.getBoundingClientRect();
          return {
            visible: Number(getComputedStyle(first).opacity) > .85
              && rect.width >= 16 && rect.height >= 16
              && rect.right > 0 && rect.bottom > 0
              && rect.left < window.innerWidth && rect.top < window.innerHeight,
            count: tokens.length
          };
        });
        check.coinFlightVisible = coinFlightState.visible;
        check.coinFlightParticles = coinFlightState.count >= 3;
        const firstBurstId = await homePage.evaluate(() =>
          document.querySelector('#bece-reward-flight-layer .reward-flight-token-coins')?.dataset.rewardBurst || ''
        );
        await homePage.evaluate(() => {
          const source = document.getElementById('reward-motion-test-source');
          const target = document.getElementById('reward-motion-test-target');
          window.animateCurrencyReward('coins', 5, 6, source.getBoundingClientRect(), target);
        });
        // Wait for a different burst ID so this verifies the queued reward really
        // begins after the first animation, not merely that the first is still visible.
        await homePage.waitForFunction(previousBurst => {
          const tokens = [...(document.querySelector('#bece-reward-flight-layer')?.querySelectorAll('.reward-flight-token-coins') || [])];
          return !!previousBurst && tokens.length >= 3
            && tokens.every(token => token.dataset.rewardBurst !== previousBurst);
        }, firstBurstId, { timeout: 5000 });
        check.queuedCoinFlightVisible = await homePage.evaluate(() => {
          const layer = document.getElementById('bece-reward-flight-layer');
          const tokens = [...(layer?.querySelectorAll('.reward-flight-token-coins') || [])];
          const token = tokens[0];
          if (!layer || tokens.length < 3 || !token) return false;
          const rect = token.getBoundingClientRect();
          return Number(getComputedStyle(token).opacity) > .5
            && rect.right > 0 && rect.bottom > 0
            && rect.left < window.innerWidth && rect.top < window.innerHeight;
        });
        await homePage.close();

        stage = 'quiz setup';
        await motionPage.locator('#setup-start').click();
        await motionPage.waitForFunction(() => document.body?.dataset?.screen === 'quiz', null, { timeout: 30000 });
        await motionPage.waitForTimeout(70);
        check.quizWalletMarkup = await motionPage.evaluate(() =>
          !!document.querySelector('#quiz-reward-wallet .quiz-wallet-coins')
          && !!document.querySelector('#quiz-reward-wallet .quiz-wallet-gems')
        );
        const questionState = await motionPage.evaluate(() => ({
          reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
          card: getComputedStyle(document.querySelector('#qcard')).animationName,
          option: getComputedStyle(document.querySelector('#opts .option')).animationName,
        }));
        check.reducedMotion = questionState.reduced === false;
        check.question = questionState.card === 'motion-question-arrive' && questionState.option === 'motion-option-arrive';
        await motionPage.locator('#opts .option').first().click();
        await motionPage.waitForFunction(() => !document.querySelector('#expl-box')?.hidden, null, { timeout: 5000 });
        const feedbackState = await motionPage.evaluate(() => ({
          answer: getComputedStyle(document.querySelector('#opts .option.is-correct, #opts .option.is-wrong')).animationName,
          explanation: getComputedStyle(document.querySelector('#expl-box')).animationName,
        }));
        check.answerFeedback = feedbackState.answer === 'motion-answer-feedback' && feedbackState.explanation === 'motion-learning-rise';

        stage = 'quiz results';
        const questionTotal = Number(await motionPage.locator('#qtotal').textContent());
        for (let questionIndex = 1; questionIndex < questionTotal; questionIndex++) {
          await motionPage.locator('#next-question-btn').click();
          await motionPage.locator('#opts .option').first().click();
        }
        await motionPage.locator('#next-question-btn').click();
        await motionPage.waitForFunction(() => document.querySelector('#results')?.hidden === false, null, { timeout: 10000 });
        const resultsState = await motionPage.evaluate(() => ({
          panel: getComputedStyle(document.querySelector('#results')).animationName,
          score: getComputedStyle(document.querySelector('#score-ring')).animationName,
        }));
        check.results = resultsState.panel === 'motion-results-major-enter' && resultsState.score === 'motion-score-ring-reveal';

        stage = 'revision notes';
        const notesPage = await motionContext.newPage();
        await notesPage.goto(`${BASE}/#/notes`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await notesPage.waitForFunction(() => document.body?.dataset?.screen === 'notes', null, { timeout: 30000 });
        await notesPage.locator('[data-notes-view="essays"]').click();
        await notesPage.waitForFunction(() => document.querySelector('#notes-essay-view')?.hidden === false, null, { timeout: 10000 });
        await notesPage.waitForTimeout(50);
        check.essaysPanel = await notesPage.evaluate(() =>
          getComputedStyle(document.querySelector('#notes-essay-view')).animationName === 'motion-tab-panel-enter'
        );
        await notesPage.locator('[data-notes-view="notes"]').click();
        await notesPage.waitForFunction(() => document.querySelector('#notes-content')?.hidden === false, null, { timeout: 10000 });
        await notesPage.waitForTimeout(50);
        check.notesPanel = await notesPage.evaluate(() =>
          getComputedStyle(document.querySelector('#notes-content')).animationName === 'motion-tab-panel-enter'
        );
        await notesPage.locator('[data-notes-sub="social"]').click();
        await notesPage.waitForFunction(() => !!document.querySelector('#note-body > .note-section'), null, { timeout: 10000 });
        await notesPage.waitForTimeout(50);
        check.notes = await notesPage.evaluate(() => {
          const section = document.querySelector('#note-body > .note-section');
          return !!section && getComputedStyle(section).animationName === 'motion-learning-rise';
        });
        await notesPage.close();

        stage = 'Coins and Gems shop tab transitions';
        const shopPage = await motionContext.newPage();
        await shopPage.goto(BASE + '/#/shop', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await shopPage.waitForFunction(() => document.body?.dataset?.screen === 'shop', null, { timeout: 30000 });
        await shopPage.locator('[data-shop-tab="gems"]').click();
        await shopPage.waitForFunction(() => document.querySelector('#gemshop-body')?.hidden === false, null, { timeout: 10000 });
        await shopPage.waitForTimeout(50);
        check.gemsPanel = await shopPage.evaluate(() =>
          getComputedStyle(document.querySelector('#gemshop-body')).animationName === 'motion-tab-panel-enter'
        );
        await shopPage.locator('[data-shop-tab="coins"]').click();
        await shopPage.waitForFunction(() => document.querySelector('#shop-body')?.hidden === false, null, { timeout: 10000 });
        await shopPage.waitForTimeout(50);
        check.coinsPanel = await shopPage.evaluate(() =>
          getComputedStyle(document.querySelector('#shop-body')).animationName === 'motion-tab-panel-enter'
        );
        await shopPage.close();

        stage = 'flashcards';
        const flashPage = await motionContext.newPage();
        await flashPage.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await flashPage.waitForFunction(() => document.body?.dataset?.screen === 'home', null, { timeout: 30000 });
        const disclosure = flashPage.locator('#flashcard-disclosure');
        await flashPage.locator('#flashcard-disclosure > summary').click();
        await flashPage.waitForFunction(() => document.querySelector('#flashcard-disclosure')?.open === true, null, { timeout: 5000 });
        await flashPage.locator('#flash-start').click();
        await flashPage.waitForFunction(() => document.querySelector('#flash-session')?.hidden === false, null, { timeout: 10000 });
        await flashPage.waitForTimeout(70);
        const flashState = await flashPage.evaluate(() => ({
          reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
          entrance: getComputedStyle(document.querySelector('#flash-flip')).animationName,
          transition: getComputedStyle(document.querySelector('#flash-card')).transitionProperty,
        }));
        await flashPage.locator('#flash-reveal').click();
        await flashPage.waitForFunction(() => document.querySelector('#flash-flip')?.classList.contains('is-flipped'), null, { timeout: 5000 });
        check.flashcard = flashState.entrance === 'motion-learning-rise'
          && flashState.transition.split(',').map(value => value.trim()).includes('transform');
        check.reducedMotion = check.reducedMotion && flashState.reduced === false;
        await flashPage.close();
      } catch (error) {
        check.error = `${stage}: ${String(error)}`;
      }
      report.motionChecks.push(check);
      for (const [key, passed] of Object.entries(check)) {
        if (['viewport', 'error'].includes(key)) continue;
        if (!passed) report.failures.push(`${viewport.name}/motion: ${key} check failed`);
      }
      if (check.error) report.failures.push(`${viewport.name}/motion: ${check.error}`);
      await motionContext.close();
      console.log(`Motion smoke check — ${viewport.name}: ${Object.entries(check).filter(([key, value]) => key !== 'viewport' && key !== 'error' && typeof value === 'boolean' && value).length}/${Object.entries(check).filter(([key, value]) => key !== 'viewport' && typeof value === 'boolean').length} passed`);
    }
  } finally {
    await browser.close();
  }

  report.failures.push(...sourceFailures);
  for (const error of report.pageErrors) report.failures.push(`${error.viewport}: uncaught browser exception: ${error.message}`);
  for (const failure of report.httpErrors) {
    try {
      if (new URL(failure.url).origin === new URL(BASE).origin) {
        report.failures.push(`${failure.viewport}: HTTP ${failure.status} ${failure.url}`);
      }
    } catch {}
  }
  for (const timeout of report.loadingTimeouts) report.failures.push(timeout);
  fs.writeFileSync('artifacts/ui-audit/report.json', JSON.stringify(report, null, 2));
  console.log(`Saved ${report.screenshots.length} screenshots.`);
  console.log(`Page errors: ${report.pageErrors.length}; console errors: ${report.consoleErrors.length}; failed requests: ${report.failedRequests.length}`);
  console.log(`Audit failures: ${report.failures.length}`);
  if (report.failures.length) {
    for (const failure of report.failures) console.error(`FAIL: ${failure}`);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
