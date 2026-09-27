import "./setup.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";

// Every deployed script must load in the test environment. A module that throws
// at import takes the whole overlay down in Foundry too.
const scripts = readdirSync(new URL("../scripts/", import.meta.url), { recursive: true })
  .map(f => f.replaceAll("\\", "/"))
  .filter(f => f.endsWith(".js"));

test("all 24 scripts are found", () => assert.equal(scripts.length, 24));

for (const file of scripts) {
  test(`${file} imports`, async () => {
    const mod = await import(`../scripts/${file}`);
    assert.ok(mod);
  });
}
