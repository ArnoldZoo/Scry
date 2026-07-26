/*
Module: TableOS Scry — Mobile Player Companion
Component: templates/beyond/beyond-tab-traits.js
Purpose: Scry-BEYOND Traits tab — features, feats, proficiencies, personality.
         Tapping any feature opens a description modal (like spells).
         Features with limited uses also get a Use button in the modal.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

export class BeyondTabTraits {
  constructor() { this._actor = null; }

  render(data) {
    return `<div class="sbnd-traits-wrap">
      ${this._buildFeatureSection("Class Features", data.classFeatures ?? [])}
      ${this._buildFeatureSection("Racial Traits",  data.raceFeatures  ?? [])}
      ${this._buildFeatureSection("Feats",           data.feats         ?? [])}
      ${this._buildInfoSection("Proficiencies", (data.proficiencies ?? []).join(", ") || "—")}
      ${this._buildInfoSection("Languages",     (data.languages    ?? []).join(", ") || "—")}
      <div class="sbnd-traits-divider"></div>
      ${this._buildPersonalitySection(data)}
    </div>`;
  }

  activate(el, actor) {
    this._actor = actor;
    el.querySelectorAll(".sbnd-trait-feat-row[data-item-id]").forEach(row => {
      const item = actor.items.get(row.dataset.itemId);
      if (!item) return;

      const useBtn  = row.querySelector(".sbnd-trait-use-btn");
      const maxUses = item.system.uses?.max ?? 0;
      if (useBtn && maxUses > 0) {
        const remaining = item.system.uses?.value ?? 0;
        useBtn.classList.remove("hidden");
        useBtn.textContent = remaining > 0 ? `Use (${remaining})` : "Spent";
        useBtn.disabled    = remaining <= 0;
        useBtn.addEventListener("click", async e => {
          e.stopPropagation();
          try { await item.use({}, { configure: false }, {}); } catch (_) {}
        });
      }

      row.addEventListener("click", e => {
        if (e.target.closest(".sbnd-trait-use-btn")) return;
        this._showItemDesc(item);
      });
    });
  }

  refresh(el, data) {
    el.innerHTML = this.render(data);
    if (this._actor) this.activate(el, this._actor);
  }

  // --- Description modal (mirrors spell description popup) ---

  _showItemDesc(item) {
    const sys     = item.system;
    const desc    = sys.description?.value ?? "<p>No description available.</p>";
    const maxUses = sys.uses?.max   ?? 0;
    const curUses = sys.uses?.value ?? 0;

    const metaRows = [];
    if (item.labels?.activation) metaRows.push(`<div class="scry-spell-meta-row"><span>Activation</span><span>${item.labels.activation}</span></div>`);
    if (item.labels?.range)      metaRows.push(`<div class="scry-spell-meta-row"><span>Range</span><span>${item.labels.range}</span></div>`);
    if (item.labels?.duration)   metaRows.push(`<div class="scry-spell-meta-row"><span>Duration</span><span>${item.labels.duration}</span></div>`);
    if (maxUses > 0)              metaRows.push(`<div class="scry-spell-meta-row"><span>Uses</span><span>${curUses} / ${maxUses}</span></div>`);

    const buttons = maxUses > 0 ? [{
      label: curUses > 0 ? `Use  (${curUses} remaining)` : "No Uses Remaining",
      className: curUses > 0 ? "scry-modal-btn-primary" : "",
      callback: async ({closeModal}) => {
        closeModal();
        if (curUses <= 0) return;
        try { await item.use({}, { configure: false }, {}); } catch (_) {}
      }
    }] : [];

    game.scry?.view?._openScryModal?.({
      title: item.name,
      bodyHtml: `
        ${metaRows.length ? `<div class="scry-spell-meta">${metaRows.join("")}</div>` : ""}
        <div class="scry-modal-desc">${desc}</div>`,
      buttons,
    });
  }

  // --- HTML builders ---

  _buildFeatureSection(label, items) {
    if (!items.length) return "";
    const rows = items.map(f => `
      <div class="sbnd-trait-feat-row" data-item-id="${f.id}">
        <img class="sbnd-item-icon" src="${f.img || "icons/svg/book.svg"}" alt="">
        <span class="sbnd-item-name">${f.name}</span>
        <button class="sbnd-trait-use-btn hidden">Use</button>
      </div>`).join("");
    return `<div class="sbnd-section">
      <div class="sbnd-sec-header">${label} <span class="sbnd-sec-count">${items.length}</span></div>
      ${rows}
    </div>`;
  }

  _buildInfoSection(label, text) {
    return `<div class="sbnd-section">
      <div class="sbnd-sec-header">${label}</div>
      <div class="sbnd-trait-block">
        <div class="sbnd-trait-text">${text}</div>
      </div>
    </div>`;
  }

  _buildPersonalitySection(data) {
    const t  = data.traits ?? {};
    const bg = [data.race, data.background].filter(Boolean).join(" · ") || null;
    const entries = [
      bg                    ? { label: "Background",   text: bg }            : null,
      t.personality?.trim() ? { label: "Personality",  text: t.personality } : null,
      t.ideals?.trim()      ? { label: "Ideals",        text: t.ideals }      : null,
      t.bonds?.trim()       ? { label: "Bonds",         text: t.bonds }       : null,
      t.flaws?.trim()       ? { label: "Flaws",         text: t.flaws }       : null,
    ].filter(Boolean);

    if (!entries.length) return "";
    const rows = entries.map(e => `
      <div class="sbnd-trait-block">
        <div class="sbnd-trait-block-label">${e.label}</div>
        <div class="sbnd-trait-text">${e.text}</div>
      </div>`).join("");
    return `<div class="sbnd-section">
      <div class="sbnd-sec-header">Background &amp; Personality</div>
      ${rows}
    </div>`;
  }
}
