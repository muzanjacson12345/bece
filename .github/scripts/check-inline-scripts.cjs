const fs = require('node:fs');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const html = fs.readFileSync('index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
if (!scripts.length) throw new Error('No script elements were found in index.html.');

let checked = 0;
let skipped = 0;
for (let i = 0; i < scripts.length; i++) {
  const attributes = scripts[i][1] || '';
  const code = (scripts[i][2] || '').trim();
  const typeMatch = attributes.match(/\btype\s*=\s*([^\s>]+)/i);
  const type = (typeMatch ? typeMatch[1] : 'text/javascript').replace(/[\"']/g, '').toLowerCase();
  if (/\bsrc\s*=/.test(attributes) || !code || /^(application\/(json|ld\+json)|importmap|text\/template)$/.test(type)) {
    skipped++;
    continue;
  }
  if (type === 'module') {
    const result = spawnSync(process.execPath, ['--check', '--input-type=module'], { input: code, encoding: 'utf8' });
    if (result.status !== 0) throw new Error('Inline module script ' + (i + 1) + ' failed syntax validation:\n' + (result.stderr || result.stdout));
  } else if (type === 'text/javascript' || type === 'application/javascript' || type === 'application/ecmascript' || type === 'text/ecmascript') {
    new vm.Script(code, { filename: 'index-inline-script-' + (i + 1) + '.js' });
  } else {
    skipped++;
    continue;
  }
  checked++;
}

if (!checked) throw new Error('No inline JavaScript scripts were syntax-checked.');
console.log('Inline app JavaScript syntax check passed:', checked, 'script(s);', skipped, 'non-JavaScript or external script(s) skipped.');
