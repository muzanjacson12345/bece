const fs = require("node:fs");

const EXPECTED_BRANCH = "draft/firestore-rules-gems-foundation-2026-11-21";
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== EXPECTED_BRANCH) {
  throw new Error("This draft-only migration must not run outside " + EXPECTED_BRANCH);
}

const file = "index.html";
let source = fs.readFileSync(file, "utf8");
const operationExpression = "const operationId = pendingPowerupOperationId || (pendingPowerupOperationId = crypto.randomUUID());";
if (source.includes(operationExpression)) {
  console.log("Second Chance retries already reuse their operation ID.");
  process.exit(0);
}

const startToken = "      scBtn.onclick = async () => {";
const endToken = "      const nextBtn = document.createElement('button');";
const start = source.indexOf(startToken);
if (start < 0 || source.indexOf(startToken, start + startToken.length) >= 0) {
  throw new Error("Expected exactly one migrated Second Chance click handler.");
}
const end = source.indexOf(endToken, start);
if (end < 0) throw new Error("Could not find the end of the Second Chance click handler.");

let section = source.slice(start, end);
const operationOld = "          const operationId = crypto.randomUUID();";
if ((section.split(operationOld).length - 1) !== 1) {
  throw new Error("Expected exactly one operation ID inside the Second Chance handler.");
}
section = section.replace(operationOld, "          " + operationExpression);

const resultOld = "          if (!Number.isSafeInteger(result.quantity) || result.quantity < 0 || result.itemId !== 'p50') {";
if ((section.split(resultOld).length - 1) !== 1) {
  throw new Error("Could not find the validated Second Chance result.");
}
section = section.replace(
  resultOld,
  "          pendingPowerupOperationId = null;\n" + resultOld
);

const pendingDeclaration = "      let pendingPowerupOperationId = null;\n";
source = source.slice(0, start) + pendingDeclaration + section + source.slice(end);
fs.writeFileSync(file, source, "utf8");
console.log("Second Chance retries now reuse the same idempotency receipt ID.");
