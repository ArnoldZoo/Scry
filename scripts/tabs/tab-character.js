/*
Module: TableOS Scry — Mobile Player Companion
Component: tabs/tab-character.js
Purpose: Character tab — ability scores, skills, saves, inspiration, features, traits.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

const PROF_ICONS = { 0: "○", 0.5: "◑", 1: "●", 2: "◈" };

export class TabCharacter {
  constructor() {
    this._rollMode = "roll"; // "roll" | "enter"
  }

  render(data) {
    return `
      <div class="scry-tab-character">
        ${this._buildAbilityScores(data.abilities, data.inspiration)}
        ${this._buildRollModeBar()}
        ${this._buildSavingThrows(data.abilities)}
        ${this._buildSkills(data.skills)}
        ${this._buildFeatures("Class Features", data.classFeatures)}
        ${this._buildFeatures("Racial Features", data.raceFeatures)}
        ${this._buildFeatures("Feats", data.feats)}
        ${this._buildProficiencies(data.proficiencies, data.languages)}
        ${this._buildTraits(data.traits)}
      </div>
    `;
  }

  activate(element, actor) {
    element.querySelectorAll(
      ".scry-ability-score, .scry-save-row, .scry-skill-row"
    ).forEach(el => {
      el.style.touchAction     = "manipulation";
      el.style.webkitUserSelect = "none";
      el.style.userSelect      = "none";
      el.style.cursor          = "pointer";
    });

    // Roll / Enter mode toggle
    element.querySelectorAll(".scry-char-mode-btn[data-mode]").forEach(btn => {
      btn.addEventListener("click", () => {
        this._rollMode = btn.dataset.mode;
        element.querySelectorAll(".scry-char-mode-btn").forEach(b =>
          b.classList.toggle("active", b.dataset.mode === this._rollMode)
        );
      });
    });

    // Ability check rolls
    element.querySelectorAll(".scry-ability-score[data-ability]").forEach(el => {
      el.addEventListener("click", async () => {
        const ability = el.dataset.ability;
        const mod     = parseInt(el.dataset.mod ?? "0");
        const label   = el.dataset.label ?? ability;
        if (this._rollMode === "roll") {
          await this._doRollAbility(ability, actor);
        } else {
          this._showEnterDialog(`Ability: ${label}`, mod, async (dieValue) => {
            await this._sendEnteredRoll(`${label} Ability Check`, dieValue, mod, actor);
          });
        }
      });
    });

    // Saving throw rolls
    element.querySelectorAll(".scry-save-row[data-ability]").forEach(el => {
      el.addEventListener("click", async () => {
        const ability   = el.dataset.ability;
        const saveBonus = parseInt(el.dataset.saveBonus ?? "0");
        const label     = el.dataset.label ?? ability;
        if (this._rollMode === "roll") {
          await this._doRollSave(ability, actor);
        } else {
          this._showEnterDialog(`${label} Save`, saveBonus, async (dieValue) => {
            await this._sendEnteredRoll(`${label} Saving Throw`, dieValue, saveBonus, actor);
          });
        }
      });
    });

    // Skill rolls
    element.querySelectorAll(".scry-skill-row[data-skill]").forEach(el => {
      el.addEventListener("click", async () => {
        const skill      = el.dataset.skill;
        const skillTotal = parseInt(el.dataset.skillTotal ?? "0");
        const label      = el.dataset.label ?? skill;
        if (this._rollMode === "roll") {
          await this._doRollSkill(skill, actor);
        } else {
          this._showEnterDialog(`Skill: ${label}`, skillTotal, async (dieValue) => {
            await this._sendEnteredRoll(label, dieValue, skillTotal, actor);
          });
        }
      });
    });

    // Inspiration toggle
    element.querySelector(".scry-inspiration-toggle")?.addEventListener("click", async () => {
      const current = actor.system.attributes.inspiration ?? false;
      await actor.update({ "system.attributes.inspiration": !current });
    });

    // Feature collapsibles
    element.querySelectorAll(".scry-feature-header[data-section]").forEach(hdr => {
      hdr.addEventListener("click", () => {
        const body = element.querySelector(`.scry-feature-body[data-section="${hdr.dataset.section}"]`);
        body?.classList.toggle("collapsed");
        hdr.classList.toggle("collapsed");
      });
    });

    // Long-press for feature description — Scry modal
    element.querySelectorAll(".scry-feature-item[data-item-id]").forEach(item => {
      this._addLongPress(item, () => {
        const feat = actor.items.get(item.dataset.itemId);
        if (!feat) return;
        game.scry?.view?._openScryModal?.({
          title: feat.name,
          bodyHtml: `<div class="scry-modal-desc">${feat.system.description?.value ?? "No description."}</div>`,
        });
      });
    });
  }

  refresh(element, data) {
    const inspEl = element.querySelector(".scry-inspiration-toggle");
    if (inspEl) {
      inspEl.classList.toggle("active", data.inspiration);
      inspEl.textContent = data.inspiration ? "★ Inspired" : "☆ Inspiration";
    }
  }

  // -- Roll mode ---------------------------------------------------------------
  // dnd5e 5.x changed roll methods from (id, options) to ({ id-key, ...options })

  async _doRollAbility(abilityKey, actor) {
    try {
      if (typeof actor.rollAbilityTest === "function") {
        await actor.rollAbilityTest({ ability: abilityKey });
      } else if (typeof actor.rollAbilityCheck === "function") {
        await actor.rollAbilityCheck({ ability: abilityKey });
      }
    } catch(e) { console.error("Scry | ability roll:", e); }
    game.scry?.view?.enterTableView();
  }

  async _doRollSave(abilityKey, actor) {
    try {
      if (typeof actor.rollAbilitySave === "function") {
        await actor.rollAbilitySave({ ability: abilityKey });
      } else if (typeof actor.rollSavingThrow === "function") {
        await actor.rollSavingThrow({ ability: abilityKey });
      } else {
        const rollMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(actor))
          .filter(k => /roll/i.test(k));
        console.warn("Scry | save: no known method. Actor roll methods:", rollMethods);
      }
    } catch(e) { console.error("Scry | save roll:", e); }
    game.scry?.view?.enterTableView();
  }

  async _doRollSkill(skillKey, actor) {
    try {
      await actor.rollSkill?.({ skill: skillKey });
    } catch(e) { console.error("Scry | skill roll:", e); }
    game.scry?.view?.enterTableView();
  }

  // -- Enter mode (Scry modal + direct Roll → chat) ----------------------------

  _showEnterDialog(title, modifier, onApply) {
    const modStr = `${modifier >= 0 ? "+" : ""}${modifier}`;
    const view = game.scry?.view;
    if (!view?._openScryModal) return;
    const { backdrop } = view._openScryModal({
      title: `Enter: ${title}`,
      bodyHtml: `
        <div class="scry-modal-modifier-row">
          <span class="scry-modal-modifier-label">Modifier</span>
          <span class="scry-modal-modifier-val">${modStr}</span>
        </div>
        <input type="number" class="scry-modal-num-input" id="scry-enter-d20"
               placeholder="d20 result" min="1" max="20">`,
      buttons: [
        {
          label: "Apply",
          className: "scry-modal-btn-primary",
          callback: async ({ backdrop, closeModal }) => {
            const dieValue = parseInt(backdrop.querySelector("#scry-enter-d20")?.value ?? "");
            if (isNaN(dieValue) || dieValue < 1 || dieValue > 20) {
              ui.notifications?.warn("Enter a d20 result (1-20).");
              return;
            }
            closeModal();
            try {
              await onApply(dieValue);
              game.scry?.view?.enterTableView();
            } catch(e) { console.error("Scry | enter roll:", e); }
          }
        },
        { label: "Cancel" }
      ]
    });
    setTimeout(() => backdrop.querySelector("#scry-enter-d20")?.focus(), 50);
  }

  async _sendEnteredRoll(label, dieValue, modifier, actor) {
    const sign    = modifier >= 0 ? "+" : "";
    const formula = modifier === 0 ? `1d20` : `1d20${sign}${modifier}`;
    const roll    = await new Roll(formula).evaluate();
    const d20     = roll.terms.find(t => t.faces === 20);
    if (d20?.results?.[0]) {
      d20.results[0].result = dieValue;
      if (d20._total !== undefined) d20._total = dieValue;
    }
    roll._total = dieValue + modifier;
    await roll.toMessage({
      speaker:  ChatMessage.getSpeaker({ actor }),
      flavor:   label,
      rollMode: game.settings.get("core", "rollMode"),
    });
  }

  // -- HTML builders ------------------------------------------------------------

  _buildRollModeBar() {
    return `
      <section class="scry-card scry-char-mode-bar">
        <div class="scry-mode-toggle">
          <button class="scry-char-mode-btn ${this._rollMode === "roll"  ? "active" : ""}" data-mode="roll">Roll</button>
          <button class="scry-char-mode-btn ${this._rollMode === "enter" ? "active" : ""}" data-mode="enter">Enter</button>
        </div>
        <span class="scry-char-mode-hint">Tap any ability, save, or skill to roll</span>
      </section>`;
  }

  _buildAbilityScores(abilities, inspiration) {
    const ablHtml = abilities.map(a => `
      <div class="scry-ability-score" data-ability="${a.key}" data-mod="${a.mod}" data-label="${a.label}"
           title="Roll ${a.label} check">
        <div class="scry-ability-label">${a.abbreviation ?? a.key.toUpperCase()}</div>
        <div class="scry-ability-mod">${a.mod >= 0 ? "+" : ""}${a.mod}</div>
        <div class="scry-ability-value">${a.value}</div>
      </div>`
    ).join("");
    return `
      <section class="scry-card scry-ability-section">
        <div class="scry-ability-header">
          <h3 class="scry-card-title">Abilities</h3>
          <button class="scry-inspiration-toggle ${inspiration ? "active" : ""}">
            ${inspiration ? "★ Inspired" : "☆ Inspiration"}
          </button>
        </div>
        <div class="scry-ability-grid">${ablHtml}</div>
      </section>`;
  }

  _buildSavingThrows(abilities) {
    const rows = abilities.map(a => `
      <div class="scry-save-row" data-ability="${a.key}"
           data-save-bonus="${a.saveBonus}" data-label="${a.label}">
        <span class="scry-prof-icon">${a.saveProf ? "●" : "○"}</span>
        <span class="scry-save-label">${a.label}</span>
        <span class="scry-save-bonus">${a.saveBonus >= 0 ? "+" : ""}${a.saveBonus}</span>
      </div>`
    ).join("");
    return `
      <section class="scry-card scry-saves-section">
        <h3 class="scry-card-title">Saving Throws</h3>
        ${rows}
      </section>`;
  }

  _buildSkills(skills) {
    const rows = skills.map(sk => `
      <div class="scry-skill-row" data-skill="${sk.key}"
           data-skill-total="${sk.total}" data-label="${sk.label}">
        <span class="scry-prof-icon">${PROF_ICONS[sk.prof] ?? "○"}</span>
        <span class="scry-skill-label">${sk.label}</span>
        <span class="scry-skill-ability">(${sk.ability.toUpperCase()})</span>
        <span class="scry-skill-bonus">${sk.total >= 0 ? "+" : ""}${sk.total}</span>
      </div>`
    ).join("");
    return `
      <section class="scry-card scry-skills-section">
        <h3 class="scry-card-title">Skills</h3>
        ${rows}
      </section>`;
  }

  _buildFeatures(title, features) {
    if (!features.length) return "";
    const sectionKey = title.replace(/\s+/g,"-").toLowerCase();
    const items = features.map(f => `
      <div class="scry-feature-item" data-item-id="${f.id}">
        <img class="scry-item-img-sm" src="${f.img ?? "icons/svg/book.svg"}" alt="">
        <span class="scry-feature-name">${f.name}</span>
      </div>`
    ).join("");
    return `
      <section class="scry-card scry-features-section">
        <div class="scry-feature-header" data-section="${sectionKey}">
          <h3 class="scry-card-title">${title}</h3>
          <span class="scry-expand-icon">▼</span>
        </div>
        <div class="scry-feature-body" data-section="${sectionKey}">
          ${items}
        </div>
      </section>`;
  }

  _buildProficiencies(profs, languages) {
    const profText = profs.length > 0
      ? profs.map(p => `<span class="scry-prof-tag">${p}</span>`).join("")
      : `<span class="scry-empty">None listed</span>`;
    const langText = languages.length > 0
      ? languages.map(l => `<span class="scry-prof-tag">${l}</span>`).join("")
      : `<span class="scry-empty">None listed</span>`;
    return `
      <section class="scry-card">
        <h3 class="scry-card-title">Proficiencies</h3>
        <div class="scry-prof-tags">${profText}</div>
        <h3 class="scry-card-title" style="margin-top:.75rem">Languages</h3>
        <div class="scry-prof-tags">${langText}</div>
      </section>`;
  }

  _buildTraits(traits) {
    const sections = [
      { label: "Personality", value: traits.personality },
      { label: "Ideals",      value: traits.ideals },
      { label: "Bonds",       value: traits.bonds },
      { label: "Flaws",       value: traits.flaws },
    ].filter(s => s.value);
    if (!sections.length) return "";
    const html = sections.map(s => `
      <div class="scry-trait-row">
        <span class="scry-trait-label">${s.label}</span>
        <p class="scry-trait-text">${s.value}</p>
      </div>`
    ).join("");
    return `
      <section class="scry-card">
        <h3 class="scry-card-title">Traits</h3>
        ${html}
      </section>`;
  }

  _addLongPress(element, callback) {
    let timer;
    element.addEventListener("pointerdown", () => { timer = setTimeout(callback, 600); });
    element.addEventListener("pointerup",   () => clearTimeout(timer));
    element.addEventListener("pointerleave",() => clearTimeout(timer));
  }
}
