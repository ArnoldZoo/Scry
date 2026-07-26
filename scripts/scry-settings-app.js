/*
Module: TableOS Scry — Mobile Player Companion
Component: scry-settings-app.js
Purpose: GM settings dialog — assign device types to users.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

import { ScrySettings } from "./settings-manager.js";

export class ScrySettingsApp extends FormApplication {

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title:          "TableOS Scry — Device Settings",
      id:             "scry-settings-app",
      width:          480,
      height:         "auto",
      resizable:      false,
      submitOnChange: false,
      closeOnSubmit:  true,
    });
  }

  getData() { return {}; }

  async _renderInner(_data) {
    const players = game.users.filter(u => !u.isGM);
    const devices = ScrySettings.getUserDevices();

    const rows = players.map(u => {
      const assigned = devices[u.id] ?? "none";
      const opts = [
        { value: "none",   label: "No Scry" },
        { value: "auto",   label: "Auto-detect" },
        { value: "phone",  label: "Phone" },
        { value: "tablet", label: "Tablet" },
      ].map(o =>
        `<option value="${o.value}" ${assigned === o.value ? "selected" : ""}>${o.label}</option>`
      ).join("");

      return `
        <tr>
          <td style="padding:.4rem .6rem;display:flex;align-items:center;gap:.5rem">
            <img src="${u.avatar ?? "icons/svg/mystery-man.svg"}"
                 style="width:28px;height:28px;border-radius:50%;object-fit:cover">
            <span>${u.name}</span>
          </td>
          <td style="padding:.4rem .6rem">
            <select name="device-${u.id}" style="width:100%">${opts}</select>
          </td>
        </tr>`;
    }).join("");

    const noPlayers = players.length === 0
      ? `<p style="color:#aaa;font-style:italic">No non-GM players found.</p>`
      : "";

    return $(`
      <form action="javascript:void(0);">
        <div style="padding:.75rem">
          ${noPlayers}
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>
                <th style="text-align:left;padding:.3rem .6rem;color:#aaa;font-size:.8rem">Player</th>
                <th style="text-align:left;padding:.3rem .6rem;color:#aaa;font-size:.8rem">Device</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="font-size:.75rem;color:#888;margin-top:.6rem">
            "No Scry" keeps standard Foundry. Auto-detect uses screen width threshold.
          </p>
          <div style="text-align:right;margin-top:.75rem">
            <button type="button" data-action="save" style="padding:.4rem 1.2rem">Save</button>
          </div>
        </div>
      </form>`);
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='save']").on("click", () => this._saveDevices(html));
  }

  async _saveDevices(html) {
    const devices = {};
    html.find("select[name^='device-']").each(function() {
      devices[this.name.slice(7)] = this.value;
    });
    await game.settings.set("table-os-scry", "userDevices", devices);
    ui.notifications.info("TableOS Scry | Device assignments saved.");
    this.close();
  }

  async _updateObject() {}
}
