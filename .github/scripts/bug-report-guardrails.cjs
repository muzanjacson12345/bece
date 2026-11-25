'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const read = path => fs.readFileSync(path, 'utf8');
const worker = read('workers/gems-api/src/index.js');
const app = read('js/08-app-module.js');
const capture = read('js/11-bug-capture.js');
const rules = read('firestore.rules');

function section(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, label + ' section markers must exist');
  return source.slice(start, end);
}

// A retry must search for the exact immutable report marker and verify the
// marker in the returned issue body before reusing an existing GitHub issue.
const createIssue = section(
  worker,
  'async function createOrFindGithubBugIssue',
  'async function handleBugSync',
  'GitHub issue creation'
);
assert.match(createIssue, /const marker = 'BECE_REPORT_ID:' \+ reportId/);
assert.match(createIssue, /in:body/);
assert.match(createIssue, /found\.items\.find\(item => String\(item\.body \|\| ''\)\.includes\('<\!-- ' \+ marker \+ ' -->'\)\)/);
assert.match(createIssue, /'- Report reference: ' \+ marker/);
const searchStart = createIssue.indexOf("const query = 'repo:muzanjacson12345/bece in:body");
const createAfterSearch = createIssue.indexOf('if (!issue) {', searchStart);
assert.ok(searchStart >= 0 && createAfterSearch > searchStart, 'the exact-marker search must happen before issue creation');
assert.ok(
  !createIssue.slice(searchStart, createAfterSearch).includes('catch'),
  'GitHub search failures must fail closed instead of creating a possible duplicate'
);

// Public GitHub issues contain only anonymised tracking metadata, not the
// player's free-text description, Firebase UID, display name, or screenshots.
const publicBody = section(createIssue, 'const body = [', "].join('\\n');", 'public GitHub issue body');
for (const privateField of [
  "bugStringField(report, 'text'",
  "bugStringField(report, 'uid'",
  "bugStringField(report, 'name'",
  'originalData',
  'annotatedData'
]) {
  assert.ok(!publicBody.includes(privateField), 'public issue body must not expose ' + privateField);
}
assert.match(publicBody, /Original BECE status/);
assert.match(publicBody, /Current BECE status/);
assert.match(worker, /async function syncGithubBugStatus/);
assert.match(worker, /action === 'syncStatus'/);
assert.match(worker, /if \(role !== 'owner'\)/);

// Owner/Admin actions are validated with live Firestore sessions, and the
// legacy migration iterates Firestore pages rather than the latest-200 UI feed.
assert.match(worker, /ownerSessions\//);
assert.match(worker, /adminSessions\//);
assert.match(worker, /config\/owner/);
assert.match(worker, /config\/admin/);
assert.match(worker, /nextPageToken/);
assert.match(worker, /GITHUB_SYNC_NOT_CONFIGURED/);
assert.match(worker, /env\.GITHUB_TOKEN/);

// Capture metadata follows the page actually captured. Privacy covers are
// baked into both the original and marked-up copies before private storage.
assert.match(capture, /sourceMeta\.screen/);
assert.match(capture, /sourceMeta\.route/);
assert.match(capture, /const privacyCovers = strokes\.filter\(stroke => stroke\.tool === 'cover'\)/);
assert.match(capture, /privacyCovers\.forEach\(stroke => drawStroke\(originalContext, stroke\)\)/);
assert.match(capture, /originalData: original\.data/);
assert.match(capture, /annotatedData: annotated\.data/);
assert.match(app, /screen: String\(\(screenshot && screenshot\.screen\) \|\| App\.screen/);

// Private attachment access, upload restrictions, and cleanup are enforced
// both in Firestore rules and in the Owner deletion actions.
assert.match(rules, /match \/attachments\/\{attachmentId\}/);
assert.match(rules, /get\(parentReportPath\(\)\)\.data\.get\('uid', ''\) == request\.auth\.uid \|\| isStaff\(\)/);
assert.match(rules, /request\.resource\.data\.originalData\.size\(\) <= 320000/);
assert.match(rules, /request\.resource\.data\.annotatedData\.size\(\) <= 320000/);
assert.match(rules, /request\.resource\.data\.redactedOriginal is bool/);
assert.match(app, /batch\.delete\(ref\.collection\('attachments'\)\.doc\('screenshot'\)\)/);
assert.match(app, /b\.delete\(ref\.collection\('attachments'\)\.doc\('screenshot'\)\)/);

console.log('Bug-report guardrails passed: exact-marker fail-closed sync, public/private data boundary, live staff sessions, migration paging, screenshot redaction, and attachment access/cleanup.');
