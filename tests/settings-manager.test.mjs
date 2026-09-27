import { menus, setSettings, resetSettings, makeUser, collection } from "./setup.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ScrySettings } from "../scripts/settings-manager.js";

const P1 = makeUser({ id: "p1" });
const GM = makeUser({ id: "gm", isGM: true });

beforeEach(() => {
  resetSettings();
  game.modules = collection([]);
  window.screen.width = 390;
});

test("registerMenu puts Device Assignments behind the GM", () => {
  class App {}
  ScrySettings.registerMenu(App);
  const m = menus.get("deviceSettings");
  assert.equal(m.type, App);
  assert.equal(m.restricted, true);
});

test("the GM never gets Scry", () => {
  setSettings({ "table-os-scry.userDevices": { gm: "phone" } });
  assert.equal(ScrySettings.getDeviceType(GM), null);
  assert.equal(ScrySettings.getDeviceType(null), null);
});

test("an explicit assignment wins", () => {
  setSettings({ "table-os-scry.userDevices": { p1: "tablet" } });
  assert.equal(ScrySettings.getDeviceType(P1), "tablet");
  setSettings({ "table-os-scry.userDevices": { p1: "phone" } });
  assert.equal(ScrySettings.getDeviceType(P1), "phone");
  assert.equal(ScrySettings.isScryUser(P1), true);
});

test("no assignment or 'none' means normal Foundry", () => {
  assert.equal(ScrySettings.getDeviceType(P1), null);
  setSettings({ "table-os-scry.userDevices": { p1: "none" } });
  assert.equal(ScrySettings.isScryUser(P1), false);
});

test("auto picks phone or tablet by screen width against the threshold", () => {
  setSettings({ "table-os-scry.userDevices": { p1: "auto" } });
  assert.equal(ScrySettings.getDeviceType(P1), "phone");
  window.screen.width = 1024;
  assert.equal(ScrySettings.getDeviceType(P1), "tablet");
  setSettings({ "table-os-scry.tabletWidthThreshold": 1200 });
  assert.equal(ScrySettings.getDeviceType(P1), "phone");
});

test("auto leaves the TableOS IR-table user off Scry", () => {
  setSettings({ "table-os-scry.userDevices": { p1: "auto" } });
  game.modules = collection([{ id: "table-os", active: true }]);
  setSettings({ "table-os.userProfiles": JSON.stringify({ p1: { type: "ir-table" } }) });
  assert.equal(ScrySettings.getDeviceType(P1), null);
  setSettings({ "table-os.userProfiles": { p1: { type: "player" } } });
  assert.equal(ScrySettings.getDeviceType(P1), "phone");
});

test("auto still works when TableOS is active but its profiles are not set up", () => {
  setSettings({ "table-os-scry.userDevices": { p1: "auto" } });
  game.modules = collection([{ id: "table-os", active: true }]);
  // table-os.userProfiles is not registered here, so get() throws
  assert.equal(ScrySettings.getDeviceType(P1), "phone");
});

test("setUserDevice keeps the other players' assignments", async () => {
  setSettings({ "table-os-scry.userDevices": { p2: "tablet" } });
  await ScrySettings.setUserDevice("p1", "phone");
  assert.deepEqual(game.settings.get("table-os-scry", "userDevices"), { p2: "tablet", p1: "phone" });
});

test("getUserDevices falls back to an empty object", () => {
  const real = game.settings.get;
  game.settings.get = () => { throw new Error("not ready"); };
  try { assert.deepEqual(ScrySettings.getUserDevices(), {}); }
  finally { game.settings.get = real; }
});

test("the player's own theme overrides the GM default", async () => {
  assert.equal(ScrySettings.getEffectiveTheme(), "cobalt");
  setSettings({ "table-os-scry.defaultTheme": "classic" });
  assert.equal(ScrySettings.getEffectiveTheme(), "classic");
  await ScrySettings.setClientTheme("beyond-dark");
  assert.equal(ScrySettings.getEffectiveTheme(), "beyond-dark");
});

test("theme falls back to cobalt when settings can't be read", () => {
  const real = game.settings.get;
  game.settings.get = () => { throw new Error("not ready"); };
  try { assert.equal(ScrySettings.getEffectiveTheme(), "cobalt"); }
  finally { game.settings.get = real; }
});
