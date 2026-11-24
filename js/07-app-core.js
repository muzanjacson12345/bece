
// BECE Mock Master — study app (quizzes, notes, essays, flashcards).
// Data comes from questions.js, notes.js and learning.js. Account features live in social.js,
// which talks to this file through window.App (events + a few helpers).
'use strict';

/* ======================= Helpers ======================= */
const $ = id => document.getElementById(id);
const UI_GLYPH_MAP = new Map([["💰",{"name":"coin","cls":"ui-icon--coin"}],["🪙",{"name":"coin-token","cls":"ui-icon--coin"}],["💎",{"name":"gem","cls":"ui-icon--gem"}],["🔥",{"name":"flame","cls":"ui-icon--flame"}],["🏆",{"name":"trophy","cls":"ui-icon--gold"}],["🥇",{"name":"medal","cls":"ui-icon--gold"}],["🥈",{"name":"medal","cls":"ui-icon--gold"}],["🥉",{"name":"medal","cls":"ui-icon--gold"}],["🏅",{"name":"medal","cls":"ui-icon--gold"}],["🎖️",{"name":"medal","cls":"ui-icon--gold"}],["👑",{"name":"crown","cls":"ui-icon--gold"}],["🛡️",{"name":"shield-check","cls":"ui-icon--shield"}],["🌱",{"name":"sprout","cls":"ui-icon--nature"}],["📖",{"name":"book-open","cls":"ui-icon--study"}],["🧠",{"name":"brain","cls":"ui-icon--study"}],["🎓",{"name":"graduation","cls":"ui-icon--study"}],["📚",{"name":"books","cls":"ui-icon--study"}],["🎯",{"name":"target","cls":"ui-icon--target"}],["🚀",{"name":"rocket","cls":"ui-icon--avatar"}],["🌟",{"name":"star","cls":"ui-icon--gold"}],["⭐",{"name":"star","cls":"ui-icon--gold"}],["💡",{"name":"bulb","cls":"ui-icon--study"}],["📘",{"name":"book","cls":"ui-icon--study"}],["📗",{"name":"book","cls":"ui-icon--study"}],["🗓️",{"name":"calendar","cls":""}],["🧭",{"name":"search","cls":""}],["🌍",{"name":"globe","cls":"ui-icon--social"}],["🌐",{"name":"globe","cls":"ui-icon--social"}],["🔬",{"name":"microscope","cls":"ui-icon--science"}],["🧪",{"name":"flask","cls":"ui-icon--science"}],["⚗️",{"name":"flask","cls":"ui-icon--science"}],["📐",{"name":"ruler","cls":"ui-icon--math"}],["✍️",{"name":"pen","cls":"ui-icon--study"}],["✏️",{"name":"pencil","cls":"ui-icon--math"}],["🖊️",{"name":"pen","cls":"ui-icon--study"}],["📝",{"name":"notebook","cls":"ui-icon--study"}],["🔭",{"name":"telescope","cls":"ui-icon--avatar"}],["⏳",{"name":"hourglass","cls":"ui-icon--avatar"}],["🧮",{"name":"calculator","cls":"ui-icon--math"}],["➗",{"name":"calculator","cls":"ui-icon--math"}],["💻",{"name":"laptop","cls":"ui-icon--technology"}],["🤝",{"name":"handshake","cls":"ui-icon--peace"}],["🛠️",{"name":"wrench","cls":"ui-icon--technology"}],["🎨",{"name":"palette","cls":"ui-icon--arts"}],["🎭",{"name":"masks","cls":"ui-icon--arts"}],["🧩",{"name":"puzzle","cls":"ui-icon--avatar"}],["🎲",{"name":"dice","cls":"ui-icon--avatar"}],["🎮",{"name":"gamepad","cls":"ui-icon--avatar"}],["⚡",{"name":"bolt","cls":"ui-icon--avatar"}],["🎧",{"name":"headphones","cls":"ui-icon--avatar"}],["🎸",{"name":"guitar","cls":"ui-icon--avatar"}],["⚽",{"name":"football","cls":"ui-icon--avatar"}],["🏀",{"name":"basketball","cls":"ui-icon--avatar"}],["🛹",{"name":"skateboard","cls":"ui-icon--avatar"}],["🍕",{"name":"pizza","cls":"ui-icon--avatar"}],["🌈",{"name":"rainbow","cls":"ui-icon--avatar"}],["🍦",{"name":"icecream","cls":"ui-icon--avatar"}],["🎂",{"name":"cake","cls":"ui-icon--avatar"}],["🧬",{"name":"dna","cls":"ui-icon--science"}],["📡",{"name":"satellite","cls":"ui-icon--technology"}],["💬",{"name":"message","cls":""}],["📣",{"name":"megaphone","cls":""}],["📢",{"name":"megaphone","cls":""}],["📩",{"name":"mail","cls":""}],["📨",{"name":"mail","cls":""}],["📤",{"name":"upload","cls":""}],["📸",{"name":"camera","cls":""}],["📷",{"name":"camera","cls":""}],["📁",{"name":"drive","cls":""}],["📂",{"name":"drive","cls":""}],["📋",{"name":"notebook","cls":""}],["📌",{"name":"pin","cls":""}],["📆",{"name":"calendar","cls":""}],["📅",{"name":"calendar","cls":""}],["🔒",{"name":"lock","cls":""}],["🔓",{"name":"unlock","cls":""}],["🔐",{"name":"lock","cls":""}],["🚪",{"name":"door-open","cls":""}],["🔧",{"name":"wrench","cls":""}],["🔨",{"name":"wrench","cls":""}],["🧰",{"name":"toolbox","cls":"ui-icon--technology"}],["🛒",{"name":"shopping-bag","cls":""}],["🛍️",{"name":"shopping-bag","cls":""}],["🐞",{"name":"bug","cls":""}],["🪲",{"name":"bug","cls":""}],["🗑️",{"name":"trash","cls":""}],["🚫",{"name":"ban","cls":""}],["⛔",{"name":"ban","cls":""}],["✅",{"name":"check","cls":"ui-icon--good"}],["✔️",{"name":"check","cls":"ui-icon--good"}],["❌",{"name":"x","cls":"ui-icon--bad"}],["✖️",{"name":"x","cls":"ui-icon--bad"}],["⚠️",{"name":"ban","cls":"ui-icon--warning"}],["🚨",{"name":"ban","cls":"ui-icon--warning"}],["🎁",{"name":"gift","cls":""}],["🔄",{"name":"refresh","cls":""}],["♻️",{"name":"refresh","cls":""}],["📊",{"name":"chart-column","cls":""}],["📈",{"name":"chart-line","cls":""}],["📉",{"name":"chart-line","cls":""}],["🏛️",{"name":"landmark","cls":"ui-icon--history"}],["⚖️",{"name":"scale","cls":"ui-icon--social"}],["🗺️",{"name":"map","cls":"ui-icon--social"}],["🕌",{"name":"mosque","cls":""}],["🥁",{"name":"drum","cls":"ui-icon--arts"}],["✒️",{"name":"quill","cls":"ui-icon--study"}],["🗿",{"name":"statue","cls":"ui-icon--history"}],["🌾",{"name":"wheat","cls":"ui-icon--nature"}],["🌳",{"name":"tree","cls":"ui-icon--nature"}],["🧹",{"name":"broom","cls":"ui-icon--technology"}],["☁️",{"name":"cloud","cls":""}],["🌤️",{"name":"sun-cloud","cls":"ui-icon--weather"}],["☀️",{"name":"sun","cls":""}],["🌙",{"name":"moon","cls":""}],["🧑‍🎓",{"name":"student","cls":"ui-icon--avatar"}],["🧑‍🚀",{"name":"astronaut","cls":"ui-icon--avatar"}],["🤖",{"name":"robot","cls":"ui-icon--avatar"}],["👻",{"name":"ghost","cls":"ui-icon--avatar"}],["👽",{"name":"alien","cls":"ui-icon--avatar"}],["🧙",{"name":"wizard","cls":"ui-icon--avatar"}],["😎",{"name":"sunglasses","cls":"ui-icon--avatar"}],["🤓",{"name":"glasses","cls":"ui-icon--avatar"}],["🥳",{"name":"party","cls":"ui-icon--avatar"}],["🤩",{"name":"star-eyes","cls":"ui-icon--avatar"}],["🤠",{"name":"detective","cls":"ui-icon--avatar"}],["🕵️",{"name":"detective","cls":"ui-icon--avatar"}],["🦸",{"name":"superhero","cls":"ui-icon--avatar"}],["🦹",{"name":"villain","cls":"ui-icon--avatar"}],["🧞",{"name":"genie","cls":"ui-icon--avatar"}],["🧜",{"name":"mermaid","cls":"ui-icon--avatar"}],["🧛",{"name":"vampire","cls":"ui-icon--avatar"}],["🤴",{"name":"crown","cls":"ui-icon--avatar"}],["👸",{"name":"crown","cls":"ui-icon--avatar"}],["😄",{"name":"smile","cls":"ui-icon--avatar"}],["🇫🇷",{"name":"flag-france","cls":"ui-icon--french"}],["🌠",{"name":"comet","cls":"ui-icon--sparkle"}],["💯",{"name":"hundred","cls":"ui-icon--gold"}],["🏁",{"name":"flag-checkered","cls":"ui-icon--gold"}],["✨",{"name":"sparkle","cls":"ui-icon--sparkle"}],["💠",{"name":"diamond","cls":"ui-icon--gem"}],["💫",{"name":"comet","cls":"ui-icon--sparkle"}],["🇬🇭",{"name":"flag-ghana","cls":"ui-icon--ghana"}],["🦺",{"name":"safety-vest","cls":"ui-icon--technology"}],["🪵",{"name":"wood-log","cls":"ui-icon--arts"}],["🥗",{"name":"salad","cls":"ui-icon--arts"}],["🖥️",{"name":"desktop","cls":"ui-icon--technology"}],["🕊️",{"name":"dove","cls":"ui-icon--peace"}],["🧲",{"name":"magnet","cls":"ui-icon--science"}],["🏺",{"name":"amphora","cls":"ui-icon--history"}],["👨‍👩‍👧‍👦",{"name":"family","cls":"ui-icon--people"}],["🎉",{"name":"party","cls":"ui-icon--sparkle"}],["🤔",{"name":"thinking","cls":"ui-icon--thinking"}],["🎒",{"name":"backpack","cls":"ui-icon--study"}],["🍉",{"name":"watermelon","cls":"ui-icon--avatar"}],["🌴",{"name":"palm-tree","cls":"ui-icon--avatar"}],["🗣️",{"name":"speech","cls":"ui-icon--french"}],["🔢",{"name":"calculator","cls":"ui-icon--math"}],["🖥",{"name":"desktop","cls":"ui-icon--technology"}],["🕊",{"name":"dove","cls":"ui-icon--peace"}],["🦁",{"name":"lion","cls":"ui-icon--avatar"}],["🐯",{"name":"tiger","cls":"ui-icon--avatar"}],["🦊",{"name":"fox","cls":"ui-icon--avatar"}],["🐼",{"name":"panda","cls":"ui-icon--avatar"}],["🐸",{"name":"frog","cls":"ui-icon--avatar"}],["🦉",{"name":"owl","cls":"ui-icon--avatar"}],["🐙",{"name":"octopus","cls":"ui-icon--avatar"}],["🦄",{"name":"unicorn","cls":"ui-icon--avatar"}],["🐨",{"name":"koala","cls":"ui-icon--avatar"}],["🐧",{"name":"penguin","cls":"ui-icon--avatar"}],["🦈",{"name":"shark","cls":"ui-icon--avatar"}],["🐺",{"name":"wolf","cls":"ui-icon--avatar"}],["🦋",{"name":"butterfly","cls":"ui-icon--avatar"}],["🐢",{"name":"turtle","cls":"ui-icon--avatar"}],["🦖",{"name":"dinosaur","cls":"ui-icon--avatar"}],["🐬",{"name":"dolphin","cls":"ui-icon--avatar"}],["🐻",{"name":"bear","cls":"ui-icon--avatar"}],["🐰",{"name":"rabbit","cls":"ui-icon--avatar"}],["🦒",{"name":"giraffe","cls":"ui-icon--avatar"}],["🦅",{"name":"eagle","cls":"ui-icon--avatar"}],["🐝",{"name":"bee","cls":"ui-icon--avatar"}],["🦜",{"name":"parrot","cls":"ui-icon--avatar"}],["🐘",{"name":"elephant","cls":"ui-icon--avatar"}],["🦓",{"name":"zebra","cls":"ui-icon--avatar"}],["🎻",{"name":"violin","cls":"ui-icon--avatar"}],["⚛️",{"name":"atom","cls":"ui-icon--science"}],["↗",{"name":"external-link","cls":"ui-icon--link"}],["⌨️",{"name":"keyboard","cls":"ui-icon--technology"}],["🏠",{"name":"home","cls":"ui-icon--home"}],["💽",{"name":"disc","cls":"ui-icon--technology"}],["💾",{"name":"save","cls":"ui-icon--technology"}],["📏",{"name":"ruler","cls":"ui-icon--math"}],["🔎",{"name":"search","cls":""}],["🔤",{"name":"letters","cls":"ui-icon--math"}],["🥷",{"name":"ninja","cls":"ui-icon--avatar"}],["☕",{"name":"coffee","cls":"ui-icon--arts"}],["🐲",{"name":"dragon","cls":"ui-icon--avatar"}],["🙂",{"name":"smile","cls":"ui-icon--avatar"}],["❓",{"name":"help-circle","cls":"ui-icon--thinking"}],["⏱",{"name":"stopwatch","cls":"ui-icon--technology"}],["📱",{"name":"smartphone","cls":"ui-icon--technology"}],["📬",{"name":"mail-open","cls":""}],["👥",{"name":"users","cls":"ui-icon--social"}],["📕",{"name":"book","cls":"ui-icon--study"}],["⏸️",{"name":"pause","cls":""}],["➕",{"name":"plus","cls":"ui-icon--good"}],["➖",{"name":"minus","cls":"ui-icon--bad"}],["🖼️",{"name":"image","cls":""}],["📄",{"name":"file-text","cls":"ui-icon--study"}],["▶",{"name":"play","cls":""}],["▶️",{"name":"play","cls":""}],["✕",{"name":"x","cls":"ui-icon--bad"}],["✓",{"name":"check","cls":"ui-icon--good"}],["✗",{"name":"x","cls":"ui-icon--bad"}]]);
const UI_GLYPH_KEYS = [...UI_GLYPH_MAP.keys()].sort((a,b)=>b.length-a.length);

function appendIconAwareText(node, value) {
  const text = String(value === undefined || value === null ? '' : value);
  if (!text || /^(OPTION|INPUT|TEXTAREA|SELECT)$/.test(node.tagName || '')) {
    node.appendChild(document.createTextNode(text)); return;
  }
  const className = typeof node.className === 'string' ? node.className : '';
  if (/(^|\s)(note-|essay-|lesson-|lab-|flow-|board-bio|account-name|ann-txt|adm-bug-text|note-body|note-explanation|note-key-ideas|note-takeaway|note-section|bio-text|achievement-icon|achievement-gem-reward|profile-tab|avatar-glyph|emoji-pick)(\S*)?(\s|$)/.test(className)) {
    node.appendChild(document.createTextNode(text)); return;
  }
  let buffer = '';
  const flush = () => { if (buffer) { node.appendChild(document.createTextNode(buffer)); buffer=''; } };
  for (let i=0;i<text.length;) {
    const glyph = UI_GLYPH_KEYS.find(key => text.startsWith(key, i));
    if (!glyph) { buffer += text[i++]; continue; }
    flush();
    const def = UI_GLYPH_MAP.get(glyph);
    node.appendChild(icon(def.name, 'ui-inline-icon' + (def.cls ? ' ' + def.cls : '')));
    i += glyph.length;
  }
  flush();
}
function setIconAwareText(node, value) {
  node.replaceChildren();
  appendIconAwareText(node, value);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // Regular text remains native: emoji are expressive content, not automatic icon replacements.
  if (text !== undefined && text !== null) node.appendChild(document.createTextNode(String(text)));
  return node;
}
const o = el;
function icon(name, extraClass) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon' + (extraClass ? ' ' + extraClass : ''));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#i-' + name);
  svg.append(use);
  return svg;
}
function setAvatarGlyph(node, value, extraClass) {
  node.replaceChildren();
  const glyph = String(value || '🙂');
  const emoji = document.createElement('span');
  emoji.className = 'avatar-glyph' + (extraClass ? ' ' + extraClass : '');
  emoji.setAttribute('aria-hidden', 'true');
  emoji.textContent = glyph;
  node.append(emoji);
}
const store = {
  get(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
  remove(key) { try { localStorage.removeItem(key); } catch {} },
};
function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const SUBJECT_LABEL = { social: 'Social Studies', arts: 'Creative Arts', maths: 'Mathematics', computing: 'Computing', rme: 'Religious & Moral Education', integratedScience: 'Integrated Science', french: 'French', mixed: 'Mixed subjects' };
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const isTyping = target => /INPUT|TEXTAREA|SELECT/.test(target.tagName) || target.isContentEditable;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function replayMotion(node, className) {
  if (!node || reducedMotion()) return;
  node.classList.remove(className);
  requestAnimationFrame(() => {
    if (node.isConnected) node.classList.add(className);
  });
}

/* ======================= Disclosure motion ======================= */
// Delegate to include answers and review sections created after page load.
// Keep `open` until the content and border have finished sliding together.
const disclosureStates = new WeakMap();
document.addEventListener('click', event => {
  const summary = event.target.closest('summary');
  const details = summary?.parentElement;
  if (!details || details.tagName !== 'DETAILS' || event.defaultPrevented) return;
  if (event.target.closest('a, button, input, select, textarea')) return;
  event.preventDefault();

  let state = disclosureStates.get(details);
  if (!state) {
    const body = el('div', 'disclosure-body');
    const inner = el('div', 'disclosure-inner');
    for (const child of [...details.childNodes]) {
      if (child !== summary) inner.append(child);
    }
    body.append(inner);
    details.append(body);
    state = { body, inner, expanded: details.open, pending: null };
    body.classList.toggle('is-collapsed', !details.open);
    disclosureStates.set(details, state);
  }

  // When idle, account for programmatic open changes (e.g. a new quiz/topic).
  if (!state.pending) state.expanded = details.open;
  state.pending?.();
  state.expanded = !state.expanded;
  const expanded = state.expanded;
  const { body, inner } = state;
  summary.setAttribute('aria-expanded', String(expanded));
  details.toggleAttribute('data-collapsing', !expanded);
  if (!expanded && inner.contains(document.activeElement)) summary.focus();
  inner.inert = !expanded;

  if (expanded) {
    details.open = true;
    // Establish the collapsed grid before transitioning a newly opened panel.
    body.getBoundingClientRect();
  }

  const finish = () => {
    cleanup();
    details.open = expanded;
    details.removeAttribute('data-collapsing');
    summary.removeAttribute('aria-expanded');
  };
  let timer;
  const onEnd = e => {
    if (e.target === body && e.propertyName === 'grid-template-rows') finish();
  };
  const cleanup = () => {
    clearTimeout(timer);
    body.removeEventListener('transitionend', onEnd);
    state.pending = null;
  };
  body.classList.toggle('is-collapsed', !expanded);
  if (reducedMotion()) { finish(); return; }
  body.addEventListener('transitionend', onEnd);
  // Also settle when the section is removed or its parent becomes hidden.
  timer = setTimeout(finish, 350);
  state.pending = cleanup;
});


/* =================== Expanded question banks ===================
   Additional questions are added before questionIndex is built, so
   quiz review, explanations, bookmarks, history and mixed practice
   all use the same shared question records as the original banks.
*/
const makeExtraMCQ = (id, topic, question, correctText, wrongTexts, explanation, hint) => {
  const raw = [correctText, ...wrongTexts];
  const shift = Number(id.split('-').pop()) % 4;
  const options = raw.map((_, i) => raw[(i + shift) % 4]);
  const correct = 'ABCD'[options.indexOf(correctText)];
  return { id, topic, question, options: options.map((text, i) => ({ key: 'ABCD'[i], text: String(text) })), correct, explanation, hint: hint || 'Read the question carefully, work through the idea, and eliminate options that do not fit.' };
};
const addExtraBank = (subject, prefix, rows, start) => {
  rows.forEach((r, i) => questionsDB[subject].push(makeExtraMCQ(prefix + '-' + (start + i), r[0], r[1], r[2], r[3], r[4], r[5])));
};
const mathExtras = [];
const addMath = (topic, q, answer, wrong, why) => mathExtras.push([topic, q, String(answer), wrong.map(String), why, 'Write down the rule or formula first, then substitute the given values.']);
for (let i=0;i<20;i++) {
  const a=17+i*3, b=6+(i*7)%19, op=i%4;
  if(op===0){const v=a+b;addMath('Number Operations',`Calculate ${a} + ${b}.`,v,[v+2,v-3,v+10],`Add the two numbers to obtain ${v}.`);}
  if(op===1){const v=a-b;addMath('Number Operations',`Evaluate ${a} − ${b}.`,v,[v+2,v-2,v+5],`Subtract ${b} from ${a}; the difference is ${v}.`);}
  if(op===2){const v=a*b;addMath('Number Operations',`Find the product of ${a} and ${b}.`,v,[v+a,v-b,v+12],`Multiplication gives ${a} × ${b} = ${v}.`);}
  if(op===3){const n=(a%8)+2, v=n* b;addMath('Number Operations',`A number ${v} is shared equally among ${b} groups. How many are in each group?`,n,[n+1,n+2,n-1],`Division gives ${v} ÷ ${b} = ${n}.`);}
}
for(let i=0;i<10;i++){const n=20+i*5,p=10+(i*7)%81,v=n*p/100;addMath('Fractions, Decimals & Percentages',`Find ${p}% of ${n}.`,Number(v.toFixed(2)),[Number((v+2).toFixed(2)),Number((v-1).toFixed(2)),Number((n-v).toFixed(2))],`Percentage amount = ${p} ÷ 100 × ${n} = ${v}.`);}
for(let i=0;i<10;i++){const a=2+i,b=3+(i%5),k=2+(i%4),v=a*k;addMath('Ratio and Proportion',`The ratio of red beads to blue beads is ${a}:${b}. If there are ${k} times as many beads, how many red beads are there?`,v,[v+1,v+b,v-k],`Multiply both parts of the ratio by ${k}; red beads = ${a} × ${k} = ${v}.`);}
for(let i=0;i<10;i++){const x=2+i, a=2+(i%4), c=3+(i%7), v=a*x+c;addMath('Algebra',`If ${a}x + ${c} = ${v}, find x.`,x,[x+1,x-1,x+2],`Subtract ${c} from both sides, then divide by ${a}; x = ${x}.`);}
for(let i=0;i<10;i++){const l=5+i,w=3+(i%6),v=l*w;addMath('Mensuration',`A rectangle is ${l} cm long and ${w} cm wide. Find its area.`,v,[v+7,v+13,v-5],`Area of a rectangle = length × width = ${l} × ${w} = ${v} cm².`);}
for(let i=0;i<10;i++){const a=35+i*4,b=65+i*3,v=180-a-b;addMath('Geometry',`Two angles in a triangle are ${a}° and ${b}°. Find the third angle.`,v,[180-a,180-b,a+b],`Angles in a triangle add up to 180°; the third angle is 180° − ${a}° − ${b}° = ${v}°.`);}
for(let i=0;i<10;i++){const a=4+i*2,b=8+i*2,c=10+i*3,v=(a+b+c)/3;addMath('Statistics',`Find the mean of ${a}, ${b} and ${c}.`,Number(v.toFixed(2)),[Number((v+2).toFixed(2)),Number((v-1).toFixed(2)),a+b+c],`Mean = total ÷ number of values = ${a+b+c} ÷ 3 = ${v}.`);}
for(let i=0;i<10;i++){const cm=125+i*25,m=cm/100;addMath('Measurement',`Convert ${cm} centimetres to metres.`,m,[cm*10,cm/10,m+1],`Divide centimetres by 100: ${cm} ÷ 100 = ${m} m.`);}
for(let i=0;i<10;i++){const red=2+i,blue=3+i,tot=red+blue;addMath('Probability',`A bag has ${red} red and ${blue} blue counters. What is the probability of picking a red counter?`,`${red}/${tot}`,[`${blue}/${tot}`,`1/${tot}`,`${red}/${blue}`],`Probability = favourable outcomes ÷ total outcomes = ${red}/${tot}.`);}
if(mathExtras.length!==100)throw Error('Math extras must be 100');
addExtraBank('maths','mat',mathExtras,101);


const computingExtras = [
['Computer Hardware','Which device is used to enter text into a computer?','Keyboard',['Monitor','Speaker','Projector'],'A keyboard sends typed characters to the computer.'],
['Computer Hardware','Which device displays visual output?','Monitor',['Mouse','Microphone','Scanner'],'A monitor is an output device that displays text, images and video.'],
['Computer Hardware','Which device produces a paper copy of a document?','Printer',['Joystick','Webcam','Router'],'A printer produces a hard copy on paper.'],
['Computer Hardware','Which device captures printed photographs for a computer?','Scanner',['Speaker','Plotter','Modem'],'A scanner converts a paper image into digital data.'],
['Computer Hardware','Which device is mainly used to point, click and select items?','Mouse',['Keyboard','Printer','Microphone'],'A mouse controls the pointer and selects objects on the screen.'],
['Computer Hardware','Which component performs most processing instructions?','CPU',['Monitor','Power cable','Keyboard'],'The central processing unit executes instructions and processes data.'],
['Computer Hardware','Which component temporarily holds data currently being used?','RAM',['DVD','Flash drive','Hard disk'],'RAM is temporary working memory and loses its contents when power is removed.'],
['Computer Hardware','Which component stores files even when power is off?','SSD or hard drive',['RAM','CPU register','Cache only'],'Secondary storage keeps data without continuous power.'],
['Computer Hardware','Which device supplies electrical power to desktop components?','Power supply unit',['Sound card','Mouse','Monitor stand'],'The power supply unit converts mains electricity into suitable power for computer components.'],
['Computer Hardware','Which port is commonly used to connect a flash drive?','USB port',['VGA port only','Audio jack','Ethernet socket only'],'USB ports connect many peripherals and storage devices.'],
['Software','Which software controls the basic operations of a computer?','Operating system',['Spreadsheet','Web page','Presentation slide'],'An operating system manages hardware and provides services for applications.'],
['Software','Which of these is an example of application software?','Word processor',['Device driver','Operating system kernel','BIOS'],'A word processor helps a user create and edit documents.'],
['Software','What is the main purpose of antivirus software?','To detect and help remove malicious software',['To increase screen size','To print documents','To create spreadsheets'],'Antivirus tools help identify, block and remove malware.'],
['Software','What does a software update commonly provide?','Bug fixes and improvements',['More physical RAM automatically','A larger monitor','A new keyboard'],'Updates can fix faults, improve security and add features.'],
['Software','Which file extension is commonly used for a plain text file?','.txt',['.mp3','.jpg','.exe'],'The .txt extension commonly identifies plain text files.'],
['Software','Which program is best suited to creating slide presentations?','Presentation software',['Database software','Antivirus software','File compression utility'],'Presentation software organises information into slides.'],
['Software','Which program is designed mainly for calculations in rows and columns?','Spreadsheet',['Web browser','Paint program','Media player'],'Spreadsheets organise data in cells and perform calculations using formulas.'],
['Software','Which software is used to browse websites?','Web browser',['Compiler','Calculator only','Disk defragmenter'],'A web browser retrieves and displays web pages.'],
['Software','What is a computer program?','A set of instructions for a computer',['A type of monitor','A power cable','A storage shelf'],'A program contains instructions that a computer follows to perform tasks.'],
['Software','What does GUI stand for?','Graphical User Interface',['General Utility Internet','Global User Information','Graphic Unit Input'],'A GUI lets users interact through visual elements such as icons, windows and menus.'],
['Data and Storage','Which unit is commonly used to represent one binary digit?','Bit',['Byte','Kilobyte','Megabyte'],'A bit is a single binary digit: 0 or 1.'],
['Data and Storage','How many bits make one byte?','8',['2','4','16'],'A byte consists of eight bits.'],
['Data and Storage','Which is the largest of these storage units?','Gigabyte',['Kilobyte','Byte','Megabyte'],'A gigabyte is larger than a megabyte, kilobyte and byte.'],
['Data and Storage','Which device is portable and commonly plugs into a USB port?','Flash drive',['Desktop tower','Projector screen','UPS battery'],'A flash drive is a small portable storage device.'],
['Data and Storage','Why should important files be backed up?','To recover them if the originals are lost or damaged',['To make the screen brighter','To stop all viruses','To increase typing speed'],'A backup provides another copy that can be restored after data loss.'],
['Data and Storage','Which storage medium uses laser technology to read data?','Optical disc',['RAM chip','Magnetic tape only','Solid-state drive'],'CDs and DVDs are optical media read with a laser.'],
['Data and Storage','What is a folder used for?','Organising files',['Cooling the CPU','Connecting to Wi-Fi','Typing numbers'],'Folders group files and other folders to make them easier to manage.'],
['Data and Storage','What does deleting a file normally do?','Removes its normal directory entry or moves it to a recycle area',['Prints the file','Encrypts the monitor','Copies it to every folder'],'Deleting removes a file from its usual location; recovery may be possible from a recycle area or backup.'],
['Data and Storage','Which practice helps prevent accidental data loss?','Saving work regularly',['Unplugging the computer while saving','Ignoring error messages','Deleting backups'],'Regular saving reduces the amount of recent work that can be lost.'],
['Data and Storage','What is a file extension used for?','Indicating a file type or format',['Measuring file weight','Showing screen brightness','Naming the computer owner only'],'Extensions such as .pdf and .png help identify file formats.'],
['Internet and Networks','What does LAN stand for?','Local Area Network',['Large Access Number','Linked Application Name','Long Area Node'],'A LAN connects devices within a limited area such as a school or office.'],
['Internet and Networks','Which device directs data between different networks?','Router',['Keyboard','Printer','Scanner'],'A router forwards data between networks and commonly connects a home network to the internet.'],
['Internet and Networks','What is the internet?','A worldwide network of interconnected networks',['A single computer','A word-processing program','A type of printer'],'The internet links many computer networks around the world.'],
['Internet and Networks','What does URL identify?','The address of a resource on the web',['A computer battery','A keyboard layout','A file compression method'],'A URL specifies the location of a resource such as a web page.'],
['Internet and Networks','Which protocol is commonly used to transfer web pages securely?','HTTPS',['FTP only','SMTP only','Bluetooth'],'HTTPS protects web communication using encryption through TLS.'],
['Internet and Networks','What is an email attachment?','A file sent along with an email',['The email subject','The sender address','A spam filter'],'An attachment is a document, image or other file included with a message.'],
['Internet and Networks','Which service translates domain names into IP addresses?','DNS',['USB','CPU','HTML'],'The Domain Name System helps devices find the IP address for a domain name.'],
['Internet and Networks','What does Wi-Fi allow devices to do?','Connect to a network wirelessly',['Print without ink','Store data permanently','Increase processor speed'],'Wi-Fi uses radio signals to connect devices to a local network.'],
['Internet and Networks','What is a search engine used for?','Finding information on the web',['Editing audio files','Scanning paper','Controlling computer fans'],'A search engine indexes and helps users find online information.'],
['Internet and Networks','What is bandwidth in a network?','The data-carrying capacity of a connection',['The length of a keyboard','The weight of a router','The size of a monitor'],'Bandwidth describes how much data a connection can carry in a given time.'],
['Cyber Safety','Which is the strongest password choice?','A long, unique passphrase',['12345678','password','Your first name'],'Long unique passwords are harder to guess and should not be reused.'],
['Cyber Safety','What should you do with a suspicious email link?','Avoid clicking and verify the sender independently',['Forward it to everyone','Enter your password','Download every attachment'],'Phishing links can lead to fake websites or harmful downloads.'],
['Cyber Safety','What is phishing?','A trick used to steal personal information',['A method of cooling a CPU','A type of spreadsheet','A safe backup process'],'Phishing messages impersonate trusted sources to trick people into revealing information.'],
['Cyber Safety','Why should you log out of a shared computer?','To prevent another user accessing your account',['To increase screen resolution','To charge the battery','To delete the operating system'],'Logging out ends your active session and helps protect your account.'],
['Cyber Safety','What should you do before sharing someone’s photograph online?','Get their permission',['Add their home address','Share it publicly by default','Remove the date only'],'Respecting consent and privacy is important before posting another person’s image.'],
['Cyber Safety','What is malware?','Software designed to harm, disrupt or gain unauthorised access',['A type of monitor','A safe spreadsheet formula','A computer desk'],'Malware includes viruses, worms, spyware and ransomware.'],
['Cyber Safety','Why is two-factor authentication useful?','It adds another proof of identity beyond a password',['It removes the need for passwords everywhere','It makes files public','It disables updates'],'A second verification step makes account access harder for an attacker.'],
['Cyber Safety','Which information should you avoid posting publicly?','Passwords and private account details',['A general school subject','A public weather report','A non-personal study tip'],'Passwords and private account information should remain confidential.'],
['Cyber Safety','What is cyberbullying?','Using digital technology to harass or harm someone',['Repairing a computer online','Learning to code','Backing up a file'],'Cyberbullying involves harmful behaviour through digital communication.'],
['Cyber Safety','What is a firewall designed to do?','Monitor and control network traffic',['Increase paper size','Clean the keyboard physically','Create slide transitions'],'A firewall applies rules to allow or block network connections.'],
['Word Processing','Which feature checks spelling in a document?','Spell checker',['Slide sorter','Formula bar','Query wizard'],'A spell checker identifies possible spelling errors.'],
['Word Processing','Which keyboard shortcut commonly copies selected text?','Ctrl + C',['Ctrl + V','Ctrl + X','Ctrl + P'],'Ctrl + C copies selected content to the clipboard on many computers.'],
['Word Processing','Which shortcut commonly pastes copied text?','Ctrl + V',['Ctrl + C','Ctrl + Z','Ctrl + S'],'Ctrl + V inserts the clipboard contents.'],
['Word Processing','What is the purpose of text alignment?','To position text relative to the page margins',['To change the file name','To delete a paragraph','To calculate totals'],'Alignment controls whether text is left, centred, right or justified.'],
['Word Processing','Which feature creates the same heading style throughout a document?','Styles',['Mail merge only','Find and replace','Page count'],'Styles apply consistent formatting to headings and other text.'],
['Word Processing','What does mail merge help a user create?','Many personalised letters from one template and a data list',['A computer network','A video animation','A database password'],'Mail merge combines a document template with records such as names and addresses.'],
['Word Processing','What is a header in a document?','Content placed in the top margin area',['The final paragraph','A spelling mistake','A page background only'],'A header appears in the top margin, often on multiple pages.'],
['Word Processing','Which feature helps locate a word in a long document?','Find',['Crop','Sort ascending','Slide transition'],'Find searches a document for specified text.'],
['Word Processing','What does Ctrl + Z commonly do?','Undo the last action',['Save the file','Print the page','Close the computer'],'Undo reverses the most recent action when possible.'],
['Word Processing','Why use page numbers in a long report?','To help readers locate pages',['To change font colour','To remove margins','To encrypt pictures'],'Page numbers make a multi-page document easier to navigate.'],
['Spreadsheets','What is the intersection of a row and a column called?','Cell',['Slide','Record','Folder'],'A cell is the basic location where spreadsheet data is entered.'],
['Spreadsheets','Which symbol usually begins a spreadsheet formula?','=', ['+ only','%','?'], 'Spreadsheet formulas commonly begin with an equals sign.'],
['Spreadsheets','Which function adds a range of numbers?','SUM',['COUNTIF only','MAX','LEFT'],'SUM calculates the total of selected numeric values.'],
['Spreadsheets','Which function finds the arithmetic mean?','AVERAGE',['MIN','ROUNDUP','LEN'],'AVERAGE returns the arithmetic mean of numeric values.'],
['Spreadsheets','What does a cell reference such as B4 identify?','Column B, row 4',['Row B, column 4','Workbook 4','Sheet B only'],'A cell reference combines a column letter and row number.'],
['Spreadsheets','What is a chart used for in a spreadsheet?','Presenting data visually',['Deleting formulas','Protecting a password','Changing the keyboard'],'Charts help readers see patterns and comparisons in data.'],
['Spreadsheets','What does sorting data do?','Arranges records in a chosen order',['Deletes every duplicate automatically','Encrypts the workbook','Changes all values to text'],'Sorting orders data, for example alphabetically or from smallest to largest.'],
['Spreadsheets','What is a workbook?','A spreadsheet file that can contain worksheets',['A single cell','A printed chart','A computer network'],'A workbook is the spreadsheet document and may contain multiple sheets.'],
['Spreadsheets','Which symbol is used for multiplication in many spreadsheet formulas?','*',['x only','/','&'],'The asterisk is the multiplication operator in common spreadsheet formulas.'],
['Spreadsheets','What does the fill handle help users do?','Copy a formula or continue a series',['Delete the worksheet','Turn off the computer','Change a cell into a picture'],'The fill handle copies content or extends patterns into neighbouring cells.'],
['Programming','What is an algorithm?','A finite, ordered set of steps for solving a problem',['A computer monitor','A type of printer','A password list'],'An algorithm describes a clear sequence of steps to solve a task.'],
['Programming','Which flowchart symbol usually represents a decision?','Diamond',['Oval','Rectangle','Parallelogram'],'A diamond represents a decision or condition with alternative paths.'],
['Programming','Which flowchart symbol commonly represents start or end?','Oval',['Diamond','Rectangle','Arrow'],'A terminator, often drawn as an oval, marks the start or end.'],
['Programming','What is a variable in programming?','A named place for storing a value',['A physical keyboard key','A computer virus','A network cable'],'A variable is a named storage location whose value can be used or changed.'],
['Programming','What is a loop used for?','Repeating instructions',['Displaying only pictures','Deleting a program','Connecting a printer'],'A loop repeats a block of instructions while a condition or count allows it.'],
['Programming','What is a condition in a program?','A test that can be true or false',['A type of monitor','A file extension','A printer setting'],'Conditions control decisions and branching in a program.'],
['Programming','What is debugging?','Finding and correcting errors in a program',['Decorating a web page','Installing a keyboard','Printing source code'],'Debugging is the process of locating and fixing program errors.'],
['Programming','What is an input in a computer program?','Data supplied to the program',['The final printed result only','A power cable','A computer case'],'Input is information provided for processing.'],
['Programming','What is an output in a computer program?','Information produced by the program',['The instructions typed by a programmer only','A network socket','A storage device'],'Output is the result produced after processing.'],
['Programming','What is pseudocode?','A structured, language-independent description of an algorithm',['A computer virus','A type of hardware','A finished executable file'],'Pseudocode expresses program logic in readable steps without strict programming syntax.'],
['Digital Citizenship','What is plagiarism?','Presenting another person’s work as your own',['Saving a file twice','Using a keyboard','Correctly citing a source'],'Plagiarism is using another person’s words or ideas without proper acknowledgement.'],
['Digital Citizenship','Why should sources be acknowledged in schoolwork?','To give credit and let readers check the source',['To make the file larger','To hide copied work','To stop all editing'],'Acknowledging sources recognises the original creator and supports verification.'],
['Digital Citizenship','What is ergonomics in computer use?','Designing work conditions to support comfort and safety',['Increasing internet speed','Writing computer code','Compressing files'],'Ergonomics considers posture, equipment and working conditions to reduce strain.'],
['Digital Citizenship','Which action supports responsible e-waste management?','Taking old electronics to an approved collection or recycling point',['Burning circuit boards','Dumping batteries in a river','Leaving devices in drains'],'Approved collection and recycling reduce pollution and recover useful materials.'],
['Digital Citizenship','What is accessibility in digital technology?','Designing technology so people with different abilities can use it',['Making every file private','Removing all images','Using only one font'],'Accessible design includes features such as captions, keyboard navigation and screen-reader support.'],
['Digital Citizenship','What is a digital footprint?','The trail of information left by online activities',['A mark on a printer','A computer cable','A type of spreadsheet'],'Online posts, searches and interactions can contribute to a digital footprint.'],
['Digital Citizenship','Why should software be downloaded from trusted sources?','To reduce the risk of unsafe or altered programs',['To make the monitor brighter','To increase paper size','To avoid using passwords'],'Trusted sources reduce exposure to malware and counterfeit software.'],
['Digital Citizenship','What is netiquette?','Good manners when communicating online',['A computer storage unit','A programming language','A type of network cable'],'Netiquette means respectful and responsible behaviour in online communication.'],
['Digital Citizenship','What should you do if someone sends you a threatening message online?','Save evidence and report it to a trusted adult or platform',['Reply with threats','Share it widely','Send your password'],'Reporting harmful messages and seeking trusted support is safer than escalating the exchange.'],
['Database Basics','What is a database?','An organised collection of related data',['A type of monitor','A computer virus','A keyboard shortcut'],'A database stores related information in an organised way.'],
['Database Basics','What is a record in a database?','A group of related fields about one item',['A single character only','A complete computer','A printer setting'],'A record contains information about one person, object or event.'],
['Database Basics','What is a field in a database?','One category of information in a record',['A whole computer network','A printed page','A type of mouse'],'A field stores one type of information, such as a name or date.'],
['Database Basics','What is a primary key used for?','Uniquely identifying each record',['Changing the monitor brightness','Printing a report','Deleting every field'],'A primary key gives each record a unique identifier.'],
['Database Basics','What is a database query used for?','Finding records that match chosen conditions',['Turning off a computer','Drawing a picture','Playing a sound'],'A query retrieves information that meets specified conditions.'],
['Presentations','What is a slide transition?','An effect used when moving from one slide to another',['A spelling correction','A spreadsheet formula','A database record'],'A transition controls how one presentation slide changes to the next.'],
['Presentations','What is animation in presentation software?','An effect applied to text or objects on a slide',['A way to connect to Wi-Fi','A method of saving a file','A computer virus'],'Animation controls how slide objects appear, move or disappear.'],
['Presentations','Which device displays a computer image on a large screen?','Projector',['Scanner','Keyboard','Microphone'],'A projector displays a computer’s visual output on a wall or screen.'],
['Communication','What is a video conference?','A live meeting using video and audio over a network',['A printed letter','A spreadsheet chart','A computer restart'],'Video conferencing lets people communicate in real time from different places.'],
['Digital Tools','What is a QR code commonly used for?','Storing information that a camera can scan',['Cooling a computer','Charging a battery','Measuring temperature'],'A QR code stores data that a phone or scanner can read.'],
['Digital Citizenship','What is copyright intended to protect?','Creators’ original works',['Computer batteries','Internet speed','Keyboard layouts'],'Copyright gives creators legal rights over the use of their original works.']
].map((r,i)=>[r[0],r[1],r[2],r[3],r[4],r[5]]);
if(computingExtras.length!==100)throw Error('Computing extras must be 100: '+computingExtras.length);
addExtraBank('computing','com',computingExtras,101);


const socialExtras = [
['Ghana: Physical Environment','Which river is the main outlet of Lake Volta?','Volta River',['Pra River','Ankobra River','Tano River'],'The Volta River flows from the lake towards the Gulf of Guinea.'],
['Ghana: Physical Environment','Which lake is one of the largest man-made lakes in the world by surface area?','Lake Volta',['Lake Bosomtwe','Lake Chad','Lake Victoria'],'Lake Volta was formed by the Akosombo Dam and has a very large surface area.'],
['Ghana: Physical Environment','Which part of Ghana has the driest climate?','Northern Ghana',['The coast','The south-west forest zone','The Akwapim ridge'],'Northern Ghana has a longer dry season and lower rainfall than the forest belt.'],
['Ghana: Physical Environment','Which vegetation type is common in northern Ghana?','Guinea savannah',['Mangrove swamp','Tropical rainforest','Mountain conifer forest'],'The Guinea savannah is widespread across much of northern Ghana.'],
['Ghana: Physical Environment','Which vegetation type is associated with the south-western part of Ghana?','High forest',['Sahel grassland','Desert scrub','Alpine tundra'],'The south-west receives high rainfall and supports moist semi-deciduous and evergreen forests.'],
['Ghana: Physical Environment','Which ocean borders Ghana to the south?','Atlantic Ocean',['Indian Ocean','Arctic Ocean','Pacific Ocean'],'Ghana has a southern coastline along the Gulf of Guinea in the Atlantic Ocean.'],
['Ghana: Physical Environment','What is the capital city of the Northern Region?','Tamale',['Bolgatanga','Wa','Damongo'],'Tamale is the regional capital of the Northern Region.'],
['Ghana: Physical Environment','Which Ghanaian region is especially associated with the Akwapim-Togo mountain range?','Oti and Volta areas',['Western and Central areas','Greater Accra only','Upper West only'],'The Akwapim-Togo range runs through eastern Ghana, including parts of the Volta and Oti areas.'],
['Ghana: Physical Environment','What is the main cause of the alternation of wet and dry seasons in Ghana?','Seasonal movement of the rain belt',['Earthquakes','Ocean tides','Volcanic eruptions'],'The seasonal movement of the Inter-Tropical Convergence Zone influences rainfall patterns.'],
['Ghana: Physical Environment','Which activity is most likely to cause coastal erosion?','Removal of coastal vegetation and strong wave action',['Planting mangroves','Building away from the shore','Restoring sand dunes'],'Waves remove beach material, and loss of vegetation can make shorelines more vulnerable.'],
['Resources and Economy','Which mineral is a major export of Ghana?','Gold',['Tin','Uranium','Platinum'],'Gold is one of Ghana’s major mineral exports.'],
['Resources and Economy','Which crop is a major traditional export crop of Ghana?','Cocoa',['Wheat','Barley','Olives'],'Cocoa has long been an important agricultural export and source of income.'],
['Resources and Economy','Which resource is used to generate hydroelectric power at Akosombo?','Water from the Volta River system',['Crude oil only','Wind from the coast','Coal from the north'],'The Akosombo Dam uses stored water to drive turbines and generate electricity.'],
['Resources and Economy','Which activity belongs to the primary sector of the economy?','Fishing',['Banking','Teaching','Insurance'],'Fishing obtains products directly from natural resources and belongs to the primary sector.'],
['Resources and Economy','Which activity belongs to the secondary sector?','Processing cocoa into chocolate',['Growing cocoa pods','Selling groceries','Providing legal advice'],'Manufacturing and processing transform raw materials into finished or semi-finished goods.'],
['Resources and Economy','Which activity is part of the tertiary sector?','Transport services',['Mining bauxite','Growing maize','Harvesting timber'],'The tertiary sector provides services such as transport, banking and education.'],
['Resources and Economy','What is subsistence farming mainly intended to provide?','Food for the farmer’s household',['Raw materials for export only','Fuel for factories','Food for overseas markets only'],'Subsistence farming mainly produces food for the household, with any surplus possibly sold.'],
['Resources and Economy','Which practice helps maintain soil fertility on a farm?','Crop rotation with legumes',['Growing one crop continuously','Burning all crop residues','Removing all organic matter'],'Legumes can improve soil nitrogen, and rotation helps maintain soil health.'],
['Resources and Economy','What is a major benefit of irrigation?','It supplies crops with water during dry periods',['It removes all pests','It prevents every plant disease','It makes rainfall unnecessary everywhere'],'Irrigation provides water when rainfall is insufficient or unreliable.'],
['Resources and Economy','What does value addition mean?','Processing a product to increase its usefulness or value',['Throwing away raw materials','Reducing product quality','Stopping production'],'Processing, packaging and improving products can increase their market value.'],
['Government and Constitution','What is the supreme law of Ghana?','The 1992 Constitution',['A district by-law','A school rule','A political party manifesto'],'The Constitution is the highest law and other laws must be consistent with it.'],
['Government and Constitution','Which arm of government makes laws in Ghana?','The Legislature',['The Executive','The Judiciary','The Electoral Commission'],'Parliament exercises legislative power by making laws.'],
['Government and Constitution','Which arm of government interprets laws?','The Judiciary',['The Legislature','The Executive','The Civil Service'],'The courts interpret and apply the law when resolving cases.'],
['Government and Constitution','Who is the head of state and government in Ghana?','The President',['The Speaker of Parliament','The Chief Justice','The Inspector-General of Police'],'Ghana has an executive president who serves as head of state and government.'],
['Government and Constitution','What is the main role of the Electoral Commission?','Organising and supervising public elections',['Making national budgets','Interpreting court judgments','Commanding the armed forces'],'The Electoral Commission manages elections and referenda in Ghana.'],
['Government and Constitution','What is decentralisation?','Transferring some decision-making powers to local authorities',['Removing all local government','Giving every decision to one ministry','Ending community participation'],'Decentralisation brings administration and some decisions closer to local communities.'],
['Government and Constitution','Which institution is responsible for local government at district level?','District Assembly',['Supreme Court','Bank of Ghana','National House of Chiefs'],'District Assemblies are the basic units of local government administration.'],
['Government and Constitution','What is the main purpose of the separation of powers?','To prevent excessive concentration of power',['To stop citizens voting','To abolish the courts','To give all powers to Parliament'],'Separating powers creates checks and balances among government institutions.'],
['Government and Constitution','What is a referendum?','A direct vote by citizens on a specific issue',['A meeting of judges only','A court sentence','A school examination'],'A referendum allows voters to decide directly on a particular public question.'],
['Government and Constitution','What does the rule of law mean?','Everyone, including leaders, is subject to the law',['Leaders are above the law','Only citizens must obey laws','Courts can ignore the Constitution'],'The rule of law requires laws to apply fairly to all people and institutions.'],
['Citizenship and Rights','Which action is an example of responsible citizenship?','Paying lawful taxes and obeying the law',['Destroying public property','Spreading false information','Refusing every civic duty'],'Responsible citizens respect laws, contribute to society and protect public resources.'],
['Citizenship and Rights','Which right protects a person’s freedom to express opinions within the law?','Freedom of expression',['Right to own another person','Right to ignore court orders','Right to damage public property'],'Freedom of expression allows people to share ideas subject to lawful limits.'],
['Citizenship and Rights','What is one responsibility of a Ghanaian citizen?','Protecting public property',['Avoiding all community work','Breaking traffic rules','Preventing others from voting'],'Citizens share responsibility for safeguarding public facilities and resources.'],
['Citizenship and Rights','What is universal adult suffrage?','The right of eligible adults to vote without unfair discrimination',['Voting only by property owners','Voting only by traditional rulers','Voting only by public officers'],'Universal adult suffrage gives eligible adult citizens the vote under the law.'],
['Citizenship and Rights','Which behaviour demonstrates tolerance?','Respecting people with different beliefs',['Insulting people who disagree','Forcing others to copy you','Excluding people from public spaces'],'Tolerance involves respecting differences and allowing peaceful coexistence.'],
['Citizenship and Rights','What is national identity?','A sense of belonging to a country and its people',['A person’s bank PIN','A private phone password','A single family nickname'],'National identity connects people through shared citizenship, symbols and civic belonging.'],
['Population and Migration','What is rural-urban migration?','Movement from villages to towns and cities',['Movement from one country to another only','Movement from cities to farms only','Movement between continents by sea'],'Rural-urban migration is movement from rural settlements to urban areas.'],
['Population and Migration','Which is a common pull factor attracting people to cities?','Greater access to jobs and services',['Lack of transport','Fewer schools','Limited hospitals'],'Employment, education and health services can attract migrants to urban areas.'],
['Population and Migration','Which is a possible effect of rapid urbanisation?','Pressure on housing and sanitation services',['Automatic disappearance of traffic','Lower demand for water','No need for waste collection'],'Fast urban growth can strain housing, roads, water and sanitation systems.'],
['Population and Migration','What is population density?','The number of people living per unit area',['The number of births in a year','The total number of schools','The number of vehicles per household'],'Population density compares the number of people with the area they occupy.'],
['Population and Migration','What is a census?','An official count of a population at a particular time',['A list of imported goods','A record of rainfall only','A school attendance register'],'A census collects information about the size and characteristics of a population.'],
['Culture and National Identity','Which national symbol of Ghana features a black star?','The national flag',['The national anthem only','The coat of arms only','The national pledge only'],'Ghana’s flag includes a black star in its central red, gold and green design.'],
['Culture and National Identity','What is a major purpose of traditional festivals?','To remember history and strengthen community identity',['To prevent all trade','To replace every school subject','To stop cultural learning'],'Festivals preserve history, values and social bonds within communities.'],
['Culture and National Identity','Which instrument is commonly associated with traditional Ghanaian music?','Fontomfrom drum',['Bagpipe only','Harp only','Accordion only'],'Fontomfrom drums are used in some Ghanaian traditional ensembles and ceremonies.'],
['Culture and National Identity','What is cultural heritage?','Traditions, places and objects passed from earlier generations',['Only modern electronic devices','A person’s daily timetable','A list of imported products'],'Cultural heritage includes tangible and intangible features inherited from the past.'],
['Culture and National Identity','Why are Ghanaian languages important?','They preserve communication, knowledge and cultural identity',['They prevent education','They make translation impossible','They replace all other languages'],'Local languages carry knowledge, history and identity across generations.'],
['Environment and Sustainability','Which practice is best for reducing plastic waste?','Reusing and recycling suitable plastic items',['Burning plastic in open spaces','Dumping plastic into drains','Throwing plastic into rivers'],'Reusing and recycling reduce waste and help prevent pollution.'],
['Environment and Sustainability','What is afforestation?','Planting trees on land that was not recently forested',['Cutting down all trees','Removing soil from farms','Building roads through forests'],'Afforestation establishes tree cover on land that was not recently forested.'],
['Environment and Sustainability','Which human activity contributes to deforestation?','Uncontrolled logging',['Tree planting','Forest restoration','Agroforestry'],'Uncontrolled logging removes trees faster than forests can recover.'],
['Environment and Sustainability','Why are wetlands important?','They provide habitats and help filter water',['They create all earthquakes','They stop every flood','They contain no wildlife'],'Wetlands support biodiversity, store water and can filter pollutants.'],
['Environment and Sustainability','Which action helps conserve water at home?','Repairing leaking taps',['Leaving taps running','Washing pavements with a hose daily','Ignoring broken pipes'],'Repairing leaks prevents unnecessary water loss.'],
['Environment and Sustainability','What is climate change?','Long-term changes in average climate patterns',['A change in today’s weather only','The daily movement of clouds','A single thunderstorm'],'Climate change refers to persistent changes in climate averages and patterns.'],
['Health and Sanitation','Which practice helps prevent malaria?','Sleeping under an insecticide-treated mosquito net',['Leaving stagnant water uncovered','Keeping refuse beside the house','Avoiding window screens'],'Treated nets reduce contact with mosquitoes that transmit malaria.'],
['Health and Sanitation','Which action helps prevent cholera?','Drinking safe water and washing hands with soap',['Eating uncovered food','Using untreated water','Open defecation'],'Safe water, sanitation and handwashing reduce cholera transmission.'],
['Health and Sanitation','Why is proper refuse disposal important?','It reduces pests, pollution and disease risks',['It increases blocked drains','It attracts more rodents','It contaminates water deliberately'],'Proper waste management protects health and the environment.'],
['Health and Sanitation','What is immunisation?','Giving a vaccine to help the body develop protection against a disease',['Treating every illness with antibiotics','Removing all bacteria from the body','Replacing a balanced diet'],'Vaccines train the immune system to recognise particular disease-causing organisms.'],
['Health and Sanitation','Which nutrient is especially important for strong bones and teeth?','Calcium',['Starch','Fibre','Water'],'Calcium is a mineral needed for healthy bones and teeth.'],
['Conflict and Cooperation','What is negotiation?','Discussing differences to reach an agreement',['Using threats to force a decision','Ignoring every concern','Spreading rumours about others'],'Negotiation uses discussion and compromise to settle disagreements.'],
['Conflict and Cooperation','Which quality helps people resolve conflict peacefully?','Active listening',['Insults','Intimidation','Refusing to communicate'],'Listening helps people understand different views and find common ground.'],
['Conflict and Cooperation','What is mediation?','A neutral person helps disputing parties reach agreement',['A judge writes a school timetable','One side threatens the other','A crowd spreads rumours'],'A mediator facilitates discussion but does not impose the decision.'],
['Conflict and Cooperation','Why is teamwork useful in community projects?','People combine skills and share responsibilities',['It prevents all planning','It removes accountability','It guarantees no disagreement'],'Teamwork brings different skills together and distributes tasks.'],
['Conflict and Cooperation','What is patriotism?','Love and commitment to one’s country',['Disrespect for public institutions','Hatred of every other country','Refusal to obey any law'],'Patriotism includes constructive service and concern for the country’s wellbeing.'],
['Economic Development','What is entrepreneurship?','Identifying opportunities and organising a business activity',['Spending without planning','Avoiding all innovation','Waiting for others to do every task'],'Entrepreneurs organise resources and take considered risks to provide goods or services.'],
['Economic Development','What is saving?','Keeping part of income for future use',['Spending all income immediately','Borrowing without repayment','Destroying unused money'],'Saving sets aside money for later needs and goals.'],
['Economic Development','What is a budget?','A plan for expected income and expenditure',['A list of family names','A national flag','A type of tax receipt only'],'A budget helps people plan how money will be received and spent.'],
['Economic Development','What is inflation?','A sustained rise in the general price level',['A fall in every price','An increase in rainfall','A decrease in population'],'Inflation means the general level of prices rises over time.'],
['Economic Development','Why is vocational training important?','It develops practical skills for work',['It prevents people learning trades','It removes the need for practice','It guarantees instant wealth'],'Vocational training builds job-related knowledge and practical competence.'],
['Transport and Communication','Which transport mode is usually most suitable for moving heavy goods over long distances by sea?','Water transport',['Walking','Bicycle transport','Motorcycle transport'],'Ships can carry large quantities of goods over long distances.'],
['Transport and Communication','What is one benefit of good roads in rural areas?','Improved access to markets and services',['Greater isolation','Longer travel times in all cases','Reduced access to schools'],'Roads connect communities with markets, schools and health facilities.'],
['Transport and Communication','What is mass communication?','Sending information to large audiences',['Whispering to one person','Writing a private diary','A one-to-one conversation only'],'Mass communication reaches many people through media such as radio, television and newspapers.'],
['Transport and Communication','Which is an example of digital communication?','Email',['A handwritten note only','A smoke signal','A printed poster only'],'Email sends messages electronically over computer networks.'],
['Transport and Communication','Why should road users obey traffic signs?','To improve safety and organise movement',['To increase road accidents','To block emergency vehicles','To ignore pedestrian crossings'],'Traffic signs communicate rules and warnings that help prevent collisions.'],
['Global Connections','What is international trade?','Exchange of goods and services between countries',['Trade within one classroom only','A local family meeting','A school sports event'],'International trade involves buying and selling across national borders.'],
['Global Connections','What is an import?','A good or service brought into a country',['A product sold abroad','A locally grown crop only','A tax paid to a district assembly'],'Imports are goods and services purchased from other countries.'],
['Global Connections','What is an export?','A good or service sold to another country',['A product bought from abroad','A local household expense','A school rule'],'Exports are goods and services supplied to foreign markets.'],
['Global Connections','What is the main purpose of the United Nations?','To promote international cooperation and peace',['To govern every country directly','To replace all national courts','To control every local assembly'],'The UN works on peace, security, development, human rights and cooperation.'],
['Global Connections','What does regional integration encourage?','Cooperation among neighbouring countries',['Closing every border permanently','Ending all cultural exchange','Stopping regional trade'],'Regional integration supports cooperation in trade, security and development.'],
['Disaster Preparedness','What should a community do before a likely flood?','Keep drains clear and follow official warnings',['Dump refuse into waterways','Build temporary barriers that block drains','Ignore evacuation advice'],'Drain maintenance and attention to warnings can reduce flood risk.'],
['Disaster Preparedness','Which organisation coordinates disaster management in Ghana?','National Disaster Management Organisation (NADMO)',['Ghana Library Authority','Electoral Commission','Ghana Tourism Authority'],'NADMO coordinates disaster prevention, preparedness, response and recovery.'],
['Disaster Preparedness','What is an early warning system used for?','Alerting people to possible hazards before they occur',['Recording only past events','Replacing emergency services','Creating hazards'],'Warnings give communities time to prepare and take protective action.'],
['Disaster Preparedness','Which item is useful in a basic emergency kit?','Torch and spare batteries',['Broken glass','Unlabelled chemicals','Spoiled food'],'A torch and batteries provide light during power cuts or emergencies.'],
['Community Development','What is community participation?','Residents taking part in decisions and activities that affect them',['Outsiders making every decision','Residents avoiding meetings','Keeping information secret from everyone'],'Participation helps communities identify needs and take ownership of projects.'],
['Community Development','Why should a community project have a maintenance plan?','To keep the project useful after construction',['To stop people using it','To avoid assigning responsibility','To spend the budget immediately'],'Maintenance protects the investment and keeps facilities working.'],
['Community Development','What is volunteerism?','Offering time or skills to help without expecting payment',['Demanding wages for every favour','Avoiding public service','Destroying community property'],'Volunteers contribute time and skills for community benefit.'],
['Community Development','Which is an example of a public good?','Street lighting provided for community use',['A private phone','A personal pair of shoes','A family photograph'],'Public goods benefit many people and are generally provided for shared use.'],
['Ghana History','On what date does Ghana celebrate Independence Day?','6 March',['1 July','25 May','31 December'],'Ghana gained independence on 6 March 1957.'],
['Ghana History','Who became Ghana’s first President?','Dr Kwame Nkrumah',['J. B. Danquah','Kofi Abrefa Busia','Edward Akufo-Addo'],'Dr Kwame Nkrumah became Ghana’s first President after independence.'],
['Ghana and Citizenship','What is the capital city of Ghana?','Accra',['Kumasi','Tamale','Cape Coast'],'Accra is the capital city of Ghana.'],
['Ghana and Citizenship','What is the currency of Ghana?','Ghana cedi',['Naira','Dalasi','CFA franc'],'The Ghana cedi is the country’s official currency.'],
['Ghana and Citizenship','Which document is the supreme law of Ghana?','The 1992 Constitution',['A district timetable','A party manifesto','A school handbook'],'The 1992 Constitution is the supreme law of Ghana.'],
['Ghana and Citizenship','Which arm of government makes laws in Ghana?','Parliament',['The Judiciary','The Police Service','The Electoral Commission'],'Parliament is the legislative arm of government.'],
['Ghana and Citizenship','How many administrative regions does Ghana have?','16',['10','12','20'],'Ghana is divided into 16 administrative regions.'],
['Ghana and Citizenship','Which colours appear on Ghana’s national flag?','Red, gold, green and black',['Blue, white, red and yellow','Green, white and blue','Black, orange and purple'],'Ghana’s flag has red, gold and green stripes with a black star.'],
['Map Skills','What does a map scale show?','The relationship between map distance and real ground distance',['The age of a map','The number of roads only','The height of a mountain only'],'A map scale helps convert a measured map distance into a real distance.'],
['Map Skills','Which instrument is used to show direction on a map?','Compass',['Thermometer','Rain gauge','Stopwatch'],'A compass helps identify direction, such as north, south, east and west.'],
['Map Skills','What does a map key or legend explain?','The meaning of symbols used on the map',['The price of the map','The date of every journey','The number of map readers'],'A map key explains what the signs and symbols represent.'],
['International Organisations','What does ECOWAS stand for?','Economic Community of West African States',['East Coast Organisation of World Agriculture','European Council of West African Schools','Economic Committee of World Aid Services'],'ECOWAS is a regional organisation that promotes cooperation among West African states.'],
['International Organisations','Where is the headquarters of the United Nations?','New York City',['Accra','London','Nairobi'],'The United Nations headquarters is in New York City.'],
['Environment and Sustainability','Which of these is a renewable source of energy?','Solar energy',['Coal','Petrol','Diesel'],'Solar energy is renewable because sunlight is naturally replenished.'],
['Community Development','Why is accountability important in public service?','It requires officials to explain and take responsibility for decisions',['It hides public spending','It prevents citizens asking questions','It removes records'],'Accountability helps ensure public resources and authority are used responsibly.']
].map(r=>[r[0],r[1],r[2],r[3],r[4]]);
if(socialExtras.length!==100)throw Error('Social extras count '+socialExtras.length);
addExtraBank('social','soc',socialExtras,101);


const artsConcepts = [
['Elements of Art','Which element is the path made by a moving point?','Which element can show direction and outline in a drawing?','Line',['Texture','Colour','Form'],'A line is a mark with length and direction.'],
['Elements of Art','Which element describes how a surface feels or appears to feel?','Which element may look rough, smooth, soft or coarse?','Texture',['Space','Shape','Tone'],'Texture describes the surface quality of an artwork.'],
['Elements of Art','Which element refers to lightness and darkness?','Which element helps an artist show shadows and highlights?','Value (tone)',['Pattern','Movement','Proportion'],'Value describes how light or dark an area appears.'],
['Elements of Art','Which element is a flat enclosed area?','Which element can be geometric or organic and is two-dimensional?','Shape',['Form','Texture','Space'],'A shape is a two-dimensional enclosed area.'],
['Elements of Art','Which element describes three-dimensional volume?','Which element gives an object the appearance of a cube or sphere?','Form',['Line','Pattern','Space'],'Form describes three-dimensional volume.'],
['Elements of Art','What is the area around, between or within objects in an artwork?','Which element helps create depth and distance in a composition?','Space',['Tone','Rhythm','Texture'],'Space refers to areas around, between and within forms.'],
['Colour Theory','Which is a primary colour in the traditional RYB model?','Which colour cannot be made by mixing other RYB primary colours?','Yellow',['Green','Orange','Purple'],'Red, yellow and blue are primary colours in the traditional RYB model.'],
['Colour Theory','What colour results from mixing red and yellow paint?','Which secondary colour is made from red plus yellow?','Orange',['Green','Violet','Blue'],'Red and yellow mix to make orange.'],
['Colour Theory','What colour results from mixing blue and yellow paint?','Which secondary colour is made from blue plus yellow?','Green',['Orange','Violet','Red'],'Blue and yellow mix to make green.'],
['Colour Theory','What colour results from mixing red and blue paint?','Which secondary colour is made from red plus blue?','Violet',['Green','Orange','Yellow'],'Red and blue mix to make violet or purple.'],
['Colour Theory','Which group contains warm colours?','Which colours are commonly associated with heat and fire?','Red, orange and yellow',['Blue, green and violet','Black, white and grey','Blue, black and white'],'Reds, oranges and yellows are commonly described as warm colours.'],
['Colour Theory','Which group contains cool colours?','Which colours are commonly associated with water and coolness?','Blue, green and violet',['Red, orange and yellow','Brown, orange and red','Yellow, orange and white'],'Blues, greens and violets are commonly described as cool colours.'],
['Colour Theory','What is a tint?','What do you call a colour made lighter by adding white?','A colour mixed with white',['A colour mixed with black','A colour mixed with its complement','A colour with no pigment'],'Adding white makes a tint lighter.'],
['Colour Theory','What is a shade in colour theory?','What do you call a colour made darker by adding black?','A colour mixed with black',['A colour mixed with white','A colour mixed with water only','A colour with added texture'],'Adding black makes a shade darker.'],
['Colour Theory','What is a monochromatic colour scheme?','Which colour scheme uses one hue with different lightness levels?','Different values of one hue',['Only opposite colours','Every colour in equal amounts','Only primary colours'],'Monochromatic schemes use one hue with variations in value.'],
['Principles of Design','Which principle creates equal visual weight on both sides of a design?','Which principle helps a composition feel stable and evenly arranged?','Balance',['Contrast','Emphasis','Texture'],'Balance distributes visual weight in a stable way.'],
['Principles of Design','Which principle makes one part of an artwork stand out?','Which principle directs attention to a focal point?','Emphasis',['Unity','Pattern','Proportion'],'Emphasis makes an area or object attract attention.'],
['Principles of Design','Which principle refers to the size relationship between parts?','Which principle helps elements look correctly related in size?','Proportion',['Rhythm','Texture','Contrast'],'Proportion concerns the size relationship between parts.'],
['Principles of Design','Which principle creates visual difference between elements?','Which principle can use light and dark to make forms stand out?','Contrast',['Unity','Repetition','Harmony'],'Contrast uses differences to create interest and clarity.'],
['Principles of Design','Which principle makes different parts of an artwork feel connected?','Which principle gives a composition a sense of wholeness?','Unity',['Distortion','Isolation','Randomness'],'Unity creates a sense that the parts belong together.'],
['Drawing','Which tool is suitable for light preliminary drawing lines?','Which pencil grade is commonly used for general sketching?','HB pencil',['Permanent marker','Chisel','Paint roller'],'An HB pencil makes moderate marks that can be adjusted or erased.'],
['Drawing','What is shading used for in drawing?','Which technique helps show light, shadow and volume?','Shading',['Weaving','Measuring sound','Cutting paper'],'Shading helps represent depth, form and the direction of light.'],
['Drawing','What is a still life drawing?','Which drawing shows arranged objects such as fruit or bottles?','A drawing of arranged inanimate objects',['A moving dance','A map of a country','A portrait of a crowd'],'Still life focuses on inanimate objects.'],
['Drawing','What is a portrait?','Which artwork represents a particular person?','An artwork representing a person',['A landscape map','A repeated pattern','A picture of buildings only'],'A portrait represents a person.'],
['Drawing','Which technique uses small dots to build tone?','What is the name of drawing with carefully placed dots?','Stippling',['Blending','Collage','Carving'],'Stippling creates tone and texture through dots.'],
['Drawing','What is a landscape artwork mainly about?','Which artwork represents scenery such as hills, rivers and sky?','Scenery such as land, sky and natural features',['A person’s face only','A bowl of fruit only','A machine part only'],'Landscape art represents outdoor scenery.'],
['Drawing','What is the foreground in a picture?','Which part of a composition appears nearest to the viewer?','The part that appears nearest to the viewer',['The part farthest away','The title below the image','The frame around the picture'],'The foreground is the front area of a composition.'],
['Drawing','What is perspective used to create?','Which drawing method gives a flat picture an illusion of depth?','An illusion of depth on a flat surface',['A stronger glue','A brighter sound','A thicker sheet of paper'],'Perspective represents three-dimensional space on a flat surface.'],
['Textiles','What is weaving?','Which process interlaces warp and weft yarns to make fabric?','Interlacing two sets of yarns at right angles',['Joining paper with glue','Shaping clay on a wheel','Carving wood'],'Weaving interlaces warp and weft yarns to make cloth.'],
['Textiles','What are warp threads?','Which threads run lengthwise and are held under tension on a loom?','Threads running lengthwise on a loom',['Threads running across the fabric','Loose stuffing fibres','Decorative beads'],'Warp threads run lengthwise on a loom.'],
['Textiles','What are weft threads?','Which threads pass across the warp during weaving?','Threads woven across the warp',['Threads running lengthwise only','The frame of a loom','A type of dye'],'Weft threads pass across the warp.'],
['Textiles','What is tie-dye?','Which process ties sections of cloth before dyeing to make patterns?','A method of tying fabric before dyeing',['A method of carving wood','A way of joining metal','A type of paper folding'],'Tied sections resist dye and create patterns.'],
['Textiles','What is batik traditionally made with?','Which textile process uses wax to resist dye?','Wax and dye on fabric',['Chalk on stone','Clay and sawdust','Metal wire and glass'],'Wax resists dye in selected areas to form patterns.'],
['Textiles','What is embroidery?','Which technique decorates fabric using needle and thread?','Decorating fabric with stitches',['Printing a photograph','Making a clay pot','Weaving a basket'],'Embroidery uses stitches to decorate fabric.'],
['Textiles','What is a garment pattern?','Which template guides the cutting of fabric pieces before sewing?','A template used to cut fabric pieces',['A finished button','A sewing machine motor','A type of dye'],'A pattern guides cutting fabric pieces for a garment.'],
['Textiles','What is seam allowance?','What is the extra fabric between a cut edge and stitching line?','Extra fabric left beside a seam for stitching',['The width of a button','The length of a zip','The colour of thread'],'Seam allowance is the fabric left for stitching.'],
['Crafts','Which material is commonly used for modelling pottery?','Which material can be shaped while moist and hardened by firing?','Clay',['Cotton thread','Glass paper','Cardboard only'],'Clay can be shaped while moist and hardened by firing.'],
['Crafts','What is a sculpture?','Which art form has physical three-dimensional form?','A three-dimensional artwork',['A flat written essay','A sound recording','A two-dimensional graph'],'Sculpture has physical form and can be viewed from different directions.'],
['Crafts','Which process removes material from wood to create a form?','Which technique shapes wood by cutting away unwanted parts?','Carving',['Weaving','Dyeing','Stitching'],'Carving shapes wood by removing material.'],
['Crafts','What is papier-mâché made from?','Which craft material combines paper with paste or glue?','Paper pieces or pulp mixed with adhesive',['Metal filings and oil','Clay and glass','Wool and wax'],'Papier-mâché uses paper and adhesive to build shapes.'],
['Crafts','What is casting in sculpture?','Which process pours material into a mould to form an object?','Pouring a material into a mould',['Drawing with a ruler','Joining fabric with thread','Printing a design'],'Casting forms objects in a mould.'],
['Music','What is rhythm in music?','Which musical feature organises sounds and silences in time?','The pattern of sounds and silences in time',['The loudness only','The colour of an instrument','The shape of a stage'],'Rhythm organises musical sounds and silences through time.'],
['Music','What is tempo?','Which musical term describes how fast or slow a piece is played?','The speed of a piece of music',['The pitch of the highest note','The size of an instrument','The words of a song'],'Tempo describes the speed of music.'],
['Music','What is pitch?','Which feature tells whether a sound is high or low?','How high or low a sound is',['How long a song lasts','How loudly people clap','How large a drum is'],'Pitch describes the perceived highness or lowness of a sound.'],
['Music','What do dynamics refer to in music?','Which musical feature indicates loud and soft performance?','Variations in loudness',['The number of performers','The colour of costumes','The length of a stage'],'Dynamics indicate how loudly or softly music is performed.'],
['Music','Which instrument belongs to the percussion family?','Which instrument produces sound when its surface is struck?','Drum',['Flute','Trumpet','Violin'],'A drum is a percussion instrument.'],
['Dance and Drama','What is choreography?','Which activity plans and arranges movements for a dance?','The planned arrangement of dance movements',['The painting of scenery','The tuning of a drum','The sewing of costumes'],'Choreography organises movements into a dance.'],
['Dance and Drama','What is a dance formation?','Which term describes how dancers are positioned in a group?','The arrangement of dancers in space',['The colour of stage lights','The sound of a drum','The name of a teacher'],'Formation describes dancers’ positions relative to one another.'],
['Dance and Drama','What is improvisation in dance?','Which approach creates movements spontaneously?','Creating movements spontaneously',['Repeating only a fixed script','Repairing a stage','Painting a backdrop'],'Improvisation involves creating movement in the moment.'],
['Dance and Drama','What is a script?','Which written document contains dialogue and directions for a play?','The written text and directions for a play',['A stage light','A costume rack','A ticket list'],'A script contains dialogue and often performance directions.'],
['Dance and Drama','What is dialogue?','What is the spoken conversation between characters called?','Conversation between characters',['A silent costume change','A stage curtain','A lighting effect'],'Dialogue is the spoken exchange between characters.']
];
const artsExtras=[];
artsConcepts.slice(0,50).forEach((r,i)=>{
  artsExtras.push([r[0],r[1],r[3],r[4],r[5]]);
  artsExtras.push([r[0],r[2],r[3],[r[4][2],r[4][1],r[4][0]],r[5]]);
});
if(artsExtras.length!==100)throw Error('Arts extras count '+artsExtras.length);
addExtraBank('arts','art',artsExtras,101);


const rmeConcepts = [
['Christianity','Which book begins the Christian Bible?','Which book tells the biblical creation account?','Genesis',['Exodus','Psalms','Revelation'],'Genesis is the first book of the Bible and begins with the creation account.'],
['Christianity','Who led the Israelites out of Egypt according to the Bible?','Who received the Ten Commandments on Mount Sinai?','Moses',['David','Solomon','Peter'],'Moses led the Israelites out of Egypt and received the commandments.'],
['Christianity','In which town was Jesus born?','Which town is traditionally identified as Jesus’ birthplace?','Bethlehem',['Nazareth','Jerusalem','Jericho'],'The Gospel accounts identify Bethlehem as the place of Jesus’ birth.'],
['Christianity','Who baptised Jesus?','Which prophet baptised Jesus in the River Jordan?','John the Baptist',['John the Apostle','Peter','Paul'],'John the Baptist baptised Jesus in the River Jordan.'],
['Christianity','What is the central message of the parable of the Good Samaritan?','Which value is shown by helping a stranger in need?','Love and compassion for one’s neighbour',['Greed','Pride','Revenge'],'The parable teaches practical love and care for others, including strangers.'],
['Christianity','Which Christian festival celebrates the resurrection of Jesus?','Which festival marks the belief that Jesus rose from the dead?','Easter',['Christmas','Pentecost','Good Friday'],'Easter celebrates the resurrection of Jesus.'],
['Christianity','Which Christian festival celebrates the birth of Jesus?','At which festival do Christians remember the nativity of Jesus?','Christmas',['Easter','Lent','Ascension Day'],'Christmas commemorates the birth of Jesus.'],
['Christianity','What is the name of the prayer Jesus taught his disciples?','Which prayer begins with words addressing “Our Father”?','The Lord’s Prayer',['The Magnificat','The Shema','The Hajj prayer'],'The Lord’s Prayer is recorded in the Gospels as a prayer Jesus taught.'],
['Christianity','Who betrayed Jesus to the authorities?','Which disciple identified Jesus to the arresting party?','Judas Iscariot',['Thomas','Andrew','Matthew'],'Judas Iscariot betrayed Jesus.'],
['Christianity','What happened at Pentecost in the New Testament?','Which event is associated with the coming of the Holy Spirit upon the disciples?','The Holy Spirit came upon the disciples',['Jesus was born','Moses crossed the sea','The temple was built'],'Pentecost recalls the coming of the Holy Spirit to the disciples.'],
['Christianity','Which Christian practice uses water as a sign of entry into the faith?','Which ceremony symbolises cleansing and belonging to the Christian community?','Baptism',['Communion','Pilgrimage','Fasting'],'Baptism uses water as a sign of faith and entry into the Christian community.'],
['Christianity','What is the main purpose of Holy Communion?','Which Christian practice remembers Jesus’ Last Supper?','To remember Jesus through bread and wine or their equivalents',['To celebrate harvest only','To mark a wedding','To appoint a king'],'Holy Communion commemorates the Last Supper and Jesus’ sacrifice.'],
['Christianity','Which disciple is traditionally associated with denying Jesus three times?','Who denied knowing Jesus before the rooster crowed?','Peter',['John','James','Philip'],'Peter denied Jesus three times, as described in the Gospel accounts.'],
['Christianity','What is a Gospel?','Which part of the New Testament tells about Jesus’ life and teachings?','An account of Jesus’ life and teachings',['A list of Roman laws','A book of farming rules','A record of temple taxes'],'The four Gospels present accounts of Jesus’ life, ministry, death and resurrection.'],
['Christianity','What does forgiveness mean in Christian teaching?','Which response means releasing resentment and choosing not to seek revenge?','Forgiving someone who has done wrong',['Taking revenge','Spreading gossip','Refusing reconciliation forever'],'Forgiveness encourages mercy and the possibility of reconciliation.'],
['Islam','What is the holy book of Islam?','Which scripture do Muslims believe was revealed to Prophet Muhammad?','The Qur’an',['The Torah','The Bible','The Vedas'],'Muslims regard the Qur’an as the revealed word of God.'],
['Islam','What is the name of the Islamic declaration of faith?','Which of the Five Pillars states that there is no god but Allah and Muhammad is His messenger?','Shahada',['Zakat','Sawm','Hajj'],'The Shahada is the declaration of faith and the first pillar of Islam.'],
['Islam','How many times a day are Muslims required to perform the formal prayers?','What is the daily number of obligatory Salah prayers?','Five',['Two','Three','Seven'],'The five daily prayers are Fajr, Dhuhr, Asr, Maghrib and Isha.'],
['Islam','What is Zakat?','Which pillar involves giving obligatory charity to eligible people?','Giving prescribed charity',['Daily prayer','Fasting','Pilgrimage'],'Zakat is obligatory giving intended to support eligible people and social welfare.'],
['Islam','During which month do Muslims fast from dawn to sunset?','Which Islamic month is associated with the annual obligatory fast?','Ramadan',['Muharram','Shawwal','Safar'],'Muslims who are able fast during Ramadan from dawn until sunset.'],
['Islam','What is Sawm?','Which Islamic pillar refers to fasting?','Fasting',['Charity','Pilgrimage','Declaration of faith'],'Sawm is fasting, especially the obligatory fast during Ramadan.'],
['Islam','What is Hajj?','Which pillar requires a pilgrimage to Makkah for those able to perform it?','Pilgrimage to Makkah',['Daily prayer','Charity','Fasting'],'Hajj is the pilgrimage to Makkah, required once in a lifetime for those able.'],
['Islam','What is the name of the direction Muslims face during Salah?','Towards which sacred site do Muslims face when praying?','The Kaaba in Makkah',['Mount Sinai','The River Jordan','The city of Medina only'],'Muslims face the direction of the Kaaba, known as the Qiblah.'],
['Islam','What is Wudu?','Which act of washing is performed before many Muslim prayers?','Ritual washing before prayer',['A charity payment','The pilgrimage itself','The Friday sermon'],'Wudu is the ritual purification performed before prayer when required.'],
['Islam','What is the festival celebrated at the end of Ramadan?','Which Muslim celebration follows the month of fasting?','Eid al-Fitr',['Eid al-Adha','Mawlid','Ashura'],'Eid al-Fitr marks the end of Ramadan.'],
['Islam','What does halal mean?','Which word describes what is permitted under Islamic law?','Permitted or lawful',['Forbidden','Doubtful only','Unclean in every case'],'Halal refers to what is permitted under Islamic teachings.'],
['Islam','What is the name of the weekly congregational prayer day in Islam?','On which day do Muslims gather for the special Jumu’ah prayer?','Friday',['Monday','Wednesday','Sunday'],'Jumu’ah is the congregational Friday prayer.'],
['Islam','Which angel is traditionally associated with delivering revelation to Prophet Muhammad?','Who conveyed the Qur’anic revelation according to Islamic belief?','Angel Jibril (Gabriel)',['Angel Mikail','Angel Israfil','Angel Malik'],'Jibril is associated with bringing revelation to the prophets.'],
['African Traditional Religion','What is the role of ancestors in many African traditional religious beliefs?','Which group is often remembered and respected as part of family spiritual heritage?','Ancestors',['Foreign traders','Newborn children only','Unrelated visitors'],'Ancestors are honoured as members of the lineage who remain significant in family and community life.'],
['African Traditional Religion','What is libation?','Which traditional practice pours a drink as an invocation or offering?','Pouring a liquid in a ritual offering',['A harvest dance only','A naming cloth','A form of weaving'],'Libation may be used to honour ancestors or invoke spiritual presence.'],
['African Traditional Religion','What is the role of a traditional priest or priestess?','Who may lead rituals and serve as an intermediary in a traditional religious setting?','A traditional priest or priestess',['A market porter','A court clerk','A sports coach'],'Traditional priests and priestesses lead rituals and serve particular spiritual roles.'],
['African Traditional Religion','What is a shrine?','Which place is set aside for worship or communication with a deity or spirit?','A sacred place for worship',['A public bus station','A school library','A market stall'],'A shrine is a sacred place associated with worship or spiritual practices.'],
['African Traditional Religion','Why are taboos important in some traditional communities?','What helps guide behaviour by identifying actions that are forbidden?','Taboos',['Advertisements','Fashion trends','Sports rules only'],'Taboos set boundaries for conduct and may protect social, moral or environmental values.'],
['African Traditional Religion','What is the purpose of a naming ceremony?','Which ceremony formally welcomes a child and gives the child a name?','To introduce and name a child',['To select a chief only','To celebrate a harvest','To settle a land dispute'],'Naming ceremonies welcome a child into the family and community.'],
['African Traditional Religion','What is a rite of passage?','Which term describes a ceremony marking a major stage in life?','A ceremony marking a life transition',['A daily market activity','A type of farming tool','A tax payment'],'Rites of passage mark transitions such as birth, adulthood, marriage and death.'],
['African Traditional Religion','Why are oral traditions important?','How are many community histories and values passed between generations?','Through stories, proverbs and spoken accounts',['Only through computer games','By avoiding communication','Only through imported textbooks'],'Oral traditions preserve history, values and knowledge through spoken transmission.'],
['Moral Values','Which value means telling the truth?','Which quality involves being truthful and sincere?','Honesty',['Greed','Jealousy','Laziness'],'Honesty means speaking truthfully and acting without deception.'],
['Moral Values','Which value means treating people fairly?','Which quality requires giving people what is right and impartial?','Justice',['Pride','Dishonesty','Selfishness'],'Justice involves fairness and impartial treatment.'],
['Moral Values','What does integrity mean?','Which quality means doing what is right even when nobody is watching?','Integrity',['Carelessness','Dishonesty','Greed'],'Integrity means consistently following sound moral principles.'],
['Moral Values','Which value is shown by keeping a promise?','What quality involves being dependable and keeping commitments?','Trustworthiness',['Envy','Arrogance','Cruelty'],'Trustworthiness helps people rely on one another.'],
['Moral Values','What is empathy?','Which quality means trying to understand another person’s feelings?','Empathy',['Pride','Revenge','Greed'],'Empathy is understanding or sharing another person’s feelings.'],
['Moral Values','Which action demonstrates respect for elders?','How can a young person show courtesy to older people?','Listening politely and speaking courteously',['Insulting them','Destroying their property','Ignoring every request'],'Respect is shown through courtesy, listening and considerate behaviour.'],
['Moral Values','What is self-discipline?','Which quality helps a person control actions and work towards a goal?','Self-discipline',['Carelessness','Dishonesty','Wastefulness'],'Self-discipline means managing behaviour and effort responsibly.'],
['Moral Values','Why is forgiveness important in society?','Which value can help restore relationships after wrongdoing?','Forgiveness',['Revenge','Rumour spreading','Intolerance'],'Forgiveness can reduce resentment and support peaceful relationships.']
];
const rmeExtras=[];
rmeConcepts.slice(0,43).forEach(r=>{
 rmeExtras.push([r[0],r[1],r[3],r[4],r[5]]);
 rmeExtras.push([r[0],r[2],r[3],[r[4][2],r[4][1],r[4][0]],r[5]]);
});
if(rmeExtras.length!==86)throw Error('RME extras count '+rmeExtras.length);
addExtraBank('rme','rme',rmeExtras,115);


const scienceConcepts = [
['Cells and Life','What is the basic structural and functional unit of life?','Which smallest living unit carries out life processes?','The cell',['The organ','The tissue','The organ system'],'A cell is the basic structural and functional unit of living organisms.'],
['Cells and Life','Which cell structure controls most activities of the cell?','Which structure contains genetic material and acts as the cell control centre?','Nucleus',['Cell wall','Vacuole','Cytoplasm'],'The nucleus contains genetic material and helps control cell activities.'],
['Cells and Life','Which cell part controls substances entering and leaving the cell?','Which structure forms the selectively permeable boundary of a cell?','Cell membrane',['Cell wall','Nucleus','Chloroplast'],'The cell membrane regulates movement of substances into and out of the cell.'],
['Cells and Life','Where do many chemical reactions take place in a cell?','Which jelly-like material fills much of the cell?','Cytoplasm',['Cell wall','Chlorophyll','Cell membrane'],'The cytoplasm contains structures and is the site of many cell reactions.'],
['Cells and Life','Which structure gives plant cells extra support and protection?','Which rigid outer layer is made mainly of cellulose?','Cell wall',['Cell membrane','Nucleus','Ribosome'],'The cellulose cell wall supports and protects plant cells.'],
['Cells and Life','Which organelle contains chlorophyll?','Where does photosynthesis take place in green plant cells?','Chloroplast',['Mitochondrion','Nucleus','Vacuole'],'Chloroplasts contain chlorophyll, which absorbs light for photosynthesis.'],
['Cells and Life','Which structure stores cell sap in a typical plant cell?','Which large space helps keep a plant cell firm?','Vacuole',['Nucleus','Cell membrane','Chloroplast'],'The large permanent vacuole contains cell sap and helps maintain turgidity.'],
['Cells and Life','What is a tissue?','What do we call a group of similar cells working together?','A group of similar cells performing a function',['A group of organs','A single organism','A group of unrelated ecosystems'],'A tissue is made of similar cells that work together for a particular function.'],
['Cells and Life','What is an organ?','Which level of organisation is made from different tissues working together?','A structure made of different tissues working together',['A single cell','A population','A habitat'],'An organ contains different tissues that work together to perform a function.'],
['Cells and Life','Which life process removes metabolic waste from an organism?','What is the removal of waste products made by cells called?','Excretion',['Nutrition','Reproduction','Growth'],'Excretion removes metabolic waste products from the body.'],
['Cells and Life','Which life process releases energy from food in cells?','What process makes energy available from food substances?','Respiration',['Photosynthesis','Transpiration','Pollination'],'Respiration releases energy from food in living cells.'],
['Cells and Life','Which life process involves detecting and responding to changes?','What is the ability to respond to a stimulus called?','Sensitivity',['Excretion','Nutrition','Reproduction'],'Sensitivity allows organisms to detect and respond to stimuli.'],
['Plants','Which part of a flowering plant absorbs water and mineral salts?','Which plant organ anchors the plant and takes up water from soil?','Root',['Flower','Fruit','Leaf'],'Roots absorb water and minerals and help anchor the plant.'],
['Plants','Which tiny structures on roots increase the surface area for absorption?','What are the fine extensions that help roots absorb water?','Root hairs',['Stomata','Petals','Pollen grains'],'Root hairs increase the surface area available for absorbing water and mineral salts.'],
['Plants','Which plant organ mainly makes food by photosynthesis?','Where are most chloroplasts found in a typical green plant?','Leaf',['Root','Flower','Seed'],'Leaves contain many chloroplasts and are the main photosynthetic organs.'],
['Plants','Which tiny openings allow gas exchange in leaves?','What are the pores on leaf surfaces called?','Stomata',['Root hairs','Veins','Anthers'],'Stomata allow carbon dioxide, oxygen and water vapour to move in and out.'],
['Plants','Which cells control the opening and closing of stomata?','What are the specialised cells surrounding each stoma called?','Guard cells',['Root cells','Palisade cells only','Xylem vessels'],'Guard cells change shape to regulate the stomatal opening.'],
['Plants','Which tissue transports water from roots to other parts of a plant?','Which plant tissue carries water and dissolved minerals upward?','Xylem',['Phloem','Epidermis','Cortex'],'Xylem transports water and mineral salts from roots through the plant.'],
['Plants','Which tissue transports sugars made during photosynthesis?','Which plant tissue distributes manufactured food around the plant?','Phloem',['Xylem','Cork','Root cap'],'Phloem transports sugars and other organic substances around the plant.'],
['Plants','What is pollination?','What is the transfer of pollen from anther to stigma called?','Transfer of pollen from anther to stigma',['Fusion of an egg and sperm','Germination of a seed','Dispersal of fruits'],'Pollination is the transfer of pollen grains from anther to stigma.'],
['Plants','What is germination?','What process begins when a viable seed starts to grow?','The sprouting of a seed',['The formation of pollen','The ripening of a fruit','The loss of water from leaves'],'Germination is the resumption of growth of an embryo in a seed.'],
['Plants','Which conditions are generally needed for seed germination?','What does a viable seed usually need to begin germinating?','Water, oxygen and suitable warmth',['Bright light only','Fertiliser and soil only','Carbon dioxide and darkness only'],'Seeds generally need moisture, oxygen and a suitable temperature to germinate.'],
['Human Body','Which organ pumps blood around the body?','Which muscular organ drives circulation?','Heart',['Lung','Kidney','Stomach'],'The heart pumps blood through the circulatory system.'],
['Human Body','Which blood vessels carry blood away from the heart?','What type of vessel takes blood from the heart to body tissues?','Arteries',['Veins','Capillaries','Lymph vessels'],'Arteries carry blood away from the heart.'],
['Human Body','Which blood vessels return blood to the heart?','What type of vessel carries blood towards the heart?','Veins',['Arteries','Capillaries','Air passages'],'Veins return blood to the heart.'],
['Human Body','Which blood cells help defend the body against infection?','Which blood cells are part of the immune defence system?','White blood cells',['Red blood cells','Platelets','Plasma only'],'White blood cells help protect the body against pathogens.'],
['Human Body','Which blood component helps transport oxygen?','Which cells contain haemoglobin for oxygen transport?','Red blood cells',['White blood cells','Platelets','Nerve cells'],'Red blood cells contain haemoglobin, which binds and transports oxygen.'],
['Human Body','Which blood component helps blood clot?','Which small cell fragments help reduce blood loss after injury?','Platelets',['Red blood cells','White blood cells','Plasma proteins only'],'Platelets help form clots that limit bleeding.'],
['Human Body','Where does most digestion of food and absorption of nutrients occur?','Which part of the digestive tract has villi for nutrient absorption?','Small intestine',['Large intestine','Oesophagus','Mouth'],'The small intestine completes much digestion and absorbs most nutrients.'],
['Human Body','What is the main function of the large intestine?','Which organ absorbs much of the remaining water from undigested food?','Absorption of water and formation of faeces',['Pumping blood','Producing bile','Exchanging oxygen'],'The large intestine absorbs water and helps form faeces.'],
['Human Body','Which organ produces bile?','Where is bile made before it is stored in the gall bladder?','Liver',['Pancreas','Stomach','Kidney'],'The liver produces bile, which helps emulsify fats.'],
['Human Body','Which organ produces insulin?','Which organ helps regulate blood glucose by releasing insulin?','Pancreas',['Liver','Lung','Spleen'],'The pancreas produces insulin, which helps regulate blood glucose.'],
['Human Body','Which organs filter blood and produce urine?','Where are wastes and excess water removed from blood to form urine?','Kidneys',['Lungs','Heart','Stomach'],'The kidneys filter blood and produce urine.'],
['Human Body','Which organs exchange oxygen and carbon dioxide with the air?','Where does gaseous exchange take place in the respiratory system?','Lungs',['Kidneys','Liver','Small intestine'],'The lungs contain alveoli where gases are exchanged between air and blood.'],
['Human Body','Which muscle helps air enter and leave the lungs?','What sheet of muscle separates the chest cavity from the abdomen?','Diaphragm',['Biceps','Triceps','Heart wall'],'The diaphragm contracts and relaxes to change the volume of the chest cavity.'],
['Human Body','Which part of the nervous system carries messages between the brain and body?','Which structure runs through the backbone and connects with nerves?','Spinal cord',['Oesophagus','Windpipe','Aorta'],'The spinal cord carries nerve impulses between the brain and the body.'],
['Human Body','Which nutrient is mainly needed for growth and repair of tissues?','Which food nutrient supplies amino acids for body building?','Protein',['Carbohydrate','Fat','Water'],'Proteins supply amino acids used for growth and tissue repair.'],
['Human Body','Which nutrient is the body’s main quick source of energy?','Which nutrient is broken down to provide much of the body’s immediate energy?','Carbohydrate',['Protein','Mineral salts','Water'],'Carbohydrates are an important source of energy.'],
['Human Body','Which vitamin helps the body absorb calcium and maintain healthy bones?','Which vitamin can be made in the skin with sunlight exposure?','Vitamin D',['Vitamin C','Vitamin B12','Vitamin K'],'Vitamin D helps the body absorb calcium and supports bone health.'],
['Human Body','Which disease is caused by a lack of vitamin C?','What deficiency disease can result from too little vitamin C?','Scurvy',['Rickets','Goitre','Night blindness'],'Vitamin C deficiency can cause scurvy.'],
['Human Body','Which mineral is needed to make haemoglobin?','Which mineral deficiency can lead to anaemia?','Iron',['Iodine','Calcium','Sodium'],'Iron is needed to make haemoglobin in red blood cells.'],
['Human Body','What is the main function of vaccines?','How do vaccines help protect people from certain infectious diseases?','They stimulate the immune system to develop protection',['They digest food','They replace all white blood cells','They kill every microbe in the body'],'Vaccines train the immune system to recognise specific pathogens.'],
['Human Body','Which practice helps prevent the spread of cholera?','What is an important way to reduce transmission of water-borne diseases?','Safe water, sanitation and handwashing',['Sharing unwashed eating utensils','Drinking untreated water','Open defecation'],'Safe water, sanitation and handwashing interrupt cholera transmission.'],
['Matter','What is matter?','Which term describes anything that has mass and occupies space?','Matter',['Energy','Light only','Sound only'],'Matter has mass and occupies space.'],
['Matter','Which state of matter has a fixed shape and fixed volume?','In which state are particles closely packed in fixed positions?','Solid',['Liquid','Gas','Plasma only'],'A solid has a definite shape and volume.'],
['Matter','Which state has a fixed volume but takes the shape of its container?','Which state has particles that can move past one another while remaining close?','Liquid',['Solid','Gas','Vacuum'],'A liquid has a fixed volume but no fixed shape.'],
['Matter','Which state spreads to fill the entire container?','In which state are particles far apart and move freely?','Gas',['Solid','Liquid','Crystal only'],'A gas has no fixed shape or volume and expands to fill its container.'],
['Matter','What is melting?','Which change of state turns a solid into a liquid?','Solid changing into liquid',['Liquid changing into gas','Gas changing into liquid','Liquid changing into solid'],'Melting occurs when a solid gains enough energy to become a liquid.'],
['Matter','What is condensation?','Which change of state turns water vapour into liquid water?','Gas changing into liquid',['Solid changing into liquid','Liquid changing into gas','Liquid changing into solid'],'Condensation occurs when a gas cools and becomes a liquid.'],
['Matter','What is evaporation?','Which process changes liquid into gas at the surface?','Liquid changing into gas',['Gas changing into liquid','Solid changing into liquid','Liquid changing into solid'],'Evaporation occurs when particles escape from the surface of a liquid.'],
['Matter','Which method separates insoluble sand from water?','What technique uses filter paper to trap solid particles?','Filtration',['Distillation','Magnetism','Chromatography'],'Filtration separates an insoluble solid from a liquid.'],
['Matter','Which method can obtain pure water from salt solution?','Which separation method involves evaporation followed by condensation?','Distillation',['Sieving','Hand picking','Magnetic separation'],'Distillation collects water vapour after it condenses, leaving most dissolved salt behind.'],
['Matter','What is a mixture?','Which term describes substances physically combined but not chemically bonded?','A physical combination of substances',['A single pure element','A new chemical compound only','A single atom'],'Mixtures contain substances that retain their properties and can often be separated physically.'],
['Matter','What does an acid do to blue litmus paper?','Which litmus change is a common test for an acid?','Turns it red',['Turns it green','Leaves it blue always','Turns it black'],'Acids turn blue litmus paper red.'],
['Matter','What does an alkali do to red litmus paper?','Which litmus change is a common test for an alkali?','Turns it blue',['Turns it yellow','Leaves it red always','Turns it black'],'Alkalis turn red litmus paper blue.'],
['Matter','Which particle has a negative electrical charge?','Which subatomic particle is negatively charged?','Electron',['Proton','Neutron','Nucleus'],'Electrons carry a negative charge.'],
['Matter','Which particle has a positive electrical charge?','Which subatomic particle is positively charged?','Proton',['Electron','Neutron','Photon'],'Protons carry a positive charge.'],
['Energy and Forces','What is the SI unit of force?','In which unit is force measured?','Newton',['Joule','Watt','Pascal'],'The SI unit of force is the newton (N).'],
['Energy and Forces','What is friction?','Which force opposes relative motion between surfaces in contact?','A force that opposes motion between surfaces',['A force that always speeds objects up','A force that acts only in air','A force that produces light'],'Friction acts against relative motion or the tendency of surfaces to move.'],
['Energy and Forces','What is speed?','Which quantity tells how much distance is travelled per unit time?','Distance travelled per unit time',['Mass multiplied by volume','Force per unit area','Energy stored in a body'],'Speed is calculated by dividing distance by time.'],
['Energy and Forces','A vehicle travels 100 km in 2 hours. What is its average speed?','What speed is obtained by dividing 100 km by 2 hours?','50 km/h',['25 km/h','100 km/h','200 km/h'],'Average speed = distance ÷ time = 100 ÷ 2 = 50 km/h.'],
['Energy and Forces','Which form of energy is associated with motion?','What is the name of the energy a moving object possesses?','Kinetic energy',['Chemical energy','Sound energy','Nuclear energy'],'Kinetic energy is the energy of motion.'],
['Energy and Forces','Which energy is stored because of an object’s height?','What form of energy does a raised object possess due to gravity?','Gravitational potential energy',['Sound energy','Electrical energy','Light energy'],'A raised object stores gravitational potential energy.'],
['Energy and Forces','Which simple machine is a seesaw?','What type of lever is commonly represented by a seesaw?','Lever',['Pulley','Screw','Inclined plane'],'A seesaw is a lever that turns around a fulcrum.'],
['Energy and Forces','What is the pivot of a lever called?','Which fixed turning point supports a lever?','Fulcrum',['Load','Effort','Pulley'],'The fulcrum is the fixed point about which a lever turns.'],
['Energy and Forces','Which material is a good electrical conductor?','Which material allows electric charge to flow easily?','Copper',['Rubber','Plastic','Dry wood'],'Copper is a good conductor and is widely used in electrical wiring.'],
['Energy and Forces','Which material is a good electrical insulator?','Which material resists the flow of electric current?','Rubber',['Copper','Aluminium','Iron'],'Rubber is an electrical insulator.'],
['Energy and Forces','What is needed for a simple electric circuit to work?','What must be present for current to flow around a basic circuit?','A complete conducting path and a source of electrical energy',['A broken wire only','An open switch only','A plastic loop with no cell'],'A working circuit needs a closed conducting path and an energy source.'],
['Energy and Forces','What happens when a switch opens a simple circuit?','Why does a lamp go off when the circuit switch is opened?','The circuit path is broken',['The battery becomes larger','The wire becomes a magnet','The bulb stores more energy'],'An open switch breaks the path so current cannot flow.'],
['Energy and Forces','What is sound produced by?','What physical action usually creates sound?','Vibrations',['Freezing','Melting','Evaporation'],'Sound is produced by vibrating objects.'],
['Energy and Forces','How does light usually travel in a uniform transparent medium?','What is the usual path of a light ray through a uniform medium?','In straight lines',['In circles','Only upwards','In random zigzags'],'Light travels in straight lines through a uniform medium.'],
['Energy and Forces','What is reflection of light?','Which process causes light to bounce off a surface?','Bouncing of light from a surface',['Bending of light into a new medium','Splitting white light into colours','Absorption of all light'],'Reflection occurs when light bounces from a surface.'],
['Earth and Space','What causes day and night on Earth?','Which movement makes different parts of Earth face the Sun at different times?','Earth’s rotation on its axis',['Earth’s revolution around the Sun','The Moon’s revolution','The movement of clouds'],'Earth rotates on its axis, producing day and night.'],
['Earth and Space','What causes the seasons in many parts of the world?','Which combination is mainly responsible for seasonal changes?','Earth’s axial tilt as it revolves around the Sun',['The Moon’s phases','Daily cloud movement','The Earth’s daily rotation alone'],'Earth’s tilted axis and its revolution around the Sun cause seasonal changes.'],
['Earth and Space','Which is the outermost solid layer of Earth?','What is the thin rocky surface layer of Earth called?','Crust',['Inner core','Outer core','Mantle'],'The crust is Earth’s outermost solid layer.'],
['Earth and Space','What is weather?','Which term describes atmospheric conditions over a short period?','The condition of the atmosphere at a place and time',['The average climate over centuries','The structure of the Earth','The movement of tectonic plates'],'Weather describes short-term atmospheric conditions.'],
['Earth and Space','Which instrument measures rainfall?','What is used to collect and measure the amount of rain?','Rain gauge',['Barometer','Thermometer','Wind vane'],'A rain gauge measures the amount of precipitation.'],
['Earth and Space','Which instrument measures air temperature?','What instrument is used to measure how hot or cold the air is?','Thermometer',['Anemometer','Rain gauge','Wind vane'],'A thermometer measures temperature.'],
['Earth and Space','Which instrument shows wind direction?','What weather instrument points in the direction from which wind blows?','Wind vane',['Barometer','Rain gauge','Hygrometer'],'A wind vane indicates wind direction.'],
['Earth and Space','Which instrument measures wind speed?','What instrument is used to measure how fast the wind blows?','Anemometer',['Thermometer','Wind vane','Rain gauge'],'An anemometer measures wind speed.'],
['Environment and Agriculture','Which organism breaks down dead plants and animals?','Which group returns nutrients to the environment by decomposing dead matter?','Decomposers',['Producers','Herbivores','Predators'],'Decomposers such as bacteria and fungi break down dead organic matter.'],
['Environment and Agriculture','Which organisms are producers in most land food chains?','Which organisms make their own food using light energy?','Green plants',['Carnivores','Fungi only','Herbivores'],'Green plants make food through photosynthesis and form the producer level.'],
['Environment and Agriculture','What do arrows in a food chain show?','In a food chain, what does an arrow point towards?','The direction of energy transfer',['The direction of rainfall','The age of organisms','The size of each organism'],'Arrows point from the organism eaten to the organism receiving energy.'],
['Environment and Agriculture','Which soil type usually drains water most quickly?','Which soil has relatively large particles and large air spaces?','Sandy soil',['Clay soil','Peaty soil','Heavy clay loam'],'Sandy soil has large particles and usually drains quickly.'],
['Environment and Agriculture','Which soil type generally retains the most water?','Which soil has very fine particles and poor drainage?','Clayey soil',['Sandy soil','Gravel','Coarse sand'],'Clay has very small particles and generally retains more water.'],
['Environment and Agriculture','Why are legumes useful in crop rotation?','How can leguminous crops improve soil nitrogen?','Root-nodule bacteria fix atmospheric nitrogen',['They remove all nitrogen','They prevent all rainfall','They turn soil into sand'],'Nitrogen-fixing bacteria in root nodules convert atmospheric nitrogen into usable compounds.'],
['Environment and Agriculture','Which farming practice helps reduce soil erosion?','What should farmers plant to protect bare soil from heavy rain?','Cover crops',['Leaving soil bare','Removing all vegetation','Burning all plant cover'],'Cover crops protect the soil surface and roots hold soil particles together.'],
['Environment and Agriculture','What is compost?','Which material is produced by decomposing organic waste for use as manure?','Decayed organic matter',['Plastic fragments','Pure sand','Metal filings'],'Compost is decomposed organic material that can improve soil.'],
['Scientific Skills','Which instrument measures the temperature of a liquid?','What should be used to measure how hot or cold a sample is?','Thermometer',['Metre rule','Stopwatch','Measuring cylinder'],'A thermometer measures temperature.'],
['Scientific Skills','Which instrument measures the volume of a liquid?','What laboratory equipment has graduations for reading liquid volume?','Measuring cylinder',['Thermometer','Balance','Stopwatch'],'A measuring cylinder is used to measure liquid volume.'],
['Scientific Skills','Which instrument measures mass?','What instrument is used to find the mass of an object?','Balance',['Metre rule','Thermometer','Stopwatch'],'A balance measures mass.'],
['Scientific Skills','Why should an experiment be repeated?','What improves confidence that a result is reliable?','Repeating measurements',['Changing the question halfway','Ignoring observations','Using damaged equipment'],'Repeats help identify unusual results and check consistency.'],
['Scientific Skills','What is a hypothesis?','Which term describes a testable prediction or proposed explanation?','A testable prediction',['A final conclusion without evidence','A random measurement','A list of apparatus only'],'A hypothesis is a proposed explanation or prediction that can be tested.'],
['Scientific Skills','What is the independent variable in an experiment?','Which variable is deliberately changed by the investigator?','The variable that is changed',['The variable that is measured','A factor kept constant','The final conclusion'],'The independent variable is the factor deliberately changed.'],
['Scientific Skills','What is the dependent variable?','Which variable is measured to see the effect of a change?','The variable that is measured',['The factor deliberately changed','A factor kept constant','The title of the experiment'],'The dependent variable is measured as the outcome.'],
['Scientific Skills','Why should safety goggles be worn in some experiments?','What do safety goggles protect during practical science work?','The eyes',['The shoes','The notebook','The table'],'Safety goggles protect the eyes from splashes and flying particles.'],
['Scientific Skills','Why should chemicals never be tasted in a laboratory?','What is the safe rule for identifying an unknown laboratory chemical?','Never taste it; follow the teacher’s instructions and safety labels',['Taste a tiny amount','Mix it with food','Smell it directly from the container'],'Chemicals may be harmful; use approved labels and safe identification methods.']
];
const scienceExtras=[];
scienceConcepts.slice(0,87).forEach(r=>{
 scienceExtras.push([r[0],r[1],r[3],r[4],r[5]]);
 scienceExtras.push([r[0],r[2],r[3],[r[4][2],r[4][1],r[4][0]],r[5]]);
});
if(scienceExtras.length!==174)throw Error('Science extras count '+scienceExtras.length);
addExtraBank('integratedScience','sci',scienceExtras,27);


/* ================= Beginner French question bank =================
   80 everyday vocabulary items tested in both directions (160 Qs),
   plus 20 easy grammar patterns (40 Qs) = 200 questions.
*/
questionsDB.french = [];
const frenchVocabGroups = [
['Greetings',[
['bonjour','hello / good morning'],['salut','hi'],['bonsoir','good evening'],['bonne nuit','good night'],['au revoir','goodbye'],['à bientôt','see you soon'],['merci','thank you'],['de rien','you are welcome'],["s’il vous plaît",'please'],['pardon','sorry / excuse me']
]],
['Numbers 0–9',[
['zéro','zero'],['un','one'],['deux','two'],['trois','three'],['quatre','four'],['cinq','five'],['six','six'],['sept','seven'],['huit','eight'],['neuf','nine']
]],
['Colours',[
['rouge','red'],['bleu','blue'],['vert','green'],['jaune','yellow'],['noir','black'],['blanc','white'],['rose','pink'],['orange','orange']
]],
['Family',[
['mère','mother'],['père','father'],['frère','brother'],['sœur','sister'],['grand-mère','grandmother'],['grand-père','grandfather'],['famille','family'],['ami','friend']
]],
['School words',[
['école','school'],['professeur','teacher'],['élève','pupil'],['livre','book'],['stylo','pen'],['crayon','pencil'],['cahier','exercise book'],['table','table'],['chaise','chair'],['sac','bag']
]],
['Food and drink',[
['pain','bread'],['eau','water'],['lait','milk'],['riz','rice'],['pomme','apple'],['banane','banana'],['poisson','fish'],['poulet','chicken'],['sucre','sugar'],['jus','juice']
]],
['Days of the week',[
['lundi','Monday'],['mardi','Tuesday'],['mercredi','Wednesday'],['jeudi','Thursday'],['vendredi','Friday'],['samedi','Saturday'],['dimanche','Sunday']
]],
['Months',[
['janvier','January'],['février','February'],['mars','March'],['avril','April'],['mai','May'],['juin','June'],['juillet','July'],['août','August'],['septembre','September'],['octobre','October'],['novembre','November'],['décembre','December']
]],
['Weather',[
['soleil','sun / sunshine'],['pluie','rain'],['vent','wind'],['chaud','hot'],['froid','cold']
]]
];
const frenchExtras = [];
frenchVocabGroups.forEach(([topic, words]) => words.forEach(([fr,en], i) => {
  const alternatives = [1,2,3].map(step => words[(i+step)%words.length]);
  frenchExtras.push([topic, 'What does “'+fr+'” mean in English?', en, alternatives.map(x=>x[1]),
    '“'+fr+'” means “'+en+'”. Learn the word in small groups and say it aloud.',
    'Match the French word to its English meaning.']);
  frenchExtras.push([topic, 'Which French word means “'+en+'”?', fr, alternatives.map(x=>x[0]),
    'The French word for “'+en+'” is “'+fr+'”.',
    'Look at the English meaning and choose its French word.']);
}));
const frenchGrammar = [
['Pronouns',"Which French pronoun means “I”?",'je',['tu','il','nous'],'“Je” means “I”.','Complete the sentence: ___ suis élève.','je',['tu','il','vous'],'Use “je” when talking about yourself.'],
['Pronouns',"Which French pronoun means “you” when speaking to one friend?",'tu',['je','il','elle'],'“Tu” is the informal word for “you” when speaking to one person.','Complete: ___ es mon ami.','tu',['je','nous','ils'],'“Tu” is used when speaking to a friend or someone familiar.'],
['Pronouns',"Which French pronoun means “he”?",'il',['elle','je','nous'],'“Il” means “he”.','Complete: ___ est un garçon.','il',['elle','tu','vous'],'Use “il” when talking about a boy or man.'],
['Pronouns',"Which French pronoun means “she”?",'elle',['il','je','tu'],'“Elle” means “she”.','Complete: ___ est une fille.','elle',['il','nous','vous'],'Use “elle” when talking about a girl or woman.'],
['Pronouns',"Which French pronoun means “we”?",'nous',['vous','ils','je'],'“Nous” means “we”.','Complete: ___ sommes élèves.','nous',['je','tu','elles'],'Use “nous” when talking about yourself and other people.'],
['Pronouns',"Which French pronoun can mean polite “you” or “you all”?",'vous',['tu','je','il'],'“Vous” is used for more than one person or as a polite form of “you”.','Complete: ___ êtes professeur.','vous',['tu','je','elle'],'Use “vous” for a group or to show politeness.'],
['Pronouns',"Which French pronoun means “they” for a masculine or mixed group?",'ils',['elles','nous','vous'],'“Ils” means “they” for a masculine or mixed group.','Complete: ___ sont amis.','ils',['elles','il','tu'],'Use “ils” for a group of boys or a mixed group.'],
['Pronouns',"Which French pronoun means “they” for a group of girls or women?",'elles',['ils','nous','vous'],'“Elles” means “they” for a feminine group.','Complete: ___ sont amies.','elles',['ils','elle','je'],'Use “elles” for a group made up of girls or women.'],
['Common verbs',"Which French verb means “to be”?",'être',['avoir','aller','faire'],'“Être” means “to be”.','Complete: “Je veux ___ gentil” (“I want to be kind”).','être',['avoir','faire','aller'],'The basic meaning of “être” is “to be”.'],
['Common verbs',"Which French verb means “to have”?",'avoir',['être','aller','parler'],'“Avoir” means “to have”.','Complete: “Je veux ___ un livre” (“I want to have a book”).','avoir',['être','faire','venir'],'The basic meaning of “avoir” is “to have”.'],
['Simple sentences',"How do you say “I am” in French?",'je suis',['tu es','il est',"j’ai"],'“Je suis” means “I am”.','Complete: “Je ___ élève.”','suis',['es','est','ai'],'With “je”, the verb “être” becomes “suis”.'],
['Simple sentences',"How do you say “you are” (one friend) in French?",'tu es',['je suis','il est','nous sommes'],'“Tu es” means “you are” when speaking to one friend.','Complete: “Tu ___ gentil.”','es',['suis','est','sommes'],'With “tu”, the verb “être” becomes “es”.'],
['Simple sentences',"How do you say “he is” in French?",'il est',['elle est','je suis','tu es'],'“Il est” means “he is”.','Complete: “Il ___ grand.”','est',['suis','es','êtes'],'With “il” or “elle”, “être” becomes “est”.'],
['Simple sentences',"How do you say “I have” in French?",'j’ai',['tu as','il a','nous avons'],'“J’ai” means “I have”.','Complete: “J’___ un stylo.”','ai',['as','a','avons'],'With “je”, “avoir” becomes “ai”; “je” shortens to “j’” before a vowel sound.'],
['Simple sentences',"How do you say “you have” (one friend) in French?",'tu as',['j’ai','il a','nous avons'],'“Tu as” means “you have”.','Complete: “Tu ___ un livre.”','as',['ai','a','avons'],'With “tu”, the verb “avoir” becomes “as”.'],
['Simple sentences',"What does “c’est” mean in English?",'it is / this is',['I have','you are','goodbye'],'“C’est” commonly means “it is” or “this is”.','Which French phrase means “It is”?','c’est',['j’ai','tu es','au revoir'],'“C’est” is a useful simple phrase for naming or identifying something.'],
['Articles',"Which French word is an indefinite article for a masculine singular noun?",'un',['une','la','les'],'“Un” is used before many masculine singular nouns.','Complete: “___ livre” means “a book”.','un',['une','la','des'],'“Livre” is masculine, so “un livre” means “a book”.'],
['Articles',"Which French word is an indefinite article for a feminine singular noun?",'une',['un','le','les'],'“Une” is used before many feminine singular nouns.','Complete: “___ pomme” means “an apple”.','une',['un','le','des'],'“Pomme” is feminine, so “une pomme” means “an apple”.'],
['Articles',"Which French word means “the” before a masculine singular noun?",'le',['la','une','des'],'“Le” is the masculine singular word for “the”.','Which phrase means “the book”?','le livre',['la livre','une livre','les livre'],'“Le livre” means “the book”; “livre” is masculine.'],
['Questions',"Which French question word means “where”?",'où',['quand','qui','pourquoi'],'“Où” means “where”.','Which word asks about a place?','où',['qui','quand','comment'],'Use “où” to ask where someone or something is.']
];
frenchGrammar.forEach(r => {
  frenchExtras.push([r[0],r[1],r[2],r[3],r[4],'Choose the simple French form and compare it with the English meaning.']);
  frenchExtras.push([r[0],r[5],r[6],r[7],r[8],'Read the whole short sentence, then choose the missing word.']);
});
if (frenchExtras.length !== 200) throw Error('French question bank must contain 200 questions: '+frenchExtras.length);
addExtraBank('french','fre',frenchExtras,1);

const questionIndex = new Map();
for (const subject of ['social', 'arts', 'maths', 'computing', 'rme', 'integratedScience', 'french']) for (const q of questionsDB[subject]) questionIndex.set(q.id, { ...q, subject });

const bus = new EventTarget();
const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));

/* ======================= Toasts & confirm ======================= */
function toast(message, tone = 'info') {
  const item = el('div', `toast toast-${tone}`, message);
  $('toasts').append(item);
  requestAnimationFrame(() => item.classList.add('is-in'));
  setTimeout(() => {
    item.classList.remove('is-in');
    item.classList.add('is-out');
    setTimeout(() => item.remove(), 260);
  }, 3200);
}
function confirmDialog(title, copy, okLabel = 'Leave', cancelLabel = 'Stay') {
  const dialog = $('confirm-dialog');
  $('confirm-title').textContent = title;
  $('confirm-copy').textContent = copy;
  $('confirm-ok').textContent = okLabel;
  $('confirm-cancel').textContent = cancelLabel;
  return new Promise(resolve => {
    const done = value => { dialog.close(); cleanup(); resolve(value); };
    const ok = () => done(true), cancel = () => done(false);
    const onCancel = e => { e.preventDefault(); done(false); };
    function cleanup() {
      $('confirm-ok').removeEventListener('click', ok);
      $('confirm-cancel').removeEventListener('click', cancel);
      dialog.removeEventListener('cancel', onCancel);
    }
    $('confirm-ok').addEventListener('click', ok);
    $('confirm-cancel').addEventListener('click', cancel);
    dialog.addEventListener('cancel', onCancel);
    dialog.showModal();
    $('confirm-cancel').focus();
  });
}

/* Close custom overlays gracefully without delaying their functional cleanup. */
function dismissOverlay(node, afterRemove) {
  const onRemoved = typeof afterRemove === 'function' ? afterRemove : null;
  if (!node || !node.isConnected) {
    if (onRemoved) onRemoved();
    return;
  }
  if (node.classList.contains('motion-overlay-closing')) return;

  let finished = false;
  let timer = 0;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (timer) clearTimeout(timer);
    node.removeEventListener('transitionend', onTransitionEnd);
    if (node.isConnected) node.remove();
    if (onRemoved) onRemoved();
  };
  const onTransitionEnd = event => {
    if (event.target === node && event.propertyName === 'opacity') finish();
  };
  const reduceMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    finish();
    return;
  }

  node.addEventListener('transitionend', onTransitionEnd);
  node.classList.add('motion-overlay-closing');
  // Fallback for browsers that do not dispatch transitionend for a removed
  // or backgrounded overlay. CSS exit timing is 165–190ms.
  timer = setTimeout(finish, 280);
}

/* ======================= Router ======================= */
const SCREENS = ['home', 'notes', 'setup', 'quiz', 'friends', 'admin', 'achievements', 'duels', 'shop', 'me'];
const ROUTES = { '': 'home', home: 'home', notes: 'notes', practice: 'setup', quiz: 'quiz', essays: 'notes', friends: 'friends', admin: 'admin', achievements: 'achievements', duels: 'duels', shop: 'shop', gemshop: 'shop', me: 'me' };
const PATH_FOR = { home: '', setup: 'practice' };
let currentScreen = null;

// Some sandboxed previews never fire `hashchange` (or block the URL update),
// so navigation records the target itself and renders directly.
let forcedHash = null;
const currentHash = () => (forcedHash !== null ? forcedHash : location.hash);
function setHash(hash, replace) {
  forcedHash = hash;
  try { history[replace ? 'replaceState' : 'pushState'](null, '', hash); } catch (e) { /* URL can't change here; forcedHash carries the route */ }
}
function routeFromHash() {
  const hash = currentHash();
  if (!hash || hash === '#') return 'home';
  if (!hash.startsWith('#/')) return null; // in-page anchors and Identity callback tokens
  return ROUTES[hash.slice(2).split(/[?/]/)[0]] || 'home';
}
function navigate(screen, { replace = false } = {}) {
  const hash = `#/${PATH_FOR[screen] ?? screen}`;
  if (currentHash() === hash || (screen === 'home' && !currentHash())) { render(screen); return; }
  setHash(hash, replace);
  if (replace) render(screen); else onRouteChange();
}
async function onRouteChange() {
  const target = routeFromHash();
  if (!target) { if (!currentScreen) render('home'); return; }
  if (currentScreen === 'quiz' && target !== 'quiz' && Quiz.inProgress()) {
    setHash('#/quiz', true);
    const leave = await confirmDialog('Leave this session?', 'Your answers so far will be lost and the session won’t be scored.', 'Leave session', 'Keep going');
    if (!leave) return;
    Quiz.abort();
    navigate(target);
    return;
  }
  render(target);
}
function render(screen) {
  if (screen === 'quiz' && !Quiz.active) screen = 'setup';
  if (screen !== 'quiz' && currentScreen === 'quiz') Quiz.abort();
  const changed = screen !== currentScreen;
  const screenNode = $(`screen-${screen}`);
  if (changed) {
    screenNode.classList.remove('motion-screen-major');
    void screenNode.offsetWidth;
    screenNode.classList.add('motion-screen-major');
    if (screen === 'home') {
      const hero = screenNode.querySelector('.hero');
      if (hero) {
        hero.classList.remove('motion-home-hero-enter');
        void hero.offsetWidth;
        hero.classList.add('motion-home-hero-enter');
      }
    }
  }
  SCREENS.forEach(name => { $(`screen-${name}`).hidden = name !== screen; });
  document.body.dataset.screen = screen;
  const navKey = screen === 'setup' || screen === 'quiz' ? 'practice' : screen;
  document.querySelectorAll('[data-nav]').forEach(link => {
    const active = link.dataset.nav === navKey;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  currentScreen = screen;
  if (screen === 'home') Home.render();
  if (screen === 'notes') {
    const essayView = /(?:[?&])view=essays(?:&|$)/.test(currentHash()) || /^#\/essays(?:[?#]|$)/.test(currentHash());
    $('notes-content').hidden = essayView;
    $('notes-essay-view').hidden = !essayView;
    document.querySelectorAll('[data-notes-view]').forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.notesView === (essayView ? 'essays' : 'notes'))));
    // Switch the visible panel before running either renderer, so a renderer error
    // can never leave the selected tab showing the previous panel.
    if (essayView) Essays.enter();
    else Notes.enter();
  }
  if (screen === 'setup') Setup.enter();
  if (screen === 'shop') window.Shop?.selectTab(currentHash().startsWith('#/gemshop') ? 'gems' : 'coins');
  if (screen === 'admin') { window.renderFriends?.(); window.Adm?.sync?.(); }
  if (screen === 'achievements') window.renderAchievements?.();
  if (changed) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const heading = $(`screen-${screen}`).querySelector('h1, h2');
    if (heading && document.activeElement !== document.body) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
  emit('screen', screen);
}
window.addEventListener('hashchange', () => { if (forcedHash === location.hash) return; forcedHash = null; onRouteChange(); });

// Notes / Essays are an in-page switch. Handle them before the general route-link handler.
document.addEventListener('click', event => {
  const tab = event.target.closest('[data-notes-view]');
  if (!tab) return;
  event.preventDefault();
  const essayView = tab.dataset.notesView === 'essays';
  const hash = essayView ? '#/notes?view=essays' : '#/notes';
  setHash(hash, false);

  // Notes and Essays share one screen. Toggle the panels directly instead of
  // re-entering Notes (which was preventing the essay panel from appearing).
  $('notes-content').hidden = essayView;
  $('notes-essay-view').hidden = !essayView;
  document.querySelectorAll('[data-notes-view]').forEach(item =>
    item.setAttribute('aria-selected', String(item.dataset.notesView === (essayView ? 'essays' : 'notes')))
  );
  if (essayView) Essays.enter();
  else Notes.enter();
});

// Give the protected staff destination its own capture-phase route handler.
// This runs before other click handlers can swallow the Owner/Admin navigation.
document.addEventListener('click', event => {
  const target = event.target;
  const link = target && typeof target.closest === 'function'
    ? target.closest('a[data-admin-nav][href="#/admin"]')
    : null;
  if (!link || link.hidden) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  navigate('admin');
}, true);

// Route links (#/notes, #/essays...) navigate directly instead of relying on hashchange.
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#/"]');
  if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  const hash = link.getAttribute('href');
  if (hash === currentHash()) { onRouteChange(); return; }
  setHash(hash, false);
  onRouteChange();
});

// In-page anchors (e.g. #daily-card) scroll smoothly without touching the route.
document.addEventListener('click', event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (href.startsWith('#/') || href === '#') return;
  const target = document.querySelector(href);
  if (!target) return;
  event.preventDefault();
  if (currentScreen !== 'home' && $('screen-home').contains(target)) navigate('home');
  requestAnimationFrame(() => target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }));
});

/* ======================= Local progress ======================= */
let bookmarks = store.get('bece_bookmarks', []).filter(id => questionIndex.has(id));
const saveBookmarks = () => store.set('bece_bookmarks', bookmarks);
let studied = new Set(store.get('bece_studied', []));

function saveHistory(entry) {
  const history = store.get('bece_history', []);
  history.unshift({ ...entry, time: new Date().toISOString() });
  store.set('bece_history', history.slice(0, 20));
}
function formatWhen(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (days < 1 && new Date().getDate() === date.getDate()) return `Today, ${time}`;
  if (days < 2) return `Yesterday, ${time}`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/* ======================= Home ======================= */
const Home = {
  render() {
    $('bank-meta').textContent = `${Object.keys(questionsDB).length} subjects · ${questionIndex.size} questions`;
    document.querySelectorAll('#screen-home [data-count]').forEach(node => {
      const subject = node.dataset.count;
      const bank = questionsDB[subject] || [];
      const topics = new Set(bank.map(q => q.topic)).size;
      node.textContent = `${bank.length} questions · ${topics} topics`;
    });
    $('saved-count').textContent = bookmarks.length
      ? `${plural(bookmarks.length, 'question')} ready to practise`
      : 'Bookmark tricky questions to revisit';

    window.renderAchievements?.();

    const history = store.get('bece_history', []);
    const snapshot = $('my-snapshot');
    snapshot.replaceChildren();
    if (history.length || studied.size || bookmarks.length) {
      const avg = history.length ? Math.round(history.reduce((s, h) => s + (h.pct || 0), 0) / history.length) : null;
      const best = history.length ? Math.max(...history.map(h => h.pct || 0)) : null;
      const tile = (value, label) => { const t = el('div', 'snap-tile'); t.append(el('strong', '', value), el('span', '', label)); return t; };
      const totalNotes = Object.values(notesDB).reduce((n, list) => n + list.length, 0);
      snapshot.append(
        tile(String(history.length), history.length === 1 ? 'recent session' : 'recent sessions'),
        tile(avg === null ? '—' : `${avg}%`, 'average score'),
        tile(best === null ? '—' : `${best}%`, 'best score'),
        tile(`${studied.size}/${totalNotes}`, 'notes studied'),
      );
    }

    const box = $('history-box');
    const list = $('history-list');
    box.hidden = !history.length;
    list.replaceChildren();
    history.slice(0, 6).forEach(h => {
      const item = el('li', 'history-item');
      const tone = h.pct >= 70 ? 'good' : h.pct >= 50 ? 'ok' : 'low';
      const left = el('div');
      left.append(el('strong', '', h.label || SUBJECT_LABEL[h.subject] || 'Practice'), el('span', '', `${h.mode === 'exam' ? 'Timed mock' : h.kind === 'daily' ? 'Daily quiz' : 'Practice'} · ${formatWhen(h.time)}`));
      const right = el('div', `history-score tone-${tone}`);
      right.append(el('strong', '', `${h.pct}%`), el('span', '', `${h.correct}/${h.total}`));
      item.append(left, right);
      list.append(item);
    });
  },
};
document.querySelector('[data-action="clear-history"]').addEventListener('click', async () => {
  if (!(await confirmDialog('Clear your recent practice?', 'This removes the scores saved in this browser. Account EXP is not affected.', 'Clear', 'Cancel'))) return;
  store.remove('bece_history');
  Home.render();
});
document.querySelectorAll('[data-subject]').forEach(card => card.addEventListener('click', () => Setup.open(card.dataset.subject)));
document.querySelector('[data-action="quick-practice"]').addEventListener('click', () => {
  Quiz.start({ pool: questionsDB.social, length: 5, mode: 'practice', label: 'Quick practice · Social Studies', subject: 'social' });
});
$('saved-tool').addEventListener('click', () => {
  if (!bookmarks.length) { toast('Tap the bookmark icon on any quiz question to save it here.'); return; }
  const pool = bookmarks.map(id => questionIndex.get(id)).filter(Boolean);
  const subjects = new Set(pool.map(q => q.subject));
  Quiz.start({ pool, length: 0, mode: 'practice', label: 'Saved questions', subject: subjects.size === 1 ? [...subjects][0] : 'mixed' });
});

/* ======================= Quiz setup ======================= */
const Setup = {
  subject:'social', subjects:['social'], subjectCount:1, length:10, mode:'practice',
  open(subject){if(subject){this.subject=subject;this.subjects=[subject];this.subjectCount=1;this.topic='all';}navigate('setup');},
  enter(){this.renderSubject();},
  selectedCount(){return this.subjectCount==='multiple'?document.querySelectorAll('[data-setup-sub]').length:Number(this.subjectCount);},
  pool(){const selected=this.subjects.length?this.subjects:['social'];const topic=$('topic-sel').value;return selected.flatMap(subject=>(questionsDB[subject]||[]).filter(q=>selected.length>1||topic==='all'||q.topic===topic));},
  renderSubject(){
    const countBox=$('quiz-subject-count');
    if(!countBox.dataset.ready){[1,2,3,4,5,'multiple'].forEach(n=>{const b=el('button','length-option',n==='multiple'?'Multi':String(n));b.type='button';b.dataset.subjectCount=String(n);b.setAttribute('aria-label',n==='multiple'?'Choose multiple subjects':`Choose ${n} ${n===1?'subject':'subjects'}`);b.title=b.getAttribute('aria-label');b.addEventListener('click',()=>{this.subjectCount=n;const max=n==='multiple'?this.subjects.length:Number(n);if(n!=='multiple'&&this.subjects.length>max)this.subjects=this.subjects.slice(0,max);this.paintSubjects();});countBox.append(b);});countBox.dataset.ready='1';}
    this.paintSubjects();
  },
  paintSubjects(){
    const max=this.selectedCount();
    document.querySelectorAll('[data-setup-sub]').forEach(b=>{const selected=this.subjects.includes(b.dataset.setupSub);b.setAttribute('aria-pressed',String(selected));b.disabled=!selected&&this.subjects.length>=max;});
    document.querySelectorAll('[data-subject-count]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.subjectCount===String(this.subjectCount))));
    const valid=this.subjectCount==='multiple'?this.subjects.length>=2:this.subjects.length===max;
    $('quiz-subject-hint').textContent=this.subjectCount==='multiple'?`2 or more · ${this.subjects.length} selected`:`${this.subjects.length}/${max} selected`;
    $('setup-start').disabled=!valid;
    const multi=this.subjects.length>1;$('topic-label').hidden=multi;$('topic-sel').hidden=multi;$('setup-pool').hidden=multi;
    const select=$('topic-sel'),first=this.subjects[0]||'social',counts={};(questionsDB[first]||[]).forEach(q=>{counts[q.topic]=(counts[q.topic]||0)+1;});
    select.replaceChildren(new Option(`All topics (${(questionsDB[first]||[]).length})`,'all'),...Object.keys(counts).sort().map(t=>new Option(`${t} (${counts[t]})`,t)));
    select.value=this.topic&&counts[this.topic]?this.topic:'all';this.update();
  },
  update(){
    this.topic=$('topic-sel').value;const count=this.pool().length;$('setup-pool').textContent=`${plural(count,'question')} available in this selection`;
    const lengths=[5,10,20,40,60,0];if(this.length&&this.length>=count)this.length=0;const box=$('length-buttons');box.replaceChildren();
    lengths.forEach(length=>{if(length&&length>=count)return;const button=el('button','length-option',length?String(length):`All ${count}`);button.type='button';button.setAttribute('aria-pressed',String(length===this.length));button.addEventListener('click',()=>{this.length=length;this.update();});box.append(button);});
    document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.mode===this.mode)));
    const n=Math.min(this.length||count,count),seconds=n*40;
    $('mode-description').textContent=this.mode==='exam'?`Timed mock: ${Math.floor(seconds/60)} min ${seconds%60?`${seconds%60} sec `:''}for ${plural(n,'question')}. Change answers freely; explanations appear when you finish. Hints are off.`:'Practice: no timer. See an explanation after each answer, use a hint when you’re stuck, and work at your own pace.';
  },
  start(){
    const max=this.selectedCount(),valid=this.subjectCount==='multiple'?this.subjects.length>=2:this.subjects.length===max;if(!valid){toast(this.subjectCount==='multiple'?'Please choose at least two subjects.':`Please choose exactly ${max} subjects.`);return;}
    const pool=this.pool(),topic=$('topic-sel').value,label=this.subjects.map(x=>SUBJECT_LABEL[x]||x).join(' + ');
    Quiz.start({pool,length:this.length,mode:this.mode,subject:this.subjects.length===1?this.subjects[0]:'mixed',label:`${label}${this.subjects.length===1&&topic!=='all'?` · ${topic}`:''}`});
  },
};
// Quiz subject clicks are handled once by the final setup controller below.
$('topic-sel').addEventListener('change',()=>Setup.update());
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{
  const changed=Setup.mode!==b.dataset.mode;
  Setup.mode=b.dataset.mode;Setup.update();
  if(changed) replayMotion(b,'motion-setup-mode-selected');
}));
document.querySelector('.mode-grid').addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();
  const next=Setup.mode==='practice'?'exam':'practice';
  const changed=Setup.mode!==next;
  Setup.mode=next;Setup.update();
  const selected=document.querySelector(`[data-mode="${Setup.mode}"]`);
  selected?.focus();
  if(changed) replayMotion(selected,'motion-setup-mode-selected');
});
$('setup-start').addEventListener('click', () => Setup.start());

/* ======================= Quiz ======================= */
const Quiz = {
  active: false,
  finished: false,
  questions: [],
  idx: 0,
  answers: {},
  opts: null,
  score: 0,
  streak: 0,
  deadline: 0,
  timer: null,
  warned: false,
  reviewFilter: 'missed',
  motionQuestion: false,

  start(opts) {
    if (!opts.pool || !opts.pool.length) { toast('There are no questions in this selection yet.'); return; }
    this.opts = { mode: 'practice', kind: 'practice', length: 10, ...opts };
    const count = this.opts.length ? Math.min(this.opts.length, opts.pool.length) : opts.pool.length;
    const picked = this.opts.keepOrder ? opts.pool.slice(0, count) : shuffle(opts.pool).slice(0, count);
    this.questions = picked.map(q => ({ ...q, order: shuffle(q.options.map(o => o.key)) }));
    this.idx = 0;
    this.answers = {};
    this.score = 0;
    this.streak = 0;
    this.finished = false;
    this.active = true;
    this.motionQuestion = true;
    this.warned = false;
    this.stopTimer();
    $('quiz-stage').hidden = false;
    $('results').hidden = true;
    $('exp-result').hidden = true;
    $('submit-check').hidden = true;
    $('session-label').textContent = this.opts.label || SUBJECT_LABEL[this.opts.subject] || 'Practice';
    const exam = this.opts.mode === 'exam';
    $('timer-el').hidden = !exam;
    $('score-pill').hidden = exam;
    $('streak-pill').hidden = exam;
    $('hint-btn').hidden = exam;
    $('question-map').open = window.innerWidth >= 760;
    this.updateStats();
    if (exam) this.startTimer();
    emit('quiz:start', { kind: this.opts.kind });
    if (currentScreen === 'quiz') { window.scrollTo({ top: 0 }); } else navigate('quiz');
    this.render();
    replayMotion($('quiz-bar'), 'motion-quiz-session-bar-enter');
    replayMotion($('quiz-stage'), 'motion-quiz-session-enter');
  },
  inProgress() { return this.active && !this.finished && Object.keys(this.answers).length > 0; },
  abort() { this.stopTimer(); this.active = false; },
  current() { return this.questions[this.idx]; },

  startTimer() {
    this.deadline = Date.now() + this.questions.length * 40000;
    const tick = () => {
      const left = Math.max(0, Math.round((this.deadline - Date.now()) / 1000));
      const timer = $('timer-el');
      timer.textContent = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
      timer.classList.toggle('is-low', left <= 60);
      timer.setAttribute('aria-label', `${Math.floor(left / 60)} minutes ${left % 60} seconds left`);
      if (left <= 60 && !this.warned && this.questions.length > 1) { this.warned = true; toast('One minute left.', 'warn'); }
      if (left <= 0) { this.stopTimer(); this.finish(true); }
    };
    tick();
    this.timer = setInterval(tick, 500);
  },
  stopTimer() { if (this.timer) clearInterval(this.timer); this.timer = null; },
  updateStats() {
    $('score').textContent = this.score;
    $('streak').textContent = this.streak;
  },

  render() {
    const q = this.current();
    if (!q) return;
    const exam = this.opts.mode === 'exam';
    const total = this.questions.length;
    const chosen = this.answers[q.id];
    $('qnum').textContent = this.idx + 1;
    $('qtotal').textContent = total;
    $('pbar').style.transform = `scaleX(${Object.keys(this.answers).length / total})`;
    $('qtopic').textContent = q.topic;
    $('qtxt').textContent = q.question;
    document.querySelectorAll('.q-diagram').forEach(n => n.remove());
    if (q.diagram) { const dg = el('div', 'q-diagram'); dg.innerHTML = q.diagram; $('qtxt').after(dg); }

    const saved = bookmarks.includes(q.id);
    const mark = $('bmark-btn');
    mark.classList.remove('motion-bookmark-saved', 'motion-bookmark-removed');
    mark.setAttribute('aria-pressed', String(saved));
    mark.setAttribute('aria-label', saved ? 'Remove bookmark' : 'Bookmark this question');
    mark.title = saved ? 'Saved — tap to remove' : 'Save for later';

    const opts = $('opts');
    opts.replaceChildren();
    const locked = chosen && !exam;
    q.order.forEach((key, position) => {
      const option = q.options.find(o => o.key === key);
      const button = el('button', 'option');
      button.type = 'button';
      if (this.motionQuestion) button.classList.add('motion-option-enter');
      button.dataset.key = key;
      const letter = el('span', 'option-letter', LETTERS[position]);
      const text = el('span', 'option-text', option.text);
      const status = el('span', 'option-status');
      button.append(letter, text, status);
      if (locked) {
        button.disabled = true;
        if (key === q.correct) { button.classList.add('is-correct'); status.append(icon('check')); button.setAttribute('aria-label', `${LETTERS[position]}. ${option.text} — correct answer`); }
        else if (key === chosen) { button.classList.add('is-wrong'); status.append(icon('x')); button.setAttribute('aria-label', `${LETTERS[position]}. ${option.text} — your answer, incorrect`); }
        else button.classList.add('is-dim');
      } else {
        if (key === chosen) { button.classList.add('is-selected'); button.setAttribute('aria-pressed', 'true'); }
        else button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => this.select(key));
      }
      opts.append(button);
    });

    $('quiz-hint').hidden = true;
    $('quiz-hint').textContent = q.hint || 'Re-read the question and rule out options you know are wrong.';
    $('hint-btn').setAttribute('aria-expanded', 'false');
    $('hint-btn').disabled = Boolean(locked);

    this.renderFeedback(q, locked);
    $('pbtn').disabled = this.idx === 0;
    const last = this.idx === total - 1;
    const nextBtn = $('next-question-btn');
    nextBtn.replaceChildren(document.createTextNode(last ? 'Finish ' : 'Next '), icon(last ? 'check' : 'arrow'));
    nextBtn.classList.toggle('is-ready', Boolean(chosen));
    $('submit-check').hidden = true;
    this.renderMap();
    if (this.motionQuestion) {
      this.motionQuestion = false;
      replayMotion($('qcard'), 'motion-question-enter');
    }
  },
  renderFeedback(q, show) {
    const box = $('expl-box');
    box.hidden = !show;
    if (!show) return;
    const chosen = this.answers[q.id];
    const right = q.options.find(o => o.key === q.correct);
    const selected = q.options.find(o => o.key === chosen);
    const correct = chosen === q.correct;
    box.classList.toggle('is-wrong', !correct);
    $('feedback-title').textContent = correct ? 'That’s right. Here’s why.' : 'A useful mistake. Let’s work through it.';
    $('answer-comparison').textContent = correct ? `Correct answer: ${right.text}` : `You chose “${selected.text}”. The correct answer is “${right.text}”.`;
    $('expl-txt').textContent = q.explanation;
    const more = $('deeper-explanation');
    more.replaceChildren();
    const insight = learningInsights[q.id];
    if (insight) {
      more.append(el('p', 'label', 'Make the distinction'), el('p', '', insight.distinction), el('p', 'label', 'See it in an example'), el('p', '', insight.example));
    }
    const recall = el('details', 'recall-prompt');
    recall.append(el('summary', '', 'Try explaining it without looking'), el('p', '', insight?.recall || `Cover the explanation. Explain why “${right.text}” answers this question, using one idea from the reasoning above.`));
    more.append(recall);
  },
  renderMap() {
    const map = $('question-map-buttons');
    map.replaceChildren();
    const exam = this.opts.mode === 'exam';
    this.questions.forEach((question, index) => {
      const chosen = this.answers[question.id];
      const button = el('button', 'qdot', String(index + 1));
      button.type = 'button';
      if (chosen) button.classList.add(exam ? 'is-answered' : chosen === question.correct ? 'is-right' : 'is-miss');
      if (index === this.idx) button.setAttribute('aria-current', 'step');
      button.setAttribute('aria-label', `Question ${index + 1}, ${chosen ? 'answered' : 'not answered'}${index === this.idx ? ', current' : ''}`);
      button.addEventListener('click', () => this.go(index));
      map.append(button);
    });
    $('answered-count').textContent = `${Object.keys(this.answers).length} of ${this.questions.length} answered`;
  },
  go(index, focus = true) {
    if (index < 0 || index >= this.questions.length) return;
    this.idx = index;
    this.motionQuestion = true;
    this.render();
    if (focus) $('qtxt').focus({ preventScroll: true });
    const card = $('qcard');
    if (card.getBoundingClientRect().top < 60) card.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  },
  select(key) {
    const q = this.current();
    const exam = this.opts.mode === 'exam';
    if (this.answers[q.id] && !exam) return;
    const first = !this.answers[q.id];
    this.answers[q.id] = key;
    if (!exam && first) {
      if (key === q.correct) { this.score += 10; this.streak += 1; } else this.streak = 0;
      this.updateStats();
    }
    this.render();
    if (!exam) {
      // Bring the explanation into view on small screens.
      requestAnimationFrame(() => {
        const box = $('expl-box');
        const rect = box.getBoundingClientRect();
        if (rect.top > window.innerHeight - 120) box.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
      });
      $('next-question-btn').focus({ preventScroll: true });
    }
  },
  toggleHint() {
    if (this.opts.mode === 'exam') return;
    const hint = $('quiz-hint');
    hint.hidden = !hint.hidden;
    $('hint-btn').setAttribute('aria-expanded', String(!hint.hidden));
  },
  next() {
    if (this.idx < this.questions.length - 1) { this.go(this.idx + 1); return; }
    const unanswered = this.questions.filter(q => !this.answers[q.id]).length;
    if (unanswered) {
      $('submit-check-copy').textContent = `${unanswered} ${unanswered === 1 ? 'question is' : 'questions are'} still unanswered. Finish now and they count as incorrect, or go back to the first one.`;
      $('submit-check').hidden = false;
      $('submit-check').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    this.finish();
  },
  prev() { this.go(this.idx - 1); },
  toUnanswered() {
    const index = this.questions.findIndex(q => !this.answers[q.id]);
    if (index >= 0) this.go(index);
  },
  toggleBookmark() {
    const q = this.current();
    const wasSaved = bookmarks.includes(q.id);
    const saved = !wasSaved;
    if (wasSaved) { bookmarks = bookmarks.filter(id => id !== q.id); toast('Removed from saved questions.'); }
    else { bookmarks.push(q.id); toast('Saved. Find it under “Saved questions” on the home page.', 'good'); }
    saveBookmarks();
    this.render();
    const mark = $('bmark-btn');
    replayMotion(mark, saved ? 'motion-bookmark-saved' : 'motion-bookmark-removed');
  },

  finish(timeUp = false) {
    if (!this.active || this.finished) return;
    this.finished = true;
    this.stopTimer();
    const total = this.questions.length;
    const correctQs = this.questions.filter(q => this.answers[q.id] === q.correct);
    const correct = correctQs.length;
    const missed = total - correct;
    const pct = Math.round((correct / total) * 100);

    $('quiz-stage').hidden = true;
    const results = $('results');
    results.classList.remove('motion-results-major');
    void results.offsetWidth;
    results.classList.add('motion-results-major');
    results.hidden = false;
    $('pbar').style.transform = 'scaleX(1)';
    $('score-ring').style.setProperty('--pct', pct);
    $('res-grade').textContent = `${pct}%`;
    $('res-score').textContent = `${correct} / ${total}`;
    $('results-eyebrow').textContent = timeUp ? 'Time is up' : this.opts.kind === 'daily' ? 'Daily quiz complete' : 'Session complete';
    $('results-title').textContent = pct === 100 ? 'Every answer correct!' : pct >= 70 ? 'Strong work.' : pct >= 50 ? 'Good progress.' : 'A little more confident.';
    $('results-message').textContent = (timeUp ? 'Your answers were submitted when the timer ran out. ' : '') + (missed
      ? `${correct} correct, ${missed} to revisit. Start with the weakest topics below, then retry the questions you missed. This is a practice result, not an official BECE grade.`
      : 'Explain the ideas in your own words, then try another topic or a timed session.');
    $('retry-missed').hidden = !missed;

    const breakdown = $('topic-breakdown');
    breakdown.replaceChildren(el('h3', '', 'Where to focus next'));
    const groups = {};
    this.questions.forEach(q => {
      groups[q.topic] ??= { total: 0, correct: 0 };
      groups[q.topic].total++;
      if (this.answers[q.id] === q.correct) groups[q.topic].correct++;
    });
    let topicResultIndex = 0;
    Object.entries(groups).sort(([, a], [, b]) => a.correct / a.total - b.correct / b.total).forEach(([topic, g]) => {
      const row = el('div', 'topic-row motion-results-topic-row-enter');
      row.style.setProperty('--topic-result-index', String(Math.min(topicResultIndex, 6)));
      const meter = el('progress', 'meter');
      meter.max = g.total; meter.value = g.correct;
      meter.setAttribute('aria-label', `${topic}: ${g.correct} of ${g.total} correct`);
      row.append(el('span', '', topic), el('strong', '', `${g.correct}/${g.total}`), meter);
      breakdown.append(row);
      replayMotion(row, 'motion-results-topic-row-enter');
      topicResultIndex++;
    });
    this.reviewFilter = missed ? 'missed' : 'all';
    this.renderReview();

    saveHistory({ subject: this.opts.subject || 'mixed', label: this.opts.label, mode: this.opts.mode, kind: this.opts.kind, correct, total, pct });
    emit('quiz:finished', {
      kind: this.opts.kind,
      questionIds: this.questions.map(q => q.id),
      answers: { ...this.answers },
      correct, total,
    });
    window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
    $('results-title').focus({ preventScroll: true });
  },
  renderReview() {
    document.querySelectorAll('[data-review]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.review === this.reviewFilter)));
    const review = $('res-review');
    review.replaceChildren();
    const items = this.questions.map((q, i) => ({ q, i })).filter(({ q }) => this.reviewFilter === 'all' || this.answers[q.id] !== q.correct);
    if (!items.length) { review.append(el('p', 'muted', 'No mistakes to review. Lovely work!')); return; }
    items.forEach(({ q, i }) => {
      const chosen = q.options.find(o => o.key === this.answers[q.id]);
      const right = q.options.find(o => o.key === q.correct);
      const ok = chosen?.key === q.correct;
      const item = el('details', `review-item ${ok ? 'is-right' : 'is-miss'}`);
      const summary = el('summary');
      const mark = el('span', 'review-mark');
      mark.append(icon(ok ? 'check' : 'x'));
      summary.append(mark, el('span', '', `${i + 1}. ${q.question}`));
      item.append(summary);
      const body = el('div', 'review-body');
      if (!ok) body.append(el('p', 'review-choice', `Your answer: ${chosen ? chosen.text : 'Not answered'}`));
      body.append(el('p', 'review-correct', `Correct answer: ${right.text}`), el('p', '', q.explanation));
      if (learningInsights[q.id]) body.append(el('p', 'muted', learningInsights[q.id].distinction));
      item.append(body);
      review.append(item);
    });
  },
  retryMissed() {
    const missed = this.questions.filter(q => this.answers[q.id] !== q.correct);
    if (!missed.length) return;
    this.start({ pool: missed, length: 0, mode: 'practice', subject: this.opts.subject, label: 'Missed questions' });
  },
  restart() {
    if (this.opts.kind === 'daily') { Setup.open(); return; }
    this.start({ ...this.opts, pool: this.opts.pool });
  },
};

$('pbtn').addEventListener('click', () => Quiz.prev());
$('next-question-btn').addEventListener('click', () => Quiz.next());
$('hint-btn').addEventListener('click', () => Quiz.toggleHint());
$('bmark-btn').addEventListener('click', () => Quiz.toggleBookmark());
document.querySelector('[data-action="finish-quiz"]').addEventListener('click', () => Quiz.finish());
document.querySelector('[data-action="to-unanswered"]').addEventListener('click', () => Quiz.toUnanswered());
document.querySelector('[data-action="exit-quiz"]').addEventListener('click', () => navigate('home'));
document.querySelector('[data-action="retry-missed"]').addEventListener('click', () => Quiz.retryMissed());
document.querySelector('[data-action="restart-quiz"]').addEventListener('click', () => Quiz.restart());
document.querySelectorAll('[data-review]').forEach(b => b.addEventListener('click', () => {
  const nextFilter = b.dataset.review;
  if (Quiz.reviewFilter === nextFilter) return;
  Quiz.reviewFilter = nextFilter;
  Quiz.renderReview();
  replayMotion(b, 'motion-review-filter-selected');
}));
document.addEventListener('keydown', event => {
  if (currentScreen !== 'quiz' || !Quiz.active || Quiz.finished) return;
  if (event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target) || document.querySelector('dialog[open]')) return;
  const key = event.key.toLowerCase();
  const index = /^[1-6]$/.test(key) ? Number(key) - 1 : 'abcdef'.indexOf(key.length === 1 ? key : '_');
  if (index >= 0) {
    const button = $('opts').children[index];
    if (button && !button.disabled) { event.preventDefault(); button.click(); }
  } else if (event.key === 'ArrowRight') { event.preventDefault(); Quiz.next(); }
  else if (event.key === 'ArrowLeft') { event.preventDefault(); Quiz.prev(); }
  else if (key === 'h') { Quiz.toggleHint(); }
});
// Warn before closing the tab mid-session.
window.addEventListener('beforeunload', event => { if (Quiz.inProgress()) { event.preventDefault(); event.returnValue = ''; } });

/* ======================= Revision notes ======================= */
function noteRichText(tag, text, className = '') {
  const node = el(tag, className);
  String(text).split(/(\*\*.*?\*\*)/g).forEach(part => {
    if (!part) return;
    if (part.startsWith('**') && part.endsWith('**')) node.append(el('strong', '', part.slice(2, -2)));
    else node.appendChild(document.createTextNode(part.replace(/\*([^*]+)\*/g, '$1')));
  });
  return node;
}

/* Interactive labs for maths notes */
function labShell(tag, goal) {
  const box = el('div', 'lab');
  box.append(el('p', 'lab-tag', 'Try it: ' + tag), el('p', 'lab-goal', goal));
  return box;
}
function labSlider(box, text, min, max, step, val, onInput) {
  const row = el('label'), name = el('span', '', text), out = el('b', '', String(val));
  const inp = document.createElement('input');
  Object.assign(inp, { type: 'range', min, max, step, value: val });
  inp.addEventListener('input', () => {
    out.textContent = inp.value;
    const result = box.querySelector('.lab-out');
    const wasSolved = !!result?.classList.contains('win');
    onInput();
    if (result && !wasSolved && result.classList.contains('win')) replayMotion(result, 'motion-lab-solved');
  });
  row.append(name, inp, out); box.append(row);
  return inp;
}
const NS = 'http://www.w3.org/2000/svg';
const WIDGETS = {
  frac() {
    const box = labShell('Fraction bar', 'Slide the top and bottom numbers. Can you make 3/4? What do you notice about 2/4?');
    const bar = el('div', 'lab-bar'), out = el('p', 'lab-out');
    const d = labSlider(box, 'Parts (bottom)', 1, 12, 1, 4, draw), n = labSlider(box, 'Shaded (top)', 0, 12, 1, 3, draw);
    box.append(bar, out);
    function draw() {
      const den = +d.value; n.max = den; if (+n.value > den) n.value = den;
      bar.replaceChildren(...Array.from({ length: den }, (_, i) => el('span', i < +n.value ? 'on' : '')));
      const v = n.value / den;
      out.textContent = `${n.value}/${den} = ${+v.toFixed(3)} = ${+(v * 100).toFixed(1)}%`;
      out.classList.toggle('win', n.value / den === 0.75 && +n.value > 0);
      if (out.classList.contains('win')) out.textContent += ' ✓ Three quarters!';
    }
    draw(); return box;
  },
  bal() {
    const box = labShell('Balance the equation', 'Move x until both sides are equal: 2x + 5 = 17.');
    const out = el('p', 'lab-out');
    const x = labSlider(box, 'x', 0, 12, 1, 0, draw); box.append(out);
    function draw() {
      const l = 2 * x.value + 5, ok = l === 17;
      out.textContent = `2(${x.value}) + 5 = ${l}   and   right side = 17` + (ok ? '  ✓ Balanced! x = 6' : l < 17 ? '  → too small' : '  → too big');
      out.classList.toggle('win', ok);
    }
    draw(); return box;
  },
  ratio() {
    const box = labShell('Share in a ratio', 'Share the money. Change the ratio and watch each share.');
    const bar = el('div', 'lab-bar'), out = el('p', 'lab-out');
    const a = labSlider(box, 'First part', 1, 9, 1, 3, draw), b = labSlider(box, 'Second part', 1, 9, 1, 2, draw), t = labSlider(box, 'Total GH¢', 50, 500, 10, 200, draw);
    box.append(bar, out);
    function draw() {
      const s = +a.value + +b.value, one = t.value / s, x = el('i'), y = el('i');
      x.style.width = (a.value / s * 100) + '%'; x.textContent = 'GH¢ ' + +(one * a.value).toFixed(2);
      y.style.width = (b.value / s * 100) + '%'; y.textContent = 'GH¢ ' + +(one * b.value).toFixed(2); y.style.background = 'var(--warn)';
      x.style.background = 'var(--accent)'; bar.replaceChildren(x, y);
      out.textContent = `${a.value} + ${b.value} = ${s} parts. One part = ${t.value} ÷ ${s} = GH¢ ${+one.toFixed(2)}.`;
    }
    draw(); return box;
  },
  pyth() {
    const box = labShell('Pythagoras', 'Slide the two shorter sides. Find a right triangle where the long side is a whole number (try 3 and 4).');
    const svg = document.createElementNS(NS, 'svg'), out = el('p', 'lab-out');
    svg.setAttribute('viewBox', '0 0 240 150');
    const a = labSlider(box, 'Side a', 1, 12, 1, 3, draw), b = labSlider(box, 'Side b', 1, 12, 1, 4, draw);
    box.append(svg, out);
    function draw() {
      const s = 11, A = a.value * s, B = b.value * s;
      svg.innerHTML = `<polygon points="10,140 ${10 + B},140 10,${140 - A}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/><text x="${10 + B / 2}" y="146" font-size="11" fill="currentColor">b = ${b.value}</text><text x="14" y="${140 - A / 2}" font-size="11" fill="currentColor">a = ${a.value}</text>`;
      const c2 = a.value ** 2 + b.value ** 2, c = Math.sqrt(c2), whole = Number.isInteger(c);
      out.textContent = `${a.value}² + ${b.value}² = ${c2},  so c = √${c2} = ${+c.toFixed(2)}` + (whole ? '  ✓ A whole number!' : '');
      out.classList.toggle('win', whole);
    }
    draw(); return box;
  },
  circle() {
    const box = labShell('Circle explorer', 'Slide the radius. What happens to the area when the radius doubles?');
    const svg = document.createElementNS(NS, 'svg'), out = el('p', 'lab-out');
    svg.setAttribute('viewBox', '0 0 240 150');
    const r = labSlider(box, 'Radius (cm)', 1, 14, 1, 7, draw);
    box.append(svg, out);
    function draw() {
      const R = +r.value;
      svg.innerHTML = `<circle cx="120" cy="75" r="${R * 5}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/><line x1="120" y1="75" x2="${120 + R * 5}" y2="75" stroke="var(--accent)" stroke-width="2"/><text x="${120 + R * 2.5 - 8}" y="70" font-size="11" fill="currentColor">${R}</text>`;
      out.textContent = `C = 2 × 22/7 × ${R} = ${+(44 / 7 * R).toFixed(2)} cm.  A = 22/7 × ${R}² = ${+(22 / 7 * R * R).toFixed(2)} cm²`;
    }
    draw(); return box;
  },
  sci() {
    const box = labShell('Standard form', 'Set the power to 4 and the number to 4.5. What ordinary number do you get?');
    const out = el('p', 'lab-out');
    const m = labSlider(box, 'Number (1 to 9.9)', 1, 9.9, 0.1, 1, draw), p = labSlider(box, 'Power of 10', -5, 8, 1, 0, draw);
    box.append(out);
    function draw() {
      const v = (+m.value * 10 ** +p.value).toLocaleString('en', { maximumFractionDigits: 8, useGrouping: false });
      out.textContent = `${m.value} × 10^${p.value} = ${v}`;
      out.classList.toggle('win', +m.value === 4.5 && +p.value === 4);
      if (out.classList.contains('win')) out.textContent += '  ✓ 45 000!';
    }
    draw(); return box;
  },
  prob() {
    const box = labShell('Probability lab', 'Set the balls in the bag, then draw 20 times. Is the result close to P(red)?');
    const dots = el('div', 'dots'), out = el('p', 'lab-out'), btn = el('button', '', 'Draw 20 balls');
    btn.type = 'button';
    const r = labSlider(box, 'Red balls', 0, 10, 1, 4, draw), bl = labSlider(box, 'Blue balls', 0, 10, 1, 6, draw);
    box.append(dots, btn, out);
    function draw() {
      const n = +r.value + +bl.value;
      dots.replaceChildren(...[...Array(+r.value).fill('#c0392b'), ...Array(+bl.value).fill('#2e6fb7')].map(c => { const e = el('em'); e.style.background = c; return e; }));
      out.textContent = n ? `P(red) = ${r.value}/${n} = ${+(r.value / n).toFixed(3)}` : 'Add some balls first.';
    }
    btn.addEventListener('click', () => {
      const n = +r.value + +bl.value; if (!n) return;
      let hit = 0; for (let i = 0; i < 20; i++) if (Math.random() < r.value / n) hit++;
      out.textContent = `P(red) = ${r.value}/${n} = ${+(r.value / n).toFixed(3)}.  In 20 draws you got ${hit} red (${hit / 20}). More draws get closer to the true value.`;
    });
    draw(); return box;
  }
};

/* Guided lessons for maths notes */
function LessonPlayer(steps) {
  const box = el('div', 'lesson'), bar = el('div', 'lesson-bar'), fill = el('i'), stage = el('div');
  bar.append(fill);
  box.append(el('p', 'lab-tag', 'Guided lesson · answer as you go'), bar, stage);
  let i = 0;
  function btn(cls, text, fn) { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function show() {
    const s = steps[i], fb = el('p', 'lesson-fb');
    fill.style.width = (i / steps.length * 100) + '%';
    stage.replaceChildren();
    const last = i === steps.length - 1;
    const next = btn('lesson-next', last ? 'Finish 🎉' : 'Continue →', () => { if (last) done(); else { i++; show(); } });
    const win = why => { fb.textContent = '✅ ' + why; next.hidden = false; };
    if (s.t === 'say') stage.append(el('p', 'lesson-say', s.x), next);
    else if (s.t === 'lab') stage.append(el('p', 'lesson-say', 'Now play with it. Move the sliders and notice what changes.'), WIDGETS[s.k](), next);
    else if (s.t === 'pick') {
      stage.append(el('p', 'lesson-q', s.q));
      const opts = s.c.map((text, n) => btn('lesson-opt', text, () => {
        if (n === s.a) { opts.forEach(o => o.disabled = true); opts[n].classList.add('ok'); win(s.w); }
        else { opts[n].classList.add('bad'); opts[n].disabled = true; fb.textContent = '🤔 Not quite. Think again and try another.'; }
      }));
      stage.append(...opts, fb, next); next.hidden = true;
    } else {
      stage.append(el('p', 'lesson-q', s.q));
      const inp = el('input', 'lesson-in'); inp.inputMode = 'decimal'; inp.placeholder = 'Your answer';
      let tries = 0;
      const check = () => {
        if (Math.abs(parseFloat(inp.value) - s.a) < 0.05) { inp.disabled = true; win(s.w); }
        else { tries++; fb.textContent = tries > 1 ? '💡 Hint: ' + s.w : '🤔 Not quite. Have another go.'; }
      };
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
      stage.append(inp, btn('lesson-check', 'Check', check), fb, next); next.hidden = true;
    }
  }
  function done() {
    fill.style.width = '100%'; stage.replaceChildren(el('p', 'lesson-say', '🎉 Lesson complete! Now read the notes below to lock in what you just discovered.'), btn('lesson-check', 'Do it again', () => { i = 0; show(); }));
  }
  show(); return box;
}

/* Inline interactive demos */
const wsvg = (box, vb) => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', vb || '0 0 240 140'); box.append(s); return s; };
const rad = d => d * Math.PI / 180, r2 = n => +n.toFixed(2);
WIDGETS.move = function () {
  const box = labShell('Move it across', 'Pick a type, set the numbers, then press Next step. Watch what happens to the term that jumps over the = sign.');
  const modes = ['x + a = c', 'x − a = c', 'a × x = c', 'x ÷ a = c', 'Make l the subject'];
  let mode = 0, step = 0;
  const tabs = el('div', 'mv-tabs'), eq = el('p', 'mv-eq'), say = el('p', 'lab-out'), go = el('button', '', 'Next step'); go.type = 'button';
  const tb = modes.map((t, k) => { const b = el('button', 'alt', t); b.type = 'button'; b.addEventListener('click', () => { mode = k; step = 0; draw(); }); tabs.append(b); return b; });
  box.append(tabs);
  const a = labSlider(box, 'a', 2, 9, 1, 5, () => { step = 0; draw(); }), c = labSlider(box, 'c', 10, 30, 1, 12, () => { step = 0; draw(); });
  box.append(eq, say, go);
  const hop = t => `<span class="hop">${t}</span>`;
  function steps() {
    const A = +a.value, C = +c.value;
    return [
      [[`x + ${A} = ${C}`, 'We want x alone, but + ' + A + ' is stuck to it.'], [`x = ${C} ${hop('− ' + A)}`, '+ ' + A + ' jumps over the = sign and becomes − ' + A + '. Crossing the = flips the sign.'], [`x = ${C - A}`, 'Now just calculate. x = ' + (C - A) + '.']],
      [[`x − ${A} = ${C}`, '− ' + A + ' is stuck to x.'], [`x = ${C} ${hop('+ ' + A)}`, '− ' + A + ' jumps over and becomes + ' + A + '.'], [`x = ${C + A}`, 'x = ' + (C + A) + '.']],
      [[`${A}x = ${C}`, A + 'x means ' + A + ' × x, so × ' + A + ' is stuck to x.'], [`x = ${C} ${hop('÷ ' + A)}`, '× ' + A + ' jumps over and becomes ÷ ' + A + '.'], [`x = ${r2(C / A)}`, 'x = ' + C + ' ÷ ' + A + ' = ' + r2(C / A) + '.']],
      [[`x ÷ ${A} = ${C}`, '÷ ' + A + ' is stuck to x.'], [`x = ${C} ${hop('× ' + A)}`, '÷ ' + A + ' jumps over and becomes × ' + A + '.'], [`x = ${C * A}`, 'x = ' + (C * A) + '.']],
      [[`${C} = 2l + 2(${A})`, 'Perimeter formula P = 2l + 2w with P = ' + C + ' and w = ' + A + '. Make l the subject.'], [`${C} ${hop('− ' + 2 * A)} = 2l`, '+ ' + 2 * A + ' jumps over the = sign and becomes − ' + 2 * A + '.'], [`l = (${C} − ${2 * A}) ${hop('÷ 2')}`, '× 2 jumps to the other side and becomes ÷ 2.'], [`l = ${r2((C - 2 * A) / 2)}`, 'l = ' + r2((C - 2 * A) / 2) + '. If this is negative, that perimeter is too small for that width!']]
    ][mode];
  }
  function draw() {
    const s = steps(); step = Math.min(step, s.length - 1);
    eq.innerHTML = s[step][0]; say.textContent = s[step][1];
    go.textContent = step < s.length - 1 ? 'Next step →' : 'Start again';
    tb.forEach((b, k) => b.classList.toggle('on', k === mode));
  }
  go.addEventListener('click', () => { step = step < steps().length - 1 ? step + 1 : 0; draw(); });
  draw(); return box;
};
WIDGETS.ang = function () {
  const box = labShell('Angles on a straight line', 'Slide x. The two angles always add up to 180°. Can you make them equal?');
  const svg = wsvg(box), out = el('p', 'lab-out'), x = labSlider(box, 'Angle x (°)', 10, 170, 1, 60, draw);
  box.append(out);
  function draw() {
    const X = +x.value, cx = 120, cy = 110, ex = cx + 90 * Math.cos(rad(X)), ey = cy - 90 * Math.sin(rad(X));
    const lx = (d, m) => cx + m * Math.cos(rad(d)), ly = (d, m) => cy - m * Math.sin(rad(d));
    svg.innerHTML = `<line x1="15" y1="110" x2="225" y2="110" stroke="currentColor" stroke-width="2"/><line x1="120" y1="110" x2="${ex}" y2="${ey}" stroke="var(--accent)" stroke-width="3"/><text x="${lx(X / 2, 48)}" y="${ly(X / 2, 48)}" font-size="13" fill="var(--accent)" font-weight="700">${X}°</text><text x="${lx(X + (180 - X) / 2, 48) - 12}" y="${ly(X + (180 - X) / 2, 48)}" font-size="13" fill="var(--bad)" font-weight="700">${180 - X}°</text>`;
    out.textContent = `x + y = ${X}° + ${180 - X}° = 180°  (angles on a straight line)`; out.classList.toggle('win', X === 90);
    if (X === 90) out.textContent += '  ✓ Both 90°: a right angle!';
  }
  draw(); return box;
};
WIDGETS.tri = function () {
  const box = labShell('Angles in a triangle', 'Slide two angles. The third one is forced. Can you break the 180° rule?');
  const svg = wsvg(box, '0 0 240 140'), out = el('p', 'lab-out');
  const a = labSlider(box, 'Angle A (°)', 20, 120, 1, 50, draw), b = labSlider(box, 'Angle B (°)', 20, 120, 1, 60, draw);
  box.append(out);
  function draw() {
    const A = +a.value, B = +b.value, C = 180 - A - B;
    if (C <= 0) { svg.innerHTML = ''; out.textContent = `${A}° + ${B}° = ${A + B}° is already 180° or more. No triangle can be drawn!`; out.classList.remove('win'); return; }
    const h1 = 1 / (1 / Math.tan(rad(A)) + 1 / Math.tan(rad(B))), s = Math.min(200, 110 / h1), ax = 120 - s / 2, bx = 120 + s / 2, px = ax + h1 * s / Math.tan(rad(A)), py = 125 - h1 * s;
    svg.innerHTML = `<polygon points="${ax},125 ${bx},125 ${px},${py}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/><text x="${ax + 4}" y="120" font-size="12" fill="currentColor">${A}°</text><text x="${bx - 34}" y="120" font-size="12" fill="currentColor">${B}°</text><text x="${px - 10}" y="${py + 18}" font-size="12" fill="var(--bad)" font-weight="700">${C}°</text>`;
    out.textContent = `Third angle = 180° − ${A}° − ${B}° = ${C}°`; out.classList.remove('win');
  }
  draw(); return box;
};
WIDGETS.poly = function () {
  const box = labShell('Polygon angles', 'Add sides one at a time. Watch the angle total grow but the outside turn stay 360°.');
  const svg = wsvg(box, '0 0 240 150'), out = el('p', 'lab-out'), n = labSlider(box, 'Sides (n)', 3, 12, 1, 5, draw);
  box.append(out);
  function draw() {
    const N = +n.value, pts = Array.from({ length: N }, (_, k) => `${120 + 60 * Math.sin(rad(360 * k / N))},${75 - 60 * Math.cos(rad(360 * k / N))}`).join(' ');
    svg.innerHTML = `<polygon points="${pts}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/>`;
    out.textContent = `Interior total = (${N} − 2) × 180° = ${(N - 2) * 180}°.  Each interior angle (regular) = ${r2((N - 2) * 180 / N)}°.  Each exterior angle = 360° ÷ ${N} = ${r2(360 / N)}°.`;
  }
  draw(); return box;
};
WIDGETS.pct = function () {
  const box = labShell('Percentage finder', 'Slide the percentage. Try 10% first, then build 15% from 10% + 5%.');
  const bar = el('div', 'lab-bar'), out = el('p', 'lab-out');
  const m = labSlider(box, 'Amount GH¢', 20, 500, 10, 240, draw), p = labSlider(box, 'Percent %', 5, 100, 5, 15, draw);
  box.append(bar, out);
  function draw() {
    const i = el('i'); i.style.width = p.value + '%'; i.style.background = 'var(--accent)'; i.textContent = p.value + '%'; bar.replaceChildren(i);
    out.textContent = `10% of ${m.value} = ${r2(m.value / 10)}.  ${p.value}% of ${m.value} = ${p.value}/100 × ${m.value} = GH¢ ${r2(m.value * p.value / 100)}`;
  }
  draw(); return box;
};
WIDGETS.rect = function () {
  const box = labShell('Area and perimeter', 'Change the length and width. Count the squares: they are the area. Walk around the edge: that is the perimeter.');
  const grid = el('div', 'cells'), out = el('p', 'lab-out');
  const l = labSlider(box, 'Length', 1, 12, 1, 6, draw), w = labSlider(box, 'Width', 1, 12, 1, 4, draw);
  box.append(grid, out);
  function draw() {
    grid.style.gridTemplateColumns = `repeat(${l.value}, 1fr)`; grid.replaceChildren(...Array.from({ length: l.value * w.value }, () => el('i')));
    out.textContent = `Area = ${l.value} × ${w.value} = ${l.value * w.value} squares.  Perimeter = 2(${l.value} + ${w.value}) = ${2 * (+l.value + +w.value)}`;
  }
  draw(); return box;
};
WIDGETS.idx = function () {
  const box = labShell('Index law', 'Change the powers. Why does 2³ × 2⁴ become 2⁷? Count the 2s being multiplied.');
  const out = el('p', 'lab-out'), m = labSlider(box, 'First power', 1, 6, 1, 3, draw), n = labSlider(box, 'Second power', 1, 6, 1, 4, draw);
  box.append(out);
  function draw() {
    const rep = k => Array(k).fill(2).join('×'), M = +m.value, N = +n.value;
    out.innerHTML = `2<sup>${M}</sup> × 2<sup>${N}</sup> = (${rep(M)}) × (${rep(N)}) = 2<sup>${M + N}</sup> = ${2 ** (M + N)}<br>Rule: same base, so ADD the powers (${M} + ${N} = ${M + N}).`;
  }
  draw(); return box;
};


WIDGETS.bits = function () {
  const box = labShell('Binary switches', 'Tap the switches to turn bits on (1) or off (0). Can you make 13? Then 200?');
  const row = el('div', 'dots'), out = el('p', 'lab-out'), vals = [128, 64, 32, 16, 8, 4, 2, 1], on = vals.map(() => false);
  const btns = vals.map((v, i) => { const b = el('button', 'alt', String(v)); b.addEventListener('click', () => { on[i] = !on[i]; draw(); }); row.append(b); return b; });
  box.append(row, out);
  function draw() {
    let t = 0; btns.forEach((b, i) => { b.classList.toggle('on', on[i]); if (on[i]) t += vals[i]; });
    out.textContent = on.map(x => x ? 1 : 0).join('') + ' in binary = ' + t + ' in decimal';
  }
  draw(); return box;
};
WIDGETS.ram = function () {
  const box = labShell('RAM or hard disk?', 'Type a file, save it, then switch the power off. Where does your file survive?');
  const bar = el('div', 'lab-bar'), out = el('p', 'lab-out'), row = el('div', 'dots');
  const st = { power: true, ram: false, disk: false };
  const mk = (t, f) => { const b = el('button', 'alt', t); b.addEventListener('click', () => { f(); draw(); }); row.append(b); };
  mk('1. Type a file', () => { if (st.power) st.ram = true; });
  mk('2. Save to disk', () => { if (st.power && st.ram) st.disk = true; });
  mk('3. Power on/off', () => { st.power = !st.power; if (!st.power) st.ram = false; });
  box.append(row, bar, out);
  function draw() {
    bar.replaceChildren(el('span', st.ram ? 'on' : '', 'RAM'), el('span', st.disk ? 'on' : '', 'Hard disk'));
    bar.style.height = 'auto'; bar.querySelectorAll('span').forEach(x => { x.style.padding = '8px'; x.style.textAlign = 'center'; });
    out.textContent = (st.power ? 'Power ON. ' : 'Power OFF. ') + 'RAM: ' + (st.ram ? 'file inside' : 'empty') + ' | Hard disk: ' + (st.disk ? 'file inside' : 'empty') + (!st.power && st.disk ? '  ✓ Secondary storage keeps files.' : '') + (!st.power && !st.disk ? '  ✗ RAM lost it. Save first!' : '');
  }
  draw(); return box;
};
WIDGETS.device = function () {
  const box = labShell('Input, output or both?', 'Tap a device to see what kind it is.');
  const M = { Keyboard: ['Input', 'You type data into the computer.'], Mouse: ['Input', 'You point and click to give instructions.'], 'Barcode reader': ['Input (direct data entry)', 'Reads the barcode on goods straight into the computer, with no typing.'], 'QR scanner': ['Input (direct data entry)', 'Reads a QR code, e.g. for a MoMo payment.'], 'OMR reader': ['Input (direct data entry)', 'Reads marked answer sheets, like multiple-choice papers.'], Monitor: ['Output', 'Shows results on screen (softcopy).'], Printer: ['Output', 'Prints results on paper (hardcopy).'], Speaker: ['Output', 'Gives out sound.'], Touchscreen: ['Both', 'You touch to enter data, and it shows the output.'] };
  const row = el('div', 'dots'), out = el('p', 'lab-out', 'Pick a device above.');
  Object.keys(M).forEach(k => { const b = el('button', 'alt', k); b.addEventListener('click', () => { out.textContent = k + ': ' + M[k][0] + '. ' + M[k][1]; }); row.append(b); });
  box.append(row, out); return box;
};
WIDGETS.qubit = function () {
  const box = labShell('Bit vs qubit', 'A normal bit is 0 or 1. A qubit can be a mix until you measure it. Slide the mix, then measure 20 times.');
  const p = labSlider(box, 'Chance of 1 (%)', 0, 100, 5, 50, () => { out.textContent = 'Mix set. Tap Measure.'; });
  const out = el('p', 'lab-out', 'Slide the mix, then tap Measure.'), b = el('button', '', 'Measure 20 times');
  b.addEventListener('click', () => { let ones = 0; for (let i = 0; i < 20; i++) if (Math.random() * 100 < +p.value) ones++; out.textContent = 'Qubit gave ' + (20 - ones) + ' zeros and ' + ones + ' ones. A normal bit set to 0 gives 20 zeros every time.'; });
  box.append(b, out); return box;
};
WIDGETS.defrag = function () {
  const box = labShell('Defragmenter', 'Your file (blue) is scattered. Tap Defragment and watch the pieces join up.');
  const bar = el('div', 'lab-bar'), out = el('p', 'lab-out'), b = el('button', '', 'Defragment');
  let scattered = true; const pos = [0, 3, 4, 8, 11, 13];
  b.addEventListener('click', () => { scattered = !scattered; draw(); b.textContent = scattered ? 'Defragment' : 'Scatter again'; });
  box.append(b, bar, out);
  function draw() {
    const on = scattered ? pos : [0, 1, 2, 3, 4, 5];
    bar.replaceChildren(...Array.from({ length: 14 }, (_, i) => el('span', on.includes(i) ? 'on' : '')));
    out.textContent = scattered ? 'Scattered: the disk head must jump around, so the file opens slowly.' : '✓ Together: the disk reads it in one go, so it is faster.';
  }
  draw(); return box;
};
WIDGETS.part = function () {
  const box = labShell('Partition a disk', 'This disk is 100 GB. Slide to split it into drive C: and drive D:.');
  const bar = el('div', 'lab-bar'), out = el('p', 'lab-out'), c = labSlider(box, 'Drive C: (GB)', 10, 90, 10, 60, draw);
  box.append(bar, out);
  function draw() {
    const a = +c.value, d = 100 - a, i1 = el('i', '', 'C: ' + a), i2 = el('i', '', 'D: ' + d);
    i1.style.width = a + '%'; i1.style.background = 'var(--accent)'; i2.style.width = d + '%'; i2.style.background = 'var(--warn)';
    bar.replaceChildren(i1, i2); out.textContent = 'C: ' + a + ' GB (programs) and D: ' + d + ' GB (your files). Partitioning splits one disk into separate sections.';
  }
  draw(); return box;
};


function pickLab(tag, goal, M) {
  const box = labShell(tag, goal), row = el('div', 'dots'), out = el('p', 'lab-out', 'Tap an item above.');
  Object.keys(M).forEach(k => { const b = el('button', 'alt', k); b.addEventListener('click', () => { row.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); out.textContent = k + ': ' + M[k]; }); row.append(b); });
  box.append(row, out); return box;
}
const FIELD = 'width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--line-strong);border-radius:10px;background:var(--surface);font:inherit;color:var(--ink)';
WIDGETS.cycle = () => pickLab('Information processing cycle', 'Tap each stage to see it happen when you work out 2 + 3.', { '1 Input': 'You type 2 + 3 on the keyboard.', '2 Processing': 'The CPU adds 2 + 3.', '3 Storage': 'The answer can be saved on the disk.', '4 Output': 'The monitor shows 5.' });
WIDGETS.sw = () => pickLab('Software sorter', 'Tap a program to see what type of software it is.', { Windows: 'Operating system. It runs the whole computer.', Android: 'Operating system for phones and tablets.', 'Microsoft Word': 'Application software for typing documents.', Chrome: 'Application software (a web browser).', Antivirus: 'Utility software. It finds and removes viruses.' });
WIDGETS.office = () => pickLab('Which program?', 'Tap a program to see its job.', { Word: 'Type and format letters and reports.', Excel: 'Calculate with rows, columns and formulas.', PowerPoint: 'Make slide shows for presentations.', Paint: 'Draw and edit simple pictures.' });
WIDGETS.net = () => pickLab('Network parts', 'Tap a term to see what it means.', { LAN: 'Local Area Network: a small area such as a school lab.', WAN: 'Wide Area Network: covers cities or countries. The internet is the biggest.', Router: 'Shares one internet connection with many devices.', Modem: 'Connects your network to the internet provider.', Switch: 'Connects computers inside a LAN and sends data to the right one.', 'Wi-Fi': 'Connects devices to a network by radio, with no cables.' });
WIDGETS.care = () => pickLab('Fix it', 'Tap a problem to see the sensible fix.', { 'Computer freezes': 'Wait a moment, then restart it.', 'Blank screen': 'Check the monitor cable and power first.', 'Slow computer': 'Delete unused files, run Disk Cleanup and scan for viruses.', 'Power cuts': 'Use a UPS or surge protector.', 'Virus on flash disk': 'Scan it with antivirus before opening files.', Overheating: 'Clean the dust from vents and fans.' });
WIDGETS.tech = () => pickLab('New technology', 'Tap a technology to see what it does.', { AI: 'Machines doing tasks that need human thinking.', IoT: 'Everyday devices connected to the internet.', Cloud: 'Files stored online, like Google Drive.', Robot: 'A machine that does tasks automatically.', '3D printer': 'Builds objects from a digital design.', Drone: 'Flying machine. In Ghana, drones have delivered medical supplies.', Biometrics: 'Recognises a fingerprint or a face.' });
WIDGETS.store = () => pickLab('Storage devices', 'Tap a device to see how it compares.', { 'Hard disk': 'Secondary. Very large, fairly cheap, has moving parts.', SSD: 'Secondary. Faster than a hard disk, no moving parts, costs more.', 'Flash disk': 'Secondary. Small and portable, plugs into a USB port.', 'Memory card': 'Secondary. Tiny card used in phones and cameras.', 'CD / DVD': 'Secondary. Read by a laser. Holds little data.', Cloud: 'Secondary. Files on internet servers. Needs internet.', RAM: 'Primary. Fast and temporary, right next to the CPU.', ROM: 'Primary. Permanent start-up instructions.' });
WIDGETS.pw = function () {
  const box = labShell('Password tester', 'Type a made-up password. Nothing is saved or sent anywhere.');
  const inp = document.createElement('input'); Object.assign(inp, { type: 'text', placeholder: 'Try kofi1234, then Kw@9#mT2!x', autocomplete: 'off' }); inp.style.cssText = FIELD;
  const bar = el('div', 'lab-bar'), fill = el('i', ''), out = el('p', 'lab-out'); bar.append(fill); box.append(inp, bar, out);
  inp.addEventListener('input', draw);
  function draw() {
    const v = inp.value, common = /password|1234|qwerty|abcd|ghana/i.test(v);
    const c = [v.length >= 8, v.length >= 12, /[a-z]/.test(v), /[A-Z]/.test(v), /\d/.test(v), /[^A-Za-z0-9]/.test(v)];
    let n = c.filter(Boolean).length; if (common) n = Math.min(n, 2);
    fill.style.width = v ? Math.max(8, n / 6 * 100) + '%' : '0'; fill.style.background = n <= 2 ? 'var(--bad)' : n <= 4 ? 'var(--warn)' : 'var(--good)';
    const t = []; if (common) t.push('avoid common words and number runs'); if (v.length < 8) t.push('8 or more characters'); if (!c[2] || !c[3]) t.push('upper and lower case letters'); if (!c[4]) t.push('a number'); if (!c[5]) t.push('a symbol like @ or #');
    out.textContent = !v ? 'Type to test it.' : (n <= 2 ? 'Weak' : n <= 4 ? 'Fair' : 'Strong') + (t.length ? '. Add: ' + t.join(', ') + '.' : '. ✓ Well done!'); out.classList.toggle('win', n >= 5 && !t.length);
  }
  draw(); return box;
};
WIDGETS.flow = function () {
  const box = labShell('Step through a flowchart', 'Enter a number, then tap Next step to follow the arrows. Is it even or odd?');
  const inp = document.createElement('input'); Object.assign(inp, { type: 'number', value: 7 }); inp.style.cssText = FIELD;
  const list = el('div', ''), out = el('p', 'lab-out'), b = el('button', '', 'Next step'); list.style.cssText = 'display:grid;justify-items:center;gap:4px;margin:12px 0';
  let st = 0; box.append(inp, list, b, out);
  inp.addEventListener('input', () => { st = 0; draw(); }); b.addEventListener('click', () => { st = st >= 4 ? 0 : st + 1; draw(); });
  function draw() {
    const n = Math.trunc(+inp.value) || 0, r = Math.abs(n % 2);
    const S = [['Start', 'oval', 'Oval = start or stop.'], ['Input n = ' + n, 'rect', 'Input: we take the number ' + n + '.'], ['Is n ÷ 2 remainder 0?', 'diamond', 'Diamond = decision. ' + n + ' ÷ 2 leaves remainder ' + r + ', so the answer is ' + (r === 0 ? 'Yes' : 'No') + '.'], [r === 0 ? 'Output "Even"' : 'Output "Odd"', 'rect', 'Process or output: ' + (r === 0 ? 'Yes goes to Even.' : 'No goes to Odd.')], ['Stop', 'oval', 'Done. Tap again to restart.']];
    list.replaceChildren(...S.flatMap((x, i) => {
      const d = el('div', '', x[0]); d.style.cssText = 'text-align:center;font-size:.9rem;padding:9px 16px;border:2px solid ' + (i === st ? 'var(--accent)' : 'var(--line-strong)') + ';background:' + (i <= st ? 'var(--accent-soft)' : 'var(--surface)') + ';border-radius:' + (x[1] === 'oval' ? '999px' : '8px') + ';opacity:' + (i <= st ? 1 : .5);
      if (x[1] === 'diamond') { d.style.cssText = 'text-align:center;font-size:.85rem;font-weight:600;padding:30px 54px;border:0;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);background:' + (i <= st ? 'var(--accent)' : 'var(--line-strong)') + ';color:' + (i <= st ? 'var(--on-primary)' : 'var(--ink)') + ';opacity:' + (i <= st ? 1 : .6); }
      return i < 4 ? [d, el('span', '', '↓')] : [d];
    }));
    out.textContent = S[st][2]; b.textContent = st >= 4 ? 'Restart' : 'Next step';
  }
  draw(); return box;
};
WIDGETS.conv = function () {
  const box = labShell('Decimal to binary', 'Slide to pick a number from 0 to 255 and see its binary and its place values.');
  const out = el('p', 'lab-out'), n = labSlider(box, 'Decimal', 0, 255, 1, 13, draw); box.append(out);
  function draw() {
    const v = +n.value, bits = v.toString(2).padStart(8, '0'), parts = [128, 64, 32, 16, 8, 4, 2, 1].filter((p, i) => bits[i] === '1');
    out.textContent = v + ' = ' + (parts.length ? parts.join(' + ') : '0') + '  →  binary ' + bits;
  }
  draw(); return box;
};
const GLOSSARY = [["Algorithm", "A step-by-step set of instructions for solving a problem."], ["Antivirus", "Software that finds and removes computer viruses."], ["Application software", "Programs that help users do tasks, like Word or Excel."], ["Backup", "A copy of your files kept in a safe, separate place."], ["Binary", "The number system with only 0 and 1, used by computers."], ["Bit", "The smallest unit of data: a single 0 or 1."], ["Browser", "A program for opening websites, like Chrome or Firefox."], ["Bug", "A mistake in a program."], ["Byte", "A group of 8 bits."], ["Barcode reader", "Reads the barcode on goods straight into the computer."], ["Biometrics", "Recognising people by fingerprint or face."], ["Cloud storage", "Saving files on internet servers, like Google Drive."], ["CPU", "Central Processing Unit. The brain of the computer."], ["Cyberbullying", "Sending hurtful or threatening messages online."], ["Debugging", "Finding and fixing errors in a program."], ["Defragmentation", "Joining scattered pieces of files so the disk is faster."], ["Domain name", "The part of an email or web address after @ or www."], ["Firewall", "Blocks unauthorised access to a network."], ["Flash disk", "A small portable storage device that plugs into a USB port."], ["Flowchart", "A diagram that shows an algorithm using shapes and arrows."], ["Formatting", "Preparing a disk to store files. It erases the data."], ["Hardware", "The parts of a computer you can touch."], ["Hard disk", "Permanent secondary storage inside a computer."], ["Input device", "Sends data into the computer, e.g. keyboard."], ["Internet", "The world's largest network, joining millions of networks."], ["IoT", "Internet of Things: everyday devices connected to the internet."], ["LAN", "Local Area Network: a network in a small area like a school lab."], ["Loop", "Repeats a set of instructions in a program."], ["Malware", "Software made to damage or steal data."], ["Network", "Computers joined together to share data and devices."], ["OMR", "Optical Mark Recognition: reads marked answer sheets."], ["Operating system", "Software that controls the hardware and runs other programs."], ["Output device", "Gives results out, e.g. monitor or printer."], ["Partition", "Dividing one disk into separate sections like C: and D:."], ["Phishing", "A fake message that tricks you into giving personal details."], ["Plagiarism", "Copying someone's work and claiming it as your own."], ["Program", "A set of instructions a computer follows."], ["QR code", "A square code a phone camera can scan, e.g. for payments."], ["Qubit", "A quantum bit that can be a mix of 0 and 1."], ["RAM", "Random Access Memory: fast, temporary memory next to the CPU."], ["ROM", "Read Only Memory: permanent start-up instructions."], ["Router", "Shares one internet connection with many devices."], ["Search engine", "Finds web pages for your keywords, e.g. Google."], ["Software", "Programs that tell the hardware what to do."], ["Spreadsheet", "A program with rows and columns for calculations, e.g. Excel."], ["Superposition", "A qubit being a mix of 0 and 1 until measured."], ["UPS", "Uninterruptible Power Supply: protects against power cuts."], ["URL", "Uniform Resource Locator: a web address."], ["WAN", "Wide Area Network: covers cities or countries."], ["Wi-Fi", "Connects devices to a network by radio waves."]];
WIDGETS.gloss = function () {
  const box = labShell('Computing glossary', 'Type a word, such as RAM or phishing, to find its meaning.');
  const inp = document.createElement('input'); Object.assign(inp, { type: 'search', placeholder: 'Search a term...' }); inp.style.cssText = FIELD;
  const out = el('div', ''), cnt = el('p', 'lab-goal', ''); box.append(inp, cnt, out);
  inp.addEventListener('input', draw);
  function draw() {
    const q = inp.value.trim().toLowerCase(), rows = GLOSSARY.filter(g => !q || g[0].toLowerCase().includes(q) || g[1].toLowerCase().includes(q));
    cnt.textContent = rows.length + ' of ' + GLOSSARY.length + ' terms'; cnt.style.margin = '10px 0 4px';
    out.replaceChildren(...rows.map(g => { const d = el('div', ''); d.style.cssText = 'padding:9px 0;border-bottom:1px solid var(--line)'; const t = el('strong', '', g[0]); t.style.color = 'var(--accent)'; d.append(t, document.createTextNode(' — ' + g[1])); return d; }));
    if (!rows.length) out.textContent = 'No match. Try another word.';
  }
  draw(); return box;
};

/* Flow blocks: teaching conversation inside a note */
function FlowBlock(b) {
  const btn = (c, t, f) => { const x = el('button', c, t); x.type = 'button'; x.addEventListener('click', f); return x; };
  if (b.say) return noteRichText('p', b.say, 'flow-say');
  if (b.widget) return WIDGETS[b.widget]();
  if (b.why) { const d = el('details', 'flow-why'); d.append(el('summary', '', 'But why? ' + b.why), noteRichText('p', b.text)); return d; }
  const card = el('div', 'flow-card'), fb = el('p', 'lesson-fb');
  const setFeedback = (kind, content) => {
    fb.replaceChildren(noteRichText('span', content));
    replayMotion(fb, kind === 'correct' ? 'motion-lesson-feedback-correct' : 'motion-lesson-feedback-wrong');
  };
  if (b.ask) {
    card.append(el('p', 'flow-tag', 'Think first'), el('p', 'lesson-q', b.ask));
    const opts = b.opts.map((t, n) => btn('lesson-opt', t, () => {
      if (n === b.ans) {
        opts.forEach(o => o.disabled = true);
        opts[n].classList.add('ok');
        replayMotion(opts[n], 'motion-lesson-answer-correct');
        setFeedback('correct', '✅ ' + b.reply);
      } else {
        opts[n].classList.add('bad'); opts[n].disabled = true;
        replayMotion(opts[n], 'motion-lesson-answer-wrong');
        setFeedback('wrong', '🤔 Not quite. Think about what is really happening and pick again.');
      }
    }));
    card.append(...opts, fb);
  } else if (b.try) {
    card.append(el('p', 'flow-tag', 'Your turn'), el('p', 'lesson-q', b.try));
    const inp = el('input', 'lesson-in'); inp.inputMode = 'decimal'; inp.placeholder = 'Answer'; let tries = 0;
    const check = () => {
      if (Math.abs(parseFloat(inp.value) - b.ans) < 0.05) {
        inp.disabled = true;
        inp.classList.remove('is-incorrect'); inp.classList.add('is-correct');
        replayMotion(inp, 'motion-lesson-input-correct');
        setFeedback('correct', '✅ ' + b.reply);
      } else {
        tries++;
        inp.classList.remove('is-correct'); inp.classList.add('is-incorrect');
        replayMotion(inp, 'motion-lesson-input-wrong');
        setFeedback('wrong', tries > 1 ? '💡 Hint: ' + b.hint : '🤔 Not quite. Have another go.');
      }
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    card.append(inp, btn('lesson-check', 'Check', check), fb);
  } else if (b.steps) {
    card.append(el('p', 'flow-tag', 'Worked example'), el('p', 'lesson-q', b.title));
    const list = el('div'); let k = 0;
    const go = btn('lesson-check', 'Show the first step', () => {
      const s = b.steps[k++], d = el('div', 'flow-step');
      d.append(el('p', 'flow-step-h', s.h), noteRichText('p', s.w, 'flow-step-w')); list.append(d);
      replayMotion(d, 'motion-worked-step-enter');
      go.textContent = k < b.steps.length ? 'Show the next step →' : 'Done ✓'; go.disabled = k >= b.steps.length;
    });
    card.append(list, go);
  }
  return card;
}
function renderNoteSection(section, index) {
  const container = el('section', 'note-section');
  container.id = `reading-section-${index}`;
  container.append(el('p', 'note-section-index', `Section ${String(index + 1).padStart(2, '0')}`));
  container.append(noteRichText('h3', section.title.replace(/^\d+\.\s*/, '')));
  if (section.flow) section.flow.forEach(b => container.append(FlowBlock(b)));
  if (section.theory && !section.flow) {
    const explanation = el('div', 'note-explanation');
    const sentences = section.theory.split(/(?<=[.!?])\s+(?=[A-Z*])/);
    for (let i = 0; i < sentences.length; i += 2) explanation.append(noteRichText('p', sentences.slice(i, i + 2).join(' ').trim()));
    container.append(explanation);
  }
  if (section.diagram) { const fig = el('figure', 'note-fig'); const fg = el('div', 'fg'); fg.innerHTML = section.diagram; fig.append(fg, el('figcaption', '', section.cap || '')); container.append(fig); }
  if (section.widget && WIDGETS[section.widget]) container.append(WIDGETS[section.widget]());
  if (!section.flow && section.points?.length) {
    container.append(el('h4', '', 'Key ideas'));
    const list = el('ul', 'note-key-ideas');
    section.points.forEach(point => list.append(noteRichText('li', point)));
    container.append(list);
  }
  if (section.table) {
    const scroll = el('div', 'table-scroll');
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', section.table.caption || 'Comparison table');
    const table = el('table', 'note-table');
    table.append(el('caption', '', section.table.caption || 'Compare the ideas'));
    const head = el('thead'), row = el('tr');
    section.table.headers.forEach(text => { const cell = el('th', '', text); cell.scope = 'col'; row.append(cell); });
    head.append(row); table.append(head);
    const body = el('tbody');
    section.table.rows.forEach(values => { const tr = el('tr'); values.forEach(text => tr.append(noteRichText('td', text))); body.append(tr); });
    table.append(body); scroll.append(table); container.append(scroll);
  }
  if (section.quickCheck) {
    const check = el('div', 'note-check');
    check.append(el('h4', '', 'Pause & recall'), el('p', 'note-check-q', section.quickCheck.question));
    const answer = el('details', 'note-answer');
    answer.append(el('summary', '', 'Check your answer'), noteRichText('p', section.quickCheck.answer));
    check.append(answer);
    container.append(check);
  }
  const extras = [['examTip', 'Writing a stronger answer'], ['mnemonic', 'Memory aid'], ['didYouKnow', 'More context']].filter(([key]) => section[key]);
  if (extras.length) {
    const wrap = el('div', 'note-extras');
    extras.forEach(([key, label]) => {
      const details = el('details', 'note-extra');
      details.append(el('summary', '', label), noteRichText('p', section[key]));
      wrap.append(details);
    });
    container.append(wrap);
  }
  return container;
}

const Notes = {
  sub: 'social',
  level: 'all',
  query: '',
  activeId: null,
  font: store.get('bece_font', 'base'),
  entered: false,

  enter() {
    const firstEntry = !this.entered;
    if (!this.entered) { this.entered = true; this.sub = Setup.subject || 'social'; }
    this.applyFont();
    this.refresh({ animateTopicEntrance: firstEntry });
  },
  list() {
    let list = notesDB[this.sub] || [];
    if (this.level !== 'all') list = list.filter(n => n.level === this.level);
    const q = this.query;
    if (q) {
      const has = text => typeof text === 'string' && text.toLowerCase().includes(q);
      list = list.filter(n => has(n.topic) || has(n.summary) || has(n.strand) || n.sections.some(s =>
        has(s.title) || has(s.theory) || (s.points || []).some(has) || has(s.didYouKnow) || has(s.examTip) || has(s.mnemonic) ||
        (s.table && s.table.rows.some(r => r.some(has)))));
    }
    return list;
  },
  refresh({ keepScroll = true, animateTopicEntrance = false } = {}) {
    const list = this.list();
    if (!list.some(n => n.id === this.activeId)) this.activeId = list[0]?.id ?? null;
    document.querySelectorAll('[data-notes-sub]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.notesSub === this.sub)));
    document.querySelectorAll('[data-level]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.level === this.level)));
    this.renderSidebar(list);
    this.renderNote(list, animateTopicEntrance);
    if (!keepScroll) this.scrollToReader();
  },
  renderSidebar(list) {
    const sidebar = $('notes-sidebar');
    sidebar.replaceChildren();
    $('notes-count-badge').textContent = plural(list.length, 'topic');
    if (!list.length) { sidebar.append(el('p', 'empty-state', 'No topics match. Try another keyword or level.')); return; }
    list.forEach(note => {
      const active = note.id === this.activeId;
      const button = el('button', `topic-item${active ? ' is-active' : ''}`);
      button.type = 'button';
      button.setAttribute('aria-current', active ? 'true' : 'false');
      const top = el('span', 'topic-item-top');
      top.append(el('span', 'topic-level', (note.levelLabel || note.level).replace(/\s*\(.*\)/, '')));
      if (studied.has(note.id)) { const done = el('span', 'topic-done'); done.append(icon('check')); done.setAttribute('aria-label', 'studied'); top.append(done); }
      button.append(top, el('span', 'topic-name', note.topic));
      button.addEventListener('click', () => this.selectTopic(note.id));
      sidebar.append(button);
      if (active) requestAnimationFrame(() => {
        // Keep the active topic visible in the horizontal (mobile) or vertical (desktop) list.
        const box = sidebar.getBoundingClientRect(), item = button.getBoundingClientRect();
        if (item.left < box.left || item.right > box.right) sidebar.scrollBy({ left: item.left - box.left - 16, behavior: 'smooth' });
        if (item.top < box.top || item.bottom > box.bottom) sidebar.scrollBy({ top: item.top - box.top - 16, behavior: 'smooth' });
      });
    });
  },
  renderNote(list, animateTopicEntrance = false) {
    const note = list.find(n => n.id === this.activeId);
    const body = $('note-body');
    body.classList.toggle('motion-note-content-enter', Boolean(animateTopicEntrance));
    body.replaceChildren();
    const outline = $('note-outline-links');
    outline.replaceChildren();
    const prev = $('note-prev-btn'), next = $('note-next-btn');
    if (!note) {
      $('note-header-title').textContent = 'No matching topics';
      $('note-header-summary').textContent = 'Try a shorter keyword or choose a different JHS level.';
      ['note-level-badge', 'note-strand-badge', 'note-read-time'].forEach(id => { $(id).textContent = ''; $(id).hidden = true; });
      $('note-outline').hidden = true;
      document.querySelector('.note-actions').hidden = true;
      prev.hidden = next.hidden = true;
      const empty = el('div', 'empty-state');
      const reset = el('button', 'btn btn-ghost', 'Clear search & show all levels');
      reset.type = 'button';
      reset.addEventListener('click', () => { $('note-search').value = ''; this.query = ''; this.level = 'all'; this.refresh(); });
      empty.append(el('p', '', 'There’s more to explore.'), reset);
      body.append(empty);
      return;
    }
    ['note-level-badge', 'note-strand-badge', 'note-read-time'].forEach(id => { $(id).hidden = false; });
    $('note-outline').hidden = false;
    document.querySelector('.note-actions').hidden = false;
    prev.hidden = next.hidden = false;
    $('note-level-badge').textContent = note.levelLabel || note.level.toUpperCase();
    $('note-strand-badge').textContent = note.strand || 'GES Curriculum';
    const words = JSON.stringify(note.sections).split(/\s+/).length;
    $('note-read-time').replaceChildren(icon('clock'), document.createTextNode(` ${Math.max(1, Math.ceil(words / 180))} min read`));
    $('note-header-title').textContent = note.topic;
    $('note-header-summary').textContent = note.summary;
    this.renderStudied(note.id);

    const takeaway = el('div', 'note-takeaway');
    takeaway.append(el('p', 'label', 'The big idea'), el('p', '', noteTakeaways[note.id] || note.summary));
    body.append(takeaway);
    note.sections.forEach((section, index) => {
      const sectionNode = renderNoteSection(section, index);
      body.append(sectionNode);
      const link = el('a', '', section.title.replace(/^\d+\.\s*/, '').replace(/\*\*/g, ''));
      link.href = `#reading-section-${index}`;
      link.addEventListener('click', () => {
        const destination = document.getElementById(`reading-section-${index}`);
        if (destination) replayMotion(destination, 'motion-note-section-focus');
      });
      outline.append(link);
    });
    $('note-outline').open = window.innerWidth >= 760;

    const idx = list.findIndex(n => n.id === note.id);
    prev.disabled = idx <= 0;
    const last = idx === list.length - 1;
    next.querySelector('span').textContent = last ? 'Practise this subject' : 'Next topic';
    next.dataset.last = String(last);
  },
  selectTopic(id) {
    if (!id || this.activeId === id) return;
    this.activeId = id;
    this.refresh({ keepScroll: false, animateTopicEntrance: true });
    const selected = $('notes-sidebar').querySelector('.topic-item[aria-current="true"]');
    replayMotion(selected, 'motion-note-topic-selected');
  },
  renderStudied(id) {
    const button = $('note-studied');
    const done = studied.has(id);
    button.setAttribute('aria-pressed', String(done));
    button.classList.toggle('is-done', done);
    button.querySelector('span').textContent = done ? 'Studied' : 'Mark as studied';
  },
  toggleStudied() {
    if (!this.activeId) return;
    const wasStudied = studied.has(this.activeId);
    if (wasStudied) studied.delete(this.activeId);
    else { studied.add(this.activeId); toast('Nice — topic marked as studied.', 'good'); }
    store.set('bece_studied', [...studied]);
    this.renderStudied(this.activeId);
    this.renderSidebar(this.list());
    replayMotion($('note-studied'), 'motion-note-study-toggle');
    if (!wasStudied) {
      const completionMark = $('notes-sidebar')?.querySelector('.topic-item[aria-current="true"] .topic-done');
      if (completionMark) replayMotion(completionMark, 'motion-topic-completion');
    }
  },
  step(delta) {
    const list = this.list();
    const idx = list.findIndex(n => n.id === this.activeId);
    if (delta > 0 && idx === list.length - 1) { Setup.open(this.sub); return; }
    const target = list[idx + delta];
    if (!target) return;
    this.selectTopic(target.id);
  },
  scrollToReader() {
    const reader = $('note-reader');
    const top = reader.getBoundingClientRect().top + window.scrollY - (document.getElementById('site-nav').offsetHeight + 12);
    if (window.scrollY > top || window.innerWidth < 760) window.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' });
    $('note-header-title').focus({ preventScroll: true });
  },
  applyFont() {
    document.body.dataset.font = this.font;
    document.querySelectorAll('[data-font]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.font === this.font)));
  },
};
document.querySelectorAll('[data-notes-sub]').forEach(b => b.addEventListener('click', () => {
  const changed = Notes.sub !== b.dataset.notesSub;
  if (!changed) return;
  Notes.sub = b.dataset.notesSub;
  Notes.activeId = null;
  Notes.refresh({ animateTopicEntrance: true });
  replayMotion(b, 'motion-note-subject-selected');
}));
document.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => {
  const changed = Notes.level !== b.dataset.level;
  if (!changed) return;
  Notes.level = b.dataset.level;
  const activeTopicRemains = Notes.list().some(note => note.id === Notes.activeId);
  Notes.refresh({ animateTopicEntrance: !activeTopicRemains });
  replayMotion(b, 'motion-note-level-selected');
}));
document.querySelectorAll('[data-font]').forEach(b => b.addEventListener('click', () => {
  const changed = Notes.font !== b.dataset.font;
  Notes.font = b.dataset.font;
  store.set('bece_font', Notes.font);
  Notes.applyFont();
  if (changed) replayMotion(b, 'motion-note-font-selected');
}));
let searchTimer;
$('note-search').addEventListener('input', event => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { Notes.query = event.target.value.toLowerCase().trim(); Notes.refresh(); }, 150);
});
$('note-prev-btn').addEventListener('click', () => Notes.step(-1));
$('note-next-btn').addEventListener('click', () => Notes.step(1));
$('note-studied').addEventListener('click', () => Notes.toggleStudied());
document.querySelector('[data-action="notes-practise"]').addEventListener('click', () => Setup.open(Notes.sub));
// Reading progress bar for the open note.
let progressFrame = 0;
window.addEventListener('scroll', () => {
  if (currentScreen !== 'notes' || progressFrame) return;
  progressFrame = requestAnimationFrame(() => {
    progressFrame = 0;
    const reader = $('note-reader');
    const rect = reader.getBoundingClientRect();
    const total = rect.height - window.innerHeight * 0.6;
    const pct = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
    $('reading-progress').style.transform = `scaleX(${pct})`;
  });
}, { passive: true });

// Career Technology essay practice — includes clear BECE-style questions and self-check points.
sectionBDB.careerTechnology = [
  { id:'sb-car-1', topic:'Workshop Safety', marks:10,
    question:'State five safety rules that should be followed in a school workshop and explain why each rule is important.',
    scheme:['Any five suitable rules with a reason for each (2 marks each):','• Wear suitable protective clothing and footwear to protect the body.','• Keep tools in their correct places to prevent accidents.','• Do not run or play in the workshop to avoid collisions and falls.','• Follow the teacher’s instructions before using equipment.','• Keep the floor clean and dry to prevent slipping.','• Report damaged tools and equipment so they are not used accidentally.','• Switch off equipment after use, with the teacher’s permission.','Total: 10 marks']
  },
  { id:'sb-car-2', topic:'Design Process', marks:10,
    question:'Explain five stages a learner can follow when designing and making a useful product to solve a simple everyday problem.',
    scheme:['Award marks for five clearly explained stages:','• Identify the problem or need.','• Research the problem and gather useful information.','• Generate and sketch possible ideas.','• Select the best idea and prepare a plan or working drawing.','• Choose suitable materials, tools and equipment.','• Make the product by following the plan.','• Test the product and evaluate how well it solves the problem.','• Suggest improvements where necessary.','Total: 10 marks']
  },
  { id:'sb-car-3', topic:'Food and Nutrition', marks:10,
    question:'(a) What is a balanced diet? (b) Name four classes of food and give one function of each. (c) State two ways of keeping food safe.',
    scheme:['(a) Balanced diet — 2 marks:','A diet containing the different nutrients in the right amounts for the body’s needs.','(b) Any four classes and functions — 6 marks:','• Carbohydrates — provide energy.','• Proteins — support growth and repair of body tissues.','• Fats and oils — provide stored energy and help keep the body warm.','• Vitamins — help protect the body and keep it healthy.','• Minerals — support healthy bones, teeth and body functions.','• Water — helps transport substances and regulate body temperature.','(c) Food safety — any two — 2 marks:','• Wash hands and utensils before preparing food.','• Cook food thoroughly and store it covered at safe temperatures.','• Wash fruits and vegetables with safe water.','Total: 10 marks']
  }
];

/* ======================= Essay workshop ======================= */
const Essays = {
  sub: 'social',
  idx: 0,
  saveTimer: null,
  saveErrorShown: false,
  enter() { this.render(); },
  list() { return Array.isArray(sectionBDB[this.sub]) ? sectionBDB[this.sub] : []; },
  key(q) { return `bece_essay_${q.id}`; },
  setSaveStatus(state, message) {
    const note = $('essay-save-note');
    if (!note) return;
    note.dataset.state = state;
    note.textContent = message;
    if (state === 'saved') replayMotion(note, 'motion-essay-draft-saved');
    else if (state === 'error') replayMotion(note, 'motion-essay-draft-error');
  },
  render() {
    const list = this.list();
    if (!list.length) {
      $('sb-picker').replaceChildren();
      $('sb-topic').textContent = 'Questions coming soon';
      $('sb-q').textContent = 'Essay practice for this subject is being prepared.';
      $('sb-marks').textContent = '';
      $('essay-plan').replaceChildren(el('p', '', 'Choose another subject while this set is being added.'));
      $('sb-ans').value = '';
      $('sb-scheme').hidden = true;
      $('sb-prev').disabled = true;
      $('sb-next').disabled = true;
      return;
    }
    this.idx = Math.max(0, Math.min(this.idx, list.length - 1));
    const q = list[this.idx];
    document.querySelectorAll('[data-sb-sub]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sbSub === this.sub)));
    const picker = $('sb-picker');
    picker.replaceChildren();
    list.forEach((item, index) => {
      const chip = el('button', 'chip', `Q${index + 1}`);
      chip.type = 'button';
      chip.setAttribute('aria-pressed', String(index === this.idx));
      chip.setAttribute('aria-label', `Question ${index + 1}: ${item.topic}${store.get(this.key(item), '') ? ' (draft saved)' : ''}`);
      if (store.get(this.key(item), '')) chip.classList.add('has-draft');
      chip.addEventListener('click', () => {
        if (this.idx === index) return;
        this.save();
        this.idx = index;
        this.render();
      });
      picker.append(chip);
    });
    $('sb-topic').textContent = q.topic;
    $('sb-q').textContent = q.question;
    document.querySelectorAll('.q-diagram').forEach(n => n.remove());
    if (q.diagram) { const dg = el('div', 'q-diagram'); dg.innerHTML = q.diagram; $('sb-q').after(dg); }
    $('sb-marks').textContent = `${q.marks} marks`;
    $('sb-ans').value = store.get(this.key(q), '');
    this.updateCount();
    $('essay-save-note').dataset.state = 'idle';
    $('essay-save-note').textContent = $('sb-ans').value ? 'Draft restored' : 'Draft saves automatically';

    const plan = essayPlans[q.id];
    const panel = $('essay-plan');
    panel.replaceChildren(el('p', 'label', `Question ${this.idx + 1} of ${list.length} · Understand the task`));
    if (plan) {
      panel.append(el('p', '', plan.task));
      const details = el('details');
      details.append(el('summary', '', 'Help me plan my answer'));
      const steps = el('ol');
      plan.steps.forEach(step => steps.append(el('li', '', step)));
      details.append(steps, el('p', 'label', 'One example to get you thinking'), el('p', '', plan.example));
      panel.append(details);
    }
    $('sb-scheme').hidden = true;
    $('sb-guide-btn').setAttribute('aria-expanded', 'false');
    $('sb-guide-btn').textContent = 'Answer guide';
    document.querySelectorAll('.self-check input').forEach(input => { input.checked = false; });
    $('sb-prev').disabled = this.idx === 0;
    $('sb-next').disabled = this.idx === list.length - 1;
  },
  updateCount() {
    const count = $('sb-ans').value.trim().split(/\s+/).filter(Boolean).length;
    $('word-count').textContent = plural(count, 'word');
  },
  save() {
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    const q = this.list()[this.idx];
    if (!q) return false;
    const text = $('sb-ans').value;
    const key = this.key(q);
    try {
      if (text.trim()) {
        const serialized = JSON.stringify(text);
        localStorage.setItem(key, serialized);
        if (localStorage.getItem(key) !== serialized) throw new Error('DRAFT_WRITE_NOT_CONFIRMED');
      } else {
        localStorage.removeItem(key);
      }
      this.saveErrorShown = false;
      const savedAt = text.trim()
        ? `Saved ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
        : 'Draft saves automatically';
      this.setSaveStatus('saved', savedAt);
      const chip = $('sb-picker').children[this.idx];
      chip?.classList.toggle('has-draft', Boolean(text.trim()));
      chip?.setAttribute('aria-label', `Question ${this.idx + 1}: ${q.topic}${text.trim() ? ' (draft saved)' : ''}`);
      return true;
    } catch (error) {
      this.setSaveStatus('error', 'Couldn’t save draft · try again');
      if (!this.saveErrorShown) {
        toast('This draft could not be saved on this device. Check your browser storage and try again.', 'warn');
        this.saveErrorShown = true;
      }
      return false;
    }
  },
  toggleGuide() {
    const box = $('sb-scheme');
    const q = this.list()[this.idx];
    if (box.hidden) {
      const content = $('sb-scheme-content');
      content.replaceChildren();
      let listNode = null;
      (q.scheme || ['A practice answer guide has not been added for this question yet.']).forEach(line => {
        if (!line.trim()) { listNode = null; return; }
        if (line.trim().startsWith('•')) {
          if (!listNode) { listNode = el('ul'); content.append(listNode); }
          listNode.append(el('li', '', line.replace(/^\s*•\s*/, '')));
        } else { listNode = null; content.append(el('p', 'guide-heading', line)); }
      });
    }
    box.hidden = !box.hidden;
    $('sb-guide-btn').setAttribute('aria-expanded', String(!box.hidden));
    $('sb-guide-btn').textContent = box.hidden ? 'Answer guide' : 'Hide guide';
    if (!box.hidden) box.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  },
};
document.querySelectorAll('[data-sb-sub]').forEach(b => b.addEventListener('click', () => {
  if (Essays.sub === b.dataset.sbSub) return;
  Essays.save();
  Essays.sub = b.dataset.sbSub;
  Essays.idx = 0;
  Essays.render();
}));
$('sb-ans').addEventListener('input', () => {
  Essays.updateCount();
  Essays.setSaveStatus('saving', 'Saving…');
  clearTimeout(Essays.saveTimer);
  Essays.saveTimer = setTimeout(() => Essays.save(), 500);
});
$('sb-prev').addEventListener('click', () => {
  if (Essays.idx > 0) {
    Essays.save();
    Essays.idx--;
    Essays.render();
  }
});
$('sb-next').addEventListener('click', () => {
  if (Essays.idx < Essays.list().length - 1) {
    Essays.save();
    Essays.idx++;
    Essays.render();
  }
});
$('sb-guide-btn').addEventListener('click', () => Essays.toggleGuide());
document.querySelector('[data-action="copy-essay"]').addEventListener('click', async () => {
  Essays.save();
  const text = $('sb-ans').value;
  if (!text.trim()) { toast('Write something first.'); return; }
  try { await navigator.clipboard.writeText(text); toast('Copied to your clipboard.', 'good'); }
  catch { $('sb-ans').select(); toast('Select-all done — press Ctrl+C (or long-press) to copy.'); }
});
document.querySelector('[data-action="clear-essay"]').addEventListener('click', async () => {
  const answer = $('sb-ans');
  if (!answer.value.trim()) return;
  if (!(await confirmDialog('Clear this draft?', 'Your response to this question will be deleted from this browser.', 'Clear draft', 'Cancel'))) return;
  const previous = answer.value;
  answer.value = '';
  if (!Essays.save()) {
    answer.value = previous;
    Essays.updateCount();
    return;
  }
  Essays.updateCount();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') Essays.save();
});
window.addEventListener('pagehide', () => Essays.save());

/* ======================= Flashcards ======================= */
(() => {
  const get = id => $(`flash-${id}`);
  let cards = [], revisit = [], index = 0, remembered = 0, revealed = false;

  function updateTopics() {
    const topics = [...new Set(questionsDB[get('subject').value].map(q => q.topic))].sort();
    get('topic').replaceChildren(new Option('All topics', 'all'), ...topics.map(t => new Option(t, t)));
  }
  function reset() {
    cards = []; revisit = []; index = 0; remembered = 0; revealed = false;
    get('session').hidden = true; get('summary').hidden = true; get('idle').hidden = false;
    get('start').textContent = 'Start a round';
  }
  function start(pool) {
    cards = shuffle(pool).slice(0, 10);
    if (!cards.length) { reset(); return; }
    revisit = []; index = 0; remembered = 0;
    get('idle').hidden = true; get('summary').hidden = true; get('session').hidden = false;
    get('start').textContent = 'Restart round';
    show();
  }
  function freshRound() {
    const topic = get('topic').value;
    start(questionsDB[get('subject').value].filter(q => topic === 'all' || q.topic === topic));
  }
  function show() {
    revealed = false;
    const q = cards[index];
    get('count').textContent = `Card ${index + 1} of ${cards.length}`;
    get('confidence').textContent = `${remembered} remembered · ${revisit.length} to revisit`;
    get('progress').max = cards.length;
    get('progress').value = index;
    get('label').textContent = q.topic;
    get('question').textContent = q.question;
    const needsChoices = true;
    const list = get('options');
    list.replaceChildren(...(needsChoices ? q.options.map(o => { const li = document.createElement('li'); li.textContent = o.key + '.  ' + o.text; return li; }) : []));
    list.hidden = !needsChoices;
    get('correct').textContent = q.options.find(o => o.key === q.correct).text;
    get('explanation').textContent = q.explanation;
    get('flip').classList.remove('is-flipped');
    replayMotion(get('flip'), 'motion-flash-card-enter');
    get('answer').hidden = true;
    get('rating').hidden = true;
    get('reveal').hidden = false;
    get('card').focus({ preventScroll: true });
  }
  function reveal() {
    if (revealed || get('session').hidden) return;
    revealed = true;
    get('answer').hidden = false;
    get('flip').classList.add('is-flipped');
    get('rating').hidden = false;
    get('reveal').hidden = true;
    get('known').focus({ preventScroll: true });
  }
  function rate(known) {
    if (!revealed || get('session').hidden) return;
    if (known) remembered++; else revisit.push(cards[index]);
    index++;
    if (index < cards.length) {
      show();
      replayMotion(get('confidence'), 'motion-flash-confidence-update');
      return;
    }
    get('session').hidden = true;
    get('summary').hidden = false;
    get('summary-title').textContent = `${remembered} of ${cards.length} remembered.`;
    replayMotion(get('summary-title'), 'motion-flash-summary-arrival');
    get('summary-copy').textContent = revisit.length
      ? `${revisit.length} ${revisit.length === 1 ? 'idea needs' : 'ideas need'} another look. Try them again while the explanations are fresh.`
      : 'You recalled every answer in this round. Try a fresh selection or explore another topic.';
    get('retry').hidden = !revisit.length;
    get('summary').focus({ preventScroll: true });
  }
  get('subject').addEventListener('change', () => { updateTopics(); reset(); });
  get('topic').addEventListener('change', reset);
  get('start').addEventListener('click', freshRound);
  get('new').addEventListener('click', freshRound);
  get('reveal').addEventListener('click', reveal);
  get('card').addEventListener('click', reveal);
  get('again').addEventListener('click', () => rate(false));
  get('known').addEventListener('click', () => rate(true));
  get('retry').addEventListener('click', () => start(revisit));
  $('flashcard-studio').addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || isTyping(event.target) || get('session').hidden) return;
    if ((event.code === 'Space' || event.key === 'Enter') && !revealed && event.target.tagName !== 'BUTTON') { event.preventDefault(); reveal(); }
    else if (revealed && ['1', '2'].includes(event.key)) { event.preventDefault(); rate(event.key === '2'); }
  });
  updateTopics();
})();

/* ======================= Public API for social.js ======================= */
window.App = {
  on: (name, fn) => bus.addEventListener(name, e => fn(e.detail)),
  navigate,
  toast,
  dismissOverlay,
  el,
  icon,
  questionById: id => questionIndex.get(id),
  startQuiz: opts => Quiz.start(opts),
  get screen() { return currentScreen; },
  get quizKind() { return Quiz.opts?.kind; },
};

onRouteChange();

