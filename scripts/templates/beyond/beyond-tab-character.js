/*
Module: TableOS Scry — Mobile Player Companion
Component: templates/beyond/beyond-tab-character.js
Purpose: Scry-BEYOND Character tab — D&D Beyond-style ability grid, save pills, skills.
         Overrides render() for Beyond card aesthetic; inherits activate() from TabCharacter.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

import { TabCharacter } from "../../tabs/tab-character.js";

const FMT_MOD = n => (n >= 0 ? "+" : "") + n;
const PROF_DOT = { 0: "", 0.5: "half", 1: "full", 2: "expert" };

export class BeyondTabCharacter extends TabCharacter {

  render(data) {
    return `<div class="scry-tab-character sbnd-tab-character">
      ${this._buildRollModeBar()}
      ${this._buildBeyondAbilities(data.abilities)}
      ${this._buildBeyondSaves(data.abilities)}
      ${this._buildBeyondSenses(data)}
      ${this._buildBeyondSkills(data.skills)}
    </div>`;
  }

  // --- Beyond-specific builders ---

  _buildBeyondAbilities(abilities) {
    const cards = abilities.map(a => `
      <div class="scry-ability-score sbnd-ability-card"
           data-ability="${a.key}" data-mod="${a.mod}" data-label="${a.label}">
        <svg class="sbnd-ability-frame" viewBox="0 0 100 142" preserveAspectRatio="none" aria-hidden="true">
          <path class="sbnd-frm-outer"     d="M6,0 L94,0 Q100,0 100,6 L100,98 Q100,116 50,128 Q0,116 0,98 L0,6 Q0,0 6,0 Z"/>
          <path class="sbnd-frm-inner"     d="M11,5 L89,5 Q94,5 94,11 L94,95 Q94,110 50,121 Q6,110 6,95 L6,11 Q6,5 11,5 Z"/>
          <line class="sbnd-frm-rule"      x1="14" y1="26" x2="86" y2="26"/>
          <rect class="sbnd-frm-modbox"    x="18" y="32" width="64" height="50" rx="3"/>
          <path class="sbnd-frm-filigree"  d="M14,73 L14,82 L23,82"/>
          <path class="sbnd-frm-filigree"  d="M86,73 L86,82 L77,82"/>
          <circle class="sbnd-frm-med-out" cx="50" cy="128" r="12"/>
          <circle class="sbnd-frm-med-in"  cx="50" cy="128" r="8.5"/>
        </svg>
        <span class="sbnd-ability-name">${a.label.toUpperCase()}</span>
        <span class="sbnd-ability-mod">${FMT_MOD(a.mod)}</span>
        <span class="sbnd-ability-score">${a.value}</span>
      </div>`
    ).join("");

    return `<div class="sbnd-section">
      <div class="sbnd-sec-header">Abilities</div>
      <div class="sbnd-abilities-grid">${cards}</div>
    </div>`;
  }

  _buildBeyondSaves(abilities) {
    const rows = abilities.map(a => {
      const profClass = a.saveProf > 0 ? " proficient" : "";
      return `
      <div class="scry-save-row sbnd-save-row${profClass}"
           data-ability="${a.key}" data-save-bonus="${a.saveBonus}" data-label="${a.label}">
        <svg class="sbnd-save-frame" viewBox="0 0 320 56" preserveAspectRatio="none" aria-hidden="true">
          <path class="sbnd-sv-bg"        d="M20,2 L316,2 Q320,2 320,6 L320,50 Q320,54 316,54 L20,54 L4,42 L4,14 Z"/>
          <path class="sbnd-sv-border"    d="M20,2 L316,2 Q320,2 320,6 L320,50 Q320,54 316,54 L20,54 L4,42 L4,14 Z"/>
          <path class="sbnd-sv-pod"       d="M248,2 L316,2 Q320,2 320,6 L320,50 Q320,54 316,54 L248,54 Z"/>
          <line class="sbnd-sv-div"       x1="250" y1="4" x2="250" y2="52"/>
          <path class="sbnd-sv-inner"     d="M22,6 L244,6 L244,50 L22,50 L8,40 L8,16 Z"/>
          <path class="sbnd-sv-pod-inner" d="M252,6 L314,6 Q317,6 317,9 L317,47 Q317,50 314,50 L252,50 Z"/>
        </svg>
        <span class="sbnd-dot${a.saveProf > 0 ? " sbnd-dot-on" : ""}"></span>
        <span class="sbnd-row-label">${a.label.toUpperCase()}</span>
        <span class="sbnd-row-val">${FMT_MOD(a.saveBonus)}</span>
      </div>`;
    }).join("");

    return `<div class="sbnd-section">
      <div class="sbnd-sec-header">Saving Throws</div>
      <div class="sbnd-saves-list">${rows}</div>
    </div>`;
  }

  _buildBeyondSenses(data) {
    const perc  = data.passivePerc ?? "—";
    const invSk = data.skills?.find(s => s.key === "inv");
    const insSk = data.skills?.find(s => s.key === "ins");
    const inv   = invSk ? 10 + invSk.total : "—";
    const ins   = insSk ? 10 + insSk.total : "—";

    return `<div class="sbnd-section">
      <div class="sbnd-sec-header">Senses</div>
      <div class="sbnd-senses-row">
        <div class="sbnd-sense-chip"><span class="sbnd-sense-val">${perc}</span><span class="sbnd-sense-label">PASSIVE WIS<br>(PERCEPTION)</span></div>
        <div class="sbnd-sense-chip"><span class="sbnd-sense-val">${inv}</span><span class="sbnd-sense-label">PASSIVE INT<br>(INVESTIGATION)</span></div>
        <div class="sbnd-sense-chip"><span class="sbnd-sense-val">${ins}</span><span class="sbnd-sense-label">PASSIVE WIS<br>(INSIGHT)</span></div>
      </div>
    </div>`;
  }

  _buildBeyondSkills(skills) {
    if (!skills?.length) return "";
    const rows = skills.map(sk => {
      const profClass = sk.prof > 0 ? " proficient" : "";
      return `
      <div class="scry-skill-row sbnd-skill-row${profClass}"
           data-skill="${sk.key}" data-skill-total="${sk.total}" data-label="${sk.label}">
        <span class="sbnd-dot${sk.prof > 0 ? " sbnd-dot-on" : ""}"></span>
        <span class="sbnd-row-label">${sk.label}</span>
        <span class="sbnd-skill-abl">${sk.ability.toUpperCase()}</span>
        <span class="sbnd-row-val">${FMT_MOD(sk.total)}</span>
      </div>`;
    }).join("");

    return `<div class="sbnd-section">
      <div class="sbnd-sec-header">Skills</div>
      ${rows}
    </div>`;
  }
}
