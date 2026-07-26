/*
Module: TableOS Scry — Mobile Player Companion
Component: tabletop-view.js
Purpose: Canvas toggle — enter/exit Tabletop View, touch tap targeting/movement,
         zoom/pan buttons, sidebar toggle, token-list targeting fallback.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

const TV_OVERRIDE_ID = "scry-tv-override";

export class TabletopView {
  constructor(scryView) {
    this._scry        = scryView;
    this._bar         = null;
    this._picker      = null;
    this._active      = false;
    this._mode        = "none";   // "none" | "target" | "walk" | "ping" | "ruler"
    this._rulerPoints = [];
    this._onTouchStart = null;
    this._onTouchEnd   = null;
    this._targetCtrl   = null;
    this._tokenMover   = null;
    this._walkIconPixi    = null;
    this._walkIconRaf     = null;
    this._reticuleSprites = new Map();
    this._lastTargetIds   = [];
    this._endTurnHook     = null;
  }

  get active() { return this._active; }

  // -- Enter / Exit ------------------------------------------

  enter(initialMode = "none") {
    if (this._active) return;
    this._active      = true;
    this._mode        = "none";
    this._infoInterval = setInterval(() => this._updateInfoStrip(), 500);

    document.getElementById("scry-overlay")?.classList.add("hidden");

    // Remove the Scry canvas blocker so #interface and all canvas layers are visible
    document.getElementById("scry-no-canvas")?.remove();

    const board = document.getElementById("board");
    if (board) board.style.setProperty("pointer-events", "auto", "important");

    this._injectOverrideStyle();
    this._hideTableOSElements();

    const _doPan = () => {
      if (!canvas?.ready) return;
      const ownToken = canvas.tokens?.placeables?.find(t => t.actor?.id === this._scry.actor?.id);
      if (ownToken) {
        canvas.animatePan({ x: ownToken.center.x, y: ownToken.center.y, scale: 0.27, duration: 400 });
      } else if (canvas.scene) {
        canvas.animatePan({ x: canvas.scene.width / 2, y: canvas.scene.height / 2, scale: 0.27, duration: 400 });
      }
    };
    if (canvas?.ready) {
      _doPan();
    } else {
      Hooks.once("canvasReady", _doPan);
    }

    this._initControllers();
    this._bindTapHandler();
    this._injectBar();
    this._updateEndTurnBtn();
    this._endTurnHook = Hooks.on("updateCombat", () => this._updateEndTurnBtn());
    if (initialMode !== "none") this._setMode(initialMode);
  }

  exit() {
    if (!this._active) return;
    this._active = false;

    if (this._infoInterval) { clearInterval(this._infoInterval); this._infoInterval = null; }
    if (this._endTurnHook)  { Hooks.off("updateCombat", this._endTurnHook); this._endTurnHook = null; }
    this._unbindTapHandler();
    this._removeWalkIcon();
    this._clearReticules();
    this._setMode("none");
    this.closeTokenPicker();
    this._bar?.remove();
    this._bar = null;

    document.getElementById("scry-tv-timer-badge")?.remove();
    /* combatant display now lives in portrait panel */

    document.getElementById(TV_OVERRIDE_ID)?.remove();
    this._clearRuler();
    this._restoreTableOSElements();

    const board = document.getElementById("board");
    if (board) board.style.removeProperty("pointer-events");

    // Restore the Scry canvas blocker so #interface is hidden behind the overlay
    if (!document.getElementById("scry-no-canvas")) {
      const s = document.createElement("style");
      s.id = "scry-no-canvas";
      s.textContent =
        "#board{ pointer-events:none !important }" +
        "#interface,#players,#hotbar,#navigation,#controls,#sidebar,#pause{ display:none !important }";
      document.head.appendChild(s);
    }

    document.getElementById("scry-overlay")?.classList.remove("hidden");
    document.getElementById("scry-overlay")?.classList.remove("tv-overlay-mode");

    // Return to the tab that sent the player to target (actions or spells)
    const returnTab = this._scry._pendingReturnTab;
    if (returnTab) {
      this._scry._pendingReturnTab = null;
      this._scry.switchTab?.(returnTab);
    }
  }

  // -- Controllers -------------------------------------------

  _initControllers() {
    if (globalThis.TableOSTargetModeController) {
      this._targetCtrl = new globalThis.TableOSTargetModeController();
    }
    // Enhanced movement — only available when TableOS is also installed
    if (globalThis.TableOSTokenMover && globalThis.TABLE_OS) {
      try { this._tokenMover = new globalThis.TableOSTokenMover(() => null); } catch (_) {}
    }
  }

  // -- TableOS element hide/restore -------------------------

  _hideTableOSElements() {
    // CSS !important can't beat JS inline styles — set them directly.
    const dock = document.getElementById("tableos-battle-dock");
    if (dock) dock.style.setProperty("display", "none", "important");
    document.querySelectorAll(".tableos-turn-timer").forEach(el =>
      el.style.setProperty("display", "none", "important")
    );
  }

  _restoreTableOSElements() {
    const dock = document.getElementById("tableos-battle-dock");
    if (dock) dock.style.removeProperty("display");
    document.querySelectorAll(".tableos-turn-timer").forEach(el =>
      el.style.removeProperty("display")
    );
  }

  // -- Touch tap handler -------------------------------------

  _bindTapHandler() {
    let _start = null;

    // Listen at document level — PIXI v8 calls stopPropagation on the canvas element,
    // so listeners on #board never fire. document-level capture runs before PIXI can stop it.
    const _isScryUI = (el) => !!el?.closest(
      "#scry-tabletop-bar,#scry-overlay,#scry-nav-panel,#scry-token-picker"
    );

    this._onTouchStart = (e) => {
      if (_isScryUI(e.target)) return;
      const t = e.touches[0];
      if (!t) return;
      _start = { x: t.clientX, y: t.clientY };
    };

    this._onTouchEnd = (e) => {
      if (!_start) return;
      if (_isScryUI(e.target)) { _start = null; return; }
      const t = e.changedTouches[0];
      if (!t) { _start = null; return; }

      const dx = t.clientX - _start.x;
      const dy = t.clientY - _start.y;
      _start = null;

      if (Math.hypot(dx, dy) > 15) return; // drag — ignore
      if (this._mode === "none") return;

      const world = this._clientToWorld(t.clientX, t.clientY);
      if (!world) { console.warn("Scry | tap: world coord conversion failed"); return; }

      const token = this._tokenAtWorld(world);
      console.log(`Scry | tap mode=${this._mode} world=(${Math.round(world.x)},${Math.round(world.y)}) token=${token?.name ?? "none"}`);

      if (this._mode === "target") this._handleTargetTap(token);
      if (this._mode === "walk")   this._handleWalkTap(world, token);
      if (this._mode === "ping")   this._handlePingTap(world);
      if (this._mode === "ruler")  this._handleRulerTap(t.clientX, t.clientY, world);
    };

    document.addEventListener("touchstart", this._onTouchStart, { passive: true });
    document.addEventListener("touchend",   this._onTouchEnd,   { passive: true });
  }

  _unbindTapHandler() {
    if (this._onTouchStart) document.removeEventListener("touchstart", this._onTouchStart);
    if (this._onTouchEnd)   document.removeEventListener("touchend",   this._onTouchEnd);
    this._onTouchStart = this._onTouchEnd = null;
  }

  // -- Target tap --------------------------------------------

  _handleTargetTap(token) {
    if (!token) return;
    if (this._targetCtrl) {
      this._targetCtrl.toggleTarget(token);
    } else {
      const wasTargeted = game.user.targets.has(token);
      token.setTarget(!wasTargeted, { user: game.user, releaseOthers: false });
    }
    const nowTargeted = game.user.targets.has(token);
    ui.notifications?.info(`${nowTargeted ? "Targeting" : "Cleared"}: ${token.name}`);
    this._lastTargetIds = [...game.user.targets].map(t => t.id);
    this._updateReticules();
  }

  // -- Walk tap ----------------------------------------------

  _handleWalkTap(world, token) {
    const ownToken = canvas.tokens?.placeables?.find(t => t.actor?.id === this._scry.actor?.id);
    if (!ownToken) return;

    if (this._tokenMover) {
      // Tapping own token while a path exists → cancel and exit walk mode
      if (token?.id === ownToken.id && this._tokenMover.state !== "IDLE") {
        this._tokenMover.cancel();
        this._removeWalkIcon();
        this._setMode("none");
        return;
      }
      // Route to waypoint system — builds path, shows green/yellow/red preview
      this._tokenMover.handleDestinationTap(world);
      return;
    }

    // Fallback (no TableOS mover): direct grid-snap teleport
    const size = canvas.grid?.size ?? 100;
    let snapped;
    try {
      const mode = CONST?.GRID_SNAPPING_MODES?.CENTER ?? 12;
      snapped = canvas.grid?.getSnappedPoint?.({ x: world.x, y: world.y }, { mode });
    } catch (_) {}
    if (!snapped || !Number.isFinite(snapped?.x)) {
      snapped = {
        x: Math.round(world.x / size) * size,
        y: Math.round(world.y / size) * size,
      };
    }
    ownToken.document.update({ x: snapped.x, y: snapped.y });
  }

  _addWalkIcon(token) {
    this._removeWalkIcon();
    if (!token || !canvas?.controls) return;
    try {
      const gs = canvas.grid?.size ?? 100;
      const tw = token.w ?? token.width  ?? gs;
      const cx = (token.x ?? 0) + tw / 2;
      const cy = (token.y ?? 0) + (token.h ?? token.height ?? gs) / 2;
      this._walkIconPixi = this._drawWalkFigure(cx, cy, gs);
      canvas.controls.addChild(this._walkIconPixi);
    } catch (_) {}
  }

  _drawWalkFigure(cx, cy, gridSize) {
    const gfx = new PIXI.Graphics();
    const s  = gridSize * 0.30;
    const lw = s * 0.15;

    const rect = (x1, y1, x2, y2, hw) => {
      const dx = x2 - x1, dy = y2 - y1;
      const d  = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / d * hw, ny = dx / d * hw;
      return [x1+nx, y1+ny, x2+nx, y2+ny, x2-nx, y2-ny, x1-nx, y1-ny];
    };

    const drawFigure = (ox, oy, col, alpha) => {
      gfx.lineStyle(0);
      gfx.beginFill(col, alpha);
      gfx.drawCircle(ox + s*0.07, oy - s*0.50, s*0.19);
      const t1x = ox+s*0.04, t1y = oy-s*0.29, t2x = ox-s*0.09, t2y = oy+s*0.07;
      gfx.drawPolygon(rect(t1x, t1y, t2x, t2y, lw));
      gfx.drawCircle(t1x, t1y, lw); gfx.drawCircle(t2x, t2y, lw);
      const a1x = ox+s*0.01, a1y = oy-s*0.16;
      const a2x = ox-s*0.23, a2y = oy+s*0.02;
      gfx.drawPolygon(rect(a1x, a1y, a2x, a2y, lw*0.85)); gfx.drawCircle(a2x, a2y, lw*0.85);
      const b2x = ox+s*0.21, b2y = oy-s*0.14;
      gfx.drawPolygon(rect(a1x, a1y, b2x, b2y, lw*0.85)); gfx.drawCircle(b2x, b2y, lw*0.85);
      const l2x = ox-s*0.19, l2y = oy+s*0.47;
      gfx.drawPolygon(rect(t2x, t2y, l2x, l2y, lw)); gfx.drawCircle(l2x, l2y, lw);
      const r2x = ox+s*0.15, r2y = oy+s*0.43;
      gfx.drawPolygon(rect(t2x, t2y, r2x, r2y, lw)); gfx.drawCircle(r2x, r2y, lw);
      gfx.endFill();
    };

    drawFigure(2, 2, 0x000000, 0.55);
    drawFigure(0, 0, 0xffffff, 1.00);
    return gfx;
  }

  _updateReticules() {
    if (!canvas?.ready) return;
    const currentIds = new Set([...game.user.targets].map(t => t.id));

    // Remove stale sprites
    for (const [id, sprite] of this._reticuleSprites) {
      if (!currentIds.has(id)) {
        try { sprite.parent?.removeChild(sprite); sprite.destroy(); } catch(_) {}
        this._reticuleSprites.delete(id);
      }
    }

    // Add new sprites
    for (const token of game.user.targets) {
      if (this._reticuleSprites.has(token.id)) continue;
      try {
        const texture = PIXI.Texture.from("modules/table-os-scry/styles/target.png");
        const sprite  = new PIXI.Sprite(texture);
        const tw   = token.w ?? canvas.grid?.size ?? 100;
        const th   = token.h ?? canvas.grid?.size ?? 100;
        const size = Math.max(tw, th) * 1.45;
        sprite.width  = size;
        sprite.height = size;
        sprite.anchor.set(0.5, 0.5);
        sprite.x = (token.x ?? 0) + tw / 2;
        sprite.y = (token.y ?? 0) + th / 2;
        sprite.alpha = 0.92;
        canvas.controls.addChild(sprite);
        this._reticuleSprites.set(token.id, sprite);
      } catch(e) { console.warn("Scry | reticule:", e); }
    }
  }

  _clearReticules() {
    for (const [, sprite] of this._reticuleSprites) {
      try { sprite.parent?.removeChild(sprite); sprite.destroy(); } catch(_) {}
    }
    this._reticuleSprites.clear();
  }

  _removeWalkIcon() {
    if (this._walkIconPixi) {
      try {
        this._walkIconPixi.parent?.removeChild(this._walkIconPixi);
        this._walkIconPixi.destroy();
      } catch (_) {}
      this._walkIconPixi = null;
    }
  }

  _clientToWorld(clientX, clientY) {
    if (!canvas?.ready) return null;

    try {
      if (typeof canvas.canvasCoordinatesFromClient === "function") {
        let pt;
        try { pt = canvas.canvasCoordinatesFromClient({ x: clientX, y: clientY }); } catch (_) {}
        if (!pt || !Number.isFinite(pt?.x)) {
          try { pt = canvas.canvasCoordinatesFromClient({ clientX, clientY }); } catch (_) {}
        }
        if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) return { x: pt.x, y: pt.y };
      }
    } catch (_) {}

    try {
      const el = canvas.app?.canvas ?? canvas.app?.view ?? canvas.app?.renderer?.view
               ?? document.querySelector("#board canvas");
      const r = el?.getBoundingClientRect();
      if (r) {
        const cx = clientX - r.left;
        const cy = clientY - r.top;
        for (const s of [canvas.stage, canvas.app?.stage]) {
          if (!s) continue;
          const scX = s.scale?.x, scY = s.scale?.y;
          const pvX = s.pivot?.x ?? 0, pvY = s.pivot?.y ?? 0;
          const orX = s.position?.x ?? r.width  * 0.5;
          const orY = s.position?.y ?? r.height * 0.5;
          const wx  = pvX + (cx - orX) / scX;
          const wy  = pvY + (cy - orY) / scY;
          if (Number.isFinite(wx) && Number.isFinite(wy)) return { x: wx, y: wy };
        }
      }
    } catch (_) {}

    console.warn("Scry | clientToWorld failed");
    return null;
  }

  _tokenAtWorld(world) {
    if (!canvas?.ready || !world) return null;
    if (globalThis.TABLE_OS?.getTokenAtWorldPoint) return globalThis.TABLE_OS.getTokenAtWorldPoint(world);
    const placeables = canvas.tokens?.placeables ?? [];
    for (let i = placeables.length - 1; i >= 0; i--) {
      const t  = placeables[i];
      const hw = (t.w ?? t.width  ?? 100) / 2;
      const hh = (t.h ?? t.height ?? 100) / 2;
      if (Math.abs(world.x - (t.x + hw)) < hw * 1.2 &&
          Math.abs(world.y - (t.y + hh)) < hh * 1.2) return t;
    }
    return null;
  }

  // -- Mode management ---------------------------------------

  _setMode(mode) {
    this._mode = mode;

    if (mode === "walk") {
      const ownToken = canvas.tokens?.placeables?.find(t => t.actor?.id === this._scry.actor?.id);
      this._addWalkIcon(ownToken);
      if (this._tokenMover && ownToken) {
        try { this._tokenMover.selectToken(ownToken); } catch (_) {}
      }
    } else {
      this._removeWalkIcon();
      if (this._tokenMover) {
        try { this._tokenMover.cancel(); } catch (_) {}
      }
    }

    const b = (cls) => this._bar?.querySelector(cls);

    const tBtn = b(".scry-tv-target");
    const wBtn = b(".scry-tv-walk");
    const pBtn = b(".scry-tv-ping");
    const rBtn = b(".scry-tv-ruler");

    if (tBtn) {
      tBtn.classList.toggle("active", mode === "target");
      tBtn.innerHTML = `<i class="fas fa-bullseye"></i><br>${mode === "target" ? "Targeting…" : "Target"}`;
    }
    if (wBtn) {
      wBtn.classList.toggle("active", mode === "walk");
      wBtn.innerHTML = `<i class="fas fa-person-walking"></i><br>${mode === "walk" ? "Walking…" : "Walk"}`;
    }
    if (pBtn) {
      pBtn.classList.toggle("active", mode === "ping");
      pBtn.innerHTML = `<i class="fas fa-location-pin"></i><br>${mode === "ping" ? "Tap…" : "Ping"}`;
    }
    if (rBtn) {
      rBtn.classList.toggle("active", mode === "ruler");
      rBtn.innerHTML = `<i class="fas fa-ruler"></i><br>${mode === "ruler" ? "Tap pt…" : "Ruler"}`;
      if (mode !== "ruler") this._clearRuler();
    }
  }

  _toggleMode(mode) {
    const next = this._mode === mode ? "none" : mode;
    if (next === "ruler") this._createRulerOverlay();
    this._setMode(next);
  }

  // -- Override style ----------------------------------------

  _injectOverrideStyle() {
    if (document.getElementById(TV_OVERRIDE_ID)) return;
    const s = document.createElement("style");
    s.id = TV_OVERRIDE_ID;
    s.textContent = `
      #controls              { display: none !important; }
      #navigation            { display: none !important; }
      #token-hud             { display: none !important; }
      #token-action-hud      { display: none !important; }
      #players               { display: none !important; }
      #tableos-battle-dock   { display: none !important; }
    `;
    document.head.appendChild(s);
  }

  // -- Bar ---------------------------------------------------

  _injectBar() {
    this._bar?.remove();

    const bar = document.createElement("div");
    bar.id        = "scry-tabletop-bar";
    bar.className = "scry-tabletop-bar";
    // Timer badge — top-left corner, always visible when active
    const timerBadge = document.createElement("div");
    timerBadge.id = "scry-tv-timer-badge";
    timerBadge.style.cssText = [
      "position:fixed","top:10px","left:10px","z-index:99998",
      "background:rgba(10,15,35,.93)","color:#22c55e",
      "font-size:1.5rem","font-weight:700","font-variant-numeric:tabular-nums",
      "padding:.3rem 1rem","border-radius:10px",
      "border:2px solid rgba(255,255,255,.18)",
      "box-shadow:0 4px 16px rgba(0,0,0,.7)","display:none",
    ].join(";");
    document.body.appendChild(timerBadge);

    // Combatant image moved to Scry portrait panel (sfnd-combat-strip)
    // — no longer injected as a floating overlay here

    // Copy theme CSS variables from overlay so bar inherits the current theme
    const overlay = document.getElementById("scry-overlay");
    if (overlay) {
      const cs = getComputedStyle(overlay);
      ["--scry-bg","--scry-bg-card","--scry-bg-surface","--scry-border",
       "--scry-accent","--scry-text","--scry-text-muted","--scry-btn-bg",
       "--scry-btn-hover","--scry-tab-active"].forEach(v => {
        const val = cs.getPropertyValue(v).trim();
        if (val) bar.style.setProperty(v, val);
      });
    }

    bar.innerHTML = `
      <div class="scry-tv-end-turn-row" id="scry-tv-end-turn-row" style="display:none">
        <button class="scry-tv-end-turn-btn" title="End your turn">
          <i class="fas fa-flag-checkered"></i> END TURN
        </button>
      </div>
      <div class="scry-tv-info-strip" id="scry-tv-info-strip">
        <span class="scry-tvi-conditions hidden"></span>
        <div  class="scry-tvi-movement hidden"></div>
      </div>
      <div class="scry-tv-action-row">
        <button class="scry-tv-btn scry-tv-back"    title="Back to Scry"><i class="fas fa-arrow-left"></i><br>Scry</button>
        <button class="scry-tv-btn scry-tv-target"  title="Tap a token to target it"><i class="fas fa-bullseye"></i><br>Target</button>
        <button class="scry-tv-btn scry-tv-walk"    title="Tap canvas to move here"><i class="fas fa-person-walking"></i><br>Walk</button>
        <button class="scry-tv-btn scry-tv-actions" title="Open Actions"><i class="fas fa-hand-fist"></i><br>Actions</button>
        <button class="scry-tv-btn scry-tv-spells"  title="Open Spells"><i class="fas fa-hat-wizard"></i><br>Spells</button>
        <button class="scry-tv-btn scry-tv-nav"     title="Screen navigation"><i class="fas fa-display"></i><br>Nav</button>
        <button class="scry-tv-btn scry-tv-ping"    title="Tap canvas to ping"><i class="fas fa-location-pin"></i><br>Ping</button>
        <button class="scry-tv-btn scry-tv-ruler"   title="Two-tap measure"><i class="fas fa-ruler"></i><br>Ruler</button>
      </div>`;
    document.body.appendChild(bar);
    this._bar = bar;

    bar.querySelector(".scry-tv-end-turn-btn")?.addEventListener("click", () => game.combat?.nextTurn());
    bar.querySelector(".scry-tv-back")   .addEventListener("click", () => this.exit());
    bar.querySelector(".scry-tv-target") .addEventListener("click", () => this._toggleMode("target"));
    bar.querySelector(".scry-tv-walk")   .addEventListener("click", () => this._toggleMode("walk"));
    bar.querySelector(".scry-tv-actions").addEventListener("click", () => this._openOverlay("actions"));
    bar.querySelector(".scry-tv-spells") .addEventListener("click", () => this._openOverlay("spells"));
    bar.querySelector(".scry-tv-nav")    .addEventListener("click", () => this._openNav());
    bar.querySelector(".scry-tv-ping")   .addEventListener("click", () => this._toggleMode("ping"));
    bar.querySelector(".scry-tv-ruler")  .addEventListener("click", () => this._toggleMode("ruler"));
  }

  // -- Info strip update -------------------------------------

  _updateEndTurnBtn() {
    const row = document.getElementById("scry-tv-end-turn-row");
    if (!row) return;
    const combatant = game.combat?.combatants?.find(c => c.actor?.id === this._scry.actor?.id);
    const isMyTurn  = !!(combatant && game.combat?.active &&
                         game.combat?.current?.combatantId === combatant.id);
    row.style.display = isMyTurn ? "" : "none";
  }

  _updateInfoStrip() {
    const strip = document.getElementById("scry-tv-info-strip");
    if (!strip) return;

    // Conditions
    const condEl = strip.querySelector(".scry-tvi-conditions");
    if (condEl) {
      const statuses = [...(this._scry.actor?.statuses ?? [])].filter(s => s !== "concentrating");
      if (statuses.length) {
        condEl.textContent = statuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", ");
        condEl.classList.remove("hidden");
      } else {
        condEl.classList.add("hidden");
      }
    }

    // Movement pips
    const movEl = strip.querySelector(".scry-tvi-movement");
    if (movEl) {
      const speed    = this._scry.actor?.system?.attributes?.movement?.walk ?? 30;
      const used     = this._scry._movementUsed ?? 0;
      const gridDist = canvas.grid?.distance ?? 5;
      const totalSq  = Math.round(speed / gridDist);
      const usedSq   = Math.min(Math.round(used / gridDist), totalSq);
      const remFt    = Math.max(speed - used, 0);
      const remSq    = totalSq - usedSq;

      let pips = "";
      for (let i = 0; i < totalSq; i++) {
        let cls = "scry-move-sq";
        if (i < usedSq)                                       cls += " is-used";
        else if (remSq <= Math.round(totalSq * 0.25))         cls += " is-danger";
        else if (remSq <= Math.round(totalSq * 0.50))         cls += " is-warn";
        pips += `<span class="${cls}"></span>`;
      }
      movEl.innerHTML = `<span class="scry-move-label">Move</span><span class="scry-move-pips-inline">${pips}</span><span class="scry-move-ft">${remFt}ft</span>`;
      movEl.classList.remove("hidden");
    }

    // Don't update floaters while the Scry overlay is sitting on top of the canvas
    const overlayOpen = document.getElementById("scry-overlay")?.classList.contains("tv-overlay-mode");
    if (overlayOpen) return;

    // Timer badge (top-left floater) — read TableOS timer even when it's CSS-hidden
    const tvTimer = document.getElementById("scry-tv-timer-badge");
    if (tvTimer) {
      const src = document.querySelector(".tableos-turn-timer__time");
      const val = src?.textContent?.trim();
      if (val) {
        tvTimer.textContent = val;
        const innerEl = document.querySelector(".tableos-turn-timer__inner");
        tvTimer.style.color = innerEl?.style?.color || "#22c55e";
        tvTimer.style.display = "block";
      } else {
        tvTimer.style.display = "none";
      }
    }

    // Combatant display is handled in Scry portrait panel (sfnd-combat-strip)
  }

  // -- Navigation --------------------------------------------

  _openNav() {
    this._toggleFallbackNav();
  }

  // -- Ping mode (tap canvas after pressing Ping) -----------

  _handleZoomTap(world) {
    if (!world) return;
    canvas.animatePan({ x: world.x, y: world.y, scale: 1.2, duration: 400 });
    this._setMode("none");
  }

  _handlePingTap(world) {
    if (!world) return;
    // Try all known API paths across Foundry versions
    try {
      if (typeof canvas.ping === "function") {
        canvas.ping({ x: world.x, y: world.y }, { scene: canvas.scene?.id });
      } else if (typeof canvas.controls?.ping === "function") {
        canvas.controls.ping({ x: world.x, y: world.y });
      } else {
        // Fallback: pan canvas to the tapped location as visual confirmation
        canvas.animatePan({ x: world.x, y: world.y, duration: 300 });
      }
    } catch (_) {
      try { canvas.animatePan({ x: world.x, y: world.y, duration: 300 }); } catch (_2) {}
    }
    this._setMode("none");
  }

  // -- Custom two-tap ruler ----------------------------------

  _handleRulerTap(screenX, screenY, world) {
    if (!world) return;
    this._rulerPoints.push({ screen: { x: screenX, y: screenY }, world });

    const svg = document.getElementById("scry-ruler-svg");
    if (!svg) return;

    // Draw dot at tap point
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", screenX);
    dot.setAttribute("cy", screenY);
    dot.setAttribute("r", "8");
    dot.setAttribute("fill", "#4fc3f7");
    dot.setAttribute("stroke", "#fff");
    dot.setAttribute("stroke-width", "2");
    svg.appendChild(dot);

    if (this._rulerPoints.length === 2) {
      const [a, b] = this._rulerPoints;

      // Draw dashed line behind dots
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", a.screen.x); line.setAttribute("y1", a.screen.y);
      line.setAttribute("x2", b.screen.x); line.setAttribute("y2", b.screen.y);
      line.setAttribute("stroke", "#4fc3f7");
      line.setAttribute("stroke-width", "3");
      line.setAttribute("stroke-dasharray", "10,5");
      svg.insertBefore(line, svg.firstChild);

      // Calculate grid distance
      const dx = b.world.x - a.world.x;
      const dy = b.world.y - a.world.y;
      const worldDist = Math.hypot(dx, dy);
      const gridSize  = canvas.grid?.size     ?? 100;
      const gridDist  = canvas.grid?.distance ?? 5;
      const feet = Math.round((worldDist / gridSize) * gridDist);

      const readout = document.getElementById("scry-ruler-readout");
      if (readout) { readout.textContent = `${feet} ft`; readout.style.display = "block"; }

      // Reset points — ruler mode stays active for another measurement
      this._rulerPoints = [];
    }
  }

  _createRulerOverlay() {
    document.getElementById("scry-ruler-overlay")?.remove();
    this._rulerPoints = [];
    const div = document.createElement("div");
    div.id = "scry-ruler-overlay";
    div.style.cssText = "position:fixed;inset:0;z-index:9050;pointer-events:none;";
    div.innerHTML = `
      <svg id="scry-ruler-svg" width="100%" height="100%"
           style="position:absolute;inset:0;overflow:visible;"></svg>
      <div id="scry-ruler-readout" style="
        position:absolute;top:60px;left:50%;transform:translateX(-50%);
        background:rgba(10,15,35,.97);color:#4fc3f7;
        font-size:2.4rem;font-weight:700;letter-spacing:.06em;
        padding:.4rem 1.4rem;border-radius:14px;border:2px solid #4fc3f7;
        box-shadow:0 4px 20px rgba(0,0,0,.7);white-space:nowrap;display:none;
      "></div>`;
    document.body.appendChild(div);
  }

  _clearRuler() {
    document.getElementById("scry-ruler-overlay")?.remove();
    this._rulerPoints = [];
  }

  _toggleFallbackNav() {
    const existing = document.getElementById("scry-nav-panel");
    if (existing) { existing.remove(); return; }

    const panel = document.createElement("div");
    panel.id = "scry-nav-panel";
    panel.style.cssText = [
      "position:fixed","bottom:70px","left:50%","transform:translateX(-50%)",
      "z-index:99998","background:rgba(10,15,35,.92)","border-radius:14px",
      "padding:10px 14px 12px","display:flex","flex-direction:column",
      "align-items:center","gap:8px","box-shadow:0 6px 24px rgba(0,0,0,.75)",
    ].join(";");

    const title = document.createElement("div");
    title.textContent = "SCREEN";
    title.style.cssText = "font-size:.7rem;letter-spacing:.12em;color:rgba(255,255,255,.45);font-weight:700;";
    panel.appendChild(title);

    const bs = "width:52px;height:52px;font-size:1.3rem;background:rgba(255,255,255,.12);"
      + "color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:10px;"
      + "cursor:pointer;display:flex;align-items:center;justify-content:center;";
    const mkBtn = (txt, fn) => {
      const b = document.createElement("button");
      b.textContent = txt; b.style.cssText = bs;
      b.addEventListener("click", fn); return b;
    };

    const dpad = document.createElement("div");
    dpad.style.cssText = "display:grid;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(3,52px);gap:5px;";
    const cell = (col, row, txt, fn) => {
      const b = mkBtn(txt, fn); b.style.gridColumn = col; b.style.gridRow = row;
      dpad.appendChild(b);
    };
    const gridSz = () => (canvas.grid?.size ?? 100) * 4;
    cell(2,1,"↑", () => canvas.animatePan({ x: canvas.stage.pivot.x, y: canvas.stage.pivot.y - gridSz() }));
    cell(1,2,"←", () => canvas.animatePan({ x: canvas.stage.pivot.x - gridSz(), y: canvas.stage.pivot.y }));
    cell(3,2,"→", () => canvas.animatePan({ x: canvas.stage.pivot.x + gridSz(), y: canvas.stage.pivot.y }));
    cell(2,3,"↓", () => canvas.animatePan({ x: canvas.stage.pivot.x, y: canvas.stage.pivot.y + gridSz() }));
    const centerBtn = mkBtn("⊕", () => {
      const t = canvas.tokens?.placeables?.find(t => t.actor?.id === this._scry.actor?.id);
      if (t) {
        canvas.animatePan({ x: t.center.x, y: t.center.y, scale: 1.0 });
        canvas.tokens?.controlled?.forEach(ct => ct.release?.());
        t.control?.({ releaseOthers: true });
      }
    });
    centerBtn.style.gridColumn = "2"; centerBtn.style.gridRow = "2";
    centerBtn.style.cssText += "background:rgba(37,99,235,.7);";
    dpad.appendChild(centerBtn);
    panel.appendChild(dpad);

    const zoomRow = document.createElement("div");
    zoomRow.style.cssText = "display:flex;gap:5px;";
    const zoom = (f) => { const s = canvas.stage?.scale?.x ?? 1; canvas.animatePan({ scale: Math.clamped(s * f, 0.1, 3) }); };
    zoomRow.appendChild(mkBtn("＋", () => zoom(1.4)));
    zoomRow.appendChild(mkBtn("－", () => zoom(0.7)));
    const fitBtn = mkBtn("⊞", () => {
      const ts = canvas.tokens?.placeables ?? [];
      if (!ts.length) return;
      const pad  = (canvas.grid?.size ?? 100) * 2;
      const xs   = ts.map(t => t.x + (t.w ?? 0) / 2);
      const ys   = ts.map(t => t.y + (t.h ?? 0) / 2);
      const cx   = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy   = (Math.min(...ys) + Math.max(...ys)) / 2;
      const spanX = Math.max(...xs) - Math.min(...xs) + pad;
      const spanY = Math.max(...ys) - Math.min(...ys) + pad;
      const scaleX = window.innerWidth  / spanX;
      const scaleY = window.innerHeight / spanY;
      const scale  = Math.min(scaleX, scaleY, 1.0);
      canvas.animatePan({ x: cx, y: cy, scale: Math.max(scale, 0.05) });
    });
    fitBtn.style.cssText += "font-size:.9rem;";
    fitBtn.title = "Fit all tokens";
    zoomRow.appendChild(fitBtn);
    panel.appendChild(zoomRow);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "✕ Close";
    closeBtn.style.cssText = "width:100%;padding:8px 0;font-size:.85rem;background:rgba(255,255,255,.08);"
      + "color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:8px;cursor:pointer;";
    closeBtn.addEventListener("click", () => panel.remove());
    panel.appendChild(closeBtn);

    document.body.appendChild(panel);
  }

  // -- Token picker (Actions tab targeting fallback) ---------

  openTokenPicker() {
    this.closeTokenPicker();
    if (!canvas?.ready) return;

    const tokens = (canvas.tokens?.placeables ?? []).filter(t => !t.document?.hidden);

    const picker = document.createElement("div");
    picker.id        = "scry-token-picker";
    picker.className = "scry-token-picker";

    const rows = tokens.map(t => {
      const targeted = game.user.targets.has(t);
      const img      = t.document?.texture?.src ?? t.actor?.img ?? "icons/svg/mystery-man.svg";
      return `
        <button class="scry-tp-row ${targeted ? "is-targeted" : ""}" data-token-id="${t.id}">
          <img class="scry-tp-img" src="${img}" alt="">
          <span class="scry-tp-name">${t.name ?? "Unknown"}</span>
          <span class="scry-tp-badge">${targeted ? "&#10003; Targeted" : "Target"}</span>
        </button>`;
    }).join("");

    picker.innerHTML = `
      <div class="scry-tp-header">
        <span class="scry-tp-title">Select Target</span>
        <button class="scry-tp-close">&#10005;</button>
      </div>
      <div class="scry-tp-list">
        ${rows || "<p class='scry-tp-empty'>No visible tokens.</p>"}
      </div>`;

    document.body.appendChild(picker);
    this._picker = picker;

    picker.querySelector(".scry-tp-close").addEventListener("click", () => this.closeTokenPicker());
    picker.querySelectorAll(".scry-tp-row[data-token-id]").forEach(btn => {
      btn.addEventListener("click", () => {
        const token = canvas.tokens?.placeables?.find(t => t.id === btn.dataset.tokenId);
        if (!token) return;
        const wasTargeted = game.user.targets.has(token);
        token.setTarget(!wasTargeted, { user: game.user, releaseOthers: !wasTargeted });
        this.openTokenPicker();
      });
    });
  }

  closeTokenPicker() {
    this._picker?.remove();
    this._picker = null;
  }

  // -- Turn announcement (NPC / other combatant splash card) -

  showTurnAnnouncement(combatant) {
    document.getElementById("scry-tv-announcement")?.remove();

    const actor  = combatant.actor;
    const isMyPC = actor?.id === this._scry.actor?.id;

    const portrait = actor?.img
                  ?? combatant.token?.texture?.src
                  ?? combatant.img
                  ?? "icons/svg/mystery-man.svg";
    const name  = combatant.name ?? "Unknown";
    const isPC  = actor?.hasPlayerOwner && !isMyPC;
    const label = isMyPC ? "YOUR TURN" : isPC ? "THEIR TURN" : "NOW ACTING";

    const ann = document.createElement("div");
    ann.id = "scry-tv-announcement";
    if (isMyPC) ann.classList.add("is-my-turn");
    else if (isPC) ann.classList.add("is-friendly");
    ann.innerHTML = `
      <div class="scry-tv-ann-card">
        <img class="scry-tv-ann-portrait" src="${portrait}" alt="${name}">
        <div class="scry-tv-ann-footer">
          <div class="scry-tv-ann-label">${label}</div>
          <div class="scry-tv-ann-name">${name}</div>
        </div>
      </div>`;

    document.body.appendChild(ann);
    ann.addEventListener("click", () => ann.remove());
    setTimeout(() => ann?.isConnected && ann.remove(), 3500);
  }

  // -- Overlay (from tabletop bar) ---------------------------

  _openOverlay(tabId) {
    this._bar?.style.setProperty("display", "none", "important");
    // Hide floating badges while Scry overlay is on top
    document.getElementById("scry-tv-timer-badge")?.style.setProperty("display", "none", "important");
    /* combatant display now in portrait panel */
    const overlay = document.getElementById("scry-overlay");
    if (overlay) {
      overlay.classList.remove("hidden");
      this._scry.switchTab(tabId);
      overlay.classList.add("tv-overlay-mode");
    }
  }
}
