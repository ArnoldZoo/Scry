import { makeUser, makeActor, asUser, setSettings, resetSettings, notes, reloads, collection, tick } from "./setup.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// main.js registers its init and ready hooks once, at import. Keep the handlers
// and call them directly so every boot path runs against the same module.
await import("../scripts/main.js");
const onInit  = Hooks.handlers("init").at(-1).fn;
const onReady = Hooks.handlers("ready").at(-1).fn;
async function boot({ init = true, ready = true } = {}) {
  if (init)  onInit();
  if (ready) { await onReady(); await tick(); }
}

beforeEach(() => {
  resetSettings();
  notes.length = 0;
  reloads.length = 0;
  document.body.innerHTML = "";
  document.head.innerHTML = "";
  delete window._scryNotifObserver;
  delete ui.notifications._scrySuppressed;
  delete game.scry;
  game.actors = collection([]);
});

test("init registers the settings menu", async () => {
  asUser(makeUser({ id: "gm", isGM: true }));
  await boot({ ready: false });
  assert.ok(game.settings.registered.has("table-os-scry.userDevices"));
});

test("a GM with noCanvas stuck on gets it cleared and a reload", async () => {
  asUser(makeUser({ id: "gm", isGM: true }));
  setSettings({ "core.noCanvas": true });
  await boot();
  assert.equal(game.settings.get("core", "noCanvas"), false);
  assert.equal(reloads.length, 1);
  assert.equal(document.getElementById("scry-overlay"), null, "the GM never gets the overlay");
});

test("a GM without noCanvas is left alone", async () => {
  asUser(makeUser({ id: "gm", isGM: true }));
  await boot();
  assert.equal(reloads.length, 0);
});

test("a player with noCanvas stuck on reloads before booting", async () => {
  asUser(makeUser({ id: "p1" }));
  setSettings({ "core.noCanvas": true, "table-os-scry.userDevices": { p1: "phone" } });
  await boot();
  assert.equal(reloads.length, 1);
  assert.equal(document.getElementById("scry-overlay"), null);
});

test("a player with no device assignment keeps normal Foundry", async () => {
  asUser(makeUser({ id: "p1" }));
  await boot();
  assert.equal(document.getElementById("scry-overlay"), null);
});

test("an assigned player boots the overlay and Foundry's UI is hidden", async () => {
  const actor = makeActor();
  asUser(makeUser({ id: "p1", character: actor }));
  setSettings({ "table-os-scry.userDevices": { p1: "phone" } });
  document.body.insertAdjacentHTML("beforeend", '<div id="tableos-overlay"></div>');
  document.body.classList.add("tableos-active");
  await boot();
  assert.ok(document.getElementById("scry-overlay"));
  assert.ok(document.getElementById("scry-no-canvas"), "canvas hidden once the overlay is in");
  assert.ok(document.getElementById("scry-ui-fixes"));
  assert.equal(document.getElementById("tableos-overlay"), null, "TableOS overlay removed");
  assert.equal(game.scry.view.actor, actor);
  game.scry.view.destroy();
});

test("the actor the player last switched to wins over the assigned character", async () => {
  const assigned = makeActor({ id: "a1", name: "Aria" });
  const saved    = makeActor({ id: "a2", name: "Bram" });
  game.actors = collection([assigned, saved]);
  const user = makeUser({ id: "p1", character: assigned });
  await user.setFlag("table-os-scry", "activeActorId", "a2");
  asUser(user);
  setSettings({ "table-os-scry.userDevices": { p1: "tablet" } });
  await boot();
  assert.equal(game.scry.view.actor, saved);
  game.scry.view.destroy();
});

test("with no assigned character, the first owned actor is used", async () => {
  const owned = makeActor({ id: "a3", name: "Cass" });
  game.actors = collection([makeActor({ id: "a4", owner: false }), owned]);
  asUser(makeUser({ id: "p1" }));
  setSettings({ "table-os-scry.userDevices": { p1: "phone" } });
  await boot();
  assert.equal(game.scry.view.actor, owned);
  game.scry.view.destroy();
});

test("a player with no actor waits for an assignment, then boots", async () => {
  const user = makeUser({ id: "p1" });
  asUser(user);
  setSettings({ "table-os-scry.userDevices": { p1: "phone" } });
  await boot();
  assert.equal(document.getElementById("scry-overlay"), null);
  Hooks.callAll("updateUser", makeUser({ id: "other" }));
  Hooks.callAll("updateUser", user);
  assert.equal(document.getElementById("scry-overlay"), null, "still nothing to show");
  user.character = makeActor();
  Hooks.callAll("updateUser", user);
  await tick();
  assert.ok(document.getElementById("scry-overlay"));
  game.scry.view.destroy();
});

test("the size warning is removed whether it was there first or arrives later", async () => {
  document.body.insertAdjacentHTML("beforeend",
    '<div class="notification">Your window is below 1024px by 768px</div><div class="notification">Keep me</div>');
  asUser(makeUser({ id: "gm", isGM: true }));
  await boot({ ready: false });
  assert.equal(document.querySelectorAll(".notification").length, 1, "existing warning swept at init");

  const late = document.createElement("div");
  late.className = "notification";
  late.textContent = "window dimensions too small";
  document.body.appendChild(late);
  await tick();
  assert.ok(!late.isConnected, "observer removes one added later");

  document.body.insertAdjacentHTML("beforeend", '<div class="notification">768 x 1024 minimum</div>');
  window.dispatchEvent(new window.Event("resize"));
  assert.equal(document.querySelectorAll(".notification").length, 1, "resize sweeps again");
});

test("the suppressor starts only once", async () => {
  asUser(makeUser({ id: "gm", isGM: true }));
  await boot({ ready: false });
  const first = window._scryNotifObserver;
  await boot({ ready: false });
  assert.equal(window._scryNotifObserver, first);
});

test("patched warn and error drop the size warning and pass the rest through", async () => {
  const user = makeUser({ id: "p1", character: makeActor() });
  asUser(user);
  setSettings({ "table-os-scry.userDevices": { p1: "phone" } });
  const origWarn = ui.notifications.warn, origError = ui.notifications.error;
  try {
    await boot();
    ui.notifications.warn("Screen is smaller than 1024 x 768");
    ui.notifications.error("real problem");
    ui.notifications.warn({ not: "a string" });
    assert.deepEqual(notes.filter(([k]) => k !== "info").map(([, m]) => m), ["real problem", { not: "a string" }]);
    game.scry.view.destroy();
  } finally {
    ui.notifications.warn = origWarn;
    ui.notifications.error = origError;
  }
});
