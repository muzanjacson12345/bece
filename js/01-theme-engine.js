
// Theme engine. Two independent choices:
//   1. Mode   – light, dark or auto (follows the device).
//   2. Colour – a full palette (page background, cards, text, borders, buttons, logo, artwork)
//               generated from one colour, separately for light and dark, so nothing is left behind in the old green.
// Runs before the stylesheet is parsed so the right palette is on screen from the very first paint.
(() => {
  const root = document.documentElement;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  /* ---------- colour maths ---------- */
  const hsl2rgb = (h, s, l) => {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)].map(v => Math.round(v * 255));
  };
  const toHex = c => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const hsl = (h, s, l) => toHex(hsl2rgb(h, s, l));
  const fromHex = x => { x = x.replace('#', ''); return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)); };
  const rgb2hsl = ([r, g, b]) => {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = 0;
    if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
    return [h, s * 100, l * 100];
  };
  const lum = hex => { const [r, g, b] = fromHex(hex).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const mix = (a, b, t) => { const A = fromHex(a), B = fromHex(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };

  /* ---------- colour presets ---------- */
  // Keys keep their original names ("blue", "pink"…) so profiles saved before this update still work.
  const PRESETS = {
    green:  { name: 'Forest', hex: null },
    blue:   { name: 'Ocean',  hex: '#2b5fa8' },
    indigo: { name: 'Indigo', hex: '#4f46c8' },
    purple: { name: 'Grape',  hex: '#7a4bb5' },
    pink:   { name: 'Rose',   hex: '#b4235a' },
    red:    { name: 'Cherry', hex: '#b42318' },
    orange: { name: 'Sunset', hex: '#c2410c' },
    gold:   { name: 'Honey',  hex: '#a16207' },
    teal:   { name: 'Lagoon', hex: '#0f766e' },
    slate:  { name: 'Slate',  hex: '#475569' },
    black:  { name: 'Black',  hex: '#171717' },
  };
  // The original green design, kept exactly as it was (it is the stylesheet default, so it needs no override).
  const FOREST = {
    light: { bg: '#f7f8f3', surface: '#ffffff', surface2: '#eff3ea', line: '#dfe5d8', ink: '#1f3328', muted: '#5d6a5a', primary: '#315d47', accent: '#315d47', accentSoft: '#e5eedd', brand: '#315d47' },
    dark:  { bg: '#111914', surface: '#18221c', surface2: '#203027', line: '#2f3e35', ink: '#e4ebe0', muted: '#a3b09f', primary: '#4d8150', accent: '#a6d197', accentSoft: '#243a2b', brand: '#315d47' },
  };

  function parse(key) {
    const m = typeof key === 'string' && /^custom:(\d{1,3}):(\d{1,3})(?::(\d{1,3}))?$/.exec(key);
    if (m) { const h = clamp(+m[1], 0, 360), s = clamp(+m[2], 0, 100), l = clamp(m[3] == null ? 50 : +m[3], 0, 100); return { key: `custom:${h}:${s}:${l}`, name: 'Custom', custom: true, h, s, l }; }
    // Migrate accounts that previously selected the removed White preset to Black.
    if (key === 'white') key = 'black';
    const p = PRESETS[key];
    if (p && p.hex) { const [h, s] = rgb2hsl(fromHex(p.hex)); return { key, name: p.name, h, s: clamp(s, 15, 90), hex: p.hex }; }
    return { key: 'green', name: PRESETS.green.name, isDefault: true, h: 150, s: 35 };
  }

  /* ---------- palette generator ---------- */
  function build(h, s, base, neutral = false, customShade = false) {
    const c = clamp(s, 0, 100) / 100, W = '#ffffff';
    const tone = (sat, light) => hsl(h, neutral ? 0 : (customShade ? sat * c : sat), light);

    // Light: tinted paper background, white cards, a strong readable accent.
    const bgS = 14 + 20 * c;
    const chosenL = base ? rgb2hsl(fromHex(base))[2] : 40;
    let pL = chosenL, primary = base || tone(s, pL);
    while (contrast(primary, W) < 4.6 && pL > 12) { pL -= 1; primary = tone(s, pL); }
    const accentSoft = tone(28 + 22 * c, 91);
    let aL = pL, accent = primary;
    while (contrast(accent, accentSoft) < 4.8 && aL > 10) { aL -= 1; accent = tone(s, aL); }
    const bg = tone(bgS, 96), surface2 = tone(bgS + 3, 93);
    const ink = tone(20 + 8 * c, 15), inkRGB = hsl2rgb(h, neutral ? 0 : 30, 15).join(' ');
    const light = {
      onPrimary: contrast(primary, '#ffffff') >= contrast(primary, '#111111') ? '#ffffff' : '#111111',
      bg, surface: W, surface2, surfaceWarm: neutral ? mix('#f2f2f2', bg, .4) : mix('#f4f0e6', bg, .4),
      ink, inkSoft: tone(14 + 4 * c, 24), muted: tone(8 + 6 * c, 37),
      line: tone(bgS, 87.5), lineStrong: tone(bgS - 2, 79),
      accent, accentSoft, primary, primaryHover: tone(s, Math.max(8, Math.min(pL, aL) - 5)), ring: accent,
      shadow: `0 1px 2px rgb(${inkRGB} / 4%), 0 8px 24px -12px rgb(${inkRGB} / 18%)`,
      shadowHover: `0 14px 34px rgb(${inkRGB} / 14%)`,
      brand: tone(clamp(s * .75, 18, 55), 28), brandInk: tone(25, 96), brandDot: tone(30, 76),
      heroEm: tone(14 + 8 * c, 52),
      artDisc: tone(bgS + 3, 90), artRing: tone(bgS - 6, 77), artShadow: tone(bgS - 3, 82), artPage: tone(bgS + 10, 97.5), artEdge: tone(bgS, 87), artLine: tone(14, 46),
      artBook: tone(32, 30), artSide: tone(16, 56), artBookLine: tone(30, 20), artLeaf: tone(22, 47), artLeaf2: tone(22, 62),
      scBg: tone(bgS + 4, 92.5), scBorder: tone(bgS, 86), scIconLine: tone(bgS, 80), scIcon: tone(12 + 22 * c, 40),
      chevron: tone(10, 50),
    };

    // Dark: deep tinted background, slightly lighter cards, a soft pastel accent for text.
    const dS = customShade ? 55 : 12 + 16 * c, dSoft = tone(22 + 16 * c, 19);
    // Keep the dark palette tied to the user's actual picker brightness, not the
    // light-mode contrast-corrected value. This makes the same selection visibly
    // recolour dark backgrounds, cards and buttons too.
    let dL = customShade ? clamp(30 + chosenL * .42, 30, 72) : 42, dPrimary = tone(26 + 30 * c, dL);
    while (contrast(dPrimary, W) < 4.6 && dL > 14) { dL -= 1; dPrimary = tone(26 + 30 * c, dL); }
    let xL = customShade ? clamp(70 + chosenL * .22, 70, 92) : 74, dAccent = tone(34 + 22 * c, xL);
    while (contrast(dAccent, dSoft) < 6 && xL < 94) { xL += 1; dAccent = tone(34 + 22 * c, xL); }
    const darkBgL = customShade ? clamp(2 + chosenL * .24, 2, 26) : 8;
    const dbg = tone(dS, darkBgL);
    const dark = {
      onPrimary: contrast(dPrimary, '#ffffff') >= contrast(dPrimary, '#111111') ? '#ffffff' : '#111111',
      bg: dbg, surface: tone(dS * .82, Math.min(34, darkBgL + 6)), surface2: tone(dS, Math.min(42, darkBgL + 13)), surfaceWarm: neutral ? mix('#202020', dbg, .4) : tone(dS * .72, Math.min(30, darkBgL + 8)),
      ink: tone(14 + 4 * c, 91), inkSoft: tone(12, 82), muted: tone(9 + 4 * c, 66),
      line: tone(dS * .72, 22), lineStrong: tone(dS * .68, 32),
      accent: dAccent, accentSoft: dSoft, primary: dPrimary, primaryHover: tone(26 + 30 * c, dL + 6), ring: dAccent,
      shadow: '0 1px 2px rgb(0 0 0 / 30%), 0 10px 30px -14px rgb(0 0 0 / 60%)',
      shadowHover: '0 14px 34px rgb(0 0 0 / 45%)',
      brand: light.brand, brandInk: light.brandInk, brandDot: light.brandDot,
      heroEm: tone(22 + 10 * c, 72),
      artDisc: tone(dS, 15), artRing: tone(dS - 4, 28), artShadow: tone(dS, 11), artPage: tone(18, 87), artEdge: tone(14, 72), artLine: tone(14, 46),
      artBook: tone(32, 30), artSide: tone(16, 56), artBookLine: tone(30, 20), artLeaf: tone(22, 47), artLeaf2: tone(22, 62),
      scBg: tone(dS + 2, 14.5), scBorder: tone(dS - 2, 23), scIconLine: tone(dS - 4, 29), scIcon: tone(22 + 14 * c, 72),
      chevron: tone(10, 62),
    };
    return { light, dark };
  }

  const cache = new Map();
  function palette(key) {
    const info = parse(key);
    if (!cache.has(info.key)) {
      if (cache.size > 120) cache.delete(cache.keys().next().value);
      if (info.isDefault) cache.set(info.key, FOREST);
      else if (info.key === 'black') {
        // Black is a true monochrome pair: Light is white-on-black text; Dark is black-on-white? No:
        // Light uses a white canvas with dark text; Dark uses a near-black canvas with light text.
        const light = {
          bg:'#ffffff', surface:'#ffffff', surface2:'#f3f3f3', surfaceWarm:'#fafafa',
          ink:'#111111', inkSoft:'#292929', muted:'#555555', line:'#dedede', lineStrong:'#b8b8b8',
          accent:'#111111', accentSoft:'#eeeeee', primary:'#111111', primaryHover:'#333333',
          ring:'#111111', brand:'#111111', brandInk:'#ffffff', brandDot:'#333333', onPrimary:'#ffffff',
          shadow:'0 1px 2px rgb(0 0 0 / 5%), 0 8px 24px -12px rgb(0 0 0 / 16%)',
          shadowHover:'0 14px 34px rgb(0 0 0 / 12%)', heroEm:'#333333',
          artDisc:'#f0f0f0', artRing:'#cccccc', artShadow:'#e2e2e2', artPage:'#ffffff',
          artEdge:'#dddddd', artLine:'#777777', artBook:'#333333', artSide:'#777777',
          artBookLine:'#222222', artLeaf:'#666666', artLeaf2:'#999999',
          scBg:'#f4f4f4', scBorder:'#dddddd', scIconLine:'#cccccc', scIcon:'#333333', chevron:'#555555'
        };
        const dark = {
          bg:'#000000', surface:'#0b0b0b', surface2:'#161616', surfaceWarm:'#101010',
          ink:'#ffffff', inkSoft:'#eeeeee', muted:'#bdbdbd', line:'#303030', lineStrong:'#505050',
          accent:'#ffffff', accentSoft:'#242424', primary:'#ffffff', primaryHover:'#e8e8e8',
          ring:'#ffffff', brand:'#ffffff', brandInk:'#000000', brandDot:'#ffffff', onPrimary:'#000000',
          shadow:'0 1px 2px rgb(0 0 0 / 55%), 0 8px 24px -12px rgb(0 0 0 / 70%)',
          shadowHover:'0 14px 34px rgb(0 0 0 / 65%)', heroEm:'#ffffff',
          artDisc:'#171717', artRing:'#444444', artShadow:'#101010', artPage:'#eeeeee',
          artEdge:'#cfcfcf', artLine:'#777777', artBook:'#222222', artSide:'#777777',
          artBookLine:'#111111', artLeaf:'#555555', artLeaf2:'#888888',
          scBg:'#151515', scBorder:'#383838', scIconLine:'#555555', scIcon:'#ffffff', chevron:'#ffffff'
        };
        cache.set(info.key, { light, dark });
      } else cache.set(info.key, build(info.h, info.s, info.hex || (info.custom ? hsl(info.h, info.s, info.l) : undefined), false, !!info.custom));
    }
    return cache.get(info.key);
  }

  const chev = c => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none' stroke='%23${c.slice(1)}' stroke-width='1.8'%3E%3Cpath d='m1 1 5 5 5-5'/%3E%3C/svg%3E")`;
  const decls = P => [
    ['bg', P.bg], ['surface', P.surface], ['surface-2', P.surface2], ['surface-warm', P.surfaceWarm], ['ink', P.ink], ['ink-soft', P.inkSoft], ['muted', P.muted],
    ['line', P.line], ['line-strong', P.lineStrong], ['accent', P.accent], ['accent-soft', P.accentSoft], ['primary', P.primary], ['primary-hover', P.primaryHover], ['on-primary', P.onPrimary || (contrast(P.primary, '#ffffff') >= contrast(P.primary, '#111111') ? '#ffffff' : '#111111')], ['ring', P.ring],
    ['shadow', P.shadow], ['shadow-hover', P.shadowHover], ['brand', P.brand], ['brand-ink', P.brandInk], ['brand-dot', P.brandDot], ['hero-em', P.heroEm],
    ['art-disc', P.artDisc], ['art-ring', P.artRing], ['art-shadow', P.artShadow], ['art-page', P.artPage], ['art-edge', P.artEdge], ['art-line', P.artLine], ['art-book', P.artBook], ['art-side', P.artSide], ['art-book-line', P.artBookLine], ['art-leaf', P.artLeaf], ['art-leaf2', P.artLeaf2],
    ['sc-bg', P.scBg], ['sc-border', P.scBorder], ['sc-icon-line', P.scIconLine], ['sc-icon', P.scIcon], ['chev', chev(P.chevron)],
  ].map(([k, v]) => `--${k}:${v}`).join(';');

  /* ---------- applying ---------- */
  let accentKey = 'green', styleEl = null;
  const mode = () => (pref || (media.matches ? 'dark' : 'light'));
  const favicon = c => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='${c}'/><text x='16' y='22' font-family='Georgia' font-size='18' fill='#f7f8f3' text-anchor='middle'>m</text></svg>`);

  function sync() {
    const m = root.dataset.theme || 'light', P = palette(accentKey)[m];
    document.querySelectorAll('meta[name="theme-color"]').forEach(t => t.setAttribute('content', P.bg));
    const ic = document.querySelector('link[rel="icon"]'); if (ic) ic.setAttribute('href', favicon(P.brand));
    document.dispatchEvent(new CustomEvent('bece:theme', { detail: { mode: m, accent: accentKey } }));
  }
  function setAccent(key, persist, quiet) {
    const info = parse(key); accentKey = info.key;
    if (info.isDefault) { root.removeAttribute('data-accent'); if (styleEl) styleEl.textContent = ''; }
    else {
      const pal = palette(info.key);
      if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'accent-theme'; document.head.append(styleEl); }
      // Doubled attribute selectors out-rank the stylesheet's own :root / [data-theme=dark] blocks regardless of source order.
      styleEl.textContent = `html[data-accent]:not([data-theme='dark']){${decls(pal.light)}}html[data-accent][data-theme='dark']{${decls(pal.dark)}}`;
      root.setAttribute('data-accent', info.custom ? 'custom' : info.key);
    }
    if (persist) { try { localStorage.setItem('bece.accent', info.key); } catch {} }
    if (!quiet) sync();
  }

  /* ---------- light / dark mode ---------- */
  const media = matchMedia('(prefers-color-scheme: dark)');
  let pref = null;
  try { pref = localStorage.getItem('bece_theme'); } catch {}
  if (!['light', 'dark'].includes(pref)) pref = null;

  function applyMode() {
    const t = mode(); root.dataset.theme = t;
    const tg = document.getElementById('theme-toggle');
    if (tg) { tg.setAttribute('aria-pressed', String(t === 'dark')); tg.title = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'; }
    sync();
  }
  media.addEventListener('change', () => { if (!pref) applyMode(); });

  window.BeceTheme = {
    get pref() { return pref || 'auto'; },
    get mode() { return mode(); },
    set(p) {
      pref = p === 'light' || p === 'dark' ? p : null;
      try { pref ? localStorage.setItem('bece_theme', pref) : localStorage.removeItem('bece_theme'); } catch {}
      applyMode();
    },
    toggle() { this.set(mode() === 'dark' ? 'light' : 'dark'); },
  };

  /* ---------- public profile API (used by the Friends page) ---------- */
  // Avatar choices stay native emoji so their expressions and character details remain intact.
  const safeAv = a => a;
  const AVATAR_GROUPS = [
    { id: 'animals', label: 'Animals', items: ['🦁', '🐯', '🦊', '🐼', '🐸', '🦉', '🐙', '🦄', '🐨', '🐧', '🦈', '🐺', '🦋', '🐢', '🦖', '🐬', '🐻', '🐰', '🦒', '🦅', '🐝', '🦜', '🐘', '🦓'] },
    { id: 'fun', label: 'Fun', items: ['🚀', '⚡', '🎯', '🌟', '🎮', '🔥', '👑', '💎', '🎧', '🎸', '⚽', '🏀', '🏆', '🎨', '🎭', '🧩', '🎲', '🛹', '🍉', '🍕', '🌈', '🌴', '🍦', '🎂'] },
    { id: 'study', label: 'Study', items: ['📚', '🧠', '✏️', '🔬', '🌍', '🧮', '💡', '🎓', '📝', '🔭', '⏳', '📐', '🧪', '🗺️', '🏛️', '🎻', '📖', '🖊️', '🔢', '🧬'] },
    { id: 'people', label: 'Characters', items: ['😎', '🤓', '🥳', '🤩', '😄', '🤠', '🕵️', '🧙', '🦸', '🤖', '👻', '👽', '🧛', '🧜', '🧑‍🚀', '🧑‍🎓', '🦹', '🧞', '🤴', '👸'] },
  ];
  window.BeceProfile = {
    AVATAR_GROUPS, safeAv,
    AVATARS: AVATAR_GROUPS.flatMap(g => g.items),
    PRESETS,
    COLORS: Object.fromEntries(Object.entries(PRESETS).map(([k, v]) => [k, v.hex])),
    parse, palette,
    customKey: (h, s, l = 50) => `custom:${Math.round(clamp(h, 0, 360))}:${Math.round(clamp(s, 0, 100))}:${Math.round(clamp(l, 0, 100))}`, 
    applyAccent: key => setAccent(key, true),
    get accent() { return accentKey; },
  };

  let saved = null;
  try { saved = localStorage.getItem('bece.accent'); } catch {}
  setAccent(saved, false, true);
  applyMode();
  document.addEventListener('DOMContentLoaded', () => {
    const tg = document.getElementById('theme-toggle');
    tg.addEventListener('click', () => window.BeceTheme.toggle());
    applyMode();
  });
})();

