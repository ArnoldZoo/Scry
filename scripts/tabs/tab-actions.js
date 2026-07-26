/*
Module: TableOS Scry — Mobile Player Companion
Component: tabs/tab-actions.js
Purpose: Actions tab — economy tabs, category chips, attacks/spells/features/items/utility.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

// D&D system actions that exist outside the actor's item list
const SYSTEM_UTIL = {
  action: [
    { id:"sys-dash",      name:"Dash",              img:"icons/skills/movement/feet-winged-boots-brown.webp",     desc:"Double your movement speed this turn." },
    { id:"sys-dodge",     name:"Dodge",             img:"icons/magic/defensive/shield-barrier-glowing-blue.webp",  desc:"Attacks against you have disadvantage. You can't be surprised until your next turn." },
    { id:"sys-disengage", name:"Disengage",         img:"icons/skills/movement/arrow-upright-yellow.webp",         desc:"Your movement doesn't provoke opportunity attacks this turn." },
    { id:"sys-hide",      name:"Hide",              img:"icons/magic/perception/eye-ringed-glow-invisible.webp",   desc:"Make a Dexterity (Stealth) check to attempt to hide." },
    { id:"sys-help",      name:"Help",              img:"icons/skills/social/wave-halt-white.webp",                desc:"Give an ally advantage on their next ability check or attack roll." },
    { id:"sys-search",    name:"Search",            img:"icons/tools/scribal/magnifying-glass.webp",               desc:"Devote attention to finding something (Perception or Investigation check)." },
    { id:"sys-ready",     name:"Ready",             img:"icons/svg/clockwork.svg",                                  desc:"Hold your action until a trigger occurs, then take a reaction." },
    { id:"sys-useobj",    name:"Use Object",        img:"icons/equipment/hand/glove-simple-leather-brown.webp",    desc:"Interact with a second object or use a special object feature." },
  ],
  bonus: [
    { id:"sys-offhand",   name:"Off-hand Attack",   img:"icons/weapons/swords/sword-guard-brown.webp",             desc:"Attack with a light weapon in your off-hand when you take the Attack action." },
  ],
  reaction: [
    { id:"sys-oppatk",    name:"Opportunity Attack", img:"icons/weapons/swords/sword-katana-red.webp",             desc:"Make one melee attack against a creature that moves out of your reach." },
  ],
};

const CATEGORIES  = ["attack","spell","feature","item","utility"];
const CAT_LABELS  = { attack:"Attacks", spell:"Spells", feature:"Features", item:"Items", utility:"Utility" };
const CAT_COLORS  = { attack:"#ef4444", spell:"#8b5cf6", feature:"#f59e0b", item:"#3b82f6", utility:"#6b7280" };
const MAX_KEYS    = { action:"actionMax", bonus:"bonusMax", reaction:"reactionMax" };

const _isSelfTarget = (item) => {
  const t = item?.system?.target?.type ?? item?.system?.range?.type ?? "";
  return t === "self";
};

export class TabActions {
  constructor() {
    this._rollMode  = "roll";
    this._autoDmg   = true;
    this._autoBonus = true;
    this._activeEco = "action";
    this._activeCat = "attack";
    this._condGroup = "a-f";
    this._ecoByActor = new Map();  // actorId -> {action, bonus, reaction}
    this._lastData   = null;
    this._lastActor  = null;
  }

  _eco(actorId) {
    if (!actorId) return { action: 0, bonus: 0, reaction: 0 };
    if (!this._ecoByActor.has(actorId)) {
      this._ecoByActor.set(actorId, { action: 0, bonus: 0, reaction: 0 });
    }
    return this._ecoByActor.get(actorId);
  }

  render(data, actor) {
    this._lastData  = data;
    if (actor) this._lastActor = actor;
    return `<div class="scry-tab-actions">${this._buildAll(data)}</div>`;
  }

  activate(element, actor) {
    this._lastActor = actor;
    this._wireAll(element, actor);
  }

  refresh(element, data) {
    this._lastData = data;
    if (this._lastActor) this._rebuildContent(element, this._lastActor);
  }

  // -- Core rebuild -------------------------------------------------------------

  _buildAll(data) {
    if (this._activeEco === "status") {
      return this._buildStatusPanel(data);
    }
    return `
      ${this._buildEconomySection(data)}
      ${this._buildCategoryChips()}
      ${this._buildModeBar()}
      ${this._buildActionList(data)}
      ${this._buildCombatButtons()}`;
  }

  _rebuildContent(element, actor) {
    const data = this._lastData;
    if (!data) return;
    const container = element.querySelector(".scry-tab-actions");
    if (!container) return;
    container.innerHTML = this._buildAll(data);
    this._wireAll(element, actor);
  }

  _wireAll(element, actor) {
    this._wireEconomyTabs(element, actor);
    this._wirePips(element, actor);
    this._wireCategoryChips(element, actor);
    this._wireItems(element, actor);
    this._wireStatusPanel(element, actor);
    this._wireModeBar(element);
    this._wireCombatButtons(element, actor);
  }

  // -- Pip tracking -------------------------------------------------------------

  _markPipUsed() {
    const eco = this._activeEco;
    if (eco === "status") return;
    const max = this._lastData?.actions?.[MAX_KEYS[eco]] ?? 1;
    const ecoState = this._eco(this._lastActor?.id);
    if (ecoState[eco] < max) ecoState[eco]++;
  }

  // -- Wiring -------------------------------------------------------------------

  _wireEconomyTabs(element, actor) {
    element.querySelectorAll(".scry-eco-tab[data-eco]").forEach(tab => {
      tab.addEventListener("click", () => {
        if (this._activeEco !== tab.dataset.eco) {
          this._activeEco = tab.dataset.eco;
          this._activeCat = "all"; // reset category when switching economy
          this._rebuildContent(element, actor);
        }
      });
    });
  }

  _wirePips(element, actor) {
    element.querySelectorAll(".scry-ae-pip[data-eco][data-idx]").forEach(pip => {
      pip.addEventListener("click", (e) => {
        e.stopPropagation();
        const eco = pip.dataset.eco;
        const idx = parseInt(pip.dataset.idx);
        // Tap used pip = undo back to that slot; tap available pip = mark all up to it
        const s = this._eco(actor?.id); s[eco] = (idx < s[eco]) ? idx : idx + 1;
        this._rebuildContent(element, actor);
      });
    });
  }

  _wireCategoryChips(element, actor) {
    element.querySelectorAll(".scry-cat-chip[data-cat]").forEach(chip => {
      chip.addEventListener("click", () => {
        this._activeCat = chip.dataset.cat;
        this._rebuildContent(element, actor);
      });
    });
  }

  _wireItems(element, actor) {
    // Attack buttons (weapons and attack-type feats)
    element.querySelectorAll(".scry-weapon-attack[data-item-id]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const item = actor.items.get(btn.dataset.itemId);
        if (!item) return;
        if (game.user.targets.size === 0) {
          const tv = game.scry?.view?._tabletopView;
          const remembered = tv?._lastTargetIds ?? [];
          let restored = false;
          if (remembered.length > 0 && canvas?.ready) {
            for (const id of remembered) {
              const t = canvas.tokens?.placeables?.find(p => p.id === id);
              if (t) { t.setTarget(true, { user: game.user, releaseOthers: false }); restored = true; }
            }
          }
          if (!restored) {
            this._goToTargeting(false, "actions");
            return;
          }
        }
        if (this._rollMode === "roll") {
          await this._doRollAttack(item);
          this._markPipUsed();
          this._rebuildContent(element, actor);
          game.scry?.view?.enterTableView();
        } else {
          this._openEnterDialog(item, actor, element);
        }
      });
    });

    // Cast buttons (spells)
    element.querySelectorAll(".scry-spell-cast[data-item-id]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const item = actor.items.get(btn.dataset.itemId);
        if (!item) return;
        if (this._rollMode === "roll" && game.user.targets.size === 0 && !_isSelfTarget(item)) {
          this._goToTargeting(false, "actions");
          return;
        }
        try {
          Hooks.once("dnd5e.preUseActivity", (_a,_u,d) => { if (d) d.configure = false; });
          await item.use({}, { configure: false }, {});
          this._markPipUsed();
          this._rebuildContent(element, actor);
          game.scry?.view?.enterTableView();
        } catch(e) { console.error("Scry | spell cast:", e); }
      });
    });

    // Use buttons (features, consumables, equipped items)
    // enterTableView fires AFTER item.use() resolves — dialogs (beast picker, activity picker) appear
    // over the Scry overlay so the user can interact with them, then canvas shows on completion
    element.querySelectorAll(".scry-item-use[data-item-id]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const item = actor.items.get(btn.dataset.itemId);
        if (!item) return;
        try {
          await item.use();
          this._markPipUsed();
          this._rebuildContent(element, actor);
          game.scry?.view?.enterTableView();
        } catch(e) { console.warn("Scry | item use:", e); }
      });
    });

    // Ref buttons (system utility actions) — Scry-styled info modal, then mark pip
    const eco = this._activeEco;
    const sysActions = SYSTEM_UTIL[eco] ?? [];
    element.querySelectorAll(".scry-sys-ref[data-sys-id]").forEach(btn => {
      const action = sysActions.find(a => a.id === btn.dataset.sysId);
      if (!action) return;
      btn.addEventListener("click", () => {
        const view = game.scry?.view;
        if (view?._openScryModal) {
          view._openScryModal({
            title: action.name,
            bodyHtml: `<p class="scry-modal-desc">${action.desc}</p>`,
            buttons: [
              {
                label: "Use (mark action)",
                className: "scry-modal-btn-primary",
                callback: ({ closeModal }) => {
                  closeModal();
                  this._markPipUsed();
                  this._rebuildContent(element, this._lastActor);
                }
              },
              { label: "Cancel" }
            ]
          });
        }
      });
    });

    // Tap info area on any row (not the action button) to view item description
    element.querySelectorAll(".scry-action-row[data-item-id]").forEach(row => {
      row.addEventListener("click", e => {
        if (e.target.closest(".scry-btn-action")) return;
        if (row.dataset.source === "system") return; // system items use Ref button
        this._showItemDescription(row.dataset.itemId, actor);
      });
    });
  }

  _wireStatusPanel(element, actor) {
    // Inspiration
    element.querySelector(".scry-status-insp-toggle")?.addEventListener("click", async () => {
      const current = actor.system.attributes.inspiration ?? false;
      await actor.update({ "system.attributes.inspiration": !current });
    });

    // Condition group tabs
    element.querySelectorAll(".scry-cond-group-btn[data-group]").forEach(btn => {
      btn.addEventListener("click", () => {
        this._condGroup = btn.dataset.group;
        this._rebuildContent(element, actor);
      });
    });

    // Condition toggle buttons — read actual actor state, not CSS class
    element.querySelectorAll(".scry-cond-btn[data-status-id]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.statusId;
        const isActive = actor.statuses?.has(id) ?? false;
        try { await actor.toggleStatusEffect(id, { active: !isActive }); }
        catch(e) { console.error("Scry | condition toggle:", e); }
      });
    });

    // Clear All — removes all active status effects known to CONFIG
    element.querySelector(".scry-cond-clear-all")?.addEventListener("click", async () => {
      const knownIds = new Set((CONFIG?.statusEffects ?? []).map(e => e.id));
      const effs = actor.effects?.contents ?? [...(actor.effects?.values?.() ?? [])];
      const removeIds = effs.filter(e => {
        const sid = [...(e.statuses ?? [])][0] ?? e.flags?.core?.statusId ?? "";
        return sid && knownIds.has(sid);
      }).map(e => e.id);
      if (removeIds.length) {
        try { await actor.deleteEmbeddedDocuments("ActiveEffect", removeIds); } catch(e) {}
      }
    });

  }

  _wireModeBar(element) {
    element.querySelectorAll(".scry-mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this._rollMode = btn.dataset.mode;
        element.querySelectorAll(".scry-mode-btn").forEach(b =>
          b.classList.toggle("active", b.dataset.mode === this._rollMode)
        );
      });
    });
    element.querySelector(".scry-toggle-autodmg")?.addEventListener("click", e => {
      this._autoDmg = !this._autoDmg;
      e.currentTarget.classList.toggle("on", this._autoDmg);
    });
    element.querySelector(".scry-toggle-autobonus")?.addEventListener("click", e => {
      this._autoBonus = !this._autoBonus;
      e.currentTarget.classList.toggle("on", this._autoBonus);
    });
  }

  _wireCombatButtons(element, actor) {
    element.querySelector(".scry-btn-target")?.addEventListener("click", () => this._toggleTargeting());
    element.querySelector(".scry-btn-hold")?.addEventListener("click", () => {
      try { globalThis.TABLE_OS?.holdAction?.(); } catch(_) {}
    });
    element.querySelector(".scry-btn-endturn")?.addEventListener("click", () => {
      if (game.combat?.combatant?.actor?.isOwner) game.combat.nextTurn();
    });
    element.querySelector(".scry-btn-initiative")?.addEventListener("click", () => {
      game.scry?.view?._openInitiativeDialog?.() ?? actor.rollInitiative({ createCombatants: true });
    });
  }

  // -- Data classification ------------------------------------------------------

  _classify(item) {
    if (item.type === "weapon") return "attack";
    if (item.type === "spell")  return "spell";
    if (item.type === "feat") {
      const aType = item.actionType ?? "";
      return ["mwak","rwak","msak","rsak"].includes(aType) ? "attack" : "feature";
    }
    if (["consumable","equipment","loot","tool"].includes(item.type)) return "item";
    return "utility";
  }

  _getEcoItems(data) {
    const eco = this._activeEco;
    if (eco === "status") return [];

    // Actor items for this economy type
    const ecoActorItems = (data.actionItems?.[eco] ?? []).map(i => ({
      ...i, category: this._classify(i), _source: "actor",
    }));

    // Weapons with no explicit activation.type (action economy by default)
    if (eco === "action") {
      const knownIds = new Set(ecoActorItems.map(i => i.id));
      (data.weapons ?? []).filter(w => !knownIds.has(w.id)).forEach(w => {
        ecoActorItems.push({
          id: w.id, name: w.name, img: w.img, type: "weapon",
          isWeapon: true, equipped: w.equipped, category: "attack",
          toHitLabel: w.toHitLabel, damage: w.damage, damageType: w.damageType,
          actionType: "", _source: "actor",
        });
      });
    }

    // Spells filtered by cast time + prepared status
    // castTime is lowercased in system-reader; comparison is case-insensitive safe
    const castMap    = { action: "action", bonus: "bonus", reaction: "reaction" };
    const alwaysModes = new Set(["always","at-will","atwill","innate","known","pact"]);
    const ecoSpells = (data.spells ?? [])
      .filter(s => {
        if ((s.castTime ?? "").toLowerCase() !== castMap[eco]) return false;
        if (s.level === 0) return true;                             // cantrips always available
        if (data.noPrep) return true;                              // sorcerer/bard/warlock: all known spells
        if (alwaysModes.has(s.preparationMode)) return true;      // always-prepared modes
        return s.prepared === true;
      })
      .map(s => ({
        id: s.id, name: s.name, img: s.img, type: "spell",
        category: "spell", isWeapon: false, equipped: true,
        toHitLabel: "", damage: "", damageType: "",
        level: s.level, preparationMode: s.preparationMode,
        concentration: s.concentration, _source: "spell",
      }));

    // System utility actions
    const sysItems = (SYSTEM_UTIL[eco] ?? []).map(u => ({
      ...u, type: "utility", category: "utility",
      isWeapon: false, equipped: true, _source: "system",
    }));

    // All equipped items (equipment, consumables, wondrous items, etc.)
    // shown in action economy regardless of activation type — lets players see/reference everything
    if (eco === "action") {
      const knownIds = new Set(ecoActorItems.map(i => i.id));
      (data.equipment ?? []).filter(e => e.equipped && !knownIds.has(e.id)).forEach(e => {
        ecoActorItems.push({
          id: e.id, name: e.name, img: e.img, type: e.type,
          isWeapon: false, equipped: true, category: "item",
          toHitLabel: "", damage: "", damageType: "",
          actionType: "", _source: "actor", desc: "",
        });
      });
    }

    return [...ecoActorItems, ...ecoSpells, ...sysItems];
  }

  // -- HTML builders ------------------------------------------------------------

  _buildEconomySection(data) {
    const a = data.actions ?? { action:1, actionMax:1, bonus:1, bonusMax:1, reaction:1, reactionMax:1 };
    const scry    = game.scry?.view;
    const speed   = data.speed ?? 30;
    const used    = scry?._movementUsed ?? 0;
    const gDist   = canvas.grid?.distance ?? 5;
    const totalSq = Math.round(speed / gDist);
    const usedSq  = Math.min(Math.round(used / gDist), totalSq);
    const remFt   = Math.max(speed - used, 0);
    const remSq   = totalSq - usedSq;

    let movePips = "";
    for (let i = 0; i < totalSq; i++) {
      let cls = "scry-move-sq";
      if (i < usedSq)                             cls += " is-used";
      else if (remSq <= Math.round(totalSq * .25)) cls += " is-danger";
      else if (remSq <= Math.round(totalSq * .50)) cls += " is-warn";
      movePips += `<span class="${cls}"></span>`;
    }

    const ECO_ICONS = { action: "fas fa-hand-fist", bonus: "fas fa-plus-circle", reaction: "fas fa-shield-halved" };
    const mkTab = (label, max, eco) => {
      const usedCount = Math.min(this._eco(this._lastActor?.id)[eco] ?? 0, max ?? 0);
      const isActive  = this._activeEco === eco;
      const pips = max ? Array.from({ length: max }, (_, i) =>
        `<span class="scry-ae-pip ${i < usedCount ? "used" : "available"}"
               data-eco="${eco}" data-idx="${i}"></span>`
      ).join("") : "";
      return `<button class="scry-eco-tab ${isActive ? "is-active" : ""}" data-eco="${eco}">
        <span class="scry-eco-tab-label"><i class="${ECO_ICONS[eco]}"></i> ${label}</span>
        ${pips ? `<div class="scry-eco-tab-pips">${pips}</div>` : ""}
      </button>`;
    };

    return `
      <section class="scry-card scry-action-economy">
        <div class="scry-eco-tab-row">
          ${mkTab("Action",   a.actionMax,   "action")}
          ${mkTab("Bonus",    a.bonusMax,    "bonus")}
          ${mkTab("Reaction", a.reactionMax, "reaction")}
        </div>
        <div class="scry-ae-row">
          <span class="scry-ae-label">Move</span>
          <div class="scry-ae-pips scry-move-pips-row">${movePips}</div>
          <span class="scry-move-ft-label">${remFt}ft</span>
        </div>
      </section>`;
  }

  _buildCategoryChips() {
    return `<div class="scry-cat-chips">
      ${CATEGORIES.map(cat =>
        `<button class="scry-cat-chip ${this._activeCat === cat ? "is-active" : ""}" data-cat="${cat}">
          ${CAT_LABELS[cat]}
        </button>`
      ).join("")}
    </div>`;
  }

  _buildModeBar() {
    return `
      <section class="scry-card scry-mode-bar">
        <div class="scry-mode-row">
          <button class="scry-mode-btn ${this._rollMode === "roll"  ? "active" : ""}" data-mode="roll">Roll</button>
          <button class="scry-mode-btn ${this._rollMode === "enter" ? "active" : ""}" data-mode="enter">Enter</button>
          <button class="scry-toggle scry-toggle-autodmg  ${this._autoDmg   ? "on" : ""}">Auto Dmg</button>
          <button class="scry-toggle scry-toggle-autobonus ${this._autoBonus ? "on" : ""}">Auto Bonus</button>
        </div>
      </section>`;
  }

  _buildActionList(data) {
    const allItems = this._getEcoItems(data);
    const filtered = this._activeCat === "all"
      ? allItems
      : allItems.filter(i => i.category === this._activeCat);

    if (!filtered.length) {
      const ecoLabel = { action:"Actions", bonus:"Bonus Actions", reaction:"Reactions" }[this._activeEco] ?? "";
      const catNote  = this._activeCat !== "all" ? ` (${CAT_LABELS[this._activeCat]})` : "";
      return `<section class="scry-card scry-action-list">
        <p class="scry-empty">No ${ecoLabel.toLowerCase()} available${catNote}.</p>
      </section>`;
    }

    // Spell-only view: use grouped layout with slot pips
    if (this._activeCat === "spell") {
      return this._buildSpellSection(filtered, data);
    }

    // "All" view: non-spell items flat, then spells grouped
    if (this._activeCat === "all") {
      const spells   = filtered.filter(i => i.category === "spell");
      const nonSpell = filtered.filter(i => i.category !== "spell");
      const parts = [];
      if (nonSpell.length) {
        parts.push(`<section class="scry-card scry-action-list">
          ${nonSpell.map(item => this._buildItemRow(item)).join("")}
        </section>`);
      }
      if (spells.length) parts.push(this._buildSpellSection(spells, data));
      return parts.join("");
    }

    return `<section class="scry-card scry-action-list">
      ${filtered.map(item => this._buildItemRow(item)).join("")}
    </section>`;
  }

  _buildSpellSection(spells, data) {
    const levelLabels = {
      0:"Cantrips", 1:"1st Level", 2:"2nd Level", 3:"3rd Level", 4:"4th Level",
      5:"5th Level", 6:"6th Level", 7:"7th Level", 8:"8th Level", 9:"9th Level",
    };
    const slotMap = {};
    for (const slot of (data.spellSlots ?? [])) slotMap[slot.level] = slot;

    const groups = {};
    for (const s of spells) {
      if (!groups[s.level]) groups[s.level] = [];
      groups[s.level].push(s);
    }

    const sections = Object.keys(groups).sort((a,b) => a-b).map(lvl => {
      const level = parseInt(lvl);
      const slot  = slotMap[level];
      const pips  = slot ? Array.from({ length: slot.max }, (_, i) =>
        `<span class="scry-slot-pip ${i < slot.value ? "available" : "used"}"></span>`
      ).join("") : "";

      const header = `<div class="scry-action-spell-header">
        <span class="scry-spell-level-label">${levelLabels[level] ?? `${level}th Level`}</span>
        ${pips ? `<div class="scry-slot-pips">${pips}</div>` : ""}
        ${slot  ? `<span class="scry-slot-count">${slot.value}/${slot.max}</span>` : ""}
      </div>`;

      return header + groups[level].map(item => this._buildItemRow(item)).join("");
    }).join("");

    return `<section class="scry-card scry-action-list scry-spell-grouped">${sections}</section>`;
  }

  _buildItemRow(item) {
    const cat   = item.category ?? "utility";
    const color = CAT_COLORS[cat] ?? "#6b7280";
    const label = CAT_LABELS[cat] ?? cat;

    // Build detail string
    let detail = "";
    if (cat === "spell") {
      const lvl = item.level === 0 ? "Cantrip" : `Lvl ${item.level}`;
      detail = item.concentration ? `${lvl} · Conc.` : lvl;
    } else if (item.toHitLabel && item.damage) {
      detail = `${item.toHitLabel} · ${item.damage} ${item.damageType}`;
    } else if (item.toHitLabel) {
      detail = `${item.toHitLabel} to hit`;
    } else if (item.damage) {
      detail = `${item.damage} ${item.damageType}`;
    } else if (item.desc) {
      detail = item.desc.slice(0, 55) + (item.desc.length > 55 ? "…" : "");
    }

    // Build action button
    let actionBtn;
    if (item._source === "system") {
      actionBtn = `<button class="scry-btn-action scry-sys-ref" data-sys-id="${item.id}">Ref</button>`;
    } else if (cat === "spell") {
      actionBtn = `<button class="scry-btn-action scry-spell-cast" data-item-id="${item.id}">Cast</button>`;
    } else if (cat === "attack") {
      actionBtn = `<button class="scry-btn-action scry-weapon-attack" data-item-id="${item.id}">Attack</button>`;
    } else {
      actionBtn = `<button class="scry-btn-action scry-item-use" data-item-id="${item.id}">Use</button>`;
    }

    const stowed = item.equipped === false && item.type !== "utility";
    return `
      <div class="scry-action-row ${stowed ? "stowed" : ""}" data-item-id="${item.id}" data-source="${item._source ?? ""}">
        <img class="scry-item-img" src="${item.img ?? "icons/svg/item-bag.svg"}" alt="${item.name}">
        <div class="scry-action-info">
          <div class="scry-action-name">${item.name}</div>
          <div class="scry-action-meta">
            <span class="scry-cat-badge" style="background:${color}20;border-color:${color};color:${color}">${label}</span>
            ${detail ? `<span class="scry-action-detail">${detail}</span>` : ""}
          </div>
        </div>
        ${actionBtn}
      </div>`;
  }

  _buildStatusPanel(data) {
    const GROUP_LABELS  = { "a-f":"A-F","g-l":"G-L","m-r":"M-R","s-z":"S-Z","all":"All" };
    const GROUP_TESTS   = {
      "a-f": n => /^[A-F]/i.test(n),
      "g-l": n => /^[G-L]/i.test(n),
      "m-r": n => /^[M-R]/i.test(n),
      "s-z": n => /^[S-Z]/i.test(n),
      "all": ()  => true,
    };
    const group     = this._condGroup ?? "a-f";
    const testFn    = GROUP_TESTS[group] ?? (() => true);
    const activeSet = new Set(data.conditions ?? []);

    const allEffects    = CONFIG?.statusEffects ?? [];
    const groupEffects  = allEffects
      .filter(e => testFn(e.name ?? e.label ?? ""))
      .sort((a, b) => (a.name ?? a.label ?? "").localeCompare(b.name ?? b.label ?? ""));
    const condButtons   = groupEffects.map(e => {
      const isActive = activeSet.has(e.id);
      const img  = e.img ?? e.icon ?? "icons/svg/aura.svg";
      const name = e.name ?? e.label ?? e.id;
      return `<button class="scry-cond-btn ${isActive ? "is-active" : ""}"
                      data-status-id="${e.id}" title="${name}">
        <img class="scry-cond-icon" src="${img}" alt="">
        <span class="scry-cond-name">${name}</span>
      </button>`;
    }).join("") || `<p class="scry-empty">No conditions in this group.</p>`;

    const inspClass = data.inspiration ? "active" : "";
    const inspText  = data.inspiration ? "★ Inspired" : "☆ Inspiration";


    const concActive = !!data.concentration;
    const groupTabs  = Object.entries(GROUP_LABELS).map(([g, lbl]) =>
      `<button class="scry-cond-group-btn ${group === g ? "is-active" : ""}" data-group="${g}">${lbl}</button>`
    ).join("");

    return `
      <section class="scry-card scry-status-panel">
        <div class="scry-status-row">
          <button class="scry-inspiration-toggle scry-status-insp-toggle ${inspClass}">${inspText}</button>
          ${concActive ? `<span class="scry-conc-indicator" title="Concentrating">Concentrating</span>` : ""}
        </div>
        <div class="scry-status-divider"></div>
        <div class="scry-status-cond-header">
          <span class="scry-status-label">Conditions</span>
          <button class="scry-cond-clear-all scry-btn-sm">Clear All</button>
        </div>
        <div class="scry-cond-group-tabs">${groupTabs}</div>
        <div class="scry-cond-grid">${condButtons}</div>
      </section>`;
  }

  _buildCombatButtons() {
    const inCombat = !!game.combat;
    return `
      <section class="scry-card scry-combat-btns">
        <button class="scry-btn scry-btn-target">Target</button>
        ${inCombat ? `
          <button class="scry-btn scry-btn-hold">Hold</button>
          <button class="scry-btn scry-btn-endturn scry-btn-danger">End Turn</button>
        ` : `
          <button class="scry-btn scry-btn-initiative">Roll Initiative</button>
        `}
      </section>`;
  }

  // -- Roll mode attack ----------------------------------------------------------

  async _doRollAttack(item) {
    let atkHookId = Hooks.once("dnd5e.preRollAttack",
      (rc, dc) => { if (dc) dc.configure = false; }
    );
    let dmgHookId = this._autoDmg
      ? Hooks.once("dnd5e.preRollDamage", (rc, dc) => { if (dc) dc.configure = false; })
      : null;

    const midiCfg  = globalThis.MidiQOL?.configSettings?.() ?? null;
    const savedAtk = midiCfg?.autoFastForwardAttack;
    const savedDmg = midiCfg?.autoFastForwardDamage;
    if (midiCfg) { midiCfg.autoFastForwardAttack = true; midiCfg.autoFastForwardDamage = true; }

    try {
      await item.use({}, { configure: false }, {});
    } catch (e) {
      if (atkHookId != null) Hooks.off("dnd5e.preRollAttack", atkHookId);
      if (dmgHookId != null) Hooks.off("dnd5e.preRollDamage", dmgHookId);
      throw e;
    } finally {
      if (midiCfg) { midiCfg.autoFastForwardAttack = savedAtk; midiCfg.autoFastForwardDamage = savedDmg; }
    }
  }

  // -- Enter mode attack ---------------------------------------------------------

  _openEnterDialog(item, actor, element) {
    const toHitStr = item.labels?.modifier ?? item.labels?.toHit ?? "";
    const dmgField = this._autoDmg ? "" : `
      <label style="display:block;margin-top:.6rem;color:var(--scry-text)">Damage
        <input type="number" id="scry-enter-damage" placeholder="total damage" min="0"
               inputmode="numeric"
               style="width:100%;font-size:1.4rem;text-align:center;margin-top:.25rem;
                      background:var(--scry-bg-surface);color:var(--scry-text);
                      border:1px solid var(--scry-border);border-radius:8px;padding:.3rem">
      </label>`;

    game.scry?.view?._openScryModal({
      title: `Enter Roll — ${item.name}`,
      bodyHtml: `
        <div style="padding:.5rem">
          <div style="text-align:center;opacity:.6;margin-bottom:.6rem;font-size:.85rem">
            To-hit: ${toHitStr}
          </div>
          <label style="display:block;color:var(--scry-text)">d20 Result
            <input type="number" id="scry-enter-attack" placeholder="1 – 20"
                   min="1" max="20" inputmode="numeric"
                   style="width:100%;font-size:1.8rem;text-align:center;margin-top:.25rem;
                          background:var(--scry-bg-surface);color:var(--scry-text);
                          border:1px solid var(--scry-border);border-radius:8px;padding:.3rem">
          </label>
          ${dmgField}
        </div>`,
      buttons: [
        {
          label: "Apply",
          className: "scry-modal-btn-primary",
          callback: async ({ closeModal }) => {
            const dieValue = parseInt(document.getElementById("scry-enter-attack")?.value);
            if (isNaN(dieValue) || dieValue < 1 || dieValue > 20) {
              ui.notifications?.warn("Enter a d20 result between 1 and 20.");
              return;
            }
            const manualDmg = this._autoDmg
              ? null : (parseInt(document.getElementById("scry-enter-damage")?.value) || 0);
            closeModal();
            await this._doEnterAttack(item, actor, dieValue, manualDmg);
            this._markPipUsed();
            if (element) this._rebuildContent(element, actor);
            game.scry?.view?.enterTableView();
          }
        },
        { label: "Cancel" }
      ]
    });
  }

  async _doEnterAttack(item, actor, dieValue, manualDmg) {
    const bonus = this._autoBonus
      ? this._parseBonus(item.labels?.modifier ?? item.labels?.toHit ?? "0") : 0;
    const total = dieValue + bonus;

    let atkHookId = null;
    atkHookId = Hooks.once("dnd5e.rollAttack", (rolls) => {
      atkHookId = null;
      const roll = rolls?.[0];
      if (!roll) return;
      for (const term of (roll.terms ?? [])) {
        if (term.faces === 20 && Array.isArray(term.results) && term.results[0]) {
          term.results[0].result = dieValue;
          term._evaluated = true;
          break;
        }
      }
      roll._total = total;
    });

    let actHookId  = Hooks.once("dnd5e.preUseActivity",
      (_a, _u, dc) => { dc.configure = false; }
    );
    let rollHookId = Hooks.once("dnd5e.preRollAttack",
      (rc, dc) => { if (dc) dc.configure = false; rc.advantage = false; rc.disadvantage = false; }
    );
    let dmgHookId  = this._autoDmg
      ? Hooks.once("dnd5e.preRollDamage", (rc, dc) => { if (dc) dc.configure = false; })
      : Hooks.once("dnd5e.preRollDamage", () => false);

    const midiCfg  = globalThis.MidiQOL?.configSettings?.() ?? null;
    const savedAtk = midiCfg?.autoFastForwardAttack;
    const savedDmg = midiCfg?.autoFastForwardDamage;
    if (midiCfg) { midiCfg.autoFastForwardAttack = true; midiCfg.autoFastForwardDamage = true; }

    try {
      await item.use({}, { configure: false }, {});
    } catch (e) {
      if (atkHookId  != null) Hooks.off("dnd5e.rollAttack",     atkHookId);
      if (actHookId  != null) Hooks.off("dnd5e.preUseActivity", actHookId);
      if (rollHookId != null) Hooks.off("dnd5e.preRollAttack",  rollHookId);
      if (dmgHookId  != null) Hooks.off("dnd5e.preRollDamage",  dmgHookId);
      throw e;
    } finally {
      if (midiCfg) { midiCfg.autoFastForwardAttack = savedAtk; midiCfg.autoFastForwardDamage = savedDmg; }
    }

    if (manualDmg !== null && manualDmg > 0) {
      [...game.user.targets].forEach(t => {
        if (t.actor?.isOwner) t.actor.applyDamage([{ value: manualDmg, type: "untyped" }]);
      });
    }
  }

  _showItemDescription(itemId, actor) {
    const item = actor.items.get(itemId);
    if (!item) return;
    const sys = item.system;
    const desc = sys.description?.value ?? "No description.";

    if (item.type === "spell") {
      const LEVEL_LABELS = ["Cantrip","1st","2nd","3rd","4th","5th","6th","7th","8th","9th"];
      const schoolName = CONFIG.DND5E?.spellSchools?.[sys.school]?.label ?? sys.school ?? "";
      const subtitle   = (sys.level ?? 0) === 0
        ? `${schoolName} Cantrip`
        : `${LEVEL_LABELS[sys.level ?? 0]}-level ${schoolName}`;
      const castTime = item.labels?.activation ?? "";
      const range    = item.labels?.range      ?? "";
      const duration = item.labels?.duration   ?? "";
      const conc     = sys.duration?.concentration ? " (Concentration)" : "";
      const props = sys.properties;
      const hasProp = k => props instanceof Set ? props.has(k) : !!(props?.[k]);
      const comps = [];
      if (hasProp("vocal"))    comps.push("V");
      if (hasProp("somatic"))  comps.push("S");
      if (hasProp("material")) comps.push("M");
      if (hasProp("ritual"))   comps.push("Ritual");
      const compStr = comps.join(", ");
      const metaRows = [
        castTime ? `<div class="scry-spell-meta-row"><span>Casting Time</span><span>${castTime}</span></div>` : "",
        range    ? `<div class="scry-spell-meta-row"><span>Range</span><span>${range}</span></div>` : "",
        duration ? `<div class="scry-spell-meta-row"><span>Duration</span><span>${duration}${conc}</span></div>` : "",
        compStr  ? `<div class="scry-spell-meta-row"><span>Components</span><span>${compStr}</span></div>` : "",
      ].filter(Boolean).join("");
      game.scry?.view?._openScryModal?.({
        title: item.name,
        bodyHtml: `
          <p class="scry-spell-detail-subtitle">${subtitle}</p>
          ${metaRows ? `<div class="scry-spell-meta">${metaRows}</div>` : ""}
          <div class="scry-modal-desc">${desc}</div>`,
      });
    } else {
      game.scry?.view?._openScryModal?.({
        title: item.name,
        bodyHtml: `<div class="scry-modal-desc">${desc}</div>`,
      });
    }
  }

  _parseBonus(str) {
    const n = parseInt(String(str).replace(/\s/g, ""), 10);
    return isNaN(n) ? 0 : n;
  }

  _toggleTargeting() { this._goToTargeting(true); }

  _goToTargeting(toggle = false, returnTab = null) {
    const scry = game.scry?.view;
    const tv   = scry?._tabletopView;
    if (returnTab && scry) scry._pendingReturnTab = returnTab;
    if (!tv) { scry?.openTokenPicker(); return; }
    if (tv.active) {
      const overlay = document.getElementById("scry-overlay");
      overlay?.classList.add("hidden");
      overlay?.classList.remove("tv-overlay-mode");
      tv._bar?.style.removeProperty("display");
      tv._updateInfoStrip?.();
      if (toggle) tv._toggleMode("target");
      else        tv._setMode("target");
    } else {
      tv.enter("target");
    }
  }
}
