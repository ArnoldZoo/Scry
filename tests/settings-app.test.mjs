import { makeUser, setSettings, resetSettings, notes, collection } from "./setup.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ScrySettingsApp } from "../scripts/scry-settings-app.js";

beforeEach(() => {
  resetSettings();
  notes.length = 0;
  document.body.innerHTML = "";
});

async function renderApp() {
  const app = new ScrySettingsApp();
  const html = await app._renderInner();
  document.body.appendChild(html[0]);
  app.activateListeners(html);
  return { app, form: html[0] };
}

test("the dialog lists every non-GM player with their current device", async () => {
  game.users = collection([makeUser({ id: "gm", isGM: true }), makeUser({ id: "p1", name: "Kim" }), makeUser({ id: "p2", name: "Lee" })]);
  setSettings({ "table-os-scry.userDevices": { p1: "tablet" } });
  const { form } = await renderApp();
  const selects = [...form.querySelectorAll("select")];
  assert.deepEqual(selects.map(s => s.name), ["device-p1", "device-p2"]);
  assert.equal(selects[0].value, "tablet");
  assert.equal(selects[1].value, "none", "unassigned shows No Scry");
  assert.equal(ScrySettingsApp.defaultOptions.id, "scry-settings-app");
  assert.deepEqual(new ScrySettingsApp().getData(), {});
  await new ScrySettingsApp()._updateObject();
});

test("Save stores every choice and closes", async () => {
  game.users = collection([makeUser({ id: "p1" }), makeUser({ id: "p2" })]);
  const { app, form } = await renderApp();
  app.rendered = true;
  form.querySelector('[name="device-p1"]').value = "phone";
  form.querySelector('[name="device-p2"]').value = "auto";
  form.querySelector("[data-action='save']").click();
  await new Promise(r => setTimeout(r, 0));
  assert.deepEqual(game.settings.get("table-os-scry", "userDevices"), { p1: "phone", p2: "auto" });
  assert.ok(notes.some(([, m]) => /saved/.test(m)));
  assert.equal(app.rendered, false);
});

test("with no players it says so", async () => {
  game.users = collection([makeUser({ id: "gm", isGM: true })]);
  const { form } = await renderApp();
  assert.match(form.textContent, /No non-GM players found/);
});
