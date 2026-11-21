const fs = require('node:fs');
const expected = 'draft/firestore-rules-gems-foundation-2026-11-21';
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== expected) throw new Error('Draft branch only.');

const file = 'index.html';
let source = fs.readFileSync(file, 'utf8');
const start = source.indexOf('function ownerEventDraftCard()');
const end = source.indexOf('function ownerTab()', start);
if (start < 0 || end <= start) throw new Error('Owner event draft card boundaries not found.');
let block = source.slice(start, end);

const retryField = '  const retryLimit = field("Maximum retries per entry", "number", "1–20");';
const scheduleFields = retryField + '\n' +
  '  const opensAt = field("Opens at (optional)", "datetime-local", "");\n' +
  '  const closesAt = field("Closes at (optional)", "datetime-local", "");';
if (!block.includes('const opensAt = field(')) {
  if (!block.includes(retryField)) throw new Error('Retry limit field marker not found.');
  block = block.replace(retryField, scheduleFields);
}

const layoutOld = 'retryField, retryFee.label, retryLimit.label)';
const layoutNew = 'retryField, retryFee.label, retryLimit.label, opensAt.label, closesAt.label)';
if (block.includes(layoutOld)) block = block.replace(layoutOld, layoutNew);
else if (!block.includes('opensAt.label, closesAt.label')) throw new Error('Owner event layout marker not found.');

const userMarker = '    const user = firebase.auth().currentUser;';
const scheduleValidation = [
  '    const openTime = opensAt.input.value ? new Date(opensAt.input.value).getTime() : null;',
  '    const closeTime = closesAt.input.value ? new Date(closesAt.input.value).getTime() : null;',
  '    if ((openTime !== null && (!Number.isSafeInteger(openTime) || openTime < 0)) || (closeTime !== null && (!Number.isSafeInteger(closeTime) || closeTime < 0))) return App.toast("Check the event opening and closing times.", "warn");',
  '    if (openTime !== null && closeTime !== null && openTime >= closeTime) return App.toast("The closing time must be later than the opening time.", "warn");'
].join('\n');
if (!block.includes('const openTime = opensAt.input.value')) {
  const i = block.indexOf(userMarker);
  if (i < 0) throw new Error('Owner event save validation marker not found.');
  block = block.slice(0, i) + scheduleValidation + '\n' + block.slice(i);
}

const payloadOld = 'maxRetriesPerEntry: retries })';
const payloadNew = 'maxRetriesPerEntry: retries, opensAt: openTime, closesAt: closeTime })';
if (block.includes(payloadOld)) block = block.replace(payloadOld, payloadNew);
else if (!block.includes('opensAt: openTime, closesAt: closeTime')) throw new Error('Owner event request payload marker not found.');

source = source.slice(0, start) + block + source.slice(end);
fs.writeFileSync(file, source, 'utf8');
console.log('Added optional opening and closing date/time fields to Owner event drafts.');
