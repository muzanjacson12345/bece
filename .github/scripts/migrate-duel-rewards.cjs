const fs = require("node:fs");

const EXPECTED_BRANCH = "draft/firestore-rules-gems-foundation-2026-11-21";
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== EXPECTED_BRANCH) {
  throw new Error("This draft-only migration must not run outside " + EXPECTED_BRANCH);
}

const file = "index.html";
let source = fs.readFileSync(file, "utf8");

const doubleCountedStreak = "    D.streak = ok ? (D.streak || 0) + 1 : 0; if (D.streak > (D.best || 0)) D.best = D.streak;\n";
if (source.includes(doubleCountedStreak)) {
  source = source.replace(doubleCountedStreak, "");
  fs.writeFileSync(file, source, "utf8");
  console.log("Removed the duplicate local increment of the server-verified Duel streak.");
  process.exit(0);
}

if (source.includes("duelApi('/duels/answer'") && source.includes("duelApi('/duels/settle'")) {
  console.log("Duel answers and rewards already use the trusted Worker.");
  process.exit(0);
}

function replaceOnce(oldText, newText, label) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(label + ": expected one match, found " + count);
  source = source.replace(oldText, newText);
}

function replaceBefore(targetToken, oldText, newText, label) {
  const target = source.indexOf(targetToken);
  if (target < 0 || source.indexOf(targetToken, target + targetToken.length) >= 0) {
    throw new Error(label + ": could not identify one target section.");
  }
  const at = source.lastIndexOf(oldText, target);
  if (at < 0) throw new Error(label + ": source marker not found before target.");
  source = source.slice(0, at) + newText + source.slice(at + oldText.length);
}

function replaceBetween(startToken, endToken, newText, label) {
  const start = source.indexOf(startToken);
  if (start < 0 || source.indexOf(startToken, start + startToken.length) >= 0) {
    throw new Error(label + ": expected exactly one start marker.");
  }
  const end = source.indexOf(endToken, start + startToken.length);
  if (end < 0) throw new Error(label + ": end marker was not found.");
  source = source.slice(0, start) + newText + source.slice(end);
}

replaceBefore(
  "function record(out, forceCoins)",
  "  const warn = m => App.toast(m, 'warn');",
  `  const warn = m => App.toast(m, 'warn');
  async function duelApi(path, payload) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Please reconnect your sign-in.');
    const token = await user.getIdToken();
    const response = await fetch('https://bece-hub-gems-api.abeikcrentsil.workers.dev' + path, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      credentials: 'omit',
      cache: 'no-store',
      body: JSON.stringify(payload)
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error('The secure Duel service returned an unreadable response.'); }
    if (!response.ok || !data || !data.ok) {
      if (response.status === 401) throw new Error('Please reconnect your sign-in.');
      throw new Error(data && data.error ? data.error : 'The secure Duel service could not complete this action.');
    }
    return data;
  }`,
  "add authenticated Duel API helper"
);

replaceOnce(
  "  function begin() { D.started = true; D.used = 0; D.idx = 0; D.log = []; D.streak = 0; D.best = 0; D.oppN = 0; D.me = { c: 0, n: 0, ms: 0, done: false }; ask(); }",
  `  async function begin() {
    D.started = true; D.used = 0; D.idx = 0; D.log = []; D.streak = 0; D.best = 0;
    D.oppN = 0; D.me = { c: 0, n: 0, ms: 0, done: false };
    D.pendingAnswer = null; D.settleBusy = false; D.settlementShown = false;
    try {
      await duelApi('/duels/start', { code: D.code });
      if (D.code) ask();
    } catch (e) {
      D.started = false;
      warn('Could not start the secure Duel. ' + ((e && e.message) || 'Please try again.'));
      close();
    }
  }`,
  "initialize the secure Duel session"
);

replaceOnce("  function ask() {", "  async function ask() {", "make Duel question loading asynchronous");

replaceOnce(
  `    const id = D.doc.qids[D.idx]; if (!id) return finish();
    const q = App.questionById(id);
    if (!q) { D.me.n++; D.me.ms += secs() * 1000; D.log.push({ id, key: null, ok: false }); D.idx++; return ask(); }
    D.locked = false; D.qStart = Date.now();`,
  `    const id = D.doc.qids[D.idx]; if (!id) return finish();
    try {
      const started = await duelApi('/duels/next', { code: D.code, questionId: id });
      if (!started.result || started.result.questionId !== id) throw new Error('The question clock could not be verified.');
    } catch (e) {
      warn('Could not load the secure Duel question. ' + ((e && e.message) || 'Please try again.'));
      close();
      return;
    }
    const q = App.questionById(id);
    D.locked = false; D.qStart = Date.now();
    if (!q) { answer(null, true); return; }`,
  "start each question on the trusted server"
);

replaceOnce("  function answer(key, secondAttempt) {", "  async function answer(key, secondAttempt) {", "make Duel answers asynchronous");

replaceOnce(
  "    const tok = D.code, q = App.questionById(D.doc.qids[D.idx]), ok = key === q.correct;",
  "    const tok = D.code, questionId = D.doc.qids[D.idx], q = App.questionById(questionId); let ok = !!q && key === q.correct;",
  "remove browser authority over Duel answer correctness"
);

replaceOnce(
  "body: JSON.stringify({ itemId: 'p50', operationId })",
  "body: JSON.stringify({ itemId: 'p50', operationId, duelCode: tok })",
  "bind Second Chance use to this Duel session"
);

replaceOnce(
  `    D.me.n++; D.me.ms += ok ? Date.now() - D.qStart : secs() * 1000; if (ok) D.me.c++;
    D.log.push({ id: q.id, key, ok });`,
  `    const pending = D.pendingAnswer;
    if (pending && (pending.questionId !== questionId || pending.key !== key)) {
      D.locked = false;
      App.toast('Please retry the same answer while the connection recovers.', 'warn');
      return;
    }
    const operationId = pending ? pending.operationId : crypto.randomUUID();
    D.pendingAnswer = pending || { questionId, key, operationId };
    let submitted;
    try {
      submitted = await duelApi('/duels/answer', {
        code: tok, questionId, answerKey: key, operationId
      });
    } catch (e) {
      D.locked = false;
      D.fb.textContent = 'Connection issue. Retrying your answer securely…';
      D.fb.className = 'duel-fb bad';
      if (!D.answerRetryT) {
        D.answerRetryT = setTimeout(() => {
          D.answerRetryT = null;
          if (D.code === tok && D.pendingAnswer) answer(key, secondAttempt);
        }, 1800);
      }
      return;
    }
    const verified = submitted && submitted.result;
    if (!verified || !verified.score || verified.questionId !== questionId
        || verified.score.n !== D.idx + 1) {
      D.locked = false;
      throw new Error('The secure Duel service returned an invalid answer result.');
    }
    clearTimeout(D.answerRetryT); D.answerRetryT = null;
    D.pendingAnswer = null;
    ok = verified.correct === true;
    key = verified.answerKey;
    D.me = { ...verified.score };
    D.streak = verified.streak || 0;
    D.best = verified.best || 0;
    D.log.push({ id: questionId, key, ok });`,
  "send each answer to the server and trust its verified score"
);

replaceOnce(
  `    box.querySelectorAll('.option').forEach(b => { b.disabled = true; b.classList.add(b.dataset.key === q.correct ? 'is-correct' : b.dataset.key === key ? 'is-wrong' : 'is-dim'); });
    const right = (q.options.find(x => x.key === q.correct) || {}).text;`,
  `    const correctKey = q && q.correct;
    box.querySelectorAll('.option').forEach(b => {
      b.disabled = true;
      b.classList.add(b.dataset.key === correctKey ? 'is-correct' : b.dataset.key === key ? 'is-wrong' : 'is-dim');
    });
    const right = q ? ((q.options.find(x => x.key === q.correct) || {}).text) : '';`,
  "make answer feedback safe for unavailable local question data"
);

replaceOnce(
  "    D.dots[D.idx].className = 'duel-dot ' + (ok ? 'ok' : 'bad');",
  "    if (D.dots[D.idx]) D.dots[D.idx].className = 'duel-dot ' + (ok ? 'ok' : 'bad');",
  "guard Duel progress indicator"
);

replaceOnce(
  "  function finish() { D.me.done = true; D.finAt = Date.now(); push(); step(); }",
  "  function finish() { D.me.done = true; D.finAt = Date.now(); step(); }",
  "remove browser-side Duel result submission"
);

replaceBetween(
  "  function record(out, forceCoins) {",
  "  function push()",
  "  function record() { return 0; }\n",
  "remove browser-side Coin reward calculation and player write"
);

const pushStart = source.indexOf("  function push() {");
const pushEnd = pushStart < 0 ? -1 : source.indexOf("\n  function ", pushStart + 1);
if (pushStart < 0 || pushEnd < 0 || source.indexOf("  function push() {", pushStart + 1) >= 0) {
  throw new Error("Could not isolate the Duel score push helper.");
}
source = source.slice(0, pushStart) + "  function push() {}\n" + source.slice(pushEnd + 1);

replaceOnce(
  "    if (D.me && !D.me.done && D.started) { D.me.done = true; D.me.ms += (total() - D.me.n) * secs() * 1000; D.me.n = total(); push(); record('l', 0); }",
  `    if (D.me && !D.me.done && D.started && D.code) {
      const code = D.code;
      clearTimeout(D.answerRetryT); D.answerRetryT = null;
      duelApi('/duels/forfeit', { code }).catch(e => console.warn('Duel forfeit could not be recorded:', e && e.message));
    }`,
  "send Duel forfeits to the trusted server"
);

replaceOnce(
  "    if (D.me && D.me.done) return waitOrResult();",
  "    if (d.settled && D.me) { clearInterval(D.timer); D.me.done = true; return result((d.res || {})[S.uid]); }\n    if (D.me && D.me.done) return waitOrResult();",
  "show server-settled Duel results"
);

replaceBetween(
  "  function result(r) {",
  "    const side = (pid, name, x, w) =>",
  `  async function result(r) {
    if (D.settleBusy || D.settlementShown || !D.code) return;
    D.settleBusy = true;
    let settled;
    try {
      settled = await duelApi('/duels/settle', { code: D.code });
    } catch (e) {
      D.settleBusy = false;
      put(o('p', 'eyebrow', 'Verifying result'), o('h2', '', 'Securing your Duel result…'),
        o('p', 'muted', (e && e.message) || 'The result could not be confirmed yet.'),
        row(btn('Retry', 'btn-primary btn-sm', () => result(r)), btn('Close', 'btn-ghost btn-sm', () => close())));
      return;
    }
    if (settled && settled.waiting) {
      D.settleBusy = false;
      clearTimeout(D.wait);
      put(o('p', 'eyebrow', 'Duel complete'), o('h2', '', 'Finalising the match…'),
        o('p', 'muted', 'Your answers are secured. Waiting for the other player or the result timer.'),
        row(btn('Check again', 'btn-primary btn-sm', () => result(r)), btn('Close', 'btn-ghost btn-sm', () => close())));
      D.wait = setTimeout(() => result(r), Math.max(1000, Number(settled.retryAfterMs) || 3000));
      return;
    }
    const receipt = settled && settled.result;
    if (!receipt || !receipt.me || !receipt.opponent || !receipt.reward) {
      D.settleBusy = false;
      warn('The secure Duel service did not return a complete result.');
      D.wait = setTimeout(() => result(r), 2500);
      return;
    }
    D.settleBusy = false; D.settlementShown = true;
    D.me = { ...receipt.me };
    const me = D.me, opp = receipt.opponent, n = total();
    const tie = receipt.outcome === 'draw', win = receipt.outcome === 'win';
    const cn = receipt.reward.coinsEarned || 0;
    D.coinParts = receipt.reward.parts || [];
    D.bal = receipt.reward.balance;
    D.limit = !!receipt.reward.dailyLimit;
`,
  "settle Duel results and rewards on the server"
);

fs.writeFileSync(file, source, "utf8");
console.log("Duel scoring, answer validation, forfeits, and Coin rewards now use the trusted Worker.");
