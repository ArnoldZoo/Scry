import { makeActor, makeItem, collection } from "./setup.mjs";
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readActorData } from "../scripts/system-reader.js";

afterEach(() => { game.system.id = "dnd5e"; });

test("identity, classes and HP", () => {
  const d = readActorData(makeActor());
  assert.equal(d.name, "Aria");
  assert.equal(d.totalLevel, 6);
  assert.equal(d.classLabel, "Wizard 5 / Fighter 1");
  assert.equal(d.race, "Elf");
  assert.deepEqual([d.hpCurrent, d.hpMax, d.hpTemp, d.hpPct], [20, 40, 5, 50]);
  assert.equal(d.ac, 16);
  assert.ok(d.concentration, "the concentrating effect is found");
});

test("spell attack and DC come from the spellcasting ability", () => {
  const d = readActorData(makeActor());
  assert.equal(d.spellcastingAbl, "int");
  assert.equal(d.spellAttackBonus, 3 + 4);
  assert.equal(d.spellSaveDC, 8 + 3 + 4);
});

test("save bonus reads a number, a {value} object, or works it out", () => {
  const d = readActorData(makeActor());
  const by = k => d.abilities.find(a => a.key === k);
  assert.equal(by("str").saveBonus, 4);
  assert.equal(by("dex").saveBonus, 2);
  assert.equal(by("con").saveBonus, 1, "13 con, not proficient");
  assert.equal(by("str").label, "Strength");
  assert.equal(by("dex").label, "DEX", "falls back to the key when CONFIG has no label");
});

test("skills are sorted by label and passive is filled in", () => {
  const d = readActorData(makeActor());
  assert.deepEqual(d.skills.map(s => s.label), ["Arcana", "Athletics", "Perception"]);
  assert.equal(d.skills.find(s => s.key === "arc").passive, 17);
  assert.equal(d.passivePerc, 13);
});

test("hit dice remaining per class", () => {
  const d = readActorData(makeActor());
  assert.deepEqual(d.hitDice.map(h => [h.className, h.remaining]), [["Wizard", 4], ["Fighter", 1]]);
});

test("action items are grouped by activation, spells left out", () => {
  const d = readActorData(makeActor());
  const names = k => d.actionItems[k].map(i => i.name);
  assert.ok(names("action").includes("Longsword"));
  assert.ok(names("action").includes("Dagger"), "legacy system.activation.type");
  assert.ok(names("action").includes("Wild Shape"), "special feats count as actions");
  assert.ok(names("action").includes("Lucky"), "limited-use feat with no activation defaults to action");
  assert.ok(names("bonus").includes("Second Wind"));
  assert.ok(names("reaction").includes("Shield Master"));
  assert.ok(!names("action").includes("Fire Bolt"));
  assert.ok(!names("action").includes("Darkvision"), "no activation and no uses");
  const sword = d.actionItems.action.find(i => i.name === "Longsword");
  assert.equal(sword.damageType, "slashing");
  assert.equal(sword.toHitLabel, "+5");
});

test("weapons read dnd5e 5.x Sets and the older object/array shapes", () => {
  const d = readActorData(makeActor());
  const sword  = d.weapons.find(w => w.name === "Longsword");
  const dagger = d.weapons.find(w => w.name === "Dagger");
  assert.deepEqual(sword.properties, ["ver"]);
  assert.equal(sword.damage, "1d8");
  assert.deepEqual(dagger.properties, ["fin", "thr"]);
  assert.equal(dagger.damage, "1d4");
  assert.equal(dagger.damageType, "piercing");
  assert.equal(dagger.toHitLabel, "+1");
});

test("activity collections in all three shapes", () => {
  const acts = [
    { contents: [{ activation: { type: "bonus" } }] },
    new Map([["x", { activation: { value: "reaction" } }]]),
    { a: { activation: { type: "none" } }, b: { activation: { type: "action" } } }
  ];
  const items = acts.map((activities, n) => makeItem({ id: `i${n}`, name: `I${n}`, type: "weapon", system: { activities } }));
  const d = readActorData(makeActor({ items: collection(items) }));
  assert.deepEqual(d.actionItems.bonus.map(i => i.name), ["I0"]);
  assert.deepEqual(d.actionItems.reaction.map(i => i.name), ["I1"]);
  assert.deepEqual(d.actionItems.action.map(i => i.name), ["I2"]);
});

test("spells: slots with max 0 are dropped, list sorted by level then name", () => {
  const d = readActorData(makeActor());
  assert.deepEqual(d.spellSlots.map(s => [s.level, s.value, s.max]), [[1, 3, 4], [2, 2, 3], [3, 1, 2]]);
  assert.deepEqual(d.spells.map(s => s.name),
    ["Fire Bolt", "Bless", "Magic Missile", "Shield", "Misty Step", "Fireball"]);
  const bolt = d.spells[0];
  assert.equal(bolt.prepared, true, "reads system.prepared");
  assert.equal(bolt.preparationMode, "spell", "reads system.method");
  assert.equal(d.spells.find(s => s.name === "Bless").concentration, true);
  assert.equal(d.noPrep, false);
});

test("sorcerers, warlocks and bards don't prepare", () => {
  const items = collection([makeItem({ id: "c", name: "Bard", type: "class", system: { levels: 3 } })]);
  assert.equal(readActorData(makeActor({ items })).noPrep, true);
});

test("gear, containers and weight", () => {
  const d = readActorData(makeActor());
  const pack = d.equipment.find(e => e.name === "Backpack");
  assert.equal(pack.isContainer, true);
  assert.deepEqual(pack.contents.map(c => c.name), ["Rope"]);
  assert.equal(d.equipment.find(e => e.name === "Dagger").weight, 1, "number weight");
  assert.equal(d.equipment.find(e => e.name === "Chain Mail").weight, 55);
  assert.equal(d.equipment.find(e => e.name === "Thieves' Tools").weight, 0);
  assert.deepEqual(d.encumbrance, { value: 70, max: 150, pct: 46 });
});

test("features, proficiencies, languages and personality", () => {
  const d = readActorData(makeActor());
  assert.deepEqual(d.classFeatures.map(f => f.name), ["Second Wind", "Wild Shape"]);
  assert.deepEqual(d.raceFeatures.map(f => f.name), ["Darkvision"]);
  assert.deepEqual(d.feats.map(f => f.name), ["Lucky", "Shield Master"]);
  assert.deepEqual(d.proficiencies, ["simple", "light"]);
  assert.deepEqual(d.languages, ["common", "elvish"]);
  assert.equal(d.traits.flaws, "Arrogant");
  assert.deepEqual(d.conditions, ["prone"]);
});

test("a bare actor gets safe defaults", () => {
  const actor = makeActor({ items: collection([]) });
  actor.system = { attributes: {} };
  actor.effects = null;
  actor.statuses = null;
  const d = readActorData(actor);
  assert.equal(d.hpMax, 1);
  assert.equal(d.ac, 10);
  assert.equal(d.speed, 30);
  assert.equal(d.concentration, null);
  assert.deepEqual(d.conditions, []);
  assert.deepEqual(d.currency, { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 });
  assert.equal(d.spellAttackBonus, 2);
});

test("pf2e and unknown systems return null", () => {
  game.system.id = "pf2e";
  assert.equal(readActorData(makeActor()), null);
  game.system.id = "swade";
  assert.equal(readActorData(makeActor()), null);
});

test("a reader error returns null instead of throwing", () => {
  assert.equal(readActorData({ system: null, items: [] }), null);
});
