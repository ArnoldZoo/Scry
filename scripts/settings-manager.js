/*
Module: TableOS Scry — Mobile Player Companion
Component: settings-manager.js
Purpose: Setting registration, user-type detection, device type resolution.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

const MODULE_ID = "table-os-scry";

export class ScrySettings {

  static registerMenu(ScrySettingsApp) {
    game.settings.registerMenu(MODULE_ID, "deviceSettings", {
      name: "Device Assignments",
      label: "Assign Player Devices",
      hint: "Set which players get the Scry overlay and whether they use Phone or Tablet layout.",
      icon: "fas fa-mobile-alt",
      type: ScrySettingsApp,
      restricted: true
    });
  }

  static register() {
    // GM-assigned device types per user — stored as {userId: "phone"|"tablet"|"none"|"auto"}
    game.settings.register(MODULE_ID, "userDevices", {
      name: "Scry User Devices",
      scope: "world",
      config: false,
      type: Object,
      default: {}
    });

    game.settings.register(MODULE_ID, "defaultTheme", {
      name: "Default Theme",
      hint: "Sheet style shown on personal devices when the player has not set their own preference.",
      scope: "world",
      config: true,
      type: String,
      choices: {
        "cobalt":     "Cobalt — dark navy / cyan",
        "atlas":      "Atlas — light / navy",
        "slate":      "Slate — charcoal grey / steel",
        "nomad":      "Nomad — desert warm / amber",
        "cipher":     "Cipher — near-black / violet",
        "classic":    "Classic — dark charcoal / tan  [Foundry]",
        "modern":     "Modern — near-black / gold  [Foundry]",
        "enhanced":   "Enhanced — dark navy / blue-white  [Foundry]",
        "forge":           "Forge — dark iron / gold  [Anvil]",
        "brass":           "Brass — warm ivory / gold  [Anvil]",
        "parchment":       "Parchment — aged paper / brown-gold  [Anvil]",
        "beyond-dark":     "Beyond Dark — near-black / blue  [Beyond]",
        "beyond-light":    "Beyond Light — off-white / blue  [Beyond]",
        "beyond-parchment":"Beyond Parchment — warm cream / brown  [Beyond]",
      },
      default: "cobalt"
    });

    // Per-client theme — each player picks their own on their device
    game.settings.register(MODULE_ID, "clientTheme", {
      name: "My Theme (Scry)",
      hint: "Your personal Scry theme. Overrides the GM default on your device.",
      scope: "client",
      config: true,
      type: String,
      choices: {
        "":                "Use GM Default",
        "cobalt":          "Cobalt — dark navy / cyan",
        "atlas":           "Atlas — light / navy",
        "slate":           "Slate — charcoal grey / steel",
        "nomad":           "Nomad — desert warm / amber",
        "cipher":          "Cipher — near-black / violet",
        "classic":         "Classic — dark charcoal / tan  [Foundry]",
        "modern":          "Modern — near-black / gold  [Foundry]",
        "enhanced":        "Enhanced — dark navy / blue-white  [Foundry]",
        "forge":           "Forge — dark iron / gold  [Anvil]",
        "brass":           "Brass — warm ivory / gold  [Anvil]",
        "parchment":       "Parchment — aged paper / brown-gold  [Anvil]",
        "beyond-dark":     "Beyond Dark — near-black / blue  [Beyond]",
        "beyond-light":    "Beyond Light — off-white / blue  [Beyond]",
        "beyond-parchment":"Beyond Parchment — warm cream / brown  [Beyond]",
      },
      default: ""
    });

    game.settings.register(MODULE_ID, "tabletWidthThreshold", {
      name: "Tablet Width Threshold (px)",
      hint: "Screens at or above this width are treated as tablets in Auto-detect mode.",
      scope: "world",
      config: true,
      type: Number,
      default: 768
    });
  }

  // --- user device assignment ---

  static getUserDevices() {
    try {
      return game.settings.get(MODULE_ID, "userDevices") || {};
    } catch {
      return {};
    }
  }

  static async setUserDevice(userId, deviceType) {
    const devices = ScrySettings.getUserDevices();
    devices[userId] = deviceType;
    return game.settings.set(MODULE_ID, "userDevices", devices);
  }

  // Returns "phone" | "tablet" | null
  static getDeviceType(user = game.user) {
    if (!user || user.isGM) return null;

    // Explicit GM-assigned device type takes priority over everything
    const devices = ScrySettings.getUserDevices();
    const assigned = devices[user.id];
    if (assigned === "phone")  return "phone";
    if (assigned === "tablet") return "tablet";
    if (assigned === "none" || !assigned) return null;

    // assigned === "auto" — check TableOS; IR-table users skip Scry by default
    if (game.modules.get("table-os")?.active) {
      try {
        const rawProfiles = game.settings.get("table-os", "userProfiles");
        const profiles = typeof rawProfiles === "string" ? JSON.parse(rawProfiles) : rawProfiles;
        const entry = profiles?.[user.id];
        if (entry?.type === "ir-table") return null;
      } catch { /* TableOS not configured yet */ }
    }

    // Auto-detect by screen width
    const threshold = game.settings.get(MODULE_ID, "tabletWidthThreshold") || 768;
    return window.screen.width >= threshold ? "tablet" : "phone";
  }

  static isScryUser(user = game.user) {
    return ScrySettings.getDeviceType(user) !== null;
  }

  // --- theme ---

  static getEffectiveTheme() {
    let theme;
    try {
      const client = game.settings.get(MODULE_ID, "clientTheme");
      if (client) theme = client;
    } catch { /* not yet registered */ }
    if (!theme) {
      try {
        theme = game.settings.get(MODULE_ID, "defaultTheme") || "cobalt";
      } catch {
        theme = "cobalt";
      }
    }
    return theme;
  }

  static async setClientTheme(theme) {
    return game.settings.set(MODULE_ID, "clientTheme", theme);
  }
}
