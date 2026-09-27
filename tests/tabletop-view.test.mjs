import { makeUser, makeActor, makeToken, makeCanvas, asUser, setSettings, resetSettings, notes, calls,
  collection, tick } from "./setup.mjs";
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ScryView } from "../scripts/scry-view.js";

let view, tv, actor, own;
const $  = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const click = el => { assert.ok(el, "element to click exists"); el.click(); };

/** A touch tap at client x,y. jsdom has no Touch, so the lists are plain arrays. */
function tap(x, y, { endX = x, endY = y, target = document.body } = {}) {
  const start = new window.Event("touchstart", { bubbles: true });
  start.touches = [{ clientX: x, clientY: y }];
  target.dispatchEvent(start);
  const end = new window.Event("touchend", { bubbles: true });
  end.changedTouches = [{ clientX: endX, clientY: endY }];
  target.dispatchEvent(end);
}

function enter(mode = "none") {
  setSettings({ "table-os-scry.clientTheme": "cobalt" });
  actor = makeActor();
  own = makeToken({ id: "tMe", actor, x: 200, y: 200, name: "Aria" });
  canvas.tokens.placeables.push(own);
  view = new ScryView(actor, "phone");
  game.scry = { view };
  view.render();
  tv = view._tabletopView;
  tv.enter(mode);
  return tv;
}

beforeEach(() => {
  resetSettings();
  notes.length = 0; calls.length = 0;
  document.body.innerHTML = "";
  document.head.innerHTML = "";
  asUser(makeUser({ id: "p1" }));
  game.combat = null;
  globalThis.canvas = makeCanvas();
  delete globalThis.TABLE_OS;
  delete globalThis.TableOSTokenMover;
  delete globalThis.TableOSTargetModeController;
});
afterEach(() => { tv?.exit(); view?.destroy(); view = tv = null; delete game.scry; });

test("enter hides the overlay, pans to my token and shows the bar; exit puts it all back", () => {
  document.body.insertAdjacentHTML("beforeend",
    '<div id="board"></div><div id="tableos-battle-dock"></div><div class="tableos-turn-timer"></div><style id="scry-no-canvas"></style>');
  enter();
  assert.ok(tv.active);
  assert.ok($("#scry-overlay").classList.contains("hidden"));
  assert.equal($("#scry-no-canvas"), null);
  assert.equal($("#board").style.getPropertyValue("pointer-events"), "auto");
  assert.equal($("#tableos-battle-dock").style.display, "none");
  assert.ok(calls.some(c => c[1] === "animatePan" && c[2].x === 250));
  assert.ok($("#scry-tabletop-bar"));
  tv.enter();
  view._pendingReturnTab = "spells";
  click($(".scry-tv-back"));
  assert.ok(!tv.active);
  assert.ok($("#scry-no-canvas"));
  assert.equal($("#tableos-battle-dock").style.display, "");
  assert.equal(view.activeTab, "spells", "back to the tab that sent us");
  tv.exit();
});

test("with no token of mine it pans to the scene centre; before the canvas is ready it waits", () => {
  setSettings({ "table-os-scry.clientTheme": "cobalt" });
  actor = makeActor();
  view = new ScryView(actor, "phone");
  view.render();
  tv = view._tabletopView;
  tv.enter();
  assert.ok(calls.some(c => c[1] === "animatePan" && c[2].x === 1000));
  tv.exit();
  canvas.ready = false;
  calls.length = 0;
  tv.enter();
  assert.ok(!calls.some(c => c[1] === "animatePan"));
  canvas.ready = true;
  Hooks.callAll("canvasReady");
  assert.ok(calls.some(c => c[1] === "animatePan"));
});

test("bar buttons switch modes, and pressing one again turns it off", () => {
  enter();
  click($(".scry-tv-target"));
  assert.equal(tv._mode, "target");
  assert.match($(".scry-tv-target").textContent, /Targeting/);
  click($(".scry-tv-target"));
  assert.equal(tv._mode, "none");
  click($(".scry-tv-walk"));
  assert.equal(tv._mode, "walk");
  assert.ok(tv._walkIconPixi, "walking figure drawn on my token");
  click($(".scry-tv-ping"));
  assert.equal(tv._walkIconPixi, null);
  click($(".scry-tv-ruler"));
  assert.ok($("#scry-ruler-overlay"));
  click($(".scry-tv-ruler"));
  assert.equal($("#scry-ruler-overlay"), null);
});

test("Actions and Spells open the sheet over the map", () => {
  enter();
  click($(".scry-tv-spells"));
  assert.equal(view.activeTab, "spells");
  assert.ok($("#scry-overlay").classList.contains("tv-overlay-mode"));
  assert.equal($("#scry-tabletop-bar").style.getPropertyValue("display"), "none");
  click($(".scry-tv-actions"));
  assert.equal(view.activeTab, "actions");
});

test("target mode: tapping a token targets it, again clears it, reticules follow", () => {
  const orc = makeToken({ id: "tOrc", x: 600, y: 600, name: "Orc" });
  canvas.tokens.placeables.push(orc);
  enter("target");
  tap(325, 325);
  assert.ok(game.user.targets.has(orc));
  assert.ok(notes.some(([, m]) => m === "Targeting: Orc"));
  assert.deepEqual(tv._lastTargetIds, ["tOrc"]);
  assert.equal(tv._reticuleSprites.size, 1);
  tap(325, 325);
  assert.ok(!game.user.targets.has(orc));
  assert.equal(tv._reticuleSprites.size, 0);
  tap(10, 10);
  assert.equal(notes.length, 2, "empty spot, nothing happens");
});

test("TableOS target controller and token lookup are used when present", () => {
  const orc = makeToken({ id: "tOrc", name: "Orc" });
  const toggled = [];
  globalThis.TableOSTargetModeController = class { toggleTarget(t) { toggled.push(t.id); } };
  globalThis.TABLE_OS = { getTokenAtWorldPoint: () => orc };
  enter("target");
  tap(5, 5);
  assert.deepEqual(toggled, ["tOrc"]);
});

test("drags, taps on Scry UI and taps with no mode are ignored", () => {
  const orc = makeToken({ id: "tOrc", x: 600, y: 600, name: "Orc" });
  canvas.tokens.placeables.push(orc);
  enter();
  tap(325, 325);
  assert.equal(notes.length, 0, "mode none");
  tv._setMode("target");
  tap(325, 325, { endX: 400, endY: 400 });
  assert.equal(notes.length, 0, "a drag");
  tap(325, 325, { target: $(".scry-tv-back") });
  assert.equal(notes.length, 0, "tap on the bar");
  const end = new window.Event("touchend");
  end.changedTouches = [];
  document.body.dispatchEvent(end);
  const s = new window.Event("touchstart"); s.touches = [];
  document.body.dispatchEvent(s);
  const s2 = new window.Event("touchstart"); s2.touches = [{ clientX: 1, clientY: 1 }];
  document.body.dispatchEvent(s2);
  const e2 = new window.Event("touchend"); e2.changedTouches = [];
  document.body.dispatchEvent(e2);
  const s3 = new window.Event("touchstart"); s3.touches = [{ clientX: 1, clientY: 1 }];
  document.body.dispatchEvent(s3);
  const e3 = new window.Event("touchend", { bubbles: true }); e3.changedTouches = [{ clientX: 1, clientY: 1 }];
  $(".scry-tv-back").dispatchEvent(e3);
});

test("walk without TableOS snaps my token to the tapped square", async () => {
  enter("walk");
  tap(410, 610);
  await tick();
  assert.ok(calls.some(c => c[1] === "tokenUpdate" && c[2].x === 800 && c[2].y === 1200));
  canvas.grid.getSnappedPoint = () => { throw new Error("old grid"); };
  tap(260, 260);
  await tick();
  assert.ok(calls.some(c => c[1] === "tokenUpdate" && c[2].x === 500 && c[2].y === 500));
});

test("walk with the TableOS mover routes the tap, and tapping my token cancels", () => {
  const mover = { state: "IDLE", taps: [], selected: null, cancelled: 0,
    handleDestinationTap(w) { this.taps.push(w); this.state = "PATH"; },
    selectToken(t) { this.selected = t.id; }, cancel() { this.cancelled++; } };
  globalThis.TABLE_OS = { getTokenAtWorldPoint: () => null };
  globalThis.TableOSTokenMover = function () { return mover; };
  enter("walk");
  assert.equal(mover.selected, "tMe");
  tap(100, 100);
  assert.equal(mover.taps.length, 1);
  globalThis.TABLE_OS.getTokenAtWorldPoint = () => own;
  tap(125, 125);
  assert.ok(mover.cancelled >= 1);
  assert.equal(tv._mode, "none");
});

test("walk does nothing when I have no token on the scene", () => {
  enter();
  canvas.tokens.placeables.length = 0;
  tv._handleWalkTap({ x: 1, y: 1 }, null);
  assert.ok(!calls.some(c => c[1] === "tokenUpdate"));
});

test("ping uses canvas.ping, then controls.ping, then a pan", () => {
  enter("ping");
  tap(50, 50);
  assert.ok(calls.some(c => c[1] === "ping"));
  assert.equal(tv._mode, "none");
  const pinged = [];
  canvas.ping = undefined;
  canvas.controls.ping = p => pinged.push(p);
  tv._handlePingTap({ x: 1, y: 2 });
  assert.deepEqual(pinged, [{ x: 1, y: 2 }]);
  canvas.controls.ping = undefined;
  tv._handlePingTap({ x: 3, y: 4 });
  assert.ok(calls.some(c => c[1] === "animatePan" && c[2].x === 3));
  canvas.controls.ping = () => { throw new Error("x"); };
  tv._handlePingTap({ x: 5, y: 6 });
  assert.ok(calls.some(c => c[1] === "animatePan" && c[2].x === 5));
  tv._handlePingTap(null);
  tv._handleZoomTap({ x: 7, y: 8 });
  tv._handleZoomTap(null);
});

test("ruler: two taps show the distance, and it stays on for the next one", () => {
  enter();
  click($(".scry-tv-ruler"));
  tap(0, 0);
  tap(100, 0);
  assert.equal($("#scry-ruler-readout").textContent, "10 ft");
  assert.equal($$("#scry-ruler-svg circle").length, 2);
  assert.ok($("#scry-ruler-svg line"));
  assert.equal(tv._mode, "ruler");
  tv._clearRuler();
  tv._handleRulerTap(1, 1, { x: 1, y: 1 });
  tv._handleRulerTap(1, 1, null);
});

test("client to world falls back to the stage transform", () => {
  enter();
  canvas.canvasCoordinatesFromClient = () => ({ x: NaN });
  canvas.stage.position = { x: 0, y: 0 };
  assert.deepEqual(tv._clientToWorld(100, 50), { x: 1200, y: 1100 });
  canvas.canvasCoordinatesFromClient = () => { throw new Error("x"); };
  canvas.stage = null;
  canvas.app = { stage: { scale: { x: 1, y: 1 }, pivot: { x: 0, y: 0 }, position: { x: 0, y: 0 } }, view: document.createElement("canvas") };
  assert.deepEqual(tv._clientToWorld(3, 4), { x: 3, y: 4 });
  canvas.app = {};
  assert.equal(tv._clientToWorld(3, 4), null);
  canvas.ready = false;
  assert.equal(tv._clientToWorld(3, 4), null);
  assert.equal(tv._tokenAtWorld({ x: 0, y: 0 }), null);
});

test("info strip shows conditions, movement and the TableOS timer", () => {
  enter();
  document.body.insertAdjacentHTML("beforeend",
    '<div class="tableos-turn-timer__inner" style="color:red"><span class="tableos-turn-timer__time">0:30</span></div>');
  view._movementUsed = 25;
  tv._updateInfoStrip();
  assert.equal($(".scry-tvi-conditions").textContent, "Prone");
  assert.equal($$(".scry-tvi-movement .is-danger").length, 1);
  assert.equal($("#scry-tv-timer-badge").textContent, "0:30");
  assert.equal($("#scry-tv-timer-badge").style.display, "block");
  actor.statuses = new Set(["concentrating"]);
  $(".tableos-turn-timer__time").textContent = "";
  view._movementUsed = 10;
  tv._updateInfoStrip();
  assert.ok($(".scry-tvi-conditions").classList.contains("hidden"));
  assert.equal($("#scry-tv-timer-badge").style.display, "none");
  assert.equal($$(".scry-tvi-movement .is-warn").length, 0);
  $("#scry-overlay").classList.add("tv-overlay-mode");
  tv._updateInfoStrip();
});

test("End Turn shows only on my turn and ends it", () => {
  const me = { id: "cA", actor: { id: "a1" } };
  game.combat = { active: true, combatants: collection([me]), current: { combatantId: "cA" },
    nextTurn: async () => calls.push(["combat", "nextTurn"]) };
  enter();
  assert.equal($("#scry-tv-end-turn-row").style.display, "");
  click($(".scry-tv-end-turn-btn"));
  assert.ok(calls.some(c => c[1] === "nextTurn"));
  game.combat.current.combatantId = "other";
  Hooks.callAll("updateCombat", game.combat);
  assert.equal($("#scry-tv-end-turn-row").style.display, "none");
});

test("nav panel pans, zooms, centres on me and fits all tokens", () => {
  Math.clamp ??= (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  canvas.tokens.placeables.push(makeToken({ id: "t2", x: 1000, y: 800 }));
  enter();
  click($(".scry-tv-nav"));
  const btns = $$("#scry-nav-panel button");
  const byText = t => btns.find(b => b.textContent === t);
  for (const t of ["↑", "←", "→", "↓", "＋", "－", "⊞", "⊕"]) click(byText(t));
  assert.ok(calls.some(c => c[1] === "animatePan" && c[2].y === 600), "up by four squares");
  assert.ok(calls.some(c => c[1] === "control"));
  canvas.tokens.placeables.length = 0;
  click(byText("⊞"));
  click(byText("⊕"));
  click(byText("✕ Close"));
  assert.equal($("#scry-nav-panel"), null);
  click($(".scry-tv-nav"));
  click($(".scry-tv-nav"));
  assert.equal($("#scry-nav-panel"), null, "second press closes it");
});

test("token picker lists visible tokens and toggles a target", () => {
  const orc = makeToken({ id: "tOrc", name: "Orc" });
  const hidden = makeToken({ id: "tH" });
  hidden.document.hidden = true;
  canvas.tokens.placeables.push(orc, hidden);
  enter();
  tv.openTokenPicker();
  assert.equal($$("#scry-token-picker .scry-tp-row").length, 2);
  click($('.scry-tp-row[data-token-id="tOrc"]'));
  assert.ok(game.user.targets.has(orc));
  assert.ok($('.scry-tp-row[data-token-id="tOrc"]').classList.contains("is-targeted"));
  click($(".scry-tp-close"));
  assert.equal($("#scry-token-picker"), null);
  canvas.tokens.placeables.length = 0;
  tv.openTokenPicker();
  assert.ok($(".scry-tp-empty"));
  canvas.ready = false;
  tv.openTokenPicker();
  assert.equal($("#scry-token-picker"), null);
});

test("turn announcement says whose turn it is", async () => {
  enter();
  tv.showTurnAnnouncement({ name: "Aria", actor });
  assert.equal($(".scry-tv-ann-label").textContent, "YOUR TURN");
  tv.showTurnAnnouncement({ name: "Bram", actor: { id: "a2", hasPlayerOwner: true, img: "b.webp" } });
  assert.equal($(".scry-tv-ann-label").textContent, "THEIR TURN");
  tv.showTurnAnnouncement({ name: "Orc", token: { texture: { src: "orc.webp" } } });
  assert.equal($(".scry-tv-ann-label").textContent, "NOW ACTING");
  click($("#scry-tv-announcement"));
  assert.equal($("#scry-tv-announcement"), null);
  tv.showTurnAnnouncement({});
  assert.equal($(".scry-tv-ann-name").textContent, "Unknown");
});

test("walk icon and reticules survive odd tokens and a missing canvas layer", () => {
  enter();
  tv._addWalkIcon(null);
  canvas.controls = null;
  tv._addWalkIcon(own);
  assert.equal(tv._walkIconPixi, null);
  canvas.controls = { addChild() { throw new Error("gone"); } };
  game.user.targets.add(makeToken({ id: "tX" }));
  tv._updateReticules();
  canvas.ready = false;
  tv._updateReticules();
  const broken = { parent: { removeChild() { throw new Error("x"); } }, destroy() {} };
  tv._reticuleSprites.set("z", broken);
  tv._clearReticules();
  tv._walkIconPixi = broken;
  tv._removeWalkIcon();
  assert.equal(tv._walkIconPixi, null);
});

test("a TableOS mover that throws is ignored", () => {
  globalThis.TABLE_OS = {};
  globalThis.TableOSTokenMover = function () { throw new Error("bad build"); };
  enter();
  assert.equal(tv._tokenMover, null);
  tv._tokenMover = { selectToken() { throw new Error("x"); }, cancel() { throw new Error("y"); } };
  tv._setMode("walk");
  tv._setMode("none");
  tv._tokenMover = null;
});
