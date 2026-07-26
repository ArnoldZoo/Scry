/*
Module: TableOS Scry — Mobile Player Companion
Component: tabs/tab-home.js
Purpose: Home tab — action economy, conditions, hit dice, exhaustion, rests.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

export class TabHome {

  render(data) {
    return `
      <div class="scry-tab-home">
        ${this._buildActionEconomy(data.actions)}
        ${this._buildConditions(data.conditions, data.exhaustion)}
        ${this._buildHitDice(data.hitDice)}
        ${this._buildRests()}
      </div>
    `;
  }

  activate(element, actor) {
    // Action economy toggles
    element.querySelectorAll(".scry-action-pip[data-action-type]").forEach(pip => {
      pip.addEventListener("click", () => this._toggleAction(pip, actor));
    });

    // Hit dice spend
    element.querySelectorAll(".scry-hd-spend[data-class]").forEach(btn => {
      btn.addEventListener("click", () => this._spendHitDie(btn.dataset.class, actor));
    });

    // Short rest
    element.querySelector(".scry-rest-short")?.addEventListener("click", () => {
      new Dialog({
        title: "Short Rest",
        content: "<p>Take a short rest and spend hit dice?</p>",
        buttons: {
          rest: {
            label: "Short Rest",
            callback: () => actor.shortRest()
          },
          cancel: { label: "Cancel" }
        }
      }).render(true);
    });

    // Long rest
    element.querySelector(".scry-rest-long")?.addEventListener("click", () => {
      new Dialog({
        title: "Long Rest",
        content: "<p>Take a long rest? This will restore HP, spell slots, and features.",
        buttons: {
          rest: {
            label: "Long Rest",
            callback: () => actor.longRest()
          },
          cancel: { label: "Cancel" }
        }
      }).render(true);
    });
  }

  refresh(element, data) {
    // Update action economy pips
    const aeContainer = element.querySelector(".scry-action-economy");
    if (aeContainer) aeContainer.outerHTML = this._buildActionEconomy(data.actions);

    // Update conditions
    const condContainer = element.querySelector(".scry-conditions-section");
    if (condContainer) condContainer.outerHTML = this._buildConditions(data.conditions, data.exhaustion);

    // Update hit dice
    const hdContainer = element.querySelector(".scry-hitdice-section");
    if (hdContainer) hdContainer.outerHTML = this._buildHitDice(data.hitDice);
  }

  _buildActionEconomy(actions) {
    const makeRow = (label, value, max, type) => {
      const pips = Array.from({ length: max }, (_, i) => {
        const used = i >= value;
        return `<span class="scry-action-pip ${used ? "used" : "available"}"
                      data-action-type="${type}" data-index="${i}"></span>`;
      }).join("");
      return `
        <div class="scry-ae-row">
          <span class="scry-ae-label">${label}</span>
          <div class="scry-ae-pips">${pips}</div>
        </div>`;
    };

    return `
      <section class="scry-card scry-action-economy">
        <h3 class="scry-card-title">Actions</h3>
        ${makeRow("Action",   actions.action,   actions.actionMax,   "action")}
        ${makeRow("Bonus",    actions.bonus,    actions.bonusMax,    "bonus")}
        ${makeRow("Reaction", actions.reaction, actions.reactionMax, "reaction")}
      </section>`;
  }

  _buildConditions(conditions, exhaustion) {
    const conditionLabels = {
      blinded: "Blinded", charmed: "Charmed", deafened: "Deafened",
      exhaustion: "Exhaustion", frightened: "Frightened", grappled: "Grappled",
      incapacitated: "Incapacitated", invisible: "Invisible", paralyzed: "Paralyzed",
      petrified: "Petrified", poisoned: "Poisoned", prone: "Prone",
      restrained: "Restrained", stunned: "Stunned", unconscious: "Unconscious",
    };

    const activeConds = conditions.filter(c => c !== "concentrating");
    const condHtml = activeConds.length > 0
      ? activeConds.map(c =>
          `<span class="scry-condition-tag">${conditionLabels[c] ?? c}</span>`
        ).join("")
      : `<span class="scry-condition-none">No conditions</span>`;

    const exHtml = exhaustion > 0
      ? `<div class="scry-exhaustion">Exhaustion ${exhaustion}</div>`
      : "";

    return `
      <section class="scry-card scry-conditions-section">
        <h3 class="scry-card-title">Conditions</h3>
        <div class="scry-condition-tags">${condHtml}</div>
        ${exHtml}
      </section>`;
  }

  _buildHitDice(hitDice) {
    if (!hitDice.length) return "";
    const rows = hitDice.map(hd => `
      <div class="scry-hd-row">
        <span class="scry-hd-label">${hd.dieSize}</span>
        <span class="scry-hd-count">${hd.remaining} / ${hd.total}</span>
        <button class="scry-hd-spend scry-btn-sm" data-class="${hd.className}"
                ${hd.remaining <= 0 ? "disabled" : ""}>Spend</button>
      </div>`
    ).join("");
    return `
      <section class="scry-card scry-hitdice-section">
        <h3 class="scry-card-title">Hit Dice</h3>
        ${rows}
      </section>`;
  }

  _buildRests() {
    return `
      <section class="scry-card scry-rests">
        <button class="scry-btn scry-rest-short">Short Rest</button>
        <button class="scry-btn scry-rest-long">Long Rest</button>
      </section>`;
  }

  _toggleAction(pip, actor) {
    // Visual feedback only — actual tracking is per-combat in the actor
    pip.classList.toggle("used");
    pip.classList.toggle("available");
  }

  async _spendHitDie(className, actor) {
    const cls = actor.items.find(i => i.type === "class" && i.name === className);
    if (!cls) return;
    try {
      await actor.rollHitDie(cls.system.hitDice);
    } catch(e) {
      console.warn("TableOS Scry | Hit die spend failed:", e);
    }
  }
}
