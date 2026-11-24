'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const BASE = (process.env.SITE_URL || 'https://muzanjacson12345.github.io/bece').replace(/\/+$/, '');
const EXPECTED_VIEWPORT = 'content="width=device-width, initial-scale=1, viewport-fit=cover"';
const EXPECTED_BUILD = 'bece-learning-aid-reveal-feedback-2026-11-24-r69';
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
    ['Stage 16 announcements animate in and dismiss through the shared overlay helper', source.includes('Stage 16 — Announcement banner motion') && source.includes('motion-announcement-enter') && source.includes('.ann-bar.motion-overlay-closing') && source.includes('if (bar) App.dismissOverlay(bar)')],
    ['Stage 16 announcement motion has responsive and reduced-motion settings', source.includes('--motion-announcement-enter-duration: 210ms') && source.includes('--motion-announcement-exit-duration: 165ms') && source.includes('.ann-bar.motion-overlay-closing') && source.includes('transition: none !important;')],
    ['Stage 17 only animates the exact daily reward or achievement just claimed', source.includes('dailyGemClaimFeedback = action === \'daily\' && !data.duplicate && Number(data.change) > 0 ? (Number(data.rewardDay) || 1) : false;') && source.includes('dailyGemClaimFeedback === 7 && claimedToday && n===7') && source.includes('achievementGemClaimFeedbackId = action === \'achievement\' && !data.duplicate && Number(data.change) > 0') && source.includes('dailyCoinClaimFeedback = outcome.added > 0 && !outcome.duplicate') && source.includes('.daily-gem-day.is-claim-confirmed') && source.includes('.achievement-item.is-gem-claim-confirmed')],
    ['Stage 17 claim feedback has phone/desktop timing and respects reduced motion', source.includes('--motion-claim-confirmed-duration: 275ms') && source.includes('--motion-claim-confirmed-duration: 315ms') && source.includes('motion-reward-claim-confirmed') && source.includes('animation: none !important;')],
    ['Stage 18 animates only daily challenges newly completed after the quiz result is saved', source.includes('dailyChallengeCompletionFeedback = new Set(') && source.includes('challengeState.claimed.filter(id => !(previous.claimed || []).includes(id))') && source.includes('dailyChallengeCompletionFeedback.has(t.id)') && source.includes('dailyChallengeCompletionFeedback.clear()')],
    ['Stage 18 daily challenge icon and reward feedback has responsive timing and reduced-motion support', source.includes('Stage 18 — Daily challenge completion feedback') && source.includes('--motion-challenge-complete-duration: 270ms') && source.includes('.challenge-item.is-just-completed .challenge-icon') && source.includes('.challenge-item.is-just-completed .challenge-reward') && source.includes('animation: none !important;')],
    ['Stage 19 only animates achievements newly unlocked by the saved quiz', source.includes('newlyEarnedAchievementFeedback = new Set(newlyUnlockedAchievementIds)') && source.includes('newlyEarnedAchievementFeedback.has(a.id)') && source.includes('newlyEarnedAchievementFeedback.clear()') && source.includes('.achievement-item.is-newly-earned .achievement-icon') && !/\\.achievement-item\\.is-earned\\s+\\.achievement-icon\\s*\\{\\s*animation\\s*:/.test(source)],
    ['Stage 19 new-achievement pop respects reduced-motion settings', source.includes('Stage 19 — Newly unlocked achievement feedback') && source.includes('.achievement-item.is-newly-earned .achievement-icon') && source.includes('animation: none !important;')],
    ['Stage 20 bookmark save and remove animate only on a real toggle', source.includes('replayMotion(mark, saved ? \'motion-bookmark-saved\' : \'motion-bookmark-removed\')') && source.includes('motion-bookmark-saved') && source.includes('motion-bookmark-removed') && source.includes('.bookmark.motion-bookmark-saved .icon') && source.includes('.bookmark.motion-bookmark-removed .icon')],
    ['Stage 20 bookmark feedback respects reduced-motion and has responsive timing', source.includes('--motion-bookmark-feedback-duration: 235ms') && source.includes('Stage 20 — Bookmark save and remove feedback') && source.includes('.bookmark.motion-bookmark-saved .icon') && source.includes('animation: none !important;')],
    ['Stage 21 leaderboard filter feedback runs only when the selected period changes', source.includes('const changed = S.board !== k;') && source.includes("if (changed) {") && source.includes("replayMotion(selected, 'motion-board-filter-selected')") && source.includes('.board-seg button.motion-board-filter-selected')],
    ['Stage 21 filter feedback has responsive timing and reduced-motion support', source.includes('Stage 21 — Friends leaderboard filter feedback') && source.includes('--motion-board-filter-duration: 185ms') && source.includes('.board-seg button.motion-board-filter-selected') && source.includes('animation: none !important;')],
    ['Stage 22 Duel setup controls animate only when their values actually change', source.includes("if (changed) replayMotion(b, 'motion-duel-option-selected')") && source.includes("if (changed) replayMotion(b, 'motion-duel-mode-selected')") && source.includes('const changed = String(D.cfg[key]) !== String(v)')],
    ['Stage 22 Duel selection feedback has responsive timing and reduced-motion support', source.includes('Stage 22 — Duel setup selection feedback') && source.includes('--motion-duel-choice-duration: 190ms') && source.includes('.duel-modes button.motion-duel-mode-selected') && source.includes('animation: none !important;')],
    ['Stage 23 animates the actual Duel result heading without changing score count-up', source.includes("replayMotion(resultTitle, 'motion-duel-result-title-enter')") && source.includes('duel-result-heading') && source.includes('function countUp()')],
    ['Stage 23 Duel result heading has responsive timing and reduced-motion support', source.includes('Stage 23 — Duel result heading arrival') && source.includes('--motion-duel-result-title-duration: 215ms') && source.includes('.duel-result-heading.motion-duel-result-title-enter') && source.includes('animation: none !important;')],
    ['Stage 24 animates only genuine Admin/Owner section changes', source.includes('renderedSub !== st.sub') && source.includes('if (sectionChanged) replayMotion(body, \'motion-admin-section-enter\')') && source.includes('renderedSub = st.sub')],
    ['Stage 24 Admin section entrance has responsive timing and reduced-motion support', source.includes('Stage 24 — Admin section panel transitions') && source.includes('--motion-admin-section-duration: 210ms') && source.includes('.adm-body.motion-admin-section-enter') && source.includes('animation: none !important;')],
    ['Stage 25 notes study feedback runs only after a deliberate studied-state toggle', source.includes("replayMotion($('note-studied'), 'motion-note-study-toggle')") && source.includes('const wasStudied = studied.has(this.activeId)') && source.includes('#note-studied.motion-note-study-toggle .icon')],
    ['Stage 25 study icon has responsive timing and respects reduced-motion', source.includes('Stage 25 — Mark-as-studied confirmation') && source.includes('--motion-note-study-duration: 225ms') && source.includes('#note-studied.motion-note-study-toggle .icon') && source.includes('animation: none !important;')],
    ['Stage 26 profile save status animates only when the state changes', source.includes('const changed = status.dataset.state !== s;') && source.includes("if (changed) replayMotion(status, 'motion-profile-status-change')") && source.includes('.cz-status.motion-profile-status-change')],
    ['Stage 26 removes continuous saving pulse and respects reduced-motion', !source.includes(".cz-status[data-state='saving']::before { background: var(--warn); animation: pulse 1s infinite; }") && source.includes('Stage 26 — Profile save status transitions') && source.includes('--motion-profile-status-duration: 185ms') && source.includes('animation: none !important;')],
    ['Stage 27 animates the Light/Dark/Auto button only when its mode changes', source.includes('const changed = BeceTheme.pref !== k;') && source.includes("if (changed) replayMotion(b, 'motion-profile-mode-selected')") && source.includes('.mode-seg button.motion-profile-mode-selected')],
    ['Stage 27 appearance mode feedback has responsive timing and reduced-motion support', source.includes('Stage 27 — Appearance mode selection feedback') && source.includes('--motion-profile-mode-duration: 190ms') && source.includes('.mode-seg button.motion-profile-mode-selected') && source.includes('animation: none !important;')],
    ['Stage 28 live-rendered achievement, daily, shop, Friends and Duel lists do not replay entrance animations', !/\.achievement-group\s*\{\s*animation:\s*motion-reward-rise/.test(source) && !/\.challenge-item,\s*\.daily-gem-rewards,\s*\.daily-challenge-bonus\s*\{\s*animation:\s*motion-reward-rise/.test(source) && !/\.board-list\s*>\s*li:nth-child\(-n\+5\)/.test(source) && !/\.duel-pane:not\(\[hidden\]\)\s*\{\s*animation:\s*motion-reward-rise/.test(source)],
    ['Stage 28 event-specific achievement and challenge feedback remains intact', source.includes('.achievement-item.is-newly-earned .achievement-icon') && source.includes('.challenge-item.is-just-completed .challenge-icon') && source.includes('Stage 28 — Prevent motion replay on live-rendered lists')],
    ['Stage 29 Duel correct and wrong answers use a short, consistent feedback animation', source.includes('Stage 29 — Calm Duel answer feedback') && source.includes('.duel-opts > .option.is-correct') && source.includes('.duel-opts > .option.is-wrong') && source.includes('animation: motion-answer-feedback var(--motion-duel-answer-duration)')],
    ['Stage 29 Duel answer feedback is responsive and respects reduced motion', source.includes('--motion-duel-answer-duration: 225ms') && source.includes('--motion-duel-answer-duration: 255ms') && source.includes('.duel-opts > .option.is-wrong') && source.includes('animation: none !important;')],
    ['Stage 30 Notes topic selection animates only when a different topic is selected', source.includes('selectTopic(id)') && source.includes('if (!id || this.activeId === id) return;') && source.includes("replayMotion(selected, 'motion-note-topic-selected')") && source.includes('this.selectTopic(target.id)')],
    ['Stage 30 Notes topic selection has responsive timing and reduced-motion support', source.includes('Stage 30 — Notes topic selection feedback') && source.includes('--motion-note-topic-duration: 185ms') && source.includes('#notes-sidebar .topic-item.motion-note-topic-selected') && source.includes('animation: none !important;')],
    ['Stage 31 Notes reading content animates only on initial entry or an explicit topic change', source.includes('this.refresh({ animateTopicEntrance: firstEntry })') && source.includes('this.refresh({ keepScroll: false, animateTopicEntrance: true })') && source.includes('renderNote(list, animateTopicEntrance = false)') && source.includes('body.classList.toggle(\'motion-note-content-enter\', Boolean(animateTopicEntrance))')],
    ['Stage 31 Notes topic content stays still on ordinary refreshes and respects reduced motion', source.includes('#note-body.motion-note-content-enter > .note-section') && source.includes('Stage 31 — Animate Notes content only on a new topic') && source.includes('animation: none !important;')],
    ['Stage 32 Notes text-size control animates only when the selected size changes', source.includes('const changed = Notes.font !== b.dataset.font;') && source.includes("if (changed) replayMotion(b, 'motion-note-font-selected')") && source.includes('[data-font].motion-note-font-selected')],
    ['Stage 32 Notes text-size feedback has responsive timing and reduced-motion support', source.includes('Stage 32 — Notes text-size selection feedback') && source.includes('--motion-note-font-duration: 175ms') && source.includes('[data-font].motion-note-font-selected') && source.includes('animation: none !important;')],
    ['Stage 33 Notes subject buttons animate only when the subject changes', source.includes('const changed = Notes.sub !== b.dataset.notesSub;') && source.includes('if (!changed) return;') && source.includes("replayMotion(b, 'motion-note-subject-selected')") && source.includes('.toolbar [data-notes-sub].motion-note-subject-selected')],
    ['Stage 33 Notes subject feedback has responsive timing and reduced-motion support', source.includes('Stage 33 — Notes subject selection feedback') && source.includes('--motion-note-subject-duration: 185ms') && source.includes('.toolbar [data-notes-sub].motion-note-subject-selected') && source.includes('animation: none !important;')],
    ['Stage 34 Notes JHS level buttons animate only on an actual filter change', source.includes('const changed = Notes.level !== b.dataset.level;') && source.includes('if (!changed) return;') && source.includes('const activeTopicRemains = Notes.list().some(note => note.id === Notes.activeId)') && source.includes("replayMotion(b, 'motion-note-level-selected')")],
    ['Stage 34 new filtered topic content and level feedback respect reduced motion', source.includes('Stage 34 — Notes JHS level selection feedback') && source.includes('--motion-note-level-duration: 185ms') && source.includes('.chip[data-level].motion-note-level-selected') && source.includes('animation: none !important;')],
    ['Stage 35 quiz setup animates only deliberate count, subject, length and mode changes', source.includes('Stage 35 — Quiz setup selection feedback') && source.includes('#quiz-subject-count .length-option.motion-setup-count-selected') && source.includes('.subject-choice-grid [data-setup-sub].motion-setup-subject-selected') && source.includes('#length-buttons .length-option.motion-setup-length-selected') && source.includes('.mode-grid .mode-option.motion-setup-mode-selected') && source.includes('motion-setup-count-selected') && source.includes('motion-setup-subject-selected') && source.includes('motion-setup-length-selected') && source.includes('motion-setup-mode-selected')],
    ['Stage 35 quiz setup feedback has touch timing and reduced-motion handling', source.includes('--motion-setup-choice-duration: 185ms') && source.includes('--motion-setup-choice-duration: 215ms') && source.includes('animation: none !important;')],
    ['Stage 36 interactive lesson answers animate the chosen option and feedback message', source.includes('Stage 36 — Interactive lesson answer feedback') && source.includes('.lesson-opt.motion-lesson-answer-correct') && source.includes('.lesson-opt.motion-lesson-answer-wrong') && source.includes('.lesson-fb.motion-lesson-feedback-correct') && source.includes("replayMotion(opts[n], 'motion-lesson-answer-correct')") && source.includes("replayMotion(opts[n], 'motion-lesson-answer-wrong')")],
    ['Stage 36 numeric lesson answers have distinct correct and incorrect feedback states', source.includes('.lesson-in.is-correct') && source.includes('.lesson-in.is-incorrect') && source.includes('motion-lesson-input-correct') && source.includes('motion-lesson-input-wrong') && source.includes('animation: none !important;')],
    ['Stage 37 animates only newly revealed worked-example steps', source.includes('Stage 37 — Worked-example step reveal') && source.includes('.flow-step.motion-worked-step-enter') && source.includes("replayMotion(d, 'motion-worked-step-enter')")],
    ['Stage 37 worked-step entrance has responsive timing and reduced-motion support', source.includes('--motion-worked-step-duration: 205ms') && source.includes('--motion-worked-step-duration: 245ms') && source.includes('animation: none !important;')],
    ['Stage 38 animates a Maths lab only when its result changes from unsolved to solved', source.includes('Stage 38 — Maths lab solved-state feedback') && source.includes("const wasSolved = !!result?.classList.contains('win')") && source.includes("replayMotion(result, 'motion-lab-solved')") && source.includes('.lab-out.motion-lab-solved')],
    ['Stage 38 lab solved feedback has responsive timing and reduced-motion support', source.includes('--motion-lab-solved-duration: 225ms') && source.includes('--motion-lab-solved-duration: 275ms') && source.includes('animation: none !important;')],
    ['Stage 39 only pulses the matching Shop card after a purchase or equip action', source.includes('function pulseShopItem(id, slot)') && source.includes("replayMotion(card, 'motion-shop-item-confirmed')") && source.includes("pulseShopItem(slot, 'consumable')") && source.includes("pulseShopItem(it.id, 'gem')") && source.includes("card.dataset.shopSlot = 'gem'")],
    ['Stage 39 Shop item feedback has mobile and desktop timing plus reduced-motion support', source.includes('Stage 39 — Shop purchase and equip confirmation') && source.includes('--motion-shop-confirm-duration: 265ms') && source.includes('--motion-shop-confirm-duration: 310ms') && source.includes('.gem-item.motion-shop-item-confirmed') && source.includes('animation: none !important;')],
    ['Stage 40 photo feedback waits for a successful Firestore save before changing the visible avatar', source.includes('async function persistPhoto(dataUrl)') && source.includes("await S.db.doc('players/' + S.uid).set({ photo: dataUrl }, { merge: true });") && source.includes("S.doc = { ...(S.doc || {}), photo: dataUrl };") && source.includes("replayMotion(av, 'motion-profile-photo-saved')") && source.includes("App.toast(dataUrl ? 'Photo saved!' : 'Photo removed.', 'good')")],
    ['Stage 40 photo feedback keeps the previous photo on failure and respects reduced motion', source.includes('Your previous photo is still in place') && source.includes('Stage 40 — Profile photo save confirmation') && source.includes('--motion-profile-photo-save-duration: 290ms') && source.includes('--motion-profile-photo-save-duration: 340ms') && source.includes('animation: none !important;')],
    ['Mobile announcements are placed after the fixed header, including on nested Notes and Essays routes', source.includes('#site-nav ~ .ann-bar') && source.includes('#site-nav ~ .ann-bar + #main')],
    ['Stage 41 reports a saved Essay draft only after confirming the localStorage write', source.includes('saveErrorShown: false') && source.includes('localStorage.setItem(key, serialized)') && source.includes("localStorage.getItem(key) !== serialized") && source.includes("this.setSaveStatus('saved', savedAt)") && source.includes("this.setSaveStatus('error', 'Couldn’t save draft · try again')")],
    ['Stage 41 saves the current Essay before switching questions or subjects', source.includes('if (this.idx === index) return;') && source.includes('this.idx = index;') && source.includes('Essays.sub = b.dataset.sbSub;') && source.includes("window.addEventListener('pagehide'") && source.includes("document.addEventListener('visibilitychange'")],
    ['Stage 41 draft save and error feedback has responsive timing and reduced-motion support', source.includes('Stage 41 — Essay draft save feedback') && source.includes('--motion-essay-draft-saved-duration: 205ms') && source.includes('--motion-essay-draft-saved-duration: 235ms') && source.includes('#essay-save-note.motion-essay-draft-saved') && source.includes('animation: none !important;')],
    ['Stage 41 word counting and answer-guide bullets use correct whitespace handling', source.includes("split(/\\s+/)") && source.includes("line.replace(/^\\s*•\\s*/, '')")],
    ['Stage 42 animates only the Admin/Owner button for a successful database-backed action', source.includes('let actionTrigger = null') && source.includes("replayMotion(trigger, 'motion-admin-action-confirmed')") && source.includes('if (trigger && trigger.isConnected)') && source.includes('catch (e) {\n      fail(e);\n      return false;') ],
    ['Stage 42 Admin/Owner action feedback has responsive timing and reduced-motion support', source.includes('Stage 42 — Admin and Owner action confirmation') && source.includes('--motion-admin-action-duration: 220ms') && source.includes('--motion-admin-action-duration: 255ms') && source.includes('.adm button.motion-admin-action-confirmed') && source.includes('animation: none !important;')],
    ['Stage 43 animates only the first lobby code, the Duel countdown and the final score panel', source.includes('let lastLobbyCode =') && source.includes('const isNewLobby = D.code !== lastLobbyCode') && source.includes("motion-duel-lobby-code-enter") && source.includes("motion-duel-countdown-enter") && source.includes("replayMotion(sc, 'motion-duel-result-score-enter')")],
    ['Stage 43 Duel lifecycle transitions have responsive timing and reduced-motion support', source.includes('Stage 43 — Duel lifecycle transitions') && source.includes('--motion-duel-lifecycle-duration: 215ms') && source.includes('--motion-duel-lifecycle-duration: 255ms') && source.includes('.duel-score.motion-duel-result-score-enter') && source.includes('animation: none !important;')],
    ['Stage 44 animates the Flashcards confidence total after a rating and the final summary headline', source.includes("replayMotion(get('confidence'), 'motion-flash-confidence-update')") && source.includes("replayMotion(get('summary-title'), 'motion-flash-summary-arrival')") && source.includes("if (!revealed || get('session').hidden) return;")],
    ['Stage 44 confidence and summary feedback have responsive timing and reduced-motion support', source.includes('Stage 44 — Flashcard confidence-rating feedback') && source.includes('--motion-flash-confidence-duration: 205ms') && source.includes('--motion-flash-confidence-duration: 235ms') && source.includes('--motion-flash-summary-duration: 250ms') && source.includes('#flash-summary-title.motion-flash-summary-arrival') && source.includes('animation: none !important;')],
    ['Stage 45 animates achievement progress only when a saved value actually increases', source.includes('const achievementProgressSnapshot = new Map()') && source.includes('const previousValue = achievementProgressSnapshot.get(a.id)') && source.includes('const progressed = previousValue !== undefined && value > previousValue && !earned') && source.includes('achievementProgressSnapshot.set(a.id, value)')],
    ['Stage 45 quarter milestones are selective and respect phone, desktop and reduced-motion settings', source.includes('Stage 45 — Achievement progress and quarter-milestone feedback') && source.includes('--motion-achievement-progress-duration: 340ms') && source.includes('--motion-achievement-progress-duration: 395ms') && source.includes('crossedMilestone') && source.includes('.achievement-icon.motion-achievement-milestone') && source.includes('animation: none !important;')],
    ['Stage 46 celebrates only a newly confirmed Day 7 daily Gem claim', source.includes('Number(data.rewardDay) || 1') && source.includes('dailyGemClaimFeedback === 7 && claimedToday && n===7') && source.includes('is-streak-milestone') && source.includes('!data.duplicate')],
    ['Stage 46 streak milestone has responsive timing and reduced-motion support', source.includes('Stage 46 — Seven-day daily Gem streak milestone') && source.includes('--motion-daily-streak-milestone-duration: 640ms') && source.includes('--motion-daily-streak-milestone-duration: 740ms') && source.includes('.daily-gem-day.is-streak-milestone') && source.includes('animation: none !important;')],
    ['Stage 47 quiz session entrance runs only when a valid Quiz.start begins', source.includes("replayMotion($('quiz-bar'), 'motion-quiz-session-bar-enter')") && source.includes("replayMotion($('quiz-stage'), 'motion-quiz-session-enter')") && source.includes("if (!opts.pool || !opts.pool.length)")],
    ['Stage 47 quiz session entrance has phone/desktop timing and reduced-motion support', source.includes('Stage 47 — Quiz session preparation transition') && source.includes('--motion-quiz-session-duration: 265ms') && source.includes('--motion-quiz-session-duration: 305ms') && source.includes('.quiz-bar.motion-quiz-session-bar-enter') && source.includes('animation: none !important;')],
    ['Stage 48 marks a Notes topic as complete only when it becomes studied', source.includes("if (!wasStudied)") && source.includes("querySelector('.topic-item[aria-current=\"true\"] .topic-done')") && source.includes("replayMotion(completionMark, 'motion-topic-completion')")],
    ['Stage 48 Notes completion marker has responsive timing and reduced-motion support', source.includes('Stage 48 — Notes topic completion progress feedback') && source.includes('--motion-topic-completion-duration: 225ms') && source.includes('--motion-topic-completion-duration: 260ms') && source.includes('.topic-done.motion-topic-completion') && source.includes('animation: none !important;')],
    ['Stage 49 gives each newly built quiz topic row a bounded staggered entrance', source.includes('let topicResultIndex = 0;') && source.includes('Math.min(topicResultIndex, 6)') && source.includes("replayMotion(row, 'motion-results-topic-row-enter')")],
    ['Stage 49 results breakdown has phone/desktop timing and reduced-motion support', source.includes('Stage 49 — Quiz results topic breakdown arrival') && source.includes('--motion-results-topic-row-duration: 230ms') && source.includes('--motion-results-topic-row-duration: 265ms') && source.includes('#topic-breakdown .topic-row.motion-results-topic-row-enter') && source.includes('animation: none !important;')],
    ['Stage 50 animates only increased Daily Challenge progress after an authenticated baseline', source.includes('const dailyChallengeProgressSnapshot = new Map()') && source.includes('dailyChallengeProgressReady = false') && source.includes('const progressed = trackDailyProgress && dailyChallengeProgressReady') && source.includes('progress > previousProgress && !complete') && source.includes('dailyChallengeProgressSnapshot.set(t.id, progress)')],
    ['Stage 50 Daily Challenge progress has responsive timing and reduced-motion support', source.includes('Stage 50 — Daily Challenge incremental progress feedback') && source.includes('--motion-challenge-progress-duration: 325ms') && source.includes('--motion-challenge-progress-duration: 375ms') && source.includes('.challenge-fill.motion-challenge-progress') && source.includes('animation: none !important;')],
    ['Stage 51 reveals the explanation only when a quiz review item is opened', source.includes('#res-review .review-item[open] > .review-body') && source.includes('motion-review-explanation-enter')],
    ['Stage 51 review explanation reveal has responsive timing and reduced-motion support', source.includes('Stage 51 — Quiz answer-review explanation reveal') && source.includes('--motion-review-explanation-duration: 195ms') && source.includes('--motion-review-explanation-duration: 225ms') && source.includes('animation: none !important;')],
    ['Stage 52 changes quiz review filters only on a new selection and animates the chosen button', source.includes('const nextFilter = b.dataset.review;') && source.includes('if (Quiz.reviewFilter === nextFilter) return;') && source.includes("replayMotion(b, 'motion-review-filter-selected')")],
    ['Stage 52 review filter feedback has phone/desktop timing and reduced-motion support', source.includes('Stage 52 — Quiz review filter selection feedback') && source.includes('--motion-review-filter-duration: 185ms') && source.includes('--motion-review-filter-duration: 215ms') && source.includes('#screen-quiz [data-review].motion-review-filter-selected') && source.includes('animation: none !important;')],
    ['Stage 53 Notes outline links target and animate only their matching section', source.includes('const sectionNode = renderNoteSection(section, index)') && source.includes("replayMotion(destination, 'motion-note-section-focus')") && source.includes('reading-section-')],
    ['Stage 53 Notes outline focus has responsive timing and reduced-motion support', source.includes('Stage 53 — Notes outline destination focus') && source.includes('--motion-note-section-focus-duration: 270ms') && source.includes('--motion-note-section-focus-duration: 305ms') && source.includes('.note-section.motion-note-section-focus') && source.includes('animation: none !important;')],
    ['Stage 54 reveals Notes and Essay learning aids only when their details panels are opened', source.includes('.note-answer[open] > p') && source.includes('.note-extra[open] > p') && source.includes('#essay-plan details[open] > ol') && source.includes('#essay-plan details[open] > p')],
    ['Stage 54 learning-aid reveal has responsive timing and reduced-motion support', source.includes('Stage 54 — Notes and Essay learning-aid reveal') && source.includes('--motion-learning-aid-reveal-duration: 200ms') && source.includes('--motion-learning-aid-reveal-duration: 230ms') && source.includes('animation: none !important;')],
    ['Stage 43 Duel result lifecycle animation runs once per duel, not on every snapshot refresh', source.includes("let lastLobbyCode = '', lastResultCode = '';") && source.includes('const isNewResult = D.code !== lastResultCode;') && source.includes("if (isNewResult) {") && source.includes("lastResultCode = ''")],
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

      let announcementPopupHandled = false;
      for (const route of ROUTES) {
        const target = `${BASE}/${route.hash}`;
        try {
          await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
          await page.waitForFunction(
            expected => document.body?.dataset?.screen === expected,
            route.screen,
            { timeout: 30000 }
          );
          if (!announcementPopupHandled) {
            await page.locator('#ann-pop button').filter({ hasText: 'Got it' }).click({ timeout: 2200 }).catch(() => {});
            announcementPopupHandled = true;
          }
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
              heroArtwork: (() => {
                const node = document.querySelector('#screen-home .hero-art');
                if (!node) return { found: false };
                const rect = node.getBoundingClientRect();
                return { found: true, display: getComputedStyle(node).display, width: Math.round(rect.width), left: Math.round(rect.left), right: Math.round(rect.right) };
              })(),
              brandSymbol: (() => {
                const node = document.querySelector('.site-nav .brand-symbol');
                if (!node) return { found: false };
                const rect = node.getBoundingClientRect();
                return { found: true, display: getComputedStyle(node).display, width: Math.round(rect.width), left: Math.round(rect.left), right: Math.round(rect.right) };
              })(),
              announcementBar: (() => {
                const node = document.querySelector('#ann-bar');
                if (!node) return { found: false };
                const rect = node.getBoundingClientRect();
                const navRect = document.querySelector('#site-nav')?.getBoundingClientRect();
                return { found: true, top: Math.round(rect.top), bottom: Math.round(rect.bottom), navBottom: Math.round(navRect?.bottom || 0) };
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
          if (viewport.width <= 760) {
            if (!diagnostics.brandSymbol?.found || diagnostics.brandSymbol.display === 'none' || diagnostics.brandSymbol.width < 28
              || diagnostics.brandSymbol.left < -2 || diagnostics.brandSymbol.right > viewport.width + 2) {
              report.failures.push(`${key}: mobile brand symbol is missing or clipped`);
            }
            if (diagnostics.announcementBar?.found && diagnostics.announcementBar.top < diagnostics.announcementBar.navBottom - 2) {
              report.failures.push(`${key}: announcement banner is hidden beneath the fixed mobile header`);
            }
          }
          if (route.screen === 'home' && viewport.width <= 760) {
            const artwork = diagnostics.heroArtwork;
            if (!artwork?.found || artwork.display === 'none' || artwork.width < 60 || artwork.left < -2 || artwork.right > viewport.width + 2) {
              report.failures.push(`${key}: Overview artwork is missing or clipped on mobile`);
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
      const check = { viewport: viewport.name, reducedMotion: false, screen: false, homeHero: false, toastEnter: false, toastExit: false, overlayExit: false, overlayPanelExit: false, overlayReducedMotion: false, announcementEnter: false, announcementExit: false, rewardClaimFeedback: false, rewardClaimReducedMotion: false, challengeCompletionFeedback: false, challengeCompletionReducedMotion: false, newAchievementFeedback: false, newAchievementReducedMotion: false, bookmarkSaveFeedback: false, bookmarkRemoveFeedback: false, bookmarkReducedMotion: false, boardFilterFeedback: false, boardFilterReducedMotion: false, duelModeFeedback: false, duelOptionFeedback: false, duelReducedMotion: false, duelResultHeading: false, duelResultReducedMotion: false, adminSectionMotion: false, adminSectionReducedMotion: false, noteStudyFeedback: false, noteStudyReducedMotion: false, profileStatusMotion: false, profileStatusReducedMotion: false, appearanceModeFeedback: false, appearanceModeReducedMotion: false, repeatEntrySuppressed: false, targetedRewardMotionPreserved: false, duelAnswerFeedback: false, duelAnswerReducedMotion: false, notesTopicFeedback: false, notesTopicReducedMotion: false, noteContentEntrance: false, noteContentReducedMotion: false, noteFontFeedback: false, noteFontReducedMotion: false, noteSubjectFeedback: false, noteSubjectReducedMotion: false, noteLevelFeedback: false, noteLevelReducedMotion: false, setupCountFeedback: false, setupSubjectFeedback: false, setupLengthFeedback: false, setupModeFeedback: false, lessonAnswerFeedback: false, lessonNumericFeedback: false, workedStepFeedback: false, labSolvedFeedback: false, shopConfirmationFeedback: false, profilePhotoSaveFeedback: false, essayDraftFeedback: false, adminActionConfirmationFeedback: false, duelLifecycleFeedback: false, flashConfidenceFeedback: false, achievementProgressFeedback: false, dailyStreakMilestoneFeedback: false, quizSessionEntryFeedback: false, topicCompletionFeedback: false, resultsTopicBreakdownFeedback: false, dailyChallengeProgressFeedback: false, reviewExplanationFeedback: false, reviewFilterFeedback: false, notesOutlineFocusFeedback: false, learningAidRevealFeedback: false, navigationIcon: false, mobileHeaderPinned: false, coinFlightVisible: false, coinFlightParticles: false, queuedCoinFlightVisible: false, quizWalletMarkup: false, question: false, answerFeedback: false, results: false, notes: false, notesPanel: false, essaysPanel: false, coinsPanel: false, gemsPanel: false, flashcard: false };
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

        stage = 'quiz setup selection feedback';
        await motionPage.locator('#quiz-subject-count [data-subject-count="2"]').click();
        await motionPage.waitForTimeout(45);
        check.setupCountFeedback = await motionPage.evaluate(() => {
          const button = document.querySelector('#quiz-subject-count [data-subject-count="2"]');
          return !!button && button.getAttribute('aria-pressed') === 'true'
            && getComputedStyle(button).animationName === 'motion-setup-choice-pop';
        });
        await motionPage.locator('[data-setup-sub="arts"]').click();
        await motionPage.waitForTimeout(45);
        check.setupSubjectFeedback = await motionPage.evaluate(() => {
          const button = document.querySelector('[data-setup-sub="arts"]');
          return !!button && button.getAttribute('aria-pressed') === 'true'
            && getComputedStyle(button).animationName === 'motion-setup-choice-pop';
        });
        await motionPage.locator('#quiz-subject-count [data-subject-count="1"]').click();
        await motionPage.locator('#length-buttons [data-setup-length="5"]').click();
        await motionPage.waitForTimeout(45);
        check.setupLengthFeedback = await motionPage.evaluate(() => {
          const button = document.querySelector('#length-buttons [data-setup-length="5"]');
          return !!button && button.getAttribute('aria-pressed') === 'true'
            && getComputedStyle(button).animationName === 'motion-setup-choice-pop';
        });
        await motionPage.locator('#length-buttons [data-setup-length="10"]').click();
        await motionPage.locator('[data-mode="exam"]').click();
        await motionPage.waitForTimeout(45);
        check.setupModeFeedback = await motionPage.evaluate(() => {
          const button = document.querySelector('[data-mode="exam"]');
          return !!button && button.getAttribute('aria-checked') === 'true'
            && getComputedStyle(button).animationName === 'motion-setup-choice-pop';
        });
        await motionPage.locator('[data-mode="practice"]').click();

        stage = 'interactive lesson answer feedback';
        await motionPage.evaluate(() => {
          const root = document.createElement('div');
          root.id = 'motion-stage-36-test';
          const card = FlowBlock({ ask: 'Which answer is correct?', opts: ['Not this one', 'This one'], ans: 1, reply: 'Correct answer!' });
          root.append(card);
          document.body.append(root);
          root.querySelectorAll('.lesson-opt')[0].click();
        });
        await motionPage.waitForTimeout(50);
        const wrongFeedback = await motionPage.evaluate(() => {
          const root = document.querySelector('#motion-stage-36-test');
          const wrong = root?.querySelector('.lesson-opt.bad.motion-lesson-answer-wrong');
          const feedback = root?.querySelector('.lesson-fb.motion-lesson-feedback-wrong');
          return !!wrong && !!feedback
            && getComputedStyle(wrong).animationName === 'motion-lesson-answer-pop'
            && getComputedStyle(feedback).animationName === 'motion-lesson-feedback-enter';
        });
        await motionPage.evaluate(() => {
          document.querySelector('#motion-stage-36-test')?.querySelectorAll('.lesson-opt')[1].click();
        });
        await motionPage.waitForTimeout(50);
        check.lessonAnswerFeedback = wrongFeedback && await motionPage.evaluate(() => {
          const root = document.querySelector('#motion-stage-36-test');
          const correct = root?.querySelector('.lesson-opt.ok.motion-lesson-answer-correct');
          const feedback = root?.querySelector('.lesson-fb.motion-lesson-feedback-correct');
          return !!correct && !!feedback
            && getComputedStyle(correct).animationName === 'motion-lesson-answer-pop'
            && getComputedStyle(feedback).animationName === 'motion-lesson-feedback-enter';
        });

        const numeric = await motionPage.evaluate(() => {
          const root = document.querySelector('#motion-stage-36-test');
          const card = FlowBlock({ try: 'What is 3 + 3?', ans: 6, hint: 'Add the two numbers.', reply: 'Six!' });
          root.append(card);
          const input = card.querySelector('.lesson-in');
          input.value = '2';
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          return !!card.querySelector('.lesson-in.is-incorrect');
        });
        await motionPage.waitForTimeout(45);
        check.lessonNumericFeedback = numeric && await motionPage.evaluate(() => {
          const root = document.querySelector('#motion-stage-36-test');
          const input = root?.querySelector('.lesson-in.is-incorrect.motion-lesson-input-wrong');
          const feedback = root?.querySelector('.lesson-fb.motion-lesson-feedback-wrong');
          return !!input && !!feedback && getComputedStyle(input).animationName === 'motion-lesson-answer-pop';
        });

        stage = 'worked-example step reveal';
        await motionPage.evaluate(() => {
          const root = document.querySelector('#motion-stage-36-test');
          const card = FlowBlock({ title: 'A two-step example', steps: [{ h: 'First', w: 'Start with the first operation.' }] });
          root.append(card);
          card.querySelector('.lesson-check').click();
        });
        await motionPage.waitForTimeout(45);
        check.workedStepFeedback = await motionPage.evaluate(() => {
          const step = document.querySelector('#motion-stage-36-test .flow-step.motion-worked-step-enter');
          return !!step && getComputedStyle(step).animationName === 'motion-worked-step-enter';
        });

        stage = 'Maths lab solved-state feedback';
        await motionPage.evaluate(() => {
          const root = document.querySelector('#motion-stage-36-test');
          const lab = FlowBlock({ widget: 'bal' });
          root.append(lab);
          const slider = lab.querySelector('input[type="range"]');
          slider.value = '3';
          slider.dispatchEvent(new Event('input', { bubbles: true }));
          slider.value = '6';
          slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await motionPage.waitForTimeout(50);
        check.labSolvedFeedback = await motionPage.evaluate(() => {
          const result = document.querySelector('#motion-stage-36-test .lab-out.motion-lab-solved');
          return !!result && result.classList.contains('win')
            && getComputedStyle(result).animationName === 'motion-lab-solved-pop';
        });
        await motionPage.evaluate(() => document.querySelector('#motion-stage-36-test')?.remove());

        stage = 'Shop confirmation feedback';
        await motionPage.evaluate(() => {
          const card = document.createElement('article');
          card.className = 'shop-item motion-shop-item-confirmed';
          card.id = 'motion-stage-39-test';
          document.body.append(card);
        });
        await motionPage.waitForTimeout(45);
        check.shopConfirmationFeedback = await motionPage.evaluate(() => {
          const card = document.querySelector('#motion-stage-39-test');
          return !!card && getComputedStyle(card).animationName === 'motion-shop-item-confirmed';
        });
        await motionPage.evaluate(() => document.querySelector('#motion-stage-39-test')?.remove());

        stage = 'Profile photo save confirmation feedback';
        await motionPage.evaluate(() => {
          const head = document.createElement('div');
          head.className = 'pc-head';
          head.id = 'motion-stage-40-test';
          const avatar = document.createElement('span');
          avatar.className = 'av motion-profile-photo-saved';
          head.append(avatar);
          document.body.append(head);
        });
        await motionPage.waitForTimeout(50);
        check.profilePhotoSaveFeedback = await motionPage.evaluate(() => {
          const avatar = document.querySelector('#motion-stage-40-test .av');
          return !!avatar && getComputedStyle(avatar).animationName === 'motion-profile-photo-saved';
        });
        await motionPage.evaluate(() => document.querySelector('#motion-stage-40-test')?.remove());

        stage = 'Essay draft confirmation feedback';
        await motionPage.evaluate(() => {
          const note = document.querySelector('#essay-save-note');
          if (!note) throw new Error('Essay save status element was not found.');
          note.classList.remove('motion-essay-draft-error');
          note.classList.add('motion-essay-draft-saved');
        });
        await motionPage.waitForTimeout(45);
        check.essayDraftFeedback = await motionPage.evaluate(() => {
          const note = document.querySelector('#essay-save-note');
          return !!note && getComputedStyle(note).animationName === 'motion-essay-draft-saved';
        });
        await motionPage.evaluate(() => document.querySelector('#essay-save-note')?.classList.remove('motion-essay-draft-saved'));

        stage = 'Admin/Owner action confirmation feedback';
        await motionPage.evaluate(() => {
          const panel = document.createElement('section');
          panel.className = 'adm';
          panel.id = 'motion-stage-42-panel';
          const button = document.createElement('button');
          button.className = 'btn motion-admin-action-confirmed';
          button.textContent = 'Saved';
          panel.append(button);
          document.body.append(panel);
        });
        await motionPage.waitForTimeout(45);
        check.adminActionConfirmationFeedback = await motionPage.evaluate(() => {
          const button = document.querySelector('#motion-stage-42-panel button');
          return !!button && getComputedStyle(button).animationName === 'motion-admin-action-confirmed';
        });
        await motionPage.evaluate(() => document.querySelector('#motion-stage-42-panel')?.remove());

        stage = 'Duel lifecycle confirmation feedback';
        await motionPage.evaluate(() => {
          const host = document.createElement('div');
          host.className = 'duel-modal';
          host.id = 'motion-stage-43-test';
          const code = document.createElement('div');
          code.className = 'duel-code motion-duel-lobby-code-enter';
          const countdown = document.createElement('div');
          countdown.className = 'duel-vs-big motion-duel-countdown-enter';
          const score = document.createElement('div');
          score.className = 'duel-score motion-duel-result-score-enter';
          host.append(code, countdown, score);
          document.body.append(host);
        });
        await motionPage.waitForTimeout(45);
        check.duelLifecycleFeedback = await motionPage.evaluate(() => {
          const root = document.querySelector('#motion-stage-43-test');
          return !!root
            && getComputedStyle(root.querySelector('.duel-code')).animationName === 'motion-duel-lifecycle-enter'
            && getComputedStyle(root.querySelector('.duel-vs-big')).animationName === 'motion-duel-lifecycle-enter'
            && getComputedStyle(root.querySelector('.duel-score')).animationName === 'motion-duel-lifecycle-enter';
        });
        await motionPage.evaluate(() => document.querySelector('#motion-stage-43-test')?.remove());

        stage = 'Flashcards confidence-rating feedback';
        await motionPage.evaluate(() => {
          const confidence = document.querySelector('#flash-confidence');
          const summary = document.querySelector('#flash-summary-title');
          if (!confidence || !summary) throw new Error('Flashcards confidence elements were not found.');
          confidence.classList.add('motion-flash-confidence-update');
          summary.classList.add('motion-flash-summary-arrival');
        });
        await motionPage.waitForTimeout(50);
        check.flashConfidenceFeedback = await motionPage.evaluate(() => {
          const confidence = document.querySelector('#flash-confidence');
          const summary = document.querySelector('#flash-summary-title');
          return !!confidence && !!summary
            && getComputedStyle(confidence).animationName === 'motion-flash-confidence-update'
            && getComputedStyle(summary).animationName === 'motion-flash-summary-arrival';
        });
        await motionPage.evaluate(() => {
          document.querySelector('#flash-confidence')?.classList.remove('motion-flash-confidence-update');
          document.querySelector('#flash-summary-title')?.classList.remove('motion-flash-summary-arrival');
        });

        stage = 'Achievement progress and milestone feedback';
        await motionPage.evaluate(() => {
          const card = document.createElement('article');
          card.className = 'achievement-item';
          card.id = 'motion-stage-45-test';
          const icon = document.createElement('span');
          icon.className = 'achievement-icon motion-achievement-milestone';
          const bar = document.createElement('span');
          bar.className = 'achievement-fill motion-achievement-progress';
          bar.style.setProperty('--achievement-progress-from', '.25');
          bar.style.setProperty('--achievement-progress-to', '.5');
          card.append(icon, bar);
          document.body.append(card);
        });
        await motionPage.waitForTimeout(50);
        check.achievementProgressFeedback = await motionPage.evaluate(() => {
          const root = document.querySelector('#motion-stage-45-test');
          const icon = root?.querySelector('.achievement-icon');
          const bar = root?.querySelector('.achievement-fill');
          return !!icon && !!bar
            && getComputedStyle(bar).animationName === 'motion-achievement-progress'
            && getComputedStyle(icon).animationName === 'motion-achievement-milestone';
        });
        await motionPage.evaluate(() => document.querySelector('#motion-stage-45-test')?.remove());

        stage = 'Daily seven-day Gem streak milestone feedback';
        await motionPage.evaluate(() => {
          const tile = document.createElement('div');
          tile.className = 'daily-gem-day is-streak-milestone';
          tile.id = 'motion-stage-46-test';
          tile.append(document.createElement('strong'), document.createElement('span'));
          document.body.append(tile);
        });
        await motionPage.waitForTimeout(55);
        check.dailyStreakMilestoneFeedback = await motionPage.evaluate(() => {
          const tile = document.querySelector('#motion-stage-46-test');
          return !!tile && getComputedStyle(tile).animationName === 'motion-daily-streak-milestone';
        });
        await motionPage.evaluate(() => document.querySelector('#motion-stage-46-test')?.remove());

        stage = 'Quiz session preparation feedback';
        await motionPage.evaluate(() => {
          const header = document.createElement('div');
          header.className = 'quiz-bar motion-quiz-session-bar-enter';
          header.id = 'motion-stage-47-header';
          const stage = document.createElement('div');
          stage.id = 'quiz-stage';
          stage.className = 'motion-quiz-session-enter';
          stage.id = 'motion-stage-47-stage';
          document.body.append(header, stage);
        });
        await motionPage.waitForTimeout(50);
        check.quizSessionEntryFeedback = await motionPage.evaluate(() => {
          const header = document.querySelector('#motion-stage-47-header');
          const stage = document.querySelector('#motion-stage-47-stage');
          return !!header && !!stage
            && getComputedStyle(header).animationName === 'motion-quiz-session-bar-enter'
            && getComputedStyle(stage).animationName === 'motion-quiz-session-enter';
        });
        await motionPage.evaluate(() => {
          document.querySelector('#motion-stage-47-header')?.remove();
          document.querySelector('#motion-stage-47-stage')?.remove();
        });

        stage = 'Notes topic completion feedback';
        await motionPage.evaluate(() => {
          const mark = document.createElement('span');
          mark.className = 'topic-done motion-topic-completion';
          mark.id = 'motion-stage-48-test';
          document.body.append(mark);
        });
        await motionPage.waitForTimeout(45);
        check.topicCompletionFeedback = await motionPage.evaluate(() => {
          const mark = document.querySelector('#motion-stage-48-test');
          return !!mark && getComputedStyle(mark).animationName === 'motion-topic-completion';
        });
        await motionPage.evaluate(() => document.querySelector('#motion-stage-48-test')?.remove());

        stage = 'Quiz results topic breakdown feedback';
        await motionPage.evaluate(() => {
          const breakdown = document.createElement('section');
          breakdown.id = 'topic-breakdown';
          const row = document.createElement('div');
          row.className = 'topic-row motion-results-topic-row-enter';
          row.style.setProperty('--topic-result-index', '2');
          row.id = 'motion-stage-49-test';
          breakdown.append(row);
          document.body.append(breakdown);
        });
        await motionPage.waitForTimeout(45);
        check.resultsTopicBreakdownFeedback = await motionPage.evaluate(() => {
          const row = document.querySelector('#motion-stage-49-test');
          return !!row && getComputedStyle(row).animationName === 'motion-results-topic-row-enter';
        });
        await motionPage.evaluate(() => document.querySelector('#topic-breakdown')?.remove());

        stage = 'Daily Challenge incremental progress feedback';
        await motionPage.evaluate(() => {
          const card = document.createElement('article');
          card.className = 'challenge-item';
          card.id = 'motion-stage-50-test';
          const fill = document.createElement('span');
          fill.className = 'challenge-fill motion-challenge-progress';
          fill.style.setProperty('--challenge-progress-from', '.25');
          fill.style.setProperty('--challenge-progress-to', '.5');
          card.append(fill);
          document.body.append(card);
        });
        await motionPage.waitForTimeout(45);
        check.dailyChallengeProgressFeedback = await motionPage.evaluate(() => {
          const fill = document.querySelector('#motion-stage-50-test .challenge-fill');
          return !!fill && getComputedStyle(fill).animationName === 'motion-challenge-progress';
        });
        await motionPage.evaluate(() => document.querySelector('#motion-stage-50-test')?.remove());

        stage = 'Quiz review explanation reveal feedback';
        await motionPage.evaluate(() => {
          const review = document.createElement('section');
          review.id = 'res-review';
          const item = document.createElement('details');
          item.className = 'review-item';
          item.open = true;
          const body = document.createElement('div');
          body.className = 'review-body';
          body.id = 'motion-stage-51-test';
          body.textContent = 'Explanation';
          item.append(body);
          review.append(item);
          document.body.append(review);
        });
        await motionPage.waitForTimeout(45);
        check.reviewExplanationFeedback = await motionPage.evaluate(() => {
          const body = document.querySelector('#motion-stage-51-test');
          return !!body && getComputedStyle(body).animationName === 'motion-review-explanation-enter';
        });
        await motionPage.evaluate(() => document.querySelector('#res-review')?.remove());

        stage = 'Quiz review filter selection feedback';
        await motionPage.evaluate(() => {
          const group = document.createElement('div');
          group.id = 'motion-stage-52-test';
          const button = document.createElement('button');
          button.dataset.review = 'all';
          button.className = 'motion-review-filter-selected';
          group.append(button);
          document.body.append(group);
        });
        await motionPage.waitForTimeout(45);
        check.reviewFilterFeedback = await motionPage.evaluate(() => {
          const button = document.querySelector('#motion-stage-52-test [data-review]');
          return !!button && getComputedStyle(button).animationName === 'motion-review-filter-selected';
        });
        await motionPage.evaluate(() => document.querySelector('#motion-stage-52-test')?.remove());

        stage = 'Notes outline destination focus feedback';
        await motionPage.evaluate(() => {
          const section = document.createElement('section');
          section.className = 'note-section motion-note-section-focus';
          section.id = 'motion-stage-53-test';
          document.body.append(section);
        });
        await motionPage.waitForTimeout(45);
        check.notesOutlineFocusFeedback = await motionPage.evaluate(() => {
          const section = document.querySelector('#motion-stage-53-test');
          return !!section && getComputedStyle(section).animationName === 'motion-note-section-focus';
        });
        await motionPage.evaluate(() => document.querySelector('#motion-stage-53-test')?.remove());

        stage = 'Notes and Essay learning-aid reveal feedback';
        await motionPage.evaluate(() => {
          const host = document.createElement('section');
          host.id = 'motion-stage-54-test';
          const noteAnswer = document.createElement('details');
          noteAnswer.className = 'note-answer';
          noteAnswer.open = true;
          const answerText = document.createElement('p');
          noteAnswer.append(answerText);
          const noteExtra = document.createElement('details');
          noteExtra.className = 'note-extra';
          noteExtra.open = true;
          const extraText = document.createElement('p');
          noteExtra.append(extraText);
          const essay = document.createElement('div');
          essay.id = 'essay-plan';
          const essayDetails = document.createElement('details');
          essayDetails.open = true;
          const steps = document.createElement('ol');
          const example = document.createElement('p');
          essayDetails.append(steps, example);
          essay.append(essayDetails);
          host.append(noteAnswer, noteExtra, essay);
          document.body.append(host);
        });
        await motionPage.waitForTimeout(45);
        check.learningAidRevealFeedback = await motionPage.evaluate(() => {
          const root = document.querySelector('#motion-stage-54-test');
          const nodes = [
            root?.querySelector('.note-answer > p'),
            root?.querySelector('.note-extra > p'),
            root?.querySelector('#essay-plan ol'),
            root?.querySelector('#essay-plan details > p')
          ];
          return nodes.every(node => !!node && getComputedStyle(node).animationName === 'motion-learning-aid-reveal');
        });
        await motionPage.evaluate(() => document.querySelector('#motion-stage-54-test')?.remove());

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
        const auditToastText = 'Responsive motion audit notice';
        await homePage.waitForFunction(() => {
          const item = [...document.querySelectorAll('.toasts .toast')]
            .find(node => node.textContent.includes('Responsive motion audit notice'));
          return !!item && item.classList.contains('is-in');
        }, null, { timeout: 3000 });
        await homePage.waitForFunction(() => {
          const item = [...document.querySelectorAll('.toasts .toast')]
            .find(node => node.textContent.includes('Responsive motion audit notice'));
          return !!item && Number(getComputedStyle(item).opacity) > .98;
        }, null, { timeout: 1200 });
        check.toastEnter = await homePage.evaluate(text => {
          const item = [...document.querySelectorAll('.toasts .toast')]
            .find(node => node.textContent.includes(text));
          if (!item || !item.classList.contains('is-in')) return false;
          const style = getComputedStyle(item);
          const properties = style.transitionProperty.split(',').map(value => value.trim());
          const duration = Number.parseFloat(style.transitionDuration) || 0;
          return properties.includes('opacity') && properties.includes('transform')
            && duration >= .15 && duration <= .24 && Number(style.opacity) > .98;
        }, auditToastText);
        await homePage.waitForFunction(() => {
          const item = [...document.querySelectorAll('.toasts .toast')]
            .find(node => node.textContent.includes('Responsive motion audit notice'));
          return !!item && item.classList.contains('is-out');
        }, null, { timeout: 5000 });
        await homePage.waitForFunction(() => {
          const item = [...document.querySelectorAll('.toasts .toast')]
            .find(node => node.textContent.includes('Responsive motion audit notice'));
          return !!item && Number(getComputedStyle(item).opacity) < .05;
        }, null, { timeout: 1200 });
        check.toastExit = await homePage.evaluate(text => {
          const item = [...document.querySelectorAll('.toasts .toast')]
            .find(node => node.textContent.includes(text));
          if (!item || !item.classList.contains('is-out')) return false;
          const style = getComputedStyle(item);
          const properties = style.transitionProperty.split(',').map(value => value.trim());
          const duration = Number.parseFloat(style.transitionDuration) || 0;
          return properties.includes('opacity') && properties.includes('transform')
            && Number(style.opacity) < .05 && duration >= .15 && duration <= .21;
        }, auditToastText);
        await homePage.waitForFunction(() => ![...document.querySelectorAll('.toasts .toast')]
          .some(item => item.textContent.includes('Responsive motion audit notice')), null, { timeout: 1000 });
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
        });
        // Let the overlay's entrance settle before starting the exit transition.
        await homePage.waitForTimeout(260);
        await homePage.evaluate(() => {
          const overlay = document.querySelector('#motion-overlay-test');
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
        stage = 'announcement banner entrance and exit';
        await homePage.evaluate(() => {
          const banner = document.createElement('div');
          banner.id = 'motion-announcement-test';
          banner.className = 'ann-bar';
          banner.textContent = 'Announcement motion audit';
          document.body.append(banner);
        });
        await homePage.waitForTimeout(260);
        check.announcementEnter = await homePage.evaluate(() => {
          const banner = document.querySelector('#motion-announcement-test');
          if (!banner) return false;
          const style = getComputedStyle(banner);
          const duration = Number.parseFloat(style.animationDuration) || 0;
          return style.animationName === 'motion-announcement-enter'
            && duration >= .19 && duration <= .25 && Number(style.opacity) > .98;
        });
        await homePage.evaluate(() => {
          const banner = document.querySelector('#motion-announcement-test');
          window.__motionAnnouncementDone = false;
          window.App.dismissOverlay(banner, () => { window.__motionAnnouncementDone = true; });
        });
        await homePage.waitForFunction(() =>
          document.querySelector('#motion-announcement-test')?.classList.contains('motion-overlay-closing'),
          null, { timeout: 2000 }
        );
        await homePage.waitForTimeout(55);
        check.announcementExit = await homePage.evaluate(() => {
          const banner = document.querySelector('#motion-announcement-test');
          if (!banner) return false;
          const style = getComputedStyle(banner);
          const properties = style.transitionProperty.split(',').map(value => value.trim());
          const duration = Number.parseFloat(style.transitionDuration) || 0;
          const opacity = Number(style.opacity);
          return opacity > 0 && opacity < 1
            && properties.includes('opacity') && properties.includes('transform')
            && duration >= .15 && duration <= .21;
        });
        await homePage.waitForFunction(() => window.__motionAnnouncementDone === true
          && !document.querySelector('#motion-announcement-test'), null, { timeout: 1200 });
        stage = 'confirmed reward claim feedback';
        await homePage.evaluate(() => {
          const dayTile = document.createElement('div');
          dayTile.id = 'motion-claimed-day-test';
          dayTile.className = 'daily-gem-day is-claim-confirmed';
          const dailyCoins = document.createElement('section');
          dailyCoins.className = 'daily-challenge-bonus is-claim-confirmed';
          const coinIcon = document.createElement('span');
          coinIcon.className = 'daily-challenge-bonus-icon';
          dailyCoins.append(coinIcon);
          const achievement = document.createElement('article');
          achievement.className = 'achievement-item is-gem-claim-confirmed';
          const claimedBadge = document.createElement('span');
          claimedBadge.className = 'achievement-claim-confirmed';
          achievement.append(claimedBadge);
          document.body.append(dayTile, dailyCoins, achievement);
        });
        check.rewardClaimFeedback = await homePage.evaluate(() => {
          const day = document.querySelector('#motion-claimed-day-test');
          const coins = document.querySelector('.daily-challenge-bonus.is-claim-confirmed .daily-challenge-bonus-icon');
          const badge = document.querySelector('.achievement-item.is-gem-claim-confirmed .achievement-claim-confirmed');
          return !!day && !!coins && !!badge
            && getComputedStyle(day).animationName === 'motion-reward-claim-confirmed'
            && getComputedStyle(coins).animationName === 'motion-reward-claim-confirmed'
            && getComputedStyle(badge).animationName === 'motion-reward-claim-confirmed';
        });
        await homePage.emulateMedia({ reducedMotion: 'reduce' });
        check.rewardClaimReducedMotion = await homePage.evaluate(() => {
          const nodes = [
            document.querySelector('#motion-claimed-day-test'),
            document.querySelector('.daily-challenge-bonus.is-claim-confirmed .daily-challenge-bonus-icon'),
            document.querySelector('.achievement-item.is-gem-claim-confirmed .achievement-claim-confirmed')
          ];
          return nodes.every(node => node && getComputedStyle(node).animationName === 'none');
        });
        await homePage.emulateMedia({ reducedMotion: 'no-preference' });
        const challengeCompleteFeedback = await homePage.evaluate(() => {
          const item = document.createElement('article');
          item.id = 'motion-challenge-complete-test';
          item.className = 'challenge-item is-complete is-just-completed';
          const icon = document.createElement('span');
          icon.className = 'challenge-icon';
          const reward = document.createElement('span');
          reward.className = 'challenge-reward';
          item.append(icon, reward);
          document.body.append(item);
          return {
            icon: getComputedStyle(icon).animationName,
            reward: getComputedStyle(reward).animationName,
            duration: Number.parseFloat(getComputedStyle(icon).animationDuration) || 0,
          };
        });
        check.challengeCompletionFeedback = challengeCompleteFeedback.icon === 'motion-challenge-complete-pop'
          && challengeCompleteFeedback.reward === 'motion-challenge-complete-pop'
          && challengeCompleteFeedback.duration >= .25 && challengeCompleteFeedback.duration <= .32;
        const achievementMotionState = await homePage.evaluate(() => {
          const oldCard = document.createElement('article');
          oldCard.className = 'achievement-item is-earned';
          const oldIcon = document.createElement('span');
          oldIcon.className = 'achievement-icon';
          oldCard.append(oldIcon);

          const newCard = document.createElement('article');
          newCard.className = 'achievement-item is-earned is-newly-earned';
          const newIcon = document.createElement('span');
          newIcon.className = 'achievement-icon';
          newCard.append(newIcon);
          document.body.append(oldCard, newCard);
          return {
            oldIcon: getComputedStyle(oldIcon).animationName,
            newIcon: getComputedStyle(newIcon).animationName,
            duration: Number.parseFloat(getComputedStyle(newIcon).animationDuration) || 0,
          };
        });
        check.newAchievementFeedback = achievementMotionState.oldIcon === 'none'
          && achievementMotionState.newIcon === 'motion-reward-pop'
          && achievementMotionState.duration >= .25 && achievementMotionState.duration <= .38;
        const bookmarkMotionState = await homePage.evaluate(() => {
          const make = (id, feedbackClass) => {
            const button = document.createElement('button');
            button.id = id;
            button.className = 'bookmark ' + feedbackClass;
            const icon = document.createElement('span');
            icon.className = 'icon';
            button.append(icon);
            document.body.append(button);
            return getComputedStyle(icon);
          };
          const saved = make('motion-bookmark-save-test', 'motion-bookmark-saved');
          const removed = make('motion-bookmark-remove-test', 'motion-bookmark-removed');
          return {
            saved: saved.animationName,
            removed: removed.animationName,
            saveDuration: Number.parseFloat(saved.animationDuration) || 0,
            removeDuration: Number.parseFloat(removed.animationDuration) || 0,
          };
        });
        check.bookmarkSaveFeedback = bookmarkMotionState.saved === 'motion-bookmark-toggle-pop'
          && bookmarkMotionState.saveDuration >= .22 && bookmarkMotionState.saveDuration <= .29;
        check.bookmarkRemoveFeedback = bookmarkMotionState.removed === 'motion-bookmark-toggle-pop'
          && bookmarkMotionState.removeDuration >= .19 && bookmarkMotionState.removeDuration <= .26;
        const boardFilterMotion = await homePage.evaluate(() => {
          const group = document.createElement('div');
          group.className = 'board-seg';
          const selected = document.createElement('button');
          selected.className = 'motion-board-filter-selected';
          group.append(selected);
          document.body.append(group);
          const style = getComputedStyle(selected);
          return {
            name: style.animationName,
            duration: Number.parseFloat(style.animationDuration) || 0,
          };
        });
        check.boardFilterFeedback = boardFilterMotion.name === 'motion-board-filter-selected'
          && boardFilterMotion.duration >= .17 && boardFilterMotion.duration <= .23;
        const duelMotionState = await homePage.evaluate(() => {
          const make = (groupClass, feedbackClass) => {
            const group = document.createElement('div');
            group.className = groupClass;
            const button = document.createElement('button');
            button.className = feedbackClass;
            group.append(button);
            document.body.append(group);
            const style = getComputedStyle(button);
            return {
              name: style.animationName,
              duration: Number.parseFloat(style.animationDuration) || 0,
            };
          };
          return {
            mode: make('duel-modes', 'motion-duel-mode-selected'),
            options: make('duel-seg', 'motion-duel-option-selected'),
            subjects: make('duel-subject-picks', 'motion-duel-option-selected'),
          };
        });
        check.duelModeFeedback = duelMotionState.mode.name === 'motion-duel-choice-pop'
          && duelMotionState.mode.duration >= .18 && duelMotionState.mode.duration <= .24;
        check.duelOptionFeedback = duelMotionState.options.name === 'motion-duel-choice-pop'
          && duelMotionState.subjects.name === 'motion-duel-choice-pop'
          && duelMotionState.options.duration >= .18 && duelMotionState.options.duration <= .24;
        const duelResultTitleMotion = await homePage.evaluate(() => {
          const title = document.createElement('h2');
          title.className = 'duel-result-heading motion-duel-result-title-enter';
          document.body.append(title);
          const style = getComputedStyle(title);
          return {
            name: style.animationName,
            duration: Number.parseFloat(style.animationDuration) || 0,
          };
        });
        check.duelResultHeading = duelResultTitleMotion.name === 'motion-duel-result-title-arrive'
          && duelResultTitleMotion.duration >= .20 && duelResultTitleMotion.duration <= .25;
        const adminSectionMotion = await homePage.evaluate(() => {
          const body = document.createElement('div');
          body.className = 'adm-body motion-admin-section-enter';
          document.body.append(body);
          const style = getComputedStyle(body);
          return {
            name: style.animationName,
            duration: Number.parseFloat(style.animationDuration) || 0,
          };
        });
        check.adminSectionMotion = adminSectionMotion.name === 'motion-admin-section-enter'
          && adminSectionMotion.duration >= .20 && adminSectionMotion.duration <= .25;
        const noteStudyMotion = await homePage.evaluate(() => {
          const button = document.createElement('button');
          button.id = 'motion-note-study-test';
          button.className = 'motion-note-study-toggle';
          const icon = document.createElement('span');
          icon.className = 'icon';
          button.append(icon);
          document.body.append(button);
          const style = getComputedStyle(icon);
          return {
            name: style.animationName,
            duration: Number.parseFloat(style.animationDuration) || 0,
          };
        });
        check.noteStudyFeedback = noteStudyMotion.name === 'motion-note-study-icon-pop'
          && noteStudyMotion.duration >= .21 && noteStudyMotion.duration <= .27;
        const profileStatusMotion = await homePage.evaluate(() => {
          const status = document.createElement('span');
          status.className = 'cz-status motion-profile-status-change';
          status.dataset.state = 'saved';
          status.textContent = 'All changes saved';
          document.body.append(status);
          const style = getComputedStyle(status);
          return {
            name: style.animationName,
            duration: Number.parseFloat(style.animationDuration) || 0,
          };
        });
        check.profileStatusMotion = profileStatusMotion.name === 'motion-profile-status-change'
          && profileStatusMotion.duration >= .17 && profileStatusMotion.duration <= .23;
        const appearanceModeMotion = await homePage.evaluate(() => {
          const button = document.createElement('button');
          button.className = 'mode-seg motion-profile-mode-selected';
          document.body.append(button);
          const style = getComputedStyle(button);
          return {
            name: style.animationName,
            duration: Number.parseFloat(style.animationDuration) || 0,
          };
        });
        check.appearanceModeFeedback = appearanceModeMotion.name === 'motion-profile-mode-selected'
          && appearanceModeMotion.duration >= .18 && appearanceModeMotion.duration <= .23;
        const liveListMotion = await homePage.evaluate(() => {
          const classes = [
            'achievement-overview', 'achievement-group', 'achievement-item',
            'challenge-item', 'daily-gem-rewards', 'daily-gem-day',
            'shop-group', 'gem-store', 'gem-item', 'leaderboard',
            'activity', 'profile-card', 'duel-card', 'duel-pane',
            'board-list', 'activity-list', 'duel-open'
          ];
          const list = classes.map(className => {
            const node = document.createElement('div');
            node.className = className;
            document.body.append(node);
            return getComputedStyle(node).animationName;
          });
          const earned = document.createElement('article');
          earned.className = 'achievement-item is-newly-earned';
          const earnedIcon = document.createElement('span');
          earnedIcon.className = 'achievement-icon';
          earned.append(earnedIcon);
          document.body.append(earned);
          const completed = document.createElement('article');
          completed.className = 'challenge-item is-just-completed';
          const completedIcon = document.createElement('span');
          completedIcon.className = 'challenge-icon';
          completed.append(completedIcon);
          document.body.append(completed);
          return {
            list,
            earned: getComputedStyle(earnedIcon).animationName,
            completed: getComputedStyle(completedIcon).animationName,
          };
        });
        check.repeatEntrySuppressed = liveListMotion.list.every(name => name === 'none');
        check.targetedRewardMotionPreserved = liveListMotion.earned === 'motion-reward-pop'
          && liveListMotion.completed === 'motion-challenge-complete-pop';
        const duelAnswerMotion = await homePage.evaluate(() => {
          const make = state => {
            const button = document.createElement('button');
            button.className = 'option is-' + state;
            const group = document.createElement('div');
            group.className = 'duel-opts';
            group.append(button);
            document.body.append(group);
            const style = getComputedStyle(button);
            return {
              name: style.animationName,
              duration: Number.parseFloat(style.animationDuration) || 0,
            };
          };
          return { correct: make('correct'), wrong: make('wrong') };
        });
        check.duelAnswerFeedback = duelAnswerMotion.correct.name === 'motion-answer-feedback'
          && duelAnswerMotion.wrong.name === 'motion-answer-feedback'
          && duelAnswerMotion.correct.duration >= .21 && duelAnswerMotion.correct.duration <= .27
          && duelAnswerMotion.wrong.duration >= .21 && duelAnswerMotion.wrong.duration <= .27;
        const notesTopicMotion = await homePage.evaluate(() => {
          const sidebar = document.createElement('div');
          sidebar.id = 'notes-topic-motion-test';
          sidebar.id = 'notes-sidebar';
          const topic = document.createElement('button');
          topic.className = 'topic-item motion-note-topic-selected';
          sidebar.append(topic);
          document.body.append(sidebar);
          const style = getComputedStyle(topic);
          return {
            name: style.animationName,
            duration: Number.parseFloat(style.animationDuration) || 0,
          };
        });
        check.notesTopicFeedback = notesTopicMotion.name === 'motion-note-topic-selected'
          && notesTopicMotion.duration >= .17 && notesTopicMotion.duration <= .23;
        const noteContentMotion = await homePage.evaluate(() => {
          const activeBody = document.createElement('div');
          activeBody.className = 'motion-note-content-enter';
          const activeSection = document.createElement('section');
          activeSection.className = 'note-section';
          activeBody.append(activeSection);
          const quietBody = document.createElement('div');
          const quietSection = document.createElement('section');
          quietSection.className = 'note-section';
          quietBody.append(quietSection);
          document.body.append(activeBody, quietBody);
          return {
            active: getComputedStyle(activeSection).animationName,
            quiet: getComputedStyle(quietSection).animationName,
          };
        });
        check.noteContentEntrance = noteContentMotion.active === 'motion-learning-rise'
          && noteContentMotion.quiet === 'none';
        const noteFontMotion = await homePage.evaluate(() => {
          const button = document.createElement('button');
          button.dataset.font = 'lg';
          button.className = 'motion-note-font-selected';
          document.body.append(button);
          const style = getComputedStyle(button);
          return {
            name: style.animationName,
            duration: Number.parseFloat(style.animationDuration) || 0,
          };
        });
        check.noteFontFeedback = noteFontMotion.name === 'motion-note-font-selected'
          && noteFontMotion.duration >= .16 && noteFontMotion.duration <= .21;
        const noteSubjectMotion = await homePage.evaluate(() => {
          const button = document.createElement('button');
          button.dataset.notesSub = 'maths';
          button.className = 'motion-note-subject-selected';
          const toolbar = document.createElement('div');
          toolbar.className = 'toolbar';
          toolbar.append(button);
          document.body.append(toolbar);
          const style = getComputedStyle(button);
          return {
            name: style.animationName,
            duration: Number.parseFloat(style.animationDuration) || 0,
          };
        });
        check.noteSubjectFeedback = noteSubjectMotion.name === 'motion-note-subject-selected'
          && noteSubjectMotion.duration >= .17 && noteSubjectMotion.duration <= .23;
        const noteLevelMotion = await homePage.evaluate(() => {
          const chip = document.createElement('button');
          chip.className = 'chip motion-note-level-selected';
          chip.dataset.level = 'jhs2';
          document.body.append(chip);
          const style = getComputedStyle(chip);
          return {
            name: style.animationName,
            duration: Number.parseFloat(style.animationDuration) || 0,
          };
        });
        check.noteLevelFeedback = noteLevelMotion.name === 'motion-note-level-selected'
          && noteLevelMotion.duration >= .17 && noteLevelMotion.duration <= .23;
        await homePage.emulateMedia({ reducedMotion: 'reduce' });
        check.challengeCompletionReducedMotion = await homePage.evaluate(() => {
          const item = document.querySelector('#motion-challenge-complete-test');
          const icon = item?.querySelector('.challenge-icon');
          const reward = item?.querySelector('.challenge-reward');
          return !!icon && !!reward
            && getComputedStyle(icon).animationName === 'none'
            && getComputedStyle(reward).animationName === 'none';
        });
        check.newAchievementReducedMotion = await homePage.evaluate(() => {
          const icon = document.querySelector('.achievement-item.is-newly-earned .achievement-icon');
          return !!icon && getComputedStyle(icon).animationName === 'none';
        });
        check.bookmarkReducedMotion = await homePage.evaluate(() => {
          const icons = [
            document.querySelector('#motion-bookmark-save-test .icon'),
            document.querySelector('#motion-bookmark-remove-test .icon')
          ];
          return icons.every(icon => icon && getComputedStyle(icon).animationName === 'none');
        });
        check.boardFilterReducedMotion = await homePage.evaluate(() => {
          const button = document.querySelector('.board-seg button.motion-board-filter-selected');
          return !!button && getComputedStyle(button).animationName === 'none';
        });
        check.duelReducedMotion = await homePage.evaluate(() => {
          const buttons = [
            document.querySelector('.duel-modes button.motion-duel-mode-selected'),
            document.querySelector('.duel-seg button.motion-duel-option-selected'),
            document.querySelector('.duel-subject-picks > button.motion-duel-option-selected')
          ];
          return buttons.every(button => button && getComputedStyle(button).animationName === 'none');
        });
        check.duelAnswerReducedMotion = await homePage.evaluate(() => {
          const buttons = [
            ...document.querySelectorAll('.duel-opts > .option.is-correct, .duel-opts > .option.is-wrong')
          ];
          return buttons.length === 2 && buttons.every(button => getComputedStyle(button).animationName === 'none');
        });
        check.notesTopicReducedMotion = await homePage.evaluate(() => {
          const topic = document.querySelector('#notes-sidebar .topic-item.motion-note-topic-selected');
          return !!topic && getComputedStyle(topic).animationName === 'none';
        });
        check.noteContentReducedMotion = await homePage.evaluate(() => {
          const section = document.querySelector('.motion-note-content-enter > .note-section');
          return !!section && getComputedStyle(section).animationName === 'none';
        });
        check.noteFontReducedMotion = await homePage.evaluate(() => {
          const button = document.querySelector('[data-font].motion-note-font-selected');
          return !!button && getComputedStyle(button).animationName === 'none';
        });
        check.noteSubjectReducedMotion = await homePage.evaluate(() => {
          const button = document.querySelector('.toolbar [data-notes-sub].motion-note-subject-selected');
          return !!button && getComputedStyle(button).animationName === 'none';
        });
        check.noteLevelReducedMotion = await homePage.evaluate(() => {
          const chip = document.querySelector('.chip[data-level].motion-note-level-selected');
          return !!chip && getComputedStyle(chip).animationName === 'none';
        });
        check.duelResultReducedMotion = await homePage.evaluate(() => {
          const title = document.querySelector('.duel-result-heading.motion-duel-result-title-enter');
          return !!title && getComputedStyle(title).animationName === 'none';
        });
        check.adminSectionReducedMotion = await homePage.evaluate(() => {
          const body = document.querySelector('.adm-body.motion-admin-section-enter');
          return !!body && getComputedStyle(body).animationName === 'none';
        });
        check.noteStudyReducedMotion = await homePage.evaluate(() => {
          const icon = document.querySelector('#motion-note-study-test .icon');
          return !!icon && getComputedStyle(icon).animationName === 'none';
        });
        check.profileStatusReducedMotion = await homePage.evaluate(() => {
          const status = document.querySelector('.cz-status.motion-profile-status-change');
          return !!status && getComputedStyle(status).animationName === 'none';
        });
        check.appearanceModeReducedMotion = await homePage.evaluate(() => {
          const button = document.querySelector('.mode-seg.motion-profile-mode-selected');
          return !!button && getComputedStyle(button).animationName === 'none';
        });
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
