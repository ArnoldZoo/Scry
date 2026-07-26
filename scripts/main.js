/*
Module: TableOS Scry — Mobile Player Companion
Component: main.js
Purpose: Entry point. Detects personal device users and boots the Scry overlay.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

import { ScrySettings }    from "./settings-manager.js";
import { ScryView }        from "./scry-view.js";
import { ScrySettingsApp } from "./scry-settings-app.js";

const MODULE_ID = "table-os-scry";

let scryView = null;

// --- settings registration ---

Hooks.once("init", () => {
  try {
    ScrySettings.registerMenu(ScrySettingsApp);
  } catch(e) {
    console.error("TableOS Scry | registerMenu failed:", e);
  }
  ScrySettings.register();
  _startNotificationSuppressor();
  console.log("TableOS Scry | Initialized");
});

// --- boot on ready ---

Hooks.once("ready", async () => {
  const user = game.user;

  // If GM accidentally has noCanvas stuck on (Scry bug from a previous session), fix and reload
  if (user.isGM) {
    try {
      if (game.settings.get("core", "noCanvas")) {
        await game.settings.set("core", "noCanvas", false);
        console.warn("TableOS Scry | noCanvas was on for GM — reset. Reloading.");
        location.reload();
      }
    } catch { /* setting inaccessible — ignore */ }
    return;
  }

  // If noCanvas is stuck on for this player session, reload to clear it
  try {
    if (game.settings.get("core", "noCanvas")) {
      await game.settings.set("core", "noCanvas", false);
      console.warn("TableOS Scry | noCanvas was on for player — reset. Reloading.");
      location.reload();
      return;
    }
  } catch { /* setting inaccessible */ }

  const deviceType = ScrySettings.getDeviceType(user);

  if (!deviceType) {
    console.log("TableOS Scry | Not a Scry device. Skipping overlay.");
    return;
  }

  console.log(`TableOS Scry | Device type: ${deviceType} — booting for ${user.name}`);

  const actor = _resolveActor(user);
  if (!actor) {
    console.warn("TableOS Scry | No character found for this user. Waiting for assignment.");
    _waitForActor(user, deviceType);
    return;
  }

  await _bootScry(actor, deviceType);
});

// --- helpers ---

function _resolveActor(user) {
  // Prefer the actor the player last switched to in Scry
  const savedId = user.getFlag?.("table-os-scry", "activeActorId");
  if (savedId) {
    const saved = game.actors.get(savedId);
    if (saved?.testUserPermission(user, "OWNER")) return saved;
  }

  // Fall back to the user's assigned character, then any owned character
  if (user.character) return user.character;
  const owned = game.actors.filter(a => a.isOwner);
  return owned[0] ?? null;
}

function _waitForActor(user, deviceType) {
  // Retry once when the actor list changes (character assignment)
  const id = Hooks.on("updateUser", (updUser) => {
    if (updUser.id !== user.id) return;
    const actor = _resolveActor(updUser);
    if (!actor) return;
    Hooks.off("updateUser", id);
    _bootScry(actor, deviceType);
  });
}

function _injectAlwaysOnCss() {
  if (document.getElementById("scry-ui-fixes")) return;
  const s = document.createElement("style");
  s.id = "scry-ui-fixes";
  // Dialogs must float above the Scry overlay (z-index 9000)
  s.textContent = ".app.dialog,.app.window-app{ z-index:10000 !important }";
  document.head.appendChild(s);
}

function _hideFoundryCanvas() {
  if (document.getElementById("scry-no-canvas")) return;
  const s = document.createElement("style");
  s.id = "scry-no-canvas";
  s.textContent =
    // Never hide #board — WebGL can't recover from display:none or visibility:hidden.
    // The Scry overlay (z-index 9000) sits on top. Block canvas pointer events so taps hit the overlay.
    "#board{ pointer-events:none !important }" +
    "#interface,#players,#hotbar,#navigation,#controls,#sidebar,#pause{ display:none !important }";
  document.head.appendChild(s);
}

// Matches both the English text ("1024px by 768px") and Foundry's localization key
const _SIZE_WARN = /1024.*768|768.*1024|window.*dimension|too.?small/i;

function _startNotificationSuppressor() {
  // MutationObserver: remove matching notifications as soon as they appear in the DOM.
  // This must start at init because the warning fires before the ready hook.
  if (window._scryNotifObserver) return;
  const removeMatching = (nodes) => {
    nodes.forEach(node => {
      if (node.nodeType === 1
          && node.classList?.contains("notification")
          && _SIZE_WARN.test(node.textContent)) node.remove();
    });
  };
  const obs = new MutationObserver(m => m.forEach(r => removeMatching(r.addedNodes)));
  window._scryNotifObserver = obs;

  // Watch body with subtree so we catch the notification regardless of container ID/structure
  const attach = () => {
    if (document.body) {
      obs.observe(document.body, { childList: true, subtree: true });
    } else {
      setTimeout(attach, 50);
    }
  };
  attach();
}

function _suppressSizeWarning() {
  // Also patch the notification functions once ui.notifications exists (belt + suspenders)
  if (ui.notifications._scrySuppressed) return;
  ["warn","error"].forEach(fn => {
    const orig = ui.notifications[fn].bind(ui.notifications);
    ui.notifications[fn] = (msg, ...a) => {
      if (typeof msg === "string" && _SIZE_WARN.test(msg)) return;
      return orig(msg, ...a);
    };
  });
  ui.notifications._scrySuppressed = true;
}

function _removeTableOSOverlay() {
  document.getElementById("tableos-overlay")?.remove();
  document.getElementById("tableos-battle-dock")?.remove();
  document.getElementById("tableos-left-hud")?.remove();
  document.getElementById("tableos-status-orbits")?.remove();
  document.getElementById("tableos-control-dock")?.remove();
  document.body.classList.remove("tableos-active");
}

async function _bootScry(actor, deviceType) {
  _removeTableOSOverlay();
  _injectAlwaysOnCss();
  _suppressSizeWarning();

  scryView = new ScryView(actor, deviceType);
  scryView.render();

  // Hide Foundry UI only after overlay is confirmed in DOM
  if (document.getElementById("scry-overlay")) {
    _hideFoundryCanvas();
  } else {
    console.error("TableOS Scry | Overlay failed to render — Foundry UI left visible.");
  }

  game.scry = { view: scryView, version: "0.1.00" };
}
