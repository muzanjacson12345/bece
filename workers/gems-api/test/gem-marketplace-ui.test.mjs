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

test("Gem Marketplace UI supports owned cosmetic equipment and existing useful item counters", async () => {
  assert.match(source, /callWorker\("\/gem-shop\/equip"/);
  assert.match(source, /state\.equipped\[item\.slot\]/);
  assert.match(source, /state\.player\[item\.field\]/);
  assert.match(source, /gem-frame-preview\.sapphire/);
  const html = await readFile(fileURLToPath(new URL("../../../index.html", import.meta.url)), "utf8");
  assert.match(html, /\.av\[data-frame="frame_sapphire"\]/);
  assert.match(html, /\.av\[data-frame="frame_royal"\]/);
  assert.match(html, /\.av\[data-frame="frame_aurora"\]/);
});

test("Gem Marketplace browser module does not write Gems or inventory directly", () => {
  assert.equal(source.includes(".collection(\"gemInventories\").doc(currentUser.uid).set("), false);
  assert.equal(source.includes(".collection(\"gemTransactions\").add("), false);
  assert.equal(source.includes("payload.price"), false);
});


test("Gem Marketplace route and screen are connected to the main application", async () => {
  const html = await readFile(fileURLToPath(new URL("../../../index.html", import.meta.url)), "utf8");
  assert.match(html, /'gem-marketplace'/);
  assert.match(html, /id="screen-gem-marketplace"/);
  assert.match(html, /src="\.\/gem-marketplace\.js"/);
  assert.match(html, /window\.renderGemMarketplace\?\.\(\)/);
});
