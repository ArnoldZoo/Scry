// Test environment for Scry: a jsdom page plus the slice of Foundry and dnd5e
// the scripts touch. Import this first in every test file. It must run before
// any module under scripts/ is imported, because main.js registers hooks at
// import time and scry-settings-app.js extends FormApplication.

import { JSDOM } from "jsdom";
import { after } from "node:test";

// The overlay's timer sync and the Table view info strip run on setInterval for
// the life of the page. Track them so a test file always exits.
const intervals = new Set();
const realSetInterval = globalThis.setInterval, realClearInterval = globalThis.clearInterval;
globalThis.setInterval   = (fn, ms, ...a) => { const h = realSetInterval(fn, ms, ...a); intervals.add(h); return h; };
globalThis.clearInterval = h => { intervals.delete(h); realClearInterval(h); };
after(() => { for (const h of intervals) realClearInterval(h); intervals.clear(); });

const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
  url: "http://localhost/game",
  pretendToBeVisual: true
});
const win = dom.window;

// Browser globals the scripts use bare (document, HTMLElement, MutationObserver...).
for (const key of Object.getOwnPropertyNames(win)) {
  if (key in globalThis) continue;
  try { globalThis[key] = win[key]; } catch { /* read-only on this Node build */ }
}
globalThis.window   = win;
globalThis.document = win.document;
for (const key of ["Event", "CustomEvent", "KeyboardEvent", "PointerEvent", "MouseEvent", "TouchEvent"]) {
  globalThis[key] = win[key] ?? win.Event;
}
Object.defineProperty(win.screen, "width", { value: 390, configurable: true, writable: true });
// jsdom's location.reload is read-only. The scripts call bare location.reload().
export const reloads = [];
globalThis.location = { href: win.location.href, pathname: "/game", origin: win.location.origin,
  reload: () => { reloads.push(1); } };

// Frames only run when a test calls flushFrames(), so nothing spins forever.
let rafQueue = [];
globalThis.requestAnimationFrame = win.requestAnimationFrame = fn => { rafQueue.push(fn); return rafQueue.length; };
globalThis.cancelAnimationFrame  = win.cancelAnimationFrame  = () => {};
export function flushFrames(times = 1) {
  for (let i = 0; i < times; i++) {
    const q = rafQueue; rafQueue = [];
    for (const fn of q) fn(performance.now());
  }
}

// jsdom has no canvas. The theme picker paints names through a 2D context.
win.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, {
  get: (_t, k) => k === "measureText" ? () => ({ width: 40 }) : () => {},
  set: () => true
});
win.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";

// Async click handlers can reject after a test moves on. Keep them for tests
// that check a flow ran clean, instead of letting them crash the runner.
export const rejections = [];
process.on("unhandledRejection", e => rejections.push(e));

/** Let pending promises and 0 ms timers run. */
export const tick = (n = 3) => new Promise(async r => { for (let i = 0; i < n; i++) await new Promise(q => setTimeout(q, 0)); r(); });

// --- collections ---

/** Foundry-style collection: an array with get(id), contents and size. */
export function collection(items = []) {
  const arr = [...items];
  arr.get      = id => arr.find(x => x.id === id);
  arr.contents = arr;
  Object.defineProperty(arr, "size", { get: () => arr.length });
  return arr;
}

// --- hooks, notifications ---

export const hookLog = [];
const hookHandlers = new Map();
let hookSeq = 0;
function addHandler(name, fn, once) {
  const id = ++hookSeq;
  if (!hookHandlers.has(name)) hookHandlers.set(name, []);
  hookHandlers.get(name).push({ id, fn, once });
  return id;
}
function runHooks(name, args, stopOnFalse) {
  hookLog.push([name, ...args]);
  const list = hookHandlers.get(name) ?? [];
  hookHandlers.set(name, list.filter(h => !h.once));
  for (const h of list) if (h.fn(...args) === false && stopOnFalse) return false;
  return true;
}
globalThis.Hooks = {
  on:   (name, fn) => addHandler(name, fn, false),
  once: (name, fn) => addHandler(name, fn, true),
  off(name, id) {
    const l = hookHandlers.get(name);
    if (l) hookHandlers.set(name, l.filter(h => h.id !== id && h.fn !== id));
  },
  callAll: (name, ...args) => runHooks(name, args, false),
  call:    (name, ...args) => runHooks(name, args, true),
  handlers: name => hookHandlers.get(name) ?? []
};

export const notes = [];
globalThis.ui = {
  notifications: {
    info:  m => notes.push(["info", m]),
    warn:  m => notes.push(["warn", m]),
    error: m => notes.push(["error", m])
  },
  windows: {}
};

// --- settings ---

const registered = new Map();
const values     = new Map();
export const menus = new Map();
const settingsApi = {
  register(mod, key, cfg) { registered.set(`${mod}.${key}`, cfg); },
  registerMenu(mod, key, cfg) { menus.set(key, cfg); },
  get(mod, key) {
    const k = `${mod}.${key}`;
    if (values.has(k)) return values.get(k);
    if (!registered.has(k)) throw new Error(`Setting ${k} is not registered`);
    return registered.get(k).default;
  },
  async set(mod, key, value) {
    values.set(`${mod}.${key}`, value);
    registered.get(`${mod}.${key}`)?.onChange?.(value);
    return value;
  },
  registered
};
/** Set settings for one test, keyed "module.key". Call resetSettings() after. */
export function setSettings(obj) { for (const [k, v] of Object.entries(obj)) values.set(k, v); }
export function resetSettings() { values.clear(); }

// --- users, actors, items ---

export function makeUser({ id, name = id, isGM = false, character = null } = {}) {
  const flags = {};
  return {
    id, name, isGM, character, active: true, role: isGM ? 4 : 1,
    targets: new Set(),
    getFlag: (scope, key) => flags[`${scope}.${key}`],
    setFlag: async (scope, key, v) => { flags[`${scope}.${key}`] = v; return v; },
    updateTokenTargets() {}
  };
}

/** Calls made on fake documents, as [docName, method, ...args]. */
export const calls = [];

export function makeItem(data) {
  const item = {
    img: "icons/item.webp",
    labels: {},
    ...data,
    system: { description: { value: `<p>${data.name} text</p>` }, ...data.system },
    async use(...a) { calls.push([item.name, "use", ...a]); return {}; },
    async update(u) { calls.push([item.name, "update", u]); applyUpdate(item, u); return item; },
    async rollAttack(...a) { calls.push([item.name, "rollAttack", ...a]); return new Roll("1d20"); },
    async rollDamage(...a) { calls.push([item.name, "rollDamage", ...a]); return [new Roll("1d8")]; },
    toObject() { return { ...item }; }
  };
  return item;
}

function applyUpdate(doc, u) {
  for (const [path, v] of Object.entries(u ?? {})) {
    const keys = path.split(".");
    let o = doc;
    for (const k of keys.slice(0, -1)) o = o[k] ??= {};
    o[keys.at(-1)] = v;
  }
}

/** A level 5 wizard / level 1 fighter with weapons, spells, gear and features. */
export function makeActor({ id = "a1", name = "Aria", owner = true, items } = {}) {
  const act = t => ({ activities: collection([{ activation: { type: t } }]) });
  const list = items ?? [
    makeItem({ id: "c1", name: "Wizard", type: "class", system: { levels: 5, hitDice: "d6", hitDiceUsed: 1 } }),
    makeItem({ id: "c2", name: "Fighter", type: "class", system: { levels: 1, hitDice: "d10", hitDiceUsed: 0 } }),
    makeItem({ id: "r1", name: "Elf", type: "race", system: {} }),
    makeItem({ id: "w1", name: "Longsword", type: "weapon", labels: { modifier: "+5" },
      system: { ...act("action"), equipped: true, quantity: 1, weight: { value: 3 },
        damage: { base: { formula: "1d8", types: new Set(["slashing"]) } },
        properties: new Set(["ver"]), range: { reach: 5 } } }),
    makeItem({ id: "w2", name: "Dagger", type: "weapon",
      system: { activation: { type: "action" }, equipped: false, quantity: 2, weight: 1, attackBonus: 1,
        damage: { parts: [["1d4", "piercing"]] }, properties: { fin: true, thr: true, lgt: false } } }),
    makeItem({ id: "f1", name: "Second Wind", type: "feat",
      system: { ...act("bonus"), type: { value: "class" }, uses: { value: 1, max: 1 } } }),
    makeItem({ id: "f2", name: "Wild Shape", type: "feat", system: { ...act("special"), type: { value: "class" } } }),
    makeItem({ id: "f3", name: "Lucky", type: "feat", system: { type: { value: "feat" }, uses: { value: 3, max: 3 } } }),
    makeItem({ id: "f4", name: "Darkvision", type: "feat", system: { type: { value: "race" } } }),
    makeItem({ id: "f5", name: "Shield Master", type: "feat", system: { ...act("reaction"), type: { value: "feat" } } }),
    makeItem({ id: "s0", name: "Fire Bolt", type: "spell", system: { ...act("action"), level: 0, school: "evo",
      prepared: true, method: "spell", actionType: "rsak", damage: { parts: [["2d10", "fire"]] } } }),
    makeItem({ id: "s1", name: "Magic Missile", type: "spell", system: { ...act("action"), level: 1,
      preparation: { prepared: true, mode: "prepared" }, school: "evo" } }),
    makeItem({ id: "s2", name: "Shield", type: "spell", system: { ...act("reaction"), level: 1,
      preparation: { prepared: false, mode: "prepared" } } }),
    makeItem({ id: "s3", name: "Misty Step", type: "spell", system: { ...act("bonus"), level: 2,
      preparation: { prepared: true, mode: "always" }, duration: { concentration: false } } }),
    makeItem({ id: "s4", name: "Fireball", type: "spell", system: { ...act("action"), level: 3, actionType: "save",
      preparation: { prepared: true, mode: "prepared" }, target: { template: { type: "sphere", size: 20 } },
      duration: { concentration: false }, damage: { parts: [["8d6", "fire"]] } } }),
    makeItem({ id: "s5", name: "Bless", type: "spell", system: { ...act("action"), level: 1,
      preparation: { prepared: true, mode: "prepared" }, duration: { concentration: true } } }),
    makeItem({ id: "e1", name: "Chain Mail", type: "equipment", system: { equipped: true, quantity: 1, weight: { value: 55 } } }),
    makeItem({ id: "p1", name: "Potion of Healing", type: "consumable", system: { ...act("action"), equipped: true, quantity: 3 } }),
    makeItem({ id: "b1", name: "Backpack", type: "backpack", system: { quantity: 1 } }),
    makeItem({ id: "l1", name: "Rope", type: "loot", system: { quantity: 1, container: "b1" } }),
    makeItem({ id: "t1", name: "Thieves' Tools", type: "tool", system: { quantity: 1 } })
  ];
  const itemCol = collection(list);
  const actor = {
    id, name, img: `${id}.webp`, type: "character",
    isOwner: owner, hasPlayerOwner: true,
    statuses: new Set(["prone"]),
    effects: collection([{ id: "ef1", name: "Concentrating", disabled: false, statuses: new Set(["concentrating"]) }]),
    items: itemCol,
    flags: {},
    system: {
      attributes: {
        hp: { value: 20, max: 40, temp: 5 },
        ac: { value: 16 },
        movement: { walk: 30 },
        prof: 3,
        init: { total: 2 },
        spellcasting: "int",
        exhaustion: 1,
        inspiration: false,
        encumbrance: { value: 70, max: 150, pct: 46 }
      },
      abilities: {
        str: { value: 12, mod: 1, proficient: 1, save: 4 },
        dex: { value: 14, mod: 2, proficient: 0, save: { value: 2 } },
        con: { value: 13, mod: 1, proficient: 0 },
        int: { value: 18, mod: 4, proficient: 1, save: 7 },
        wis: { value: 10, mod: 0, proficient: 0, save: 0 },
        cha: { value: 8, mod: -1, proficient: 0, save: -1 }
      },
      skills: {
        prc: { total: 3, value: 1, ability: "wis", passive: 13 },
        arc: { total: 7, value: 1, ability: "int" },
        ath: { total: 1, value: 0, ability: "str" }
      },
      spells: {
        spell1: { value: 3, max: 4 }, spell2: { value: 2, max: 3 }, spell3: { value: 1, max: 2 }, spell4: { value: 0, max: 0 }
      },
      currency: { pp: 1, gp: 25, ep: 0, sp: 7, cp: 12 },
      details: { trait: "Curious", ideal: "Knowledge", bond: "My spellbook", flaw: "Arrogant" },
      traits: {
        weaponProf: { value: new Set(["simple"]) }, armorProf: { value: ["light"] }, toolProf: { value: [] },
        languages: { value: new Set(["common", "elvish"]) }
      }
    },
    getFlag: (s, k) => actor.flags[`${s}.${k}`],
    async setFlag(s, k, v) { actor.flags[`${s}.${k}`] = v; },
    testUserPermission: () => owner,
    async update(u) { calls.push([name, "update", u]); applyUpdate(actor, u); return actor; },
    async applyDamage(v, o) { calls.push([name, "applyDamage", v, o]); },
    async toggleStatusEffect(s, o) { calls.push([name, "toggleStatusEffect", s, o]); },
    async rollHitDie(...a) { calls.push([name, "rollHitDie", ...a]); return new Roll("1d6"); },
    async shortRest(o) { calls.push([name, "shortRest", o]); },
    async longRest(o) { calls.push([name, "longRest", o]); },
    async rollInitiative(o) { calls.push([name, "rollInitiative", o]); },
    async rollAbilityCheck(o) { calls.push([name, "rollAbilityCheck", o]); },
    async rollAbilityTest(...a) { calls.push([name, "rollAbilityTest", ...a]); },
    async rollSavingThrow(o) { calls.push([name, "rollSavingThrow", o]); },
    async rollAbilitySave(...a) { calls.push([name, "rollAbilitySave", ...a]); },
    async rollSkill(o) { calls.push([name, "rollSkill", o]); },
    async deleteEmbeddedDocuments(...a) { calls.push([name, "deleteEmbeddedDocuments", ...a]); },
    getActiveTokens: () => []
  };
  return actor;
}

// --- game ---

globalThis.game = {
  system:   { id: "dnd5e" },
  settings: settingsApi,
  user:     makeUser({ id: "p1" }),
  users:    collection([]),
  actors:   collection([]),
  macros:   collection([]),
  journal:  collection([]),
  scenes:   { viewed: null },
  modules:  collection([]),
  combat:   null,
  combats:  collection([]),
  i18n:     { localize: s => s, format: s => s },
  socket:   { on() {}, emit() {} }
};

/** Swap the current user. Pass a user from makeUser. */
export function asUser(user) { game.user = user; }

// --- Foundry and dnd5e config ---

globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 } };
globalThis.CONFIG = {
  statusEffects: [
    { id: "prone", name: "Prone", img: "prone.svg" },
    { id: "blinded", name: "Blinded", img: "blinded.svg" },
    { id: "poisoned", name: "Poisoned", img: "poisoned.svg" }
  ],
  DND5E: {
    abilities: { str: { label: "Strength", abbreviation: "str" }, int: { label: "Intelligence", abbreviation: "int" } },
    skills: { prc: { label: "Perception" }, arc: { label: "Arcana" }, ath: { label: "Athletics" } },
    conditionTypes: {}
  }
};

const getProperty = (obj, path) => path.split(".").reduce((o, k) => o?.[k], obj);
globalThis.foundry = {
  utils: { mergeObject: (a, b) => ({ ...a, ...b }), getProperty, deepClone: o => structuredClone(o), randomID: () => "rnd" },
  applications: { settings: { SettingsConfig: class { constructor(o) { this.options = o; } render() { calls.push(["SettingsConfig", "render"]); return this; } } } }
};

globalThis.FormApplication = class FormApplication {
  static get defaultOptions() { return {}; }
  constructor(object = {}, options = {}) { this.object = object; this.options = options; this.rendered = false; }
  render() { this.rendered = true; return this; }
  async close() { this.rendered = false; }
  getData() { return {}; }
  activateListeners() {}
};

globalThis.Dialog = class Dialog {
  constructor(data, options) { this.data = data; this.options = options; Dialog.last = this; }
  render() { calls.push(["Dialog", "render", this.data?.title]); return this; }
  close() {}
};

// jQuery, only as far as the scripts use it: wrap an element or an HTML string, find, on, each.
globalThis.$ = globalThis.jQuery = el => {
  if (typeof el === "string") {
    const t = document.createElement("template");
    t.innerHTML = el.trim();
    el = [...t.content.children];
  }
  const nodes = el instanceof win.NodeList || Array.isArray(el) ? [...el] : [el];
  const w = {
    0: nodes[0], length: nodes.length,
    find: sel => jQuery(nodes.flatMap(n => [...(n?.querySelectorAll?.(sel) ?? [])])),
    on: (ev, fn) => { nodes.forEach(n => n?.addEventListener?.(ev, fn)); return w; },
    each: fn => { nodes.forEach((n, i) => fn.call(n, i, n)); return w; }
  };
  return w;
};

export const rolls = [];
globalThis.Roll = class Roll {
  constructor(formula, data) { this.formula = formula; this.data = data; this._total = 11;
    this.terms = [{ faces: 20, results: [{ result: 11, active: true }] }]; this.dice = this.terms; }
  async evaluate() { return this; }
  get total() { return this._total; }
  get isCritical() { return this._total === 20; }
  async toMessage(data) { rolls.push({ roll: this, data }); return data; }
};
globalThis.ChatMessage = {
  getSpeaker: ({ actor } = {}) => ({ actor: actor?.id ?? null }),
  async create(d) { rolls.push({ chat: d }); return d; }
};
globalThis.MidiQOL = { configSettings: () => ({ autoRollAttack: false, autoFastForward: false }) };

// --- PIXI and canvas ---

class FakeDisplay {
  constructor() { this.children = []; this.destroyed = false; this.visible = true; this.parent = null;
    this.position = { set() {} }; this.anchor = { set() {} }; this.scale = { set() {} }; }
  addChild(c) { this.children.push(c); c.parent = this; return c; }
  removeChild(c) { this.children = this.children.filter(x => x !== c); c.parent = null; return c; }
  destroy() { this.parent?.removeChild(this); this.destroyed = true; }
}
for (const m of ["beginFill", "endFill", "lineStyle", "drawRect", "drawCircle", "drawEllipse", "drawPolygon",
  "moveTo", "lineTo", "clear", "drawRoundedRect", "arc", "fill", "stroke", "circle", "rect", "ellipse", "poly", "setStrokeStyle"]) {
  FakeDisplay.prototype[m] = function () { return this; };
}
globalThis.PIXI = {
  Graphics: FakeDisplay, Container: FakeDisplay,
  Sprite: class extends FakeDisplay { constructor(t) { super(); this.texture = t; } },
  Text: class extends FakeDisplay { constructor(text) { super(); this.text = text; } },
  Texture: { from: src => ({ src }) }
};

/** A token on the fake canvas. */
export function makeToken({ id = "tk1", actor = null, x = 100, y = 100, name = "Token" } = {}) {
  const token = {
    id, name, actor, x, y, w: 100, h: 100, center: { x: x + 50, y: y + 50 },
    document: { id, x, y, width: 1, height: 1, actorId: actor?.id, name,
      async update(u) { calls.push([name, "tokenUpdate", u]); Object.assign(token.document, u); } },
    mesh: new FakeDisplay(),
    setTarget(v, o) { calls.push([name, "setTarget", v]); if (v) game.user.targets.add(token); else game.user.targets.delete(token); },
    control() { calls.push([name, "control"]); return true; },
    release() {},
    addChild(c) { return c; },
    bounds: { contains: (px, py) => px >= x && px < x + 100 && py >= y && py < y + 100 }
  };
  return token;
}

export function makeCanvas(overrides = {}) {
  const tokens = [];
  return {
    ready: true,
    grid: { size: 100, distance: 5, units: "ft",
      getSnappedPoint: p => ({ x: Math.floor(p.x / 100) * 100, y: Math.floor(p.y / 100) * 100 }),
      getTopLeftPoint: p => ({ x: Math.floor(p.x / 100) * 100, y: Math.floor(p.y / 100) * 100 }) },
    dimensions: { width: 2000, height: 2000, sceneRect: { x: 0, y: 0, width: 2000, height: 2000 } },
    scene: { id: "scene1", width: 2000, height: 2000, tokens: collection([]) },
    tokens: { placeables: tokens, controlled: [], get: id => tokens.find(t => t.id === id), releaseAll() {} },
    stage: { pivot: { x: 1000, y: 1000 }, scale: { x: 0.5, y: 0.5 }, toLocal: p => p, on() {}, off() {} },
    app: { view: document.createElement("canvas"), renderer: { screen: { width: 390, height: 844 } } },
    controls: Object.assign(new FakeDisplay(), { ping() {} }),
    templates: { placeables: [] },
    canvasCoordinatesFromClient: p => ({ x: p.x * 2, y: p.y * 2 }),
    ping: async (...a) => { calls.push(["canvas", "ping", ...a]); },
    animatePan: async o => { calls.push(["canvas", "animatePan", o]); },
    pan: o => { calls.push(["canvas", "pan", o]); },
    ...overrides
  };
}
globalThis.canvas = makeCanvas();

// Register every Scry setting so get() returns the real defaults.
settingsApi.register("core", "noCanvas", { default: false });
settingsApi.register("core", "rollMode", { default: "publicroll" });
const { ScrySettings } = await import("../scripts/settings-manager.js");
ScrySettings.register();
