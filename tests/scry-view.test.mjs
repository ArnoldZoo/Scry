import { makeUser, makeActor, makeToken, makeCanvas, asUser, setSettings, resetSettings, notes, calls, rolls,
  collection, tick, flushFrames } from "./setup.mjs";
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ScryView } from "../scripts/scry-view.js";

let view, actor;
const $  = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const click = el => { assert.ok(el, "element to click exists"); el.click(); };

function open(theme = "cobalt", device = "phone", a = makeActor()) {
  setSettings({ "table-os-scry.clientTheme": theme });
  actor = a;
  game.actors = collection([actor]);
  view = new ScryView(actor, device);
  view.render();
  return view;
}

function makeCombat({ round = 1, started = true, current = null, combatants = [] } = {}) {
  const list = collection(combatants);
  return {
    id: "cb1", round, started, combatants: list,
    current: { combatantId: current },
    get combatant() { return list.get(current); },
    async previousTurn() { calls.push(["combat", "previousTurn"]); },
    async nextTurn() { calls.push(["combat", "nextTurn"]); }
  };
}

beforeEach(() => {
  resetSettings();
  notes.length = 0; calls.length = 0; rolls.length = 0;
  document.body.innerHTML = "";
  asUser(makeUser({ id: "p1" }));
  game.combat = null;
  game.journal = collection([]);
  game.macros = collection([]);
  globalThis.canvas = makeCanvas();
  localStorage.clear();
});
afterEach(() => { view?.destroy(); view = null; });

// --- rendering per template ---

test("Core theme on a phone: header, bottom tab bar, Actions tab", () => {
  open("cobalt", "phone");
  const el = $("#scry-overlay");
  assert.ok(el.classList.contains("theme-cobalt"));
  assert.ok(el.classList.contains("device-phone"));
  assert.equal($(".scry-char-name").textContent, "Aria");
  assert.equal($(".scry-hp-text").textContent, "20 / 40 (+5)");
  assert.ok($(".scry-hp-bar").classList.contains("bloodied"));
  assert.ok($(".scry-tab-bar"));
  assert.ok($(".scry-conc-indicator"));
  assert.ok($("#scry-tab-content").innerHTML.length > 0);
});

test("Core theme on a tablet uses the sidebar", () => {
  open("slate", "tablet");
  assert.ok($(".scry-sidebar"));
  assert.equal($(".scry-tab-bar"), null);
});

test("Foundry and Beyond themes build their own shells", () => {
  open("nightfall");
  assert.ok(view._isFoundry);
  assert.ok($("#sfnd-content").innerHTML.length > 0);
  view.destroy();
  open("beyond-light");
  assert.ok(view._isBeyond);
  assert.ok($("#sbnd-content").innerHTML.length > 0);
});

test("render gives up cleanly when the actor can't be read", () => {
  game.system.id = "none";
  try {
    view = new ScryView(makeActor(), "phone");
    view.render();
    assert.equal($("#scry-overlay"), null);
  } finally { game.system.id = "dnd5e"; }
});

for (const [theme, btn] of [["cobalt", ".scry-tab-btn"], ["classic", ".sfnd-nav-btn"], ["beyond-dark", ".sbnd-tab-btn"]]) {
  test(`every tab renders on ${theme}`, () => {
    open(theme);
    const tabs = $$(`${btn}[data-tab]`).map(b => b.dataset.tab).filter(t => t !== "table");
    assert.ok(tabs.length >= 4);
    for (const tab of tabs) {
      click($(`${btn}[data-tab="${tab}"]`));
      assert.equal(view.activeTab, tab);
      assert.ok($(`${btn}[data-tab="${tab}"]`).classList.contains("active"));
    }
    view.switchTab("nope");
    assert.equal(view.activeTab, tabs.at(-1), "unknown tab ignored");
  });
}

test("Beyond tab switch updates the section title", () => {
  open("beyond-dark");
  view.switchTab("gear");
  assert.equal($(".sbnd-section-title").textContent, "Gear");
});

// --- header controls, Core ---

test("stats bar toggles open and closed", () => {
  open();
  click($(".scry-stats-toggle"));
  assert.ok($(".scry-stats-bar").classList.contains("expanded"));
  assert.equal($(".scry-stats-toggle").textContent, "▲");
  click($(".scry-stats-toggle"));
  assert.ok($(".scry-stats-bar").classList.contains("collapsed"));
});

test("damage, heal and temp HP go through the number pad", async () => {
  open();
  for (const [action, check] of [
    ["damage", c => c[1] === "applyDamage" && c[2][0].type === "untyped"],
    ["heal",   c => c[1] === "applyDamage" && c[2][0].type === "healing"],
    ["temp",   c => c[1] === "update" && c[2]["system.attributes.hp.temp"] === 7]
  ]) {
    calls.length = 0;
    click($(`.scry-hp-btn[data-action="${action}"]`));
    $("#scry-modal-hp-input").value = "7";
    click($('[data-modal-btn="0"]'));
    assert.ok(calls.some(check), action);
    assert.equal($(".scry-modal-backdrop"), null, "modal closes after apply");
  }
});

test("HP pad ignores a blank or negative number, and Cancel closes it", () => {
  open();
  click($('.scry-hp-btn[data-action="damage"]'));
  $("#scry-modal-hp-input").value = "-3";
  click($('[data-modal-btn="0"]'));
  assert.ok($(".scry-modal-backdrop"), "still open");
  assert.equal(calls.length, 0);
  click($('[data-modal-btn="1"]'));
  assert.equal($(".scry-modal-backdrop"), null);
});

test("modal closes on the X and on a backdrop tap, not on a panel tap", () => {
  open();
  view._openScryModal({ title: "T", bodyHtml: "<p>b</p>" });
  click($(".scry-modal-panel"));
  assert.ok($(".scry-modal-backdrop"));
  $(".scry-modal-backdrop").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  assert.equal($(".scry-modal-backdrop"), null);
  view._openScryModal({ title: "T" });
  click($(".scry-modal-close"));
  assert.equal($(".scry-modal-backdrop"), null);
});

test("Status opens the Actions tab on the status panel; Actions tab resets it", () => {
  open();
  view.switchTab("gear");
  click($(".scry-btn-status"));
  assert.equal(view.activeTab, "actions");
  assert.equal(view._tabHandlers.actions._activeEco, "status");
  assert.ok($(".scry-btn-status").classList.contains("is-open"));
  click($('.scry-tab-btn[data-tab="actions"]'));
  assert.equal(view._tabHandlers.actions._activeEco, "action");
  assert.ok(!$(".scry-btn-status").classList.contains("is-open"));
});

test("rest modal: roll a hit die, short rest, long rest", async () => {
  open();
  click($(".scry-btn-rest"));
  const rollBtn = $('.scry-modal-hd-roll[data-class="Wizard"]');
  click(rollBtn);
  await tick();
  assert.ok(calls.some(c => c[1] === "rollHitDie" && c[2] === "d6"));
  assert.equal(rollBtn.disabled, true);
  click($(".scry-modal-short-rest"));
  assert.ok(calls.some(c => c[1] === "shortRest"));
  assert.equal($(".scry-modal-backdrop"), null);
  view._tabletopView.exit();
  click($(".scry-btn-rest"));
  click($(".scry-modal-long-rest"));
  assert.ok(calls.some(c => c[1] === "longRest"));
});

test("slide-down: rest buttons open the modal and hit dice roll", async () => {
  open();
  click($(".scry-rest-short"));
  assert.ok($(".scry-modal-backdrop"));
  click($(".scry-modal-close"));
  click($(".scry-rest-long"));
  assert.ok($(".scry-modal-backdrop"));
  click($('.scry-hd-spend[data-class="Fighter"]'));
  await tick();
  assert.ok(calls.some(c => c[1] === "rollHitDie" && c[2] === "d10"));
});

test("movement pips shade by what's left", () => {
  open();
  const pips = used => { view._movementUsed = used; view._refreshMovement(); return $$(".scry-slide-movement .scry-move-sq"); };
  assert.equal(pips(0).length, 6);
  assert.equal(pips(15).filter(p => p.classList.contains("is-warn")).length, 3);
  assert.equal(pips(25).filter(p => p.classList.contains("is-danger")).length, 1);
  assert.equal($(".scry-move-ft").textContent, "5ft");
  pips(60);
  assert.equal($(".scry-move-ft").textContent, "0ft");
});

// --- Foundry and Beyond panels ---

test("Foundry panel: HP, rest, status, inspiration, initiative, tools", async () => {
  open("classic");
  click($('.sfnd-pbtn[data-action="heal"]'));
  assert.equal($(".scry-modal-title").textContent, "Apply Healing");
  click($(".scry-modal-close"));
  click($(".sfnd-pbtn-rest"));
  assert.equal($(".scry-modal-title").textContent, "Rest");
  click($(".scry-modal-close"));
  view.switchTab("gear");
  click($(".sfnd-pbtn-status"));
  assert.equal(view._foundryHandlers.actions._activeEco, "status");
  click($(".sfnd-pbtn-insp"));
  await tick();
  assert.equal(actor.system.attributes.inspiration, true);
  click($(".sfnd-diamond-init"));
  assert.ok($(".scry-init-panel"));
  click($(".sfnd-tools-btn"));
  assert.ok($("#scry-table-tools"));
});

test("Beyond HP pill offers damage, heal and temp", () => {
  open("beyond-parchment");
  for (const [i, title] of [[0, "Apply Damage"], [1, "Apply Healing"], [2, "Set Temp HP"]]) {
    click($(".sbnd-hp-pill"));
    click($(`[data-modal-btn="${i}"]`));
    assert.equal($(".scry-modal-title").textContent, title);
  }
  click($(".sbnd-tools-btn"));
  assert.ok($("#scry-table-tools"));
});

// --- initiative number pad ---

test("initiative pad builds an expression and applies the result", async () => {
  const combatant = { actorId: "a1", update: async u => calls.push(["combatant", "update", u]) };
  game.combat = makeCombat({ combatants: [combatant] });
  open();
  view._openInitiativeDialog();
  const key = k => click($(`.scry-np-btn[data-k="${k}"]`));
  key("1"); key("5"); key("B");
  assert.equal($("#scry-init-display").textContent, "15 + 2 = 17");
  key("-"); key("3");
  key("E");
  await tick();
  assert.ok(calls.some(c => c[1] === "rollInitiative"));
  assert.ok(calls.some(c => c[0] === "combatant" && c[2].initiative === 14));
  assert.equal($(".scry-init-panel"), null);
});

test("initiative pad: Enter with nothing typed does nothing, backdrop tap closes", () => {
  open();
  view._openInitiativeDialog();
  click($('.scry-np-btn[data-k="E"]'));
  assert.ok($(".scry-init-panel"));
  assert.equal($("#scry-init-display").textContent, "–");
  $(".scry-modal-backdrop").dispatchEvent(new window.MouseEvent("click"));
  assert.equal($(".scry-init-panel"), null);
});

test("expression evaluator accepts digits, + and - only", () => {
  open();
  assert.equal(view._evalExpr("12+3-4"), 11);
  assert.equal(view._evalExpr(""), null);
  assert.equal(view._evalExpr("abc"), null);
  assert.equal(view._evalExpr("5+"), null);
  assert.equal(view._evalExpr("5-+3"), 2, "sign pair after an operator");
  assert.equal(view._evalExpr("-4+10"), 6);
  assert.equal(view._evalExpr("5--3"), null, "the pad's old eval rejected --");
  assert.equal(view._evalExpr("5++3"), null);
  assert.equal(view._evalExpr("07+2"), 9, "leading zero; the old strict-mode eval returned null here");
});

test("an initiative failure is logged, not thrown", async () => {
  open();
  actor.rollInitiative = async () => { throw new Error("no combat"); };
  await assert.doesNotReject(view._applyInitiative(10));
});

// --- hooks ---

test("actor, item and effect updates refresh the header", () => {
  open();
  actor.system.attributes.hp.value = 8;
  Hooks.callAll("updateActor", { id: "other" });
  assert.equal($(".scry-hp-text").textContent, "20 / 40 (+5)", "other actor ignored");
  Hooks.callAll("updateActor", actor, {});
  assert.equal($(".scry-hp-text").textContent, "8 / 40 (+5)");
  assert.ok($(".scry-hp-bar").classList.contains("critical"));
  actor.system.attributes.hp.value = 40;
  actor.system.attributes.hp.temp = 0;
  Hooks.callAll("updateItem", { parent: actor }, {});
  assert.equal($(".scry-hp-text").textContent, "40 / 40");
  actor.effects = collection([]);
  Hooks.callAll("createActiveEffect", { parent: actor });
  assert.equal($(".scry-conc-indicator").style.display, "none");
  Hooks.callAll("deleteActiveEffect", { parent: actor });
  Hooks.callAll("deleteActiveEffect", { parent: { id: "x" } });
  Hooks.callAll("createActiveEffect", { parent: { id: "x" } });
  Hooks.callAll("updateItem", { parent: { id: "x" } }, {});
});

test("Foundry and Beyond panels refresh on actor update", () => {
  open("modern");
  actor.system.attributes.hp.value = 5;
  Hooks.callAll("updateActor", actor, {});
  assert.match($(".sfnd-hp-text").textContent, /^5 \/ 40/);
  assert.ok($(".sfnd-hp-bar").classList.contains("critical"));
  view.destroy();
  open("beyond-dark");
  actor.system.attributes.hp.value = 5;
  Hooks.callAll("updateActor", actor, {});
  assert.match($(".sbnd-hp-pill").textContent, /5/);
});

test("combat start shows the banner once per combat", () => {
  open();
  Hooks.callAll("updateCombat", makeCombat({ round: 2 }));
  assert.equal($("#scry-top-banner"), null);
  Hooks.callAll("updateCombat", makeCombat());
  assert.equal($(".scry-tb-title").textContent, "COMBAT BEGINS");
  $("#scry-top-banner").remove();
  Hooks.callAll("updateCombat", makeCombat());
  assert.equal($("#scry-top-banner"), null);
});

test("crit and fumble banners from chat, midi-qol and TableOS Enter mode", () => {
  open();
  const d20 = r => ({ terms: [{ faces: 20, results: [{ result: 5, active: false }, { result: r, active: true }] }] });
  Hooks.callAll("createChatMessage", { alias: "Aria", rolls: [d20(20)] });
  assert.equal($(".scry-tb-title").textContent, "CRITICAL SUCCESS");
  assert.equal($(".scry-tb-sub").textContent, "Aria");
  Hooks.callAll("createChatMessage", { rolls: [{ isFumble: true }] });
  assert.equal($(".scry-tb-title").textContent, "EPIC FAIL");
  $("#scry-top-banner").remove();
  Hooks.callAll("createChatMessage", { rolls: [d20(12), null, { terms: [{ faces: 6 }] }] });
  Hooks.callAll("createChatMessage", {});
  assert.equal($("#scry-top-banner"), null);
  Hooks.callAll("dnd5e.rollAttack", [{ isCritical: true }]);
  assert.equal($(".scry-tb-title").textContent, "CRITICAL SUCCESS");
  Hooks.callAll("dnd5e.rollAttack", d20(1));
  assert.equal($(".scry-tb-title").textContent, "EPIC FAIL");
  Hooks.callAll("tableos.manualRollResult", 20);
  assert.equal($(".scry-tb-title").textContent, "CRITICAL SUCCESS");
  Hooks.callAll("tableos.manualRollResult", 1);
  assert.equal($(".scry-tb-title").textContent, "EPIC FAIL");
  Hooks.callAll("tableos.manualRollResult", 12);
  click($("#scry-top-banner"));
  assert.equal($("#scry-top-banner"), null, "tap dismisses");
  Hooks.callAll("createChatMessage", null);
  Hooks.callAll("dnd5e.rollAttack", null);
});

test("movement is tracked from my token's moves only", () => {
  const tok = makeToken({ id: "t1", x: 0, y: 0 });
  tok.document.actorId = "a1";
  globalThis.canvas = makeCanvas();
  canvas.tokens.placeables.push(tok);
  open();
  Hooks.callAll("updateToken", { actorId: "other" }, { x: 500 });
  Hooks.callAll("updateToken", { actorId: "a1", x: 0, y: 0 }, { name: "x" });
  Hooks.callAll("updateToken", { actorId: "a1", x: 0, y: 0 }, { x: 200 });
  assert.equal(view._movementUsed, 10);
  Hooks.callAll("updateToken", { actor: { id: "a1" }, x: 200, y: 0 }, { y: 100 });
  assert.equal(view._movementUsed, 15);
  Hooks.callAll("updateToken", { actorId: "a1", x: 200, y: 100 }, { x: 200 });
  assert.equal(view._movementUsed, 15, "no distance, no change");
});

test("movement seeds from the viewed scene when no canvas token exists", () => {
  game.scenes = { viewed: { tokens: collection([{ actorId: "a1", x: 300, y: 300 }]) } };
  try {
    open();
    assert.deepEqual(view._lastKnownPos, { x: 300, y: 300 });
  } finally { game.scenes = { viewed: null }; }
});

test("my turn resets movement and action pips, and updates the turn display", () => {
  const me = { id: "cA", actorId: "a1", name: "Aria", actor: null };
  const orc = { id: "cB", actorId: "o1", name: "Orc", actor: { img: "orc.webp", hasPlayerOwner: false } };
  open();
  me.actor = actor;
  view._movementUsed = 20;
  view._tabHandlers.actions._ecoUsed = { action: 1, bonus: 1, reaction: 0 };
  Hooks.callAll("updateCombat", makeCombat({ round: 2, current: "cA", combatants: [me, orc] }));
  assert.equal(view._movementUsed, 0);
  assert.deepEqual(view._tabHandlers.actions._ecoUsed, { action: 0, bonus: 0, reaction: 0 });
  Hooks.callAll("updateCombat", makeCombat({ round: 2, current: "cB", combatants: [me, orc] }));
  Hooks.callAll("createCombatant");
  Hooks.callAll("deleteCombat");
});

test("Foundry combat strip shows the current combatant, HP only for PCs", () => {
  const me  = { id: "cA", actorId: "a1", name: "Aria", actor: null };
  const orc = { id: "cB", actorId: "o1", name: "Orc", actor: { img: "orc.webp", hasPlayerOwner: false } };
  open("frost");
  me.actor = actor;
  const strip = $("#sfnd-combat-strip");
  view._updateFoundryCombatStrip(makeCombat({ current: "cB", combatants: [me, orc] }));
  assert.equal(strip.querySelector(".sfnd-combat-name").textContent, "Orc");
  assert.equal(strip.querySelector(".sfnd-combat-hp-wrap").style.display, "none");
  view._updateFoundryCombatStrip(makeCombat({ current: "cA", combatants: [me, orc] }));
  assert.ok(strip.classList.contains("sfnd-our-turn"));
  assert.equal(strip.querySelector(".sfnd-combat-hp-fill").style.width, "50%");
  actor.system.attributes.hp.value = 5;
  view._updateFoundryCombatStrip(makeCombat({ current: "cA", combatants: [me, orc] }));
  actor.system.attributes.hp.value = 15;
  view._updateFoundryCombatStrip(makeCombat({ current: "cA", combatants: [me, orc] }));
  view._updateFoundryCombatStrip(makeCombat({ current: null }));
  assert.ok(strip.classList.contains("hidden"));
});

// --- Table tools ---

test("Table Tools toggles, and combat adds Prev, Hold and End Turn", () => {
  open();
  view._openTableTools();
  assert.equal($$(".scry-tt-btn").length, 5);
  view._openTableTools();
  assert.equal($("#scry-table-tools"), null, "second press closes it");
  game.combat = makeCombat({ current: "cA", combatants: [{ id: "cA", actor: { isOwner: true } }] });
  view._openTableTools();
  assert.equal($$(".scry-tt-btn").length, 8);
  click($('[data-tool="prevturn"]'));
  view._openTableTools(); click($('[data-tool="endturn"]'));
  let held = false;
  globalThis.TABLE_OS = { holdAction: () => { held = true; } };
  view._openTableTools(); click($('[data-tool="hold"]'));
  delete globalThis.TABLE_OS;
  assert.ok(calls.some(c => c[1] === "previousTurn"));
  assert.ok(calls.some(c => c[1] === "nextTurn"));
  assert.ok(held);
  view._openTableTools(); click($(".scry-tt-close"));
  assert.equal($("#scry-table-tools"), null);
});

test("End Turn does nothing when it isn't my combatant", () => {
  open();
  game.combat = makeCombat({ current: "cA", combatants: [{ id: "cA", actor: { isOwner: false } }] });
  view._handleTableTool("endturn");
  assert.ok(!calls.some(c => c[1] === "nextTurn"));
});

test("Items goes to the Gear tab", () => {
  open();
  view._openTableTools();
  click($('[data-tool="items"]'));
  assert.equal(view.activeTab, "gear");
});

test("Settings hides Scry, opens Game Settings and returns", async () => {
  open();
  const closed = [];
  class SettingsConfigWin { close() { closed.push(1); } }
  ui.windows = { 1: new SettingsConfigWin(), 2: { constructor: { name: "Other" } } };
  document.body.insertAdjacentHTML("beforeend", '<div class="settings-config"><div class="x"></div></div>');
  view._handleTableTool("settings");
  assert.ok($("#scry-overlay").classList.contains("hidden"));
  assert.ok(calls.some(c => c[0] === "SettingsConfig"));
  await new Promise(r => setTimeout(r, 550));
  assert.equal($(".settings-config").style.getPropertyValue("z-index"), "99999");
  click($("#scry-settings-return-btn"));
  assert.ok(!$("#scry-overlay").classList.contains("hidden"));
  assert.equal(closed.length, 1);
  ui.windows = {};
});

test("macro picker lists hotbar then owned macros and runs one", () => {
  const ran = [];
  const mk = (id, isOwner) => ({ id, name: `M${id}`, isOwner, execute: () => ran.push(id) });
  game.macros = collection([mk("m1", true), mk("m2", true), mk("m3", false)]);
  game.user.hotbar = { 1: "m2" };
  open();
  view._handleTableTool("macros");
  const d = Dialog.last;
  const host = document.createElement("div");
  host.innerHTML = d.data.content;
  d.data.render(jQuery(host));
  const btns = [...host.querySelectorAll(".scry-picker-btn")].map(b => b.dataset.id);
  assert.deepEqual(btns, ["m2", "m1"]);
  host.querySelector('[data-id="m1"]').click();
  assert.deepEqual(ran, ["m1"]);
});

test("macro picker with nothing to show says so", () => {
  open();
  view._openMacroPicker();
  assert.ok(notes.some(([, m]) => m === "No macros available."));
});

// --- theme picker ---

test("theme picker: same family swaps the class, other family rebuilds", async () => {
  open("cobalt");
  view._handleTableTool("theme");
  assert.ok($('.scry-tp-row[data-theme="cobalt"]').classList.contains("is-current"));
  flushFrames();
  assert.match($('.scry-tp-row[data-theme="amber"] .scry-tp-name').style.cssText, /color/);
  click($('.scry-tp-row[data-theme="atlas"]'));
  await tick();
  assert.ok($("#scry-overlay").classList.contains("theme-atlas"));
  assert.equal($("#scry-theme-picker"), null);
  view._openThemePicker();
  click($('.scry-tp-row[data-theme="vellum"]'));
  await tick();
  assert.ok(view._isFoundry, "rebuilt as the Foundry template");
  view._openThemePicker();
  click($(".scry-tpk-close"));
  assert.equal($("#scry-theme-picker"), null);
});

// --- journals ---

function makeJournal(id, name, pages, isOwner = false) {
  const pc = collection(pages.map((p, i) => ({ id: `${id}p${i}`, sheet: { render: () => calls.push(["page", "render", p.name]) }, ...p })));
  return { id, name, isOwner, pages: pc, testUserPermission: () => true, sheet: { render: () => calls.push(["journal", "render", name]) } };
}

test("journal picker: sorted, starring pins to the top and is remembered", () => {
  game.journal = collection([makeJournal("j1", "Zebra", []), makeJournal("j2", "Apple", [])]);
  open();
  view._handleTableTool("journal");
  const names = () => $$(".scry-jp-name").map(n => n.textContent.trim());
  assert.deepEqual(names(), ["Apple", "Zebra"]);
  click($('.scry-jp-star[data-star-id="j1"]'));
  assert.deepEqual(names(), ["Zebra", "Apple"]);
  assert.deepEqual(JSON.parse(localStorage.getItem("scry-starred-journals")), ["j1"]);
  click($('.scry-jp-star[data-star-id="j1"]'));
  assert.deepEqual(names(), ["Apple", "Zebra"]);
  click($(".scry-jp-close"));
  assert.equal($("#scry-journal-picker"), null);
});

test("journal picker with no journals says so", () => {
  open();
  view._openJournalPicker();
  assert.ok(notes.some(([, m]) => m === "No accessible journal entries."));
});

test("journal reader pages through text, image and empty pages", () => {
  const j = makeJournal("j1", "Lore", [
    { name: "One", text: { content: "<p>first</p>" } },
    { name: "Two", src: "map.webp" },
    { name: "Three" }
  ]);
  game.journal = collection([j]);
  open();
  view._openJournalPicker();
  click($('.scry-jp-row[data-id="j1"]'));
  assert.equal($(".scry-jr-content").innerHTML, "<p>first</p>");
  assert.ok($(".scry-jr-prev").disabled);
  assert.equal($(".scry-jr-edit"), null, "not the owner, no pencil");
  click($(".scry-jr-next"));
  assert.ok($(".scry-jr-img"));
  click($(".scry-jr-next"));
  assert.ok($(".scry-jr-empty"));
  assert.ok($(".scry-jr-next").disabled);
  click($(".scry-jr-prev"));
  assert.match($(".scry-jr-page-label").textContent, /Two · 2\/3/);
  click($(".scry-jr-close"));
  assert.equal($("#scry-journal-reader"), null);
});

test("journal edit opens the page sheet and Return to Scry comes back", () => {
  const j = makeJournal("j1", "Notes", [{ name: "Only", text: { content: "hi" } }], true);
  open();
  view._openJournalReader(j);
  click($(".scry-jr-edit"));
  assert.ok($("#scry-overlay").classList.contains("hidden"));
  assert.ok($("#scry-journal-edit-style"));
  assert.ok(calls.some(c => c[0] === "page" && c[2] === "Only"));
  click($("#scry-jr-return-btn"));
  assert.ok(!$("#scry-overlay").classList.contains("hidden"));
  assert.equal($("#scry-journal-edit-style"), null);
  assert.ok($("#scry-journal-reader"), "back in the reader");
});

test("journal edit with no pages opens the journal sheet", () => {
  const j = makeJournal("j1", "Empty", [], true);
  open();
  view._openJournalReader(j);
  click($(".scry-jr-edit"));
  assert.ok(calls.some(c => c[0] === "journal"));
});

// --- actor switching ---

test("portrait switcher only shows when you own more than one actor", async () => {
  open();
  assert.ok(!$(".scry-portrait").classList.contains("is-switchable"));
  view.destroy();
  const a1 = makeActor({ id: "a1", name: "Aria" });
  const a2 = makeActor({ id: "a2", name: "Bram" });
  a2.system.attributes.hp = null;
  setSettings({ "table-os-scry.clientTheme": "cobalt" });
  game.actors = collection([a2, a1]);
  view = new ScryView(a1, "phone");
  view.render();
  actor = a1;
  assert.ok($(".scry-portrait").classList.contains("is-switchable"));
  click($(".scry-portrait"));
  assert.deepEqual($$(".scry-actor-card-name").map(n => n.textContent), ["Aria", "Bram"]);
  assert.ok($('.scry-actor-card[data-actor-id="a1"]').classList.contains("is-active"));
  click($('.scry-actor-card[data-actor-id="a2"]'));
  await tick();
  assert.equal(view.actor, a2);
  assert.equal(game.user.getFlag("table-os-scry", "activeActorId"), "a2");
  assert.ok(notes.some(([k, m]) => k === "warn" && /Bram has no token/.test(m)));
  await view.switchActor(a2);
  view._openActorPicker();
});

test("switching to an actor with a token on the scene doesn't warn", async () => {
  const a2 = makeActor({ id: "a2", name: "Bram" });
  canvas.tokens.placeables.push(makeToken({ actor: a2 }));
  open();
  await view.switchActor(a2);
  assert.ok(!notes.some(([k]) => k === "warn"));
});

// --- TableOS initiative dialog ---

test("another player's TableOS initiative dialog is removed", async () => {
  open();
  const d = document.createElement("div");
  d.textContent = "Initiative for Bram - Roll / Enter / Skip";
  document.body.appendChild(d);
  await tick();
  assert.ok(!d.isConnected);
});

test("my first TableOS initiative chooser is centered", async () => {
  open();
  const d = document.createElement("div");
  d.textContent = "Initiative for Aria - Roll / Enter / Skip";
  document.body.appendChild(d);
  await tick();
  assert.equal(d.style.getPropertyValue("top"), "50%");
});

test("my TableOS keypad dialog is rebuilt as a phone keypad that drives the originals", async () => {
  open();
  const clicked = [];
  const d = document.createElement("div");
  d.innerHTML = `<header><span>Initiative - Aria - Enter roll</span><button>Close</button></header>
    <div><span>VALUE</span><input><span>KEYPAD</span></div>
    ${["7", "8", "9", "4", "5", "6", "1", "2", "3", "-", "0", "+", "Auto Init Bonus", "Initiative", "Close"]
      .map(t => `<button>${t}</button>`).join("")}`;
  d.querySelectorAll("button").forEach(b => b.addEventListener("click", () => clicked.push(b.textContent)));
  document.body.appendChild(d);
  await tick();
  assert.equal(d.style.getPropertyValue("top"), "8px");
  assert.equal(d.querySelector("input").style.getPropertyValue("display"), "none");
  const pad = v => d.querySelector(`[data-v="${v}"]`).click();
  pad("7"); pad("B"); pad("submit");
  assert.deepEqual(clicked, ["7", "Auto Init Bonus", "Initiative"]);
});

test("the initiative watcher ignores text nodes and unrelated elements", async () => {
  document.body.insertAdjacentHTML("beforeend", '<div id="interface"></div>');
  open();
  view._startInitiativeObserver();
  document.body.appendChild(document.createTextNode("initiative roll"));
  const plain = document.createElement("div");
  plain.textContent = "initiative but nothing to press";
  document.body.appendChild(plain);
  await tick();
  assert.ok(plain.isConnected);
  view.actor = { name: "" };
  const anon = document.createElement("div");
  anon.textContent = "initiative roll";
  document.body.appendChild(anon);
  await tick();
  assert.ok(anon.isConnected);
  view.actor = actor;
});

// --- turn timer mirror ---

test("TableOS turn timer is mirrored to the header badge and the Foundry panel", () => {
  open();
  document.body.insertAdjacentHTML("beforeend",
    '<div class="tableos-turn-timer"><div class="tableos-turn-timer__inner" style="color:red"><span class="tableos-turn-timer__time">0:42</span></div></div>');
  view._syncTimer();
  assert.equal($(".scry-turn-timer-badge").textContent, "0:42");
  assert.ok(!$(".scry-turn-timer-badge").classList.contains("hidden"));
  $(".tableos-turn-timer").style.display = "none";
  view._syncTimer();
  assert.ok($(".scry-turn-timer-badge").classList.contains("hidden"));
  view.destroy();
  open("classic");
  $(".tableos-turn-timer").style.display = "";
  view._syncTimer();
  assert.equal($("#sfnd-panel-timer").textContent, "0:42");
  $(".tableos-turn-timer").remove();
  view._syncTimer();
  assert.ok($("#sfnd-panel-timer").classList.contains("hidden"));
});

// --- table view entry ---

test("Table tab enters Table view, and a second tap goes back to the canvas", () => {
  open();
  click($('.scry-tab-btn[data-tab="table"]'));
  assert.ok(view._tabletopView.active);
  view._tabletopView._openOverlay("actions");
  click($('.scry-tab-btn[data-tab="table"]'));
  assert.ok($("#scry-overlay").classList.contains("hidden"));
  view.enterTableView();
  view._tabletopView.exit();
  view.enterTableView();
  assert.ok(view._tabletopView.active);
  view.openTokenPicker();
});
