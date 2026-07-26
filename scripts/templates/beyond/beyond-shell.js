/*
Module: TableOS Scry — Mobile Player Companion
Component: templates/beyond/beyond-shell.js
Purpose: Scry-BEYOND template shell — D&D Beyond-inspired header, HP pill, bottom tab bar.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

export const BEYOND_THEMES = new Set([
  "beyond-dark", "beyond-light", "beyond-parchment",
]);

export const BEYOND_TABS = [
  { id: "character", label: "Character", fa: "fa-user" },
  { id: "actions",   label: "Actions",   fa: "fa-hand-fist" },
  { id: "spells",    label: "Spells",    fa: "fa-hat-wizard" },
  { id: "gear",      label: "Gear",      fa: "fa-bag-shopping" },
  { id: "traits",    label: "Traits",    fa: "fa-shield-halved" },
  { id: "table",     label: "Table",     fa: "fa-dice-d20" },
];

export class BeyondShell {

  static buildHTML(data, theme, deviceType, activeTab = "actions") {
    const hpPct   = Math.round((data.hpCurrent / data.hpMax) * 100);
    const hpClass = hpPct <= 25 ? "critical" : hpPct <= 50 ? "bloodied" : "";
    const activeLabel = BEYOND_TABS.find(t => t.id === activeTab)?.label ?? "";

    const tabsHtml = BEYOND_TABS.map(t =>
      `<button class="sbnd-tab-btn${t.id === activeTab ? " active" : ""}" data-tab="${t.id}" title="${t.label}">
        <i class="fas ${t.fa}"></i>
        <span class="sbnd-tab-label">${t.label}</span>
      </button>`
    ).join("");

    const tempHtml = data.hpTemp > 0
      ? `<span class="sbnd-hp-temp">+${data.hpTemp}</span>` : "";
    const concHtml = data.concentration
      ? `<span class="sbnd-conc-badge">CONC</span>` : "";

    return `
<div id="scry-overlay" class="scry-overlay sbnd-layout theme-${theme} device-${deviceType}">
  <header class="sbnd-header">
    <div class="sbnd-topbar">
      <button class="sbnd-tools-btn" title="Table Tools"><i class="fas fa-bars"></i></button>
      <div class="sbnd-identity">
        <img class="sbnd-portrait" src="${data.img ?? "icons/svg/mystery-man.svg"}" alt="${data.name}">
        <div class="sbnd-identity-text">
          <div class="sbnd-char-name">${data.name}</div>
          <div class="sbnd-char-sub">${data.classLabel || data.race || ""}</div>
        </div>
      </div>
      <button class="sbnd-hp-pill ${hpClass}" title="Hit Points">
        <span class="sbnd-hp-nums">${data.hpCurrent}/${data.hpMax}${tempHtml}</span>
        <span class="sbnd-hp-label">HIT POINTS</span>
      </button>
    </div>
    <div class="sbnd-section-bar">
      <span class="sbnd-section-title">${activeLabel}</span>
      <div class="sbnd-section-chips">
        ${concHtml}
        <span class="sbnd-ac-chip" title="Armor Class"><i class="fas fa-shield-halved"></i> ${data.ac}</span>
      </div>
    </div>
  </header>
  <div class="sbnd-content" id="sbnd-content"></div>
  <nav class="sbnd-tab-bar">${tabsHtml}</nav>
</div>`;
  }

  static refreshPanel(el, data) {
    const hpPct   = Math.round((data.hpCurrent / data.hpMax) * 100);
    const hpClass = hpPct <= 25 ? "critical" : hpPct <= 50 ? "bloodied" : "";

    const pill = el.querySelector(".sbnd-hp-pill");
    if (pill) {
      const tempHtml = data.hpTemp > 0 ? `<span class="sbnd-hp-temp">+${data.hpTemp}</span>` : "";
      const numsEl   = pill.querySelector(".sbnd-hp-nums");
      if (numsEl) numsEl.innerHTML = `${data.hpCurrent}/${data.hpMax}${tempHtml}`;
      pill.className = `sbnd-hp-pill${hpClass ? " " + hpClass : ""}`;
    }

    const chips = el.querySelector(".sbnd-section-chips");
    if (chips) {
      const existing = chips.querySelector(".sbnd-conc-badge");
      if (data.concentration && !existing) {
        chips.insertAdjacentHTML("afterbegin", `<span class="sbnd-conc-badge">CONC</span>`);
      } else if (!data.concentration && existing) {
        existing.remove();
      }
    }
  }
}
