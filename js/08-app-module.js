
const App = window.App, o = App.el, $ = id => document.getElementById(id);
const LVL = 200;
const SUBJ = { soc: 'Social Studies', art: 'Creative Arts', mat: 'Mathematics', com: 'Computing', rme: 'Religious & Moral Education', sci: 'Integrated Science', fre: 'French', 'ct-': 'Career Technology' };
const today = () => new Date().toISOString().slice(0, 10);
const weekStart = () => { const d = new Date(), k = (d.getUTCDay() + 6) % 7; return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - k)).toISOString().slice(0, 10); };
const yesterday = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const lv = e => ({ level: Math.floor(e / LVL) + 1, into: e % LVL });
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const ago = t => { const s = Math.max(0, (Date.now() - t) / 1e3); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago`; };
const S = { board: 'day', db: null, user: null, uid: null, doc: null, players: [], names: {}, ready: false, admins: new Set(), badgeMap: new Map(), adminAt: 0, pinFails: 0, pinLock: 0, bans: new Map(), isAdmin: false, banned: false, ann: null };

function view() { // the signed-in player's stats as the UI expects them
  const d = S.doc; if (!d) return null;
  return { displayName: nameOf(S.uid), totalExp: d.totalExp || 0, streak: d.lastDay === today() || d.lastDay === yesterday() ? d.streak || 0 : 0, bestStreak: d.bestStreak || 0, activeToday: d.lastDay === today(), };
}
function nameOf(id) { const p = S.players.find(x => x.id === id); const d = id === S.uid ? S.doc : p; return (d && d.displayName) || S.names[id] || (id === S.uid ? 'You' : 'Player'); }
async function loadNames() {
  if (!S.user) return;
  try { const ps = await S.user.profiles([...new Set([S.uid, ...S.players.map(p => p.id)])]); for (const id in ps) if (ps[id].name) S.names[id] = ps[id].name; } catch {}
}

const rewardCounterAnimations = new WeakMap();
const rewardFlightQueues = new Map();
const rewardFlightBusy = new Set();
let rewardFlightSequence = 0;
const REWARD_FLIGHT_LAYER_ID = 'bece-reward-flight-layer';
let dailyGemClaimFeedback = false;
let dailyCoinClaimFeedback = false;
let achievementGemClaimFeedbackId = '';
let dailyChallengeCompletionFeedback = new Set();
const dailyChallengeProgressSnapshot = new Map();
let dailyChallengeProgressUid = '', dailyChallengeProgressDay = '', dailyChallengeProgressReady = false;
let newlyEarnedAchievementFeedback = new Set();
const achievementProgressSnapshot = new Map();
let achievementProgressUid = '';

function captureRewardRect(element) {
  if (!element || typeof element.getBoundingClientRect !== 'function') return null;
  const rect = element.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}
function rewardMotionReduced() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function rewardNumber(value) {
  return Math.max(0, Math.round(Number(value) || 0)).toLocaleString('en-US');
}
function rewardAnimationDuration(from, to) {
  const delta = Math.abs((Number(to) || 0) - (Number(from) || 0));
  return Math.min(5200, Math.round(1900 + Math.log10(delta + 1) * 900));
}
function rewardCurrencyDuration(from, to) {
  const delta = Math.abs((Number(to) || 0) - (Number(from) || 0));
  return Math.min(1900, Math.round(1450 + Math.log10(delta + 1) * 140));
}
function animateRewardNumber(element, from, to, formatter, duration) {
  if (!element) return;
  const previous = rewardCounterAnimations.get(element);
  if (previous) {
    if (previous.frame) cancelAnimationFrame(previous.frame);
    if (previous.onAnimationEnd) element.removeEventListener('animationend', previous.onAnimationEnd);
  }
  rewardCounterAnimations.delete(element);
  element.classList.remove('reward-count-pop');

  const startValue = Number(from) || 0;
  const endValue = Number(to) || 0;
  const format = formatter || (value => rewardNumber(value));
  const animationDuration = Number(duration) > 0 ? Number(duration) : rewardAnimationDuration(startValue, endValue);
  if (rewardMotionReduced() || startValue === endValue) {
    element.textContent = format(endValue);
    return;
  }

  const state = { frame: 0, onAnimationEnd: null };
  rewardCounterAnimations.set(element, state);
  element.textContent = format(startValue);

  const startedAt = performance.now();
  const tick = now => {
    if (rewardCounterAnimations.get(element) !== state) return;
    if (!element.isConnected) {
      rewardCounterAnimations.delete(element);
      return;
    }
    const progress = Math.min(1, Math.max(0, (now - startedAt) / animationDuration));
    const eased = progress * progress * (3 - 2 * progress);
    const value = Math.round(startValue + (endValue - startValue) * eased);
    element.textContent = format(value);
    if (progress < 1) {
      state.frame = requestAnimationFrame(tick);
      return;
    }

    state.frame = 0;
    element.textContent = format(endValue);
    element.classList.remove('reward-count-pop');
    void element.offsetWidth;
    element.classList.add('reward-count-pop');
    state.onAnimationEnd = event => {
      if (event.animationName !== 'reward-count-pop') return;
      element.classList.remove('reward-count-pop');
      element.removeEventListener('animationend', state.onAnimationEnd);
      if (rewardCounterAnimations.get(element) === state) rewardCounterAnimations.delete(element);
    };
    element.addEventListener('animationend', state.onAnimationEnd);
  };
  state.frame = requestAnimationFrame(tick);
}
function rewardViewportSize() {
  // getBoundingClientRect() and fixed-position overlays share the layout viewport.
  // Avoid visualViewport width/height here: they can diverge during mobile browser chrome changes.
  return {
    width: Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1),
    height: Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1)
  };
}
function visibleInViewport(rect) {
  if (!rect) return false;
  const viewport = rewardViewportSize();
  return rect.left + rect.width > 0 && rect.top + rect.height > 0
    && rect.left < viewport.width && rect.top < viewport.height;
}
function rewardElementVisible(element) {
  if (!element || !element.isConnected) return false;
  const rect = captureRewardRect(element);
  if (!visibleInViewport(rect)) return false;
  if (typeof window.getComputedStyle === 'function') {
    for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < .02) return false;
    }
  }
  return true;
}
function getRewardFlightLayer() {
  let layer = document.getElementById(REWARD_FLIGHT_LAYER_ID);
  if (!layer) {
    layer = document.createElement('div');
    layer.id = REWARD_FLIGHT_LAYER_ID;
    layer.className = 'reward-flight-layer';
    layer.setAttribute('aria-hidden', 'true');
  }
  // Keep it outside body/scroll containers so mobile transforms and overflow cannot clip the coin.
  if (layer.parentElement !== document.documentElement) document.documentElement.append(layer);
  return layer;
}
function resolveRewardFlightTarget(kind, preferredTarget) {
  if (rewardElementVisible(preferredTarget)) return preferredTarget;
  const selectors = kind === 'gems'
    ? '.quiz-wallet-gems, .account-gems, .daily-gem-balance, .gem-store-balance'
    : '.quiz-wallet-coins, .account-coins:not(.account-gems), .coin-bal-value';
  for (const element of document.querySelectorAll(selectors)) {
    if (rewardElementVisible(element)) return element;
  }
  const account = document.getElementById('account-btn');
  return rewardElementVisible(account) ? account : null;
}
function rewardPoint(rect, fallback, inset, viewport) {
  const rawX = rect && Number.isFinite(rect.left) ? rect.left + rect.width / 2 : fallback.x;
  const rawY = rect && Number.isFinite(rect.top) ? rect.top + rect.height / 2 : fallback.y;
  return {
    x: Math.min(viewport.width - inset, Math.max(inset, rawX)),
    y: Math.min(viewport.height - inset, Math.max(inset, rawY))
  };
}
function runRewardFlight(item) {
  return new Promise(resolve => {
    const viewport = rewardViewportSize();
    const mobile = typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
    const isCoin = item.kind === 'coins';
    const size = isCoin ? (mobile ? 20 : 22) : (mobile ? 36 : 42);
    const inset = Math.min(Math.max(16, size / 2 + 3), Math.min(viewport.width, viewport.height) / 2);
    const sourceElement = document.activeElement;
    const sourceRect = item.sourceRect || (rewardElementVisible(sourceElement) ? captureRewardRect(sourceElement) : null);
    const target = resolveRewardFlightTarget(item.kind, item.target);
    const targetRect = captureRewardRect(target);
    const start = rewardPoint(sourceRect, { x: viewport.width * .5, y: viewport.height * .72 }, inset, viewport);
    const finish = rewardPoint(targetRect, { x: viewport.width - inset - 4, y: Math.max(inset, 28) }, inset, viewport);
    let dx = finish.x - start.x;
    let dy = finish.y - start.y;
    if (Math.hypot(dx, dy) < 24) {
      finish.y = Math.max(inset, finish.y - 28);
      dx = finish.x - start.x;
      dy = finish.y - start.y;
    }

    // A reward is a little burst, not one oversized coin. Larger coin rewards
    // send a few more particles, while Gems keep one clear, recognisable shape.
    const particleCount = isCoin
      ? Math.min(7, Math.max(3, Math.ceil(Math.sqrt(Math.max(1, Number(item.amount) || 1)))))
      : 1;
    const samples = [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1];
    const scales = isCoin
      ? [.72, .9, 1.04, 1.1, 1.08, 1.03, .98, .94, .9, .84, .76]
      : [.9, .98, 1.04, 1.08, 1.1, 1.08, 1.04, .99, .93, .86, .78];
    const duration = isCoin ? (mobile ? 2300 : 2200) : (mobile ? 2500 : 2400);
    const stagger = isCoin ? (mobile ? 180 : 160) : 0;
    const clampX = value => Math.min(viewport.width - inset, Math.max(inset, value));
    const clampY = value => Math.min(viewport.height - inset, Math.max(inset, value));
    const parts = [];
    let layer;

    try {
      layer = getRewardFlightLayer();
      for (let index = 0; index < particleCount; index++) {
        const angle = particleCount === 1 ? 0 : (index / particleCount) * Math.PI * 2;
        const sourceOffset = isCoin
          ? { x: Math.cos(angle) * 11, y: Math.sin(angle) * 9 }
          : { x: 0, y: 0 };
        const targetOffset = isCoin
          ? { x: Math.cos(angle) * 3, y: Math.sin(angle) * 3 }
          : { x: 0, y: 0 };
        const p0 = { x: clampX(start.x + sourceOffset.x), y: clampY(start.y + sourceOffset.y) };
        const p3 = { x: clampX(finish.x + targetOffset.x), y: clampY(finish.y + targetOffset.y) };
        const partDx = p3.x - p0.x;
        const partDy = p3.y - p0.y;
        const side = partDx >= 0 ? 1 : -1;
        const arc = Math.min(mobile ? 54 : 70, Math.max(18, Math.hypot(partDx, partDy) * .1));
        const p1 = {
          x: clampX(p0.x + partDx * .27 + side * (mobile ? 7 : 10)),
          y: clampY(p0.y + partDy * .24 - arc)
        };
        const p2 = {
          x: clampX(p0.x + partDx * .73 - side * (mobile ? 6 : 8)),
          y: clampY(p0.y + partDy * .76 - arc * .48)
        };
        const rotation = isCoin ? (index % 2 ? -420 : 420) : 38;
        const keyframes = samples.map((t, frameIndex) => {
          const inverse = 1 - t;
          const x = inverse * inverse * inverse * p0.x
            + 3 * inverse * inverse * t * p1.x
            + 3 * inverse * t * t * p2.x
            + t * t * t * p3.x;
          const y = inverse * inverse * inverse * p0.y
            + 3 * inverse * inverse * t * p1.y
            + 3 * inverse * t * t * p2.y
            + t * t * t * p3.y;
          return {
            offset: t,
            transform: 'translate3d(' + (x - p0.x) + 'px,' + (y - p0.y) + 'px,0) rotate('
              + (rotation * t) + 'deg) scale(' + scales[frameIndex] + ')',
            opacity: t < .82 ? 1 : (t < .92 ? .9 : Math.max(0, 1 - (t - .92) * 12.5))
          };
        });

        const token = o('span', 'reward-flight-token reward-flight-token-' + item.kind
          + (isCoin ? ' reward-flight-token-particle' : ''));
        token.setAttribute('aria-hidden', 'true');
        token.dataset.rewardBurst = String(item.sequence || 0);
        // The regular Gem SVG uses a hard-coded blue stroke. Draw flying Gems with CSS facets instead.
        token.append(isCoin ? App.icon('coin', 'reward-flight-icon') : o('span', 'reward-flight-gem-facets'));
        token.style.left = (p0.x - size / 2) + 'px';
        token.style.top = (p0.y - size / 2) + 'px';
        token.style.width = size + 'px';
        token.style.height = size + 'px';
        token.style.transform = keyframes[0].transform;
        token.style.opacity = '1';
        layer.append(token);
        parts.push({ token, keyframes, delay: index * stagger, done: false });
      }
    } catch {
      parts.forEach(part => part.token.remove());
      resolve();
      return;
    }

    let settled = false;
    let cleanupTimer = 0;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      if (cleanupTimer) window.clearTimeout(cleanupTimer);
      parts.forEach(part => { if (part.token.isConnected) part.token.remove(); });
      resolve();
    };
    const finishPart = part => {
      if (part.done) return;
      part.done = true;
      if (part.token.isConnected) part.token.remove();
      if (parts.every(candidate => candidate.done)) cleanup();
    };

    try {
      if (parts.every(part => typeof part.token.animate === 'function')) {
        parts.forEach(part => {
          const animation = part.token.animate(part.keyframes, {
            duration,
            delay: part.delay,
            easing: 'cubic-bezier(.2,.72,.24,1)',
            fill: 'both'
          });
          animation.onfinish = () => finishPart(part);
          animation.oncancel = () => finishPart(part);
        });
        cleanupTimer = window.setTimeout(cleanup, duration + stagger * (particleCount - 1) + 420);
      } else {
        // Older mobile browsers keep the same staggered burst with CSS transitions.
        parts.forEach(part => {
          window.setTimeout(() => {
            requestAnimationFrame(() => {
              if (!part.token.isConnected) return;
              part.token.style.transition = 'transform ' + duration + 'ms cubic-bezier(.2,.72,.24,1), opacity 220ms linear ' + (duration - 220) + 'ms';
              part.token.style.transform = part.keyframes[part.keyframes.length - 1].transform;
              part.token.style.opacity = '0';
            });
          }, part.delay);
        });
        cleanupTimer = window.setTimeout(cleanup, duration + stagger * (particleCount - 1) + 320);
      }
    } catch {
      cleanup();
    }
  });
}
function startNextRewardFlight(kind) {
  const queue = rewardFlightQueues.get(kind);
  if (!queue || !queue.length || rewardFlightBusy.has(kind)) return;
  rewardFlightBusy.add(kind);
  const item = queue.shift();
  runRewardFlight(item).finally(() => {
    window.setTimeout(() => {
      rewardFlightBusy.delete(kind);
      startNextRewardFlight(kind);
    }, 100);
  });
}
function animateRewardFlight(sourceRect, target, kind, duration, amount) {
  if (rewardMotionReduced()) return;
  if (!rewardFlightQueues.has(kind)) rewardFlightQueues.set(kind, []);
  // Queue each confirmed reward; never cancel a coin that is already on its way.
  rewardFlightQueues.get(kind).push({
    sourceRect, target, kind, duration,
    amount: Math.max(0, Number(amount) || 0),
    sequence: ++rewardFlightSequence
  });
  startNextRewardFlight(kind);
}
function formatRewardCounter(element, kind, value) {
  const number = rewardNumber(value);
  const numberOnly = element.classList.contains('coin-bal-value')
    || element.classList.contains('achievement-gem-balance-value');
  if (numberOnly) return number;
  if (element.classList.contains('quiz-wallet-coins') || element.classList.contains('quiz-wallet-gems')) return number;
  return (kind === 'gems' ? '💎 ' : '💰 ') + number;
}
function animateCurrencyReward(kind, previous, balance, sourceRect, preferredTarget) {
  const isGem = kind === 'gems';
  const from = Math.max(0, Number(previous) || 0);
  const to = Math.max(0, Number(balance) || 0);
  const countDuration = rewardCurrencyDuration(from, to);
  const selectors = isGem
    ? '.quiz-wallet-gems, .account-gems, .daily-gem-balance, .gem-store-balance'
    : '.quiz-wallet-coins, .account-coins:not(.account-gems), .coin-bal-value';
  const targets = [...new Set([
    ...document.querySelectorAll(selectors),
    ...(preferredTarget ? [preferredTarget] : [])
  ])].filter(element => captureRewardRect(element));
  const visibleTargets = targets.filter(rewardElementVisible);
  const preferredVisible = preferredTarget && visibleTargets.includes(preferredTarget) ? preferredTarget : null;
  const accountTarget = visibleTargets.find(element =>
    isGem ? element.classList.contains('account-gems') : element.classList.contains('account-coins')
  );
  const balanceTarget = preferredVisible || accountTarget || visibleTargets[0] || null;

  targets.forEach(element => {
    const formatter = value => formatRewardCounter(element, kind, value);
    if (element === balanceTarget) animateRewardNumber(element, from, to, formatter, countDuration);
    else animateRewardNumber(element, to, to, formatter, 0);
  });

  const origin = sourceRect || captureRewardRect(document.activeElement)
    || { left: window.innerWidth * .42, top: window.innerHeight * .68, width: 32, height: 32 };
  if (to > from) animateRewardFlight(origin, balanceTarget, kind, countDuration, to - from);
}
window.animateCurrencyReward = animateCurrencyReward;

function updateQuizRewardWallet() {
  const wallet = $('quiz-reward-wallet');
  if (!wallet) return;
  const ready = !!(S.db && S.doc && S.uid);
  wallet.hidden = !ready;
  if (!ready) return;
  const coins = $('quiz-wallet-coins-value');
  const gems = $('quiz-wallet-gems-value');
  if (coins) coins.textContent = rewardNumber(S.doc.coins || 0);
  if (gems) gems.textContent = rewardNumber(S.doc.gems || 0);
}

function renderAccount() {
  updateQuizRewardWallet();
  if (window.BeceProfile && S.doc && S.doc.color && BeceProfile.parse(S.doc.color).key !== BeceProfile.accent) BeceProfile.applyAccent(S.doc.color);
  const e = $('account-btn'); e.replaceChildren(); const m = view();
  if (!S.db) { e.append(o('span', 'account-name', 'Offline')); e.onclick = () => App.navigate('friends'); return; }
  if (!m) { e.append(o('span', 'account-name', 'Friends')); e.onclick = () => App.navigate('friends'); return; }
  if (S.doc && S.doc.photo) {
    const w = o('span', 'account-ph'), im = document.createElement('img'); im.className = 'account-photo'; im.alt = ''; im.src = S.doc.photo; w.append(im);
    if (S.doc.avatar) {
      const badge = o('span', 'account-badge');
      setAvatarGlyph(badge, BeceProfile.safeAv(S.doc.avatar));
      w.append(badge);
    }
    e.append(w);
  } else if (S.doc && S.doc.avatar) {
    const avatar = o('span', 'account-avatar');
    setAvatarGlyph(avatar, BeceProfile.safeAv(S.doc.avatar));
    e.append(avatar);
  }
  const coinShortcut = o('span', 'account-coins account-currency-shortcut', `💰 ${S.doc.coins || 0}`);
  coinShortcut.setAttribute('role', 'link'); coinShortcut.tabIndex = 0; coinShortcut.title = 'Open Coin Shop'; coinShortcut.setAttribute('aria-label', 'Open Coin Shop');
  const openCoinShop = event => { event.preventDefault(); event.stopPropagation(); App.navigate('shop'); };
  coinShortcut.addEventListener('click', openCoinShop);
  coinShortcut.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') openCoinShop(event); });
  const gemShortcut = o('span', 'account-coins account-gems account-currency-shortcut', `💎 ${Math.max(0, Number(S.doc.gems) || 0)}`);
  gemShortcut.setAttribute('role', 'link'); gemShortcut.tabIndex = 0; gemShortcut.title = 'Open Gem Shop'; gemShortcut.setAttribute('aria-label', 'Open Gem Shop');
  const openGemShop = event => { event.preventDefault(); event.stopPropagation(); App.navigate('gemshop'); };
  gemShortcut.addEventListener('click', openGemShop);
  gemShortcut.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') openGemShop(event); });
  e.append(o('span', 'account-level', `Lv ${lv(m.totalExp).level}`), o('span', 'account-name', m.displayName), coinShortcut, gemShortcut, o('span', 'account-exp', `${m.totalExp} EXP`));
  if (m.streak) e.append(o('span', 'account-streak', `\u{1F525} ${m.streak}`));
  e.setAttribute('aria-label', `${m.displayName}, level ${lv(m.totalExp).level}, ${m.totalExp} EXP, ${S.doc.coins || 0} coins, ${Math.max(0, Number(S.doc.gems) || 0)} Gems. Open your profile`);
  e.onclick = () => App.navigate('me');
}
const CHALLENGE_POOL = (() => {
  const groups = [
    ['answered', [5,  8, 10, 12, 15, 20, 25], 'Question explorer', n => 'Answer ' + n + ' questions in your practice sessions', '✍️'],
    ['correct', [3, 5, 8, 10, 12, 15, 20], 'Accuracy builder', n => 'Get ' + n + ' answers correct', '🎯'],
    ['quizzes', [1, 2, 3, 4], 'Keep the momentum', n => 'Finish ' + n + ' practice ' + (n === 1 ? 'quiz' : 'quizzes'), '🏁'],
    ['subjects', [2, 3, 4, 5], 'Subject explorer', n => 'Practise questions from ' + n + ' different subjects', '📚'],
    ['perfect', [1, 2, 3], 'Flawless round', n => 'Complete ' + n + ' quiz' + (n === 1 ? '' : 'zes') + ' with every answer correct', '⭐'],
    ['longQuiz', [1, 2, 3], 'Go the distance', n => 'Complete ' + n + ' quiz' + (n === 1 ? '' : 'zes') + ' with at least 10 questions', '🚀'],
    ['mixed', [1, 2, 3], 'Mix it up', n => 'Complete ' + n + ' quiz' + (n === 1 ? '' : 'zes') + ' covering 3 or more subjects', '🌈'],
    ['soc', [4, 6, 8, 10], 'Social Studies focus', n => 'Answer ' + n + ' Social Studies questions', '🌍'],
    ['art', [3, 5, 7, 9], 'Creative mind', n => 'Answer ' + n + ' Creative Arts questions', '🎨'],
    ['mat', [4, 6, 8, 10, 12], 'Maths practice', n => 'Answer ' + n + ' Mathematics questions', '➗'],
    ['com', [3, 5, 7, 9], 'Computing practice', n => 'Answer ' + n + ' Computing questions', '💻'],
    ['rme', [3, 5, 7, 9], 'Values in action', n => 'Answer ' + n + ' RME questions', '🤝'],
    ['sci', [3, 5, 7, 9, 12], 'Science explorer', n => 'Answer ' + n + ' Integrated Science questions', '🔬'],
    ['fre', [3, 5, 7, 9, 12], 'French basics', n => 'Answer ' + n + ' French questions', '🇫🇷'],
        ['ct', [3, 5, 7, 9, 12], 'Career Technology practice', n => 'Answer ' + n + ' Career Technology questions', '🛠️']
  ];
  const out = [];
  groups.forEach(([metric, targets, title, detail, icon]) => targets.forEach(target => {
    out.push({ id: metric + '-' + target, metric, target, title, detail: detail(target), icon, reward: 12 + Math.min(24, Math.ceil(target * 1.5)) });
  }));
  return out;
})();
function challengeHash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const DAILY_CHALLENGE_COIN_REWARD = 20;
function dailyChallengeSet(day) {
  const pool = CHALLENGE_POOL.slice();
  let seed = challengeHash('bece-challenges-' + day);
  for (let i = pool.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1); [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}
const ACHIEVEMENTS = [
  // Question milestones
  { id:'first-answer',icon:'🌱',title:'First Step',detail:'Answer your first question',metric:'answered',target:1,group:'Question milestones' },
  { id:'curious-mind',icon:'📖',title:'Curious Mind',detail:'Answer 25 questions',metric:'answered',target:25,group:'Question milestones' },
  { id:'question-pro',icon:'🧠',title:'Question Pro',detail:'Answer 100 questions',metric:'answered',target:100,group:'Question milestones' },
  { id:'question-veteran',icon:'📚',title:'Bookworm',detail:'Answer 250 questions',metric:'answered',target:250,group:'Question milestones' },
  { id:'question-master',icon:'🎓',title:'Knowledge Seeker',detail:'Answer 500 questions',metric:'answered',target:500,group:'Question milestones' },
  { id:'question-legend',icon:'🚀',title:'Question Legend',detail:'Answer 1,000 questions',metric:'answered',target:1000,group:'Question milestones' },
  { id:'question-1500',icon:'🌠',title:'Unstoppable Learner',detail:'Answer 1,500 questions',metric:'answered',target:1500,group:'Question milestones' },
  { id:'question-2500',icon:'🏛️',title:'Hall of Knowledge',detail:'Answer 2,500 questions',metric:'answered',target:2500,group:'Question milestones' },
  // Accuracy milestones
  { id:'getting-sharp',icon:'🎯',title:'Getting Sharp',detail:'Get 25 answers correct',metric:'correct',target:25,group:'Accuracy milestones' },
  { id:'high-score-90',icon:'💯',title:'Sharp Performance',detail:'Score at least 90% in a quiz',metric:'highScore',target:1,group:'Accuracy milestones' },
  { id:'accuracy-star',icon:'⭐',title:'Accuracy Star',detail:'Get 100 answers correct',metric:'correct',target:100,group:'Accuracy milestones' },
  { id:'accuracy-250',icon:'🥉',title:'Bronze Brain',detail:'Get 250 answers correct',metric:'correct',target:250,group:'Accuracy milestones' },
  { id:'accuracy-500',icon:'🥈',title:'Silver Scholar',detail:'Get 500 answers correct',metric:'correct',target:500,group:'Accuracy milestones' },
  { id:'accuracy-1000',icon:'🥇',title:'Golden Genius',detail:'Get 1,000 answers correct',metric:'correct',target:1000,group:'Accuracy milestones' },
  { id:'accuracy-2000',icon:'💡',title:'Bright Mind',detail:'Get 2,000 answers correct',metric:'correct',target:2000,group:'Accuracy milestones' },
  // Quiz milestones
  { id:'quiz-beginner',icon:'🏁',title:'Quiz Starter',detail:'Complete your first quiz',metric:'quizzes',target:1,group:'Quiz milestones' },
  { id:'quiz-five',icon:'📘',title:'Five Quizzes',detail:'Complete 5 quizzes',metric:'quizzes',target:5,group:'Quiz milestones' },
  { id:'quiz-regular',icon:'🔥',title:'Quiz Regular',detail:'Complete 10 quizzes',metric:'quizzes',target:10,group:'Quiz milestones' },
  { id:'quiz-25',icon:'🗓️',title:'Practice Habit',detail:'Complete 25 quizzes',metric:'quizzes',target:25,group:'Quiz milestones' },
  { id:'quiz-50',icon:'🎖️',title:'Dedicated Student',detail:'Complete 50 quizzes',metric:'quizzes',target:50,group:'Quiz milestones' },
  { id:'quiz-100',icon:'🏅',title:'Century Club',detail:'Complete 100 quizzes',metric:'quizzes',target:100,group:'Quiz milestones' },
  { id:'quiz-250',icon:'👑',title:'Quiz Champion',detail:'Complete 250 quizzes',metric:'quizzes',target:250,group:'Quiz milestones' },
  // Subject exploration
  { id:'subject-explorer',icon:'🧭',title:'Subject Explorer',detail:'Practise 3 different subjects',metric:'subjects',target:3,group:'Subject explorer' },
  { id:'all-rounder',icon:'🌍',title:'All-Rounder',detail:'Practise 5 different subjects',metric:'subjects',target:5,group:'Subject explorer' },
  { id:'all-six-subjects',icon:'🌐',title:'Complete Explorer',detail:'Practise six different subjects',metric:'subjects',target:6,group:'Subject explorer' },
  { id:'science-starter',icon:'🔬',title:'Science Starter',detail:'Answer 10 Integrated Science questions',metric:'sci',target:10,group:'Subject explorer' },
  { id:'science-scholar',icon:'🧪',title:'Science Scholar',detail:'Answer 50 Integrated Science questions',metric:'sci',target:50,group:'Subject explorer' },
  { id:'science-master',icon:'⚗️',title:'Science Master',detail:'Answer 100 Integrated Science questions',metric:'sci',target:100,group:'Subject explorer' },
  { id:'all-seven-subjects',icon:'🌍',title:'Seven-Subject Explorer',detail:'Practise all 7 available subjects',metric:'subjects',target:7,group:'Subject explorer' },
  { id:'french-starter',icon:'🇫🇷',title:'Bonjour!',detail:'Answer 10 French questions',metric:'fre',target:10,group:'Subject explorer' },
  { id:'french-learner',icon:'🗣️',title:'French Learner',detail:'Answer 50 French questions',metric:'fre',target:50,group:'Subject explorer' },
  { id:'french-confident',icon:'📘',title:'French Confidence',detail:'Answer 100 French questions',metric:'fre',target:100,group:'Subject explorer' },
  { id:'career-starter',icon:'🛠️',title:'Career Technology Starter',detail:'Answer 10 Career Technology questions',metric:'ct',target:10,group:'Subject explorer' },
  { id:'career-learner',icon:'📐',title:'Career Technology Learner',detail:'Answer 50 Career Technology questions',metric:'ct',target:50,group:'Subject explorer' },
  { id:'career-master',icon:'🏅',title:'Career Technology Master',detail:'Answer 100 Career Technology questions',metric:'ct',target:100,group:'Subject explorer' },
  { id:'all-nine-subjects',icon:'🌐',title:'Eight-Subject Explorer',detail:'Practise all 8 available subjects',metric:'subjects',target:8,group:'Subject explorer' },
  // Perfect quizzes
  { id:'perfect-round',icon:'💎',title:'Perfect Round',detail:'Finish a quiz with every answer correct',metric:'perfect',target:1,group:'Perfect quizzes' },
  { id:'perfect-5',icon:'✨',title:'Flawless Five',detail:'Complete 5 perfect quizzes',metric:'perfect',target:5,group:'Perfect quizzes' },
  { id:'perfect-10',icon:'💠',title:'Perfectionist',detail:'Complete 10 perfect quizzes',metric:'perfect',target:10,group:'Perfect quizzes' },
  { id:'perfect-25',icon:'🌟',title:'Perfect Performer',detail:'Complete 25 perfect quizzes',metric:'perfect',target:25,group:'Perfect quizzes' },
  // Study streaks
  { id:'three-day-streak',icon:'🔥',title:'On a Roll',detail:'Build a 3-day study streak',metric:'streak',target:3,group:'Study streaks' },
  { id:'week-streak',icon:'🏆',title:'A Full Week',detail:'Build a 7-day study streak',metric:'streak',target:7,group:'Study streaks' },
  { id:'streak-14',icon:'🌤️',title:'Two-Week Trail',detail:'Build a 14-day study streak',metric:'streak',target:14,group:'Study streaks' },
  { id:'streak-30',icon:'🌙',title:'Monthly Momentum',detail:'Build a 30-day study streak',metric:'streak',target:30,group:'Study streaks' },
  { id:'streak-60',icon:'☀️',title:'Consistency Star',detail:'Build a 60-day study streak',metric:'streak',target:60,group:'Study streaks' },
  { id:'streak-100',icon:'💫',title:'100-Day Legend',detail:'Build a 100-day study streak',metric:'streak',target:100,group:'Study streaks' },
  { id:'achievement-ten',icon:'🏆',title:'Achievement Collector',detail:'Earn 10 different achievements',metric:'achievementCount',target:10,group:'Special milestones' },
];
const GEM_ACHIEVEMENT_REWARDS = Object.freeze({
  'first-answer': 1,
  'curious-mind': 2,
  'question-pro': 3,
  'question-veteran': 5,
  'question-master': 7,
  'question-legend': 10,
  'question-1500': 13,
  'question-2500': 17,
  'getting-sharp': 2,
  'high-score-90': 3,
  'accuracy-star': 4,
  'accuracy-250': 6,
  'accuracy-500': 9,
  'accuracy-1000': 13,
  'accuracy-2000': 18,
  'quiz-beginner': 2,
  'quiz-five': 4,
  'quiz-regular': 6,
  'quiz-25': 9,
  'quiz-50': 13,
  'quiz-100': 17,
  'quiz-250': 22,
  'subject-explorer': 4,
  'all-rounder': 6,
  'all-six-subjects': 8,
  'science-starter': 3,
  'science-scholar': 6,
  'science-master': 10,
  'all-seven-subjects': 11,
  'french-starter': 3,
  'french-learner': 6,
  'french-confident': 10,
  'career-starter': 3,
  'career-learner': 6,
  'career-master': 10,
  'all-nine-subjects': 13,
  'perfect-round': 4,
  'perfect-5': 7,
  'perfect-10': 11,
  'perfect-25': 16,
  'three-day-streak': 4,
  'week-streak': 8,
  'streak-14': 13,
  'streak-30': 22,
  'streak-60': 35,
  'streak-100': 50,
  'achievement-ten': 10
});
function achievementValue(a, data, stats) {
  if (a.metric === 'subjects') return (Array.isArray(data.subjects) ? data.subjects.length : 0);
  if (a.metric === 'streak') return Number(S.doc && S.doc.streak || 0);
  if (a.metric === 'achievementCount') return Array.isArray(data.unlocked) ? data.unlocked.length : 0;
  return Number(stats[a.metric] || 0);
}
function renderAchievements() {
  const e = $('achievement-card'); if (!e) return;
  if (achievementProgressUid !== (S.uid || '')) {
    achievementProgressSnapshot.clear();
    achievementProgressUid = S.uid || '';
  }
  const data = S.doc && S.doc.achievements || {}, stats = data.stats || {};
  const unlocked = Array.isArray(data.unlocked) ? data.unlocked : [];
  const gemOps = Array.isArray(S.doc && S.doc.gemOps) ? S.doc.gemOps : [];
  const total = ACHIEVEMENTS.length;
  const overall = ACHIEVEMENTS.reduce((n,a) => n + (unlocked.includes(a.id) ? 1 : 0),0);
  e.replaceChildren();
  const top = o('div','achievement-overview');
  const overviewHead = o('div','achievement-overview-head');
  const count = o('div','achievement-total');
  count.append(o('strong','',overall + ' / ' + total),o('span','','achievements earned'));
  const gemBalance = o('div','achievement-gem-balance');
  gemBalance.append(o('span','achievement-gem-label','Your Gems'),
    o('strong','daily-gem-balance achievement-gem-balance-value',rewardNumber(S.doc && S.doc.gems || 0)));
  const track=o('div','achievement-overall-track'),fill=o('span','achievement-overall-fill');
  fill.style.transform='scaleX('+(overall/total)+')';track.append(fill);
  overviewHead.append(count,gemBalance);
  top.append(overviewHead,track);
  const groups = [...new Set(ACHIEVEMENTS.map(a=>a.group))];
  e.append(top);
  groups.forEach(group=>{
    const section=o('section','achievement-group');
    const heading=o('div','achievement-group-heading');
    const items=ACHIEVEMENTS.filter(a=>a.group===group);
    const groupEarned=items.filter(a=>unlocked.includes(a.id)).length;
    heading.append(o('h2','',group),o('span','',groupEarned+' / '+items.length+' earned'));
    const grid=o('div','achievement-grid');
    items.forEach(a=>{
      const value=achievementValue(a,data,stats), earned=unlocked.includes(a.id);
      const previousValue = achievementProgressSnapshot.get(a.id);
      const progressed = previousValue !== undefined && value > previousValue && !earned;
      const previousQuarter = previousValue === undefined ? 0 : Math.floor(Math.min(previousValue, a.target) * 4 / Math.max(1, a.target));
      const currentQuarter = Math.floor(Math.min(value, a.target) * 4 / Math.max(1, a.target));
      const crossedMilestone = progressed && currentQuarter > previousQuarter;
      const claimed = earned && gemOps.includes('achievement:' + a.id);
      const claimFeedback = claimed && achievementGemClaimFeedbackId === a.id;
      const newlyEarned = earned && newlyEarnedAchievementFeedback.has(a.id);
      const card=o('article','achievement-item'+(earned?' is-earned':'')+(newlyEarned?' is-newly-earned':'')+(claimFeedback?' is-gem-claim-confirmed':''));
      const main=o('div','achievement-main');
      const icon=o('span','achievement-icon' + (crossedMilestone ? ' motion-achievement-milestone' : ''),a.icon);
      const copy=o('div','achievement-copy');
      copy.append(o('strong','',a.title),o('small','',a.detail));
      main.append(icon,copy);
      const status=o('span','achievement-status',earned?'✓ Earned':Math.min(value,a.target)+' / '+a.target);
      const track=o('div','achievement-track'),bar=o('span','achievement-fill' + (progressed ? ' motion-achievement-progress' : ''));
      const fillTo = Math.min(value,a.target) / Math.max(1, a.target);
      if (progressed) {
        bar.style.setProperty('--achievement-progress-from', String(Math.min(previousValue,a.target) / Math.max(1,a.target)));
        bar.style.setProperty('--achievement-progress-to', String(fillTo));
      }
      bar.style.transform='scaleX(' + fillTo + ')';
      track.append(bar);
      achievementProgressSnapshot.set(a.id, value);
      card.append(main,status,track);
      const gemReward = GEM_ACHIEVEMENT_REWARDS[a.id];
      if (gemReward) {
        const rewardRow = o('div','achievement-reward-row');
        rewardRow.append(o('span','achievement-gem-reward','💎 ' + gemReward + ' Gems'));
        if (earned) {
          if (claimed) rewardRow.append(o('span','achievement-status'+(claimFeedback?' achievement-claim-confirmed':''),'✓ Gems claimed'));
          else {
            const claim = o('button','btn btn-primary btn-sm achievement-claim','Claim Gems');
            claim.type = 'button';
            claim.onclick = async () => {
              const sourceRect = captureRewardRect(rewardRow.querySelector('.achievement-gem-reward')) || captureRewardRect(claim);
              claim.disabled = true; claim.textContent = 'Claiming…';
              try {
                const result = await Gems.claimAchievement(a.id, sourceRect);
                App.toast(result.duplicate ? 'This Gem reward was already claimed.' : 'You earned ' + gemReward + ' Gems!', 'good');
              } catch (error) {
                App.toast(error && error.code === 'ACHIEVEMENT_NOT_READY' ? 'Complete this achievement first.' : 'Could not claim the Gem reward. Please try again.', 'warn');
                renderAchievements();
              }
            };
            rewardRow.append(claim);
          }
        } else rewardRow.append(o('span','achievement-status','Unlock to claim'));
        card.append(rewardRow);
      }
      grid.append(card);
    });
    section.append(heading,grid);e.append(section);
  });
}
globalThis.renderAchievements = renderAchievements;

async function claimDailyChallengeCoins(day, amount, sourceRect) {
  if (!S.db || !S.uid) throw new Error('SIGN_IN_REQUIRED');
  if (day !== today()) throw new Error('CHALLENGE_DAY_CHANGED');
  if (!Number.isSafeInteger(amount) || amount < 1) throw new Error('INVALID_CHALLENGE_COIN_REWARD');
  const tasks = dailyChallengeSet(day);
  if (tasks.length !== 3) throw new Error('INVALID_DAILY_CHALLENGES');
  const playerRef = S.db.doc('players/' + S.uid);
  let outcome = null;
  await S.db.runTransaction(async transaction => {
    const snapshot = await transaction.get(playerRef);
    if (!snapshot.exists) throw new Error('PLAYER_PROFILE_NOT_READY');
    const profile = snapshot.data() || {};
    const state = profile.challengeState;
    if (!state || state.day !== day || !Array.isArray(state.claimed)
        || !tasks.every(task => state.claimed.includes(task.id))) {
      throw new Error('DAILY_CHALLENGES_NOT_COMPLETE');
    }
    const currentCoins = Number(profile.coins || 0);
    if (!Number.isSafeInteger(currentCoins) || currentCoins < 0) throw new Error('INVALID_COIN_BALANCE');
    if (state.coinClaimed === true) {
      outcome = { balance: currentCoins, previous: currentCoins, added: 0, duplicate: true, state };
      return;
    }
    const balance = currentCoins + amount;
    if (!Number.isSafeInteger(balance)) throw new Error('COIN_BALANCE_LIMIT');
    const nextState = { ...state, coinClaimed: true };
    transaction.update(playerRef, { coins: balance, challengeState: nextState });
    outcome = { balance, previous: currentCoins, added: amount, duplicate: false, state: nextState };
  });
  if (!outcome) throw new Error('CHALLENGE_COIN_CLAIM_FAILED');
  S.doc = { ...(S.doc || {}), coins: outcome.balance, challengeState: outcome.state };
  const mine = (S.players || []).find(player => player.id === S.uid);
  if (mine) { mine.coins = outcome.balance; mine.challengeState = outcome.state; }
  dailyCoinClaimFeedback = outcome.added > 0 && !outcome.duplicate;
  try {
    renderAccount();
    renderDaily();
  } finally {
    dailyCoinClaimFeedback = false;
  }
  if (outcome.added > 0 && !outcome.duplicate) {
    animateCurrencyReward('coins', outcome.previous, outcome.balance, sourceRect);
  }
  return outcome;
}

function renderDaily() {
  const e = $('daily-card'); if (!e) return; e.replaceChildren();
  const d = S.doc || {}, day = today();
  if (dailyChallengeProgressUid !== (S.uid || '') || dailyChallengeProgressDay !== day) {
    dailyChallengeProgressSnapshot.clear();
    dailyChallengeProgressUid = S.uid || '';
    dailyChallengeProgressDay = day;
    dailyChallengeProgressReady = false;
  }
  const trackDailyProgress = !!(S.uid && S.doc);
  const state = d.challengeState && d.challengeState.day === day ? d.challengeState : { day, progress: {}, claimed: [] };
  const tasks = dailyChallengeSet(day), progressData = state.progress || {}, claimed = state.claimed || [];
  const done = tasks.filter(t => claimed.includes(t.id)).length;
  const head = o('div', 'challenge-heading'), info = o('div', 'daily-info');
  info.append(o('p', 'eyebrow', '3 fresh missions every day'), o('h2', '', 'Daily Challenges'));
  info.append(o('p', 'muted', CHALLENGE_POOL.length + ' possible missions. Your three are randomly selected each day. EXP is added automatically as you complete each mission.'));
  const summary = o('div', 'challenge-summary'); summary.append(o('strong', '', done + '/3'), o('span', '', 'completed'));
  head.append(info, summary);
  const list = o('div', 'challenge-list');
  tasks.forEach(t => {
    const complete = claimed.includes(t.id), current = Number(progressData[t.metric] || 0), progress = Math.min(t.target, current);
    const previousProgress = dailyChallengeProgressSnapshot.get(t.id);
    const progressed = trackDailyProgress && dailyChallengeProgressReady && Number.isFinite(previousProgress) && progress > previousProgress && !complete;
    const justCompleted = complete && dailyChallengeCompletionFeedback.has(t.id);
    const card = o('article', 'challenge-item' + (complete ? ' is-complete' : '') + (justCompleted ? ' is-just-completed' : ''));
    const top = o('div', 'challenge-top'), name = o('div', 'challenge-name'), copy = o('div');
    name.append(o('span', 'challenge-icon', t.icon)); copy.append(o('strong', '', t.title), o('small', '', t.detail)); name.append(copy);
    top.append(name, o('span', 'challenge-reward', complete ? '✓ EXP earned' : '+' + t.reward + ' EXP'));
    const track = o('div', 'challenge-track'), fill = o('span', 'challenge-fill' + (progressed ? ' motion-challenge-progress' : ''));
    const fillTo = progress / Math.max(1, t.target);
    if (progressed) {
      fill.style.setProperty('--challenge-progress-from', String(previousProgress / Math.max(1, t.target)));
      fill.style.setProperty('--challenge-progress-to', String(fillTo));
    }
    fill.style.transform = `scaleX(${fillTo})`; track.append(fill);
    if (trackDailyProgress) dailyChallengeProgressSnapshot.set(t.id, progress);
    const foot = o('div', 'challenge-foot'); foot.append(o('span', '', complete ? 'EXP added automatically' : progress + ' / ' + t.target), o('span', '', 'Resets daily'));
    card.append(top, track, foot); list.append(card);
    if (progressed) replayMotion(fill, 'motion-challenge-progress');
  });
  if (trackDailyProgress) dailyChallengeProgressReady = true;

  const gemOps = Array.isArray(d.gemOps) ? d.gemOps : [];
  const todayClaim = gemOps.find(op => typeof op === 'string' && op.startsWith('daily:' + day + ':'));
  const claimedToday = !!todayClaim;
  const claimedDayNumber = claimedToday ? Number(todayClaim.split(':')[2]) || 1 : 0;
  const yesterdayDate = new Date(Date.now() - 86400000).toISOString().slice(0,10);
  const yesterdayClaim = gemOps.find(op => typeof op === 'string' && op.startsWith('daily:' + yesterdayDate + ':'));
  const previousDayNumber = yesterdayClaim ? Number(yesterdayClaim.split(':')[2]) || 0 : 0;
  const rewardDay = claimedToday ? claimedDayNumber : (previousDayNumber >= 1 && previousDayNumber < 7 ? previousDayNumber + 1 : 1);
  const canClaimGem = !!(S.db && S.uid && state.day === day && Number(progressData.quizzes || 0) >= 1);
  const rewardPanel = o('section','daily-gem-rewards'+(dailyGemClaimFeedback?' is-claim-confirmed':''));
  const rewardHead = o('div','daily-gem-head'), rewardTitle = o('div');
  rewardTitle.append(o('p','eyebrow','A little reward for learning'),o('h3','','Daily Gem Rewards'),
    o('p','','Complete at least one normal practice quiz today to unlock your Gems. Missed days never take away Gems you have already earned.'));
  rewardHead.append(rewardTitle,o('strong','daily-gem-balance','💎 ' + Math.max(0,Number(d.gems)||0)));
  const days = o('div','daily-gem-days');
  for(let n=1;n<=7;n++){
    const tile=o('div','daily-gem-day'+(n<rewardDay || (claimedToday && n<=claimedDayNumber) ? ' is-done' : '')+(n===rewardDay && !claimedToday ? ' is-current' : '')+(dailyGemClaimFeedback && claimedToday && n===claimedDayNumber ? ' is-claim-confirmed' : '')+(dailyGemClaimFeedback === 7 && claimedToday && n===7 ? ' is-streak-milestone' : ''));
    tile.append(o('strong','', 'Day '+n),o('span','',n===7?'+6 💎':'+1 💎'));
    if(claimedToday && n===claimedDayNumber) tile.append(o('small','','Claimed'));
    days.append(tile);
  }
  const action = o('div','daily-gem-action');
  const actionText = claimedToday ? 'You have claimed today’s reward. Come back tomorrow for the next day.' :
    canClaimGem ? (rewardDay===7 ? 'Day 7 includes a 1-Gem reward plus a 5-Gem bonus.' : 'Your practice quiz is complete. Your daily Gem reward is ready.') :
    (!S.db || !S.uid ? 'Sign in to save your daily Gem rewards.' : 'Complete one normal practice quiz today to unlock your daily Gem reward.');
  action.append(o('p','',actionText));
  const claimDaily = o('button','btn btn-primary btn-sm','Claim '+(rewardDay===7?'+6':' +1')+' 💎');
  claimDaily.type='button'; claimDaily.disabled=claimedToday || !canClaimGem;
  claimDaily.onclick=async()=>{
    const sourceRect = captureRewardRect(claimDaily);
    claimDaily.disabled=true; claimDaily.textContent='Claiming…';
    try{
      const result=await Gems.claimDaily(sourceRect);
      App.toast(result.duplicate?'Today’s Gem reward has already been claimed.':'You earned '+result.change+' Gems for Day '+result.rewardDay+'!', 'good');
    }catch(error){
      App.toast(error&&error.code==='DAILY_ACTIVITY_REQUIRED'?'Complete a normal practice quiz before claiming.':'Could not claim your daily Gems. Please try again.','warn');
      renderDaily();
    }
  };
  action.append(claimDaily);
  rewardPanel.append(rewardHead,days,action);

  const coinRate = Math.min(3, Math.max(0.5, Number(S.settings.coinMultiplier) || 1));
  const challengeCoinAmount = Math.floor(DAILY_CHALLENGE_COIN_REWARD * coinRate);
  const coinClaimed = state.coinClaimed === true;
  const allChallengesComplete = tasks.length === 3 && done === 3;
  const coinPanel = o('section', 'daily-challenge-bonus'+(dailyCoinClaimFeedback?' is-claim-confirmed':''));
  const coinCopy = o('div', 'daily-challenge-bonus-copy');
  coinCopy.append(o('span', 'daily-challenge-bonus-icon', '💰'));
  const coinText = o('div');
  coinText.append(o('strong', '', 'Daily completion reward'),
    o('small', '', 'Complete all three missions to unlock bonus coins. Your challenge EXP is added automatically as each mission is completed.'));
  coinText.append(o('span', 'daily-challenge-bonus-status',
    coinClaimed ? '✓ Today’s coins have been claimed' : allChallengesComplete ? 'Ready to claim' : done + '/3 missions completed'));
  coinCopy.append(coinText);
  const claimCoins = o('button', 'btn btn-primary btn-sm', coinClaimed ? '✓ Coins claimed' : 'Claim +' + challengeCoinAmount + ' 💰');
  claimCoins.type = 'button';
  claimCoins.disabled = coinClaimed || !allChallengesComplete || !S.db || !S.uid;
  claimCoins.onclick = async () => {
    const sourceRect = captureRewardRect(claimCoins);
    claimCoins.disabled = true;
    claimCoins.textContent = 'Claiming…';
    try {
      const result = await claimDailyChallengeCoins(day, challengeCoinAmount, sourceRect);
      App.toast(result.duplicate ? 'You have already claimed today’s challenge coins.' : 'You claimed +' + result.added + ' coins!', 'good');
    } catch (error) {
      const message = error && error.message;
      App.toast(message === 'DAILY_CHALLENGES_NOT_COMPLETE'
        ? 'Complete all three daily challenges before claiming your coins.'
        : message === 'SIGN_IN_REQUIRED'
          ? 'Sign in before claiming your daily challenge coins.'
          : 'Could not claim your daily challenge coins. Please try again.', 'warn');
      renderDaily();
    }
  };
  coinPanel.append(coinCopy, claimCoins);
  e.append(rewardPanel, head, list, coinPanel,
    o('p', 'challenge-note', !S.db || !S.uid
      ? 'Sign in to the Friends board to save progress and claim daily rewards.'
      : 'Only normal practice sessions count. Your missions refresh tomorrow.'));
}
App.on('quiz:finished', async ev => {
  const box = $('exp-result'); box.hidden = false;
  if (!Object.keys(ev.answers).length) { box.replaceChildren(o('p', 'exp-status', 'Answer at least one question to earn EXP.')); return; }
  if (!S.db || !S.uid) { box.replaceChildren(o('p', 'exp-headline', 'EXP not saved'), o('p', 'exp-status', 'You\u2019re offline or the friends board isn\u2019t connected, so this EXP wasn\u2019t saved. Check your internet and reload.')); return; }
  box.replaceChildren(o('p', 'exp-status', 'Saving your EXP\u2026'));
  try {
    const d = S.doc || {}, day = today();
    const counted = d.counted && d.counted.day === day ? d.counted.ids.slice() : [];
    let fresh = 0, already = 0;
    for (const id of ev.questionIds) { const q = App.questionById(id); if (q && ev.answers[id] === q.correct) { if (counted.includes(id)) already++; else { counted.push(id); fresh++; } } }
    let streak = d.streak || 0, extended = false, usedFreeze = false;
    if (d.lastDay !== day) {
      if (d.lastDay === yesterday()) { streak = streak + 1; extended = true; }
      else if ((d.sfreezes || 0) > 0 && streak > 0) { usedFreeze = true; extended = true; }
      else { streak = 1; extended = true; }
    }
    const parts = [];
    const previousAchievements = d.achievements || {};
    const achievementStats = { ...(previousAchievements.stats || {}) };
    const achievementSubjects = [...new Set([...(previousAchievements.subjects || []).filter(code => code !== 'ga-'), ...ev.questionIds.map(id => id.slice(0, 3)).filter(code => code !== 'ga-')])];
    achievementStats.answered = (achievementStats.answered || 0) + Object.keys(ev.answers || {}).length;
    achievementStats.correct = (achievementStats.correct || 0) + (ev.correct || 0);
    achievementStats.quizzes = (achievementStats.quizzes || 0) + 1;
    if (Object.keys(ev.answers || {}).length > 0 && ev.correct === Object.keys(ev.answers || {}).length) achievementStats.perfect = (achievementStats.perfect || 0) + 1;
    if (Object.keys(ev.answers || {}).length > 0 && ev.correct / Object.keys(ev.answers || {}).length >= 0.9) achievementStats.highScore = (achievementStats.highScore || 0) + 1;
    const subjectMetrics = {};
    ev.questionIds.forEach(id => {
      const q = App.questionById(id);
      if (!q) return;
      const metric = q.subject === 'careerTechnology' ? 'ct' : id.slice(0, 3);
      subjectMetrics[metric] = (subjectMetrics[metric] || 0) + 1;
    });
    Object.entries(subjectMetrics).forEach(([metric, count]) => {
      achievementStats[metric] = (achievementStats[metric] || 0) + count;
    });
    const achievementUnlocked = [...(previousAchievements.unlocked || [])];
    ACHIEVEMENTS.forEach(a => {
      const value = a.metric === 'subjects' ? achievementSubjects.length : a.metric === 'streak' ? streak : a.metric === 'achievementCount' ? achievementUnlocked.length : Number(achievementStats[a.metric] || 0);
      if (value >= a.target && !achievementUnlocked.includes(a.id)) achievementUnlocked.push(a.id);
    });
    const achievements = { stats: achievementStats, subjects: achievementSubjects, unlocked: achievementUnlocked };
    const previouslyUnlockedAchievements = Array.isArray(previousAchievements.unlocked)
      ? previousAchievements.unlocked : [];
    const newlyUnlockedAchievementIds = achievementUnlocked.filter(id => !previouslyUnlockedAchievements.includes(id));
    const previous = d.challengeState && d.challengeState.day === day ? d.challengeState : { day, progress: {}, claimed: [] };
    const challengeState = { day, progress: { ...(previous.progress || {}) }, subjects: [...(previous.subjects || []).filter(code => code !== 'ga-')], claimed: [...(previous.claimed || [])] };
    // Daily Quiz sessions are intentionally excluded; only ordinary practice advances these missions.
    if (ev.kind !== 'daily') {
      const add = (key, amount) => { challengeState.progress[key] = (challengeState.progress[key] || 0) + amount; };
      const answeredIds = Object.keys(ev.answers || {}), subjects = new Set(), subjectCounts = {};
      answeredIds.forEach(id => {
        const q = App.questionById(id), code = q && q.subject === 'careerTechnology' ? 'ct' : id.slice(0, 3);
        if (q) { subjects.add(code); subjectCounts[code] = (subjectCounts[code] || 0) + 1; }
      });
      add('answered', answeredIds.length);
      add('correct', ev.correct || 0);
      add('quizzes', 1);
      subjects.forEach(code => { if (!challengeState.subjects.includes(code)) challengeState.subjects.push(code); });
      challengeState.progress.subjects = challengeState.subjects.length;
      if (answeredIds.length > 0 && ev.correct === answeredIds.length) add('perfect', 1);
      if ((ev.total || answeredIds.length) >= 10) add('longQuiz', 1);
      if (subjects.size >= 3) add('mixed', 1);
      Object.entries(subjectCounts).forEach(([code, count]) => { if (['soc', 'art', 'mat', 'com', 'rme', 'sci', 'fre', 'ct'].includes(code)) add(code, count); });
      dailyChallengeSet(day).forEach(task => {
        const value = challengeState.progress[task.metric] || 0;
        if (value >= task.target && !challengeState.claimed.includes(task.id)) {
          challengeState.claimed.push(task.id);
          parts.push({ label: 'Daily challenge: ' + task.detail, exp: task.reward });
        }
      });
    }
    const bonusExp = parts.reduce((a, p) => a + p.exp, 0);
    const xpMult = (d.xpBoost || 0) > 0 ? 2 : 1;
    if (xpMult > 1) parts.push({ label: '\u26A1 XP Boost active', exp: fresh * 10 });
    const earned = fresh * 10 * xpMult;
    // coins: 1 per new correct answer, a quarter of the daily-challenge bonus, and a streak bonus (+1 for every 3 days in a row, up to +5)
    const coinParts = [];
    if (fresh) coinParts.push({ label: `${plural(fresh, 'new correct answer')}`, n: fresh });
    if (Math.floor(bonusExp / 4)) coinParts.push({ label: 'Daily challenge bonus', n: Math.floor(bonusExp / 4) });
    const streakCoins = fresh > 0 ? Math.min(5, Math.floor(streak / 3)) : 0;
    if (streakCoins) coinParts.push({ label: `\u{1F525} ${streak}-day streak bonus`, n: streakCoins });
    const baseCoinsEarned = coinParts.reduce((a, c) => a + c.n, 0);
    const expRate = Math.min(3, Math.max(0.5, Number(S.settings.expMultiplier) || 1));
    const coinRate = Math.min(3, Math.max(0.5, Number(S.settings.coinMultiplier) || 1));
    const awardedExp = Math.floor((earned + bonusExp) * expRate);
    const awardedEarned = Math.floor(earned * expRate);
    const awardedBonusExp = awardedExp - awardedEarned;
    const scaledParts = parts.map(part => ({ ...part, exp: Math.floor(part.exp * expRate) }));
    if (scaledParts.length) {
      const shownExp = scaledParts.reduce((sum, part) => sum + part.exp, 0);
      scaledParts[scaledParts.length - 1].exp += awardedBonusExp - shownExp;
    }
    const coinsEarned = Math.floor(baseCoinsEarned * coinRate);
    const scaledCoinParts = coinParts.map(part => ({ ...part, n: Math.floor(part.n * coinRate) }));
    if (scaledCoinParts.length) {
      const shown = scaledCoinParts.reduce((sum, part) => sum + part.n, 0);
      scaledCoinParts[scaledCoinParts.length - 1].n += coinsEarned - shown;
    }
    const subs = [...new Set(ev.questionIds.map(i => i.slice(0, 3)))];
    const subject = subs.length === 1 ? SUBJ[subs[0]] || 'mixed subjects' : 'mixed subjects';
    const recent = [{ kind: ev.kind, subject, correct: ev.correct, total: ev.total, exp: awardedExp, at: Date.now() }, ...(d.recent || [])].slice(0, 5);
    const sfreezes = usedFreeze ? Math.max(0, (d.sfreezes || 0) - 1) : (d.sfreezes || 0);
    const xpBoost = xpMult > 1 ? Math.max(0, (d.xpBoost || 0) - 1) : (d.xpBoost || 0);
    const next = { ...(d.displayName ? { displayName: d.displayName } : {}), ...(d.avatar ? { avatar: d.avatar } : {}), ...(d.photo ? { photo: d.photo } : {}), ...(d.color ? { color: d.color } : {}), ...(d.bio ? { bio: d.bio } : {}), totalExp: (d.totalExp || 0) + awardedExp, weekKey: weekStart(), weekExp: (d.weekKey === weekStart() ? d.weekExp || 0 : 0) + awardedExp, streak, bestStreak: Math.max(d.bestStreak || 0, streak), lastDay: day, dayKey: day, dayExp: (d.dayKey === day ? d.dayExp || 0 : 0) + awardedExp, duelW: d.duelW || 0, duelL: d.duelL || 0, duelD: d.duelD || 0, coins: (d.coins || 0) + coinsEarned, owned: d.owned || {}, eq: d.eq || {}, p50: d.p50 || 0, sfreezes, xpBoost, dcDay: d.dcDay || '', dcN: d.dcN || 0, counted: { day, ids: counted }, challengeState, achievements, recent };
    const playerRef = S.db.doc('players/' + S.uid);
    let preserveGemFields = {};
    await S.db.runTransaction(async transaction => {
      const currentSnapshot = await transaction.get(playerRef);
      const currentData = currentSnapshot.exists ? (currentSnapshot.data() || {}) : {};
      // Preserve Gems only when those fields already exist. New player documents
      // must omit them so the published Firestore rules permit profile creation.
      preserveGemFields = {};
      if (Object.prototype.hasOwnProperty.call(currentData, 'gems')) preserveGemFields.gems = currentData.gems;
      if (Object.prototype.hasOwnProperty.call(currentData, 'gemOps')) preserveGemFields.gemOps = currentData.gemOps;
      if (Object.prototype.hasOwnProperty.call(currentData, 'gemCosmetics')) preserveGemFields.gemCosmetics = currentData.gemCosmetics;
      if (Object.prototype.hasOwnProperty.call(currentData, 'equippedGemCosmetic')) preserveGemFields.equippedGemCosmetic = currentData.equippedGemCosmetic;
      transaction.set(playerRef, { ...next, ...preserveGemFields });
    });
    S.doc = { ...next, ...preserveGemFields };
    renderAccount();
    dailyChallengeCompletionFeedback = new Set(
      challengeState.claimed.filter(id => !(previous.claimed || []).includes(id))
    );
    try {
      renderDaily();
    } finally {
      dailyChallengeCompletionFeedback.clear();
    }
    newlyEarnedAchievementFeedback = new Set(newlyUnlockedAchievementIds);
    try {
      renderAchievements();
    } finally {
      newlyEarnedAchievementFeedback.clear();
    }
    showResult({ coins: coinsEarned, coinParts: scaledCoinParts, balance: (next.coins || 0), previousCoins: Number(d.coins) || 0, earned: awardedEarned, bonusExp: awardedBonusExp, correct: ev.correct, already, parts: scaledParts, total: next.totalExp, previousTotal: Number(d.totalExp) || 0, streak, extended, usedFreeze, xpMult, expRate, coinRate });
  } catch (err) { box.replaceChildren(o('p', 'exp-status', 'Couldn\u2019t save your EXP. ' + (err && err.message || ''))); }
});
// Reward card: count the earned amount, then send the coins into the new balance.
function coinPanel(total, parts, balance) {
  const w = o('div', 'coin-panel'), top = o('div', 'coin-top');
  const ic = o('span', 'coin-ic', '💰'), num = o('strong', 'coin-num', '+0');
  top.append(ic, num, o('span', 'coin-lbl', total === 1 ? 'coin earned' : 'coins earned'));
  w.append(top);
  if (parts && parts.length) {
    const ul = o('ul', 'coin-list');
    parts.forEach((part, index) => {
      const line = o('li');
      line.style.animationDelay = (0.2 + index * 0.1) + 's';
      line.append(o('span', '', part.label), o('strong', '', '+' + rewardNumber(part.n)));
      ul.append(line);
    });
    w.append(ul);
  }
  if (balance != null) {
    const balanceLine = o('p', 'coin-bal');
    balanceLine.append(document.createTextNode('Your balance: '), o('strong', 'coin-bal-value', rewardNumber(balance)));
    w.append(balanceLine);
  }
  animateRewardNumber(num, 0, total, value => '+' + rewardNumber(value));
  return w;
}

function showResult(e) {
  const t = $('exp-result');
  t.hidden = false;
  const xpReward = Math.max(0, Number(e.earned || 0) + Number(e.bonusExp || 0));
  const previousTotal = Math.max(0, Number(e.previousTotal) || 0);
  const newTotal = Math.max(previousTotal, Number(e.total) || 0);
  const xpDuration = rewardAnimationDuration(previousTotal, newTotal);
  const xpHeadline = o('p', 'exp-headline', '+0 EXP');
  t.replaceChildren(xpHeadline);
  animateRewardNumber(xpHeadline, 0, xpReward, value => '+' + rewardNumber(value) + ' EXP', xpDuration);

  const ul = o('ul', 'exp-breakdown');
  const add = (label, amount) => {
    const line = o('li');
    line.append(o('span', '', label), o('strong', '', '+' + rewardNumber(amount)));
    ul.append(line);
  };
  add(`${plural(e.correct - e.already, 'new correct answer')} × 10 base · ${e.xpMult || 1}× boost · ${e.expRate || 1}× owner rate`, e.earned);
  (e.parts || []).forEach(part => add(part.label, part.exp));
  t.append(ul);

  if (e.coins > 0) {
    const card = coinPanel(e.coins, e.coinParts, e.balance);
    t.append(card);
    const icon = card.querySelector('.coin-ic');
    animateCurrencyReward('coins', e.previousCoins, e.balance, captureRewardRect(icon));
  }

  if (e.already) {
    t.append(o('p', 'exp-status', `${plural(e.already, 'answer')} already earned EXP earlier today, so ${e.already === 1 ? 'it isn’t' : 'they aren’t'} counted twice.`));
  }

  const previousLevel = lv(previousTotal);
  const currentLevel = lv(newTotal);
  const levelUp = currentLevel.level > previousLevel.level;
  const xpProgress = o('section', 'exp-xp-progress');
  const xpTop = o('div', 'exp-xp-top');
  const levelBadge = o('strong', 'exp-level-badge', 'Level ' + currentLevel.level);
  const totalCount = o('span', 'exp-total-count', rewardNumber(previousTotal) + ' total EXP');
  xpTop.append(levelBadge, totalCount);
  if (levelUp) xpTop.append(o('span', 'exp-level-up', 'LEVEL UP!'));
  const track = o('div', 'exp-xp-track');
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-label', 'Progress towards the next EXP level');
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', String(LVL));
  track.setAttribute('aria-valuenow', String(currentLevel.into));
  const fill = o('span', 'exp-xp-fill');
  fill.style.transform = 'scaleX(' + (previousLevel.into / LVL) + ')';
  track.append(fill);
  const nextLabel = o('p', 'exp-xp-next', rewardNumber(LVL - currentLevel.into) + ' EXP to level ' + (currentLevel.level + 1));
  xpProgress.append(xpTop, track, nextLabel);
  t.append(xpProgress);
  animateRewardNumber(totalCount, previousTotal, newTotal, value => rewardNumber(value) + ' total EXP', xpDuration);
  const fromProgress = previousLevel.into / LVL;
  const toProgress = currentLevel.into / LVL;
  if (rewardMotionReduced() || previousTotal === newTotal) {
    fill.style.transform = 'scaleX(' + toProgress + ')';
  } else {
    requestAnimationFrame(() => {
      const frames = levelUp
        ? [
          { transform: 'scaleX(' + fromProgress + ')', offset: 0 },
          { transform: 'scaleX(1)', offset: .46 },
          { transform: 'scaleX(0)', offset: .52 },
          { transform: 'scaleX(' + toProgress + ')', offset: 1 }
        ]
        : [
          { transform: 'scaleX(' + fromProgress + ')', offset: 0 },
          { transform: 'scaleX(' + toProgress + ')', offset: 1 }
        ];
      if (typeof fill.animate === 'function') {
        const progressAnimation = fill.animate(frames, {
          duration: xpDuration,
          easing: 'cubic-bezier(.22,.72,.24,1)',
          fill: 'forwards'
        });
        progressAnimation.onfinish = () => {
          fill.style.transition = 'none';
          fill.style.transform = 'scaleX(' + toProgress + ')';
          progressAnimation.cancel();
        };
      } else {
        fill.style.transitionDuration = xpDuration + 'ms';
        fill.style.transform = 'scaleX(' + toProgress + ')';
      }
    });
  }
  if (levelUp && !rewardMotionReduced()) levelBadge.classList.add('reward-count-pop');

  if (e.usedFreeze) t.append(o('p', 'exp-status', '🛡️ Streak Freeze used! Your streak is safe.'));
  if (e.xpMult > 1) t.append(o('p', 'exp-status', '⚡ XP Boost active — EXP doubled this quiz!'));
  t.append(o('p', 'exp-streak', e.extended ? (e.streak > 1 ? `🔥 Streak extended to ${e.streak} days!` : '🔥 Streak started. Come back tomorrow to grow it.') : `🔥 ${plural(e.streak, 'day')} streak — already counted today.`));
  const b = o('button', 'link-button', 'See how your friends are doing →');
  b.type = 'button';
  b.onclick = () => App.navigate('friends');
  t.append(b);
}


function friendHead(p, title, box) {
  const pal = window.BeceProfile.palette(p.color)[window.BeceTheme.mode], h = o('div', 'friend-head'), t = o('div');
  box.style.setProperty('--accent', pal.accent); box.style.setProperty('--accent-soft', pal.accentSoft); box.style.setProperty('--primary', pal.primary);
  t.append(title); if (p.bio) t.append(o('p', '', p.bio));
  h.append(bubble(p, 64), t); return h;
}
function showFriend(p) {
  const old = $('friend-modal'); if (old) old.remove();
  const wk = weekStart(), live = p.lastDay === today() || p.lastDay === yesterday();
  const tExp = p.totalExp || 0, wExp = p.weekKey === wk ? p.weekExp || 0 : 0, { level, into } = lv(tExp);
  const rankOf = (key, ok) => { const arr = S.players.filter(ok).sort((a, b) => key(b) - key(a)), i = arr.findIndex(x => x.id === p.id); return i < 0 ? '\u2014' : '#' + (i + 1); };
  const allRank = rankOf(x => x.totalExp || 0, x => (x.totalExp || 0) > 0);
  const weekRank = rankOf(x => x.weekExp || 0, x => x.weekKey === wk && (x.weekExp || 0) > 0);
  const tile = (a, b) => { const x = o('div', 'stat-tile'); x.append(o('strong', '', a), o('span', '', b)); return x; };
  const m = o('div', 'friend-modal'); m.id = 'friend-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
  const box = o('div', 'card friend-box'), title = o('h2', '', nameOf(p.id));
  if (p.id === S.uid) title.append(o('span', 'you-tag', 'you'));
  if (S.admins.has(p.id)) title.append(' ', adminBadge(p.id));
  const tiles = o('div', 'stat-tiles');
  tiles.append(tile(`Lv ${level}`, `${LVL - into} EXP to next`), tile(String(tExp), 'Total EXP'), tile(String(wExp), 'EXP this week'), tile(`\u{1F525} ${live ? p.streak || 0 : 0}`, `Day streak \u00B7 best ${p.bestStreak || 0}`), tile(allRank, 'All-time rank'), tile(weekRank, 'Weekly rank'), tile(`${p.duelW || 0}-${p.duelL || 0}-${p.duelD || 0}`, 'Duels W-L-D'));
  const mt = o('progress', 'meter'); mt.max = LVL; mt.value = into;
  const dd = p.challengeState && p.challengeState.day === today() ? `${(p.challengeState.claimed || []).length}/3 daily challenges completed` : 'No daily challenges completed yet';
  const ul = o('ul', 'activity-list'), rec = p.recent || [];
  if (!rec.length) ul.append(o('li', 'muted', 'No quizzes finished yet.'));
  rec.forEach(r => { const li = o('li'), q = o('p'); q.append(document.createTextNode(`${r.kind === 'daily' ? 'Daily quiz' : 'Practised ' + r.subject} \u00B7 ${r.correct}/${r.total}`)); li.append(q, o('span', 'activity-exp', `+${r.exp}`), o('span', 'activity-time', ago(r.at))); ul.append(li); });
  const close = o('button', 'btn btn-ghost btn-sm', 'Close'); close.type = 'button';
  const onKey = e => { if (e.key === 'Escape') shut(); }, shut = () => { document.removeEventListener('keydown', onKey); App.dismissOverlay(m); };
  close.onclick = shut; m.onclick = e => { if (e.target === m) shut(); }; document.addEventListener('keydown', onKey);
  box.append(friendHead(p, title, box), tiles, mt, o('p', 'muted', dd), o('p', 'eyebrow', 'Recent sessions'), ul, close); m.append(box); document.body.append(m); close.focus();
}

/* ---------- Profile card + customiser ----------
   Built once and then updated in place, so typing a status or dragging a slider never loses focus
   when the board refreshes in the background. Changes apply instantly and save a moment later. */
const PF = window.BeceProfile;
const BIO_IDEAS = ['Studying for BECE \u{1F4DA}', 'Streak hunter \u{1F525}', 'Maths is my thing \u2797', 'Coffee + notes \u2615', 'Come beat my score \u{1F60E}', 'Revision mode: ON \u26A1'];
const HUE_TRACK = 'linear-gradient(90deg,' + Array.from({ length: 13 }, (_, i) => `hsl(${i * 30} 78% 50%)`).join(',') + ')';
const DOODLES = [[3, 14, -14], [13, 58, 10], [23, 10, 18], [32, 56, -8], [43, 18, 6], [52, 60, -16], [61, 10, 12], [70, 54, -6], [79, 18, 16], [88, 58, -12], [95, 14, 8]];
const firstEmoji = v => {
  v = (v || '').trim(); if (!v) return '';
  const g = window.Intl && Intl.Segmenter ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(v)][0].segment : Array.from(v)[0];
  return /\p{Extended_Pictographic}/u.test(g) ? g : '';
};
const me = () => ({ id: S.uid, ...(S.doc || {}) });

// An avatar bubble in the player's own colour. Both the light and dark shades are set, so it stays right when the mode changes.
function paintBubble(b, p) {
  const pal = PF.palette(p.color);
  b.dataset.frame = (p.eq && p.eq.frame) || '';
  b.dataset.gemRing = p.gemCosmetics && p.gemCosmetics['profile-ring-gold'] === true
    && p.equippedGemCosmetic === 'profile-ring-gold' ? 'gold' : '';
  const oldBadge = b.querySelector('.av-badge'); if (oldBadge) oldBadge.remove();
  if (p.photo) {
    if (!b.querySelector('img.av-photo')) b.textContent = '';
    let img = b.querySelector('img.av-photo');
    if (!img) { img = document.createElement('img'); img.className = 'av-photo'; img.alt = ''; b.appendChild(img); }
    img.src = p.photo;
    if (p.avatar) {
      const bd = document.createElement('span'); bd.className = 'av-badge';
      setAvatarGlyph(bd, PF.safeAv(p.avatar)); b.appendChild(bd);
    }
  } else {
    const imgEl = b.querySelector('img.av-photo'); if (imgEl) imgEl.remove();
    const avatar = PF.safeAv(p.avatar);
    if (avatar) setAvatarGlyph(b, avatar);
    else b.textContent = (nameOf(p.id) || '?').slice(0, 1).toUpperCase();
  }
  b.style.setProperty('--av-l', pal.light.accent); b.style.setProperty('--av-ls', pal.light.accentSoft);
  b.style.setProperty('--av-d', pal.dark.accent); b.style.setProperty('--av-ds', pal.dark.accentSoft);
}
function bubble(p, size) { const b = o('span', 'av'); paintBubble(b, p); if (size) b.style.setProperty('--s', size + 'px'); return b; }

// Changes show immediately, then save ~0.6s after the last tweak. `merge` means only the changed fields are written.
let saveRetryDelay = 1500, saveRetryNoticeShown = false;
function queueSave(patch) {
  S.doc = { ...(S.doc || {}), ...patch }; S.pend = { ...(S.pend || {}), ...patch };
  if (S.pc) S.pc.status('saving');
  saveRetryDelay = 1500;
  clearTimeout(S.saveT); S.saveT = setTimeout(flushSave, 650);
}
async function flushSave() {
  S.saveT = 0;
  const patch = S.pend; if (!patch || !S.db || !S.uid) return;
  S.pend = null;
  if (S.pc) S.pc.status('saving');
  try {
    await S.db.doc('players/' + S.uid).set(patch, { merge: true });
    saveRetryDelay = 1500;
    saveRetryNoticeShown = false;
    if (S.pc) S.pc.status(S.pend || S.saveT ? 'saving' : 'saved');
  } catch (er) {
    S.pend = { ...patch, ...(S.pend || {}) };
    if (S.pc) S.pc.status('error');
    if (!S.saveT) {
      S.saveT = setTimeout(flushSave, saveRetryDelay);
      saveRetryDelay = Math.min(saveRetryDelay * 2, 30000);
    }
    if (!saveRetryNoticeShown) {
      App.toast('Couldn\u2019t save your profile. Your changes are queued and will retry automatically.', 'warn');
      saveRetryNoticeShown = true;
    }
  }
}
window.addEventListener('online', () => {
  if (S.pend && !S.saveT) S.saveT = setTimeout(flushSave, 250);
});

/* ---------- Photo cropper: drag to move, slider / pinch / scroll to resize ---------- */
function openCropper(file, onDone) {
  const url = URL.createObjectURL(file), img = new Image();
  img.onerror = () => { URL.revokeObjectURL(url); App.toast('That file could not be opened as a picture.', 'warn'); };
  img.onload = () => {
    const BOX = Math.min(300, window.innerWidth - 64), OUT = 192;
    const ov = o('div', 'crop-ov'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Crop your photo');
    const card = o('div', 'crop-card card');
    const stage = o('div', 'crop-stage'); stage.style.width = stage.style.height = BOX + 'px';
    const cv = document.createElement('canvas'); cv.width = cv.height = BOX; stage.append(cv, o('div', 'crop-ring'));
    const zoom = document.createElement('input'); zoom.type = 'range'; zoom.className = 'crop-zoom'; zoom.setAttribute('aria-label', 'Zoom');
    zoom.min = '0'; zoom.max = '100'; zoom.value = '0';
    const mk = (t, c, f) => { const b = o('button', 'btn ' + c, t); b.type = 'button'; b.onclick = f; return b; };
    const base = BOX / Math.min(img.width, img.height);       // scale where the picture just fills the square
    let k = 1, x = 0, y = 0;                                  // zoom multiplier and picture centre offset (px)
    const scale = () => base * k;
    const clamp = () => { const w = img.width * scale(), h = img.height * scale(); x = Math.min(Math.max(x, -(w - BOX) / 2), (w - BOX) / 2); y = Math.min(Math.max(y, -(h - BOX) / 2), (h - BOX) / 2); };
    const draw = (c, size) => {
      const ctx = c.getContext('2d'), f = size / BOX, w = img.width * scale() * f, h = img.height * scale() * f;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, size / 2 - w / 2 + x * f, size / 2 - h / 2 + y * f, w, h);
    };
    const paintC = () => { clamp(); draw(cv, BOX); };
    const setZoom = nk => { k = Math.min(4, Math.max(1, nk)); zoom.value = String((k - 1) / 3 * 100); paintC(); };
    zoom.oninput = () => { k = 1 + Number(zoom.value) / 100 * 3; paintC(); };
    const pts = new Map(); let last = 0;
    stage.onpointerdown = e => { stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = 0; };
    stage.onpointermove = e => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) { x += e.clientX - prev[0]; y += e.clientY - prev[1]; paintC(); }
      else if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (last) setZoom(k * d / last); last = d; }
    };
    const up = e => { pts.delete(e.pointerId); last = 0; };
    stage.onpointerup = stage.onpointercancel = up;
    stage.addEventListener('wheel', e => { e.preventDefault(); setZoom(k * (e.deltaY < 0 ? 1.08 : 0.92)); }, { passive: false });
    let cropClosing = false;
    const close = () => {
      if (cropClosing) return;
      cropClosing = true;
      document.removeEventListener('keydown', onKey);
      App.dismissOverlay(ov, () => URL.revokeObjectURL(url));
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    const save = mk('Use photo', 'btn-primary btn-sm', () => {
      const out = document.createElement('canvas'); out.width = out.height = OUT; draw(out, OUT);
      let q = .85, data = out.toDataURL('image/jpeg', q);
      while (data.length > 60000 && q > .4) { q -= .1; data = out.toDataURL('image/jpeg', q); }
      close(); onDone(data);
    });
    const row = o('div', 'cz-row crop-actions'); row.append(mk('Cancel', 'btn-ghost btn-sm', close), save);
    card.append(o('h3', '', 'Adjust your photo'), o('p', 'muted', 'Drag to move it. Use the slider (or pinch) to make it bigger or smaller.'), stage, zoom, row);
    ov.append(card); document.body.append(ov); paintC(); save.focus();
  };
  img.src = url;
}

function buildProfileCard() {
  const el = o('section', 'card profile-card'), st = { tab: 'avatar', group: 'animals', lastAv: null, refresh: null, onTheme: null };
  const tile = (a, b) => { const x = o('div', 'stat-tile'); x.append(o('strong', '', a), o('span', '', b)); return x; };

  /* --- header: doubles as a live preview of everything below --- */
  const banner = o('div', 'pc-banner'), doodles = o('div', 'pc-doodles'); banner.append(doodles);
  const main = o('div', 'pc-main'), head = o('div', 'pc-head'), who = o('div', 'pc-who'), act = o('div', 'pc-actions');
  const av = bubble(me()), nameEl = o('strong', 'pc-name'), subEl = o('span', 'pc-sub'), bioEl = o('p', 'pc-bio');
  who.append(nameEl, subEl, bioEl);
  const toggle = o('button', 'btn btn-sm'); toggle.type = 'button'; toggle.setAttribute('aria-controls', 'cz-panel');
  act.append(toggle); head.append(av, who, act);
  const tiles = o('div', 'stat-tiles'), meter = o('progress', 'meter');
  main.append(head, tiles, meter);
  { const bugRow = o('div', 'pc-bug'), bb = o('button', 'btn btn-ghost btn-sm', '\u{1F41E} Report a bug'); bb.type = 'button'; bb.onclick = () => Bugs.open(); bugRow.append(o('span', 'muted', 'Something broken, or hard to read on your phone?'), bb); main.append(bugRow); }
  el.append(banner, main);

  const paintDoodles = ch => doodles.replaceChildren(...DOODLES.map(([x, y, r]) => {
    const s = o('span', 'profile-doodle-icon');
    setAvatarGlyph(s, ch);
    s.style.cssText = `left:${x}%;top:${y}%;--r:${r}deg`;
    return s;
  }));
  function paint() {
    const d = me();
    paintBubble(av, d);
    const key = d.avatar || '';
    if (st.lastAv !== key) {
      paintDoodles(PF.safeAv(key) || '\u2728');
      if (st.lastAv !== null) { av.classList.remove('pop'); void av.offsetWidth; av.classList.add('pop'); }
      st.lastAv = key;
    }
    nameEl.textContent = nameOf(S.uid); if (S.isAdmin) nameEl.append(' ', adminBadge(S.uid)); bioEl.textContent = d.bio || '';
  }

  /* --- customiser --- */
  const cz = o('div', 'cz'); cz.id = 'cz-panel';
  const hd = o('div', 'cz-head'), ht = o('div'), status = o('span', 'cz-status', 'All changes saved');
  status.setAttribute('role', 'status'); status.dataset.state = 'saved';
  ht.append(o('p', 'eyebrow', 'Make it yours'), o('h2', '', 'Customise your profile')); hd.append(ht, status);
  const tabs = o('div', 'segmented cz-tabs'), panel = o('div', 'cz-panel');
  tabs.setAttribute('role', 'tablist'); panel.setAttribute('role', 'tabpanel');
  cz.append(hd, tabs, panel); el.append(cz);
  /* Account actions live in Profile, separate from appearance customisation. */
  const safety = o('section', 'account-safety');
  const safetyHead = o('div', 'account-safety-head');
  safetyHead.append(o('p', 'eyebrow', 'Account & safety'), o('h2', '', 'Manage your profile data'),
    o('p', 'muted', 'Your app currently uses an anonymous profile on this device. You can reset its progress or remove this profile.'));
  const safetyActions = o('div', 'account-safety-actions');
  const resetBtn = o('button', 'btn btn-ghost', '↻ Reset everything');
  const deleteBtn = o('button', 'btn btn-danger', 'Delete profile');
  resetBtn.type = deleteBtn.type = 'button';
  const safetyNote = o('p', 'account-safety-note', 'Reset everything clears all progress, Gems, achievement claims and purchased Gem cosmetics while keeping your profile ID and display name. Delete profile is a separate action.');
  resetBtn.onclick = async () => {
    if (!S.db || !S.uid || !firebase.auth().currentUser) return App.toast('Your profile service is not ready. Please try again online.', 'warn');
    if (!(await confirmDialog(
      'Reset everything?',
      'This permanently clears all account progress: Gems, Coins, EXP, achievements and their Gem claim history, owned Gem cosmetics, shop inventory, streaks, daily rewards, Duel stats, profile customisation, quiz history, bookmarks, notes studied and saved essay drafts. Your profile ID and display name remain. This does not delete your sign-in account. This cannot be undone.',
      'Reset everything',
      'Keep my data'
    ))) return;
    if (!(await confirmDialog(
      'Final confirmation',
      'Your Gem balance will become 0, all achievements will be locked again, and the profile ring will be removed. Continue with the full reset?',
      'Erase all progress',
      'Cancel'
    ))) return;
    try {
      clearTimeout(S.saveT); S.saveT = 0; S.pend = null;
      const result = await Gems.resetEverything('reset:' + Date.now());
      if (!result || !result.reset) throw new Error('RESET_NOT_CONFIRMED');
      bookmarks = [];
      studied = new Set();
      try {
        for (let index = localStorage.length - 1; index >= 0; index--) {
          const key = localStorage.key(index);
          if (key && (/^bece_(history|bookmarks|studied)$/.test(key) || /^bece_essay_/.test(key))) localStorage.removeItem(key);
        }
      } catch {}
      Home.render(); renderDaily(); renderAchievements(); renderFriends();
      if (window.GemShop && typeof window.GemShop.render === 'function') window.GemShop.render();
      App.toast('Everything has been reset. Gems, achievements and Gem cosmetics are cleared.', 'good');
      setTimeout(() => location.reload(), 650);
    } catch (err) {
      console.error('Could not reset everything:', err);
      const code = String(err && err.code || 'unknown-error');
      App.toast(code === 'permission-denied'
        ? 'The server rejected the reset. No progress was changed.'
        : code === 'PLAYER_PROFILE_NOT_READY'
          ? 'Your profile is still loading. Please try again.'
          : code === 'unavailable' || code === 'deadline-exceeded'
            ? 'The profile service is temporarily unavailable. Please try again.'
            : 'Could not reset everything. No success was reported; please try again.', 'warn');
    }
  };
  deleteBtn.onclick = async () => {
    if (!S.db || !S.uid || !firebase.auth().currentUser) return App.toast('Your profile service is not ready. Please try again online.', 'warn');
    if (!(await confirmDialog('Delete your profile?', 'This permanently removes your player profile and anonymous sign-in. You will start with a new profile next time. Shared duel records may remain. This cannot be undone.', 'Continue', 'Cancel'))) return;
    if (!(await confirmDialog('Final confirmation', 'Are you sure you want to permanently delete this profile? Your current profile and progress will not be recoverable.', 'Delete permanently', 'Keep my profile'))) return;
    try {
      const uid = S.uid, user = firebase.auth().currentUser;
      clearTimeout(S.saveT); S.saveT = 0; S.pend = null;
      await S.db.doc('players/' + uid).delete();
      await Promise.all([
        S.db.doc('adminSessions/' + uid).delete().catch(() => {}),
        S.db.doc('ownerSessions/' + uid).delete().catch(() => {}),
        S.db.doc('notices/' + uid).delete().catch(() => {})
      ]);
      await user.delete();
      ['bece_history', 'bece_bookmarks', 'bece_studied'].forEach(k => store.remove(k));
      App.toast('Profile deleted. A fresh profile will be created.', 'good');
      setTimeout(() => location.reload(), 500);
    } catch (err) {
      App.toast('The profile could not be fully deleted. Please check your connection and try again.', 'warn');
    }
  };
  safetyActions.append(resetBtn, deleteBtn);
  safety.append(safetyHead, safetyActions, safetyNote);
  const staffRow = o('div', 'profile-staff-entry');
  const staffBtn = o('button', 'btn btn-ghost', '🛡️ Open Admin / Owner Panel');
  staffBtn.type = 'button'; staffBtn.onclick = () => App.navigate('admin');
  staffRow.append(staffBtn); staffRow.hidden = !S.isAdmin;
  el.append(safety, staffRow);


  const STATUS = { saved: 'All changes saved', saving: 'Saving\u2026', error: 'Couldn\u2019t save \u00B7 will retry' };
  const setStatus = s => {
    if (!Object.prototype.hasOwnProperty.call(STATUS, s)) return;
    const changed = status.dataset.state !== s;
    status.dataset.state = s;
    status.textContent = STATUS[s];
    if (changed) replayMotion(status, 'motion-profile-status-change');
  };

  const pick = a => { queueSave({ avatar: a }); paint(); renderAccount(); if (st.refresh) st.refresh(); };

  function avatarPanel() {
    const w = o('div', 'cz-section cz-avatar-panel'), grid = o('div', 'emoji-grid'), chips = o('div', 'cz-chips');
    const mark = () => {
      const cur = me().avatar || '';
      grid.querySelectorAll('.emoji-pick').forEach(b => {
        const on = b.dataset.avatar === cur;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', String(on));
      });
    };
    const fill = () => {
      grid.replaceChildren(...PF.AVATAR_GROUPS.find(g => g.id === st.group).items.map((a, index) => {
        const b = o('button', 'emoji-pick');
        b.dataset.avatar = a;
        setAvatarGlyph(b, a, 'avatar-choice-icon');
        b.type = 'button';
        b.setAttribute('aria-label', 'Choose avatar ' + (index + 1));
        b.title = 'Choose avatar ' + (index + 1);
        b.onclick = () => pick(a);
        return b;
      }));
      mark();
    };
    PF.AVATAR_GROUPS.forEach(g => {
      const c = o('button', 'chip', g.label); c.type = 'button'; c.setAttribute('aria-pressed', String(st.group === g.id));
      c.onclick = () => { st.group = g.id; chips.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', String(x === c))); fill(); };
      chips.append(c);
    });
    const row = o('div', 'cz-row'), rnd = o('button', 'btn btn-ghost btn-sm', '\u{1F3B2} Surprise me'), ini = o('button', 'btn btn-ghost btn-sm', 'Remove avatar');
    rnd.type = ini.type = 'button';
    rnd.onclick = () => { const all = PF.AVATARS, cur = me().avatar; let a; do { a = all[Math.floor(Math.random() * all.length)]; } while (a === cur); pick(a); const g = PF.AVATAR_GROUPS.find(x => x.items.includes(a)); if (g && g.id !== st.group) { st.group = g.id; chips.querySelectorAll('.chip').forEach((x, i) => x.setAttribute('aria-pressed', String(PF.AVATAR_GROUPS[i].id === g.id))); fill(); } };
    ini.onclick = () => pick('');
    row.append(rnd, ini);
    const own = o('form', 'cz-row'), inp = o('input'), go = o('button', 'btn btn-ghost btn-sm', 'Use it');
    inp.type = 'text'; inp.placeholder = 'Enter a custom avatar symbol'; inp.maxLength = 16; inp.setAttribute('aria-label', 'Custom avatar symbol'); go.type = 'submit';
    own.onsubmit = e => { e.preventDefault(); const em = firstEmoji(inp.value); if (!em) { App.toast('Type or paste a single emoji, like \u{1F432}', 'warn'); return; } pick(em); inp.value = ''; };
    own.append(inp, go);
    // Photo upload section
    const photoLbl = o('p', 'cz-label', '\u{1F4F7} Profile photo');
    const photoRow = o('div', 'cz-row');
    const photoInp = document.createElement('input');
    photoInp.type = 'file'; photoInp.accept = 'image/*'; photoInp.className = 'sr-only'; photoInp.id = 'photo-upload-inp';
    const photoPickBtn = document.createElement('label');
    photoPickBtn.htmlFor = 'photo-upload-inp'; photoPickBtn.className = 'btn btn-ghost btn-sm photo-upload-label'; photoPickBtn.style.cursor = 'pointer';
    setIconAwareText(photoPickBtn, '\u{1F4F7} Upload a photo');
    const clearPhotoBtn = o('button', 'btn btn-ghost btn-sm', '\u2715 Remove photo');
    clearPhotoBtn.type = 'button'; clearPhotoBtn.hidden = !me().photo; st.photoBtn = clearPhotoBtn;
    let photoSaving = false;
    async function persistPhoto(dataUrl) {
      if (photoSaving) return false;
      if (!S.db || !S.uid) {
        if (S.pc) S.pc.status('error');
        App.toast('Connect to the internet before saving a profile photo.', 'warn');
        return false;
      }
      photoSaving = true;
      photoPickBtn.classList.add('photo-save-pending');
      photoPickBtn.setAttribute('aria-disabled', 'true');
      photoPickBtn.textContent = dataUrl ? 'Saving photo…' : 'Removing photo…';
      photoInp.disabled = true;
      clearPhotoBtn.disabled = true;
      photoRow.setAttribute('aria-busy', 'true');
      if (S.pc) S.pc.status('saving');
      try {
        await S.db.doc('players/' + S.uid).set({ photo: dataUrl }, { merge: true });
        S.doc = { ...(S.doc || {}), photo: dataUrl };
        paint();
        renderAccount();
        clearPhotoBtn.hidden = !dataUrl;
        if (st.refresh) st.refresh();
        if (S.pc) S.pc.status(S.pend || S.saveT ? 'saving' : 'saved');
        requestAnimationFrame(() => {
          replayMotion(av, 'motion-profile-photo-saved');
          const accountPhoto = $('account-btn')?.querySelector('.account-ph');
          if (accountPhoto) replayMotion(accountPhoto, 'motion-profile-photo-saved');
        });
        App.toast(dataUrl ? 'Photo saved!' : 'Photo removed.', 'good');
        return true;
      } catch (error) {
        if (S.pc) S.pc.status('error');
        App.toast('Could not save that photo. Your previous photo is still in place. Please try again.', 'warn');
        return false;
      } finally {
        photoSaving = false;
        photoPickBtn.classList.remove('photo-save-pending');
        photoPickBtn.removeAttribute('aria-disabled');
        setIconAwareText(photoPickBtn, '\u{1F4F7} Upload a photo');
        photoInp.disabled = false;
        clearPhotoBtn.disabled = false;
        photoRow.setAttribute('aria-busy', 'false');
      }
    }
    clearPhotoBtn.onclick = () => { void persistPhoto(''); };
    photoInp.onchange = ev => {
      const file = ev.target.files && ev.target.files[0]; photoInp.value = ''; if (!file) return;
      openCropper(file, dataUrl => { void persistPhoto(dataUrl); });
    };
    photoRow.append(photoPickBtn, photoInp, clearPhotoBtn);

    w.append(photoLbl, photoRow, o('p', 'cz-note', 'Your photo shows as your avatar on the board. You can also choose a small avatar icon to appear in its top-right corner.'), o('p', 'cz-label', 'Choose an avatar icon'), chips, grid, o('p', 'cz-label', 'Quick picks'), row, o('p', 'cz-label', 'Custom avatar symbol'), own);
    st.refresh = mark; fill();
    return w;
  }

  function themePanel() {
    const w = o('div', 'cz-section cz-theme-panel');
    /* light / dark / auto */
    const seg = o('div', 'segmented segmented-full mode-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Light or dark mode');
    const modeBtns = [['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['auto', 'Auto', null]].map(([k, t, i]) => {
      const b = o('button'); b.type = 'button'; b.dataset.mode = k; if (i) b.append(App.icon(i)); b.append(document.createTextNode(t));
      b.onclick = () => {
        const changed = BeceTheme.pref !== k;
        BeceTheme.set(k);
        if (changed) replayMotion(b, 'motion-profile-mode-selected');
      };
      seg.append(b); return b;
    });
    const paintModes = () => modeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === BeceTheme.pref)));

    /* colour presets, each previewed in the mode you are using right now */
    const grid = o('div', 'theme-grid'), editor = o('div', 'cz-custom'); editor.hidden = true;
    const paintTile = t => {
      const P = PF.palette(t.dataset.key)[BeceTheme.mode], s = t.style;
      s.setProperty('--t-bg', P.bg); s.setProperty('--t-surface', P.surface); s.setProperty('--t-line', P.line); s.setProperty('--t-ink', P.ink); s.setProperty('--t-muted', P.muted); s.setProperty('--t-primary', P.primary);
    };
    const makeTile = (key, name, custom) => {
      const b = o('button', 'theme-tile'); b.type = 'button'; b.dataset.key = key; if (custom) b.dataset.custom = '1';
      const pv = o('span', 'tt-preview'), top = o('span', 'tt-top'), card = o('span', 'tt-card'), l1 = o('i', 'tt-line'), l2 = o('i', 'tt-line'), l3 = o('i', 'tt-line muted');
      l1.style.width = '38%'; l2.style.width = '78%'; l3.style.width = '52%';
      top.append(o('i', 'tt-dot'), l1); card.append(l2, l3, o('i', 'tt-btn')); pv.append(top, card);
      const nm = o('span', 'tt-name'); if (custom) nm.append(o('i', 'tt-rainbow')); nm.append(document.createTextNode(name));
      const ck = o('span', 'tt-check'); ck.append(App.icon('check'));
      b.append(pv, nm, ck); b.setAttribute('aria-label', name + ' colour theme'); paintTile(b); return b;
    };
    const presetTiles = Object.entries(PF.PRESETS).map(([k, v]) => { const t = makeTile(k, v.name, false); t.onclick = () => choose(k); return t; });
    const curCustom = () => PF.parse(PF.accent).custom ? PF.accent : (st.customKey || 'custom:210:60');
    const customTile = makeTile(curCustom(), 'Custom', true); customTile.onclick = () => choose(curCustom());
    const tilesAll = [...presetTiles, customTile]; grid.append(...tilesAll);

    /* custom colour sliders */
    const rng = (min, max) => { const r = o('input', 'rng'); r.type = 'range'; r.min = min; r.max = max; r.step = 1; return r; };
    const satIn = { value: '60' }, shadeIn = { value: '50' };
    const hueIn = rng(0, 360), hueOut = o('output');
    hueIn.setAttribute('aria-label', 'Hue'); hueIn.style.setProperty('--rng-bg', HUE_TRACK);
    const field = (t, out, inp) => { const l = o('label'), s = o('span'); s.append(document.createTextNode(t), out); l.append(s, inp); return l; };
    const pickerWrap = o('div', 'cz-picker-wrap'), pickerHead = o('div', 'cz-picker-head');
    const pickerTitle = o('span', '', 'Saturation & brightness'), pickerValue = o('output');
    const picker = o('div', 'cz-picker'), pickerThumb = o('span', 'cz-picker-thumb');
    picker.setAttribute('role', 'application'); picker.setAttribute('aria-label', 'Colour selection area. Drag horizontally for saturation and vertically for brightness.'); picker.tabIndex = 0;
    picker.append(pickerThumb); pickerHead.append(pickerTitle, pickerValue); pickerWrap.append(pickerHead, picker, o('small', 'cz-picker-help', 'Drag anywhere in the box to choose your colour'));
    editor.append(field('Hue', hueOut, hueIn), pickerWrap);
    const getPoint = e => {
      const r = picker.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      satIn.value = String(Math.round(x * 100));
      shadeIn.value = String(Math.round((1 - y) * 100));
    };
    const hueState = () => ({ h: +hueIn.value, s: +satIn.value, l: +shadeIn.value });
    const pickerInput = e => { getPoint(e); live(); };
    picker.addEventListener('pointerdown', e => { picker.setPointerCapture(e.pointerId); pickerInput(e); });
    picker.addEventListener('pointermove', e => { if (picker.hasPointerCapture(e.pointerId)) pickerInput(e); });
    picker.addEventListener('keydown', e => {
      const step = e.shiftKey ? 5 : 1, v = hueState();
      if (e.key === 'ArrowRight') satIn.value = String(Math.min(100, v.s + step));
      else if (e.key === 'ArrowLeft') satIn.value = String(Math.max(0, v.s - step));
      else if (e.key === 'ArrowUp') shadeIn.value = String(Math.min(100, v.l + step));
      else if (e.key === 'ArrowDown') shadeIn.value = String(Math.max(0, v.l - step));
      else return;
      e.preventDefault(); live();
    });
    const paintSliders = () => {
      const h = +hueIn.value, s = +satIn.value, l = +shadeIn.value, P = PF.palette(PF.customKey(h, s, l))[BeceTheme.mode];
      hueOut.textContent = h + '\u00B0'; pickerValue.textContent = 'S ' + Math.round(s) + '% · B ' + Math.round(l) + '%';
      picker.style.setProperty('--picker-h', h);
      pickerThumb.style.left = s + '%';
      pickerThumb.style.top = (100 - l) + '%';
      pickerThumb.style.background = `hsl(${h} ${s}% ${l}%)`;
      hueIn.style.setProperty('--rng-thumb', P.primary);
    };
    const live = () => {
      const key = PF.customKey(+hueIn.value, +satIn.value, +shadeIn.value); st.customKey = key;
      PF.applyAccent(key); queueSave({ color: key }); customTile.dataset.key = key; paintSliders(); renderAccount();
    };
    hueIn.oninput = live;

    const mark = () => {
      const cur = PF.parse(PF.accent), isC = !!cur.custom;
      tilesAll.forEach(t => t.setAttribute('aria-pressed', String(t.dataset.custom ? isC : t.dataset.key === cur.key)));
      editor.hidden = !isC;
      if (isC) { if (document.activeElement !== hueIn) hueIn.value = cur.h; if (document.activeElement !== picker) { satIn.value = cur.s; shadeIn.value = cur.l; } customTile.dataset.key = cur.key; st.customKey = cur.key; }
      tilesAll.forEach(paintTile); paintSliders();
    };
    function choose(key) { PF.applyAccent(key); queueSave({ color: key }); mark(); renderAccount(); }
    const surprise = o('button', 'btn btn-ghost btn-sm', '\u{1F3B2} Surprise me'); surprise.type = 'button';
    surprise.onclick = () => { const ks = Object.keys(PF.PRESETS).filter(k => k !== PF.accent); choose(ks[Math.floor(Math.random() * ks.length)]); };

    const lab = o('p', 'cz-label'); lab.append(document.createTextNode('Colour theme'), o('small', '', 'Recolours the whole app'));
    w.append(o('p', 'cz-label', 'Appearance'), seg, lab, grid, editor, o('p', 'cz-note', 'Your colour also shows next to your name on the friends board, in both light and dark mode.'));
    const r = o('div', 'cz-row'); r.style.marginTop = '14px'; r.append(surprise); w.append(r);
    st.refresh = mark; st.onTheme = () => { paintModes(); tilesAll.forEach(paintTile); paintSliders(); };
    paintModes(); mark();
    return w;
  }

  function aboutPanel() {
    const w = o('div', 'cz-section cz-about-panel'), d = me();
    const form = o('form', 'name-form'), lab = o('label', '', 'Name on the board'), inp = o('input'), save = o('button', 'btn btn-ghost btn-sm', 'Save name');
    inp.id = 'display-name'; inp.type = 'text'; inp.value = nameOf(S.uid); inp.maxLength = 30; inp.minLength = 2; inp.required = true; lab.htmlFor = 'display-name'; save.type = 'submit';
    form.append(lab, inp, save);
    form.onsubmit = e => { e.preventDefault(); const v = inp.value.trim(); if (v.length < 2) return; queueSave({ displayName: v }); paint(); renderAccount(); };

    const bl = o('p', 'cz-label'), cnt = o('small', 'bio-count', `${(d.bio || '').length}/60`), bio = o('input');
    cnt.setAttribute('aria-live', 'polite'); cnt.setAttribute('aria-label', 'Status line character count');
    bl.append(document.createTextNode('Status line'), cnt);
    bio.type = 'text'; bio.id = 'bio-input'; bio.maxLength = 60; bio.placeholder = 'What are you revising for?'; bio.value = d.bio || ''; bio.setAttribute('aria-label', 'Status line');
    const apply = v => { cnt.textContent = `${v.length}/60`; queueSave({ bio: v.trim() }); paint(); };
    bio.oninput = () => apply(bio.value);
    const ideas = o('div', 'chip-row'); ideas.style.marginTop = '12px';
    BIO_IDEAS.forEach(t => { const c = o('button', 'chip', t); c.type = 'button'; c.onclick = () => { bio.value = t; apply(t); }; ideas.append(c); });
    w.append(form, bl, bio, ideas, o('p', 'cz-note', 'Friends see this line when they open your profile. It saves automatically.'));
    st.refresh = () => { if (document.activeElement !== bio) { bio.value = me().bio || ''; cnt.textContent = `${bio.value.length}/60`; } if (document.activeElement !== inp) inp.value = nameOf(S.uid); };
    return w;
  }

  const TABS = [['avatar', 'Avatar', '\u{1F642}'], ['theme', 'Theme', '\u{1F3A8}'], ['about', 'About me', '\u270D\uFE0F']];
  function renderTabs() {
    tabs.replaceChildren(...TABS.map(([id, label, emoji]) => {
      const b = o('button', 'profile-tab', `${emoji} ${label}`); b.type = 'button'; b.setAttribute('role', 'tab'); b.id = 'cz-tab-' + id;
      b.setAttribute('aria-selected', String(st.tab === id)); b.tabIndex = st.tab === id ? 0 : -1;
      b.onclick = () => { st.tab = id; renderTabs(); renderPanel(); }; return b;
    }));
  }
  tabs.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = TABS.findIndex(t => t[0] === st.tab), n = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    st.tab = TABS[n][0]; renderTabs(); renderPanel(); $('cz-tab-' + st.tab).focus(); e.preventDefault();
  });
  function renderPanel() {
    st.refresh = null; st.onTheme = null;
    panel.setAttribute('aria-labelledby', 'cz-tab-' + st.tab);
    panel.replaceChildren(st.tab === 'avatar' ? avatarPanel() : st.tab === 'theme' ? themePanel() : aboutPanel());
    panel.classList.remove('motion-profile-panel-enter');
    void panel.offsetWidth;
    panel.classList.add('motion-profile-panel-enter');
  }
  document.addEventListener('bece:theme', () => { if (st.onTheme) st.onTheme(); });

  function setOpen(v) {
    S.czOpen = v; cz.hidden = !v; toggle.setAttribute('aria-expanded', String(v));
    toggle.className = 'btn btn-sm ' + (v ? 'btn-ghost' : 'btn-primary'); toggle.textContent = v ? 'Done' : '\u2728 Customise';
  }
  toggle.onclick = () => { setOpen(cz.hidden); if (!cz.hidden) renderPanel(); };
  renderTabs(); renderPanel(); setOpen(S.czOpen !== false);

  return {
    el, status: setStatus,
    update(x) {
      subEl.textContent = `Level ${x.level} \u00B7 ${x.ex} EXP`;
      tiles.replaceChildren(tile(String(x.ex), 'Total EXP'), tile(`Lv ${x.level}`, `${LVL - x.into} EXP to next`), tile(`\u{1F525} ${x.streak}`, `Day streak \u00B7 best ${x.best}`), tile(x.rank ? `#${x.rank}` : '\u2014', `of ${plural(x.count, 'player')}`));
      meter.max = LVL; meter.value = x.into; paint();
      staffRow.hidden = !S.isAdmin;
      if (st.refresh && !S.pend && !S.saveT) st.refresh();
    },
  };
}

function showFtab() {
  if (!S.frWrap || !S.ftabs) return;
  S.boardHost.hidden = false;
  S.ftabs.hidden = true;
  S.ftabs.replaceChildren();
  Adm.sync();
}
function renderFriends() {
  const body = $('friends-body'); if (!body) return;
  if (!S.db || S.banned || !S.ready) {
    const c = o('div', 'card friends-gate');
    c.append(o('h2', '', S.banned ? 'Account access paused' : 'Your social features are loading'),
      o('p', 'muted', S.banned ? 'Your account cannot access the friends board, duels or shop right now.' : 'Connect to the friends service and reload to use profiles, duels and the coin shop. Your quizzes and notes remain available.'));
    body.replaceChildren(c);
    ['duels-body', 'shop-body', 'me-body'].forEach(id => { const host = $(id); if (host) host.replaceChildren(c.cloneNode(true)); });
    return;
  }
  const m = view(), base = S.players.some(p => p.id === S.uid) ? S.players : [...S.players, { id: S.uid, ...(S.doc || {}) }], wk = weekStart(), td = today(), B = S.board;
  const val = p => B === 'day' ? (p.dayKey === td ? p.dayExp || 0 : 0) : B === 'week' ? (p.weekKey === wk ? p.weekExp || 0 : 0) : (p.totalExp || 0);
  const tot = (a, b) => (b.totalExp || 0) - (a.totalExp || 0);
  const list = base.filter(p => (B === 'everyone' ? (p.displayName || p.totalExp) : val(p) > 0) || p.id === S.uid).sort((a, b) => val(b) - val(a) || tot(a, b));
  const allList = base.filter(p => (p.totalExp || 0) > 0 || p.id === S.uid).sort(tot);
  const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'], actv = p => (p.lastDay === td ? 'active today' : p.lastDay === yesterday() ? 'active yesterday' : p.lastDay ? 'last seen ' + p.lastDay : 'new here');
  const myRank = allList.findIndex(p => p.id === S.uid) + 1, ex = m ? m.totalExp : 0, { level, into } = lv(ex);

  // The profile card is permanent (so editing is never interrupted); only the board below is rebuilt.
  if (!S.pc) S.pc = buildProfileCard();
  Duel.paint(); Shop.render();
  S.pc.update({ ex, level, into, streak: m ? m.streak : 0, best: m ? m.bestStreak : 0, rank: myRank, count: allList.length });

  let lbNote = ''; const lb = o('section', 'card leaderboard'), head = o('div', 'section-heading'), hd = o('div');
  hd.append(o('p', 'eyebrow', 'The friends board'), o('h2', '', 'Who\u2019s putting in the work?')); head.append(hd);
  const tg = o('div', 'board-seg'); head.append(o('span', 'section-meta', plural(list.length, 'player')));
  [['day', 'Today'], ['week', 'Week'], ['all', 'All time'], ['everyone', 'Everyone']].forEach(([k, t]) => {
    const b = o('button', '', t);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(B === k));
    b.onclick = () => {
      const changed = S.board !== k;
      S.board = k;
      renderFriends();
      if (changed) {
        const selected = body.querySelector('.board-seg button[aria-pressed="true"]');
        replayMotion(selected, 'motion-board-filter-selected');
      }
    };
    tg.append(b);
  });
  if (B === 'day') lbNote = 'Today\u2019s board resets at midnight. EXP counts from this update onward.';
  else if (B === 'week') lbNote = 'Weekly board resets every Monday. EXP counts from this update onward.';
  else if (B === 'everyone') lbNote = 'Everyone who has used the app, even with no EXP yet.';
  const pod = B !== 'everyone' && list.length >= 3 && list.slice(0, 3).every(p => val(p) > 0), from = pod ? 3 : 0;
  const ol = o('ol', 'board-list');
  list.forEach((p, i) => {
    if (i < from) return;
    const li = o('li', p.id === S.uid ? 'is-me' : ''), w = o('div', 'board-who'), n = tint(o('strong', '', nameOf(p.id)), p);
    if (p.id === S.uid) n.append(o('span', 'you-tag', 'you'));
    addTitleBadge(n, p);
    const live = p.lastDay === today() || p.lastDay === yesterday();
    li.append(o('span', 'board-rank', i < 3 && B !== 'everyone' ? medals[i] : String(i + 1)), bubble(p, 36));
    w.append(n, o('span', '', B === 'everyone' ? `${p.totalExp || 0} EXP \xB7 ${actv(p)}${p.duelW || p.duelL ? ` \xB7 \u2694\uFE0F ${p.duelW || 0}-${p.duelL || 0}` : ''}` : `Level ${lv(p.totalExp || 0).level}${live && p.streak ? ` \xB7 \u{1F525} ${p.streak}` : ''}${p.challengeState && p.challengeState.day === today() && (p.challengeState.claimed || []).length ? ' \xB7 challenges \u2713' : ''}`));
    if (p.bio) w.append(o('span', 'board-bio', p.bio));
    li.append(w, o('span', 'board-exp', B === 'everyone' ? `Lv ${lv(p.totalExp || 0).level}` : `${val(p)} EXP`));
    li.tabIndex = 0; li.setAttribute('role', 'button'); li.setAttribute('aria-label', `See ${nameOf(p.id)}\u2019s stats`);
    li.onclick = () => showFriend(p); li.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showFriend(p); } };
    ol.append(li);
  });
  const podEl = o('div', 'podium');
  if (pod) [1, 0, 2].forEach(k => { const q = list[k], d = o('button', 'pod pod-' + (k + 1) + (q.id === S.uid ? ' is-me' : '')); d.type = 'button'; const podName = tint(o('strong', '', nameOf(q.id)), q); addTitleBadge(podName, q); d.append(o('span', 'pod-medal', medals[k]), bubble(q, k === 0 ? 56 : 46), podName, o('span', 'pod-exp', `${val(q)} EXP`)); d.onclick = () => showFriend(q); podEl.append(d); });
  lb.append(head, tg); if (pod) lb.append(podEl); lb.append(ol); lb.append(o('p', 'muted', 'Tap a player to see their stats.')); if (lbNote) lb.append(o('p', 'muted', lbNote));
  if (list.length < 2) {
    const h = o('div', 'board-hint'); h.append(o('p', '', 'It\u2019s just you so far. Share this page\u2019s link so friends can join.')); lb.append(h);
  }
  const act = o('section', 'card activity'); act.append(o('p', 'eyebrow', 'Recent activity'));
  const ul = o('ul', 'activity-list');
  const items = S.players.flatMap(p => (p.recent || []).map(r => ({ ...r, id: p.id }))).sort((a, b) => b.at - a.at).slice(0, 15);
  if (!items.length) ul.append(o('li', 'muted', 'No quizzes finished yet. Be the first!'));
  items.forEach(r => {
    const li = o('li'), p = o('p'); p.append(o('strong', '', nameOf(r.id)), document.createTextNode(` ${r.kind === 'daily' ? 'finished the daily quiz' : 'practised ' + r.subject} \xB7 ${r.correct}/${r.total}`));
    li.append(p, o('span', 'activity-exp', `+${r.exp}`), o('span', 'activity-time', ago(r.at))); ul.append(li);
  });
  act.append(ul);
  const g = o('div', 'friends-grid'); g.append(lb, act);
  if (!S.frWrap) {
    S.frWrap = o('div'); S.boardHost = o('div'); S.ftab = S.ftab || 'board'; S.ftabs = o('div', 'f-tabs');
    S.ftabs.setAttribute('role', 'tablist'); S.ftabs.hidden = true;
    S.frWrap.append(S.ftabs, S.boardHost);
  }
  showFtab();
  S.boardHost.replaceChildren(g);
  if (body.firstChild !== S.frWrap || body.childNodes.length !== 1) body.replaceChildren(S.frWrap);
  const duelsBody = $('duels-body'), shopBody = $('shop-body'), meBody = $('me-body');
  if (duelsBody) { const card = Duel.card(); card.hidden = false; duelsBody.replaceChildren(card); }
  if (shopBody) { const shop = Shop.el(); shop.hidden = false; shopBody.replaceChildren(shop); }
  if (meBody) { S.pc.el.hidden = false; meBody.replaceChildren(S.pc.el); }
}

// ===== FIREBASE SETUP: paste your own values from the Firebase console here =====
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA36Sz0tHENZbP4M7QXZzW4QzlqdBWr16Y",
  authDomain: "bece-hub-d9ad5.firebaseapp.com",
  projectId: "bece-hub-d9ad5",
  storageBucket: "bece-hub-d9ad5.firebasestorage.app",
  messagingSenderId: "264055011753",
  appId: "1:264055011753:web:447aa8cc55afbdde6d2cb8"
};
// ================================================================================
function loadScript(src) { return new Promise((res, rej) => { const t = document.createElement('script'); t.src = src; t.onload = res; t.onerror = rej; document.head.appendChild(t); }); }
async function connectFirebase() {
  if (!FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.startsWith('PASTE')) throw new Error('Firebase not configured');
  const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
  await loadScript(base + 'firebase-app-compat.js');
  await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-firestore-compat.js')]);
  firebase.initializeApp(FIREBASE_CONFIG);
  const cred = await firebase.auth().signInAnonymously();
  return { db: firebase.firestore(), uid: cred.user.uid };
}


/* ===== Coin shop ===== */
const SHOP = {
  titles: [
    { id: 't_bookworm',  name: 'Bookworm',    icon: '📚', price: 80  },
    { id: 't_scholar',   name: 'Scholar',      icon: '🧠', price: 120 },
    { id: 't_champion',  name: 'Champion',     icon: '🏆', price: 160 },
    { id: 't_legend',    name: 'Legend',       icon: '🌟', price: 300 },
  ],
  sfreeze: { id: 'sfreeze', name: 'Streak Freeze', price: 30 },
  xpboost: { id: 'xpboost', name: 'XP Boost',      price: 50 },
  p50:     { id: 'p50',     name: 'Second Chance',  price: 15 },
};
const SHOP_TITLES = Object.fromEntries((SHOP.titles || []).map(t => [t.id, t]));
const GEM_SHOP = Object.freeze({
  profileRing: Object.freeze({ id: 'profile-ring-gold', name: 'Golden Profile Ring', price: 50 })
});
function tint(el, p) { /* name colours removed — kept for compat */ return el; }
function adminBadge(id) { const owner = id ? !!(S.owners && S.owners.has(id)) : !!S.isOwner, b = document.createElement('span'); b.className = 'board-title ' + (owner ? 'board-owner' : 'board-admin'); setIconAwareText(b, owner ? '\u{1F451} Owner' : '\u{1F6E1}\uFE0F Admin'); return b; }
function addTitleBadge(container, p) { if (p && p.id && S.admins.has(p.id)) container.append(adminBadge(p.id)); const t = p && p.eq && SHOP_TITLES[p.eq.title]; if (t) { const badge = document.createElement('span'); badge.className = 'board-title'; badge.textContent = t.icon + ' ' + t.name; container.append(badge); } }
const Shop = (() => {
  let el = null, bal = null, body = null, activeTab = 'coins';
  const btn = (t, c, f) => { const b = o('button', 'btn ' + c, t); b.type = 'button'; b.onclick = f; return b; };
  const warn = m => App.toast(m, 'warn');
  function pulseShopItem(id, slot) {
    requestAnimationFrame(() => {
      const card = [...document.querySelectorAll('.shop-item[data-shop-item], .gem-item[data-shop-item]')]
        .find(node => node.dataset.shopItem === String(id) && (!slot || node.dataset.shopSlot === String(slot)));
      if (card) replayMotion(card, 'motion-shop-item-confirmed');
    });
  }
  function equip(slot, id) {
    const eq = (S.doc && S.doc.eq) || {};
    queueSave({ eq: { ...eq, [slot]: eq[slot] === id ? '' : id } });
    render(); renderFriends(); pulseShopItem(id, slot);
  }
  async function buy(it, slot) {
    const d = S.doc || {};
    if (S.settings.shopPaused && !S.isOwner) return warn('Shop purchases are temporarily paused.');
    if ((d.coins || 0) < it.price) return warn('Not enough coins yet. Keep practising!');
    if (!S.db) return warn('You need to be online to buy.');
    const F = firebase.firestore.FieldValue;
    let patch, docPatch;
    if (slot === 'p50')     { patch = { coins: F.increment(-it.price), p50: F.increment(1) };       docPatch = { p50: (d.p50 || 0) + 1 }; }
    else if (slot === 'sfreeze') { patch = { coins: F.increment(-it.price), sfreezes: F.increment(1) }; docPatch = { sfreezes: (d.sfreezes || 0) + 1 }; }
    else if (slot === 'xpboost') { patch = { coins: F.increment(-it.price), xpBoost: F.increment(1) };  docPatch = { xpBoost: (d.xpBoost || 0) + 1 }; }
    else { patch = { coins: F.increment(-it.price), owned: { [it.id]: true } }; docPatch = { owned: { ...(d.owned || {}), [it.id]: true } }; }
    try {
      await S.db.doc('players/' + S.uid).set(patch, { merge: true });
      S.doc = { ...d, coins: (d.coins || 0) - it.price, ...docPatch };
      App.toast(`Bought ${it.name}!`);
      if (['p50', 'sfreeze', 'xpboost'].includes(slot)) { render(); pulseShopItem(slot, 'consumable'); } else equip(slot, it.id);
    } catch (e) { warn(`Couldn\u2019t buy that (${(e && e.code) || 'error'}).`); }
  }
  function wideItem(icon, title, desc, btnEl, slot) {
    const c = o('div', 'shop-item shop-wide');
    c.dataset.shopItem = String(slot || title); c.dataset.shopSlot = 'consumable';
    c.append(o('strong', '', icon + ' ' + title), o('span', 'muted', desc), btnEl); return c;
  }
  function group(title, items, preview, slot) {
    const d = S.doc || {}, owned = d.owned || {}, eq = d.eq || {}, g = o('section', 'shop-group'), grid = o('div', 'shop-grid');
    g.append(o('h3', '', title), grid);
    items.forEach(it => {
      const c = o('div', 'shop-item'), pv = o('div', 'shop-prev');
      c.dataset.shopItem = String(it.id); c.dataset.shopSlot = String(slot);
      pv.append(preview(it));
      let b;
      if (owned[it.id]) b = eq[slot] === it.id ? btn('Equipped \u2713', 'btn-ghost btn-sm', () => equip(slot, it.id)) : btn('Equip', 'btn-primary btn-sm', () => equip(slot, it.id));
      else b = btn(`Buy \u{1F4B0} ${it.price}`, (d.coins || 0) >= it.price ? 'btn-primary btn-sm' : 'btn-ghost btn-sm', () => buy(it, slot));
      c.append(pv, o('strong', '', it.name), b); grid.append(c);
    });
    return g;
  }
  async function equipGemCosmetic(id) {
    const d = S.doc || {}, owned = d.gemCosmetics || {};
    if (!owned[id]) return warn('You need to own this cosmetic before equipping it.');
    if (!S.db || !S.uid) return warn('Connect to the internet before changing cosmetics.');
    const next = d.equippedGemCosmetic === id ? '' : id;
    try {
      await S.db.doc('players/' + S.uid).set({ equippedGemCosmetic: next }, { merge: true });
      S.doc = { ...d, equippedGemCosmetic: next };
      App.toast(next ? 'Profile ring equipped!' : 'Profile ring removed.', 'good');
      render(); GemShop.render(); renderFriends(); pulseShopItem(id, 'gem');
    } catch (error) {
      warn('Could not update your profile ring. Please try again.');
    }
  }
  async function buyGemCosmetic(it, button) {
    const d = S.doc || {};
    if (S.settings.shopPaused && !S.isOwner) return warn('Shop purchases are temporarily paused.');
    if (!S.db || !S.uid) return warn('You need to be online to buy.');
    if ((d.gemCosmetics || {})[it.id]) return render();
    button.disabled = true;
    button.textContent = 'Purchasing…';
    const operationId = 'purchase.' + it.id + '.' + Date.now() + '.' + Math.random().toString(36).slice(2, 8);
    try {
      await Gems.purchaseCosmetic(it.id, operationId);
      if (!S.doc || !S.doc.gemCosmetics || S.doc.gemCosmetics[it.id] !== true) {
        const error = new Error('PURCHASE_NOT_CONFIRMED');
        error.code = 'PURCHASE_NOT_CONFIRMED';
        throw error;
      }
      App.toast('Bought ' + it.name + '! It is now equipped.', 'good');
      render(); GemShop.render(); renderFriends(); pulseShopItem(it.id, 'gem');
    } catch (error) {
      button.disabled = false;
      setIconAwareText(button, 'Buy 💎 ' + it.price);
      warn(error && error.code === 'INSUFFICIENT_GEMS'
        ? 'Not enough Gems yet. Keep practising.'
        : 'Could not complete that purchase. Please try again.');
    }
  }
  function gemStore(d) {
    const it = GEM_SHOP.profileRing, owned = (d.gemCosmetics || {})[it.id] === true;
    const equipped = owned && d.equippedGemCosmetic === it.id;
    const section = o('section', 'gem-store');
    const head = o('div', 'gem-store-head');
    head.append(o('h3', '', 'Gem Shop'), o('span', 'gem-store-balance', '💎 ' + Gems.getBalance()));
    const card = o('div', 'gem-item'), previewBox = o('div', 'gem-item-preview');
    card.dataset.shopItem = String(it.id); card.dataset.shopSlot = 'gem';
    const preview = bubble({ id: S.uid, avatar: '⭐', color: d.color || '', gemCosmetics: {}, equippedGemCosmetic: '' }, 54);
    preview.dataset.gemRing = 'gold';
    previewBox.append(preview);
    const copy = o('div', 'gem-item-copy');
    copy.append(o('strong', '', it.name), o('span', 'muted', 'A decorative ring around your profile picture.'));
    copy.append(o('span', 'muted', 'One cosmetic for now. More items can be added later.'));
    let action;
    if (!owned) action = btn('Buy 💎 ' + it.price, 'btn-primary btn-sm', () => buyGemCosmetic(it, action));
    else action = btn(equipped ? 'Equipped ✓' : 'Equip', equipped ? 'btn-ghost btn-sm' : 'btn-primary btn-sm', () => equipGemCosmetic(it.id));
    card.append(previewBox, copy, action);
    section.append(head, card);
    return section;
  }
  function render() {
    if (!el) return;
    const d = S.doc || {}, eq = d.eq || {};
    setIconAwareText(bal, `\u{1F4B0} ${d.coins || 0}`);
    const canAfford = price => (d.coins || 0) >= price ? 'btn-primary btn-sm' : 'btn-ghost btn-sm';

    // Consumables section
    const cons = o('section', 'shop-group');
    cons.append(o('h3', '', 'Power-ups'));
    cons.append(
      wideItem('\u{1F6E1}\uFE0F', 'Streak Freeze', `Protects your streak for one missed day. You have ${d.sfreezes || 0}.`,
        btn(`Buy \u{1F4B0} ${SHOP.sfreeze.price}`, canAfford(SHOP.sfreeze.price), () => buy(SHOP.sfreeze, 'sfreeze')), 'sfreeze'),
      wideItem('\u26A1', 'XP Boost', `Doubles EXP on your next quiz. You have ${d.xpBoost || 0}.`,
        btn(`Buy \u{1F4B0} ${SHOP.xpboost.price}`, canAfford(SHOP.xpboost.price), () => buy(SHOP.xpboost, 'xpboost')), 'xpboost'),
      wideItem('\u{1F3AF}', 'Second Chance', `Use in a duel: if you answer wrong, pick again (without hints). You have ${d.p50 || 0}.`,
        btn(`Buy \u{1F4B0} ${SHOP.p50.price}`, canAfford(SHOP.p50.price), () => buy(SHOP.p50, 'p50')), 'p50'),
    );

    // Titles section
    const titlesGroup = group('Board titles', SHOP.titles, it => {
      const s = o('div'); s.style.cssText = 'font-size:22px;padding:4px 0'; s.textContent = it.icon;
      const badge = o('span', 'board-title', it.icon + ' ' + it.name); s.append(badge); return s;
    }, 'title');

    const paused = !!S.settings.shopPaused && !S.isOwner;
    if (paused) {
      [...cons.querySelectorAll('button'), ...titlesGroup.querySelectorAll('button')].forEach(button => {
        if (button.textContent.trim().startsWith('Buy')) { button.disabled = true; button.textContent = 'Shop paused'; }
      });
    }
    const content = [];
    if (paused) content.push(o('div', 'shop-paused-notice', o('strong', '', '🛍️ Shop purchases paused'), o('p', '', 'The owner has temporarily paused new purchases. Your owned items are still available.')));
    content.push(cons, titlesGroup);
    body.replaceChildren(...content);
    if (activeTab === 'gems') GemShop.render();
  }
  function selectTab(tab) {
    activeTab = tab === 'gems' ? 'gems' : 'coins';
    const coinHost = $('shop-body'), gemHost = $('gemshop-body');
    if (coinHost && !coinHost.firstElementChild) coinHost.append(el || build());
    if (coinHost) coinHost.hidden = activeTab !== 'coins';
    if (gemHost) gemHost.hidden = activeTab !== 'gems';
    document.querySelectorAll('[data-shop-tab]').forEach(button => {
      const selected = button.dataset.shopTab === activeTab;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
    });
    if (activeTab === 'gems') GemShop.render();
    else render();
  }
  function build() {
    el = o('section', 'card shop'); bal = o('strong', 'shop-bal'); body = o('div', 'shop-body');
    const head = o('div', 'shop-head'); head.append(o('span', 'duel-lbl', 'Your coins'), bal,
      o('p', 'muted', 'Earn coins: 1 per new correct answer, bonus coins from daily challenges and streaks, and from duels (win 5, draw 2, played 1; up to 10 duels a day).'));
    el.append(head, body); render(); return el;
  }
  return { el: () => el || build(), render, gemStore, selectTab };
})();

const GemShop = (() => {
  let el = null;
  function render() {
    const host = $('gemshop-body');
    if (!el) el = o('section', 'card gem-shop-card');
    el.replaceChildren(Shop.gemStore(S.doc || {}));
    if (host && !host.contains(el)) host.replaceChildren(el);
  }
  return { el: () => { render(); return el; }, render };
})();
window.Shop = Shop;
window.GemShop = GemShop;
document.querySelectorAll('[data-shop-tab]').forEach(button => {
  button.addEventListener('click', () => App.navigate(button.dataset.shopTab === 'gems' ? 'gemshop' : 'shop'));
});
if (location.hash.startsWith('#/shop') || location.hash.startsWith('#/gemshop')) {
  Shop.selectTab(location.hash.startsWith('#/gemshop') ? 'gems' : 'coins');
}

/* ===== 1v1 Duel (Firestore collection "duels") ===== */
const Duel = (() => {
  const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const SUBS = { mixed: 'Mixed subjects', social: 'Social Studies', arts: 'Creative Arts', maths: 'Mathematics', computing: 'Computing', rme: 'RME', integratedScience: 'Integrated Science', french: 'French', careerTechnology: 'Career Technology' };
  const LENS = [5, 8, 10, 15, 20], TIMES = [10, 15, 20, 30];
  const D = { open: [], code: null, doc: null, unsub: null, started: false, cd: false, idx: 0, me: null, log: [], timer: null, locked: false, card: null, list: null, err: null, cfg: { subjects: ['social'], subjectCount: 1, len: 8, secs: 15, vis: 'public' } };
  const mix = a => [...a].sort(() => Math.random() - .5);
  const col = () => S.db.collection('duels');
  const myName = () => (S.doc && S.doc.displayName) || 'Player';
  const total = () => D.doc.qids.length, secs = () => D.doc.secs || 15;
  const oppId = () => (D.doc.host === S.uid ? D.doc.guest : D.doc.host);
  const oppName = () => (D.doc.host === S.uid ? D.doc.guestName : D.doc.hostName) || 'Opponent';
  const row = (...n) => { const r = o('div', 'button-row'); r.append(...n); return r; };
  const btn = (t, c, f) => { const b = o('button', 'btn ' + c, t); b.type = 'button'; b.onclick = f; return b; };
  const warn = m => App.toast(m, 'warn');
  const who = id => (id === S.uid ? { id, ...(S.doc || {}) } : S.players.find(x => x.id === id) || { id });
  const av = (id, n) => bubble(who(id), n);
  const chips = (...t) => { const c = o('div', 'duel-chips'); t.filter(Boolean).forEach(x => c.append(o('span', '', x))); return c; };
  const subjectNames = subjects => (subjects || []).map(k => SUBS[k] || k).join(' + ') || 'Mixed subjects';
  const cfgChips = d => chips(subjectNames(d.subjects || (d.subject && d.subject !== 'mixed' ? [d.subject] : [])), `${(d.qids || []).length} questions`, `${d.secs || 15}s each`, d.vis === 'private' ? '\u{1F512} Private' : '\u{1F310} Public');
  const buzz = n => { try { navigator.vibrate && navigator.vibrate(n); } catch {} };
  let box = null;
  let lastLobbyCode = '', lastResultCode = '';
  function put(...n) {
    if (!box || !box.isConnected) {
      const m = o('div', 'friend-modal duel-modal'); m.id = 'duel-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
      m.addEventListener('keydown', e => { if (e.key === 'Escape') leave(); });
      m.addEventListener('click', e => { if (e.target === m) leave(); });
      box = o('div', 'duel-box card'); m.append(box); document.body.append(m);
    }
    const x = o('button', 'duel-x', '\u2715'); x.type = 'button'; x.id = 'duel-x'; x.setAttribute('aria-label', 'Leave duel'); x.onclick = leave;
    const top = o('div', 'duel-top'); top.append(o('span', 'eyebrow', '1v1 duel' + (D.doc ? ' \u00B7 ' + (SUBS[D.doc.subject] || 'Mixed') : '')), x);
    box.replaceChildren(top, ...n);
  }
  function record(out, forceCoins) {
    if (!D.code || !D.doc || D.recd === D.code || (D.doc.rec && D.doc.rec[S.uid])) return 0;
    D.recd = D.code;
    const F = firebase.firestore.FieldValue, k = out === 'w' ? 'duelW' : out === 'l' ? 'duelL' : 'duelD';
    const d = S.doc || {}, td = today(), n = d.dcDay === td ? d.dcN || 0 : 0;
    const base = out === 'w' ? 5 : out === 'd' ? 2 : 1, parts = [];
    let c = 0; D.limit = false;
    if (forceCoins !== 0 && n >= 10) D.limit = true;
    else if (forceCoins !== 0) {
      parts.push({ label: out === 'w' ? '\u{1F3C6} Duel won' : out === 'd' ? '\u{1F91D} Draw' : '\u2694\uFE0F Duel played', n: base });
      const inRow = Math.min(3, Math.floor((D.best || 0) / 3));                  // +1 for every 3 right answers in a row (best run), up to +3
      if (inRow) parts.push({ label: `\u{1F525} Best run: ${D.best} in a row`, n: inRow });
      if (D.me && D.me.c === total() && total() >= 3) parts.push({ label: '\u{1F31F} Perfect score', n: 2 });
      const ds = d.lastDay === td || d.lastDay === (typeof yesterday === 'function' ? yesterday() : '') ? d.streak || 0 : 0;
      const dayCoins = Math.min(3, Math.floor(ds / 3));                           // daily streak: +1 per 3 days, up to +3
      if (dayCoins) parts.push({ label: `\u{1F4C5} ${ds}-day streak bonus`, n: dayCoins });
      c = parts.reduce((a, p) => a + p.n, 0);
    }
    D.coinParts = parts; D.bal = (d.coins || 0) + c;
    const b = S.db.batch();
    b.set(S.db.doc('players/' + S.uid), { [k]: F.increment(1), ...(c ? { coins: F.increment(c), dcDay: td, dcN: n + 1 } : {}) }, { merge: true });
    b.update(col().doc(D.code), { ['rec.' + S.uid]: true });
    b.commit().catch(() => { D.recd = null; });
    return c;
  }
  function push() { if (D.code && D.me) col().doc(D.code).update({ ['res.' + S.uid]: { ...D.me } }).catch(() => {}); }
  function leave() {
    const playing = D.doc && D.started && D.me && !D.me.done, x = $('duel-x');
    if (playing && !D.armed) { D.armed = true; if (x) setIconAwareText(x, 'Forfeit?'); setTimeout(() => { D.armed = false; const y = $('duel-x'); if (y) setIconAwareText(y, '\u2715'); }, 3000); return; }
    D.armed = false; close(true);
  }
  function close() {
    if (D.me && !D.me.done && D.started) { D.me.done = true; D.me.ms += (total() - D.me.n) * secs() * 1000; D.me.n = total(); push(); record('l', 0); }
    clearInterval(D.timer); clearInterval(D.scT); clearInterval(D.cdT); clearInterval(D.hbT); clearTimeout(D.wait);
    if (D.unsub) { D.unsub(); D.unsub = null; }
    if (D.doc && D.doc.state === 'waiting' && D.doc.host === S.uid) col().doc(D.code).delete().catch(() => {});
    D.code = D.doc = D.me = null; D.started = D.cd = false; box = null; lastLobbyCode = ''; lastResultCode = '';
    const m = $('duel-modal'); if (m) m.remove();
  }
  function watch(code) {
    D.code = code; D.started = false; D.cd = false; D.me = null;
    const hostSubjects = D.doc && D.doc.host === S.uid && Array.isArray(D.doc.subjects)
      ? D.doc.subjects.slice() : null;
    if (D.unsub) D.unsub();
    D.unsub = col().doc(code).onSnapshot(s => {
      if (!s.exists) { if (D.doc && D.doc.state === 'waiting') { App.toast('Duel cancelled.'); close(); } return; }
      const saved = s.data();
      D.doc = hostSubjects ? { ...saved, subjects: hostSubjects } : saved;
      step();
    }, e => { warn(`Lost connection to the duel (${(e && e.code) || 'error'}).`); close(); });
  }
  function step() { try { step2(); } catch (e) { console.error(e); close(); } }
  function step2() {
    const d = D.doc; if (!d) return;
    if (d.state === 'waiting') return lobby();
    if (!D.started) { if (!D.cd) countdown(); return; }
    if (D.me && D.me.done) return waitOrResult();
    paintScore();
  }
  function lobby() {
    const isNewLobby = D.code !== lastLobbyCode;
    if (isNewLobby) lastLobbyCode = D.code;
    let shareButton = null;
    const share = async () => {
      const text = `Duel me on BECE Hub! Open the Friends tab and join with code ${D.code}`;
      try {
        if (navigator.share) {
          await navigator.share({ text });
          App.toast('Invite shared.', 'good');
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          App.toast('Invite copied.', 'good');
        } else {
          App.toast('Sharing is not available in this browser.', 'warn');
          return;
        }
        if (shareButton && shareButton.isConnected) replayMotion(shareButton, 'motion-duel-invite-shared');
      } catch (error) {
        if (error && error.name === 'AbortError') return;
        App.toast('Could not share the invite. Please try again.', 'warn');
      }
    };
    shareButton = btn('Share invite', 'btn-primary btn-sm', share);
    put(o('h2', 'pulse-text', 'Waiting for an opponent…'), cfgChips(D.doc),
      o('p', 'muted', D.doc.vis === 'private' ? 'Private: only people with this code can join.' : 'Public: it also shows under Open challenges for everyone on the Friends tab.'),
      o('div', 'duel-code', D.code), row(shareButton, btn('Cancel', 'btn-ghost btn-sm', () => close())));
    if (isNewLobby) replayMotion(box && box.querySelector('.duel-code'), 'motion-duel-lobby-code-enter');
  }
  function countdown() {
    D.cd = true; clearInterval(D.cdT);
    const n = o('div', 'duel-count');
    const at = Date.now() + 3600;   // each device counts from the moment it sees the duel start, so clock differences between PC and phone no longer matter
    const tick = () => { const left = at - Date.now(), sec = Math.ceil(left / 1000); if (left <= 0) { clearInterval(D.cdT); D.cd = false; n.textContent = ''; begin(); } else { const t = sec > 3 ? 'Ready?' : String(sec); if (n.textContent !== t) { n.textContent = t; n.classList.remove('tick'); void n.offsetWidth; n.classList.add('tick'); } } };
    const vs = o('div', 'duel-vs duel-vs-big'); const a = o('div', 'duel-side'), b = o('div', 'duel-side opp');
    a.append(av(S.uid, 44), o('span', 'duel-nm', 'You')); b.append(av(oppId(), 44), o('span', 'duel-nm', oppName())); vs.append(a, o('b', 'duel-x2', 'VS'), b);
    put(o('p', 'eyebrow', 'Duel found'), vs, cfgChips(D.doc), n, o('p', 'muted', 'Get ready\u2026'));
    replayMotion(box && box.querySelector('.duel-vs-big'), 'motion-duel-countdown-enter');
    tick(); D.cdT = setInterval(tick, 200);
  }
  function begin() { D.started = true; D.used = 0; D.idx = 0; D.log = []; D.streak = 0; D.best = 0; D.oppN = 0; D.me = { c: 0, n: 0, ms: 0, done: false }; ask(); }
  function paintScore() {
    if (!D.meSc || !D.doc || !D.me) return;
    const r = (D.doc.res || {})[oppId()] || { c: 0, n: 0 };
    const bump = (el, v) => { if (el.textContent !== String(v)) { el.textContent = v; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } };
    bump(D.meSc, D.me.c); D.meSub.textContent = `${D.me.n}/${total()} done`;
    bump(D.oppSc, r.c); D.oppSub.textContent = `${r.n}/${total()} done`;
    if (r.n !== D.oppN) { D.oppN = r.n; const sd = D.oppSc.parentNode; if (sd) { sd.classList.remove('ping'); void sd.offsetWidth; sd.classList.add('ping'); } }
  }
  function ask() {
    clearInterval(D.timer); clearInterval(D.scT); box && box.classList.remove('d-out', 'flash-ok', 'flash-bad');
    const id = D.doc.qids[D.idx]; if (!id) return finish();
    const q = App.questionById(id);
    if (!q) { D.me.n++; D.me.ms += secs() * 1000; D.log.push({ id, key: null, ok: false }); D.idx++; return ask(); }
    D.locked = false; D.qStart = Date.now();
    const side = (pid, nm, cls) => { const s = o('div', 'duel-side ' + cls); D[cls + 'Sc'] = o('strong', '', '0'); D[cls + 'Sub'] = o('span', 'duel-sub'); s.append(av(pid, 40), tint(o('span', 'duel-nm', nm), who(pid)), D[cls + 'Sc'], D[cls + 'Sub']); return s; };
    const vs = o('div', 'duel-vs'); vs.append(side(S.uid, 'You', 'me'), o('b', 'duel-x2', 'VS'), side(oppId(), oppName(), 'opp'));
    D.dots = Array.from({ length: total() }, (_, i) => o('span', 'duel-dot' + (i < D.idx ? (D.log[i] && D.log[i].ok ? ' ok' : ' bad') : i === D.idx ? ' cur' : '')));
    const dots = o('div', 'duel-dots'); dots.append(...D.dots);
    D.tm = o('span', 'duel-timer', String(secs())); D.bar = o('span'); D.track = o('div', 'duel-track'); D.track.append(D.bar);
    const tr = o('div', 'duel-timer-row'); tr.append(o('span', 'eyebrow', `Question ${D.idx + 1} of ${total()}`), D.track, D.tm);
    D.fb = o('p', 'duel-fb'); D.fb.setAttribute('aria-live', 'polite');
    const opts = o('div', 'duel-opts');
    mix(q.options).forEach((op, i) => {
      const b = o('button', 'option'); b.type = 'button'; b.dataset.key = op.key;
      b.append(o('span', 'option-letter', 'ABCDEF'[i]), o('span', 'option-text', op.text)); b.onclick = () => answer(op.key); opts.append(b);
    });
    put(vs, dots, tr, o('span', 'duel-topic', q.topic || ''), o('h3', 'duel-q', q.question), opts, D.fb); paintScore();
    D.timer = setInterval(() => {
      const left = secs() - (Date.now() - D.qStart) / 1000;
      D.tm.textContent = Math.max(0, Math.ceil(left)); D.bar.style.transform = `scaleX(${Math.max(0, left / secs())})`; D.track.classList.toggle('is-low', left <= 5); D.tm.classList.toggle('is-low', left <= 5);
      if (left <= 0) answer(null);
    }, 200);
  }
  function answer(key, secondAttempt) {
    if (D.locked || !D.doc) return; D.locked = true; clearInterval(D.timer);
    const tok = D.code, q = App.questionById(D.doc.qids[D.idx]), ok = key === q.correct;

    // Second Chance: after a wrong first pick, freeze every option until the player decides
    if (!ok && key !== null && !secondAttempt && S.doc && (S.doc.p50 || 0) > 0 && D.used < 2) {
      D.locked = true;                                   // stays locked: no other option can be picked yet
      box.querySelectorAll('.option').forEach(b => { b.disabled = true; });
      const wrongBtn = box.querySelector(`.option[data-key="${key}"]`);
      if (wrongBtn) wrongBtn.classList.add('is-wrong');
      const WAIT = 20; let left = WAIT;
      const msg = () => { D.fb.textContent = `\u2753 Wrong pick! Use a Second Chance or move on (${left}s)`; D.fb.className = 'duel-fb bad'; };
      msg(); box.classList.remove('flash-ok', 'flash-bad'); void box.offsetWidth; box.classList.add('flash-bad'); D.streak = 0;
      const choice = document.createElement('div'); choice.className = 'duel-choice';
      const bar = document.createElement('div'); bar.className = 'sc-bar'; const barIn = document.createElement('span'); barIn.style.animationDuration = WAIT + 's'; bar.append(barIn);
      const scBtn = document.createElement('button');
      scBtn.className = 'btn btn-primary btn-sm'; scBtn.type = 'button';
      scBtn.textContent = `\u{1F3AF} Use Second Chance (${S.doc.p50} left)`;
      scBtn.onclick = () => {
        clearInterval(D.scT);
        D.used++; S.doc = { ...S.doc, p50: S.doc.p50 - 1 };
        S.db && S.db.doc('players/' + S.uid).set({ p50: firebase.firestore.FieldValue.increment(-1) }, { merge: true }).catch(() => {});
        choice.remove(); bar.remove();
        D.fb.textContent = '\u{1F3AF} Pick again \u2014 no hints, choose wisely!'; D.fb.className = 'duel-fb';
        box.querySelectorAll('.option').forEach(b => {
          if (b.dataset.key === key) return;             // the wrong one stays crossed out
          b.disabled = false; b.onclick = () => answer(b.dataset.key, true);
        });
        D.locked = false; D.qStart = Date.now(); D.timer = setInterval(() => { if (Date.now() - D.qStart > secs() * 1000) answer(null, true); }, 250);
      };
      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn btn-ghost btn-sm'; nextBtn.type = 'button'; nextBtn.textContent = 'Next \u2192';
      nextBtn.onclick = () => { clearInterval(D.scT); choice.remove(); bar.remove(); D.locked = false; answer(key, true); };   // keep the wrong answer and move on
      clearInterval(D.scT);
      D.scT = setInterval(() => { left--; if (left <= 0) nextBtn.onclick(); else msg(); }, 1000);   // nobody chose: go to the next question
      choice.append(scBtn, nextBtn); D.fb.after(choice); choice.after(bar);
      return;
    }

    D.me.n++; D.me.ms += ok ? Date.now() - D.qStart : secs() * 1000; if (ok) D.me.c++;
    D.log.push({ id: q.id, key, ok });
    box.querySelectorAll('.option').forEach(b => { b.disabled = true; b.classList.add(b.dataset.key === q.correct ? 'is-correct' : b.dataset.key === key ? 'is-wrong' : 'is-dim'); });
    const right = (q.options.find(x => x.key === q.correct) || {}).text;
    D.dots[D.idx].className = 'duel-dot ' + (ok ? 'ok' : 'bad');
    D.streak = ok ? (D.streak || 0) + 1 : 0; if (D.streak > (D.best || 0)) D.best = D.streak;
    const bonusHit = ok && D.streak % 3 === 0 && D.streak <= 9;
    box.classList.remove('flash-ok', 'flash-bad'); void box.offsetWidth; box.classList.add(ok ? 'flash-ok' : 'flash-bad');
    if (ok) { const pt = o('span', 'duel-plus' + (bonusHit ? ' big' : ''), bonusHit ? `\u{1F525} ${D.streak} in a row! +1 \u{1F4B0}` : D.streak > 1 ? `+1  \u{1F525}\u00D7${D.streak}` : '+1'); box.append(pt); setTimeout(() => pt.remove(), bonusHit ? 1500 : 1000); }
    D.fb.className = 'duel-fb ' + (ok ? 'good' : 'bad');
    D.fb.textContent = ok ? '\u2713 Correct!' : key === null ? `\u23F1 Time\u2019s up. Answer: ${right}` : `\u2717 Not quite. Answer: ${right}`;
    buzz(ok ? 25 : [60, 40, 60]); paintScore(); push();
    setTimeout(() => { if (D.code === tok && box) box.classList.add('d-out'); }, 850);
    setTimeout(() => { if (D.code !== tok || !D.doc) return; D.idx++; ask(); }, 1100);
  }
  function finish() { D.me.done = true; D.finAt = Date.now(); push(); step(); }
  function waitOrResult() {
    const r = (D.doc.res || {})[oppId()], left = 120000 - (Date.now() - D.finAt);
    if ((r && r.done) || left <= 0) return result(r);
    clearTimeout(D.wait); D.wait = setTimeout(step, left + 200);
    put(o('p', 'eyebrow', 'Finished'), o('h2', '', `You got ${D.me.c}/${total()}`),
      o('p', 'muted', `Waiting for ${oppName()} to finish${r ? ` (${r.n}/${total()} answered)` : ''}\u2026`), row(btn('Leave', 'btn-ghost btn-sm', () => close())));
  }
  function confetti() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const host = o('div', 'cf-host'), cols = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#43aa8b', '#4d96ff', '#b565e6', '#ff6bd6'];
    const W = innerWidth, H = innerHeight, rnd = (a, b) => a + Math.random() * (b - a), frag = document.createDocumentFragment(), anims = [];
    const piece = (x0, y0, x1, y1, x2, y2, dur, delay) => {
      const e = document.createElement('i'); e.style.background = cols[(Math.random() * cols.length) | 0]; e.style.width = rnd(6, 10) + 'px'; e.style.height = rnd(8, 14) + 'px'; if (Math.random() < .3) e.style.borderRadius = '50%';
      frag.append(e); const r = rnd(360, 900) * (Math.random() < .5 ? -1 : 1);
      anims.push([e, [{ transform: `translate3d(${x0}px,${y0}px,0) rotate(0)`, opacity: 1 }, { transform: `translate3d(${x1}px,${y1}px,0) rotate(${r * .4}deg)`, opacity: 1, offset: .35 }, { transform: `translate3d(${x2}px,${y2}px,0) rotate(${r}deg)`, opacity: 0 }], { duration: dur, delay, easing: 'cubic-bezier(.25,.6,.4,1)', fill: 'forwards' }]);
    };
    for (let i = 0; i < 26; i++) {                                        // two cannons from the bottom corners
      [[0, 1], [W, -1]].forEach(([x, dir]) => piece(x, H, x + dir * rnd(W * .15, W * .55), H - rnd(H * .35, H * .8), x + dir * rnd(W * .3, W * .8), H + 40, rnd(1900, 2700), rnd(0, 250)));
    }
    for (let i = 0; i < 22; i++) { const x = rnd(0, W); piece(x, -30, x + rnd(-60, 60), H * .4, x + rnd(-120, 120), H + 40, rnd(2200, 3200), rnd(150, 900)); }   // gentle rain
    host.append(frag); document.body.append(host);
    anims.forEach(([e, k, o2]) => e.animate(k, o2));
    setTimeout(() => host.remove(), 4400);
  }
  function countUp() {
    box && box.querySelectorAll('.duel-score strong').forEach(el => {
      const m = /^(\d+)\/(\d+)$/.exec(el.textContent); if (!m) return; const to = +m[1], n = m[2], t0 = performance.now();
      const f = t => { const k = Math.min(1, (t - t0) / 900); el.textContent = `${Math.round(to * k)}/${n}`; if (k < 1) requestAnimationFrame(f); }; el.textContent = `0/${n}`; requestAnimationFrame(f);
    });
  }
  function result(r) {
    const isNewResult = D.code !== lastResultCode;
    if (isNewResult) lastResultCode = D.code;
    const me = D.me, opp = r || { c: 0, n: 0, ms: 0, done: false }, n = total();
    const tie = me.c === opp.c && me.ms === opp.ms, win = me.c !== opp.c ? me.c > opp.c : me.ms < opp.ms;
    const cn = record(tie ? 'd' : win ? 'w' : 'l');
    const side = (pid, name, x, w) => { const d = o('div', w ? 'is-win' : ''); d.append(av(pid, 40), o('span', 'duel-nm', name), o('strong', '', `${x.c}/${n}`), o('span', 'duel-sub', `${(x.ms / 1000).toFixed(1)}s total`)); return d; };
    const sc = o('div', 'duel-score'); sc.append(side(S.uid, 'You', me, win && !tie), side(oppId(), oppName(), opp, !win && !tie));
    const rev = o('details', 'duel-review'); rev.append(o('summary', '', `Review your answers (${me.c} right, ${D.log.length - me.c} missed)`));
    D.log.forEach((l, i) => {
      const q = App.questionById(l.id); if (!q) return;
      const txt = k => (q.options.find(x => x.key === k) || {}).text, it = o('div', 'duel-rv ' + (l.ok ? 'ok' : 'bad'));
      it.append(o('strong', '', `${i + 1}. ${l.ok ? '\u2713' : '\u2717'} ${q.question}`));
      if (!l.ok) it.append(o('span', '', l.key ? `Your answer: ${txt(l.key)}` : 'No answer (time ran out)'));
      it.append(o('span', '', `Correct: ${txt(q.correct)}`)); if (q.explanation) it.append(o('span', 'muted', q.explanation)); rev.append(it);
    });
    const d = D.doc, cfg = { subjects: d.subjects || (d.subject && d.subject !== 'mixed' ? [d.subject] : ['social']), subjectCount: (d.subjects || []).length || 1, len: n, secs: secs(), vis: d.vis || 'public' };
    const resultTitle = o('h2', 'duel-result-heading' + (!tie && win ? ' duel-win' : ''), tie ? 'It\u2019s a draw!' : win ? 'You won! \u{1F3C6}' : `${oppName()} wins this one`);
    put(o('p', 'eyebrow', 'Duel result'), resultTitle, sc,
      chips(`${Math.round(me.c / n * 100)}% accuracy`, `${(me.ms / Math.max(1, me.n) / 1000).toFixed(1)}s per question`, D.best > 1 ? `\u{1F525} best run ${D.best}` : ''),
      cn ? coinPanel(cn, D.coinParts, D.bal) : o('p', 'muted', D.limit ? '\u{1F4B0} Daily duel coin limit reached (10 duels). Come back tomorrow!' : 'No coins this time.'),
      o('p', 'muted', opp.done ? 'Most correct answers wins; faster total time breaks ties.' : `${oppName()} didn\u2019t finish, so unanswered questions count as wrong.`),
      rev, row(btn('Rematch', 'btn-primary btn-sm', () => { close(); D.cfg = cfg; create(); }), btn('Close', 'btn-ghost btn-sm', () => close())));
    if (isNewResult) {
      replayMotion(resultTitle, 'motion-duel-result-title-enter');
      replayMotion(sc, 'motion-duel-result-score-enter');
    }
    countUp(); if (!tie && win) { buzz([40, 30, 40, 30, 90]); setTimeout(confetti, 300); }
  }
  async function create() {
    if (S.banned) return warn('You are banned from duels.');
    if (S.settings && S.settings.duelsPaused && !S.isOwner) return warn('New duels are paused for now. Try again later.');
    if (!S.db) return warn('Duels need an internet connection.');
    if (D.code) close();
    const c = D.cfg, selected = c.subjects || ['social'];
    if (selected.length !== (c.subjectCount === 'multiple' ? selected.length : Number(c.subjectCount)) || (c.subjectCount === 'multiple' && selected.length < 2)) return warn('Choose the exact number of subjects first.');
    const all = selected.flatMap(subject => questionsDB[subject] || []);
    const pool = all.filter(q => !q.diagram && q.options && q.options.length && q.correct);
    if (pool.length < c.len) return warn(`Only ${pool.length} questions available for that subject. Pick fewer.`);
    const code = Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
    const doc = { host: S.uid, hostName: myName(), guest: null, guestName: '', subjects: selected, subject: selected.length === 1 ? selected[0] : 'mixed', secs: c.secs, vis: c.vis, qids: mix(pool).slice(0, c.len).map(q => q.id), state: 'waiting', created: Date.now(), hb: Date.now(), res: {} };
    // Keep selected subjects for the host UI, but send only Firestore-whitelisted fields.
    const storedDoc = { ...doc };
    delete storedDoc.subjects;
    try { await col().doc(code).set(storedDoc); } catch (e) { return warn(`Couldn\u2019t create the duel (${(e && (e.code || e.message)) || 'unknown error'}).`); }
    D.doc = doc; watch(code); lobby();
    clearInterval(D.hbT);
    D.hbT = setInterval(() => { if (!D.doc || D.doc.state !== 'waiting') return clearInterval(D.hbT); col().doc(D.code).update({ hb: Date.now() }).catch(() => {}); }, 20000);
  }
  async function join(code) {
    code = (code || '').trim().toUpperCase();
    if (S.banned) return warn('You are banned from duels.');
    if (code.length < 4) return App.toast('Enter the duel code first.');
    if (!S.db) return warn('Duels need an internet connection.');
    if (D.code) close();
    const ref = col().doc(code);
    try {
      await S.db.runTransaction(async tx => {
        const s = await tx.get(ref); if (!s.exists) throw 'nf';
        const d = s.data(); if (d.host === S.uid) throw 'own'; if (d.state !== 'waiting') throw 'taken';
        tx.update(ref, { guest: S.uid, guestName: myName(), state: 'playing', startAt: Date.now() + 4000 });
      });
    } catch (e) { return warn(e === 'nf' ? 'No duel with that code.' : e === 'own' ? 'That\u2019s your own duel.' : e === 'taken' ? 'That duel already started.' : `Couldn\u2019t join the duel (${(e && (e.code || e.message)) || 'unknown error'}).`); }
    watch(code);
  }
  function mode() {
    D.mode = D.mode || 'create';
    const panes = { open: D.pOpen, create: D.pCreate, join: D.pJoin };
    const selectedPane = panes[D.mode];
    const shouldAnimate = !!(selectedPane && selectedPane.hidden);
    Object.keys(panes).forEach(k => { D.mb[k].setAttribute('aria-pressed', String(D.mode === k)); panes[k].hidden = D.mode !== k; });
    if (shouldAnimate) replayMotion(selectedPane, 'motion-duel-pane-enter');
  }
  function paint() {
    if (!D.list || !D.tiles) return;
    const d = S.doc || {};
    [d.duelW, d.duelL, d.duelD].forEach((v, i) => { D.tiles[i].n.textContent = v || 0; });
    D.mb.open.textContent = D.open.length ? `Open (${D.open.length})` : 'Open';
    const ft = document.querySelector('.f-tabs [data-k="duels"]'); if (ft) ft.replaceChildren(icon('swords'), document.createTextNode('Duels' + (D.open.length ? ` (${D.open.length})` : '')));
    if (!D.picked && D.open.length && D.mode !== 'open') { D.mode = 'open'; mode(); }
    D.list.replaceChildren();
    if (D.err) { D.list.append(o('li', 'muted', `Open challenges unavailable (${D.err}). You can still use a code.`)); return; }
    if (!D.open.length) { const li = o('li', 'duel-empty'); li.append(o('span', 'muted', 'No public duels right now.'), btn('Create one', 'btn-primary btn-sm', () => { D.picked = true; D.mode = 'create'; mode(); })); D.list.append(li); return; }
    D.open.forEach(x => {
      const li = o('li', 'duel-item'), p = who(x.host), t = o('div');
      t.append(o('strong', '', x.hostName || 'Player'), o('span', 'duel-sub', `Level ${lv(p.totalExp || 0).level} \u00B7 ${p.duelW || 0}W-${p.duelL || 0}L \u00B7 ${ago(x.created)}`));
      li.append(av(x.host, 38), t, btn('Accept', 'btn-primary btn-sm', () => join(x.code)), chips(subjectNames(x.subjects || (x.subject && x.subject !== 'mixed' ? [x.subject] : [])), `${(x.qids || []).length} questions`, `${x.secs || 15}s each`));
      D.list.append(li);
    });
  }
  function seg(label, vals, key, fmt, after) {
    const w = o('div', 'duel-field'), r = o('div', 'duel-seg'); w.append(o('span', 'duel-lbl', label), r);
    const sync = () => r.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(D.cfg[key]))));
    vals.forEach(v => {
      const b = o('button', '', fmt(v));
      b.type = 'button'; b.dataset.v = v;
      b.onclick = () => {
        const changed = String(D.cfg[key]) !== String(v);
        D.cfg[key] = v;
        sync();
        if (changed) replayMotion(b, 'motion-duel-option-selected');
        if (after) after();
      };
      r.append(b);
    });
    sync(); return w;
  }
  function card() {
    if (D.card) return D.card;
    const subjectBox = o('div', 'duel-subject-picks'), countBox = o('div', 'duel-seg duel-subject-count');
    const subjectKeys = Object.keys(SUBS).filter(k => k !== 'mixed');
    let subjectHint = null, createButton = null;
    const syncSubjects = () => {
      const multiple = D.cfg.subjectCount === 'multiple';
      const max = multiple ? subjectKeys.length : Number(D.cfg.subjectCount);
      const selected = D.cfg.subjects.length;
      const valid = multiple ? selected >= 2 : selected === max;
      countBox.querySelectorAll('button').forEach(b => {
        b.textContent = b.dataset.count === 'multiple' ? 'Multi' : b.dataset.count;
        b.setAttribute('aria-pressed', String(b.dataset.count === String(D.cfg.subjectCount)));
      });
      subjectBox.querySelectorAll('button').forEach(b => {
        const on = D.cfg.subjects.includes(b.dataset.subject);
        b.setAttribute('aria-pressed', String(on));
        b.disabled = !on && selected >= max;
      });
      if (subjectHint) subjectHint.textContent = multiple
        ? `2 or more · ${selected} selected`
        : `${selected}/${max} selected`;
      if (createButton) createButton.disabled = !valid;
    };
    [1,2,3,4,5,'multiple'].forEach(n => {
      const b = o('button', '', n === 'multiple' ? 'Multi' : String(n));
      b.type = 'button'; b.dataset.count = String(n);
      b.setAttribute('aria-label', n === 'multiple' ? 'Choose multiple subjects' : `Choose ${n} ${n === 1 ? 'subject' : 'subjects'}`);
      b.title = b.getAttribute('aria-label');
      b.textContent = n === 'multiple' ? 'Multi' : String(n);
      b.onclick = () => {
        const changed = String(D.cfg.subjectCount) !== String(n);
        D.cfg.subjectCount = n;
        const max = n === 'multiple' ? subjectKeys.length : Number(n);
        if (D.cfg.subjects.length > max) D.cfg.subjects = D.cfg.subjects.slice(0,max);
        syncSubjects();
        if (changed) replayMotion(b, 'motion-duel-option-selected');
      };
      countBox.append(b);
    });
    subjectKeys.forEach(k => {
      const shortNames = { social: 'Social', arts: 'Arts', maths: 'Maths', computing: 'Computing', rme: 'RME', integratedScience: 'Science', french: 'French', careerTechnology: 'Career Tech' };
      const b = o('button', '', shortNames[k] || SUBS[k]); b.type = 'button'; b.dataset.subject = k;
      b.setAttribute('aria-label', SUBS[k]); b.title = SUBS[k];
      b.onclick = () => {
        const at = D.cfg.subjects.indexOf(k);
        const max = D.cfg.subjectCount === 'multiple' ? subjectKeys.length : Number(D.cfg.subjectCount);
        const changed = at >= 0 || D.cfg.subjects.length < max;
        if (at >= 0) D.cfg.subjects.splice(at,1);
        else if (D.cfg.subjects.length < max) D.cfg.subjects.push(k);
        syncSubjects();
        if (changed) replayMotion(b, 'motion-duel-option-selected');
      };
      subjectBox.append(b);
    });
    subjectHint = o('p', 'duel-hint');
    const sw = o('div', 'duel-field');
    sw.append(o('span', 'duel-lbl', 'How many subjects?'), countBox, o('span', 'duel-lbl', 'Choose your subjects'), subjectBox, subjectHint);
    syncSubjects();
    const hint = o('p', 'duel-hint'), sync = () => { hint.textContent = D.cfg.vis === 'public' ? 'Public: shows under Open so anyone on the board can accept.' : 'Private: hidden from the list. Only people with your code can join.'; };
    const vis = seg('Who can join', ['public', 'private'], 'vis', v => (v === 'public' ? '\u{1F310} Public' : '\u{1F512} Private'), sync); sync();
    const inp = document.createElement('input'); inp.className = 'duel-in'; inp.placeholder = 'CODE'; inp.maxLength = 5; inp.autocapitalize = 'characters'; inp.setAttribute('aria-label', 'Duel code');
    inp.onkeydown = e => { if (e.key === 'Enter') join(inp.value); };
    D.list = o('ul', 'duel-open');
    D.tiles = ['Wins', 'Losses', 'Draws'].map(l => { const t = o('div', 'duel-tile'), n = o('strong', '', '0'); t.append(n, o('span', '', l)); t.n = n; return t; });
    const tiles = o('div', 'duel-tiles'); tiles.append(...D.tiles);
    const mk = (k, t) => {
      const b = o('button', '', t);
      b.type = 'button';
      b.onclick = () => {
        const changed = D.mode !== k;
        D.picked = true;
        D.mode = k;
        mode();
        if (changed) replayMotion(b, 'motion-duel-mode-selected');
      };
      return b;
    };
    D.mb = { open: mk('open', 'Open'), create: mk('create', 'Create'), join: mk('join', 'Join code') };
    const modes = o('div', 'duel-modes'); modes.append(D.mb.open, D.mb.create, D.mb.join);
    D.pOpen = o('div', 'duel-pane'); D.pOpen.append(D.list);
    D.pCreate = o('div', 'duel-pane duel-create-pane');
    createButton = btn('Create duel', 'btn-primary btn-block', create);
    D.pCreate.append(sw, seg('Questions', LENS, 'len', v => String(v)), seg('Time per question', TIMES, 'secs', v => v + 's'), vis, hint, createButton);
    syncSubjects();
    D.pJoin = o('div', 'duel-pane duel-join-pane'); D.pJoin.append(o('p', 'muted', 'Got a code from a friend? Enter it to jump straight in.'), row(inp, btn('Join', 'btn-primary btn-sm', () => join(inp.value))));
    const c = o('section', 'card duel-card'); c.append(tiles, modes, D.pOpen, D.pCreate, D.pJoin);
    D.card = c; mode(); paint(); return c;
  }
  window.addEventListener('hashchange', () => { if (D.code) close(); });
  function start() {
    if (D.os || !S.db) return;
    D.seen = {};
    const calc = () => { D.open = (D.raw || []).filter(d => d.host !== S.uid && Date.now() - ((D.seen[d.code] || {}).at || 0) < 70000).sort((a, b) => (b.created || 0) - (a.created || 0)); paint(); };
    D.os = col().where('state', '==', 'waiting').where('vis', '==', 'public').onSnapshot(s => {
      D.err = null; D.raw = s.docs.map(d => ({ code: d.id, ...d.data() }));
      D.raw.forEach(d => { const k = D.seen[d.code]; if (!k || k.hb !== d.hb) D.seen[d.code] = { hb: d.hb, at: Date.now() }; });
      calc();
    }, e => { D.err = (e && e.code) || 'error'; paint(); });
    setInterval(calc, 15000);
  }
  return { card, start, paint };
})();

/* ===== Overseer layer: two roles =====
   ADMIN = knows the 1 admin PIN. Session lasts 2 hours. Moderates players.
   OWNER = knows 2 separate passwords. Session lasts 30 minutes. Does everything an admin can,
           plus: kick admins, change the admin PIN, change the owner passwords, bulk tools, audit log.
   All of this is only the interface. The real protection is in firestore.rules. */
Object.assign(S, { roster: new Map(), rosterData: new Map(), noAuto: false, autoTry: 0, settings: {}, bugs: [], myBugs: [], owners: new Set(), badgeRole: new Map(), ownerAt: 0, ownFails: 0, isOwner: false, bansAll: new Map(), notes: new Map(), audit: [] });
const ADMIN_MS = 2 * 3600 * 1000, OWNER_MS = 30 * 60 * 1000, OWNER_AWAY_MS = 5 * 60 * 1000;
// o() only takes text, so the admin layer uses elx(), which also accepts child elements.
const elx = (tag, cls, ...kids) => { const n = document.createElement(tag); if (cls) n.className = cls; kids.flat().forEach(k => { if (k === null || k === undefined || k === false) return; if (k && k.nodeType) n.append(k); else n.appendChild(document.createTextNode(String(k))); }); return n; };
const fsv = () => firebase.firestore;
const fmtTime = t => { try { return new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); } catch { return String(t); } };
const banActive = b => !!b && (!b.until || b.until > Date.now());
// roster = permanent staff record (never expires), so protection holds even when the owner is locked
const isAppointed = id => !!(S.rosterData.get(id) || {}).appointed;
const roleOf = id => (S.owners.has(id) || S.roster.get(id) === 'owner') ? 'owner' : (S.admins.has(id) || S.roster.has(id)) ? 'admin' : null;
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

/* ---- Small dialog helper (replaces prompt/confirm) ---- */
function ask(cfg) {
  return new Promise(res => {
    const ov = elx('div', 'pin-ov'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', cfg.title);
    const f = elx('form', 'card pin-card adm-modal'), inputs = {};
    f.append(elx('h3', '', cfg.title)); if (cfg.intro) f.append(elx('p', 'muted', cfg.intro));
    (cfg.fields || []).forEach(fd => {
      let inp;
      if (fd.options) { inp = document.createElement('select'); fd.options.forEach(([v, t]) => inp.append(new Option(t, v))); }
      else if (fd.multiline) { inp = document.createElement('textarea'); inp.rows = 3; }
      else { inp = document.createElement('input'); inp.type = fd.type || 'text'; if (fd.type === 'number') inp.inputMode = 'numeric'; }
      inp.className = 'adm-search'; if (fd.placeholder) inp.placeholder = fd.placeholder; if (fd.max) inp.maxLength = fd.max;
      if (fd.value !== undefined) inp.value = fd.value; inp.autocomplete = fd.type === 'password' ? 'new-password' : 'off'; inp.setAttribute('aria-label', fd.label);
      inputs[fd.key] = inp; f.append(elx('label', 'adm-lbl', fd.label), inp);
    });
    const msg = elx('p', 'pin-msg'); msg.setAttribute('role', 'alert');
    const no = elx('button', 'btn btn-ghost', 'Cancel'), go = elx('button', 'btn ' + (cfg.danger ? 'btn-ghost adm-danger' : 'btn-primary'), cfg.ok || 'OK'); no.type = 'button'; go.type = 'submit';
    let settled = false;
    const esc = e => { if (e.key === 'Escape') done(null); }, done = v => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', esc);
      App.dismissOverlay(ov, () => res(v));
    };
    no.onclick = () => done(null); ov.addEventListener('click', e => { if (e.target === ov) done(null); }); document.addEventListener('keydown', esc);
    f.onsubmit = e => { e.preventDefault(); const v = {}; for (const k in inputs) v[k] = inputs[k].value; const er = cfg.validate && cfg.validate(v); if (er) { msg.textContent = er; return; } done(v); };
    f.append(msg, elx('div', 'cz-row pin-row', no, go)); ov.append(f); document.body.append(ov);
    const first = Object.values(inputs)[0]; setTimeout(() => (first || go).focus(), 50);
  });
}

/* ---- Bans (permanent or timed) ---- */
function banCard() {
  const c = o('div', 'card friends-gate'), b = S.bans.get(S.uid) || {}, when = b.until ? ` It ends ${fmtTime(b.until)}.` : '';
  c.append(o('h2', '', '\u{1F6AB} You\u2019re banned from the friends board'), o('p', 'muted', (b.reason ? `Reason: ${b.reason}.` : 'An admin has turned off the board, duels and coins for this account.') + when), o('p', 'muted', 'Quizzes and notes still work on your device.'));
  return c;
}
function applyBan() {
  let ov = $('ban-ov');
  if (!S.banned) { if (ov) ov.remove(); return; }
  if (ov || S.banDismissed) return;
  ov = o('div', 'ban-ov'); ov.id = 'ban-ov'; ov.setAttribute('role', 'alertdialog');
  const c = banCard(); c.classList.add('ban-card'); const go = o('button', 'btn btn-primary', 'Keep studying'); go.type = 'button'; go.onclick = () => { S.banDismissed = true; ov.remove(); };
  c.append(go); ov.append(c); document.body.append(ov);
  renderFriends();
}
function refreshBans() {
  S.bans = new Map([...S.bansAll].filter(([, b]) => banActive(b)));
  const was = S.banned; S.banned = S.bans.has(S.uid) && roleOf(S.uid) !== 'owner'; if (was && !S.banned) S.banDismissed = false;
  applyBan(); renderFriends(); Adm.paint();
}

/* ---- Private message from the admin team ("notices/<uid>") ---- */
function showNotice(n) {
  let ov = $('notice-ov');
  if (!n || !n.text) { if (ov) ov.remove(); return; }
  if (ov) ov.remove();
  ov = elx('div', 'pin-ov'); ov.id = 'notice-ov'; ov.setAttribute('role', 'alertdialog');
  const c = elx('div', 'card pin-card'), go = elx('button', 'btn btn-primary', 'Got it'); go.type = 'button';
  go.onclick = () => { App.dismissOverlay(ov); S.db.doc('notices/' + S.uid).delete().catch(() => {}); };
  c.append(elx('h3', '', '\u{1F4E9} Message from the admin team'), elx('p', '', n.text), go); ov.append(c); document.body.append(ov);
}

const ANN_ICON = { info: '\u{1F4E2}', event: '\u{1F389}', warn: '\u26A0\uFE0F', critical: '\u{1F6A8}' };
const ANN_NAME = { info: 'Announcement', event: 'Event', warn: 'Important notice', critical: 'Urgent from the owner' };
const annSeen = id => { try { return localStorage.getItem('ann-seen') === id; } catch { return false; } };
const annPopped = id => { try { return localStorage.getItem('ann-popped') === id; } catch { return false; } };
// A centred card the first time a new announcement arrives, so phones can't miss it.
function annPopup(a) {
  if ($('ann-pop')) return;
  const ov = elx('div', 'pin-ov ann-pop'); ov.id = 'ann-pop'; ov.setAttribute('role', 'alertdialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', ANN_NAME[a.kind] || ANN_NAME.info);
  const c = elx('div', 'card pin-card ann-pop-card'), go = elx('button', 'btn btn-primary', 'Got it'); c.dataset.kind = a.kind || 'info'; go.type = 'button';
  const close = () => { try { localStorage.setItem('ann-popped', a.id); } catch {} App.dismissOverlay(ov); };
  go.onclick = close; ov.addEventListener('click', e => { if (e.target === ov) close(); });
  c.append(elx('div', 'ann-pop-ic', ANN_ICON[a.kind] || ANN_ICON.info), elx('p', 'ann-pop-label', ANN_NAME[a.kind] || ANN_NAME.info), elx('p', 'ann-pop-text', a.text), a.by ? elx('small', 'muted', '\u2014 ' + a.by) : null, go);
  ov.append(c); document.body.append(ov); setTimeout(() => go.focus(), 60);
}
function showAnn() {
  let bar = $('ann-bar'); const a = S.ann, critical = !!a && a.kind === 'critical';
  const live = a && a.text && (!a.expires || a.expires > Date.now()) && (critical || !annSeen(a.id));
  if (!live) { if (bar) App.dismissOverlay(bar); return; }
  // A newly arrived announcement must not reuse a banner that is already fading out.
  if (bar && bar.classList.contains('motion-overlay-closing')) { bar.remove(); bar = null; }
  if (!bar) { bar = o('div', 'ann-bar'); bar.id = 'ann-bar'; bar.setAttribute('role', 'status'); const m = $('main'); m.parentNode.insertBefore(bar, m); }
  bar.dataset.kind = a.kind || 'info';
  const kids = [o('span', 'ann-ic', ANN_ICON[a.kind] || ANN_ICON.info), elx('div', 'ann-body', elx('span', 'ann-label', ANN_NAME[a.kind] || ANN_NAME.info), elx('div', 'ann-txt', a.text))];
  if (!critical) { const x = o('button', 'ann-x', '\u2715'); x.type = 'button'; x.setAttribute('aria-label', 'Dismiss announcement'); x.onclick = () => { try { localStorage.setItem('ann-seen', a.id); } catch {} showAnn(); }; kids.push(x); }
  bar.replaceChildren(...kids);
  // Routine updates stay as non-blocking banners on phones; only warnings and urgent notices open a dialog.
  if (!annPopped(a.id) && !S.isAdmin && !$('ban-ov') && (a.kind === 'warn' || critical)) annPopup(a);
}
setInterval(() => showAnn(), 60000);

/* ---- Role state ---- */
function refreshAdmin(force) {
  const now = Date.now(), wasStaff = S.isAdmin, wasOwner = S.isOwner, oldKey = [...S.admins].sort().join() + '|' + [...S.owners].sort().join();
  const adminLive = !!S.adminAt && now < S.adminAt + ADMIN_MS, ownerLive = !!S.ownerAt && now < S.ownerAt + OWNER_MS;
  S.isOwner = ownerLive; S.isAdmin = adminLive || ownerLive;
  document.querySelectorAll('[data-admin-nav]').forEach(link => { link.hidden = !S.isAdmin; const label = link.querySelector('span:last-child') || link; label.textContent = S.isOwner ? 'Owner' : 'Admin'; link.setAttribute('aria-label', S.isOwner ? 'Owner panel' : 'Admin panel'); link.title = S.isOwner ? 'Owner panel' : 'Admin panel'; });
  document.body.classList.toggle('admin-enabled', S.isAdmin);
  S.admins = new Set(); S.owners = new Set();
  S.badgeMap.forEach((until, id) => { if (until > now) { S.admins.add(id); if (S.badgeRole.get(id) === 'owner') S.owners.add(id); } });
  if (S.isAdmin) S.admins.add(S.uid); if (S.isOwner) S.owners.add(S.uid);
  if (wasOwner && !S.isOwner) { App.toast('Owner session ended. Enter both passwords again to renew.', 'warn'); if (S.db) S.db.doc('ownerSessions/' + S.uid).delete().catch(() => {}); }
  if (wasStaff && !S.isAdmin && !isAppointed(S.uid)) App.toast('Admin session ended. Enter the PIN again to renew.', 'warn');
  syncSubs();
  if (wasStaff !== S.isAdmin || wasOwner !== S.isOwner || force || oldKey !== [...S.admins].sort().join() + '|' + [...S.owners].sort().join()) { refreshBans(); renderAccount(); renderFriends(); showFtab(); }
  if (S.isAdmin) Adm.tick();
  if (S.db && !S.isAdmin && isAppointed(S.uid) && !S.noAuto && Date.now() > S.autoTry) { S.autoTry = Date.now() + 60000; autoAdmin(); }
}
// Admins the owner appointed get their 2-hour session started (and renewed) automatically: no PIN.
async function autoAdmin() {
  try {
    await S.db.doc('adminSessions/' + S.uid).set({ at: fsv().FieldValue.serverTimestamp() });
    const snap = await S.db.doc('adminSessions/' + S.uid).get({ source: 'server' }); S.adminAt = snap.data().at.toMillis();
    refreshAdmin(true); await setBadge().catch(() => {});
  } catch {}
}

/* Live data only staff may read (private notes) and only the owner may read (audit log) */
const subs = {};
function liveSub(key, want, make) {
  const s = subs[key] || (subs[key] = { off: null, retry: 0 });
  if (want && !s.off && Date.now() > s.retry) {
    try { s.off = make(() => { if (s.off) { try { s.off(); } catch {} } s.off = null; s.retry = Date.now() + 30000; }); } catch { s.off = null; }
  }
  if (!want && s.off) { try { s.off(); } catch {} s.off = null; }
}
function syncSubs() {
  if (!S.db) return;
  liveSub('notes', S.isAdmin, fail => S.db.collection('adminNotes').onSnapshot(sn => { S.notes = new Map(sn.docs.map(d => [d.id, d.data()])); Adm.paint(); }, fail));
  liveSub('audit', S.isOwner, fail => S.db.collection('auditLogs').orderBy('at', 'desc').limit(300).onSnapshot(sn => { S.audit = sn.docs.map(d => { const x = d.data({ serverTimestamps: 'estimate' }); return { id: d.id, ...x, at: x.at && x.at.toMillis ? x.at.toMillis() : Date.now() }; }); Adm.paint(); }, fail));
  liveSub('bugs', S.isAdmin, fail => S.db.collection('bugReports').orderBy('at', 'desc').limit(200).onSnapshot(sn => { S.bugs = sn.docs.map(d => { const x = d.data({ serverTimestamps: 'estimate' }); return { id: d.id, ...x, at: x.at && x.at.toMillis ? x.at.toMillis() : Date.now() }; }); Adm.paint(); }, fail));
  if (!S.isAdmin) { S.notes = new Map(); S.bugs = []; }
  if (!S.isOwner) { S.audit = []; }
}
async function logAct(action, target, detail) {
  try {
    await S.db.collection('auditLogs').add({ at: fsv().FieldValue.serverTimestamp(), by: S.uid, byName: String(nameOf(S.uid)).slice(0, 40), role: S.isOwner ? 'owner' : 'admin', action, target: target || '', targetName: target ? String(nameOf(target)).slice(0, 40) : '', detail: String(detail || '').slice(0, 200) });
  } catch {}
}

// Permanent staff record. Written once per role; this is what keeps the owner safe from admins while locked.
async function setRoster(role) {
  const cur = S.roster.get(S.uid);
  if (!S.db || cur === 'owner' || cur === role) return;
  try { await S.db.doc('staffRoster/' + S.uid).set({ role, at: fsv().FieldValue.serverTimestamp() }); }
  catch (e) { if (role === 'owner') App.toast('Couldn\u2019t save your permanent owner protection. Publish the newest firestore.rules, then unlock again.', 'warn'); }
}
// If an admin banned the owner before the rules were fixed, unlocking as owner lifts it.
async function liftOwnBan() { if (S.bansAll.has(S.uid)) { try { await S.db.doc('bans/' + S.uid).delete(); App.toast('Your old ban was lifted.', 'good'); } catch {} } }

async function setBadge() {
  // one badge doc per person; the owner badge wins while the owner session is live
  const F = fsv();
  if (S.isOwner) return S.db.doc('adminBadges/' + S.uid).set({ until: F.Timestamp.fromMillis(S.ownerAt + OWNER_MS), role: 'owner' });
  if (S.adminAt && Date.now() < S.adminAt + ADMIN_MS) return S.db.doc('adminBadges/' + S.uid).set({ until: F.Timestamp.fromMillis(S.adminAt + ADMIN_MS), role: 'admin' });
  return S.db.doc('adminBadges/' + S.uid).delete();
}
async function adminLock() {
  S.noAuto = true;
  try { await S.db.doc('adminSessions/' + S.uid).delete(); } catch {}
  S.adminAt = 0; refreshAdmin(true); try { await setBadge(); } catch {}
  if (!S.isAdmin) { if (S.ftab === 'admin') S.ftab = 'board'; App.toast('Admin locked.', 'good'); } else App.toast('Admin PIN session closed. Owner session is still open.', 'good');
  showFtab();
}
async function ownerLock(silent) {
  try { await S.db.doc('ownerSessions/' + S.uid).delete(); } catch {}
  S.ownerAt = 0; refreshAdmin(true); try { await setBadge(); } catch {}
  if (!S.isAdmin && S.ftab === 'admin') S.ftab = 'board';
  showFtab(); if (!silent) App.toast('Owner locked.', 'good');
}
async function renewCurrentSession() {
  if (!S.db || !S.uid) return App.toast('Connect to the profile service before renewing.', 'warn');
  const owner = !!S.isOwner || !!(S.roster && S.roster.get(S.uid) === 'owner') || !!(S.owners && S.owners.has(S.uid));
  const appointedAdmin = !owner && typeof isAppointed === 'function' && isAppointed(S.uid);
  if (owner) {
    // A fresh two-password check writes only the three fields allowed by the Owner rules.
    openPin('owner', true);
    return;
  }
  if (appointedAdmin) {
    // Appointed admins do not use a PIN. Their rule allows only the timestamp field.
    try {
      const ref = S.db.doc('adminSessions/' + S.uid);
      await ref.set({ at: fsv().FieldValue.serverTimestamp() });
      const renewed = await ref.get({ source: 'server' });
      const stamp = renewed.exists && renewed.data().at;
      if (!stamp || typeof stamp.toMillis !== 'function') throw new Error('The server did not confirm the new session time.');
      S.adminAt = stamp.toMillis();
      S.noAuto = false;
      refreshAdmin(true);
      await setBadge().catch(() => {});
      await logAct('renew', '', 'Appointed admin session renewed');
      App.toast('Admin session renewed for 2 hours.', 'good');
    } catch (error) {
      console.error('Appointed admin session renewal failed:', error);
      const code = String(error && error.code || 'unknown-error');
      App.toast(code === 'permission-denied'
        ? 'The server rejected the renewal. Check that the latest Firestore rules are published.'
        : `Could not renew the admin session (${code}). Please try again.`, 'warn');
    }
    return;
  }
  if (S.isAdmin) {
    // Normal admins verify their PIN again. openPin replaces the session document
    // instead of merge-writing fields that may no longer be permitted.
    openPin('admin', true);
    return;
  }
  App.toast('Staff access has expired. Unlock with your Owner passwords or Admin PIN to continue.', 'warn');
}
async function lockAll() {
  try { await S.db.doc('ownerSessions/' + S.uid).delete(); } catch {}
  try { await S.db.doc('adminSessions/' + S.uid).delete(); } catch {}
  try { await S.db.doc('adminBadges/' + S.uid).delete(); } catch {}
  S.noAuto = true; S.ownerAt = 0; S.adminAt = 0; if (S.ftab === 'admin') S.ftab = 'board'; refreshAdmin(true); showFtab(); App.toast('Everything locked.', 'good');
}
// the owner session locks itself if the app was hidden for more than 5 minutes
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (S.isOwner && hiddenAt && Date.now() - hiddenAt > OWNER_AWAY_MS) { ownerLock(true); App.toast('Owner locked because you were away. Unlock again to continue.', 'warn'); }
  hiddenAt = 0;
});

/* ---- Unlock dialog: admin = 1 PIN, owner = 2 passwords ---- */
function openPin(mode, renew) {
  if (!S.db || !S.uid) return App.toast('You need to be online to unlock.', 'warn');
  mode = mode === 'owner' ? 'owner' : 'admin';
  if (!renew && ((mode === 'owner' && S.isOwner) || (mode === 'admin' && S.isAdmin))) { App.navigate('admin'); Adm.sync(); return; }
  const old = $('pin-ov'); if (old) old.remove();
  const owner = mode === 'owner';
  const ov = elx('div', 'pin-ov'); ov.id = 'pin-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', owner ? 'Owner access' : 'Admin access');
  const c = elx('form', 'card pin-card' + (owner ? ' pin-owner' : '')), msg = elx('p', 'pin-msg'), go = elx('button', 'btn btn-primary', owner ? 'Continue' : 'Unlock'), no = elx('button', 'btn btn-ghost', 'Cancel');
  const pw = (ph) => { const i = document.createElement('input'); i.type = 'password'; i.className = 'adm-search pin-in'; i.placeholder = ph; i.autocomplete = 'off'; i.setAttribute('autocapitalize', 'off'); i.setAttribute('aria-label', ph); return i; };
  const i1 = pw(owner ? 'Owner password 1 of 2' : 'Admin PIN'), i2 = owner ? pw('Owner password 2 of 2') : null;
  if (i2) i2.hidden = true;
  go.type = 'submit'; no.type = 'button'; msg.setAttribute('role', 'alert');
  if (renew) msg.textContent = owner
    ? 'Enter both Owner passwords to renew your 30-minute session.'
    : 'Enter your Admin PIN to renew your 2-hour session.';
  const close = () => { document.removeEventListener('keydown', esc); App.dismissOverlay(ov); }, esc = e => { if (e.key === 'Escape') close(); };
  no.onclick = close; document.addEventListener('keydown', esc); ov.addEventListener('click', e => { if (e.target === ov) close(); });
  const sw = elx('button', 'adm-link', owner ? '\u2190 Admin PIN instead' : 'I\u2019m the owner \u2192'); sw.type = 'button'; sw.onclick = () => { close(); openPin(owner ? 'admin' : 'owner', renew); };
  let step = 1;
  const reset1 = () => { step = 1; i1.value = ''; if (i2) { i2.value = ''; i2.hidden = true; } i1.hidden = false; go.textContent = owner ? 'Continue' : 'Unlock'; i1.focus(); };
  c.onsubmit = async e => {
    e.preventDefault();
    if (owner && step === 1) { if (!i1.value) return; if (Date.now() < +lsGet('own-lock')) { msg.textContent = `Too many wrong tries. Locked for ${Math.ceil((+lsGet('own-lock') - Date.now()) / 60000)} more min.`; return; } step = 2; i1.hidden = true; i2.hidden = false; go.textContent = 'Unlock'; msg.textContent = ''; i2.focus(); return; }
    const secret = owner ? [i1.value, i2.value] : [i1.value.trim()]; if (secret.some(x => !x)) return;
    if (!owner && Date.now() < S.pinLock) { msg.textContent = `Too many tries. Wait ${Math.ceil((S.pinLock - Date.now()) / 60000)} min.`; return; }
    go.disabled = true; go.textContent = 'Checking\u2026'; msg.textContent = '';
    try {
      const F = fsv();
      if (owner) {
        const ref = S.db.doc('ownerSessions/' + S.uid);
        await ref.set({ pw1: secret[0], pw2: secret[1], at: F.FieldValue.serverTimestamp() });   // the server rules compare both passwords; they are never stored in this page
        const snap = await ref.get({ source: 'server' }); S.ownerAt = snap.data().at.toMillis(); S.ownFails = 0; lsSet('own-lock', '0');
        refreshAdmin(true); await setBadge().catch(() => {}); logAct('unlock', '', 'Owner session started'); await setRoster('owner'); liftOwnBan();
        close(); Adm.go('owner'); App.navigate('admin'); Adm.sync(); App.toast(renew ? 'Owner session renewed for 30 minutes.' : 'Owner unlocked for 30 minutes.', 'good');
      } else {
        const ref = S.db.doc('adminSessions/' + S.uid);
        await ref.set({ pin: secret[0], at: F.FieldValue.serverTimestamp() });
        const snap = await ref.get({ source: 'server' }); S.adminAt = snap.data().at.toMillis(); S.pinFails = 0;
        refreshAdmin(true); await setBadge().catch(() => {}); logAct('unlock', '', 'Admin session started'); setRoster('admin');
        close(); App.navigate('admin'); Adm.sync(); App.toast(renew ? 'Admin session renewed for 2 hours.' : 'Admin unlocked for 2 hours.', 'good');
      }
    } catch (er) {
      go.disabled = false;
      if (er && er.code === 'permission-denied') {
        if (owner) { S.ownFails++; if (S.ownFails >= 3) { lsSet('own-lock', String(Date.now() + 15 * 60000)); S.ownFails = 0; msg.textContent = 'Too many wrong tries. Owner access is locked for 15 minutes.'; } else msg.textContent = `Those passwords don\u2019t match (${3 - S.ownFails} tries left). If they are right, the owner rules may not be published yet.`; reset1(); }
        else { S.pinFails++; if (S.pinFails >= 5) { S.pinLock = Date.now() + 5 * 60000; S.pinFails = 0; msg.textContent = 'Too many wrong tries. Locked for 5 minutes.'; } else msg.textContent = `Wrong PIN (${5 - S.pinFails} tries left). If it is right, the admin rules may not be set up yet.`; go.textContent = 'Unlock'; i1.value = ''; i1.focus(); }
      } else { msg.textContent = 'Couldn\u2019t check: ' + ((er && er.message) || 'network problem'); if (owner) reset1(); else { go.textContent = 'Unlock'; i1.value = ''; } }
    }
  };
  c.append(elx('h3', '', owner ? '\u{1F451} Owner access' : '\u{1F6E1}\uFE0F Admin access'),
    elx('p', 'muted', owner ? 'Enter both owner passwords, one after the other. Owner access lasts 30 minutes.' : 'Enter the admin PIN. Access lasts 2 hours, then locks itself.'),
    i1, i2, msg, elx('div', 'cz-row pin-row', no, go), sw);
  ov.append(c); document.body.append(ov); setTimeout(() => i1.focus(), 50);
}
(() => {
  let taps = [];
  const brand = document.querySelector('.brand');
  if (brand) brand.addEventListener('click', e => { const t = Date.now(); taps = taps.filter(x => t - x < 2500); taps.push(t); if (taps.length >= 5) { taps = []; e.preventDefault(); openPin('admin'); } });   // tap the logo 5 times
  document.addEventListener('keydown', e => {
    if (!(e.ctrlKey && e.shiftKey)) return;
    if (e.key === 'A' || e.key === 'a') { e.preventDefault(); openPin('admin'); }       // Ctrl+Shift+A = admin
    if (e.key === 'O' || e.key === 'o') { e.preventDefault(); openPin('owner'); }       // Ctrl+Shift+O = owner
  });
})();

/* ===== Bug reports: players send them, staff triage them ===== */
const BUG_CATS = [['bug', '\u{1F41E} Something is broken'], ['display', '\u{1F4F1} Looks wrong on my phone'], ['content', '\u{1F4DA} Wrong answer or note'], ['idea', '\u{1F4A1} Idea or suggestion'], ['other', 'Something else']];
const BUG_STATUS = { open: ['Received', '\u{1F4EC}'], fixing: ['Being fixed', '\u{1F6E0}\uFE0F'], done: ['Fixed', '\u2705'], wontfix: ['Closed', '\u{1F4D5}'] };
const Bugs = (() => {
  const deviceInfo = () => {
    const ua = navigator.userAgent || '', os = /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Other';
    const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const app = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone ? 'app' : 'web';
    return `${os} ${br} ${app} ${innerWidth}x${innerHeight} @${Math.round((devicePixelRatio || 1) * 10) / 10}x v21`.slice(0, 150);
  };
  // Watch this player's own reports so they hear back (toast when staff reply or change the status).
  function start() {
    if (!S.db || !S.uid) return;
    S.db.collection('bugReports').where('uid', '==', S.uid).onSnapshot(sn => {
      S.myBugs = sn.docs.map(d => { const x = d.data({ serverTimestamps: 'estimate' }); return { id: d.id, ...x, at: x.at && x.at.toMillis ? x.at.toMillis() : Date.now() }; }).sort((a, b) => b.at - a.at);
      let seen = {}; try { seen = JSON.parse(lsGet('bug-seen') || '{}'); } catch {}
      let changed = false;
      S.myBugs.forEach(b => {
        const sig = (b.status || 'open') + '|' + (b.reply || '');
        if (seen[b.id] !== undefined && seen[b.id] !== sig && ((b.status || 'open') !== 'open' || b.reply)) App.toast(`Update on your report: ${BUG_STATUS[b.status || 'open'][0]}${b.reply ? ' \u2013 ' + String(b.reply).slice(0, 80) : ''}`, 'good');
        if (seen[b.id] !== sig) { seen[b.id] = sig; changed = true; }
      });
      if (changed) lsSet('bug-seen', JSON.stringify(seen));
    }, () => {});
  }
  function open() {
    if ($('bug-ov')) return;
    if (!S.db) return App.toast('Reporting needs an internet connection. Reload and try again.', 'warn');
    const ov = elx('div', 'pin-ov bug-ov'); ov.id = 'bug-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Report a bug');
    const f = elx('form', 'card pin-card bug-card'), cat = document.createElement('select'), ta = document.createElement('textarea');
    cat.className = 'adm-sel'; cat.setAttribute('aria-label', 'What kind of problem'); BUG_CATS.forEach(([v, t]) => cat.append(new Option(t, v)));
    ta.className = 'adm-ta'; ta.rows = 5; ta.maxLength = 600; ta.placeholder = 'What happened? What were you doing when it went wrong?'; ta.setAttribute('aria-label', 'Describe the problem');
    const cnt = elx('span', 'adm-info', '0 / 600'); ta.oninput = () => { cnt.textContent = `${ta.value.length} / 600`; };
    const msg = elx('p', 'pin-msg'); msg.setAttribute('role', 'alert');
    const no = elx('button', 'btn btn-ghost', 'Close'), go = elx('button', 'btn btn-primary', 'Send report'); no.type = 'button'; go.type = 'submit';
    const close = () => { document.removeEventListener('keydown', esc); App.dismissOverlay(ov); }, esc = e => { if (e.key === 'Escape') close(); };
    no.onclick = close; ov.addEventListener('click', e => { if (e.target === ov) close(); }); document.addEventListener('keydown', esc);
    f.append(elx('h3', '', '\u{1F41E} Report a bug'), elx('p', 'muted', 'Tell us what went wrong. A real person reads every report.'), elx('label', 'adm-lbl', 'What kind of problem?'), cat, elx('label', 'adm-lbl', 'What happened?'), ta, cnt,
      elx('p', 'adm-info', `We also send your name, the page you are on and your device (${deviceInfo()}). No passwords or private data.`), msg, elx('div', 'cz-row pin-row', no, go));
    const mine = S.myBugs.slice(0, 5);
    if (mine.length) {
      const box = elx('div', 'bug-mine'); box.append(elx('label', 'adm-lbl', 'Your recent reports'));
      mine.forEach(b => { const s0 = b.status || 'open', chip = elx('span', 'bug-chip', `${BUG_STATUS[s0][1]} ${BUG_STATUS[s0][0]}`); chip.dataset.s = s0;
        box.append(elx('div', 'bug-item', chip, elx('span', '', String(b.text || '').slice(0, 140) + (String(b.text || '').length > 140 ? '\u2026' : '')), b.reply ? elx('div', 'bug-reply', `${b.replyBy || 'Staff'}: ${b.reply}`) : null)); });
      f.append(box);
    }
    f.onsubmit = async e => {
      e.preventDefault(); const text = ta.value.trim();
      if (text.length < 10) { msg.textContent = 'Please write at least 10 characters so we can understand the problem.'; return; }
      const wait = 45000 - (Date.now() - (+lsGet('bug-last') || 0)); if (wait > 0) { msg.textContent = `Please wait ${Math.ceil(wait / 1000)}s before sending another report.`; return; }
      let day = {}; try { day = JSON.parse(lsGet('bug-day') || '{}'); } catch {} if (day.d !== today()) day = { d: today(), n: 0 };
      if (day.n >= 5) { msg.textContent = 'You\u2019ve sent 5 reports today. Thank you! Try again tomorrow.'; return; }
      go.disabled = true; go.textContent = 'Sending\u2026'; msg.textContent = '';
      try {
        await S.db.collection('bugReports').add({ uid: S.uid, name: String(nameOf(S.uid) || 'Player').slice(0, 40), cat: cat.value, text, screen: String(App.screen || '').slice(0, 30), device: deviceInfo(), at: fsv().FieldValue.serverTimestamp(), status: 'open' });
        lsSet('bug-last', String(Date.now())); day.n++; lsSet('bug-day', JSON.stringify(day));
        App.toast('Thanks! Your report was sent.', 'good'); close();
      } catch (er) {
        msg.textContent = er && er.code === 'permission-denied' ? 'Couldn\u2019t send. Banned accounts can\u2019t send reports, and the newest firestore.rules must be published.' : 'Couldn\u2019t send: ' + ((er && er.message) || 'network problem');
        go.disabled = false; go.textContent = 'Send report';
      }
    };
    ov.append(f); document.body.append(ov); setTimeout(() => ta.focus(), 60);
  }
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#bug-open')) open(); });
  return { open, start };
})();

const Adm = (() => {
  const st = { sub: 'overview', q: '', f: 'all', sort: 'exp', open: null, amt: 10, kind: 'info', ttl: 86400000, limit: 40, alq: '', alr: 'all', bf: 'open', bq: '' };
  let root = null, body = null, tabs = null, timer = null, eyebrow = null, title = null, tabsKey = '', renderedSub = null;
  let actionTrigger = null;
  const btn = (t, c, f, dis) => {
    const b = elx('button', 'btn ' + c, t);
    b.type = 'button';
    b.onclick = () => {
      actionTrigger = b;
      const result = f();
      if (result && typeof result.finally === 'function') {
        Promise.resolve(result).finally(() => {
          if (actionTrigger === b) actionTrigger = null;
        }).catch(() => {});
      } else if (actionTrigger === b) actionTrigger = null;
      return result;
    };
    if (dis) b.disabled = true;
    return b;
  };
  const ok = m => App.toast(m, 'good');
  const fail = e => App.toast(e && e.code === 'permission-denied' ? 'Blocked by the Firestore rules. Publish the new firestore.rules and check that your role is allowed to do this.' : 'Failed: ' + ((e && e.message) || 'unknown error'), 'warn');
  const run = async (fn, msg) => {
    const trigger = actionTrigger;
    actionTrigger = null;
    try {
      await fn();
      if (msg) ok(msg);
      if (trigger && trigger.isConnected) replayMotion(trigger, 'motion-admin-action-confirmed');
      return true;
    } catch (e) {
      fail(e);
      return false;
    }
  };
  const pdoc = id => S.db.doc('players/' + id);
  const del = () => fsv().FieldValue.delete();
  const daysSince = d => d ? Math.max(0, Math.floor((Date.parse(today()) - Date.parse(d)) / 864e5)) : 9999;
  // who may be touched: admins can't touch other admins or the owner; the owner can touch admins but not another owner. Nobody can ban or delete themselves.
  const canAct = p => p.id === S.uid || (S.isOwner ? roleOf(p.id) !== 'owner' : !roleOf(p.id));
  const canKill = p => p.id !== S.uid && canAct(p);
  const chunked = async fns => { for (let i = 0; i < fns.length; i += 200) { const b = S.db.batch(); fns.slice(i, i + 200).forEach(f => f(b)); await b.commit(); } };
  const tile = (a, b) => elx('div', 'stat-tile', elx('strong', '', String(a)), elx('span', '', b));
  const roleTag = id => { const r = roleOf(id); if (!r) return null; if (S.admins.has(id) || S.owners.has(id)) return adminBadge(id); return elx('span', 'board-title ' + (r === 'owner' ? 'board-owner' : 'board-admin'), r === 'owner' ? '\u{1F451} Owner' : '\u{1F6E1}\uFE0F Admin'); };

  /* ---------- player actions ---------- */
  async function adjust(p, field, delta, label) {
    const cur = Number(p[field]) || 0, next = Math.max(0, cur + delta);
    if (await run(() => pdoc(p.id).set({ [field]: next }, { merge: true }), `${nameOf(p.id)}: ${label} ${cur} \u2192 ${next}`)) logAct(delta > 0 ? 'give' : 'take', p.id, `${label} ${cur} \u2192 ${next}`);
  }
  async function setExact(p) {
    const v = await ask({ title: `Set a value for ${nameOf(p.id)}`, intro: 'This replaces the number. Use it to fix mistakes.', fields: [{ key: 'what', label: 'What to set', options: [['coins', '\u{1F4B0} Coins'], ['totalExp', 'Total EXP'], ['bestStreak', 'Best streak'], ['p50', 'Second Chances']] }, { key: 'n', label: 'New value', type: 'number', value: '0' }], ok: 'Set value', validate: x => (x.n === '' || +x.n < 0 || +x.n > 9999999) ? 'Enter a number from 0 to 9,999,999.' : '' });
    if (!v) return; const n = Math.floor(+v.n), cur = Number(p[v.what]) || 0;
    if (await run(() => pdoc(p.id).set({ [v.what]: n }, { merge: true }), `${nameOf(p.id)}: ${v.what} ${cur} \u2192 ${n}`)) logAct('set', p.id, `${v.what} ${cur} \u2192 ${n}`);
  }
  async function message(p) {
    if (roleOf(p.id) === 'owner' && !S.isOwner) return App.toast('Admins can\u2019t message the owner.', 'warn');
    const v = await ask({ title: `Message ${nameOf(p.id)}`, intro: 'They will see this the next time the app is open, with a Got it button.', fields: [{ key: 't', label: 'Message (max 200 characters)', multiline: true, max: 200 }], ok: 'Send', validate: x => x.t.trim().length < 3 ? 'Write a message first.' : '' });
    if (!v) return;
    if (await run(() => S.db.doc('notices/' + p.id).set({ text: v.t.trim(), at: fsv().FieldValue.serverTimestamp(), by: S.uid, byName: String(nameOf(S.uid)).slice(0, 40) }), 'Message sent.')) logAct('message', p.id, v.t.trim());
  }
  async function rename(p) {
    const v = await ask({ title: `Rename ${nameOf(p.id)}`, intro: 'Use this for names that break the rules. The player can change it again later.', fields: [{ key: 'n', label: 'New name', value: nameOf(p.id), max: 30 }], ok: 'Rename', validate: x => x.n.trim().length < 2 ? 'At least 2 characters.' : '' });
    if (!v) return; const old = nameOf(p.id);
    if (await run(() => pdoc(p.id).set({ displayName: v.n.trim() }, { merge: true }), 'Renamed.')) logAct('rename', p.id, `${old} \u2192 ${v.n.trim()}`);
  }
  async function clearField(p, f, label) {
    if (!await ask({ title: `Remove ${nameOf(p.id)}\u2019s ${label}?`, ok: 'Remove', danger: true })) return;
    if (await run(() => pdoc(p.id).update({ [f]: del() }), `${label} removed.`)) logAct('clear-' + f, p.id, label);
  }
  async function reset(p) {
    if (!await ask({ title: `Reset ${nameOf(p.id)}?`, intro: 'EXP, coins, streak, items and duel record go back to zero. Name and look stay.', ok: 'Reset progress', danger: true })) return;
    const keep = {};
    ['displayName', 'avatar', 'photo', 'color', 'bio', 'gems', 'gemOps', 'gemCosmetics', 'equippedGemCosmetic']
      .forEach(k => { if (Object.prototype.hasOwnProperty.call(p, k)) keep[k] = p[k]; });
    if (await run(() => pdoc(p.id).set(keep), `${nameOf(p.id)} was reset.`)) logAct('reset', p.id, 'progress wiped');
  }
  async function remove(p) {
    if (!await ask({ title: `Delete ${nameOf(p.id)}?`, intro: 'They leave the board. If they open the app again they come back with a blank profile. Ban them too to stop that.', ok: 'Delete player', danger: true })) return;
    if (await run(() => pdoc(p.id).delete(), 'Player deleted.')) { st.open = null; logAct('delete', p.id, 'removed from board'); }
  }
  async function ban(p) {
    if (roleOf(p.id) === 'owner') return App.toast('The owner can\u2019t be banned.', 'warn');
    const v = await ask({ title: `Ban ${nameOf(p.id)}`, intro: 'They lose the board, duels and coins. Quizzes and notes keep working.', fields: [{ key: 'd', label: 'How long', options: [['3600000', '1 hour'], ['21600000', '6 hours'], ['86400000', '1 day'], ['259200000', '3 days'], ['604800000', '7 days'], ['2592000000', '30 days'], ['0', 'Permanent']], }, { key: 'r', label: 'Reason they will see (optional)', max: 120 }], ok: 'Ban', danger: true });
    if (!v) return; const ms = +v.d, until = ms ? Date.now() + ms : 0;
    if (await run(() => S.db.doc('bans/' + p.id).set({ at: Date.now(), by: S.uid, name: String(nameOf(p.id)).slice(0, 40), reason: v.r.trim().slice(0, 120), until }), `${nameOf(p.id)} is banned.`)) logAct('ban', p.id, `${until ? 'until ' + fmtTime(until) : 'permanent'}${v.r.trim() ? ' \u00B7 ' + v.r.trim() : ''}`);
  }
  async function unban(id) { if (await run(() => S.db.doc('bans/' + id).delete(), `${nameOf(id)} is unbanned.`)) logAct('unban', id, ''); }
  async function saveNote(p, text) {
    const t = text.trim().slice(0, 500);
    if (await run(() => t ? S.db.doc('adminNotes/' + p.id).set({ text: t, by: String(nameOf(S.uid)).slice(0, 40), at: Date.now() }) : S.db.doc('adminNotes/' + p.id).delete(), t ? 'Note saved.' : 'Note removed.')) logAct('note', p.id, t ? 'private note updated' : 'private note removed');
  }

  async function editRecord(p) {
    if (!canAct(p)) return App.toast('You cannot edit this staff record.', 'warn');
    const current = { ...p };
    delete current.id;
    const v = await ask({
      title: 'Advanced player record · ' + nameOf(p.id),
      intro: 'Edit every saved player field here, including owned shop items (owned), equipped items (eq), profile fields, progress, consumables and duel stats. Keep values you do not want to change. To remove a top-level field, set it to "__DELETE_FIELD__". Do not edit id or uid.',
      fields: [{ key: 'json', label: 'Player data (JSON)', multiline: true, max: 30000, value: JSON.stringify(current, null, 2) }],
      ok: 'Save player record',
      validate: x => {
        try {
          const value = JSON.parse(x.json);
          if (!value || typeof value !== 'object' || Array.isArray(value)) return 'The record must be a JSON object.';
          if (Object.prototype.hasOwnProperty.call(value, 'id')) return 'Do not add or change the player ID.';
          if (Object.prototype.hasOwnProperty.call(value, 'uid') && value.uid !== p.id) return 'The player UID cannot be changed.';
          const keys = Object.keys(value);
          if (keys.length > 80) return 'This record has too many top-level fields.';
          const protectedKeys = ['__proto__', 'prototype', 'constructor', 'role', 'isAdmin', 'isOwner', 'staffRole'];
          if (keys.some(k => protectedKeys.includes(k))) return 'That field is protected. Staff roles are managed separately.';
          if (x.json.length > 30000) return 'The JSON is too large. Edit a smaller section.';
          return '';
        } catch (e) { return 'JSON is not valid. Check commas, quotes and brackets.'; }
      }
    });
    if (!v) return;
    const next = JSON.parse(v.json), patch = {};
    const removed = [];
    for (const [key, value] of Object.entries(next)) {
      if (key === 'id' || key === 'uid' || ['__proto__', 'prototype', 'constructor', 'role', 'isAdmin', 'isOwner', 'staffRole'].includes(key)) continue;
      if (value === '__DELETE_FIELD__') { patch[key] = del(); removed.push(key); }
      else if (JSON.stringify(value) !== JSON.stringify(current[key])) patch[key] = value;
    }
    const changed = Object.keys(patch);
    if (!changed.length) return App.toast('No changes to save.', 'warn');
    if (removed.length && !await ask({
      title: 'Confirm field removal',
      intro: 'This will permanently remove: ' + removed.join(', '),
      fields: [{ key: 'confirm', label: 'Type REMOVE to confirm' }],
      ok: 'Remove fields',
      danger: true,
      validate: x => x.confirm.trim() !== 'REMOVE' ? 'Type REMOVE exactly.' : ''
    })) return;
    if (await run(() => pdoc(p.id).update(patch), 'Saved ' + changed.length + ' field(s) for ' + nameOf(p.id) + '.')) {
      logAct('record-edit', p.id, 'Updated fields: ' + changed.join(', ').slice(0, 180));
      st.open = p.id;
      paint(true);
    }
  }

  async function setBagItem(p, itemId, ownedNow) {
    if (!canAct(p)) return App.toast('You cannot edit this player inventory.', 'warn');
    const owned = { ...(p.owned || {}) }, eq = { ...(p.eq || {}) };
    if (ownedNow) owned[itemId] = true;
    else { delete owned[itemId]; if (eq.title === itemId) eq.title = ''; }
    if (await run(() => pdoc(p.id).update({ owned, eq }), (ownedNow ? 'Added ' : 'Removed ') + (SHOP.titles.find(x => x.id === itemId)?.name || itemId) + (ownedNow ? ' to ' : ' from ') + nameOf(p.id) + '\'s bag.')) {
      p.owned = owned; p.eq = eq;
      logAct(ownedNow ? 'bag-add' : 'bag-remove', p.id, itemId);
      paint(true);
    }
  }
  async function equipBagTitle(p, itemId) {
    if (!canAct(p)) return App.toast('You cannot edit this player inventory.', 'warn');
    if (!(p.owned || {})[itemId]) return App.toast('Add this title to the player bag first.', 'warn');
    const eq = { ...(p.eq || {}), title: itemId };
    if (await run(() => pdoc(p.id).update({ eq }), nameOf(p.id) + ' now wears ' + (SHOP.titles.find(x => x.id === itemId)?.name || itemId) + '.')) {
      p.eq = eq; logAct('bag-equip', p.id, itemId); paint(true);
    }
  }
  async function adjustConsumable(p, field, delta, label) {
    if (!canAct(p)) return App.toast('You cannot edit this player inventory.', 'warn');
    const current = Math.max(0, Math.floor(Number(p[field]) || 0)), next = Math.max(0, current + delta);
    if (next === current) return App.toast(label + ' is already at zero.', 'warn');
    if (await run(() => pdoc(p.id).update({ [field]: next }), label + ': ' + current + ' → ' + next + ' for ' + nameOf(p.id) + '.')) {
      p[field] = next; logAct('bag-consumable', p.id, field + ' ' + current + ' → ' + next); paint(true);
    }
  }
  function inventoryTools(p) {
    const owned = p.owned || {}, eq = p.eq || {};
    const items = elx('div', 'adm-inventory-list');
    SHOP.titles.forEach(item => {
      const has = !!owned[item.id], equipped = eq.title === item.id;
      items.append(elx('div', 'adm-inventory-row',
        elx('div', 'adm-inventory-name',
          elx('strong', '', item.icon + ' ' + item.name),
          elx('span', 'adm-sub', has ? (equipped ? 'In bag · equipped' : 'In bag · not equipped') : 'Not owned')),
        elx('div', 'adm-inventory-actions',
          btn(has ? 'Remove' : 'Add to bag', has ? 'btn-ghost btn-sm adm-danger' : 'btn-primary btn-sm', () => setBagItem(p, item.id, !has), !canAct(p)),
          has ? btn(equipped ? 'Equipped ✓' : 'Equip', equipped ? 'btn-ghost btn-sm' : 'btn-primary btn-sm', () => equipBagTitle(p, item.id), !canAct(p) || equipped) : null)));
    });
    const supplies = [
      ['p50', 'Second Chances', Number(p.p50) || 0],
      ['sfreezes', 'Streak Freezes', Number(p.sfreezes) || 0],
      ['xpBoost', 'XP Boosts', Number(p.xpBoost) || 0]
    ];
    const supplyRows = elx('div', 'adm-inventory-list');
    supplies.forEach(([field, label, qty]) => supplyRows.append(elx('div', 'adm-inventory-row',
      elx('div', 'adm-inventory-name', elx('strong', '', label), elx('span', 'adm-sub', 'Quantity: ' + qty)),
      elx('div', 'adm-inventory-actions',
        btn('−1', 'btn-ghost btn-sm', () => adjustConsumable(p, field, -1, label), !canAct(p) || qty <= 0),
        btn('+1', 'btn-primary btn-sm', () => adjustConsumable(p, field, 1, label), !canAct(p))))));
    return elx('div', 'adm-card adm-inventory',
      elx('h4', '', '🎒 Player bag and items'),
      elx('p', 'adm-info', 'Add or remove owned shop titles, equip a title, and adjust the player’s consumable items. These changes are saved to their player record.'),
      items, elx('h4', '', 'Consumables'), supplyRows);
  }

  function controls(p) {
    const w = elx('div', 'adm-ctl'), can = canAct(p), kill = canKill(p), banned = S.bans.has(p.id), rt = roleOf(p.id);
    const inp = document.createElement('input'); inp.type = 'number'; inp.min = '1'; inp.value = st.amt; inp.inputMode = 'numeric'; inp.className = 'adm-amt'; inp.setAttribute('aria-label', 'Amount');
    inp.oninput = () => { st.amt = Math.max(1, Math.floor(+inp.value) || 1); };
    const n = () => Math.max(1, Math.floor(+inp.value) || 1);
    const chips = elx('div', 'adm-chips'); [10, 50, 100, 500, 1000].forEach(v => { const c = elx('button', 'adm-chip', '+' + v); c.type = 'button'; c.onclick = () => { inp.value = v; st.amt = v; }; chips.append(c); });
    const g1 = elx('div', 'adm-btns',
      btn('+ \u{1F4B0} coins', 'btn-primary btn-sm', () => adjust(p, 'coins', n(), 'coins'), !can), btn('\u2212 \u{1F4B0} coins', 'btn-ghost btn-sm', () => adjust(p, 'coins', -n(), 'coins'), !can),
      btn('+ EXP', 'btn-primary btn-sm', () => adjust(p, 'totalExp', n(), 'EXP'), !can), btn('\u2212 EXP', 'btn-ghost btn-sm', () => adjust(p, 'totalExp', -n(), 'EXP'), !can));
    const g2 = elx('div', 'adm-btns', btn('\u{1F4DD} Set exact value\u2026', 'btn-ghost btn-sm', () => setExact(p), !can), btn('\u{1F4E9} Send message\u2026', 'btn-ghost btn-sm', () => message(p)));
    const g2b = elx('div', 'adm-btns', btn('\u{1F9F0} Edit full player record\u2026', 'btn-primary btn-sm', () => editRecord(p), !can));
    const g3 = elx('div', 'adm-btns3', btn('\u270F\uFE0F Rename', 'btn-ghost btn-sm', () => rename(p), !can), btn('Remove photo', 'btn-ghost btn-sm', () => clearField(p, 'photo', 'photo'), !can || !p.photo), btn('Remove bio', 'btn-ghost btn-sm', () => clearField(p, 'bio', 'bio'), !can || !p.bio));
    const g4 = elx('div', 'adm-btns3', btn('Reset progress', 'btn-ghost btn-sm adm-danger', () => reset(p), !kill), banned ? btn('Unban', 'btn-primary btn-sm', () => unban(p.id), !can) : btn('\u{1F6AB} Ban', 'btn-ghost btn-sm adm-danger', () => ban(p), !kill), btn('\u{1F5D1}\uFE0F Delete', 'btn-ghost btn-sm adm-danger', () => remove(p), !kill));
    const g5 = S.isOwner && p.id !== S.uid && roleOf(p.id) !== 'owner' ? elx('div', 'adm-btns', isAppointed(p.id) ? btn('\u{1F6E1}\uFE0F Remove admin role', 'btn-ghost btn-sm adm-danger', () => removeStaff(p.id, 'admin')) : btn(roleOf(p.id) ? '\u{1F6E1}\uFE0F Make permanent admin' : '\u{1F6E1}\uFE0F Make admin', 'btn-primary btn-sm', () => appoint(p))) : elx('div');
    const note = document.createElement('textarea'); note.className = 'adm-ta'; note.rows = 2; note.maxLength = 500; note.placeholder = 'Private note about this player (only admins and the owner can see it)'; note.value = (S.notes.get(p.id) || {}).text || ''; note.setAttribute('aria-label', 'Private note');
    const nb = btn('Save note', 'btn-ghost btn-sm', () => saveNote(p, note.value));
    const nmeta = S.notes.get(p.id); const nm = nmeta ? elx('p', 'adm-info', `Last edited by ${nmeta.by || 'staff'} \u00B7 ${fmtTime(nmeta.at)}`) : null;
    const live = p.lastDay === today() || p.lastDay === yesterday(), b = S.bans.get(p.id);
    const info = elx('p', 'adm-info', `ID ${p.id} \u00B7 last active ${p.lastDay || 'never'} \u00B7 \u{1F525} ${live ? p.streak || 0 : 0} (best ${p.bestStreak || 0}) \u00B7 duels ${p.duelW || 0}W-${p.duelL || 0}L-${p.duelD || 0}D \u00B7 Second Chances ${p.p50 || 0}${b ? ` \u00B7 ${banActive(b) ? 'BANNED' : 'ban expired'}${b.reason ? ' (' + b.reason + ')' : ''}` : ''}`);
    w.append(elx('label', 'adm-lbl', 'Amount'), inp, chips, g1, g2, g2b, inventoryTools(p), elx('label', 'adm-lbl', 'Moderation'), g3, g4, g5, elx('label', 'adm-lbl', 'Private note'), note, nb, nm, info);
    if (!can) w.append(elx('p', 'adm-info adm-prot', rt === 'owner' ? '\u{1F451} The owner is protected from every action here.' : '\u{1F6E1}\uFE0F Admins are protected from other admins. Only the owner can act on them.'));
    else if (p.id === S.uid) w.append(elx('p', 'adm-info adm-prot', 'This is you. You can\u2019t ban, reset or delete yourself.'));
    return w;
  }

  /* ---------- tabs ---------- */
  const FILTERS = [['all', 'All'], ['today', 'Active today'], ['inactive', 'Inactive 7d+'], ['banned', 'Banned'], ['staff', 'Staff']];
  const SORTS = [['exp', 'Most EXP'], ['coins', 'Most coins'], ['streak', 'Best streak'], ['recent', 'Recently active'], ['name', 'Name A\u2013Z']];
  function players() {
    const w = elx('div'), q = document.createElement('input'); q.type = 'search'; q.placeholder = 'Search name, ID or private note\u2026'; q.value = st.q; q.className = 'adm-search'; q.setAttribute('aria-label', 'Search players');
    const sort = document.createElement('select'); sort.className = 'adm-sel'; SORTS.forEach(([v, t]) => sort.append(new Option(t, v))); sort.value = st.sort; sort.setAttribute('aria-label', 'Sort players'); sort.onchange = () => { st.sort = sort.value; fill(); };
    const chips = elx('div', 'adm-chips'), count = elx('p', 'adm-info'), list = elx('div', 'adm-list');
    q.oninput = () => { st.q = q.value.trim().toLowerCase(); st.limit = 40; fill(); };
    FILTERS.forEach(([k, t]) => { const c = elx('button', 'adm-chip', t); c.type = 'button'; c.dataset.k = k; c.onclick = () => { st.f = k; st.limit = 40; fill(); }; chips.append(c); });
    const key = { exp: p => p.totalExp || 0, coins: p => p.coins || 0, streak: p => p.bestStreak || 0, recent: p => p.lastDay ? Date.parse(p.lastDay) : 0 };
    const pass = p => st.f === 'all' ? true : st.f === 'today' ? p.lastDay === today() : st.f === 'inactive' ? daysSince(p.lastDay) >= 7 : st.f === 'banned' ? S.bans.has(p.id) : !!roleOf(p.id);
    function fill() {
      chips.querySelectorAll('button').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.k === st.f)));
      let ps = S.players.filter(p => pass(p) && (!st.q || `${nameOf(p.id)} ${p.id} ${(S.notes.get(p.id) || {}).text || ''}`.toLowerCase().includes(st.q)));
      ps = st.sort === 'name' ? ps.sort((a, b) => String(nameOf(a.id)).localeCompare(String(nameOf(b.id)))) : ps.sort((a, b) => key[st.sort](b) - key[st.sort](a));
      count.textContent = `${ps.length} of ${S.players.length} players`;
      const shown = ps.slice(0, st.limit);
      list.replaceChildren(...(shown.length ? shown.map(p => {
        const open = st.open === p.id, row = elx('div', 'adm-row' + (open ? ' is-open' : '')), hd = elx('button', 'adm-head'); hd.type = 'button';
        const nm = elx('strong', '', nameOf(p.id)); if (p.id === S.uid) nm.append(' ', elx('span', 'you-tag', 'you')); const rt = roleTag(p.id); if (rt) nm.append(' ', rt); if (S.bans.has(p.id)) nm.append(' ', elx('span', 'board-title adm-bantag', 'Banned'));
        const t = elx('div', 'adm-who', nm, elx('span', 'adm-sub', `Lv ${lv(p.totalExp || 0).level} \u00B7 ${p.totalExp || 0} EXP \u00B7 \u{1F4B0} ${p.coins || 0} \u00B7 ${p.lastDay === today() ? 'active today' : p.lastDay ? daysSince(p.lastDay) + 'd ago' : 'never active'}${S.notes.has(p.id) ? ' \u00B7 \u{1F4DD}' : ''}`));
        hd.append(bubble(p, 36), t, elx('span', 'adm-chev', open ? '\u25B2' : '\u25BC')); hd.onclick = () => { st.open = open ? null : p.id; fill(); };
        row.append(hd); if (open) row.append(controls(p)); return row;
      }) : [elx('p', 'muted', 'No players match.')]));
      if (ps.length > shown.length) list.append(btn(`Show ${Math.min(40, ps.length - shown.length)} more`, 'btn-ghost btn-sm', () => { st.limit += 40; fill(); }));
    }
    fill(); w.append(q, elx('div', 'adm-two', sort, count), chips, list); return w;
  }

  function stats() {
    const ps = S.players, td = today(), wk = weekStart(), sum = f => ps.reduce((a, p) => a + (Number(f(p)) || 0), 0);
    const duels = Math.round(sum(p => (p.duelW || 0) + (p.duelL || 0) + (p.duelD || 0)) / 2), avgLv = ps.length ? (sum(p => lv(p.totalExp || 0).level) / ps.length).toFixed(1) : '0';
    const tiles = elx('div', 'stat-tiles',
      tile(ps.length, 'Players'), tile(ps.filter(p => p.lastDay === td).length, 'Active today'), tile(ps.filter(p => p.weekKey === wk && (p.weekExp || 0) > 0).length, 'Active this week'), tile(ps.filter(p => daysSince(p.lastDay) >= 7).length, 'Inactive 7d+'),
      tile(sum(p => p.totalExp), 'Total EXP'), tile(sum(p => p.coins), 'Coins in circulation'), tile(duels, 'Duels played'), tile(sum(p => p.dayKey === td ? p.dayExp : 0), 'EXP earned today'),
      tile(avgLv, 'Average level'), tile(S.bans.size, 'Banned now'), tile(S.admins.size, 'Staff online'), tile(ps.filter(p => !p.lastDay).length, 'Never studied'), tile(S.bugs.filter(b => (b.status || 'open') === 'open').length, 'Open bug reports'));
    const bar = (title, rows) => { const mx = Math.max(1, ...rows.map(r => r[1])), c = elx('div', 'adm-top'); c.append(elx('h4', '', title)); rows.forEach(([l, v]) => { const r = elx('div', 'adm-bar'), f = elx('i'); f.style.width = Math.max(v ? 4 : 0, Math.round(v / mx * 100)) + '%'; r.append(elx('span', '', l), elx('div', 'adm-bar-track', f), elx('strong', '', String(v))); c.append(r); }); return c; };
    const buckets = [['Today', p => daysSince(p.lastDay) === 0], ['Yesterday', p => daysSince(p.lastDay) === 1], ['2\u20137 days', p => { const d = daysSince(p.lastDay); return d >= 2 && d <= 7; }], ['8\u201330 days', p => { const d = daysSince(p.lastDay); return d >= 8 && d <= 30; }], ['Over 30 days / never', p => daysSince(p.lastDay) > 30]].map(([l, f]) => [l, ps.filter(f).length]);
    const lvls = [['Level 1\u20132', 1, 2], ['Level 3\u20135', 3, 5], ['Level 6\u201310', 6, 10], ['Level 11+', 11, 999]].map(([l, a, b]) => [l, ps.filter(p => { const x = lv(p.totalExp || 0).level; return x >= a && x <= b; }).length]);
    const top = (title, k, fmt) => { const c = elx('div', 'adm-top'); c.append(elx('h4', '', title)); const ol = elx('ol'); [...ps].sort((a, b) => k(b) - k(a)).filter(p => k(p) > 0).slice(0, 5).forEach(p => ol.append(elx('li', '', elx('span', '', nameOf(p.id)), elx('strong', '', fmt(k(p)))))); if (!ol.children.length) ol.append(elx('li', 'muted', 'Nobody yet')); c.append(ol); return c; };
    return elx('div', '', tiles, bar('\u{1F4C5} When players were last active', buckets), bar('\u{1F4C8} Players by level', lvls), top('\u{1F3C6} Top EXP', p => p.totalExp || 0, v => v + ' EXP'), top('\u{1F4B0} Richest', p => p.coins || 0, v => '\u{1F4B0} ' + v), top('\u{1F525} Best streaks', p => p.bestStreak || 0, v => v + ' days'), top('\u2694\uFE0F Most duel wins', p => p.duelW || 0, v => v + ' wins'));
  }

  function overview() {
    const openBugs = S.bugs.filter(b => (b.status || 'open') === 'open').length;
    const fixingBugs = S.bugs.filter(b => (b.status || 'open') === 'fixing').length;
    const activeBans = S.bans.size;
    const activeAdmins = [...S.badgeMap].filter(([id, until]) => until > Date.now() && S.badgeRole.get(id) !== 'owner').length;
    const activeToday = S.players.filter(p => p.lastDay === today()).length;
    const card = (heading, value, note) => elx('div', 'adm-card adm-overview-card',
      elx('span', 'adm-overview-kicker', heading),
      elx('strong', 'adm-overview-value', String(value)),
      elx('span', 'adm-info', note));
    const go = (key, label) => btn(label, 'btn-ghost btn-sm', () => { st.sub = key; paint(true); });
    const notice = openBugs
      ? elx('div', 'adm-card adm-overview-alert', elx('strong', '', '\u{1F41E} ' + openBugs + ' bug report(s) need attention'), elx('p', 'adm-info', 'Review reports, reply to players and update their status.'), go('bugs', 'Review bug reports'))
      : elx('div', 'adm-card adm-overview-alert', elx('strong', '', '\u2705 No new bug reports waiting'), elx('p', 'adm-info', fixingBugs + ' report(s) are marked as being fixed.'));
    const shortcuts = elx('div', 'adm-overview-grid',
      card('Players', S.players.length, activeToday + ' active today'),
      card('Active bans', activeBans, 'Review or remove restrictions'),
      card('Open reports', openBugs, fixingBugs + ' being fixed'),
      card('Admins online', activeAdmins, 'Live staff sessions'),
      elx('div', 'adm-card adm-overview-card adm-overview-wide',
        elx('h4', '', '\u26A1 Quick actions'),
        elx('p', 'adm-info', 'Jump straight to the tasks staff use most often.'),
        elx('div', 'adm-btns', go('players', '\u{1F465} Manage players'), go('bugs', '\u{1F41E} Review reports'),
          go('bans', '\u{1F6AB} Manage bans'), go('announce', '\u{1F4E3} Send announcement'),
          go('stats', '\u{1F4CA} Activity stats'), go('tools', '\u{1F4E4} Exports and tools'))),
      ...(S.isOwner ? [
        elx('div', 'adm-card adm-overview-card adm-overview-wide',
          elx('h4', '', '\u{1F451} Owner controls'),
          elx('p', 'adm-info', 'Manage staff access, security, global settings, rewards, exports and maintenance.'),
          elx('div', 'adm-btns', go('owner', 'Open Owner controls'), go('audit', 'Review staff activity')))
      ] : []));
    const header = elx('div', 'adm-card adm-overview-alert',
      elx('strong', '', S.isOwner ? '\u{1F451} Owner workspace' : '\u{1F6E1}\uFE0F Admin workspace'),
      elx('p', 'adm-info', S.isOwner
        ? 'You have full moderation and management access. Admins remain restricted from Owner accounts and Owner-only settings.'
        : 'Manage regular player accounts, reports, bans and announcements. Staff appointments, security settings and audit history remain Owner-only.'));
    return elx('div', 'adm-overview', header, notice, shortcuts);
  }

  function bansTab() {
    const all = [...S.bansAll].sort((a, b) => (b[1].at || 0) - (a[1].at || 0)), w = elx('div');
    w.append(elx('p', 'adm-info', `${S.bans.size} active \u00B7 ${all.length - S.bans.size} expired`));
    if (!all.length) { w.append(elx('p', 'muted', 'Nobody has been banned. Good.')); return w; }
    const list = elx('div', 'adm-list');
    all.forEach(([id, b]) => {
      const act = banActive(b), row = elx('div', 'adm-row adm-ban' + (act ? '' : ' is-expired')), nm = elx('strong', '', b.name || nameOf(id));
      row.append(elx('div', 'adm-who adm-pad', nm, elx('span', 'adm-sub', `${act ? 'Active' : 'Expired'} \u00B7 ${b.until ? (act ? 'ends ' : 'ended ') + fmtTime(b.until) : 'permanent'}${b.reason ? ' \u00B7 \u201C' + b.reason + '\u201D' : ''}`), elx('span', 'adm-sub', `Banned ${b.at ? fmtTime(b.at) : ''}${b.by ? ' by ' + nameOf(b.by) : ''}`)),
        elx('div', 'adm-pad', btn(act ? 'Unban' : 'Remove record', 'btn-ghost btn-sm', () => unban(id), !act ? false : !!roleOf(id) && !S.isOwner)));
      list.append(row);
    });
    w.append(list); return w;
  }

  const TEMPLATES = [['\u{1F4DA} Revise tonight', 'Mock exam week is close. Do at least one quiz tonight and keep your streak alive!'], ['\u{1F389} Double effort day', 'Weekend challenge: beat your own EXP record today. Good luck, everyone!'], ['\u26A0\uFE0F Be respectful', 'Reminder: keep names and bios clean and kind. Rule breakers will be banned from the board.'], ['\u{1F6E0}\uFE0F Update', 'The app was just updated. Close it fully and open it again to get the latest version.']];
  function announce() {
    const w = elx('div'), cur = S.ann, ta = document.createElement('textarea'); ta.maxLength = 280; ta.rows = 3; ta.placeholder = 'Write a message for everyone (max 280 characters)\u2026'; ta.className = 'adm-ta'; ta.setAttribute('aria-label', 'Announcement text');
    const cnt = elx('span', 'adm-info', '0 / 280'), prev = elx('div', 'adm-prev'); prev.dataset.kind = st.kind;
    const kind = document.createElement('select'), ttl = document.createElement('select'); kind.className = ttl.className = 'adm-sel';
    [['info', '\u{1F4E2} Info'], ['event', '\u{1F389} Event'], ['warn', '\u26A0\uFE0F Warning'], ...(S.isOwner ? [['critical', '\u{1F6A8} Urgent (owner only)']] : [])].forEach(([v, t]) => kind.append(new Option(t, v))); kind.value = st.kind; if (!kind.value) { kind.value = 'info'; st.kind = 'info'; }
    [[3600000, 'Disappears in 1 hour'], [86400000, 'Disappears in 24 hours'], [604800000, 'Disappears in 7 days'], [0, 'Stays until I clear it']].forEach(([v, t]) => ttl.append(new Option(t, v))); ttl.value = String(st.ttl); ttl.onchange = () => { st.ttl = +ttl.value; };
    const upd = () => { cnt.textContent = `${ta.value.length} / 280`; prev.dataset.kind = kind.value; prev.replaceChildren(elx('span', 'ann-ic', ANN_ICON[kind.value]), elx('div', 'ann-txt', ta.value.trim() || 'Preview of your announcement')); };
    kind.onchange = () => { st.kind = kind.value; upd(); }; ta.oninput = upd; upd();
    const tpl = elx('div', 'adm-chips'); TEMPLATES.forEach(([l, t]) => { const c = elx('button', 'adm-chip', l); c.type = 'button'; c.onclick = () => { ta.value = t; upd(); ta.focus(); }; tpl.append(c); });
    const pinWrap = elx('div'), pinBox = document.createElement('input'); pinBox.type = 'checkbox'; pinBox.id = 'ann-pin';
    if (S.isOwner) pinWrap.append(elx('label', 'adm-info', pinBox, ' \u{1F4CC} Pin it: admins can\u2019t edit or clear it'));
    const row = elx('div', 'adm-btns');
    row.append(btn('\u{1F4E3} Post to everyone', 'btn-primary btn-sm', async () => {
      const text = ta.value.trim(); if (text.length < 3) return App.toast('Write a message first.', 'warn');
      if (S.ann && S.ann.pinned && !S.isOwner && (!S.ann.expires || S.ann.expires > Date.now())) return App.toast('The owner pinned an announcement. Only the owner can replace it.', 'warn');
      if (await run(() => S.db.doc('announcements/current').set({ id: Date.now().toString(36), text, kind: kind.value, at: Date.now(), expires: st.ttl ? Date.now() + st.ttl : 0, by: nameOf(S.uid), pinned: !!(S.isOwner && pinBox.checked) }), 'Announcement posted.')) { ta.value = ''; upd(); logAct('announce', '', text); }
    }), btn('Clear current', 'btn-ghost btn-sm', async () => { if (S.ann && S.ann.pinned && !S.isOwner) return App.toast('The owner pinned this announcement. Only the owner can clear it.', 'warn'); if (await run(() => S.db.doc('announcements/current').delete(), 'Announcement cleared.')) logAct('announce-clear', '', ''); }));
    w.append(elx('label', 'adm-lbl', 'Quick templates'), tpl, ta, cnt, elx('div', 'adm-two', kind, ttl), prev, pinWrap, row, elx('p', 'adm-info', cur && cur.text && (!cur.expires || cur.expires > Date.now()) ? `Live now${cur.pinned ? ' (pinned by the owner)' : ''} (by ${cur.by || 'staff'}): \u201C${cur.text}\u201D` : 'Nothing is live right now. Players can dismiss an announcement; a new one shows again.'));
    return w;
  }

  /* ---------- bug reports (staff) ---------- */
  const BUG_FILTERS = [['open', 'Open'], ['fixing', 'Being fixed'], ['done', 'Fixed'], ['all', 'All']];
  const bugCat = c => (BUG_CATS.find(x => x[0] === c) || BUG_CATS[4])[1];
  const bugStatus = b => b.status || 'open';
  async function bugSet(b, status) {
    if (await run(() => S.db.doc('bugReports/' + b.id).update({ status, replyBy: String(nameOf(S.uid)).slice(0, 40), doneAt: status === 'open' ? 0 : Date.now() }), `Marked: ${BUG_STATUS[status][0]}.`)) logAct('bug-' + status, b.uid, String(b.text || '').slice(0, 80));
  }
  async function bugReply(b) {
    const v = await ask({ title: `Reply to ${b.name || 'player'}`, intro: 'They see this under their report. Max 300 characters.', fields: [{ key: 't', label: 'Reply', multiline: true, max: 300, value: b.reply || '' }], ok: 'Send reply', validate: x => x.t.trim().length < 2 ? 'Write a reply first.' : '' });
    if (!v) return;
    if (await run(() => S.db.doc('bugReports/' + b.id).update({ reply: v.t.trim(), replyBy: String(nameOf(S.uid)).slice(0, 40), doneAt: Date.now(), status: bugStatus(b) }), 'Reply sent.')) logAct('bug-reply', b.uid, v.t.trim());
  }
  async function bugDelete(b) {
    if (!await ask({ title: 'Delete this report?', intro: 'It disappears for you and for the player. This can\u2019t be undone.', ok: 'Delete', danger: true })) return;
    if (await run(() => S.db.doc('bugReports/' + b.id).delete(), 'Report deleted.')) logAct('bug-delete', b.uid, String(b.text || '').slice(0, 80));
  }
  async function bugClearDone() {
    const ids = S.bugs.filter(b => ['done', 'wontfix'].includes(bugStatus(b))).map(b => b.id);
    if (!ids.length) return App.toast('No fixed or closed reports to clear.', 'warn');
    if (!await ask({ title: `Delete ${ids.length} fixed/closed reports?`, ok: 'Delete them', danger: true })) return;
    if (await run(() => chunked(ids.map(id => b => b.delete(S.db.doc('bugReports/' + id)))), `Deleted ${ids.length} reports.`)) logAct('bug-delete', '', `${ids.length} fixed/closed reports cleared`);
  }
  function bugCsv() {
    const head = ['when', 'player', 'playerId', 'type', 'status', 'screen', 'device', 'report', 'reply'];
    const rows = S.bugs.map(b => [new Date(b.at).toISOString(), b.name || '', b.uid || '', b.cat || '', bugStatus(b), b.screen || '', b.device || '', b.text || '', b.reply || '']);
    const blob = new Blob(['\uFEFF' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `bece-bug-reports-${today()}.csv`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    ok('Bug reports exported.'); logAct('export', '', `${rows.length} bug reports to CSV`);
  }
  function bugsTab() {
    const w = elx('div'), q = document.createElement('input'); q.type = 'search'; q.placeholder = 'Search reports\u2026'; q.value = st.bq; q.className = 'adm-search'; q.setAttribute('aria-label', 'Search bug reports');
    const chips = elx('div', 'adm-chips'), info = elx('p', 'adm-info'), list = elx('div', 'adm-list');
    const n = k => S.bugs.filter(b => k === 'all' || bugStatus(b) === k).length;
    BUG_FILTERS.forEach(([k, t]) => { const c = elx('button', 'adm-chip', `${t} ${n(k)}`); c.type = 'button'; c.dataset.k = k; c.onclick = () => { st.bf = k; fill(); }; chips.append(c); });
    q.oninput = () => { st.bq = q.value.trim().toLowerCase(); fill(); };
    function fill() {
      chips.querySelectorAll('button').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.k === st.bf)));
      const rs = S.bugs.filter(b => (st.bf === 'all' || bugStatus(b) === st.bf) && (!st.bq || `${b.name} ${b.text} ${b.screen} ${b.device} ${b.reply || ''}`.toLowerCase().includes(st.bq)));
      info.textContent = `${rs.length} shown \u00B7 latest 200 reports are kept in view`;
      list.replaceChildren(...(rs.length ? rs.slice(0, 80).map(b => {
        const s0 = bugStatus(b), card = elx('div', 'adm-row adm-bug');
        const top = elx('div', 'adm-who', elx('strong', '', b.name || 'Player'), elx('span', 'adm-sub', `${bugCat(b.cat)} \u00B7 ${fmtTime(b.at)} \u00B7 screen: ${b.screen || '?'}`));
        const chip = elx('span', 'bug-chip', `${BUG_STATUS[s0][1]} ${BUG_STATUS[s0][0]}`); chip.dataset.s = s0;
        const acts = [];
        if (s0 === 'open') acts.push(btn('Being fixed', 'btn-ghost btn-sm', () => bugSet(b, 'fixing')));
        if (s0 !== 'done') acts.push(btn('Mark fixed', 'btn-primary btn-sm', () => bugSet(b, 'done')));
        if (s0 !== 'wontfix' && s0 !== 'done') acts.push(btn('Won\u2019t fix', 'btn-ghost btn-sm', () => bugSet(b, 'wontfix')));
        if (s0 !== 'open') acts.push(btn('Reopen', 'btn-ghost btn-sm', () => bugSet(b, 'open')));
        acts.push(btn('\u{1F4AC} Reply\u2026', 'btn-ghost btn-sm', () => bugReply(b)));
        if (S.isOwner) acts.push(btn('\u{1F5D1}\uFE0F Delete', 'btn-ghost btn-sm adm-danger', () => bugDelete(b)));
        card.append(top, chip, elx('p', 'adm-bug-text', b.text), elx('p', 'adm-info', b.device || ''), b.reply ? elx('p', 'adm-info', `Reply by ${b.replyBy || 'staff'}: ${b.reply}`) : null, elx('div', 'adm-btns', ...acts));
        return card;
      }) : [elx('p', 'muted', S.bugs.length ? 'No reports match.' : 'No bug reports yet. When players send one it shows up here.')]));
    }
    fill(); w.append(q, chips, info, list);
    if (S.isOwner && S.bugs.length) w.append(elx('div', 'adm-card', elx('h4', '', '\u{1F451} Owner tools'), elx('div', 'adm-btns', btn('Export CSV', 'btn-ghost btn-sm', bugCsv), btn('Clear fixed/closed\u2026', 'btn-ghost btn-sm adm-danger', bugClearDone))));
    return w;
  }

  const csvCell = v => { const s = String(v === undefined || v === null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  function exportCsv() {
    const head = ['id', 'name', 'level', 'totalExp', 'coins', 'streak', 'bestStreak', 'lastDay', 'duelWins', 'duelLosses', 'duelDraws', 'banned'];
    const rows = [...S.players].sort((a, b) => (b.totalExp || 0) - (a.totalExp || 0)).map(p => [p.id, nameOf(p.id), lv(p.totalExp || 0).level, p.totalExp || 0, p.coins || 0, p.streak || 0, p.bestStreak || 0, p.lastDay || '', p.duelW || 0, p.duelL || 0, p.duelD || 0, S.bans.has(p.id) ? 'yes' : '']);
    const blob = new Blob(['\uFEFF' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `bece-players-${today()}.csv`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    ok('Players exported.'); logAct('export', '', `${rows.length} players to CSV`);
  }
  async function copyBoard() {
    const wk = weekStart(), top = S.players.filter(p => p.weekKey === wk && (p.weekExp || 0) > 0).sort((a, b) => b.weekExp - a.weekExp).slice(0, 10);
    const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'], text = `\u{1F3C6} BECE Hub weekly top ${top.length || 10} (week of ${wk})\n` + (top.length ? top.map((p, i) => `${medals[i] || i + 1 + '.'} ${nameOf(p.id)} \u2013 ${p.weekExp} EXP`).join('\n') : 'Nobody has earned EXP this week yet.') + '\nKeep revising!';
    try { await navigator.clipboard.writeText(text); ok('Copied. Paste it into your class group.'); } catch { await ask({ title: 'Copy this text', fields: [{ key: 't', label: 'Weekly top 10', multiline: true, value: text }], ok: 'Done' }); }
  }
  function exportPlayersJson() {
    if (!S.isOwner) return App.toast('Owner access required.', 'warn');
    const records = S.players.map(p => {
      const record = { ...p };
      delete record.id;
      for (const key of Object.keys(record)) if (/password|secret|token|email/i.test(key)) delete record[key];
      return { id: p.id, ...record };
    });
    const blob = new Blob(['\uFEFF' + JSON.stringify(records, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'bece-full-player-records-' + today() + '.json';
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
    logAct('players-json-export', '', records.length + ' full player records exported');
    App.toast('Full player records exported, including owned and equipped item data.', 'good');
  }
  function exportRosterCsv() {
    if (!S.isOwner) return App.toast('Owner access required.', 'warn');
    const rows = [['playerId', 'name', 'role', 'appointed', 'device']];
    for (const [id, data] of (S.rosterData || new Map())) rows.push([id, nameOf(id), data.role || 'admin', data.appointed ? 'yes' : 'no', id === S.uid ? 'current device' : '']);
    const esc = value => '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
    const csv = '\uFEFF' + rows.map(row => row.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'bece-staff-roster-' + today() + '.csv';
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
    logAct('roster-export', '', Math.max(0, rows.length - 1) + ' staff roster rows exported');
    App.toast('Staff roster exported.', 'good');
  }

  function tools() {
    const card = (h, p, ...b) => elx('div', 'adm-card', elx('h4', '', h), elx('p', 'adm-info', p), elx('div', 'adm-btns', ...b));
    return elx('div', '',
      card('\u{1F4E4} Export players', 'Download every player\u2019s level, EXP, coins, streak and last active day as a spreadsheet file (CSV).', btn('Download CSV', 'btn-primary btn-sm', exportCsv)),
      card('\u{1F4CB} Share the weekly top 10', 'Copies a ready-made message with this week\u2019s leaders. Paste it into WhatsApp.', btn('Copy text', 'btn-primary btn-sm', copyBoard)),
      card('\u{1F4A1} Good to know', `Admin sessions last 2 hours. ${S.isOwner ? 'Your owner session lasts 30 minutes and locks if you leave the app for 5 minutes.' : 'Only the owner can kick admins, change passwords, run bulk tools and read the audit log.'} Everything you do is written to the audit log.`));
  }

  /* ---------- owner-only ---------- */
  async function changeAdminPin() {
    const v = await ask({ title: 'Change the admin PIN', intro: 'Every admin is signed out right now and needs the new PIN to come back. Pick something others can\u2019t guess.', fields: [{ key: 'a', label: 'New admin PIN (4 or more characters)', type: 'password', max: 64 }, { key: 'b', label: 'Type it again', type: 'password', max: 64 }], ok: 'Change PIN & sign out admins', danger: true, validate: x => x.a.length < 4 ? 'Use at least 4 characters.' : x.a !== x.b ? 'The two entries don\u2019t match.' : '' });
    if (!v) return;
    if (!await run(() => S.db.doc('config/admin').set({ pin: v.a }), 'Admin PIN changed.')) return;
    const others = [...S.badgeMap.keys()].filter(id => id !== S.uid);
    await chunked(others.flatMap(id => [b => b.delete(S.db.doc('adminSessions/' + id)), b => b.delete(S.db.doc('adminBadges/' + id))])).catch(() => {});
    logAct('pin-change', '', `signed out ${others.length} other staff`);
  }
  async function changeOwnerPw() {
    const v = await ask({ title: 'Change the 2 owner passwords', intro: 'Choose two different passwords, 8+ characters each. Your owner session ends and you unlock again with the new ones. If you forget them you must reset them in the Firebase console.', fields: [{ key: 'p1', label: 'New owner password 1', type: 'password', max: 128 }, { key: 'p2', label: 'New owner password 2', type: 'password', max: 128 }, { key: 'c1', label: 'Repeat password 1', type: 'password', max: 128 }, { key: 'c2', label: 'Repeat password 2', type: 'password', max: 128 }], ok: 'Change passwords', danger: true, validate: x => (x.p1.length < 8 || x.p2.length < 8) ? 'Each password needs at least 8 characters.' : x.p1 === x.p2 ? 'The two passwords must be different.' : (x.p1 !== x.c1 || x.p2 !== x.c2) ? 'The repeated passwords don\u2019t match.' : '' });
    if (!v) return;
    await logAct('owner-pw-change', '', 'owner passwords changed');
    if (!await run(() => S.db.doc('config/owner').set({ pw1: v.p1, pw2: v.p2 }), 'Owner passwords changed. Unlock again with the new ones.')) return;
    await ownerLock(true);
  }
  async function kick(id) {
    if (!await ask({ title: `Sign ${nameOf(id)} out of admin?`, intro: 'Their admin session ends now. They can get back in with the PIN unless you also change the PIN.', ok: 'Sign out', danger: true })) return;
    if (await run(async () => { await S.db.doc('adminSessions/' + id).delete(); await S.db.doc('adminBadges/' + id).delete(); }, `${nameOf(id)} was signed out.`)) logAct('kick', id, 'admin session ended');
  }
  async function giftAll() {
    const v = await ask({ title: 'Gift coins to many players', fields: [{ key: 'who', label: 'Who gets them', options: [['today', 'Players active today'], ['week', 'Players active this week'], ['all', 'Everyone']] }, { key: 'n', label: 'Coins each', type: 'number', value: '50' }], ok: 'Send gift', validate: x => (!(+x.n >= 1) || +x.n > 10000) ? 'Enter 1 to 10,000 coins.' : '' });
    if (!v) return; const n = Math.floor(+v.n), wk = weekStart(), td = today();
    const ps = S.players.filter(p => !S.bans.has(p.id) && (v.who === 'all' || (v.who === 'today' ? p.lastDay === td : (p.weekKey === wk && (p.weekExp || 0) > 0))));
    if (!ps.length) return App.toast('Nobody matches that group.', 'warn');
    if (await run(() => chunked(ps.map(p => b => b.update(pdoc(p.id), { coins: fsv().FieldValue.increment(n) }))), `Gave ${n} coins to ${ps.length} players.`)) logAct('gift-all', '', `${n} coins each to ${ps.length} players (${v.who})`);
  }
  async function setRewardRates() {
    if (!S.isOwner) return App.toast('Owner access required.', 'warn');
    const v = await ask({
      title: 'Set practice reward rates',
      intro: 'These rates apply to new quiz rewards for every player. Existing EXP and coins are not changed.',
      fields: [
        { key: 'exp', label: 'EXP multiplier', options: [['0.5', '0.5× EXP'], ['1', '1× EXP (normal)'], ['1.5', '1.5× EXP'], ['2', '2× EXP'], ['3', '3× EXP']] },
        { key: 'coins', label: 'Coin multiplier', options: [['0.5', '0.5× coins'], ['1', '1× coins (normal)'], ['1.5', '1.5× coins'], ['2', '2× coins'], ['3', '3× coins']] }
      ],
      ok: 'Save reward rates',
      validate: x => !['0.5','1','1.5','2','3'].includes(x.exp) || !['0.5','1','1.5','2','3'].includes(x.coins) ? 'Choose a valid reward rate.' : ''
    });
    if (!v) return;
    const expMultiplier = Number(v.exp), coinMultiplier = Number(v.coins);
    if (await run(() => S.db.doc('settings/app').set({ expMultiplier, coinMultiplier, ratesUpdatedAt: Date.now(), ratesUpdatedBy: S.uid }, { merge: true }), 'Practice reward rates updated for everyone.')) {
      logAct('reward-rates', '', expMultiplier + 'x EXP, ' + coinMultiplier + 'x coins');
      Adm.paint(true);
    }
  }
  async function toggleShop() {
    if (!S.isOwner) return App.toast('Owner access required.', 'warn');
    const paused = !!S.settings.shopPaused;
    const next = !paused;
    if (await run(() => S.db.doc('settings/app').set({ shopPaused: next, shopUpdatedAt: Date.now(), shopUpdatedBy: S.uid }, { merge: true }), next ? 'Shop purchases paused for everyone.' : 'Shop purchases are open again.')) {
      logAct(next ? 'shop-paused' : 'shop-resumed', '', next ? 'new purchases paused' : 'purchases resumed');
      Adm.paint(true);
    }
  }
  function downloadAuditCsv() {
    if (!S.isOwner) return App.toast('Owner access required.', 'warn');
    const esc = value => '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
    const rows = [['Time','Role','Staff member','Action','Target','Details'], ...S.audit.map(e => [fmtTime(e.at), e.role, e.byName, e.action, e.targetName, e.detail])];
    const csv = '\uFEFF' + rows.map(row => row.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'bece-owner-audit-log.csv'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    logAct('audit-export', '', S.audit.length + ' audit entries exported');
    App.toast('Audit log exported.', 'good');
  }
  async function giftExpAll() {
    const v = await ask({ title: 'Award EXP to many players', fields: [{ key: 'who', label: 'Who receives EXP', options: [['today', 'Players active today'], ['week', 'Players active this week'], ['all', 'Everyone']] }, { key: 'n', label: 'EXP each', type: 'number', value: '100' }], ok: 'Award EXP', validate: x => (!(+x.n >= 1) || +x.n > 50000) ? 'Enter 1 to 50,000 EXP.' : '' });
    if (!v) return;
    const n = Math.floor(+v.n), wk = weekStart(), td = today();
    const ps = S.players.filter(p => !S.bans.has(p.id) && (v.who === 'all' || (v.who === 'today' ? p.lastDay === td : (p.weekKey === wk && (p.weekExp || 0) > 0))));
    if (!ps.length) return App.toast('Nobody matches that group.', 'warn');
    if (await run(() => chunked(ps.map(p => b => b.update(pdoc(p.id), { totalExp: fsv().FieldValue.increment(n), weekExp: fsv().FieldValue.increment(n) }))), 'Awarded ' + n + ' EXP to ' + ps.length + ' players.')) logAct('gift-exp-all', '', n + ' EXP each to ' + ps.length + ' players (' + v.who + ')');
  }
  async function signOutAllAdmins() {
    const ids = [...S.badgeMap.keys()].filter(id => id !== S.uid && S.badgeRole.get(id) !== 'owner');
    if (!ids.length) return App.toast('No other active admins to sign out.', 'warn');
    const v = await ask({ title: 'Sign out every active admin?', intro: ids.length + ' active admin session(s) will end. Your owner session stays active.', fields: [{ key: 'w', label: 'Type SIGN OUT' }], ok: 'Sign out admins', danger: true, validate: x => x.w.trim() !== 'SIGN OUT' ? 'Type SIGN OUT exactly.' : '' });
    if (!v) return;
    if (await run(() => chunked(ids.flatMap(id => [b => b.delete(S.db.doc('adminSessions/' + id)), b => b.delete(S.db.doc('adminBadges/' + id))])), 'Signed out ' + ids.length + ' admin(s).')) {
      ids.forEach(id => S.badgeMap.delete(id));
      logAct('signout-all-admins', '', ids.length + ' admin sessions ended');
      Adm.paint(true);
    }
  }
  async function weeklyReset() {
    const v = await ask({ title: 'Reset the weekly board', intro: 'Sets everyone\u2019s EXP for this week to 0. Total EXP, coins and streaks are not touched. Type RESET to confirm.', fields: [{ key: 'w', label: 'Type RESET' }], ok: 'Reset weekly board', danger: true, validate: x => x.w.trim() !== 'RESET' ? 'Type RESET exactly.' : '' });
    if (!v) return; const ps = S.players.filter(p => (p.weekExp || 0) > 0);
    if (!ps.length) return App.toast('The weekly board is already empty.', 'warn');
    if (await run(() => chunked(ps.map(p => b => b.update(pdoc(p.id), { weekExp: 0 }))), `Weekly board reset for ${ps.length} players.`)) logAct('weekly-reset', '', `${ps.length} players`);
  }
  async function clearExpired() {
    const ex = [...S.bansAll].filter(([, b]) => !banActive(b)).map(([id]) => id);
    if (!ex.length) return App.toast('No expired bans to clear.', 'warn');
    if (await run(() => chunked(ex.map(id => b => b.delete(S.db.doc('bans/' + id)))), `Cleared ${ex.length} expired bans.`)) logAct('clear-expired-bans', '', `${ex.length} records`);
  }
  async function wipeAudit() {
    const v = await ask({ title: 'Wipe the audit log', intro: 'Deletes the log entries shown in the Audit tab. This can\u2019t be undone. Type WIPE to confirm.', fields: [{ key: 'w', label: 'Type WIPE' }], ok: 'Wipe log', danger: true, validate: x => x.w.trim() !== 'WIPE' ? 'Type WIPE exactly.' : '' });
    if (!v) return; const ids = S.audit.map(e => e.id);
    if (await run(() => chunked(ids.map(id => b => b.delete(S.db.doc('auditLogs/' + id)))), 'Audit log wiped.')) logAct('audit-wipe', '', `${ids.length} entries removed`);
  }
  async function appoint(p) {
    if (S.bans.has(p.id)) return App.toast('Unban them first.', 'warn');
    if (!await ask({ title: `Make ${nameOf(p.id)} an admin?`, intro: 'They become an admin on their own device with no PIN, and stay one until you remove them. Admins can moderate players but can never touch you or other admins.', ok: 'Make admin' })) return;
    if (await run(() => S.db.doc('staffRoster/' + p.id).set({ role: 'admin', appointed: true, by: S.uid, at: fsv().FieldValue.serverTimestamp() }), `${nameOf(p.id)} is now an admin. They get the Admin tab next time they open the app.`)) logAct('appoint', p.id, 'made admin by the owner');
  }
  async function removeStaff(id, role) {
    if (!await ask({ title: `Remove ${nameOf(id)} from the staff roster?`, intro: role === 'owner' ? 'Use this to clean up an old owner device. It loses its protection.' : 'They lose admin protection and are signed out. They can come back with the PIN unless you change it.', ok: 'Remove', danger: true })) return;
    if (await run(async () => { await S.db.doc('adminSessions/' + id).delete().catch(() => {}); await S.db.doc('adminBadges/' + id).delete().catch(() => {}); await S.db.doc('staffRoster/' + id).delete(); }, `${nameOf(id)} was removed.`)) logAct('roster-remove', id, role);
  }
  async function toggleDuels() {
    const paused = !!S.settings.duelsPaused;
    if (await run(() => S.db.doc('settings/app').set({ duelsPaused: !paused, at: Date.now(), by: String(nameOf(S.uid)).slice(0, 40) }, { merge: true }), paused ? 'Duels are open again.' : 'New duels are paused.')) logAct(paused ? 'duels-on' : 'duels-off', '', paused ? 'duels resumed' : 'new duels paused');
  }
  function protectCard() {
    const safe = S.roster.get(S.uid) === 'owner';
    return elx('div', 'adm-card', elx('h4', '', safe ? '\u{1F6E1}\uFE0F You are protected' : '\u26A0\uFE0F Protection not saved yet'),
      elx('p', 'adm-info', safe ? 'Your device is on the permanent owner roster. Admins can never ban, reset, delete, rename or message you, even when you are locked out.' : 'Publish the newest firestore.rules, then lock and unlock as owner once. That saves a permanent record so admins can never touch you.'));
  }
  function rosterCard() {
    const list = elx('div', 'adm-list'), rows = [...S.roster].sort((a, b) => (a[1] === 'owner' ? 0 : 1) - (b[1] === 'owner' ? 0 : 1));
    rows.forEach(([id, role]) => list.append(elx('div', 'adm-row adm-ban', elx('div', 'adm-who adm-pad', elx('strong', '', nameOf(id), id === S.uid ? ' (you)' : ''), elx('span', 'adm-sub', role === 'owner' ? '\u{1F451} Owner device \u00B7 permanent' : '\u{1F6E1}\uFE0F Admin \u00B7 ' + (isAppointed(id) ? 'appointed by you' : 'permanent'))), elx('div', 'adm-pad', id === S.uid ? null : btn(role === 'owner' ? 'Remove device' : 'Remove admin', 'btn-ghost btn-sm adm-danger', () => removeStaff(id, role))))));
    if (!rows.length) list.append(elx('p', 'muted', 'Nobody is on the roster yet.'));
    return elx('div', 'adm-card', elx('h4', '', '\u{1F4CB} Permanent staff roster'), elx('p', 'adm-info', 'Everyone who has ever unlocked as staff. Roster members are shielded from admins even when signed out. Only you can remove them.'), list);
  }
  function cloudflareUsageCard() {
    const endpointMeta = document.querySelector('meta[name="bece-usage-api"]');
    const endpoint = endpointMeta && endpointMeta.content ? endpointMeta.content.trim() : '';
    const number = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? new Intl.NumberFormat().format(Number(value)) : '—';
    const bytes = value => {
      if (value === null || value === undefined || value === '') return '—';
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) return '—';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let amount = n, unit = 0;
      while (amount >= 1024 && unit < units.length - 1) { amount /= 1024; unit++; }
      return amount.toFixed(unit ? 2 : 0) + ' ' + units[unit];
    };
    const values = {};
    const metric = (key, amount, title, descriptionText) => {
      const value = elx('strong', '', amount);
      const description = elx('span', 'adm-sub', descriptionText);
      values[key] = { value, description };
      return elx('div', 'adm-prot', value, elx('p', 'adm-info', title), description);
    };
    const setQuota = (key, data, format = number) => {
      const target = values[key];
      if (!target) return;
      if (!data || data.used === null || data.used === undefined || data.limit === null || data.limit === undefined ||
          data.remaining === null || data.remaining === undefined || data.percent === null || data.percent === undefined) {
        target.value.textContent = '—';
        target.description.textContent = 'Unavailable · no complete analytics reading';
        return;
      }
      target.value.textContent = format(data.used) + ' / ' + format(data.limit);
      target.description.textContent = data.exceeded
        ? 'Limit exceeded by ' + format(Number(data.used) - Number(data.limit)) + ' · ' + number(data.percent) + '% used · critical'
        : format(data.remaining) + ' remaining · ' + number(data.percent) + '% used · ' + String(data.level || 'unknown') + ' status';
    };
    const statusTitle = elx('strong', '', endpoint ? 'Ready to refresh' : 'Not connected');
    const statusText = elx('span', '', endpoint
      ? 'Select Refresh usage to request account metrics.'
      : 'The Worker URL has not been configured. No Cloudflare account is connected yet.');
    const statusBox = elx('div', 'adm-prev', statusTitle, statusText);
    const updated = elx('p', 'adm-info', 'Actual usage: not yet retrieved.');
    const detail = elx('p', 'adm-info', 'Usage readings will be loaded only when you press Refresh. Missing readings remain unavailable, never zero.');

    // Keep the last successful reading on this device/browser so reopening the
    // Owner tab does not erase it. The saved timestamp is shown separately from
    // the provider's data day so old figures are never presented as live.
    const usageCacheKey = 'bece_hub_cloudflare_usage_v1';
    function applyUsageData(data, savedAt, fromCache = false) {
      setQuota('worker', data.worker);
      if (data.worker.subrequests === null || data.worker.subrequests === undefined) {
        values.subrequests.value.textContent = '—';
        values.subrequests.description.textContent = 'Unavailable · no complete analytics reading';
      } else {
        values.subrequests.value.textContent = number(data.worker.subrequests);
        values.subrequests.description.textContent = 'Total subrequests reported today · 50 per invocation on Free';
      }
      if (data.d1 && data.d1.detected === false) {
        for (const key of ['d1read', 'd1write', 'd1storage']) {
          values[key].value.textContent = 'Not enabled';
          values[key].description.textContent = 'No D1 usage is configured for this account.';
        }
      } else {
        setQuota('d1read', data.d1 && data.d1.rowsRead);
        setQuota('d1write', data.d1 && data.d1.rowsWritten);
        setQuota('d1storage', data.d1 && data.d1.storage, bytes);
      }
      if (data.d1 && data.d1.storage && data.d1.storage.asOf) {
        const storageSample = new Date(data.d1.storage.asOf);
        if (Number.isFinite(storageSample.getTime())) {
          values.d1storage.description.textContent += ' · latest per-database sample ' + storageSample.toLocaleString();
          const largest = data.d1.storage.largestDatabaseBytes;
          const individualLimit = data.d1.storage.databaseLimitBytes;
          if (largest !== null && largest !== undefined && individualLimit !== null && individualLimit !== undefined) {
            values.d1storage.description.textContent += ' · largest database ' + bytes(largest) + ' / ' + bytes(individualLimit);
          }
        }
      }
      const freshness = data.worker.freshness === 'delayed'
        ? 'The latest Worker analytics record is more than 10 minutes old.'
        : data.worker.freshness === 'recent'
          ? 'The latest Worker analytics record is recent.'
          : data.worker.freshness === 'no_events'
            ? 'No Worker invocation events have been reported for this UTC day yet. The total is currently 0; Cloudflare analytics can be delayed.'
            : 'Cloudflare did not provide a latest-event timestamp.';
      statusTitle.textContent = fromCache
        ? 'Saved usage reading · not live'
        : data.worker.complete ? 'Usage retrieved' : 'Partly unavailable';
      statusText.textContent = (fromCache ? 'Showing the last successful refresh saved on this browser. ' : '') +
        freshness + (data.d1 && !data.d1.detected ? ' D1 is not enabled on this account, so those quota meters do not apply.' : '');
      const stamp = data.generatedAt ? new Date(data.generatedAt) : null;
      const savedStamp = savedAt ? new Date(savedAt) : null;
      updated.textContent = 'Retrieved: ' + (stamp && Number.isFinite(stamp.getTime()) ? stamp.toLocaleString() : 'timestamp unavailable') +
        ' · Saved on this device: ' + (savedStamp && Number.isFinite(savedStamp.getTime()) ? savedStamp.toLocaleString() : 'time unavailable') +
        ' · Data day: ' + String(data.day || 'unknown') + ' UTC';
      detail.textContent = String(data.analyticsNote || 'Cloudflare analytics can be delayed.') +
        ' Source: ' + String(data.source || 'Cloudflare analytics') +
        (fromCache ? ' · Press Refresh usage to get a newer reading.' : '');
    }

    // Keep a page-lifetime copy as well as browser storage. This protects
    // the visible reading if the Owner panel is rebuilt while this page stays open.
    let savedUsage = window.__beceHubLastUsageReading || null;
    try {
      const localSaved = JSON.parse(localStorage.getItem(usageCacheKey) || 'null');
      if (localSaved && localSaved.data && localSaved.data.status === 'ok' && localSaved.data.worker &&
          Number.isFinite(Number(localSaved.savedAt))) savedUsage = localSaved;
    } catch (_) {}
    if (!savedUsage) {
      try {
        const sessionSaved = JSON.parse(sessionStorage.getItem(usageCacheKey) || 'null');
        if (sessionSaved && sessionSaved.data && sessionSaved.data.status === 'ok' && sessionSaved.data.worker &&
            Number.isFinite(Number(sessionSaved.savedAt))) savedUsage = sessionSaved;
      } catch (_) {}
    }
    if (savedUsage && savedUsage.data && savedUsage.data.status === 'ok' && savedUsage.data.worker &&
        Number.isFinite(Number(savedUsage.savedAt))) {
      window.__beceHubLastUsageReading = savedUsage;
      // Restore only after the metric elements have been created by the return markup below.
      queueMicrotask(() => applyUsageData(savedUsage.data, savedUsage.savedAt, true));
    }

    const refresh = btn('Refresh usage', 'btn-primary btn-sm', loadUsage, !endpoint);

    async function loadUsage() {
      if (!endpoint) return App.toast('The Cloudflare Worker URL has not been configured yet.', 'warn');
      if (!S.isOwner) return App.toast('Unlock the Owner session before requesting infrastructure statistics.', 'warn');
      const user = firebase.auth().currentUser;
      if (!user) return App.toast('Your Firebase sign-in is not ready. Please reconnect and try again.', 'warn');
      refresh.disabled = true;
      refresh.textContent = 'Refreshing…';
      statusTitle.textContent = 'Checking access…';
      statusText.textContent = 'Verifying the Firebase account and active Owner session.';
      try {
        const token = await user.getIdToken();
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: { Authorization: 'Bearer ' + token },
          credentials: 'omit',
          cache: 'no-store'
        });
        let data;
        try { data = await response.json(); } catch { throw new Error('invalid_response'); }
        if (!response.ok) {
          if (response.status === 401) throw new Error('sign_in_required');
          if (response.status === 403) throw new Error('owner_required');
          throw new Error('service_unavailable');
        }
        if (!data || data.status !== 'ok' || !data.worker) throw new Error('invalid_response');

        const savedAt = Date.now();
        const savedReading = { savedAt, data };
        // Update the in-page copy first, so a panel re-render cannot blank the
        // figures even if the browser blocks persistent storage.
        window.__beceHubLastUsageReading = savedReading;
        let persisted = false;
        try {
          const serialized = JSON.stringify(savedReading);
          localStorage.setItem(usageCacheKey, serialized);
          persisted = localStorage.getItem(usageCacheKey) === serialized;
        } catch (_) {}
        if (!persisted) {
          try {
            const serialized = JSON.stringify(savedReading);
            sessionStorage.setItem(usageCacheKey, serialized);
            persisted = sessionStorage.getItem(usageCacheKey) === serialized;
          } catch (_) {}
        }
        applyUsageData(data, savedAt, false);
        if (!persisted) {
          statusText.textContent += ' The reading is kept while this page remains open, but this browser blocked persistent saving.';
        }
        App.toast(data.worker.complete ? 'Infrastructure usage refreshed.' : 'Some usage readings are unavailable.', data.worker.complete ? 'good' : 'warn');
      } catch (error) {
        const reason = error && error.message;
        statusTitle.textContent = reason === 'owner_required' ? 'Owner session expired' : 'Could not retrieve usage';
        statusText.textContent = reason === 'owner_required'
          ? 'Unlock Owner access again, then refresh.'
          : reason === 'sign_in_required'
            ? 'Your Firebase sign-in has expired. Reconnect before refreshing.'
            : 'The metrics service is unavailable or not configured correctly. No usage values were changed.';
        App.toast(statusText.textContent, 'warn');
      } finally {
        refresh.disabled = !endpoint;
        refresh.textContent = 'Refresh usage';
      }
    }

    return elx('section', 'adm-card',
      elx('div', '',
        elx('h4', '', '☁️ Infrastructure & Usage'),
        elx('p', 'adm-info', 'Cloudflare account-wide limits and reported usage')
      ),
      statusBox,
      elx('div', 'adm-two',
        metric('worker', '— / 100,000', 'Worker requests today', 'Daily incoming requests · resets 00:00 UTC'),
        metric('subrequests', '—', 'Worker subrequests', '50 per invocation on the Free plan'),
        metric('d1read', '— / 5,000,000', 'D1 rows read today', 'Daily row-read limit · resets 00:00 UTC · only if D1 is selected'),
        metric('d1write', '— / 100,000', 'D1 rows written today', 'Daily row-write limit · resets 00:00 UTC · only if D1 is selected'),
        metric('d1storage', '— / 5 GB', 'D1 account storage', 'Across the account · 500 MB maximum per database')
      ),
      elx('div', 'adm-btns', refresh),
      updated,
      detail,
      elx('p', 'adm-info', 'Opening a screen uses no Worker request unless the app actually calls the Worker. Firebase-only reads do not use the Cloudflare Worker request allowance.'),
      elx('p', 'adm-info', 'Scope: these readings are account-wide. Daily/monthly history and a Bece Hub feature-by-feature breakdown are not connected yet; they will be added only when the analytics can identify each source accurately.'),
      elx('p', 'adm-info', 'Warnings: 50% notice · 70% medium · 85% high · 95% critical. Provider analytics can lag; this is not a real-time billing meter.')
    );
  }

  function ownerTab() {
    // Keep the Owner console usable while Firestore snapshot data is warming up.
    if (!(S.badgeMap instanceof Map)) S.badgeMap = new Map();
    if (!(S.badgeRole instanceof Map)) S.badgeRole = new Map();
    if (!(S.roster instanceof Map)) S.roster = new Map();
    if (!S.settings || typeof S.settings !== 'object') S.settings = {};
    const now = Date.now(), staff = [...S.badgeMap].filter(([, u]) => Number(u) > now).map(([id, u]) => ({ id, left: Number(u) - now, role: S.badgeRole.get(id) === 'owner' ? 'owner' : 'admin' }));
    if (S.isOwner && !staff.some(s => s.id === S.uid)) staff.push({ id: S.uid, left: Math.max(0, Number(S.ownerAt) + OWNER_MS - now), role: 'owner' });
    const list = elx('div', 'adm-list');
    staff.sort((a, b) => (a.role === 'owner' ? 0 : 1) - (b.role === 'owner' ? 0 : 1)).forEach(s => list.append(elx('div', 'adm-row adm-ban', elx('div', 'adm-who adm-pad', elx('strong', '', nameOf(s.id), s.id === S.uid ? ' (you)' : '', ' ', adminBadge(s.id)), elx('span', 'adm-sub', `${fmtLeft(s.left)} left on this session`)), elx('div', 'adm-pad', s.role === 'owner' ? null : btn('Sign out', 'btn-ghost btn-sm adm-danger', () => kick(s.id))))));
    if (!staff.length) list.append(elx('p', 'muted', 'Nobody is signed in as staff.'));
    const card = (h, p, ...b) => elx('div', 'adm-card', elx('h4', '', h), elx('p', 'adm-info', p), elx('div', 'adm-btns', ...b));
    const part = (name, make) => {
      try { return make(); }
      catch (error) {
        console.error('Owner panel component failed:', name, error);
        return elx('div', 'adm-card', elx('h4', '', name + ' is temporarily unavailable'),
          elx('p', 'adm-info', 'Loading detail: ' + String(error && error.message || error).slice(0, 180)));
      }
    };
    return elx('div', '',
      part('Owner protection', protectCard),
      part('Cloudflare usage', cloudflareUsageCard),
      part('Active staff', () => elx('div', 'adm-card', elx('h4', '', '\u{1F465} Staff signed in now'), list)),
      part('Permanent staff roster', rosterCard),
      part('Duels switch', () => card('\u23F8\uFE0F Duels switch', S.settings.duelsPaused ? 'New duels are paused for everyone. Duels already running can finish.' : 'Duels are open. Pause new duels if something is broken or being abused.', btn(S.settings.duelsPaused ? 'Resume duels' : 'Pause new duels', S.settings.duelsPaused ? 'btn-primary btn-sm' : 'btn-ghost btn-sm adm-danger', toggleDuels))),
      part('Security', () => card('\u{1F510} Security', 'The admin PIN opens admin sessions. The 2 owner passwords open this console. Changing either one signs people out.', btn('Change admin PIN', 'btn-ghost btn-sm', changeAdminPin), btn('Change owner passwords', 'btn-ghost btn-sm', changeOwnerPw))),
      part('Bulk tools', () => card('\u{1F381} Bulk tools', 'Owner-only rewards and maintenance commands. Every action is recorded in the audit log.', btn('Gift coins\u2026', 'btn-primary btn-sm', giftAll), btn('Award EXP\u2026', 'btn-primary btn-sm', giftExpAll), btn('Reset weekly board\u2026', 'btn-ghost btn-sm adm-danger', weeklyReset), btn('Clear expired bans', 'btn-ghost btn-sm adm-danger', clearExpired))),
      part('Global practice economy', () => card('\u{1F4C8} Global practice economy', 'Set the EXP and coin multipliers earned by every player in new practice quizzes.', elx('p', 'adm-info', 'Current rates: ' + (Number(S.settings.expMultiplier) || 1) + '× EXP · ' + (Number(S.settings.coinMultiplier) || 1) + '× coins'), btn('Change reward rates…', 'btn-primary btn-sm', setRewardRates))),
      part('Shop control', () => card('\u{1F6D2} Shop control', S.settings.shopPaused ? 'Purchases are currently paused for every player. Owned items can still be equipped.' : 'Purchases are open for everyone. You can temporarily pause new purchases without removing anyone’s items.', btn(S.settings.shopPaused ? 'Reopen shop purchases' : 'Pause shop purchases', S.settings.shopPaused ? 'btn-primary btn-sm' : 'btn-ghost btn-sm adm-danger', toggleShop))),
      part('Owner exports', () => card('\u{1F4C1} Owner exports', 'Download full player records, owned and equipped items, bug reports, staff roster and audit history for private backup or repair.', btn('Export full player records (JSON)', 'btn-primary btn-sm', exportPlayersJson), btn('Export bug reports (CSV)', 'btn-ghost btn-sm', bugCsv), btn('Export staff roster (CSV)', 'btn-ghost btn-sm', exportRosterCsv), btn('Export audit log (CSV)', 'btn-ghost btn-sm', downloadAuditCsv))),
      part('Staff control', () => card('\u{1F6E1}\uFE0F Staff control', 'Manage active staff sessions without changing the admin PIN or ending your own owner session.', btn('Sign out all admins…', 'btn-ghost btn-sm adm-danger', signOutAllAdmins), btn('Lock my owner session', 'btn-ghost btn-sm', () => ownerLock(false)))));
  }
  const ACT_ICON = { unlock: '\u{1F513}', give: '\u2795', take: '\u2796', set: '\u{1F4DD}', message: '\u{1F4E9}', rename: '\u270F\uFE0F', 'clear-photo': '\u{1F5BC}\uFE0F', 'clear-bio': '\u{1F4C4}', reset: '\u267B\uFE0F', delete: '\u{1F5D1}\uFE0F', ban: '\u{1F6AB}', unban: '\u2705', note: '\u{1F4DD}', announce: '\u{1F4E3}', 'announce-clear': '\u{1F4E3}', export: '\u{1F4E4}', kick: '\u{1F6AA}', 'pin-change': '\u{1F510}', 'owner-pw-change': '\u{1F451}', 'gift-all': '\u{1F381}', 'weekly-reset': '\u{1F504}', 'clear-expired-bans': '\u{1F9F9}', 'audit-wipe': '\u{1F5D1}\uFE0F', 'bug-open': '\u{1F41E}', 'bug-fixing': '\u{1F6E0}\uFE0F', 'bug-done': '\u2705', 'bug-wontfix': '\u{1F4D5}', 'bug-reply': '\u{1F4AC}', 'bug-delete': '\u{1F5D1}\uFE0F', 'roster-remove': '\u{1F6AA}', 'duels-on': '\u25B6\uFE0F', 'duels-off': '\u23F8\uFE0F', 'reward-rates': '\u{1F4C8}', 'shop-paused': '\u{1F6D2}', 'shop-resumed': '\u{1F6D2}', 'audit-export': '\u{1F4C1}', appoint: '\u{1F6E1}\uFE0F' };
  function auditTab() {
    const w = elx('div'), q = document.createElement('input'); q.type = 'search'; q.placeholder = 'Search the log\u2026'; q.value = st.alq; q.className = 'adm-search'; q.setAttribute('aria-label', 'Search audit log');
    const rs = document.createElement('select'); rs.className = 'adm-sel'; [['all', 'Everyone'], ['owner', 'Owner only'], ['admin', 'Admins only']].forEach(([v, t]) => rs.append(new Option(t, v))); rs.value = st.alr; rs.setAttribute('aria-label', 'Filter by role');
    const list = elx('div', 'adm-list'), info = elx('p', 'adm-info');
    function fill() {
      const es = S.audit.filter(e => (st.alr === 'all' || e.role === st.alr) && (!st.alq || `${e.byName} ${e.action} ${e.targetName} ${e.detail}`.toLowerCase().includes(st.alq)));
      info.textContent = `${es.length} of ${S.audit.length} entries (latest 300 are kept in view)`;
      list.replaceChildren(...(es.length ? es.slice(0, 120).map(e => elx('div', 'adm-log', elx('span', 'adm-log-ic', ACT_ICON[e.action] || '\u2022'), elx('div', 'adm-log-t', elx('strong', '', e.byName || 'Someone', ' ', elx('em', e.role === 'owner' ? 'adm-role-o' : 'adm-role-a', e.role === 'owner' ? 'owner' : 'admin')), elx('span', '', `${e.action}${e.targetName ? ' \u2192 ' + e.targetName : ''}${e.detail ? ' \u00B7 ' + e.detail : ''}`), elx('small', '', fmtTime(e.at))))) : [elx('p', 'muted', 'Nothing logged yet.')]));
    }
    q.oninput = () => { st.alq = q.value.trim().toLowerCase(); fill(); }; rs.onchange = () => { st.alr = rs.value; fill(); };
    fill(); w.append(q, elx('div', 'adm-two', rs, info), list, S.isOwner && S.audit.length ? btn('Export audit log CSV', 'btn-ghost btn-sm', downloadAuditCsv) : null, S.audit.length ? btn('Wipe audit log\u2026', 'btn-ghost btn-sm adm-danger', wipeAudit) : null); return w;
  }

  /* ---------- shell ---------- */
  const tabList = () => [
    ['overview', 'Overview', 'home'],
    ['players', 'Players', 'users'],
    ['stats', 'Stats', 'chart'],
    ['bans', `Bans${S.bans.size ? ' ' + S.bans.size : ''}`, 'ban'],
    ['announce', 'Announce', 'megaphone'],
    ['bugs', `Bugs${S.bugs.filter(b => (b.status || 'open') === 'open').length ? ' ' + S.bugs.filter(b => (b.status || 'open') === 'open').length : ''}`, 'bug'],
    ['tools', 'Tools', 'toolbox'],
    ...(S.isOwner ? [['owner', 'Owner commands', 'crown'], ['audit', 'Audit', 'scroll']] : [])
  ];
  const view = () => st.sub === 'overview' ? overview() : st.sub === 'players' ? players() : st.sub === 'stats' ? stats() : st.sub === 'bans' ? bansTab() : st.sub === 'announce' ? announce() : st.sub === 'tools' ? tools() : st.sub === 'bugs' ? bugsTab() : st.sub === 'owner' ? ownerTab() : auditTab();
  function paint(force) {
    if (!root || root.hidden && !force) return;
    if (!force && body && body.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;   // don't wipe what you're typing
    if (!S.isOwner && (st.sub === 'owner' || st.sub === 'audit')) st.sub = 'players';
    const sectionChanged = renderedSub !== null && renderedSub !== st.sub;
    const t = tabList(), key = t.map(x => x[1]).join('|');
    tabs.setAttribute('aria-label', S.isOwner ? 'Owner panel sections' : 'Admin panel sections');
    if (key !== tabsKey) {
      tabsKey = key;
      tabs.replaceChildren(...t.map(([k, l, iconName]) => {
        const b = elx('button', 'adm-tab', icon(iconName), elx('span', '', l)); b.type = 'button'; b.dataset.k = k;
        b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'adm-panel-body');
        return b;
      }));
    }
    tabs.querySelectorAll('button').forEach(b => {
      const selected = b.dataset.k === st.sub;
      b.setAttribute('aria-pressed', String(selected));
      b.setAttribute('aria-selected', String(selected));
      b.tabIndex = selected ? 0 : -1;
    });
    root.classList.toggle('is-owner', S.isOwner);
    eyebrow.textContent = S.isOwner ? 'Owner console' : 'Overseer';
    title.replaceChildren(icon(S.isOwner ? 'crown' : 'shield'), document.createTextNode(S.isOwner ? 'Owner panel' : 'Admin panel'));
    const activeTab = tabs.querySelector('[data-k="' + st.sub + '"]');
    if (activeTab && window.matchMedia && window.matchMedia('(max-width: 760px)').matches) {
      const tr = tabs.getBoundingClientRect(), ar = activeTab.getBoundingClientRect();
      tabs.scrollLeft = Math.max(0, tabs.scrollLeft + ar.left - tr.left - (tabs.clientWidth - ar.width) / 2);
    }
    try {
      const content = view();
      body.replaceChildren(content);
      body.removeAttribute('data-render-error');
      if (sectionChanged) replayMotion(body, 'motion-admin-section-enter');
    } catch (error) {
      console.error('Admin section failed to render:', st.sub, error);
      body.dataset.renderError = st.sub;
      body.replaceChildren(
        elx('div', 'adm-card',
          elx('h4', '', 'This section could not be displayed'),
          elx('p', 'adm-info', 'The section encountered a display error. Your data and settings have not been changed. Please switch to another section and try again.')
        )
      );
      if (sectionChanged) replayMotion(body, 'motion-admin-section-enter');
    }
    renderedSub = st.sub;
  }
  function el() {
    if (root) return root;
    root = elx('section', 'card adm'); root.hidden = true;
    timer = elx('span', 'adm-timer'); eyebrow = elx('p', 'eyebrow', 'Overseer'); title = elx('h2', 'adm-title', 'Admin panel');
    const hd = elx('div', 'cz-head', elx('div', '', eyebrow, title), elx('div', 'adm-hact', timer, btn('Renew', 'btn-ghost btn-sm', renewCurrentSession), btn('\u{1F512} Lock', 'btn-ghost btn-sm', () => lockAll())));
    tabs = elx('div', 'segmented adm-subs'); tabs.setAttribute('role', 'tablist');
    // Handle section changes at the tablist itself in capture phase. This keeps
    // the Owner commands panel switch reliable even if another delegated click
    // handler on the page interferes with normal button bubbling.
    tabs.addEventListener('click', event => {
      const target = event.target;
      const tab = target && typeof target.closest === 'function'
        ? target.closest('button[role="tab"][data-k]')
        : null;
      if (!tab || !tabs.contains(tab)) return;
      const key = tab.dataset.k;
      if (key === 'owner' || key === 'audit') {
        if (!S.isOwner) return;
      }
      event.preventDefault();
      event.stopPropagation();
      st.sub = key;
      paint(true);
      if (key === 'owner') {
        requestAnimationFrame(() => {
          if (body) body.scrollIntoView({ block: 'start', behavior: 'smooth' });
        });
      }
    }, true);
    body = elx('div', 'adm-body'); body.id = 'adm-panel-body'; body.setAttribute('role', 'tabpanel');
    tabs.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      const buttons = [...tabs.querySelectorAll('[role="tab"]')];
      const current = buttons.indexOf(document.activeElement);
      if (current < 0 || !buttons.length) return;
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1
        : (current + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length;
      const key = buttons[next].dataset.k;
      st.sub = key; paint(true);
      tabs.querySelector('[data-k="' + key + '"]')?.focus();
      e.preventDefault();
    });
    root.append(hd, tabs, body); return root;
  }
  function sync() {
    const host = document.getElementById('admin-body');
    if (!host) return;
    if (!S.isAdmin) {
      if (root) root.hidden = true;
      host.replaceChildren(elx('section', 'card friends-gate', elx('h2', '', 'Admin access required'), elx('p', 'muted', 'This area is only available to authorised staff.')));
      return;
    }
    if (!root) el();
    if (root.parentNode !== host) host.replaceChildren(root);
    root.hidden = false;
    eyebrow.textContent = S.isOwner ? 'Owner console' : 'Admin workspace';
    title.replaceChildren(icon(S.isOwner ? 'crown' : 'shield'), document.createTextNode(S.isOwner ? 'Owner panel' : 'Admin panel'));
    paint(true); tick();
  }
  function tick() {
    if (!timer) return;
    const now = Date.now(), left = S.isOwner ? S.ownerAt + OWNER_MS - now : S.adminAt + ADMIN_MS - now;
    if (!(left > 0)) return;
    const m = Math.floor(left / 60000), s = Math.floor(left % 60000 / 1000);
    setIconAwareText(timer, `${S.isOwner ? '\u{1F451}' : '\u23F3'} ${m >= 60 ? Math.floor(m / 60) + 'h ' + m % 60 + 'm' : m + 'm ' + String(s).padStart(2, '0') + 's'} left`);
    timer.classList.toggle('is-low', left < (S.isOwner ? 5 : 10) * 60000);
  }
  return { sync, paint, tick, go: k => { st.sub = k; } };
})();
window.renderFriends = renderFriends;
window.Adm = Adm;

const fmtLeft = ms => { const m = Math.max(1, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };

/* ---------- Gems: trusted server-side balance changes ---------- */
const GEMS_API_URL = (() => {
  const meta = document.querySelector('meta[name="bece-gems-api"]');
  return meta && meta.content ? meta.content.trim() : '';
})();
const Gems = (() => {
  const MAX_BALANCE = 1000000000;
  const currentBalance = () => {
    const value = S.doc && S.doc.gems;
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  };
  async function applyGemChange(action, amount, operationId, itemId, achievementId, sourceRect) {
    if (!S.db || !S.uid) throw new Error('SIGN_IN_REQUIRED');
    const rewardOrigin = sourceRect || captureRewardRect(document.activeElement);
    const balanceBefore = currentBalance();
    if (!GEMS_API_URL) throw new Error('GEMS_SERVICE_NOT_CONFIGURED');
    const purchase = action === 'purchase';
    const reward = action === 'achievement' || action === 'daily';
    const reset = action === 'reset';
    if (purchase) {
      if (itemId !== 'profile-ring-gold') throw new Error('INVALID_GEM_ITEM');
      amount = 50;
    } else if (reward) {
      amount = null;
      if (action === 'achievement' && !Object.prototype.hasOwnProperty.call(GEM_ACHIEVEMENT_REWARDS, achievementId)) throw new Error('INVALID_ACHIEVEMENT_REWARD');
    } else if (reset) {
      amount = null;
    } else if (!['earn', 'spend'].includes(action)
        || !Number.isSafeInteger(amount) || amount <= 0 || amount > 1000000) {
      throw new Error('INVALID_GEM_AMOUNT');
    }
    const opId = String(operationId || '').trim();
    if (!/^[a-zA-Z0-9._:-]{1,120}$/.test(opId)) throw new Error('INVALID_GEM_OPERATION_ID');
    const user = firebase.auth().currentUser;
    if (!user || user.uid !== S.uid) throw new Error('SIGN_IN_REQUIRED');
    const idToken = await user.getIdToken();
    const response = await fetch(GEMS_API_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + idToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...(purchase ? { itemId } : reward ? (action === 'achievement' ? { achievementId } : {}) : reset ? {} : { amount }), operationId: opId })
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok || !data.ok) {
      const error = new Error(data.error || ('GEMS_SERVICE_ERROR_' + response.status));
      error.code = data.code || 'GEMS_SERVICE_ERROR';
      throw error;
    }
    if (!Number.isSafeInteger(data.balance) || data.balance < 0 || data.balance > MAX_BALANCE) {
      throw new Error('INVALID_GEMS_SERVICE_RESPONSE');
    }
    const operations = Array.isArray(data.operations) ? data.operations : [];
    const nextDoc = data.reset && data.profile && typeof data.profile === 'object'
      ? { ...data.profile }
      : { ...(S.doc || {}), gems: data.balance, gemOps: operations };
    if (data.gemCosmetics && typeof data.gemCosmetics === 'object') nextDoc.gemCosmetics = data.gemCosmetics;
    if (typeof data.equippedGemCosmetic === 'string') nextDoc.equippedGemCosmetic = data.equippedGemCosmetic;
    S.doc = nextDoc;
    const mine = (S.players || []).find(player => player.id === S.uid);
    if (data.reset) {
      S.players = (S.players || []).filter(player => player.id !== S.uid);
      S.players.push({ id: S.uid, ...nextDoc });
    } else if (mine) {
      mine.gems = data.balance; mine.gemOps = operations;
      if (data.gemCosmetics && typeof data.gemCosmetics === 'object') mine.gemCosmetics = data.gemCosmetics;
      if (typeof data.equippedGemCosmetic === 'string') mine.equippedGemCosmetic = data.equippedGemCosmetic;
    }
    dailyGemClaimFeedback = action === 'daily' && !data.duplicate && Number(data.change) > 0 ? (Number(data.rewardDay) || 1) : false;
    achievementGemClaimFeedbackId = action === 'achievement' && !data.duplicate && Number(data.change) > 0
      ? achievementId : '';
    renderAccount();
    renderFriends();
    try {
      renderDaily();
      renderAchievements();
    } finally {
      dailyGemClaimFeedback = false;
      achievementGemClaimFeedbackId = '';
    }
    if (window.GemShop && typeof window.GemShop.render === 'function') window.GemShop.render();
    if (!data.duplicate && Number(data.change) > 0) {
      const previous = Number.isFinite(Number(data.previous)) ? Number(data.previous) : balanceBefore;
      const achievementBalance = action === 'achievement'
        ? document.querySelector('.achievement-gem-balance-value') : null;
      animateCurrencyReward('gems', previous, data.balance, rewardOrigin, achievementBalance);
    }
    return { previous: data.previous, balance: data.balance, change: data.change, duplicate: !!data.duplicate, reset: !!data.reset, rewardDay: data.rewardDay, bonusAmount: data.bonusAmount };
  }
  return Object.freeze({
    getBalance: currentBalance,
    purchaseCosmetic: (itemId, operationId) => applyGemChange('purchase', null, operationId, itemId),
    earn: (amount, operationId) => applyGemChange('earn', amount, operationId),
    spend: (amount, operationId) => applyGemChange('spend', amount, operationId),
    claimAchievement: (id, sourceRect) => applyGemChange('achievement', null, 'achievement:' + id, null, id, sourceRect),
    claimDaily: sourceRect => applyGemChange('daily', null, 'daily:' + today(), null, null, sourceRect),
    resetEverything: operationId => applyGemChange('reset', null, operationId)
  });
})();
window.Gems = Gems;

async function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  renderAccount(); renderDaily(); renderAchievements();
  App.on('screen', s => { if (['friends', 'admin', 'duels', 'shop', 'me'].includes(s)) renderFriends(); });
  try {
    const fb = await connectFirebase();
    S.db = fb.db; S.uid = fb.uid; Duel.start();
    // overseer layer: all optional; if the Firestore rules aren't set up yet these just stay empty
    // admin = a PIN-unlocked session that lasts 2 hours (adminSessions/<uid>); adminBadges/<uid> shows the tag to everyone else
    S.db.collection('adminBadges').onSnapshot(sn => { S.badgeMap = new Map(); S.badgeRole = new Map(); sn.docs.forEach(d => { const x = d.data(), u = x.until; S.badgeMap.set(d.id, u && u.toMillis ? u.toMillis() : 0); S.badgeRole.set(d.id, x.role === 'owner' ? 'owner' : 'admin'); }); refreshAdmin(true); }, () => {});
    S.db.doc('adminSessions/' + S.uid).onSnapshot(sn => { const d = sn.exists ? sn.data() : null; S.adminAt = d && d.at && d.at.toMillis ? d.at.toMillis() : 0; refreshAdmin(); }, () => {});
    S.db.doc('ownerSessions/' + S.uid).onSnapshot(sn => { const d = sn.exists ? sn.data() : null; S.ownerAt = d && d.at && d.at.toMillis ? d.at.toMillis() : 0; refreshAdmin(); }, () => {});
    S.db.doc('notices/' + S.uid).onSnapshot(sn => showNotice(sn.exists ? sn.data() : null), () => {});
    setInterval(() => refreshAdmin(), 5000); setInterval(() => refreshBans(), 20000);
    S.db.collection('bans').onSnapshot(sn => { S.bansAll = new Map(sn.docs.map(d => [d.id, d.data()])); refreshBans(); }, () => {});
    S.db.doc('announcements/current').onSnapshot(sn => { S.ann = sn.exists ? sn.data() : null; showAnn(); }, () => {});
    S.db.collection('staffRoster').onSnapshot(sn => { S.roster = new Map(sn.docs.map(d => [d.id, d.data().role === 'owner' ? 'owner' : 'admin'])); S.rosterData = new Map(sn.docs.map(d => [d.id, d.data()])); refreshBans(); refreshAdmin(true); Adm.paint(); }, () => {});
    S.db.doc('settings/app').onSnapshot(sn => { S.settings = sn.exists ? sn.data() : {}; Adm.paint(); Shop.render(); }, () => {});
    Bugs.start();
    S.db.collection('players').onSnapshot(async snap => {
      S.players = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const mine = S.players.find(p => p.id === S.uid); S.doc = mine ? { ...mine } : S.doc || {}; delete S.doc.id; if (S.pend) S.doc = { ...S.doc, ...S.pend };
      S.ready = true; renderAccount(); renderDaily(); renderAchievements(); renderFriends(); Adm.paint();
      if (!S.asked && !(S.doc && S.doc.displayName)) {
        S.asked = true;
        setTimeout(() => {
          const n = (window.prompt('Welcome! What name should show on the friends board? (Use the name your friends know you by)') || '').trim().slice(0, 30);
          if (n.length >= 2) { const nd = { ...(S.doc || {}), displayName: n }; S.db.doc('players/' + S.uid).set(nd).then(() => { S.doc = nd; renderAccount(); renderFriends(); }).catch(() => {}); }
        }, 1200);
      }
    }, () => { S.ready = true; S.db = null; renderAccount(); renderFriends(); });
    setTimeout(() => { if (!S.ready) { S.ready = true; renderFriends(); } }, 10000);
  } catch { S.db = null; renderAccount(); renderFriends(); }
}
init();
