/*
Module: TableOS Scry — Mobile Player Companion
Component: scry-view.js
Purpose: Main overlay — persistent header, 5-tab shell, tab switching, actor refresh.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

import { readActorData }  from "./system-reader.js";
import { ScrySettings }   from "./settings-manager.js";
import { TurnIndicator }  from "./turn-indicator.js";
import { TabletopView }   from "./tabletop-view.js";
import { TabActions }     from "./tabs/tab-actions.js";
import { TabSpells }      from "./tabs/tab-spells.js";
import { TabGear }        from "./tabs/tab-gear.js";
import { TabCharacter }   from "./tabs/tab-character.js";
import { FoundryShell, FOUNDRY_THEMES } from "./templates/foundry/foundry-shell.js";
import { FoundryTabActions }   from "./templates/foundry/foundry-tab-actions.js";
import { FoundryTabSpells }    from "./templates/foundry/foundry-tab-spells.js";
import { FoundryTabGear }      from "./templates/foundry/foundry-tab-gear.js";
import { FoundryTabCharacter } from "./templates/foundry/foundry-tab-character.js";
import { FoundryTabTraits }    from "./templates/foundry/foundry-tab-traits.js";
import { BeyondShell, BEYOND_THEMES, BEYOND_TABS } from "./templates/beyond/beyond-shell.js";
import { BeyondTabActions }   from "./templates/beyond/beyond-tab-actions.js";
import { BeyondTabSpells }    from "./templates/beyond/beyond-tab-spells.js";
import { BeyondTabGear }      from "./templates/beyond/beyond-tab-gear.js";
import { BeyondTabCharacter } from "./templates/beyond/beyond-tab-character.js";
import { BeyondTabTraits }    from "./templates/beyond/beyond-tab-traits.js";

const THEME_DEFS = [
  { id: "cobalt",    name: "Cobalt",    desc: "Dark navy / cyan",        bg: "#0d1b2a", card: "#16213e", accent: "#4fc3f7", text: "#e8eaf6", border: "#2a3a5c" },
  { id: "atlas",     name: "Atlas",     desc: "Light / navy",            bg: "#f0f2f8", card: "#ffffff", accent: "#1976d2", text: "#1a1a2e", border: "#c5cce6" },
  { id: "slate",     name: "Slate",     desc: "Charcoal / steel",        bg: "#14171f", card: "#1c2030", accent: "#94a3b8", text: "#f1f5f9", border: "#2d3548" },
  { id: "nomad",     name: "Nomad",     desc: "Desert / amber",          bg: "#1c1409", card: "#2a1e0e", accent: "#d97706", text: "#fde68a", border: "#6b4c1a" },
  { id: "cipher",    name: "Cipher",    desc: "Near-black / violet",     bg: "#0d0d14", card: "#12111f", accent: "#7c3aed", text: "#ede9fe", border: "#2e1f5e" },
  { id: "classic",   name: "Classic",   desc: "Dark charcoal / tan",       bg: "#1a1a1a", card: "#1e2235", accent: "#b5926d", text: "#d8d5cc", border: "#2d3550" },
  { id: "modern",    name: "Modern",    desc: "Near-black / gold",         bg: "#191919", card: "#242424", accent: "#c8a050", text: "#eaeaea", border: "#303030" },
  { id: "frost",     name: "Frost",     desc: "Dark slate / ice blue",     bg: "#2B2F36", card: "#373C45", accent: "#A6D9FF", text: "#D7E6F2", border: "#6C7A8A" },
  { id: "forge",     name: "Forge",     desc: "Dark iron / gold",          bg: "#0d0a06", card: "#1a1510", accent: "#c8901a", text: "#f0e8d0", border: "#4a3a1a" },
  { id: "brass",     name: "Brass",     desc: "Warm ivory / gold",         bg: "#f5f0e4", card: "#ede5d0", accent: "#9a7400", text: "#1c1408", border: "#b8900a" },
  { id: "parchment", name: "Parchment", desc: "Aged paper / brown-gold",   bg: "#e8dcc0", card: "#f0e6cc", accent: "#a06800", text: "#1a1008", border: "#8b6510" },
  { id: "nightfall", name: "Nightfall", desc: "Deep purple-slate / ice blue", bg: "#2C2B36", card: "#37363F", accent: "#A6D9FF", text: "#D7E6F2", border: "#5E6270" },
  { id: "twilight",  name: "Twilight",  desc: "Dark blue-grey / ice blue", bg: "#2B2F36", card: "#373C45", accent: "#A6D9FF", text: "#D7E6F2", border: "#6C7A8A" },
  { id: "crystal",   name: "Crystal",   desc: "Near-white / strong blue",  bg: "#F2F7FF", card: "#EDF3FF", accent: "#2563EB", text: "#1A2330", border: "#8FAEEB" },
  { id: "vellum",    name: "Vellum",    desc: "Warm parchment / blue",     bg: "#F7F2E8", card: "#F2E8D6", accent: "#2563EB", text: "#1A2330", border: "#8FAEEB" },
  { id: "amber",            name: "Amber",            desc: "Dark charcoal / orange",    bg: "#1B1922", card: "#2C313F", accent: "#F28C28", text: "#D7D0C5", border: "#61574A" },
  { id: "beyond-dark",     name: "Beyond Dark",     desc: "Near-black / blue",         bg: "#0e0e12", card: "#1e1e28", accent: "#1A6FE3", text: "#f0f0f5", border: "rgba(255,255,255,0.09)" },
  { id: "beyond-light",    name: "Beyond Light",    desc: "Off-white / navy blue",     bg: "#eef2f8", card: "#ffffff", accent: "#1A6FE3", text: "#1a2a4a", border: "rgba(26,42,74,0.13)" },
  { id: "beyond-parchment",name: "Beyond Parchment",desc: "Warm cream / saddle brown", bg: "#f0e8d5", card: "#fffbf0", accent: "#8b4513", text: "#3d2b1a", border: "rgba(61,43,26,0.18)" },
];

const TABS = [
  { id: "actions",   label: "Actions",   icon: "⚔" },
  { id: "spells",    label: "Spells",    icon: "✨" },
  { id: "gear",      label: "Gear",      icon: "🎒" },
  { id: "character", label: "Character", icon: "📜" },
  { id: "table",     label: "Table",     icon: "🗺" },
];

const TAB_HANDLERS = {
  actions:   () => new TabActions(),
  spells:    () => new TabSpells(),
  gear:      () => new TabGear(),
  character: () => new TabCharacter(),
};

const FOUNDRY_TAB_HANDLERS = {
  actions:   () => new FoundryTabActions(),
  spells:    () => new FoundryTabSpells(),
  gear:      () => new FoundryTabGear(),
  character: () => new FoundryTabCharacter(),
  traits:    () => new FoundryTabTraits(),
};

const BEYOND_TAB_HANDLERS = {
  actions:   () => new BeyondTabActions(),
  spells:    () => new BeyondTabSpells(),
  gear:      () => new BeyondTabGear(),
  character: () => new BeyondTabCharacter(),
  traits:    () => new BeyondTabTraits(),
};

export class ScryView {
  constructor(actor, deviceType) {
    this.actor      = actor;
    this.deviceType = deviceType; // "phone" | "tablet"
    this.activeTab  = "actions";
    this.statsExpanded = false;
    this._element        = null;
    this._tabHandlers    = {};
    this._foundryHandlers = {};
    this._beyondHandlers  = {};
    this._isFoundry      = false;
    this._isBeyond       = false;
    this._turnIndicator  = null;
    this._tabletopView   = null;
    this._hooks             = [];
    this._timerInterval     = null;
    this._movementUsed      = 0;
    this._initObserver      = null;
    this._lastKnownPos      = null;
    this._shownCombatStart  = null;
  }

  // --- lifecycle ---

  render() {
    const data = readActorData(this.actor);
    if (!data) {
      console.error("TableOS Scry | Could not read actor data.");
      return;
    }

    document.getElementById("scry-overlay")?.remove();

    const theme = ScrySettings.getEffectiveTheme();
    this._isFoundry = FOUNDRY_THEMES.has(theme);
    this._isBeyond  = BEYOND_THEMES.has(theme);
    const html = this._isFoundry
      ? FoundryShell.buildHTML(data, theme, this.deviceType, this.activeTab)
      : this._isBeyond
        ? BeyondShell.buildHTML(data, theme, this.deviceType, this.activeTab)
        : this._buildOverlayHTML(data, theme);
    document.body.insertAdjacentHTML("beforeend", html);
    this._element = document.getElementById("scry-overlay");

    this._tabletopView = new TabletopView(this);
    // Foundry and Beyond templates handle combat display differently — don't inject into portrait wrap
    this._turnIndicator = new TurnIndicator(
      (this._isFoundry || this._isBeyond) ? null : this._element.querySelector(".scry-turn-indicator")
    );

    this._activateHeader(data);
    this._activateTabBar();
    this._renderTab(this.activeTab, data);
    this._turnIndicator.activate();
    this._registerHooks();
    this._startTimerSync();
    this._startInitiativeObserver();

    console.log(`TableOS Scry | Overlay rendered for ${this.actor.name} (${this.deviceType})`);
  }

  destroy() {
    this._hooks.forEach(([name, id]) => Hooks.off(name, id));
    this._hooks = [];
    this._turnIndicator?.destroy();
    this._stopTimerSync();
    this._stopInitiativeObserver();
    this._element?.remove();
    this._element = null;
    document.getElementById("scry-tabletop-bar")?.remove();
  }

  openTokenPicker() {
    this._tabletopView?.openTokenPicker();
  }

  enterTableView() {
    const tv = this._tabletopView;
    if (!tv) return;
    if (tv.active) {
      const overlay = document.getElementById("scry-overlay");
      overlay?.classList.add("hidden");
      overlay?.classList.remove("tv-overlay-mode");
      tv._bar?.style.removeProperty("display");
      tv._updateInfoStrip?.();
    } else {
      tv.enter();
    }
  }

  switchTab(tabId) {
    const handlers = this._isFoundry ? FOUNDRY_TAB_HANDLERS
      : this._isBeyond ? BEYOND_TAB_HANDLERS : TAB_HANDLERS;
    if (!handlers[tabId]) return;
    this.activeTab = tabId;

    const btnSel = this._isFoundry ? ".sfnd-nav-btn"
      : this._isBeyond ? ".sbnd-tab-btn" : ".scry-tab-btn";
    this._element?.querySelectorAll(btnSel).forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });

    if (this._isBeyond) {
      const titleEl = this._element?.querySelector(".sbnd-section-title");
      if (titleEl) titleEl.textContent = BEYOND_TABS.find(t => t.id === tabId)?.label ?? "";
    }

    const data = readActorData(this.actor);
    if (data) this._renderTab(tabId, data);
  }

  // --- HTML builders ---

  _buildOverlayHTML(data, theme) {
    const isTablet  = this.deviceType === "tablet";
    const navHtml   = isTablet ? this._buildSidebar() : this._buildTabBar();
    return `
<div id="scry-overlay" class="scry-overlay theme-${theme} device-${this.deviceType}">
  ${this._buildHeader(data)}
  <div class="scry-body">
    ${isTablet ? `<nav class="scry-sidebar">${navHtml}</nav>` : ""}
    <div class="scry-tab-content" id="scry-tab-content"></div>
  </div>
  ${!isTablet ? `<nav class="scry-tab-bar">${navHtml}</nav>` : ""}
</div>`;
  }

  _buildHeader(data) {
    const hpPct   = Math.round((data.hpCurrent / data.hpMax) * 100);
    const hpClass = hpPct <= 25 ? "critical" : hpPct <= 50 ? "bloodied" : "";
    const concHtml = data.concentration
      ? `<span class="scry-conc-indicator" title="Concentrating">CON</span>` : "";

    return `
    <header class="scry-header">
      <div class="scry-header-top">
        <div class="scry-turn-indicator hidden"></div>
        <div class="scry-turn-timer-badge hidden"></div>
        <div class="scry-header-identity">
          <img class="scry-portrait" src="${data.img ?? "icons/svg/mystery-man.svg"}" alt="${data.name}">
          <div class="scry-identity-text">
            <div class="scry-char-name">${data.name}</div>
            <div class="scry-char-class">${data.classLabel || data.race}</div>
          </div>
        </div>
        <div class="scry-header-vitals">
          <div class="scry-ac-badge">${data.ac}</div>
          ${concHtml}
          <div class="scry-hp-block">
            <div class="scry-hp-bar ${hpClass}">
              <div class="scry-hp-fill" style="width:${hpPct}%"></div>
            </div>
            <div class="scry-hp-text">${data.hpCurrent} / ${data.hpMax}${data.hpTemp > 0 ? ` (+${data.hpTemp})` : ""}</div>
          </div>
        </div>
      </div>
      <div class="scry-stats-bar ${this.statsExpanded ? "expanded" : "collapsed"}">
        <div class="scry-stats-toggle" title="Tap to expand stats">▼</div>
        <div class="scry-stats-row">
          <span class="scry-stat" title="Speed"><label>SPD</label>${data.speed}ft</span>
          <span class="scry-stat" title="Proficiency Bonus"><label>PROF</label>+${data.profBonus}</span>
          <span class="scry-stat" title="Initiative"><label>INIT</label>${data.initiative >= 0 ? "+" : ""}${data.initiative}</span>
          <span class="scry-stat" title="Passive Perception"><label>PERC</label>${data.passivePerc}</span>
          ${data.spellcastingAbl ? `
          <span class="scry-stat" title="Spell Attack"><label>ATK</label>+${data.spellAttackBonus}</span>
          <span class="scry-stat" title="Spell Save DC"><label>DC</label>${data.spellSaveDC}</span>` : ""}
        </div>
        <div class="scry-hp-edit-row">
          <button class="scry-hp-btn scry-hp-damage"   data-action="damage">Damage</button>
          <button class="scry-hp-btn scry-hp-heal"     data-action="heal">Heal</button>
          <button class="scry-hp-btn scry-hp-temp"     data-action="temp">Temp HP</button>
          <button class="scry-hp-btn scry-btn-status">Status</button>
          <button class="scry-hp-btn scry-btn-rest">Rest</button>
          <button class="scry-hp-btn scry-btn-tools" title="Foundry Access">Foundry</button>
        </div>
        <div class="scry-stats-expanded-content">
          ${this._buildSlideDownExpanded(data)}
        </div>
      </div>
    </header>`;
  }

  _buildTabBar() {
    return TABS.map(t =>
      `<button class="scry-tab-btn ${t.id === this.activeTab ? "active" : ""}" data-tab="${t.id}">
        <span class="scry-tab-icon">${t.icon}</span>
        <span class="scry-tab-label">${t.label}</span>
      </button>`
    ).join("");
  }

  _buildSidebar() {
    return TABS.map(t =>
      `<button class="scry-tab-btn ${t.id === this.activeTab ? "active" : ""}" data-tab="${t.id}">
        <span class="scry-tab-icon">${t.icon}</span>
        <span class="scry-tab-label">${t.label}</span>
      </button>`
    ).join("");
  }

  // --- event binding ---

  _wirePortraitSwitcher() {
    if (this._getOwnedActors().length <= 1) return;
    const el = this._element;
    for (const sel of [".scry-portrait", ".sfnd-portrait-img", ".sbnd-portrait"]) {
      const img = el.querySelector(sel);
      if (!img) continue;
      img.classList.add("is-switchable");
      img.addEventListener("click", () => this._openActorPicker());
    }
  }

  _activateFoundryPanel(_data) {
    const el = this._element;
    this._wirePortraitSwitcher();

    // HP buttons — damage / heal / temp
    el.querySelectorAll(".sfnd-pbtn[data-action]").forEach(btn => {
      btn.addEventListener("click", () => this._hpDialog(btn.dataset.action));
    });

    // Rest modal
    el.querySelector(".sfnd-pbtn-rest")?.addEventListener("click", () => this._openRestModal());

    // Status / conditions panel — open Actions tab in status eco view
    el.querySelector(".sfnd-pbtn-status")?.addEventListener("click", () => {
      if (!this._foundryHandlers["actions"]) {
        this._foundryHandlers["actions"] = FOUNDRY_TAB_HANDLERS["actions"]?.();
      }
      const h = this._foundryHandlers["actions"];
      if (h) { h._activeEco = "status"; h._activeCat = "all"; }
      this.switchTab("actions");
    });

    // Inspiration toggle
    el.querySelector(".sfnd-pbtn-insp")?.addEventListener("click", async () => {
      const current = this.actor.system.attributes.inspiration ?? false;
      await this.actor.update({ "system.attributes.inspiration": !current });
    });

    // Initiative diamond — open Scry numpad dialog (only for this character)
    el.querySelector(".sfnd-diamond-init")?.addEventListener("click", () => {
      this._openInitiativeDialog();
    });

    // Table tools
    el.querySelector(".sfnd-tools-btn")?.addEventListener("click", () => this._openTableTools());
  }

  _activateBeyondPanel(_data) {
    const el = this._element;
    this._wirePortraitSwitcher();
    el.querySelector(".sbnd-hp-pill")?.addEventListener("click", () => {
      this._openScryModal({
        title: "Hit Points",
        bodyHtml: "",
        buttons: [
          { label: "Damage",  className: "scry-modal-btn-danger",
            callback: ({closeModal}) => { closeModal(); this._hpDialog("damage"); } },
          { label: "Heal",    className: "scry-modal-btn-primary",
            callback: ({closeModal}) => { closeModal(); this._hpDialog("heal"); } },
          { label: "Temp HP",
            callback: ({closeModal}) => { closeModal(); this._hpDialog("temp"); } },
        ]
      });
    });
    el.querySelector(".sbnd-tools-btn")?.addEventListener("click", () => this._openTableTools());
  }

  _activateHeader(data) {
    if (this._isFoundry) {
      this._activateFoundryPanel(data);
      return;
    }
    if (this._isBeyond) {
      this._activateBeyondPanel(data);
      return;
    }

    const el = this._element;

    // Stats bar toggle
    el.querySelector(".scry-stats-toggle")?.addEventListener("click", () => {
      this.statsExpanded = !this.statsExpanded;
      el.querySelector(".scry-stats-bar")?.classList.toggle("expanded", this.statsExpanded);
      el.querySelector(".scry-stats-bar")?.classList.toggle("collapsed", !this.statsExpanded);
      el.querySelector(".scry-stats-toggle").textContent = this.statsExpanded ? "▲" : "▼";
    });

    // HP damage / heal / temp
    el.querySelectorAll(".scry-hp-btn[data-action]").forEach(btn => {
      btn.addEventListener("click", () => this._hpDialog(btn.dataset.action));
    });

    // Status shortcut — opens Actions tab with Status panel; marks button open
    el.querySelector(".scry-btn-status")?.addEventListener("click", () => {
      if (!this._tabHandlers["actions"]) {
        this._tabHandlers["actions"] = TAB_HANDLERS["actions"]?.() ?? null;
      }
      const h = this._tabHandlers["actions"];
      if (h) { h._activeEco = "status"; h._activeCat = "all"; }
      el.querySelector(".scry-btn-status")?.classList.add("is-open");
      this.switchTab("actions");
    });

    // Rest shortcut — scry-styled modal with HD roll + short/long rest
    el.querySelector(".scry-btn-rest")?.addEventListener("click", () => this._openRestModal());

    // Table tools panel
    el.querySelector(".scry-btn-tools")?.addEventListener("click", () => this._openTableTools());

    // Portrait tap — actor switcher
    this._wirePortraitSwitcher();

    // Slide-down expanded content interactions
    this._activateSlideDown(el);
  }

  _activateTabBar() {
    const sel = this._isFoundry ? ".sfnd-nav-btn[data-tab]"
      : this._isBeyond ? ".sbnd-tab-btn[data-tab]" : ".scry-tab-btn[data-tab]";
    this._element?.querySelectorAll(sel).forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.dataset.tab === "table") {
          if (this._tabletopView?.active) {
            const overlay = document.getElementById("scry-overlay");
            overlay?.classList.add("hidden");
            overlay?.classList.remove("tv-overlay-mode");
            this._tabletopView._bar?.style.removeProperty("display");
            this._tabletopView._updateInfoStrip?.();
          } else {
            this._tabletopView?.enter();
          }
        } else {
          if (btn.dataset.tab === "actions") {
            const handlerStore = this._isFoundry ? this._foundryHandlers
              : this._isBeyond ? this._beyondHandlers : this._tabHandlers;
            const h = handlerStore["actions"];
            if (h && h._activeEco === "status") {
              h._activeEco = "action";
              h._activeCat = "all";
              if (!this._isFoundry && !this._isBeyond) {
                this._element?.querySelector(".scry-btn-status")?.classList.remove("is-open");
              }
            }
          }
          this.switchTab(btn.dataset.tab);
        }
      });
    });
  }

  // --- tab rendering ---

  _renderTab(tabId, data) {
    const contentId = this._isFoundry ? "sfnd-content"
      : this._isBeyond ? "sbnd-content" : "scry-tab-content";
    const contentEl = document.getElementById(contentId);
    if (!contentEl) return;

    const handlers     = this._isFoundry ? FOUNDRY_TAB_HANDLERS
      : this._isBeyond ? BEYOND_TAB_HANDLERS : TAB_HANDLERS;
    const handlerStore = this._isFoundry ? this._foundryHandlers
      : this._isBeyond ? this._beyondHandlers : this._tabHandlers;

    if (!handlerStore[tabId]) {
      handlerStore[tabId] = handlers[tabId]?.();
    }
    const handler = handlerStore[tabId];
    if (!handler) return;

    contentEl.innerHTML = handler.render(data, this.actor);
    handler.activate(contentEl, this.actor);
  }

  // --- hooks ---

  _registerHooks() {
    const addHook = (name, fn) => {
      const id = Hooks.on(name, fn);
      this._hooks.push([name, id]);
    };

    addHook("updateActor", (actor, _changes, _options, _userId) => {
      if (actor.id !== this.actor.id) return;
      this._onActorUpdate();
    });

    addHook("updateItem", (item, _changes, _options, _userId) => {
      if (item.parent?.id !== this.actor.id) return;
      this._onActorUpdate();
    });

    // Status effect changes — toggleStatusEffect fires create/delete, not updateActor
    addHook("createActiveEffect", (effect) => {
      if (effect.parent?.id !== this.actor.id) return;
      this._onActorUpdate();
    });
    addHook("deleteActiveEffect", (effect) => {
      if (effect.parent?.id !== this.actor.id) return;
      this._onActorUpdate();
    });

    addHook("deleteCombat", () => {
      this._turnIndicator?.onDeleteCombat();
    });

    // Combat start — compact horizontal banner at top of phone
    addHook("updateCombat", (combat) => {
      if (!combat.started || combat.round !== 1) return;
      if (this._shownCombatStart === combat.id) return;
      this._shownCombatStart = combat.id;
      this._showScryBanner("COMBAT BEGINS", "", "combat");
    });

    // Critical roll notifications (standard path)
    addHook("createChatMessage", (msg) => {
      try {
        const name   = msg.alias ?? "";
        const result = this._detectCritFromMessage(msg);
        if      (result === "success") this._showScryBanner("CRITICAL SUCCESS", name, "crit");
        else if (result === "fail")    this._showScryBanner("EPIC FAIL",        name, "fail");
      } catch (_) {}
    });

    // Critical roll notifications (midi-qol path — fires on attacker's client)
    addHook("dnd5e.rollAttack", (rolls) => {
      try {
        const roll   = Array.isArray(rolls) ? rolls[0] : rolls;
        const result = this._detectCritFromRoll(roll);
        if      (result === "success") this._showScryBanner("CRITICAL SUCCESS", "", "crit");
        else if (result === "fail")    this._showScryBanner("EPIC FAIL",        "", "fail");
      } catch (_) {}
    });

    // Enter mode crits — TableOS fires this when player types a die value manually
    addHook("tableos.manualRollResult", (dieValue) => {
      if      (dieValue === 20) this._showScryBanner("CRITICAL SUCCESS", "", "crit");
      else if (dieValue === 1)  this._showScryBanner("EPIC FAIL",        "", "fail");
    });

    // Initiative dialog suppression is handled by _startInitiativeObserver()
    // (MutationObserver on document.body — catches TABLE-OS raw DOM injection
    //  which bypasses all Foundry hooks).

    addHook("createCombatant", () => {
      this._turnIndicator?.onUpdateCombat(game.combat);
    });

    // Movement tracking — updateToken fires on ALL clients (preUpdateToken only fires on initiator)
    // Seed _lastKnownPos from the current canvas token position
    const seedToken = canvas?.tokens?.placeables?.find(t =>
      t.document?.actorId === this.actor.id || t.actor?.id === this.actor.id
    ) ?? game.scenes?.viewed?.tokens?.find(t => t.actorId === this.actor.id);
    if (seedToken) {
      const d = seedToken.document ?? seedToken;
      this._lastKnownPos = { x: d.x, y: d.y };
    }

    addHook("updateToken", (tokenDoc, changes) => {
      const isMyToken = tokenDoc.actorId === this.actor.id || tokenDoc.actor?.id === this.actor.id;
      if (!isMyToken) return;
      if (changes.x === undefined && changes.y === undefined) return;

      // changes.x/y are the new values; tokenDoc.x/y are also updated by this point
      const newX = changes.x ?? tokenDoc.x;
      const newY = changes.y ?? tokenDoc.y;

      console.log(`Scry | movement: prev=${JSON.stringify(this._lastKnownPos)} new=(${newX},${newY})`);

      if (this._lastKnownPos) {
        const dist   = Math.hypot(newX - this._lastKnownPos.x, newY - this._lastKnownPos.y);
        const gridPx = canvas?.grid?.size     ?? 100;
        const gridFt = canvas?.grid?.distance ?? 5;
        const feet   = Math.round((dist / gridPx) * gridFt);
        console.log(`Scry | movement: dist=${Math.round(dist)}px → ${feet}ft (gridPx=${gridPx} gridFt=${gridFt})`);
        if (feet > 0) {
          this._movementUsed = (this._movementUsed ?? 0) + feet;
          this._refreshMovement();
        }
      }
      this._lastKnownPos = { x: newX, y: newY };
    });

    // Reset movement + action pips on player's turn start
    addHook("updateCombat", (combat) => {
      const combatant = combat.combatants?.find(c => c.actorId === this.actor.id);
      if (combatant && combat.current?.combatantId === combatant.id) {
        // Reset movement
        this._movementUsed = 0;
        this._refreshMovement();
        // Reset action economy pips
        const handlerStore = this._isFoundry ? this._foundryHandlers
          : this._isBeyond ? this._beyondHandlers : this._tabHandlers;
        const actionsHandler = handlerStore["actions"];
        if (actionsHandler?._ecoUsed) {
          actionsHandler._ecoUsed = { action: 0, bonus: 0, reaction: 0 };
          if (this.activeTab === "actions") {
            const data = readActorData(this.actor);
            const contentId = this._isFoundry ? "sfnd-content"
              : this._isBeyond ? "sbnd-content" : "scry-tab-content";
            const contentEl = document.getElementById(contentId);
            if (data && contentEl) actionsHandler.refresh(contentEl, data);
          }
        }
      }
      this._turnIndicator?.onUpdateCombat(combat);
      this._updateFoundryCombatStrip(combat);
      const current = combat.combatants?.get(combat.current?.combatantId);
      if (current) this._tabletopView?.showTurnAnnouncement?.(current);
    });
  }

  _onActorUpdate() {
    const data = readActorData(this.actor);
    if (!data) return;
    this._refreshHeader(data);

    if (!this._isFoundry && !this._isBeyond) {
      const expandedEl = this._element?.querySelector(".scry-stats-expanded-content");
      if (expandedEl) expandedEl.innerHTML = this._buildSlideDownExpanded(data);
      this._activateSlideDown(this._element);
    }

    const handlerStore = this._isFoundry ? this._foundryHandlers
      : this._isBeyond ? this._beyondHandlers : this._tabHandlers;
    const handler      = handlerStore[this.activeTab];
    const contentId    = this._isFoundry ? "sfnd-content"
      : this._isBeyond ? "sbnd-content" : "scry-tab-content";
    const contentEl    = document.getElementById(contentId);
    if (handler?.refresh && contentEl) {
      handler.refresh(contentEl, data);
    }
  }

  _refreshHeader(data) {
    if (this._isFoundry) {
      FoundryShell.refreshPanel(this._element, data);
      return;
    }
    if (this._isBeyond) {
      BeyondShell.refreshPanel(this._element, data);
      return;
    }

    const hpPct   = Math.round((data.hpCurrent / data.hpMax) * 100);
    const hpClass = hpPct <= 25 ? "critical" : hpPct <= 50 ? "bloodied" : "";

    const fillEl = this._element?.querySelector(".scry-hp-fill");
    if (fillEl) fillEl.style.width = `${hpPct}%`;

    const barEl = this._element?.querySelector(".scry-hp-bar");
    if (barEl) {
      barEl.classList.remove("critical","bloodied");
      if (hpClass) barEl.classList.add(hpClass);
    }

    const textEl = this._element?.querySelector(".scry-hp-text");
    if (textEl) {
      textEl.textContent = `${data.hpCurrent} / ${data.hpMax}${data.hpTemp > 0 ? ` (+${data.hpTemp})` : ""}`;
    }

    const concEl = this._element?.querySelector(".scry-conc-indicator");
    if (concEl) concEl.style.display = data.concentration ? "" : "none";
  }

  // --- Pickers ---

  _openJournalPicker() {
    document.getElementById("scry-journal-picker")?.remove();

    const entries = (game.journal?.contents ?? []).filter(e =>
      e.testUserPermission(game.user, "LIMITED")
    );
    if (!entries.length) { ui.notifications?.info("No accessible journal entries."); return; }

    const STAR_KEY = "scry-starred-journals";
    const starred  = new Set(JSON.parse(localStorage.getItem(STAR_KEY) || "[]"));

    const panel = document.createElement("div");
    panel.id    = "scry-journal-picker";
    this._element.appendChild(panel);

    const renderPicker = () => {
      const sorted = [...entries].sort((a, b) => {
        const diff = (starred.has(b.id) ? 1 : 0) - (starred.has(a.id) ? 1 : 0);
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });

      panel.innerHTML = `
        <div class="scry-jp-header">
          <span class="scry-jp-title">Journal</span>
          <button class="scry-jp-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="scry-jp-list">
          ${sorted.map(e => `
            <div class="scry-jp-row" data-id="${e.id}">
              <button class="scry-jp-star${starred.has(e.id) ? " is-starred" : ""}" data-star-id="${e.id}" title="Pin to top">★</button>
              <span class="scry-jp-name"><i class="fas fa-book-open"></i> ${e.name}</span>
              <i class="fas fa-chevron-right scry-jp-arrow"></i>
            </div>`).join("")}
        </div>`;

      panel.querySelector(".scry-jp-close")?.addEventListener("click", () => panel.remove());

      panel.querySelectorAll(".scry-jp-star[data-star-id]").forEach(btn => {
        btn.addEventListener("click", e => {
          e.stopPropagation();
          const id = btn.dataset.starId;
          starred.has(id) ? starred.delete(id) : starred.add(id);
          localStorage.setItem(STAR_KEY, JSON.stringify([...starred]));
          renderPicker();
        });
      });

      panel.querySelectorAll(".scry-jp-row[data-id]").forEach(row => {
        row.addEventListener("click", e => {
          if (e.target.closest(".scry-jp-star")) return;
          panel.remove();
          const entry = game.journal.get(row.dataset.id);
          if (entry) this._openJournalReader(entry);
        });
      });
    };

    renderPicker();
  }

  _openJournalReader(entry) {
    document.getElementById("scry-journal-reader")?.remove();

    const reader = document.createElement("div");
    reader.id    = "scry-journal-reader";

    // Inherit current theme CSS variables so reader matches the active theme
    const overlay = document.getElementById("scry-overlay");
    if (overlay) {
      const cs = getComputedStyle(overlay);
      ["--scry-bg","--scry-bg-card","--scry-bg-surface","--scry-border",
       "--scry-accent","--scry-text","--scry-text-muted","--scry-btn-bg",
       "--scry-btn-hover","--scry-tab-active"].forEach(v => {
        const val = cs.getPropertyValue(v).trim();
        if (val) reader.style.setProperty(v, val);
      });
    }

    document.body.appendChild(reader);

    const pages     = [...(entry.pages?.contents ?? [])];
    const pageCount = pages.length;
    let   pageIdx   = 0;
    const canEdit   = entry.isOwner;

    const renderPage = (idx) => {
      pageIdx = Math.max(0, Math.min(idx, pageCount - 1));
      const page   = pages[pageIdx];
      const html   = page?.text?.content ?? "";
      const imgSrc = page?.src ?? null;
      const body   = html
        ? `<div class="scry-jr-content">${html}</div>`
        : imgSrc
          ? `<img class="scry-jr-img" src="${imgSrc}" alt=""><div class="scry-jr-content"></div>`
          : `<p class="scry-jr-empty">No content.</p>`;

      const pageNav = pageCount > 1 ? `
        <div class="scry-jr-page-nav">
          <button class="scry-jr-prev" ${pageIdx === 0 ? "disabled" : ""}><i class="fas fa-chevron-left"></i></button>
          <span class="scry-jr-page-label">${page?.name ?? `Page ${pageIdx + 1}`} · ${pageIdx + 1}/${pageCount}</span>
          <button class="scry-jr-next" ${pageIdx >= pageCount - 1 ? "disabled" : ""}><i class="fas fa-chevron-right"></i></button>
        </div>` : "";

      reader.innerHTML = `
        <div class="scry-jr-header">
          <span class="scry-jr-title">${entry.name}</span>
          <div class="scry-jr-header-btns">
            ${canEdit ? `<button class="scry-jr-edit" title="Edit"><i class="fas fa-pen"></i></button>` : ""}
            <button class="scry-jr-close" title="Close"><i class="fas fa-times"></i></button>
          </div>
        </div>
        ${pageNav}
        <div class="scry-jr-body">${body}</div>`;

      reader.querySelector(".scry-jr-close")?.addEventListener("click", () => reader.remove());
      reader.querySelector(".scry-jr-prev")?.addEventListener("click",  () => renderPage(pageIdx - 1));
      reader.querySelector(".scry-jr-next")?.addEventListener("click",  () => renderPage(pageIdx + 1));

      // Edit: hide Scry, inject touch-scroll CSS, open native editor, show return bar
      reader.querySelector(".scry-jr-edit")?.addEventListener("click", () => {
        reader.remove();
        overlay?.classList.add("hidden");

        // Enable touch-pan on Foundry's journal (browser handles the rest natively)
        const editStyle = document.createElement("style");
        editStyle.id = "scry-journal-edit-style";
        editStyle.textContent = `
          .application.journal-entry *, [id^="JournalEntry"] * {
            touch-action: pan-x pan-y !important;
            -webkit-overflow-scrolling: touch !important;
          }
        `;
        document.head.appendChild(editStyle);

        const returnBar = document.createElement("div");
        returnBar.id    = "scry-jr-return-bar";
        returnBar.innerHTML = `
          <button id="scry-jr-return-btn">
            <i class="fas fa-arrow-left"></i> Return to Scry
          </button>`;
        document.body.appendChild(returnBar);

        document.getElementById("scry-jr-return-btn")?.addEventListener("click", () => {
          returnBar.remove();
          document.getElementById("scry-journal-edit-style")?.remove();
          overlay?.classList.remove("hidden");
          this._openJournalReader(entry);
        });

        // Open the specific page being viewed — no sidebar, full-width editor, works on mobile
        const currentPage = entry.pages?.get(pages[pageIdx]?.id);
        if (currentPage) {
          currentPage.sheet?.render(true);
        } else {
          entry.sheet?.render(true);
        }

      });
    };

    renderPage(0);
  }

  _openMacroPicker() {
    const hotbarIds = Object.values(game.user?.hotbar ?? {});
    const hotbar = hotbarIds.map(id => game.macros?.get(id)).filter(Boolean);
    const owned  = (game.macros?.contents ?? []).filter(m =>
      m.isOwner && !hotbar.find(h => h.id === m.id)
    );
    const all = [...hotbar, ...owned];
    if (!all.length) { ui.notifications?.info("No macros available."); return; }

    const rows = all.map(m =>
      `<button class="scry-picker-btn" data-id="${m.id}">&#9889; ${m.name}</button>`
    ).join("");

    new Dialog({
      title: "Macros",
      content: `<div class="scry-picker-list">${rows}</div>`,
      buttons: { close: { label: "Close" } },
      render: html => {
        html.find(".scry-picker-btn").on("click", function() {
          game.macros?.get(this.dataset.id)?.execute();
        });
      }
    }).render(true);
  }

  _openThemePicker() {
    document.getElementById("scry-theme-picker")?.remove();

    const current = ScrySettings.getEffectiveTheme();

    const GROUPS = [
      { label: "Core",              ids: ["cobalt","atlas","slate","nomad","cipher"] },
      { label: "Foundry",           ids: ["classic","modern","frost"] },
      { label: "Foundry-Enhanced",  ids: ["nightfall","twilight","crystal","vellum","amber"] },
      { label: "Anvil",             ids: ["forge","brass","parchment"] },
      { label: "Beyond",            ids: ["beyond-dark","beyond-light","beyond-parchment"] },
    ];

    let rowsHtml = "";
    for (const group of GROUPS) {
      rowsHtml += `<div class="scry-tp-group-header">${group.label}</div>`;
      for (const id of group.ids) {
        const t = THEME_DEFS.find(td => td.id === id);
        if (!t) continue;
        rowsHtml += `
        <div class="scry-tp-row${t.id === current ? " is-current" : ""}" data-theme="${t.id}">
          <div class="scry-tp-swatch" style="background:${t.bg};border:2px solid ${t.accent}">
            <div style="height:3px;background:${t.accent};border-radius:2px;margin-bottom:4px"></div>
            <div style="height:3px;background:rgba(255,255,255,0.25);border-radius:2px;width:65%"></div>
          </div>
          <div class="scry-tp-info">
            <div class="scry-tp-name">${t.name}</div>
            <div class="scry-tp-sub">${t.desc}</div>
          </div>
          ${t.id === current ? '<div class="scry-tp-check">✓</div>' : ""}
        </div>`;
      }
    }

    const panel = document.createElement("div");
    panel.id = "scry-theme-picker";
    panel.innerHTML = `
      <div class="scry-tpk-header">
        <span class="scry-tpk-title">Choose Theme</span>
        <button class="scry-tpk-close">&#10005;</button>
      </div>
      <div class="scry-tpk-list">${rowsHtml}</div>`;

    this._element.appendChild(panel);

    // Color the name text via canvas — 100% immune to CSS cascade
    requestAnimationFrame(() => {
      panel.querySelectorAll(".scry-tp-row[data-theme]").forEach(row => {
        const t = THEME_DEFS.find(x => x.id === row.dataset.theme);
        if (!t) return;
        const nameEl = row.querySelector(".scry-tp-name");
        if (nameEl) nameEl.style.cssText = `color:${t.accent}!important;font-weight:700!important;font-size:.95rem!important`;
        const subEl = row.querySelector(".scry-tp-sub");
        if (subEl) subEl.style.cssText = `color:#444!important;font-size:.75rem!important`;
      });
    });

    panel.querySelector(".scry-tpk-close").addEventListener("click", () => panel.remove());

    panel.querySelectorAll(".scry-tp-row[data-theme]").forEach(row => {
      row.addEventListener("click", async () => {
        const themeId      = row.dataset.theme;
        const currentTheme = ScrySettings.getEffectiveTheme();
        const getFamily    = t => FOUNDRY_THEMES.has(t) ? "foundry" : BEYOND_THEMES.has(t) ? "beyond" : "core";
        const wasFamily    = getFamily(currentTheme);
        const willBeFamily = getFamily(themeId);
        await ScrySettings.setClientTheme(themeId);

        if (wasFamily !== willBeFamily) {
          // Template family changed — destroy overlay and rebuild with new layout
          this.destroy();
          this.render();
          return;
        }

        const overlay = document.getElementById("scry-overlay");
        if (overlay) {
          THEME_DEFS.forEach(t => overlay.classList.remove(`theme-${t.id}`));
          overlay.classList.add(`theme-${themeId}`);
        }
        panel.remove();
      });
    });
  }

  // --- Scry modal system ---

  // --- Actor switching -------------------------------------------------------

  _getOwnedActors() {
    return game.actors
      .filter(a => a.testUserPermission(game.user, "OWNER"))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async switchActor(newActor) {
    if (newActor.id === this.actor.id) return;

    const hasToken = !!(canvas.tokens?.placeables?.find(
      t => t.actor?.id === newActor.id || t.document?.actorId === newActor.id
    ));
    if (!hasToken) {
      ui.notifications?.warn(
        `${newActor.name} has no token on this scene — canvas features unavailable.`
      );
    }

    await game.user.setFlag("table-os-scry", "activeActorId", newActor.id);
    this.actor        = newActor;
    this._movementUsed = 0;
    this.render();
  }

  _openActorPicker() {
    const actors = this._getOwnedActors();
    if (actors.length <= 1) return;

    const cards = actors.map(a => {
      const isActive   = a.id === this.actor.id;
      const hp         = a.system?.attributes?.hp;
      const hpText     = hp ? `${hp.value ?? "?"}/${hp.max ?? "?"} HP` : "";
      const classLabel = a.items?.find(i => i.type === "class")?.name ?? "";
      return `
        <div class="scry-actor-card ${isActive ? "is-active" : ""}" data-actor-id="${a.id}">
          <img class="scry-actor-card-portrait"
               src="${a.img ?? "icons/svg/mystery-man.svg"}" alt="${a.name}">
          <div class="scry-actor-card-info">
            <div class="scry-actor-card-name">${a.name}</div>
            <div class="scry-actor-card-sub">${classLabel}</div>
            <div class="scry-actor-card-hp">${hpText}</div>
          </div>
          ${isActive ? '<span class="scry-actor-card-badge">Active</span>' : ""}
        </div>`;
    }).join("");

    const { closeModal } = this._openScryModal({
      title: "Switch Character",
      bodyHtml: `<div class="scry-actor-card-list">${cards}</div>`,
      buttons: [{ label: "Cancel" }]
    });

    this._element.querySelectorAll(".scry-actor-card:not(.is-active)").forEach(card => {
      card.addEventListener("click", () => {
        const actor = game.actors.get(card.dataset.actorId);
        if (actor) { closeModal(); this.switchActor(actor); }
      });
    });
  }

  _openScryModal({ title = "", bodyHtml = "", buttons = [] } = {}) {
    this._element?.querySelector(".scry-modal-backdrop")?.remove();

    const btnHtml = buttons.map((b, i) =>
      `<button class="scry-modal-btn ${b.className ?? ""}" data-modal-btn="${i}">${b.label}</button>`
    ).join("");

    const backdrop = document.createElement("div");
    backdrop.className = "scry-modal-backdrop";
    backdrop.innerHTML = `
      <div class="scry-modal-panel">
        <div class="scry-modal-header">
          <span class="scry-modal-title">${title}</span>
          <button class="scry-modal-close">&#10005;</button>
        </div>
        <div class="scry-modal-body">${bodyHtml}</div>
        ${buttons.length ? `<div class="scry-modal-btns">${btnHtml}</div>` : ""}
      </div>`;

    this._element.appendChild(backdrop);

    const closeModal = () => backdrop.remove();

    backdrop.querySelector(".scry-modal-close")?.addEventListener("click", closeModal);
    backdrop.addEventListener("click", e => { if (e.target === backdrop) closeModal(); });

    buttons.forEach((b, i) => {
      backdrop.querySelector(`[data-modal-btn="${i}"]`)?.addEventListener("click", () => {
        if (b.callback) b.callback({ backdrop, closeModal });
        else closeModal();
      });
    });

    return { backdrop, closeModal };
  }

  _openInitiativeDialog() {
    this._element?.querySelector(".scry-modal-backdrop")?.remove();
    let expr = "";
    const initMod = this.actor?.system?.attributes?.init?.total ??
                    this.actor?.system?.attributes?.initiative?.total ?? 0;
    const modStr  = (initMod >= 0 ? "+" : "") + initMod;

    const backdrop = document.createElement("div");
    backdrop.className = "scry-modal-backdrop";
    backdrop.innerHTML = `
      <div class="scry-modal-panel scry-init-panel">
        <div class="scry-init-display" id="scry-init-display">–</div>
        <div class="scry-numpad">
          <button class="scry-np-btn scry-np-bonus" data-k="B">Auto Init Bonus ${modStr}</button>
          <button class="scry-np-btn" data-k="7">7</button>
          <button class="scry-np-btn" data-k="8">8</button>
          <button class="scry-np-btn" data-k="9">9</button>
          <button class="scry-np-btn" data-k="4">4</button>
          <button class="scry-np-btn" data-k="5">5</button>
          <button class="scry-np-btn" data-k="6">6</button>
          <button class="scry-np-btn" data-k="1">1</button>
          <button class="scry-np-btn" data-k="2">2</button>
          <button class="scry-np-btn" data-k="3">3</button>
          <button class="scry-np-btn" data-k="-">−</button>
          <button class="scry-np-btn" data-k="0">0</button>
          <button class="scry-np-btn" data-k="+">+</button>
          <button class="scry-np-btn scry-np-enter" data-k="E">Press to Enter Initiative</button>
        </div>
      </div>`;

    this._element.appendChild(backdrop);

    const disp = backdrop.querySelector("#scry-init-display");
    const updateDisp = () => {
      if (!disp) return;
      if (!expr) { disp.textContent = "–"; return; }
      const result = this._evalExpr(expr);
      const pretty = expr.replace(/-/g, " − ").replace(/\+/g, " + ");
      disp.textContent = result !== null ? `${pretty} = ${result}` : pretty;
    };

    backdrop.querySelectorAll(".scry-np-btn[data-k]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const k = btn.dataset.k;
        if (k === "E") {
          const result = this._evalExpr(expr) ?? parseInt(expr);
          if (!isNaN(result) && result !== null) {
            this._applyInitiative(Math.round(result));
            backdrop.remove();
          }
        } else if (k === "B") {
          expr += modStr;
        } else {
          if (expr.length < 10) expr += k;
        }
        updateDisp();
      });
    });

    backdrop.addEventListener("click", e => { if (e.target === backdrop) backdrop.remove(); });
  }

  _evalExpr(str) {
    if (!str) return null;
    const safe = str.replace(/[^0-9+\-]/g, "");
    if (!safe) return null;
    try { return Function('"use strict";return(' + safe + ')')(); }
    catch(_) { return null; }
  }

  async _applyInitiative(value) {
    const actor = this.actor;
    try {
      await actor.rollInitiative({ createCombatants: true });
      const combatant = game.combat?.combatants?.find(c => c.actorId === actor.id);
      if (combatant) await combatant.update({ initiative: value });
    } catch(e) {
      console.warn("Scry | initiative apply:", e);
    }
  }

  // Restructure TABLE-OS's raw-DOM initiative dialog to match Scry's numpad layout.
  // Called by MutationObserver when the dialog is for the active character.
  _restructureInitDialog(el) {
    // Anchor to top — avoids bottom cutoff that happens when vertically centered
    el.style.setProperty("position",   "fixed",            "important");
    el.style.setProperty("top",        "8px",              "important");
    el.style.setProperty("left",       "50%",              "important");
    el.style.setProperty("transform",  "translateX(-50%)", "important");
    el.style.setProperty("z-index",    "99999",            "important");
    el.style.setProperty("width",      "min(360px,92vw)",  "important");
    el.style.setProperty("max-width",  "92vw",             "important");
    el.style.setProperty("max-height", "calc(100vh - 16px)","important");
    el.style.setProperty("overflow-y", "auto",             "important");

    const allBtns = [...el.querySelectorAll("button")];
    const orig    = (txt) => allBtns.find(b => b.textContent.trim() === txt);

    // Store before hiding — hidden elements still fire .click()
    const submitBtn = orig("Initiative");
    const bonusBtn  = orig("Auto Init Bonus");

    // Hide ALL original buttons
    allBtns.forEach(b => b.style.setProperty("display","none","important"));

    // Restore top-right Close only (first Close in DOM = header)
    const allClose = allBtns.filter(b => b.textContent.trim() === "Close");
    if (allClose[0]) allClose[0].style.removeProperty("display");

    // Use TreeWalker on raw text nodes — reliable regardless of element depth
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let tnode;
    while ((tnode = walker.nextNode())) {
      if (["VALUE","MODIFIERS","KEYPAD"].includes(tnode.textContent.trim()))
        tnode.parentElement?.style.setProperty("display","none","important");
    }

    // Hide inputs and value display
    [...el.querySelectorAll("input")].forEach(n =>
      n.style.setProperty("display","none","important"));

    // Inject phone keypad
    const BS = "background:#1e1e2a;color:#fff;border:1px solid #3a3a4a;border-radius:8px;" +
               "font-size:1.15rem;font-weight:700;padding:.6rem .3rem;cursor:pointer;touch-action:manipulation;";

    const pad = document.createElement("div");
    pad.style.cssText = "padding:.2rem 1rem .8rem;";
    pad.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.3rem;">
        <button style="${BS};grid-column:1/-1;background:#15803d;border-color:#16a34a;font-size:.82rem;padding:.6rem;"
                data-v="B">Auto Init Bonus</button>
        <button style="${BS}" data-v="7">7</button>
        <button style="${BS}" data-v="8">8</button>
        <button style="${BS}" data-v="9">9</button>
        <button style="${BS}" data-v="4">4</button>
        <button style="${BS}" data-v="5">5</button>
        <button style="${BS}" data-v="6">6</button>
        <button style="${BS}" data-v="1">1</button>
        <button style="${BS}" data-v="2">2</button>
        <button style="${BS}" data-v="3">3</button>
        <button style="${BS}" data-v="-">−</button>
        <button style="${BS}" data-v="0">0</button>
        <button style="${BS}" data-v="+">+</button>
        <button style="${BS};grid-column:1/-1;background:#1d4ed8;border-color:#2563eb;font-size:.82rem;padding:.65rem;"
                data-v="submit">Press to Enter Initiative</button>
      </div>`;

    pad.querySelectorAll("[data-v]").forEach(b => {
      b.addEventListener("click", e => {
        e.stopPropagation();
        const v = b.dataset.v;
        if      (v === "submit") submitBtn?.click();
        else if (v === "B")      bonusBtn?.click();
        else                     orig(v)?.click();
      });
    });

    el.appendChild(pad);
  }

  _hpDialog(action) {
    const labels = { damage: "Apply Damage", heal: "Apply Healing", temp: "Set Temp HP" };
    const { backdrop } = this._openScryModal({
      title: labels[action] ?? "HP",
      bodyHtml: `<input type="number" class="scry-modal-num-input" id="scry-modal-hp-input" placeholder="0" min="0">`,
      buttons: [
        {
          label: "Apply",
          className: "scry-modal-btn-primary",
          callback: ({ backdrop, closeModal }) => {
            const val = parseInt(backdrop.querySelector("#scry-modal-hp-input")?.value ?? "");
            if (isNaN(val) || val < 0) return;
            if (action === "damage") this.actor.applyDamage([{ value: val, type: "untyped" }]);
            else if (action === "heal") this.actor.applyDamage([{ value: val, type: "healing" }]);
            else if (action === "temp") this.actor.update({ "system.attributes.hp.temp": val });
            closeModal();
          }
        },
        { label: "Cancel" }
      ]
    });
    setTimeout(() => backdrop.querySelector("#scry-modal-hp-input")?.focus(), 50);
  }

  _openRestModal() {
    const data = readActorData(this.actor);
    if (!data) return;

    const hdRows = (data.hitDice ?? []).map(hd => `
      <div class="scry-modal-hd-row">
        <span class="scry-modal-hd-die">${hd.dieSize}</span>
        <span class="scry-modal-hd-count">${hd.remaining} / ${hd.total}</span>
        <button class="scry-modal-hd-roll" data-class="${hd.className}"
                ${hd.remaining <= 0 ? "disabled" : ""}>Roll</button>
      </div>`).join("");

    const { backdrop, closeModal } = this._openScryModal({
      title: "Rest",
      bodyHtml: `
        ${hdRows ? `
        <div class="scry-modal-section">
          <div class="scry-modal-section-title">Hit Dice</div>
          ${hdRows}
        </div>
        <div class="scry-modal-divider"></div>` : ""}
        <div class="scry-modal-rest-row">
          <button class="scry-modal-btn scry-modal-short-rest">Short Rest</button>
          <button class="scry-modal-btn scry-modal-long-rest">Long Rest</button>
        </div>`
    });

    backdrop.querySelectorAll(".scry-modal-hd-roll[data-class]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const cls = this.actor.items.find(i => i.type === "class" && i.name === btn.dataset.class);
        if (!cls) return;
        try {
          await this.actor.rollHitDie(cls.system.hitDice);
          btn.disabled = true;
          const fresh = readActorData(this.actor);
          const hd = fresh?.hitDice?.find(h => h.className === btn.dataset.class);
          const countEl = btn.closest(".scry-modal-hd-row")?.querySelector(".scry-modal-hd-count");
          if (hd && countEl) countEl.textContent = `${hd.remaining} / ${hd.total}`;
        } catch(e) { console.warn("Scry | roll HD:", e); }
      });
    });

    backdrop.querySelector(".scry-modal-short-rest")?.addEventListener("click", () => {
      closeModal();
      this.enterTableView();
      this.actor.shortRest();
    });

    backdrop.querySelector(".scry-modal-long-rest")?.addEventListener("click", () => {
      closeModal();
      this.enterTableView();
      this.actor.longRest();
    });
  }

  // --- Slide-down expanded content ---

  _buildSlideDownExpanded(data) {
    const speed    = data.speed ?? 30;
    const movePips = this._buildMovementPips(speed, this._movementUsed ?? 0);

    const condLabels = {
      blinded:"Blinded",charmed:"Charmed",deafened:"Deafened",frightened:"Frightened",
      grappled:"Grappled",incapacitated:"Incapacitated",invisible:"Invisible",
      paralyzed:"Paralyzed",petrified:"Petrified",poisoned:"Poisoned",
      prone:"Prone",restrained:"Restrained",stunned:"Stunned",unconscious:"Unconscious",
    };
    const activeConds = (data.conditions ?? []).filter(c => c !== "concentrating");
    const condHtml = activeConds.length
      ? activeConds.map(c => `<span class="scry-condition-tag">${condLabels[c] ?? c}</span>`).join("")
      : "";

    const hdRows = (data.hitDice ?? []).map(hd => `
      <div class="scry-hd-row">
        <span class="scry-hd-label">${hd.dieSize}</span>
        <span class="scry-hd-count">${hd.remaining} / ${hd.total}</span>
        <button class="scry-hd-spend scry-btn-sm" data-class="${hd.className}"
                ${hd.remaining <= 0 ? "disabled" : ""}>Roll</button>
      </div>`).join("");

    return `
      <div class="scry-slide-movement scry-slide-box">${movePips}</div>
      ${activeConds.length ? `
      <div class="scry-slide-conditions scry-slide-box">
        <div class="scry-slide-box-title">Conditions</div>
        <div class="scry-condition-tags">${condHtml}</div>
      </div>` : ""}
      ${hdRows ? `
      <div class="scry-slide-recovery scry-slide-box">
        <div class="scry-slide-box-title">Recovery Dice</div>
        ${hdRows}
      </div>` : ""}
      <div class="scry-slide-rests scry-slide-box">
        <button class="scry-btn scry-rest-short">Short Rest</button>
        <button class="scry-btn scry-rest-long">Long Rest</button>
      </div>`;
  }

  _buildMovementPips(speed, used) {
    const totalSq = Math.round(speed / (canvas.grid?.distance ?? 5));
    const usedSq  = Math.min(Math.round(used  / (canvas.grid?.distance ?? 5)), totalSq);
    const remFt   = Math.max(speed - used, 0);
    const remSq   = totalSq - usedSq;

    let pips = "";
    for (let i = 0; i < totalSq; i++) {
      let cls = "scry-move-sq";
      if (i < usedSq) {
        cls += " is-used";
      } else {
        if (remSq <= Math.round(totalSq * 0.25)) cls += " is-danger";
        else if (remSq <= Math.round(totalSq * 0.50)) cls += " is-warn";
      }
      pips += `<span class="${cls}"></span>`;
    }
    return `
      <span class="scry-move-label">Move</span>
      <div class="scry-move-pips">${pips}</div>
      <span class="scry-move-ft">${remFt}ft</span>`;
  }

  _activateSlideDown(el) {
    el.querySelector(".scry-rest-short")?.addEventListener("click", () => this._openRestModal());
    el.querySelector(".scry-rest-long")?.addEventListener("click", () => this._openRestModal());

    el.querySelectorAll(".scry-hd-spend[data-class]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const cls = this.actor.items.find(i => i.type === "class" && i.name === btn.dataset.class);
        if (cls) try { await this.actor.rollHitDie(cls.system.hitDice); } catch(_) {}
      });
    });
  }

  _refreshMovement() {
    const data  = readActorData(this.actor);
    const speed = data?.speed ?? 30;
    const used  = this._movementUsed ?? 0;

    // Update every movement track in the overlay
    this._element?.querySelectorAll(".scry-slide-movement").forEach(el => {
      el.innerHTML = this._buildMovementPips(speed, used);
    });

    // Notify tabletop-view info strip if active
    this._tabletopView?._updateInfoStrip?.();
  }

  // --- Compact top banner (combat start, crit notifications) ---

  _showScryBanner(title, sub, type) {
    document.getElementById("scry-top-banner")?.remove();
    const el = document.createElement("div");
    el.id        = "scry-top-banner";
    el.className = `scry-top-banner scry-top-banner--${type}`;
    el.innerHTML = `<span class="scry-tb-title">${title}</span>${sub ? `<span class="scry-tb-sub">${sub}</span>` : ""}`;
    document.body.appendChild(el);
    el.addEventListener("click", () => el.remove());
    setTimeout(() => el?.isConnected && el.remove(), 3500);
  }

  _detectCritFromMessage(msg) {
    for (const roll of (msg.rolls ?? [])) {
      const result = this._detectCritFromRoll(roll);
      if (result) return result;
    }
    return null;
  }

  _detectCritFromRoll(roll) {
    if (!roll) return null;
    // dnd5e 5.x D20Roll exposes isCritical / isFumble directly
    if (roll.isCritical === true) return "success";
    if (roll.isFumble   === true) return "fail";
    // Fallback: scan terms (matches TableOS approach)
    for (const term of (roll.terms ?? [])) {
      if (term.faces !== 20 || !Array.isArray(term.results)) continue;
      for (const result of term.results) {
        if (!result.active) continue;
        if (result.result === 20) return "success";
        if (result.result === 1)  return "fail";
      }
    }
    return null;
  }

  // --- Table Tools panel ---

  _openTableTools() {
    const existing = document.getElementById("scry-table-tools");
    if (existing) { existing.remove(); return; }

    const panel = document.createElement("div");
    panel.id = "scry-table-tools";
    panel.className = "scry-table-tools";
    const combatHtml = game.combat ? `
      <div class="scry-tt-divider"></div>
      <div class="scry-tt-group">
        <button class="scry-tt-btn" data-tool="prevturn">&#8592; Prev</button>
        <button class="scry-tt-btn" data-tool="hold">Hold</button>
        <button class="scry-tt-btn scry-tt-btn-danger" data-tool="endturn">End Turn</button>
      </div>` : "";

    panel.innerHTML = `
      <div class="scry-tt-header">
        <span class="scry-tt-title">Table</span>
        <button class="scry-tt-close">&#10005;</button>
      </div>
      <div class="scry-tt-group">
        <button class="scry-tt-btn" data-tool="journal">&#128214; Journal</button>
        <button class="scry-tt-btn" data-tool="items">&#128188; Items</button>
        <button class="scry-tt-btn" data-tool="macros">&#128190; Macros</button>
        <button class="scry-tt-btn" data-tool="theme">&#127912; Theme</button>
        <button class="scry-tt-btn" data-tool="settings">&#9881; Settings</button>
      </div>
      ${combatHtml}`;

    document.body.appendChild(panel);

    panel.querySelector(".scry-tt-close").addEventListener("click", () => panel.remove());
    panel.querySelectorAll(".scry-tt-btn[data-tool]").forEach(btn => {
      btn.addEventListener("click", () => {
        panel.remove();
        this._handleTableTool(btn.dataset.tool);
      });
    });
  }

  _handleTableTool(tool) {
    switch (tool) {
      case "journal":
        this._openJournalPicker();
        break;
      case "items":
        this.switchTab("gear");
        break;
      case "macros":
        this._openMacroPicker();
        break;
      case "theme":
        this._openThemePicker();
        break;
      case "settings": {
        const overlay = document.getElementById("scry-overlay");
        overlay?.classList.add("hidden");

        // Open Game Settings — correct v13 namespace.
        // _updatePosition reads el.offsetWidth only when width is not supplied,
        // but el is null at that point in the async pipeline → pass explicit dims to bypass.
        const _scW = Math.min(800, window.innerWidth  - 40);
        const _scH = Math.min(700, window.innerHeight - 60);
        const settingsApp = new foundry.applications.settings.SettingsConfig();
        settingsApp.render({
          force:    true,
          position: {
            width:  _scW,
            height: _scH,
            top:    Math.round((window.innerHeight - _scH) / 2),
            left:   Math.round((window.innerWidth  - _scW) / 2)
          }
        });

        // Belt-and-suspenders: after render, ensure dialog is on top and touch-scrollable
        setTimeout(() => {
          const dlg = settingsApp.element
                   ?? document.querySelector(".settings-config")
                   ?? document.querySelector("#settings-config");
          if (!dlg) return;
          dlg.style.setProperty("z-index",        "99999", "important");
          dlg.style.setProperty("pointer-events", "all",   "important");
          dlg.querySelectorAll("*").forEach(c => {
            c.style.setProperty("touch-action",               "pan-x pan-y", "important");
            c.style.setProperty("-webkit-overflow-scrolling", "touch",       "important");
          });
        }, 500);

        const returnBar = document.createElement("div");
        returnBar.id = "scry-settings-return-bar";
        returnBar.innerHTML = `
          <button id="scry-settings-return-btn">
            <i class="fas fa-arrow-left"></i> Return to Scry
          </button>`;
        document.body.appendChild(returnBar);

        document.getElementById("scry-settings-return-btn")?.addEventListener("click", () => {
          returnBar.remove();
          try {
            Object.values(ui.windows ?? {}).forEach(w => {
              if (w.constructor?.name?.toLowerCase().includes("settings")) w.close?.();
            });
          } catch(_) {}
          overlay?.classList.remove("hidden");
        });
        break;
      }
      case "prevturn":
        game.combat?.previousTurn();
        break;
      case "hold":
        try { globalThis.TABLE_OS?.holdAction?.(); } catch(_) {}
        break;
      case "endturn":
        if (game.combat?.combatant?.actor?.isOwner) game.combat.nextTurn();
        break;
    }
  }

  // --- Initiative observer (MutationObserver) ---
  // Watches document.body for ANY element TABLE-OS injects.
  // Hooks can't catch raw DOM injection — MutationObserver can.

  _startInitiativeObserver() {
    if (this._initObserver) return;

    const processNode = (el) => {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
      const text = el.textContent ?? "";
      const lc   = text.toLowerCase();

      // Detection: must contain "initiative" + at least one of the button texts
      // present in EITHER TABLE-OS dialog (Enter/Roll/Skip OR keypad numbers).
      if (!lc.includes("initiative")) return;
      if (!lc.includes("roll") && !lc.includes("enter") && !lc.includes("skip")) return;

      const myName = this.actor?.name ?? "";
      if (!myName) return;

      if (!text.includes(myName)) {
        // Other player's dialog — remove immediately
        el.remove();
        return;
      }

      // It's for our character.
      // If it's the keypad dialog (has "keypad" in text) → restructure it.
      // If it's the first chooser (Enter/Roll/Skip only) → just center it.
      if (lc.includes("keypad")) {
        this._restructureInitDialog(el);
      } else {
        el.style.setProperty("position",  "fixed",                "important");
        el.style.setProperty("top",       "50%",                  "important");
        el.style.setProperty("left",      "50%",                  "important");
        el.style.setProperty("transform", "translate(-50%,-50%)", "important");
        el.style.setProperty("z-index",   "99999",                "important");
        el.style.setProperty("max-width", "92vw",                 "important");
      }
    };

    this._initObserver = new MutationObserver(mutations => {
      for (const mut of mutations) {
        for (const node of mut.addedNodes) processNode(node);
      }
    });

    // Watch body direct children (TABLE-OS appends there).
    // Also watch Foundry's #interface container as fallback.
    this._initObserver.observe(document.body, { childList: true, subtree: false });
    const ui = document.getElementById("interface");
    if (ui) this._initObserver.observe(ui, { childList: true, subtree: true });
  }

  _stopInitiativeObserver() {
    this._initObserver?.disconnect();
    this._initObserver = null;
  }

  // --- Turn timer sync ---

  _startTimerSync() {
    this._timerInterval = setInterval(() => this._syncTimer(), 500);
  }

  _stopTimerSync() {
    if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }
  }

  _syncTimer() {
    const timerEl  = document.querySelector(".tableos-turn-timer");
    const timeEl   = timerEl?.querySelector(".tableos-turn-timer__time");
    const isActive = timerEl && timerEl.style.display !== "none" && timeEl;
    const text     = isActive ? (timeEl.textContent ?? "") : "";
    const innerEl  = timerEl?.querySelector(".tableos-turn-timer__inner");
    const color    = innerEl?.style?.color || "#22c55e";

    // Core header badge
    const badge = this._element?.querySelector(".scry-turn-timer-badge");
    if (badge) {
      if (!isActive) { badge.classList.add("hidden"); }
      else { badge.textContent = text; badge.classList.remove("hidden"); badge.style.setProperty("--scry-timer-color", color); }
    }

    // Foundry portrait panel timer
    const panelTimer = document.getElementById("sfnd-panel-timer");
    if (panelTimer) {
      if (!isActive) { panelTimer.classList.add("hidden"); }
      else { panelTimer.textContent = text; panelTimer.classList.remove("hidden"); panelTimer.style.setProperty("--scry-timer-color", color); }
    }
  }

  _updateFoundryCombatStrip(combat) {
    if (!this._isFoundry) return;
    const strip = document.getElementById("sfnd-combat-strip");
    if (!strip) return;

    const current = combat?.combatants?.get(combat.current?.combatantId);
    if (!current) { strip.classList.add("hidden"); return; }

    const actor  = current.actor;
    const imgSrc = actor?.img ?? current.img ?? "icons/svg/mystery-man.svg";
    const isPC   = !!actor?.hasPlayerOwner;

    strip.querySelector(".sfnd-combat-portrait").src = imgSrc;
    strip.querySelector(".sfnd-combat-name").textContent = current.name ?? actor?.name ?? "";

    // HP bar only for player-owned characters, hidden for NPCs/monsters
    const hpWrap = strip.querySelector(".sfnd-combat-hp-wrap");
    if (hpWrap) {
      if (!isPC) {
        hpWrap.style.display = "none";
      } else {
        hpWrap.style.display = "";
        const hp  = actor?.system?.attributes?.hp;
        const pct = hp?.max > 0 ? Math.max(0, Math.min(100, Math.round((hp.value / hp.max) * 100))) : 100;
        const col = pct > 50 ? "#4caf50" : pct > 25 ? "#ff9800" : "#f44336";
        const fill = hpWrap.querySelector(".sfnd-combat-hp-fill");
        if (fill) { fill.style.width = `${pct}%`; fill.style.background = col; }
      }
    }

    const isOurTurn = current.actorId === this.actor?.id;
    strip.classList.toggle("sfnd-our-turn", isOurTurn);
    strip.classList.remove("hidden");
  }
}
