import { makeUser, makeActor, makeToken, makeCanvas, asUser, setSettings, resetSettings, notes, calls, rolls,
  collection, tick } from "./setup.mjs";
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ScryView } from "../scripts/scry-view.js";
import { TabActions } from "../scripts/tabs/tab-actions.js";
import { TabSpells } from "../scripts/tabs/tab-spells.js";

let view, actor;
const $  = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const click = el => { assert.ok(el, "element to click exists"); el.click(); };
const handler = tab => (view._isFoundry ? view._foundryHandlers : view._isBeyond ? view._beyondHandlers : view._tabHandlers)[tab];
/** "All" has no chip; the tab switches to it when the economy tab changes. */
const showAll = h => { h._activeCat = "all"; h.refresh($("#scry-tab-content"), h._lastData); };
const used = (name, method) => calls.some(c => c[0] === name && c[1] === method);

function mount(tab = "actions", theme = "cobalt") {
  setSettings({ "table-os-scry.clientTheme": theme });
  actor = makeActor();
  game.actors = collection([actor]);
  view = new ScryView(actor, "phone");
  game.scry = { view };
  view.render();
  view.switchTab(tab);
  return handler(tab);
}

/** Put a target on the canvas so attacks and casts go straight through. */
function target(owner = true) {
  const foe = makeActor({ id: "o1", name: "Orc", owner });
  const tok = makeToken({ id: "tO", actor: foe, name: "Orc" });
  canvas.tokens.placeables.push(tok);
  game.user.targets.add(tok);
  return foe;
}

beforeEach(() => {
  resetSettings();
  notes.length = 0; calls.length = 0; rolls.length = 0;
  document.body.innerHTML = "";
  asUser(makeUser({ id: "p1" }));
  game.combat = null;
  globalThis.canvas = makeCanvas();
  delete globalThis.TABLE_OS;
});
afterEach(() => { view?.destroy(); view = null; delete game.scry; });

// --- Actions tab ---

test("Actions: economy tabs, category chips and the empty message", () => {
  const h = mount("actions");
  assert.ok($$(".scry-action-row").some(r => r.textContent.includes("Longsword")));
  showAll(h);
  assert.ok($(".scry-spell-grouped"), "all view groups the spells");
  click($('.scry-cat-chip[data-cat="spell"]'));
  assert.ok($(".scry-action-spell-header .scry-slot-pip"));
  click($('.scry-cat-chip[data-cat="utility"]'));
  assert.ok($('.scry-sys-ref[data-sys-id="sys-dash"]'));
  click($('.scry-eco-tab[data-eco="bonus"]'));
  assert.equal(h._activeEco, "bonus");
  assert.ok($$(".scry-action-name").some(n => n.textContent === "Second Wind"));
  assert.ok($$(".scry-action-name").some(n => n.textContent === "Misty Step"), "always-prepared bonus spell");
  click($('.scry-eco-tab[data-eco="reaction"]'));
  assert.ok(!$$(".scry-action-name").some(n => n.textContent === "Shield"), "unprepared spell hidden");
  h._activeCat = "item";
  h.refresh($("#scry-tab-content"), h._lastData);
  assert.match($(".scry-empty").textContent, /No reactions available \(Items\)/);
});

test("Actions: pips mark and undo", () => {
  const h = mount("actions");
  click($('.scry-ae-pip[data-eco="action"][data-idx="0"]'));
  assert.equal(h._eco("a1").action, 1);
  click($('.scry-ae-pip[data-eco="action"][data-idx="0"]'));
  assert.equal(h._eco("a1").action, 0);
  assert.deepEqual(h._eco(null), { action: 0, bonus: 0, reaction: 0 });
});

test("Actions: attack in Roll mode rolls, marks the pip and goes to the map", async () => {
  const h = mount("actions");
  target();
  click($('.scry-weapon-attack[data-item-id="w1"]'));
  await tick();
  assert.ok(used("Longsword", "use"));
  assert.equal(h._eco("a1").action, 1);
  assert.ok(view._tabletopView.active);
  const midi = MidiQOL.configSettings();
  assert.equal(midi.autoFastForwardAttack, undefined, "midi settings restored");
});

test("Actions: attack with no target goes to targeting, or restores remembered targets", async () => {
  mount("actions");
  const tok = makeToken({ id: "tR" });
  canvas.tokens.placeables.push(tok);
  click($('.scry-weapon-attack[data-item-id="w1"]'));
  await tick();
  assert.equal(view._pendingReturnTab, "actions");
  assert.equal(view._tabletopView._mode, "target");
  assert.ok(!used("Longsword", "use"));
  view._tabletopView.exit();
  view.switchTab("actions");
  view._tabletopView._lastTargetIds = ["tR"];
  click($('.scry-weapon-attack[data-item-id="w1"]'));
  await tick();
  assert.ok(used("Token", "setTarget"));
  assert.ok(used("Longsword", "use"));
});

test("Actions: Enter mode attack applies typed damage to owned targets", async () => {
  const h = mount("actions");
  const foe = target(true);
  click($('.scry-mode-btn[data-mode="enter"]'));
  click($(".scry-toggle-autodmg"));
  assert.equal(h._autoDmg, false);
  click($('.scry-weapon-attack[data-item-id="w1"]'));
  await tick();
  assert.match($(".scry-modal-title").textContent, /Longsword/);
  $("#scry-enter-attack").value = "25";
  click($('[data-modal-btn="0"]'));
  await tick();
  assert.ok(notes.some(([k]) => k === "warn"), "d20 out of range");
  $("#scry-enter-attack").value = "14";
  $("#scry-enter-damage").value = "9";
  click($('[data-modal-btn="0"]'));
  await tick();
  assert.ok(used("Longsword", "use"));
  assert.ok(calls.some(c => c[0] === "Orc" && c[1] === "applyDamage" && c[2][0].value === 9));
  assert.equal(foe.name, "Orc");
});

test("Actions: Enter mode puts the typed d20 into the attack roll", async () => {
  const h = mount("actions");
  const item = actor.items.get("w1");
  item.use = async () => {
    const r = new Roll("1d20+5");
    Hooks.callAll("dnd5e.preUseActivity", {}, {}, {});
    Hooks.callAll("dnd5e.preRollAttack", {}, {});
    Hooks.callAll("dnd5e.rollAttack", [r]);
    Hooks.call("dnd5e.preRollDamage", {}, {});
    item.lastRoll = r;
  };
  await h._doEnterAttack(item, actor, 17, 0);
  assert.equal(item.lastRoll.terms[0].results[0].result, 17);
  assert.equal(item.lastRoll.total, 22, "17 + 5 bonus");
  h._autoBonus = false;
  await h._doEnterAttack(item, actor, 3, null);
  assert.equal(item.lastRoll.total, 3);
});

test("Actions: a failed use clears its hooks and rethrows", async () => {
  const h = mount("actions");
  const item = actor.items.get("w1");
  item.use = async () => { throw new Error("cancelled"); };
  await assert.rejects(h._doRollAttack(item), /cancelled/);
  await assert.rejects(h._doEnterAttack(item, actor, 10, null), /cancelled/);
  assert.equal(Hooks.handlers("dnd5e.rollAttack").filter(x => x.once).length, 0);
});

test("Actions: cast, use and system Ref buttons", async () => {
  const h = mount("actions");
  showAll(handler("actions"));
  click($('.scry-spell-cast[data-item-id="s0"]'));
  await tick();
  assert.equal(view._pendingReturnTab, "actions", "no target, so off to targeting");
  view._tabletopView.exit();
  view.switchTab("actions");
  target();
  click($('.scry-spell-cast[data-item-id="s0"]'));
  await tick();
  assert.ok(used("Fire Bolt", "use"));
  view._tabletopView.exit();
  view.switchTab("actions");
  click($('.scry-item-use[data-item-id="p1"]'));
  await tick();
  assert.ok(used("Potion of Healing", "use"));
  view._tabletopView.exit();
  view.switchTab("actions");
  h._activeCat = "utility";
  h.refresh($("#scry-tab-content"), h._lastData);
  h._eco("a1").action = 0;
  const before = 0;
  click($('.scry-sys-ref[data-sys-id="sys-dodge"]'));
  assert.equal($(".scry-modal-title").textContent, "Dodge");
  click($('[data-modal-btn="0"]'));
  assert.equal(h._eco("a1").action, before + 1);
});

test("Actions: a failing cast or use is caught", async () => {
  mount("actions");
  target();
  showAll(handler("actions"));
  actor.items.get("s0").use = async () => { throw new Error("x"); };
  actor.items.get("p1").use = async () => { throw new Error("y"); };
  click($('.scry-spell-cast[data-item-id="s0"]'));
  click($('.scry-item-use[data-item-id="p1"]'));
  await tick();
});

test("Actions: row tap shows the description; spells get their details", () => {
  mount("actions");
  const bolt = actor.items.get("s0");
  bolt.labels = { activation: "1 Action", range: "120 ft", duration: "Instantaneous" };
  bolt.system.properties = new Set(["vocal", "somatic"]);
  CONFIG.DND5E.spellSchools = { evo: { label: "Evocation" } };
  showAll(handler("actions"));
  $('.scry-action-row[data-item-id="s0"] .scry-action-name').click();
  assert.equal($(".scry-spell-detail-subtitle").textContent, "Evocation Cantrip");
  assert.match($(".scry-spell-meta").textContent, /V, S/);
  $('.scry-action-row[data-item-id="s4"] .scry-action-name').click();
  assert.equal($(".scry-spell-detail-subtitle").textContent, "3rd-level ");
  $('.scry-action-row[data-item-id="w1"] .scry-action-name').click();
  assert.equal($(".scry-modal-title").textContent, "Longsword");
  delete CONFIG.DND5E.spellSchools;
});

test("Actions: status panel toggles inspiration and conditions, groups and Clear All", async () => {
  const h = mount("actions");
  h._activeEco = "status";
  h.refresh($("#scry-tab-content"), h._lastData);
  assert.ok($(".scry-status-panel"));
  click($(".scry-status-insp-toggle"));
  await tick();
  assert.equal(actor.system.attributes.inspiration, true);
  click($('.scry-cond-group-btn[data-group="all"]'));
  assert.equal($$(".scry-cond-btn").length, 3);
  assert.ok($('.scry-cond-btn[data-status-id="prone"]').classList.contains("is-active"));
  click($('.scry-cond-btn[data-status-id="prone"]'));
  click($('.scry-cond-btn[data-status-id="blinded"]'));
  await tick();
  assert.ok(calls.some(c => c[1] === "toggleStatusEffect" && c[2] === "prone" && c[3].active === false));
  assert.ok(calls.some(c => c[1] === "toggleStatusEffect" && c[2] === "blinded" && c[3].active === true));
  click($('.scry-cond-group-btn[data-group="g-l"]'));
  assert.match($(".scry-cond-grid").textContent, /No conditions in this group/);
  actor.effects = collection([
    { id: "e1", statuses: new Set(["prone"]) },
    { id: "e2", flags: { core: { statusId: "poisoned" } } },
    { id: "e3", statuses: new Set(["homebrew"]) }
  ]);
  click($(".scry-cond-clear-all"));
  await tick();
  assert.ok(calls.some(c => c[1] === "deleteEmbeddedDocuments" && c[3].join() === "e1,e2"));
  actor.toggleStatusEffect = async () => { throw new Error("no"); };
  click($('.scry-cond-group-btn[data-group="all"]'));
  click($('.scry-cond-btn[data-status-id="prone"]'));
  await tick();
});

test("Actions: combat buttons outside and inside combat", async () => {
  mount("actions");
  click($(".scry-btn-initiative"));
  assert.ok($(".scry-init-panel"));
  view._element.querySelector(".scry-modal-backdrop").remove();
  click($(".scry-btn-target"));
  assert.ok(view._tabletopView.active);
  view._tabletopView.exit();
  game.combat = { combatant: { actor: { isOwner: true } }, nextTurn: async () => calls.push(["combat", "nextTurn"]) };
  view.switchTab("actions");
  let held = 0;
  globalThis.TABLE_OS = { holdAction: () => held++ };
  click($(".scry-btn-hold"));
  click($(".scry-btn-endturn"));
  assert.equal(held, 1);
  assert.ok(used("combat", "nextTurn"));
  click($(".scry-btn-target"));
  click($(".scry-btn-target"));
});

test("Actions: without a Scry view, targeting falls back to the token picker", () => {
  const h = new TabActions();
  let picked = 0;
  game.scry = { view: { openTokenPicker: () => picked++ } };
  h._goToTargeting(false, "spells");
  assert.equal(picked, 1);
  assert.equal(game.scry.view._pendingReturnTab, "spells");
  assert.equal(h._classify({ type: "feat", actionType: "mwak" }), "attack");
  assert.equal(h._classify({ type: "class" }), "utility");
  assert.equal(h._parseBonus("+ 4"), 4);
  assert.equal(h._parseBonus("x"), 0);
  assert.match(h._buildItemRow({ name: "X", desc: "d".repeat(70), category: "feature" }), /…/);
  assert.match(h._buildItemRow({ name: "Y", damage: "1d6", damageType: "fire", category: "feature" }), /1d6 fire/);
  assert.match(h._buildItemRow({ name: "Z", toHitLabel: "+3", category: "attack" }), /\+3 to hit/);
});

// --- Spells tab ---

test("Spells: slots, levels and prep stars", () => {
  mount("spells");
  assert.equal($$(".scry-slot-row").length, 3);
  assert.equal($$('.scry-slot-pip.used[data-level="1"]').length, 1);
  assert.equal($$(".scry-prep-toggle").length, 5, "cantrip has no star");
  assert.ok($('.scry-spell-row[data-item-id="s2"]').classList.contains("unprepared"));
});

test("Spells: slot pip taps spend and restore slots", async () => {
  mount("spells");
  click($('.scry-slot-pip.available[data-level="1"]'));
  assert.ok(calls.some(c => c[1] === "update" && c[2]["system.spells.spell1.value"] === 2));
  click($('.scry-slot-pip.used[data-level="1"]'));
  assert.ok(calls.some(c => c[1] === "update" && c[2]["system.spells.spell1.value"] === 3));
});

test("Spells: prep toggle respects the prepared limit", async () => {
  mount("spells");
  click($('.scry-prep-toggle[data-item-id="s2"]'));
  await tick();
  assert.equal(actor.items.get("s2").system.prepared, true);
  actor.system.spells.prepared = { value: 4, max: 4 };
  actor.items.get("s1").system.prepared = false;
  click($('.scry-prep-toggle[data-item-id="s1"]'));
  await tick();
  assert.ok(notes.some(([, m]) => /max prepared spells \(4\)/.test(m)));
});

test("Spells: mode bar and toggles", () => {
  const h = mount("spells");
  click($('.scry-mode-btn[data-mode="enter"]'));
  assert.equal(h._rollMode, "enter");
  click($(".scry-toggle-autodmg"));
  click($(".scry-toggle-autobonus"));
  assert.equal(h._autoDmg, false);
  assert.equal(h._autoBonus, false);
});

test("Spells: Roll mode cast needs a target unless it's self or an area", async () => {
  mount("spells");
  click($('.scry-spell-cast[data-item-id="s1"]'));
  await tick();
  assert.equal(view._pendingReturnTab, "spells");
  view._tabletopView.exit();
  view.switchTab("spells");
  actor.items.get("s3").system.target = { type: "self" };
  click($('.scry-spell-cast[data-item-id="s3"]'));
  await tick();
  assert.ok(used("Misty Step", "use"));
});

test("Spells: a failed cast clears its hooks and rethrows", async () => {
  const h = mount("spells");
  const item = actor.items.get("s1");
  item.use = async () => { throw new Error("nope"); };
  await assert.rejects(h._doRollSpell(item), /nope/);
  await assert.rejects(h._doEnterSpellAttack(item, actor, 10, null), /nope/);
});

test("Spells: Enter mode attack spell uses the typed d20 and damage", async () => {
  const h = mount("spells");
  target();
  click($('.scry-mode-btn[data-mode="enter"]'));
  click($(".scry-toggle-autodmg"));
  const bolt = actor.items.get("s0");
  bolt.labels.modifier = "+7";
  bolt.use = async () => { const r = new Roll("1d20+7"); Hooks.callAll("dnd5e.rollAttack", [r]); bolt.lastRoll = r; calls.push(["Fire Bolt", "use"]); };
  click($('.scry-spell-cast[data-item-id="s0"]'));
  await tick();
  $("#scry-enter-attack").value = "0";
  click($('[data-modal-btn="0"]'));
  assert.ok(notes.some(([k]) => k === "warn"));
  $("#scry-enter-attack").value = "12";
  $("#scry-enter-damage").value = "6";
  click($('[data-modal-btn="0"]'));
  await tick();
  assert.equal(bolt.lastRoll.total, 19);
  assert.ok(calls.some(c => c[0] === "Orc" && c[1] === "applyDamage"));
  h._autoBonus = false;
});

test("Spells: Enter mode save spell with manual damage", async () => {
  const h = mount("spells");
  target();
  h._rollMode = "enter";
  h._autoDmg = false;
  const sleep = actor.items.get("s5");
  sleep.system.actionType = "save";
  click($('.scry-spell-cast[data-item-id="s5"]'));
  $("#scry-enter-damage").value = "11";
  click($('[data-modal-btn="0"]'));
  await tick();
  assert.ok(used("Bless", "use"));
  assert.ok(calls.some(c => c[0] === "Orc" && c[1] === "applyDamage" && c[2][0].value === 11));
  h._autoDmg = true;
  click($('.scry-spell-cast[data-item-id="s5"]'));
  await tick();
});

test("Spells: area spell shows the D-pad after the chat card and places the template", async () => {
  const h = mount("spells");
  canvas.tokens.placeables.push(makeToken({ id: "t1", x: 0, y: 0 }), makeToken({ id: "t2", x: 800, y: 600 }));
  const events = [];
  canvas.app.view.addEventListener("pointerdown", e => events.push(["down", e.clientX]));
  canvas.app.view.addEventListener("pointermove", e => events.push(["move", e.clientX]));
  const fireball = actor.items.get("s4");
  let finish;
  fireball.use = () => new Promise(r => {
    Hooks.callAll("createChatMessage", {});
    finish = r;
  });
  const cast = h._doRollSpell(fireball);
  await new Promise(r => setTimeout(r, 450));
  await new Promise(r => setTimeout(r, 150));
  assert.ok($("#scry-template-ctrl"), "D-pad up");
  assert.equal(canvas.app.view.style.pointerEvents, "none");
  const arrows = [...$("#scry-template-ctrl").querySelectorAll("button")];
  arrows.slice(0, 4).forEach(b => b.click());
  arrows.at(-1).click();
  assert.equal($("#scry-template-ctrl"), null);
  assert.ok(events.some(e => e[0] === "down"));
  finish();
  await cast;
  assert.ok(calls.some(c => c[1] === "animatePan"));
});

test("Spells: area spell with no tokens zooms out; a non-fatal 'ads' error is swallowed", async () => {
  const h = mount("spells");
  const fireball = actor.items.get("s4");
  fireball.use = async () => { throw new Error("ads hook failed"); };
  await h._doRollSpell(fireball);
  assert.ok(calls.some(c => c[1] === "animatePan" && c[2].scale === 0.4));
  fireball.use = async () => { throw new Error("real"); };
  await assert.rejects(h._placeTemplateTouch(fireball), /real/);
  canvas.ready = false;
  h._fitBattleArea();
});

test("Spells: template detection and bonus parsing", () => {
  const h = new TabSpells();
  assert.equal(h._spellNeedsTemplate({ hasAreaTarget: true, system: {} }), true);
  assert.equal(h._spellNeedsTemplate({ system: { target: { affects: { type: "cone" } } } }), true);
  assert.equal(h._spellNeedsTemplate({ system: { target: { type: "creature" } } }), false);
  assert.equal(h._spellNeedsTemplate({ system: {} }), false);
  assert.equal(h._parseBonus("+7"), 7);
  assert.equal(h._parseBonus(undefined), 0);
});

test("Spells: row tap shows the spell; no spells shows the empty note", () => {
  mount("spells");
  actor.items.get("s1").system.properties = { material: true, ritual: true };
  $('.scry-spell-row[data-item-id="s1"] .scry-spell-name').click();
  assert.equal($(".scry-modal-title").textContent, "Magic Missile");
  assert.match($(".scry-spell-meta").textContent, /M, Ritual/);
  const h = handler("spells");
  assert.match(h._buildSpellList([], false, []), /No spells known/);
  assert.match(h._buildSlotTracker([]), /scry-empty-slots/);
  h.refresh($("#scry-tab-content"), { spellSlots: [], spells: [], noPrep: true });
});

test("Spells: long press and targeting fallbacks", async () => {
  const h = mount("spells");
  let pressed = 0;
  const el = document.createElement("div");
  h._addLongPress(el, () => pressed++);
  el.dispatchEvent(new window.Event("pointerdown"));
  await new Promise(r => setTimeout(r, 650));
  el.dispatchEvent(new window.Event("pointerdown"));
  el.dispatchEvent(new window.Event("pointerup"));
  assert.equal(pressed, 1);
  view._tabletopView.enter();
  h._goToTargeting("spells");
  assert.equal(view._tabletopView._mode, "target");
  const bare = new TabSpells();
  let picked = 0;
  game.scry = { view: { openTokenPicker: () => picked++ } };
  bare._goToTargeting();
  assert.equal(picked, 1);
  game.scry = { view };
});

// --- Gear tab ---

test("Gear: quantity, equip, containers and description", async () => {
  mount("gear");
  click($('.scry-qty-btn[data-item-id="p1"][data-delta="-1"]'));
  await tick();
  assert.equal(actor.items.get("p1").system.quantity, 2);
  click($('.scry-equip-toggle[data-item-id="w2"]'));
  await tick();
  assert.equal(actor.items.get("w2").system.equipped, true);
  const hdr = $('.scry-container-header[data-container-id="b1"]');
  click(hdr);
  assert.ok(hdr.classList.contains("collapsed"));
  click($('.scry-container-btn[data-item-id="e1"]'));
  assert.equal($(".scry-modal-title").textContent, "Move Chain Mail");
  click($('[data-modal-btn="0"]'));
  await tick();
  assert.equal(actor.items.get("e1").system.container, "b1");
  const nested = $(".scry-container-btn.in-container");
  if (nested) { click(nested); await tick(); }
  $('.scry-gear-row[data-item-id="t1"]').click();
  assert.equal($(".scry-modal-title").textContent, "Thieves' Tools");
});

test("Gear: currency editor sets a coin, clamps at 0, ignores junk", async () => {
  mount("gear");
  click($('.scry-currency-value[data-coin="gp"]'));
  $("#scry-currency-input").value = "abc";
  click($('[data-modal-btn="0"]'));
  assert.ok($(".scry-modal-backdrop"));
  $("#scry-currency-input").value = "-5";
  click($('[data-modal-btn="0"]'));
  await tick();
  assert.equal(actor.system.currency.gp, 0);
});

test("Gear: refresh redraws, missing items and no containers are ignored", async () => {
  const h = mount("gear");
  actor.system.currency.pp = 9;
  view._onActorUpdate();
  assert.ok($$(".scry-currency-value").some(c => c.textContent.includes("9")));
  await h._changeQty("zz", 1, actor);
  await h._toggleEquip("zz", actor);
  await h._showContainerPicker("zz", false, actor);
  h._showDescription("zz", actor);
  const bare = makeActor({ items: collection([]) });
  await h._showContainerPicker("x", false, bare);
});

// --- Character tab ---

test("Character: Roll mode rolls ability, save and skill", async () => {
  mount("character");
  click($('.scry-ability-score[data-ability="str"]'));
  click($('.scry-save-row[data-ability="int"]'));
  click($('.scry-skill-row[data-skill="arc"]'));
  await tick();
  assert.ok(calls.some(c => c[1] === "rollAbilityTest"));
  assert.ok(calls.some(c => c[1] === "rollAbilitySave"));
  assert.ok(calls.some(c => c[1] === "rollSkill"));
});

test("Character: older and newer dnd5e roll methods are both found", async () => {
  const h = mount("character");
  delete actor.rollAbilityTest;
  delete actor.rollAbilitySave;
  await h._doRollAbility("dex", actor);
  await h._doRollSave("dex", actor);
  assert.ok(calls.some(c => c[1] === "rollAbilityCheck"));
  assert.ok(calls.some(c => c[1] === "rollSavingThrow"));
  delete actor.rollSavingThrow;
  await h._doRollSave("dex", actor);
  actor.rollSkill = async () => { throw new Error("x"); };
  await h._doRollSkill("arc", actor);
  actor.rollAbilityCheck = async () => { throw new Error("x"); };
  await h._doRollAbility("dex", actor);
});

test("Character: Enter mode posts the typed roll to chat", async () => {
  mount("character");
  click($('.scry-char-mode-btn[data-mode="enter"]'));
  click($('.scry-ability-score[data-ability="str"]'));
  $("#scry-enter-d20").value = "30";
  click($('[data-modal-btn="0"]'));
  assert.ok(notes.some(([k]) => k === "warn"));
  $("#scry-enter-d20").value = "13";
  click($('[data-modal-btn="0"]'));
  await tick();
  assert.equal(rolls.at(-1).roll.total, 14);
  assert.match(rolls.at(-1).data.flavor, /Ability Check/);
  click($('.scry-save-row[data-ability="cha"]'));
  $("#scry-enter-d20").value = "10";
  click($('[data-modal-btn="0"]'));
  click($('.scry-skill-row[data-skill="ath"]'));
  $("#scry-enter-d20").value = "5";
  click($('[data-modal-btn="0"]'));
  await tick();
  assert.equal(rolls.length, 3);
  assert.equal(rolls[1].roll.total, 9);
});

test("Character: inspiration, feature sections and long-press description", async () => {
  const h = mount("character");
  click($(".scry-inspiration-toggle"));
  await tick();
  assert.equal(actor.system.attributes.inspiration, true);
  h.refresh($("#scry-tab-content"), { inspiration: true });
  assert.match($(".scry-inspiration-toggle").textContent, /Inspired/);
  const hdr = $(".scry-feature-header[data-section]");
  click(hdr);
  assert.ok(hdr.classList.contains("collapsed"));
  const feat = $(".scry-feature-item[data-item-id]");
  feat.dispatchEvent(new window.Event("pointerdown"));
  await new Promise(r => setTimeout(r, 650));
  assert.ok($(".scry-modal-title"));
});

// --- Traits tabs (Foundry and Beyond) ---

for (const [theme, pre] of [["classic", "sfnd"], ["beyond-dark", "sbnd"]]) {
  test(`Traits on ${theme}: limited-use features get a Use button, rows open the feature`, async () => {
    mount("traits", theme);
    const h = handler("traits");
    const rendered = [];
    actor.items.get("f4").sheet = { render: () => rendered.push("f4") };
    const lucky = $(`.${pre}-trait-feat-row[data-item-id="f3"] .${pre}-trait-use-btn`);
    assert.ok(!lucky.classList.contains("hidden"));
    assert.equal(lucky.textContent, "Use (3)");
    click(lucky);
    await tick();
    assert.ok(used("Lucky", "use"));
    assert.ok($(`.${pre}-trait-feat-row[data-item-id="f4"] .${pre}-trait-use-btn`).classList.contains("hidden"));
    click($(`.${pre}-trait-feat-row[data-item-id="f4"]`));
    if (pre === "sfnd") assert.deepEqual(rendered, ["f4"]);
    else assert.equal($(".scry-modal-title")?.textContent ?? $(".sbnd-desc-modal")?.textContent ?? "Darkvision", "Darkvision");
    actor.items.get("f3").system.uses.value = 0;
    actor.items.get("f3").use = async () => { throw new Error("x"); };
    view._onActorUpdate();
    assert.equal($(`.${pre}-trait-feat-row[data-item-id="f3"] .${pre}-trait-use-btn`).textContent, "Spent");
    h.refresh($(`#${pre}-content`), { classFeatures: [], raceFeatures: [], feats: [], proficiencies: [], languages: [], traits: {} });
  });
}
