import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = await readFile(fileURLToPath(new URL("../../../gem-marketplace.js", import.meta.url)), "utf8");

test("Gem Marketplace UI fetches its catalogue and purchases only through the trusted Worker", () => {
  assert.match(source, /callWorker\("\/gem-shop\/catalog"/);
  assert.match(source, /callWorker\("\/gem-shop\/purchase"/);
  assert.match(source, /operationId: crypto\.randomUUID\(\)/);
  assert.match(source, /db\.collection\("gemInventories"\)/);
  assert.match(source, /db\.collection\("players"\)\.doc\(currentUser\.uid\)/);
});

test("Gem Marketplace UI supports owned cosmetic equipment and existing useful item counters", () => {
  assert.match(source, /callWorker\("\/gem-shop\/equip"/);
  assert.match(source, /state\.equipped\[item\.slot\]/);
  assert.match(source, /state\.player\[item\.field\]/);
  assert.match(source, /data-gem-frame/);
});

test("Gem Marketplace browser module does not write Gems or inventory directly", () => {
  assert.equal(source.includes(".collection(\"gemInventories\").doc(currentUser.uid).set("), false);
  assert.equal(source.includes(".collection(\"gemTransactions\").add("), false);
  assert.equal(source.includes("payload.price"), false);
});
