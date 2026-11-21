const fs = require('node:fs');
const expected = 'draft/firestore-rules-gems-foundation-2026-11-21';
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== expected) throw new Error('Draft branch only.');
const file = 'index.html';
let source = fs.readFileSync(file, 'utf8');

const hasQuestionIds = /questionIds\\s*:\\s*subject\\s*=>/.test(source);
if (!hasQuestionIds) {
  const lookup = /questionById\\s*:\\s*id\\s*=>\\s*questionIndex\\.get\\(id\\)\\s*,/;
  if (!lookup.test(source)) throw new Error('Could not find the public questionById lookup.');
  source = source.replace(lookup, match => match + ' questionIds: subject => [...questionIndex.entries()].filter(([, q]) => !subject || q.subject === subject).map(([questionId]) => questionId),');
}

const titleMarker = '  const title = field("Event name", "text", "Event title", 80);';
const questionFields = [
  '  const questionCount = field("Questions per attempt", "number", "3–50");',
  '  const questionSubject = document.createElement("select"); questionSubject.className = "adm-sel"; questionSubject.setAttribute("aria-label", "Event question subject");',
  '  [["", "Mixed subjects"], ["maths", "Mathematics"], ["social", "Social Studies"], ["arts", "Creative Arts"], ["computing", "Computing"], ["rme", "RME"], ["integratedScience", "Integrated Science"], ["french", "French"]].forEach(([value, label]) => questionSubject.append(new Option(label, value)));',
  '  const questionSubjectField = elx("label", "adm-info", "Question subject", questionSubject);'
].join("\n");
if (!source.includes('const questionCount = field("Questions per attempt"')) {
  if (!source.includes(titleMarker)) throw new Error('Event title field marker not found.');
  source = source.replace(titleMarker, titleMarker + "\n" + questionFields);
}

const layoutOld = 'eventId.label, title.label, entryFee.label, entryLimit.label, retryField, retryFee.label, retryLimit.label';
const layoutNew = 'eventId.label, title.label, questionSubjectField, questionCount.label, entryFee.label, entryLimit.label, retryField, retryFee.label, retryLimit.label';
if (source.includes(layoutOld)) source = source.replace(layoutOld, layoutNew);
else if (!source.includes(layoutNew)) throw new Error('Event form field layout marker not found.');

const userMarker = '    const user = firebase.auth().currentUser;';
const questionSelection = [
  '    const count = Number(questionCount.input.value);',
  '    if (!Number.isSafeInteger(count) || count < 3 || count > 50) return App.toast("Choose between 3 and 50 questions.", "warn");',
  '    if (typeof App.questionIds !== "function") return App.toast("The question bank is not available. Refresh the app and try again.", "warn");',
  '    const pool = App.questionIds(questionSubject.value || null);',
  '    if (!Array.isArray(pool) || pool.length < count) return App.toast("There are not enough questions in that subject. Choose a smaller count or mixed subjects.", "warn");',
  '    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }',
  '    const questionIds = pool.slice(0, count);'
].join("\n");
if (!source.includes('const questionIds = pool.slice(0, count);')) {
  const start = source.indexOf('function ownerEventDraftCard()');
  const i = source.indexOf(userMarker, start);
  if (i < 0) throw new Error('Owner event save handler insertion point not found.');
  source = source.slice(0, i) + questionSelection + "\n" + source.slice(i);
}

const bodyOld = 'body: JSON.stringify({ eventId: id, title: name, description: description.value.trim(), entryCostCoins: cost, maxEntriesPerUser: limit, retryEnabled: retry, retryCostCoins: retryCost, maxRetriesPerEntry: retries })';
const bodyNew = 'body: JSON.stringify({ eventId: id, title: name, description: description.value.trim(), questionIds, entryCostCoins: cost, maxEntriesPerUser: limit, retryEnabled: retry, retryCostCoins: retryCost, maxRetriesPerEntry: retries })';
if (source.includes(bodyOld)) source = source.replace(bodyOld, bodyNew);
else if (!source.includes('body: JSON.stringify({ eventId: id, title: name, description: description.value.trim(), questionIds,')) throw new Error('Event draft request body marker not found.');

fs.writeFileSync(file, source, 'utf8');
console.log('Owner event drafts now choose a subject and a random set of 3–50 questions from the existing question bank.');
