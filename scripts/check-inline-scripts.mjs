import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const blocks = [...html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script\\s*>/gi)];
let checked = 0;
const failures = [];

for (let i = 0; i < blocks.length; i++) {
  const attributes = blocks[i][1] || "";
  const code = blocks[i][2] || "";
  if (/\\bsrc\\s*=/.test(attributes) || !code.trim()) continue;

  const isModule = /\\btype\\s*=\\s*["']module["']/i.test(attributes);
  const args = isModule ? ["--check", "--input-type=module"] : ["--check"];
  const result = spawnSync(process.execPath, args, {
    input: code,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024
  });

  if (result.error || result.status !== 0) {
    failures.push({
      script: i + 1,
      attributes,
      output: [result.stdout, result.stderr, result.error?.message].filter(Boolean).join("\\n")
    });
  } else {
    checked++;
  }
}

if (failures.length) {
  for (const failure of failures) {
    process.stderr.write(
      `Inline script #${failure.script} (${failure.attributes || "classic script"}) failed syntax check:\\n${failure.output}\\n`
    );
  }
  process.exitCode = 1;
} else {
  process.stdout.write(`JavaScript syntax check passed for ${checked} inline script blocks.\\n`);
}
