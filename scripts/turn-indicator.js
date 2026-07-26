/*
Module: TableOS Scry — Mobile Player Companion
Component: turn-indicator.js
Purpose: Persistent corner widget — active combatant portrait, name, timer, round number.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

export class TurnIndicator {
  constructor(container) {
    this._container = container; // the .scry-turn-indicator element
    this._timerInterval = null;
  }

  // Called once after ScryView renders
  activate() {
    this._updateFromCombat(game.combat);
  }

  // Hook handlers — called by ScryView's registered hooks
  onUpdateCombat(combat) {
    this._updateFromCombat(combat);
  }

  onDeleteCombat() {
    this._clear();
  }

  _updateFromCombat(combat) {
    if (!combat || !combat.started || !this._container) {
      this._clear();
      return;
    }

    const combatant = combat.combatant;
    if (!combatant) {
      this._clear();
      return;
    }

    const actor = combatant.actor;
    const isMyTurn = actor?.isOwner && actor?.hasPlayerOwner;
    // Prefer the actor's portrait art (full illustration) over the battle-map token texture
    const portrait = actor?.img
                  ?? combatant.token?.texture?.src
                  ?? combatant.img
                  ?? "icons/svg/mystery-man.svg";
    const combatantName = combatant.name ?? "Unknown";
    const round = combat.round ?? 1;

    let hpBarHtml = "";
    if (actor?.hasPlayerOwner) {
      const hp = actor.system?.attributes?.hp;
      if (hp?.max > 0) {
        const pct   = Math.max(0, Math.min(100, Math.round((hp.value / hp.max) * 100)));
        const color = pct > 50 ? "#22c55e" : pct > 25 ? "#f59e0b" : "#ef4444";
        hpBarHtml = `<div class="scry-ti-hp-bar">
          <div class="scry-ti-hp-fill" style="width:${pct}%;background:${color};"></div>
        </div>`;
      }
    }

    this._container.innerHTML = `
      <div class="scry-ti-portrait-wrap">
        <img class="scry-ti-portrait ${isMyTurn ? "my-turn" : ""}" src="${portrait}" alt="${combatantName}">
        ${hpBarHtml}
      </div>
      <div class="scry-ti-info">
        <div class="scry-ti-name ${isMyTurn ? "my-turn" : ""}">${combatantName}</div>
        <div class="scry-ti-round">Round ${round}</div>
        <div class="scry-ti-timer" id="scry-turn-timer"></div>
      </div>
    `;
    this._container.classList.remove("hidden");
    this._container.classList.toggle("my-turn-active", isMyTurn);

    // Sync timer if TableOS turn timer is running
    this._syncTimer();
  }

  _syncTimer() {
    clearInterval(this._timerInterval);
    const timerEl = document.getElementById("scry-turn-timer");
    if (!timerEl) return;

    // Read TableOS timer state if available
    if (game.modules.get("table-os")?.active) {
      try {
        const timerData = game.settings.get("table-os", "turnTimerState");
        if (timerData?.running && timerData?.endTime) {
          this._startCountdown(timerEl, timerData.endTime);
          return;
        }
      } catch { /* no timer state */ }
    }
    timerEl.textContent = "";
  }

  _startCountdown(el, endTime) {
    const tick = () => {
      const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      el.textContent = remaining > 0 ? `${remaining}s` : "Time!";
      el.classList.toggle("timer-urgent", remaining <= 10 && remaining > 0);
      if (remaining <= 0) clearInterval(this._timerInterval);
    };
    tick();
    this._timerInterval = setInterval(tick, 1000);
  }

  _clear() {
    clearInterval(this._timerInterval);
    if (this._container) {
      this._container.innerHTML = "";
      this._container.classList.add("hidden");
      this._container.classList.remove("my-turn-active");
    }
  }

  destroy() {
    clearInterval(this._timerInterval);
    this._container = null;
  }
}
