/*
Module: TableOS Scry — Mobile Player Companion
Component: templates/foundry/foundry-tab-traits.js
Purpose: Scry-FOUNDRY Traits tab — class features, racial traits, feats, proficiencies,
         languages up top; background & personality at the bottom.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: FND 1.2.01
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

export class FoundryTabTraits {
  constructor() { this._actor = null; }

  render(data) {
    return `<div class="sfnd-traits-wrap">
      ${this._buildFeatureSection("Class Features", data.classFeatures ?? [])}
      ${this._buildFeatureSection("Racial Traits",  data.raceFeatures  ?? [])}
      ${this._buildFeatureSection("Feats",           data.feats        ?? [])}
      ${this._buildInfoSection("Proficiencies", (data.proficiencies ?? []).join(", ") || "—")}
      ${this._buildInfoSection("Languages",     (data.languages    ?? []).join(", ") || "—")}
      <div class="sfnd-traits-divider"></div>
      ${this._buildPersonalitySection(data)}
    </div>`;
  }

  activate(el, actor) {
    this._actor = actor;
    el.querySelectorAll(".sfnd-trait-feat-row[data-item-id]").forEach(row => {
      const item = actor.items.get(row.dataset.itemId);
      if (!item) return;
      const useBtn = row.querySelector(".sfnd-trait-use-btn");
      const hasUses = (item.system.uses?.max ?? 0) > 0;
      if (useBtn && hasUses) {
        const remaining = item.system.uses?.value ?? 0;
        useBtn.classList.remove("hidden");
        useBtn.textContent = remaining > 0 ? `Use (${remaining})` : "Spent";
        useBtn.disabled = remaining <= 0;
        useBtn.addEventListener("click", async e => {
          e.stopPropagation();
          try { await item.use({}, { configure: false }, {}); } catch (_) {}
        });
      }
      row.addEventListener("click", e => {
        if (e.target.closest(".sfnd-trait-use-btn")) return;
        item.sheet?.render(true);
      });
    });
  }

  refresh(el, data) {
    el.innerHTML = this.render(data);
    if (this._actor) this.activate(el, this._actor);
  }

  _buildFeatureSection(label, items) {
    if (!items.length) return "";
    const rows = items.map(f => `
      <div class="sfnd-trait-feat-row" data-item-id="${f.id}">
        <img class="sfnd-item-icon" src="${f.img || "icons/svg/book.svg"}" alt="">
        <span class="sfnd-item-name">${f.name}</span>
        <button class="sfnd-trait-use-btn hidden">Use</button>
      </div>`).join("");
    return `
    <div class="sfnd-section">
      <div class="sfnd-section-header">${label} <span class="sfnd-section-count">${items.length}</span></div>
      ${rows}
    </div>`;
  }

  _buildInfoSection(label, text) {
    return `
    <div class="sfnd-section">
      <div class="sfnd-section-header">${label}</div>
      <div class="sfnd-trait-block">
        <div class="sfnd-trait-block-text">${text}</div>
      </div>
    </div>`;
  }

  _buildPersonalitySection(data) {
    const t  = data.traits ?? {};
    const bg = [data.race, data.background].filter(Boolean).join(" · ") || null;
    const entries = [
      bg                   ? { label: "Background",   text: bg }            : null,
      t.personality?.trim() ? { label: "Personality", text: t.personality } : null,
      t.ideals?.trim()     ? { label: "Ideals",       text: t.ideals }      : null,
      t.bonds?.trim()      ? { label: "Bonds",        text: t.bonds }       : null,
      t.flaws?.trim()      ? { label: "Flaws",        text: t.flaws }       : null,
    ].filter(Boolean);

    if (!entries.length) return "";
    const rows = entries.map(e => `
      <div class="sfnd-trait-block">
        <div class="sfnd-trait-block-label">${e.label}</div>
        <div class="sfnd-trait-block-text">${e.text}</div>
      </div>`).join("");
    return `
    <div class="sfnd-section">
      <div class="sfnd-section-header">Background &amp; Personality</div>
      ${rows}
    </div>`;
  }
}
