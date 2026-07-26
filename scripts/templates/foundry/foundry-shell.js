/*
Module: TableOS Scry — Mobile Player Companion
Component: templates/foundry/foundry-shell.js
Purpose: Scry-FOUNDRY template shell — portrait panel, diamond stat badges, nav rail.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

export const FOUNDRY_THEMES = new Set([
  "classic", "modern", "frost",
  "nightfall", "twilight", "crystal", "vellum", "amber",
]);

export const FOUNDRY_TABS = [
  { id: "character", label: "Char",      fa: "fa-user" },
  { id: "actions",   label: "Actions",   fa: "fa-hand-fist" },
  { id: "spells",    label: "Spells",    fa: "fa-hat-wizard" },
  { id: "gear",      label: "Gear",      fa: "fa-bag-shopping" },
  { id: "traits",    label: "Traits",    fa: "fa-shield-halved" },
  { id: "table",     label: "Table",     fa: "fa-dice-d20" },
];

export class FoundryShell {

  static buildHTML(data, theme, deviceType, activeTab = "actions") {
    const hpPct   = Math.round((data.hpCurrent / data.hpMax) * 100);
    const hpClass = hpPct <= 25 ? "critical" : hpPct <= 50 ? "bloodied" : "";

    const navHtml = FOUNDRY_TABS.map(t =>
      `<button class="sfnd-nav-btn${t.id === activeTab ? " active" : ""}" data-tab="${t.id}" title="${t.label}">
        <i class="fas ${t.fa}"></i>
        <span class="sfnd-nav-label">${t.label}</span>
      </button>`
    ).join("");

    return `
<div id="scry-overlay" class="scry-overlay sfnd-layout theme-${theme} device-${deviceType}">
  <aside class="sfnd-portrait-panel">
    <div class="sfnd-portrait-wrap">
      <img class="sfnd-portrait-img" src="${data.img ?? "icons/svg/mystery-man.svg"}" alt="${data.name}">
      <div class="sfnd-ac-badge"><span>${data.ac}</span></div>
      <div class="sfnd-conc-badge${data.concentration ? "" : " hidden"}">CONC</div>
      <div class="scry-turn-indicator hidden"></div>
    </div>
    <div class="sfnd-identity">
      <div class="sfnd-char-name">${data.name}</div>
      <div class="sfnd-char-class">${data.classLabel || data.race || ""}</div>
    </div>
    <div class="sfnd-badge-row">
      ${FoundryShell._diamond(data.initiative >= 0 ? "+" + data.initiative : String(data.initiative), "INIT", "init")}
      ${FoundryShell._diamond(data.speed + "ft", "MOVE", "move")}
      ${FoundryShell._diamond("+" + data.profBonus, "PROF", "prof")}
    </div>
    <div class="sfnd-hp-block">
      <div class="sfnd-hp-bar ${hpClass}">
        <div class="sfnd-hp-fill" style="width:${hpPct}%"></div>
      </div>
      <div class="sfnd-hp-text">${data.hpCurrent} / ${data.hpMax}${data.hpTemp > 0 ? ` (+${data.hpTemp})` : ""}</div>
    </div>
    <div class="sfnd-panel-btns">
      <button class="sfnd-pbtn sfnd-pbtn-dmg"    data-action="damage"><i class="fas fa-heart-crack"></i> DMG</button>
      <button class="sfnd-pbtn sfnd-pbtn-heal"   data-action="heal"><i class="fas fa-droplet"></i> HEAL</button>
      <button class="sfnd-pbtn sfnd-pbtn-tmp"    data-action="temp"><i class="fas fa-hourglass-half"></i> TMP</button>
      <button class="sfnd-pbtn sfnd-pbtn-status"><i class="fas fa-shield-halved"></i> STATUS</button>
      <button class="sfnd-pbtn sfnd-pbtn-rest"><i class="fas fa-bed"></i> REST</button>
      <button class="sfnd-pbtn sfnd-pbtn-insp${data.inspiration ? " active" : ""}"><i class="fas fa-star"></i> INSP</button>
    </div>
    <div class="sfnd-panel-divider"></div>
    <div class="sfnd-combat-strip hidden" id="sfnd-combat-strip">
      <div class="sfnd-combat-label">CURRENT<br>COMBATANT</div>
      <img class="sfnd-combat-portrait" src="" alt="">
      <div class="sfnd-combat-name"></div>
      <div class="sfnd-combat-hp-wrap">
        <div class="sfnd-combat-hp-bar">
          <div class="sfnd-combat-hp-fill" style="width:100%"></div>
        </div>
      </div>
    </div>
    <div class="sfnd-panel-timer hidden" id="sfnd-panel-timer"></div>
    <div class="sfnd-version-badge">v2.5.12 · FND 1.2.01</div>
    <button class="sfnd-tools-btn" title="Table Tools"><i class="fas fa-bars"></i></button>
  </aside>
  <div class="sfnd-body">
    <div class="sfnd-content" id="sfnd-content"></div>
    <nav class="sfnd-nav-rail">${navHtml}</nav>
  </div>
</div>`;
  }

  static refreshPanel(el, data) {
    const hpPct   = Math.round((data.hpCurrent / data.hpMax) * 100);
    const hpClass = hpPct <= 25 ? "critical" : hpPct <= 50 ? "bloodied" : "";

    const fillEl = el.querySelector(".sfnd-hp-fill");
    if (fillEl) fillEl.style.width = `${hpPct}%`;

    const barEl = el.querySelector(".sfnd-hp-bar");
    if (barEl) {
      barEl.classList.remove("critical", "bloodied");
      if (hpClass) barEl.classList.add(hpClass);
    }

    const textEl = el.querySelector(".sfnd-hp-text");
    if (textEl) {
      textEl.textContent = `${data.hpCurrent} / ${data.hpMax}${data.hpTemp > 0 ? ` (+${data.hpTemp})` : ""}`;
    }

    const concBadge = el.querySelector(".sfnd-conc-badge");
    if (concBadge) concBadge.classList.toggle("hidden", !data.concentration);

    const inspBtn = el.querySelector(".sfnd-pbtn-insp");
    if (inspBtn) inspBtn.classList.toggle("active", !!data.inspiration);
  }

  static _diamond(value, label, type = "") {
    return `
    <div class="sfnd-diamond-wrap${type ? ` sfnd-diamond-${type}` : ""}" data-type="${type}">
      <div class="sfnd-diamond"><div class="sfnd-diamond-inner">${value}</div></div>
      <div class="sfnd-diamond-label">${label}</div>
    </div>`;
  }
}
