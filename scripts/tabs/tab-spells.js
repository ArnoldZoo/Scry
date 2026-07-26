/*
Module: TableOS Scry — Mobile Player Companion
Component: tabs/tab-spells.js
Purpose: Spells tab — spell slots, spell list, inline prep toggle, cast buttons.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

const LEVEL_LABELS = ["Cantrip","1st","2nd","3rd","4th","5th","6th","7th","8th","9th"];

const AOE_TARGET_TYPES = new Set([
  "cone","sphere","cylinder","line","cube","radius","square","wall"
]);

const _isSelfTarget = (item) => {
  const t = item?.system?.target?.type ?? item?.system?.range?.type ?? "";
  return t === "self";
};

export class TabSpells {
  constructor() {
    this._rollMode  = "roll";   // "roll" | "enter"
    this._autoDmg   = true;
    this._autoBonus = true;
  }

  render(data) {
    return `
      <div class="scry-tab-spells">
        ${this._buildModeBar()}
        ${this._buildSlotTracker(data.spellSlots)}
        ${this._buildSpellList(data.spells, data.noPrep, data.spellSlots)}
      </div>
    `;
  }

  activate(element, actor) {
    // Mode bar buttons live in .scry-mode-bar which is never replaced by refresh() — wire directly.
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

    // Single delegated handler for .scry-slot-tracker and .scry-spell-list content.
    // These sections are replaced by refresh() via outerHTML, so element-level listeners
    // would be lost after the first update. Delegating to the outer element avoids that.
    element.addEventListener("click", async e => {
      // Slot pips
      const pip = e.target.closest(".scry-slot-pip[data-level]");
      if (pip) { this._toggleSlot(pip, actor); return; }

      // Prep toggle — must come before row so it captures the click first
      const prep = e.target.closest(".scry-prep-toggle[data-item-id]");
      if (prep) { await this._togglePrep(prep.dataset.itemId, actor); return; }

      // Cast button
      const cast = e.target.closest(".scry-spell-cast[data-item-id]");
      if (cast) {
        const item = actor.items.get(cast.dataset.itemId);
        if (!item) return;
        if (this._rollMode === "roll" && game.user.targets.size === 0 && !_isSelfTarget(item) && !this._spellNeedsTemplate(item)) {
          this._goToTargeting("spells");
          return;
        }
        if (this._rollMode === "roll") {
          await this._doRollSpell(item);
        } else {
          this._openEnterDialog(item, actor);
        }
        return;
      }

      // Spell row tap — show spell description
      const row = e.target.closest(".scry-spell-row[data-item-id]");
      if (row) { this._showDescription(row.dataset.itemId, actor); return; }
    });
  }

  refresh(element, data) {
    const slotEl = element.querySelector(".scry-slot-tracker");
    if (slotEl) slotEl.outerHTML = this._buildSlotTracker(data.spellSlots);

    const listEl = element.querySelector(".scry-spell-list");
    if (listEl) listEl.outerHTML = this._buildSpellList(data.spells, data.noPrep, data.spellSlots);
  }

  // -- Roll mode cast ------------------------------------------------------------

  async _doRollSpell(item) {
    const needsTemplate = this._spellNeedsTemplate(item);

    if (needsTemplate) {
      const tv = game.scry?.view?._tabletopView;
      if (tv && !tv.active) tv.enter();
      else document.getElementById("scry-overlay")?.classList.add("hidden");
      await this._placeTemplateTouch(item);
      return;
    }

    // Non-AoE spells: suppress all dialogs and fast-forward everything.
    let actHookId = Hooks.once("dnd5e.preUseActivity",
      (_a, _u, dialogConfig) => { dialogConfig.configure = false; }
    );
    let atkHookId = Hooks.once("dnd5e.preRollAttack",
      (rollConfig, dialogConfig) => { if (dialogConfig) dialogConfig.configure = false; }
    );
    let dmgHookId = this._autoDmg
      ? Hooks.once("dnd5e.preRollDamage",
          (rollConfig, dialogConfig) => { if (dialogConfig) dialogConfig.configure = false; }
        )
      : null;

    const midiCfg  = globalThis.MidiQOL?.configSettings?.() ?? null;
    const savedAtk = midiCfg?.autoFastForwardAttack;
    const savedDmg = midiCfg?.autoFastForwardDamage;
    if (midiCfg) { midiCfg.autoFastForwardAttack = true; midiCfg.autoFastForwardDamage = true; }

    try {
      await item.use({}, { configure: false }, {});
    } catch (e) {
      if (actHookId != null) Hooks.off("dnd5e.preUseActivity", actHookId);
      if (atkHookId != null) Hooks.off("dnd5e.preRollAttack",  atkHookId);
      if (dmgHookId != null) Hooks.off("dnd5e.preRollDamage",  dmgHookId);
      throw e;
    } finally {
      if (midiCfg) {
        midiCfg.autoFastForwardAttack = savedAtk;
        midiCfg.autoFastForwardDamage = savedDmg;
      }
    }
  }

  // -- Enter mode cast -----------------------------------------------------------

  _openEnterDialog(item, actor) {
    const isAttackSpell = ["rsak", "msak"].includes(item.system.actionType);
    const isSaveSpell   = item.system.actionType === "save";

    if (isAttackSpell) {
      this._openAttackSpellDialog(item, actor);
    } else if (isSaveSpell && !this._autoDmg) {
      // Save spell, manual damage: enter the damage total only.
      this._openSaveDmgDialog(item, actor);
    } else {
      // Utility, healing, or save spell with Auto Dmg ON — just cast fast-forwarded.
      this._doRollSpell(item);
    }
  }

  _openAttackSpellDialog(item, actor) {
    const toHitStr = item.labels?.modifier ?? item.labels?.toHit ?? "";
    const dmgField = this._autoDmg ? "" : `
      <div style="margin-top:.75rem">
        <div class="scry-modal-modifier-label" style="margin-bottom:.3rem">Damage / Healing</div>
        <input type="number" id="scry-enter-damage" class="scry-modal-num-input"
               placeholder="total" min="0">
      </div>`;
    const view = game.scry?.view;
    if (!view?._openScryModal) return;
    const { backdrop } = view._openScryModal({
      title: `Cast: ${item.name}`,
      bodyHtml: `
        <div class="scry-modal-modifier-row">
          <span class="scry-modal-modifier-label">Spell Attack</span>
          <span class="scry-modal-modifier-val">${toHitStr}</span>
        </div>
        <input type="number" id="scry-enter-attack" class="scry-modal-num-input"
               placeholder="d20 result" min="1" max="20">
        ${dmgField}`,
      buttons: [
        {
          label: "Cast",
          className: "scry-modal-btn-primary",
          callback: async ({ backdrop, closeModal }) => {
            const dieValue = parseInt(backdrop.querySelector("#scry-enter-attack")?.value ?? "");
            if (isNaN(dieValue) || dieValue < 1 || dieValue > 20) {
              ui.notifications?.warn("Enter a d20 result (1-20).");
              return;
            }
            const manualDmg = this._autoDmg
              ? null
              : (parseInt(backdrop.querySelector("#scry-enter-damage")?.value ?? "") || 0);
            closeModal();
            try {
              await this._doEnterSpellAttack(item, actor, dieValue, manualDmg);
              game.scry?.view?.enterTableView();
            } catch(e) { console.error("Scry | enter spell attack:", e); }
          }
        },
        { label: "Cancel" }
      ]
    });
    setTimeout(() => backdrop.querySelector("#scry-enter-attack")?.focus(), 50);
  }

  _openSaveDmgDialog(item, actor) {
    const view = game.scry?.view;
    if (!view?._openScryModal) return;
    const { backdrop } = view._openScryModal({
      title: `Cast: ${item.name}`,
      bodyHtml: `
        <input type="number" id="scry-enter-damage" class="scry-modal-num-input"
               placeholder="damage / healing" min="0">`,
      buttons: [
        {
          label: "Cast",
          className: "scry-modal-btn-primary",
          callback: async ({ backdrop, closeModal }) => {
            const manualDmg = parseInt(backdrop.querySelector("#scry-enter-damage")?.value ?? "") || 0;
            closeModal();
            try {
              await this._doEnterSaveDmg(item, actor, manualDmg);
              game.scry?.view?.enterTableView();
            } catch(e) { console.error("Scry | enter save dmg:", e); }
          }
        },
        { label: "Cancel" }
      ]
    });
    setTimeout(() => backdrop.querySelector("#scry-enter-damage")?.focus(), 50);
  }

  async _doEnterSpellAttack(item, actor, dieValue, manualDmg) {
    const bonus = this._autoBonus
      ? this._parseBonus(item.labels?.modifier ?? item.labels?.toHit ?? "0")
      : 0;
    const total = dieValue + bonus;

    let atkHookId = null;
    const onRollAttack = (rolls) => {
      atkHookId = null;
      const roll = rolls?.[0];
      if (!roll) return;
      for (const term of (roll.terms ?? [])) {
        if (term.faces === 20 && Array.isArray(term.results) && term.results[0]) {
          term.results[0].result = dieValue;
          term._evaluated        = true;
          break;
        }
      }
      roll._total = total;
    };
    atkHookId = Hooks.once("dnd5e.rollAttack", onRollAttack);

    let actHookId  = Hooks.once("dnd5e.preUseActivity",
      (_a, _u, dialogConfig) => { dialogConfig.configure = false; }
    );
    let rollHookId = Hooks.once("dnd5e.preRollAttack",
      (rollConfig, dialogConfig) => {
        if (dialogConfig) dialogConfig.configure = false;
        rollConfig.advantage    = false;
        rollConfig.disadvantage = false;
      }
    );
    let dmgHookId  = this._autoDmg
      ? Hooks.once("dnd5e.preRollDamage",
          (rollConfig, dialogConfig) => { if (dialogConfig) dialogConfig.configure = false; }
        )
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
      if (midiCfg) {
        midiCfg.autoFastForwardAttack = savedAtk;
        midiCfg.autoFastForwardDamage = savedDmg;
      }
    }

    if (manualDmg !== null && manualDmg > 0) {
      [...game.user.targets].forEach(t => {
        if (t.actor?.isOwner) t.actor.applyDamage([{ value: manualDmg, type: "untyped" }]);
      });
    }
  }

  async _doEnterSaveDmg(item, actor, manualDmg) {
    // Cast the spell fast-forwarded (midi-qol handles the save), then apply typed damage.
    await this._doRollSpell(item);
    if (manualDmg > 0) {
      [...game.user.targets].forEach(t => {
        if (t.actor?.isOwner) t.actor.applyDamage([{ value: manualDmg, type: "untyped" }]);
      });
    }
  }

  // -- AoE template placement (touch-friendly) ------------------------------------

  async _placeTemplateTouch(item) {
    this._fitBattleArea();
    await new Promise(r => setTimeout(r, 400));

    const board    = document.getElementById("board");
    const canvasEl = canvas.app?.canvas ?? canvas.app?.view ?? board?.querySelector("canvas");

    // After _fitBattleArea the battle centre is at the viewport centre.
    let _pos = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.4 };

    const emitMove = (cx, cy) => {
      canvasEl?.dispatchEvent(new PointerEvent("pointermove", {
        clientX: cx, clientY: cy, bubbles: true, cancelable: true,
        pointerType: "mouse", pointerId: 1, isPrimary: true,
      }));
    };

    // CSS pointer-events:none on canvasEl kills ALL real input (touch, pointer, mouse)
    // while the D-pad is visible. dispatchEvent() bypasses this so synthetic arrow
    // events still reach PIXI. Applied in the createChatMessage hook (after dialog closes).
    const savedPE = canvasEl?.style.pointerEvents ?? "";

    // One grid square in screen pixels at current zoom.
    const step = () => (canvas.grid?.size ?? 100) * (canvas.stage?.scale?.x ?? 1);

    const move = (dx, dy) => {
      _pos.x += dx * step();
      _pos.y += dy * step();
      emitMove(_pos.x, _pos.y);
    };

    // --- Build D-pad control panel ---
    const panel = document.createElement("div");
    panel.id = "scry-template-ctrl";
    panel.style.cssText = [
      "position:fixed", "bottom:82px", "left:50%", "transform:translateX(-50%)",
      "z-index:99999", "background:rgba(10,15,35,.9)", "border-radius:14px",
      "padding:10px 12px 12px", "display:flex", "flex-direction:column",
      "align-items:center", "gap:6px", "box-shadow:0 6px 24px rgba(0,0,0,.75)",
    ].join(";");

    const label = document.createElement("div");
    label.textContent = "Move template, then place";
    label.style.cssText = "font-size:.75rem;color:rgba(255,255,255,.55);margin-bottom:2px;";
    panel.appendChild(label);

    const bs = "width:48px;height:48px;font-size:1.3rem;font-weight:bold;"
      + "background:rgba(255,255,255,.13);color:#fff;border:1px solid rgba(255,255,255,.2);"
      + "border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;";

    const mkBtn = (txt, onClick) => {
      const b = document.createElement("button");
      b.textContent = txt; b.style.cssText = bs;
      b.addEventListener("click", onClick);
      return b;
    };

    const dpad = document.createElement("div");
    dpad.style.cssText = "display:grid;grid-template-columns:repeat(3,48px);grid-template-rows:repeat(3,48px);gap:5px;";

    const at = (col, row, txt, dx, dy) => {
      const b = mkBtn(txt, () => move(dx, dy));
      b.style.gridColumn = col; b.style.gridRow = row;
      dpad.appendChild(b);
    };
    at(2, 1, "↑",  0, -1);
    at(1, 2, "←", -1,  0);
    at(3, 2, "→",  1,  0);
    at(2, 3, "↓",  0,  1);
    panel.appendChild(dpad);

    const placeBtn = document.createElement("button");
    placeBtn.textContent = "📍 Place Spell Here";
    placeBtn.style.cssText = "width:100%;padding:11px 0;font-size:1rem;font-weight:bold;"
      + "background:#2563eb;color:#fff;border:none;border-radius:9px;cursor:pointer;margin-top:4px;";
    panel.appendChild(placeBtn);

    const cleanup = () => {
      if (canvasEl) canvasEl.style.pointerEvents = savedPE;
      document.getElementById("scry-template-ctrl")?.remove();
      if (chatHookId != null) { Hooks.off("createChatMessage", chatHookId); chatHookId = null; }
    };

    placeBtn.addEventListener("click", () => {
      cleanup();
      canvasEl?.dispatchEvent(new PointerEvent("pointerdown", {
        clientX: _pos.x, clientY: _pos.y, bubbles: true, cancelable: true,
        button: 0, pointerType: "mouse", pointerId: 1, isPrimary: true,
      }));
      canvasEl?.dispatchEvent(new PointerEvent("pointerup", {
        clientX: _pos.x, clientY: _pos.y, bubbles: true, cancelable: true,
        button: 0, pointerType: "mouse", pointerId: 1, isPrimary: true,
      }));
    });

    // Show panel only after dialog closes (createChatMessage fires right before template placement).
    // Also lock canvas input at this point — dialog is gone so we no longer need real touches there.
    let chatHookId = Hooks.on("createChatMessage", () => {
      if (chatHookId != null) { Hooks.off("createChatMessage", chatHookId); chatHookId = null; }
      setTimeout(() => {
        if (!document.getElementById("scry-template-ctrl")) {
          if (canvasEl) canvasEl.style.pointerEvents = "none";
          document.body.appendChild(panel);
          emitMove(_pos.x, _pos.y); // Make template visible at initial position.
        }
      }, 120);
    });

    const midiCfg  = globalThis.MidiQOL?.configSettings?.() ?? null;
    const savedAtk = midiCfg?.autoFastForwardAttack;
    const savedDmg = midiCfg?.autoFastForwardDamage;
    if (midiCfg) { midiCfg.autoFastForwardAttack = true; midiCfg.autoFastForwardDamage = true; }

    try {
      await item.use();
    } catch (e) {
      if (!e?.message?.includes("ads")) throw e;
      console.warn("Scry | AoE spell non-fatal hook error:", e.message);
    } finally {
      cleanup();
      if (midiCfg) { midiCfg.autoFastForwardAttack = savedAtk; midiCfg.autoFastForwardDamage = savedDmg; }
    }
  }

  _fitBattleArea() {
    if (!canvas?.ready) return;
    const tokens = canvas.tokens?.placeables ?? [];
    if (!tokens.length) { canvas.animatePan({ scale: 0.4, duration: 300 }); return; }

    const xs    = tokens.map(t => t.x + (t.w ?? 0) / 2);
    const ys    = tokens.map(t => t.y + (t.h ?? 0) / 2);
    const minX  = Math.min(...xs), maxX = Math.max(...xs);
    const minY  = Math.min(...ys), maxY = Math.max(...ys);
    const cx    = (minX + maxX) / 2;
    const cy    = (minY + maxY) / 2;

    // Calculate scale to fit all tokens inside the viewport with 3-grid-square padding.
    const pad   = (canvas.grid?.size ?? 100) * 3;
    const scale = Math.min(
      window.innerWidth  / ((maxX - minX) + pad * 2),
      window.innerHeight / ((maxY - minY) + pad * 2),
      0.8   // never zoom in past 0.8×
    );
    canvas.animatePan({ x: cx, y: cy, scale: Math.max(scale, 0.1), duration: 300 });
  }

  _spellNeedsTemplate(item) {
    // dnd5e v5 exposes hasAreaTarget directly
    if (item.hasAreaTarget === true) return true;
    const t = item.system.target ?? {};
    return AOE_TARGET_TYPES.has(t.type)
        || AOE_TARGET_TYPES.has(t.affects?.type)
        || AOE_TARGET_TYPES.has(t.template?.type);
  }

  _parseBonus(str) {
    const n = parseInt(String(str).replace(/\s/g, ""), 10);
    return isNaN(n) ? 0 : n;
  }

  // -- HTML builders -------------------------------------------------------------

  _buildModeBar() {
    return `
      <section class="scry-card scry-mode-bar">
        <div class="scry-mode-toggle">
          <button class="scry-mode-btn ${this._rollMode === "roll"  ? "active" : ""}" data-mode="roll">Roll</button>
          <button class="scry-mode-btn ${this._rollMode === "enter" ? "active" : ""}" data-mode="enter">Enter</button>
        </div>
        <div class="scry-auto-toggles">
          <button class="scry-toggle scry-toggle-autodmg  ${this._autoDmg   ? "on" : ""}" title="Auto Damage">Auto Dmg</button>
          <button class="scry-toggle scry-toggle-autobonus ${this._autoBonus ? "on" : ""}" title="Auto Bonus">Auto Bonus</button>
        </div>
      </section>`;
  }

  _buildSlotTracker(slots) {
    if (!slots.length) return `<div class="scry-slot-tracker scry-empty-slots"></div>`;
    const rows = slots.map(s => {
      const used = s.max - s.value;
      const pips = Array.from({ length: s.max }, (_, i) => {
        const isUsed = i < used;
        return `<span class="scry-slot-pip ${isUsed ? "used" : "available"}"
                      data-level="${s.level}" data-index="${i}"></span>`;
      }).join("");
      return `
        <div class="scry-slot-row">
          <span class="scry-slot-level">${LEVEL_LABELS[s.level]}</span>
          <div class="scry-slot-pips">${pips}</div>
          <span class="scry-slot-count">${s.value}/${s.max}</span>
        </div>`;
    }).join("");
    return `<section class="scry-card scry-slot-tracker">${rows}</section>`;
  }

  _buildSpellList(spells, noPrep, slots) {
    if (!spells.length) {
      return `<div class="scry-spell-list"><p class="scry-empty">No spells known.</p></div>`;
    }

    const byLevel = {};
    for (const spell of spells) {
      (byLevel[spell.level] = byLevel[spell.level] ?? []).push(spell);
    }

    const sections = Object.entries(byLevel).map(([level, list]) => {
      const lvl = parseInt(level);
      const slot = slots.find(s => s.level === lvl);
      const slotInfo = slot ? ` (${slot.value}/${slot.max})` : "";
      const spellRows = list.map(sp => this._buildSpellRow(sp, noPrep)).join("");
      return `
        <div class="scry-spell-level-section">
          <h4 class="scry-spell-level-header">${LEVEL_LABELS[lvl]}${slotInfo}</h4>
          ${spellRows}
        </div>`;
    }).join("");

    return `<div class="scry-spell-list">${sections}</div>`;
  }

  _buildSpellRow(spell, noPrep) {
    const prepToggle = (!noPrep && spell.level > 0)
      ? `<button class="scry-prep-toggle" data-item-id="${spell.id}"
                 title="${spell.prepared ? "Prepared" : "Unprepared"}">
           ${spell.prepared ? "★" : "○"}
         </button>`
      : "";
    const concIcon = spell.concentration
      ? `<span class="scry-conc-icon" title="Concentration">C</span>` : "";
    return `
      <div class="scry-spell-row ${spell.prepared || spell.level === 0 ? "prepared" : "unprepared"}"
           data-item-id="${spell.id}">
        ${prepToggle}
        <img class="scry-item-img" src="${spell.img ?? "icons/svg/mystery-man.svg"}" alt="">
        <div class="scry-spell-info">
          <span class="scry-spell-name">${spell.name}</span>
          ${concIcon}
        </div>
        <button class="scry-spell-cast scry-btn-sm" data-item-id="${spell.id}">Cast</button>
      </div>`;
  }

  // -- Slot / prep helpers -------------------------------------------------------

  _toggleSlot(pip, actor) {
    const level = parseInt(pip.dataset.level);
    const isUsed = pip.classList.contains("used");
    const spellKey = `spell${level}`;
    const current = actor.system.spells?.[spellKey]?.value ?? 0;
    const max     = actor.system.spells?.[spellKey]?.max   ?? 0;
    const newVal  = isUsed
      ? Math.min(max, current + 1)
      : Math.max(0, current - 1);
    actor.update({ [`system.spells.${spellKey}.value`]: newVal });
  }

  async _togglePrep(itemId, actor) {
    const item = actor.items.get(itemId);
    if (!item) return;
    const current = item.system.prepared ?? false;
    if (!current) {
      const prepData = actor.system.spells?.prepared;
      const max   = prepData?.max   ?? 0;
      const count = prepData?.value ?? 0;
      if (max > 0 && count >= max) {
        ui.notifications?.warn(`Already at max prepared spells (${max}).`);
        return;
      }
    }
    await item.update({ "system.prepared": !current });
  }

  // -- Description popup ---------------------------------------------------------

  _showDescription(itemId, actor) {
    const item = actor.items.get(itemId);
    if (!item) return;
    const sys        = item.system;
    const levelLabel = LEVEL_LABELS[sys.level ?? 0];
    const schoolName = CONFIG.DND5E?.spellSchools?.[sys.school]?.label ?? sys.school ?? "";
    const subtitle   = (sys.level ?? 0) === 0
      ? `${schoolName} Cantrip`
      : `${levelLabel}-level ${schoolName}`;

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
        <div class="scry-modal-desc">${sys.description?.value ?? "No description."}</div>`,
    });
  }

  _addLongPress(element, callback) {
    let timer;
    element.addEventListener("pointerdown", () => { timer = setTimeout(callback, 600); });
    element.addEventListener("pointerup",   () => clearTimeout(timer));
    element.addEventListener("pointerleave",() => clearTimeout(timer));
  }

  _goToTargeting(returnTab = null) {
    const scry = game.scry?.view;
    const tv   = scry?._tabletopView;
    if (returnTab && scry) scry._pendingReturnTab = returnTab;
    if (!tv) { scry?.openTokenPicker?.(); return; }
    if (tv.active) {
      const overlay = document.getElementById("scry-overlay");
      overlay?.classList.add("hidden");
      overlay?.classList.remove("tv-overlay-mode");
      tv._bar?.style.removeProperty("display");
      tv._updateInfoStrip?.();
      tv._setMode("target");
    } else {
      tv.enter("target");
    }
  }
}
