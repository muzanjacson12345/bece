const fs = require("node:fs");

const EXPECTED_BRANCH = "draft/firestore-rules-gems-foundation-2026-11-21";
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== EXPECTED_BRANCH) {
  throw new Error("This draft-only migration must not run outside " + EXPECTED_BRANCH);
}

const file = "index.html";
let source = fs.readFileSync(file, "utf8");
const operationExpression = "const operationId = pendingPowerupOperationId || (pendingPowerupOperationId = crypto.randomUUID());";
const validation = "if (!Number.isSafeInteger(result.quantity) || result.quantity < 0 || result.itemId !== 'p50') {\\n            throw new Error('The power-up service returned an invalid result.');\\n          }";
const clearBeforeValidation = "          const result = data.result;\\n          pendingPowerupOperationId = null;\\n          " + validation;
const clearAfterValidation = "          const result = data.result;\\n          " + validation + "\\n          pendingPowerupOperationId = null;";

if (source.includes(clearBeforeValidation)) {
  source = source.replace(clearBeforeValidation, clearAfterValidation);
  fs.writeFileSync(file, source, "utf8");
  console.log("Moved retry ID reset until after the server result is validated.");
  process.exit(0);
}
if (source.includes(operationExpression) && source.includes(clearAfterValidation)) {
  console.log("Second Chance retries already preserve the ID until result validation.");
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

const resultOld = "          const result = data.result;\\n          " + validation;
if ((section.split(resultOld).length - 1) !== 1) {
  throw new Error("Could not find the Second Chance result validation.");
}
section = section.replace(resultOld, clearAfterValidation.trimEnd());

const pendingDeclaration = "      let pendingPowerupOperationId = null;\\n";
source = source.slice(0, start) + pendingDeclaration + section + source.slice(end);
fs.writeFileSync(file, source, "utf8");
console.log("Second Chance retries now reuse the same ID until a valid receipt is received.");
