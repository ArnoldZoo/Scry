/*
Module: TableOS Scry — Mobile Player Companion
Component: system-reader.js
Purpose: System abstraction layer — reads actor data for D&D 5e (PF2e stub for v14).

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

const SYSTEM_READERS = {
  "dnd5e": _readDnd5eData,
  "pf2e":  _readPf2eData,
};

export function readActorData(actor) {
  const reader = SYSTEM_READERS[game.system.id];
  if (!reader) {
    console.warn(`TableOS Scry | No reader for system: ${game.system.id}`);
    return null;
  }
  try {
    return reader(actor);
  } catch(err) {
    console.error("TableOS Scry | Error reading actor data:", err);
    return null;
  }
}

function _getActType(item) {
  const acts = item.system.activities;
  if (acts) {
    // Handle DocumentCollection (.contents), Map/EmbeddedCollection (.values()), or plain object
    let list;
    if (Array.isArray(acts.contents) && acts.contents.length > 0) {
      list = acts.contents;
    } else if (typeof acts.values === "function") {
      list = [...acts.values()];
    } else if (acts && typeof acts === "object") {
      list = Object.values(acts).filter(v => v && typeof v === "object");
    }
    if (list?.length) {
      for (const a of list) {
        if (!a || typeof a !== "object") continue;
        const t = (a.activation?.type ?? a.activation?.value ?? "").toLowerCase();
        if (t && t !== "none") return t; // include "special" — callers handle it
      }
    }
  }
  return (item.system.activation?.type ?? "").toLowerCase();
}

function _readDnd5eData(actor) {
  const sys = actor.system;
  const items = actor.items;

  // --- identity ---
  const name  = actor.name;
  const img   = actor.img;
  const classes = items.filter(i => i.type === "class").map(i => ({
    name:     i.name,
    level:    i.system.levels ?? 0,
    hitDie:   i.system.hitDice ?? "d8",
    hdSpent:  i.system.hitDiceUsed ?? 0,
  }));
  const totalLevel  = classes.reduce((t, c) => t + c.level, 0);
  const classLabel  = classes.map(c => `${c.name} ${c.level}`).join(" / ");
  const race        = items.find(i => i.type === "race")?.name ?? sys.details?.race ?? "";
  const background  = items.find(i => i.type === "background")?.name ?? sys.details?.background ?? "";

  // --- HP ---
  const hpCurrent = sys.attributes.hp?.value ?? 0;
  const hpMax     = sys.attributes.hp?.max   ?? 1;
  const hpTemp    = sys.attributes.hp?.temp  ?? 0;
  const hpPct     = Math.round((hpCurrent / hpMax) * 100);

  // --- defense ---
  const ac = sys.attributes.ac?.value ?? 10;
  const concentration = actor.effects?.find(e =>
    !e.disabled && (e.name?.toLowerCase().includes("concentrat") ||
                    e.statuses?.has("concentrating"))
  ) ?? null;

  // --- collapsed stats bar ---
  const speed           = sys.attributes.movement?.walk ?? 30;
  const profBonus       = sys.attributes.prof ?? 2;
  const initiative      = sys.attributes.init?.total ?? sys.attributes.init?.mod ?? 0;
  const passivePerc     = sys.skills?.prc?.passive ?? 10;
  const spellcastingAbl = sys.attributes.spellcasting ?? "";
  const scMod           = spellcastingAbl ? (sys.abilities?.[spellcastingAbl]?.mod ?? 0) : 0;
  const spellAttackBonus = profBonus + scMod;
  const spellSaveDC      = 8 + profBonus + scMod;

  // --- ability scores ---
  const ABILITIES = ["str","dex","con","int","wis","cha"];
  const abilities = ABILITIES.map(key => {
    const abl = sys.abilities?.[key] ?? {};
    return {
      key,
      label:         CONFIG.DND5E?.abilities?.[key]?.label ?? key.toUpperCase(),
      abbreviation:  CONFIG.DND5E?.abilities?.[key]?.abbreviation ?? key.toUpperCase(),
      value:         abl.value ?? 10,
      mod:           abl.mod   ?? 0,
      saveProf:      !!(abl.proficient),
      // dnd5e v5: abl.save is the total save modifier (number); abl.saveBonus is extras (often 0, blocks ??)
      saveBonus:     typeof abl.save === "number" ? abl.save
                   : typeof abl.save?.value === "number" ? abl.save.value
                   : Math.floor(((abl.value ?? 10) - 10) / 2) + (abl.proficient ? profBonus : 0),
    };
  });

  // --- skills ---
  const skills = Object.entries(sys.skills ?? {}).map(([key, sk]) => ({
    key,
    label:      CONFIG.DND5E?.skills?.[key]?.label ?? key,
    total:      sk.total ?? 0,
    prof:       sk.value ?? 0,  // 0=none, 0.5=half, 1=prof, 2=expert
    ability:    sk.ability ?? "",
    passive:    sk.passive ?? (10 + (sk.total ?? 0)),
  })).sort((a, b) => a.label.localeCompare(b.label));

  // --- action economy ---
  const actions = {
    action:     sys.attributes.actions?.value    ?? 1,
    actionMax:  sys.attributes.actions?.max      ?? 1,
    bonus:      sys.attributes.bonusActions?.value ?? 1,
    bonusMax:   sys.attributes.bonusActions?.max   ?? 1,
    reaction:   sys.attributes.reactions?.value  ?? 1,
    reactionMax:sys.attributes.reactions?.max    ?? 1,
  };

  // --- hit dice ---
  const hitDice = classes.map(c => ({
    className: c.name,
    dieSize:   c.hitDie,
    total:     c.level,
    spent:     c.hdSpent,
    remaining: c.level - c.hdSpent,
  }));

  // --- misc ---
  const exhaustion  = sys.attributes.exhaustion ?? 0;
  const conditions  = actor.statuses ? [...actor.statuses] : [];
  const inspiration = sys.attributes.inspiration ?? false;
  const movementRemaining = sys.attributes.movement?.walk ?? 30;

  // --- action economy items (non-spell, grouped by activation type) ---
  const actionItems = { action: [], bonus: [], reaction: [] };
  items.forEach(i => {
    if (i.type === "spell") return; // spells live in the Spells tab
    let actType = _getActType(i);
    // Class/race features with "special" activation (e.g. Wild Shape) count as actions
    if (actType === "special" && i.type === "feat") actType = "action";
    // Features with limited uses but no explicit activation default to action
    if (!actType && i.type === "feat" && (i.system.uses?.max ?? 0) > 0) actType = "action";
    if (!["action","bonus","reaction"].includes(actType)) return;

    const rawTypes = i.system.damage?.base?.types;
    const dmgType  = rawTypes instanceof Set ? [...rawTypes].join(", ")
                   : Array.isArray(rawTypes)  ? rawTypes.join(", ")
                   : (i.system.damage?.parts?.[0]?.[1] ?? "");
    const baseDmg  = i.system.damage?.base?.formula ?? (i.system.damage?.parts?.[0]?.[0] ?? "");
    const toHitLbl = i.labels?.modifier ?? i.labels?.toHit ?? "";

    actionItems[actType].push({
      id:         i.id,
      name:       i.name,
      img:        i.img   ?? "icons/svg/item-bag.svg",
      type:       i.type,
      isWeapon:   i.type === "weapon",
      equipped:   i.system.equipped ?? true,
      toHitLabel: toHitLbl,
      damage:     baseDmg,
      damageType: dmgType,
      actionType: i.system.actionType ?? "",
    });
  });

  // --- weapons ---
  const weapons = items.filter(i => i.type === "weapon").map(i => {
    const dmgParts = i.system.damage?.parts ?? [];
    const baseDmg  = i.system.damage?.base?.formula ?? (dmgParts[0]?.[0] ?? "");
    // dnd5e v5+: damage.base.types and item.properties are Sets, not arrays/objects
    const rawTypes = i.system.damage?.base?.types;
    const dmgType  = rawTypes instanceof Set ? [...rawTypes].join(", ")
                   : Array.isArray(rawTypes)  ? rawTypes.join(", ")
                   : (dmgParts[0]?.[1] ?? "");
    const rawProps = i.system.properties;
    const props    = rawProps instanceof Set  ? [...rawProps]
                   : rawProps                 ? Object.entries(rawProps).filter(([,v]) => v === true).map(([k]) => k)
                   : [];
    return {
      id:          i.id,
      name:        i.name,
      img:         i.img,
      equipped:    i.system.equipped ?? false,
      attackBonus: i.system.attackBonus ?? 0,
      // dnd5e v5: labels.modifier is the computed total to-hit string (e.g. "+10")
      toHitLabel:  i.labels?.modifier ?? i.labels?.toHit
                   ?? `${(i.system.attackBonus ?? 0) >= 0 ? "+" : ""}${i.system.attackBonus ?? 0}`,
      damage:      baseDmg,
      damageType:  dmgType,
      range:       i.system.range?.value ?? i.system.range?.reach ?? 5,
      properties:  props,
    };
  });

  // --- spells ---
  const noPrep = classes.some(c =>
    ["Sorcerer","Warlock","Bard"].includes(c.name)
  );

  const spellSlots = Object.entries(sys.spells ?? {})
    .filter(([key]) => /^spell[1-9]$/.test(key))
    .map(([key, slot]) => ({
      level: parseInt(key.replace("spell","")),
      value: slot.value ?? 0,
      max:   slot.max   ?? 0,
    }))
    .filter(s => s.max > 0);

  const spells = items.filter(i => i.type === "spell").map(i => ({
    id:              i.id,
    name:            i.name,
    img:             i.img,
    level:           i.system.level ?? 0,
    prepared:        i.system.preparation?.prepared ?? i.system.prepared ?? false,
    preparationMode: i.system.preparation?.mode ?? i.system.method ?? "prepared",
    school:          i.system.school ?? "",
    castTime:        _getActType(i),
    concentration:   i.system.duration?.concentration ?? false,
    description:     i.system.description?.value ?? "",
  })).sort((a,b) => a.level - b.level || a.name.localeCompare(b.name));

  // --- gear ---
  const currency    = sys.currency ?? { pp:0, gp:0, ep:0, sp:0, cp:0 };
  const encumbrance = {
    value: sys.attributes.encumbrance?.value ?? 0,
    max:   sys.attributes.encumbrance?.max   ?? 150,
    pct:   sys.attributes.encumbrance?.pct   ?? 0,
  };

  const CONTAINER_TYPES = new Set(["backpack","container"]);
  const equipment = items
    .filter(i => ["weapon","equipment","loot","consumable","tool","backpack","container"].includes(i.type))
    .map(i => ({
      id:          i.id,
      name:        i.name,
      img:         i.img,
      type:        i.type,
      equipped:    i.system.equipped ?? false,
      quantity:    i.system.quantity ?? 1,
      weight:      i.system.weight?.value ?? (typeof i.system.weight === "number" ? i.system.weight : 0),
      description: i.system.description?.value ?? "",
      isContainer: CONTAINER_TYPES.has(i.type),
      contents:    CONTAINER_TYPES.has(i.type)
        ? items.filter(c => c.system.container === i.id).map(c => ({
            id:       c.id,
            name:     c.name,
            img:      c.img,
            quantity: c.system.quantity ?? 1,
          }))
        : [],
    }));

  // --- features ---
  const allFeats       = items.filter(i => i.type === "feat");
  const classFeatures  = allFeats.filter(f => f.system.type?.value === "class");
  const raceFeatures   = allFeats.filter(f => f.system.type?.value === "race");
  const feats          = allFeats.filter(f => ["feat","general",""].includes(f.system.type?.value ?? "feat"));

  const mapFeat = i => ({
    id:          i.id,
    name:        i.name,
    img:         i.img,
    description: i.system.description?.value ?? "",
  });

  // --- proficiencies + languages ---
  const proficiencies = [
    ...(sys.traits?.weaponProf?.value ?? []),
    ...(sys.traits?.armorProf?.value  ?? []),
    ...(sys.traits?.toolProf?.value   ?? []),
  ];
  const languages = sys.traits?.languages?.value
    ? [...sys.traits.languages.value]
    : [];

  // --- traits / personality ---
  const traits = {
    personality: sys.details?.trait  ?? "",
    ideals:      sys.details?.ideal  ?? "",
    bonds:       sys.details?.bond   ?? "",
    flaws:       sys.details?.flaw   ?? "",
  };

  return {
    // identity
    name, img, classes, totalLevel, classLabel, race, background,
    // HP
    hpCurrent, hpMax, hpTemp, hpPct,
    // defense
    ac, concentration,
    // stats bar
    speed, profBonus, initiative, passivePerc,
    spellcastingAbl, spellAttackBonus, spellSaveDC,
    // character
    abilities, skills,
    // combat
    actions, actionItems, hitDice, exhaustion, conditions, inspiration, movementRemaining,
    // weapons
    weapons,
    // spells
    noPrep, spellSlots, spells,
    // gear
    currency, encumbrance, equipment,
    // features
    classFeatures: classFeatures.map(mapFeat),
    raceFeatures:  raceFeatures.map(mapFeat),
    feats:         feats.map(mapFeat),
    proficiencies, languages, traits,
  };
}

function _readPf2eData(_actor) {
  // PF2e support planned for v14 migration
  console.warn("TableOS Scry | PF2e reader not yet implemented.");
  return null;
}
