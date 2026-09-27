import { setSettings, resetSettings, collection } from "./setup.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { TurnIndicator } from "../scripts/turn-indicator.js";

let box, ti;
beforeEach(() => {
  resetSettings();
  document.body.innerHTML = '<div class="scry-turn-indicator hidden"></div>';
  box = document.querySelector(".scry-turn-indicator");
  ti = new TurnIndicator(box);
  game.modules = collection([]);
});

const combat = (combatant, round = 2) => ({ started: true, round, combatant });
const pc = (hp, owner = true) => ({ isOwner: owner, hasPlayerOwner: true, img: "pc.webp", system: { attributes: { hp } } });

test("shows the current combatant, round and HP bar for a PC", () => {
  ti.onUpdateCombat(combat({ name: "Aria", actor: pc({ value: 30, max: 40 }) }));
  assert.ok(!box.classList.contains("hidden"));
  assert.equal(box.querySelector(".scry-ti-name").textContent, "Aria");
  assert.equal(box.querySelector(".scry-ti-round").textContent, "Round 2");
  assert.equal(box.querySelector(".scry-ti-hp-fill").style.width, "75%");
  assert.ok(box.classList.contains("my-turn-active"));
});

test("HP bar colour steps down as HP drops", () => {
  ti.onUpdateCombat(combat({ name: "A", actor: pc({ value: 15, max: 40 }) }));
  assert.equal(box.querySelector(".scry-ti-hp-fill").style.background, "rgb(245, 158, 11)");
  ti.onUpdateCombat(combat({ name: "A", actor: pc({ value: 5, max: 40 }) }));
  assert.equal(box.querySelector(".scry-ti-hp-fill").style.background, "rgb(239, 68, 68)");
  ti.onUpdateCombat(combat({ name: "A", actor: pc({ value: 5, max: 0 }) }));
  assert.equal(box.querySelector(".scry-ti-hp-bar"), null);
});

test("an NPC gets no HP bar and falls back to token art", () => {
  ti.onUpdateCombat({ started: true, combatant: { token: { texture: { src: "orc.webp" } } } });
  assert.equal(box.querySelector(".scry-ti-portrait").getAttribute("src"), "orc.webp");
  assert.equal(box.querySelector(".scry-ti-name").textContent, "Unknown");
  assert.equal(box.querySelector(".scry-ti-hp-bar"), null);
  assert.equal(box.querySelector(".scry-ti-round").textContent, "Round 1");
});

test("no combat, not started, or no combatant clears it", () => {
  ti.onUpdateCombat(combat({ name: "A" }));
  ti.onUpdateCombat({ started: false });
  assert.ok(box.classList.contains("hidden"));
  ti.onUpdateCombat(combat({ name: "A" }));
  ti.onUpdateCombat(combat(null));
  assert.equal(box.innerHTML, "");
  ti.onUpdateCombat(combat({ name: "A" }));
  ti.onDeleteCombat();
  assert.ok(box.classList.contains("hidden"));
  game.combat = null;
  ti.activate();
});

test("counts down from the TableOS timer and turns urgent near the end", async () => {
  game.modules = collection([{ id: "table-os", active: true }]);
  setSettings({ "table-os.turnTimerState": { running: true, endTime: Date.now() + 8000 } });
  ti.onUpdateCombat(combat({ name: "A" }));
  const t = box.querySelector("#scry-turn-timer");
  assert.equal(t.textContent, "8s");
  assert.ok(t.classList.contains("timer-urgent"));
  setSettings({ "table-os.turnTimerState": { running: true, endTime: Date.now() - 1 } });
  ti.onUpdateCombat(combat({ name: "A" }));
  assert.equal(box.querySelector("#scry-turn-timer").textContent, "Time!");
  setSettings({ "table-os.turnTimerState": { running: false } });
  ti.onUpdateCombat(combat({ name: "A" }));
  assert.equal(box.querySelector("#scry-turn-timer").textContent, "");
  ti.destroy();
});

test("a TableOS timer that can't be read leaves the timer blank", () => {
  game.modules = collection([{ id: "table-os", active: true }]);
  ti.onUpdateCombat(combat({ name: "A" }));
  assert.equal(box.querySelector("#scry-turn-timer").textContent, "");
});

test("a Foundry or Beyond view has no container and never draws", () => {
  const none = new TurnIndicator(null);
  none.onUpdateCombat(combat({ name: "A" }));
  none._syncTimer();
  none.onDeleteCombat();
});
