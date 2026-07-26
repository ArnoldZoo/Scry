/*
Module: TableOS Scry — Mobile Player Companion
Component: tabs/tab-gear.js
Purpose: Gear tab — currency, encumbrance, inventory, containers.

Author: Loremaster-DudleyDoRight
Coder: ArcaneLogix-ArnoldZoo
Revision: 2.5.12
Copyright (c) 2026 ArcaneLogix. All rights reserved.
Licensed for personal tabletop play only - see LICENSE.
No redistribution, derivative works, or resale without written permission.
*/

export class TabGear {
  constructor() {
    this._containers = [];
  }

  render(data) {
    this._containers = (data.equipment ?? []).filter(i => i.isContainer);
    return `
      <div class="scry-tab-gear">
        ${this._buildCurrency(data.currency)}
        ${this._buildEncumbrance(data.encumbrance)}
        ${this._buildEquipment(data.equipment)}
      </div>
    `;
  }

  activate(element, actor) {
    // Single delegated handler — all sub-sections are replaced by refresh() via outerHTML,
    // so element-level listeners would be lost. Delegating to the outer element avoids that.
    element.addEventListener("click", async e => {
      // Qty +/-
      const qty = e.target.closest(".scry-qty-btn");
      if (qty?.dataset.itemId) {
        this._changeQty(qty.dataset.itemId, parseInt(qty.dataset.delta), actor);
        return;
      }

      // Equip toggle
      const equip = e.target.closest(".scry-equip-toggle[data-item-id]");
      if (equip) { await this._toggleEquip(equip.dataset.itemId, actor); return; }

      // Currency value tap
      const coin = e.target.closest(".scry-currency-value[data-coin]");
      if (coin) { this._editCurrency(coin.dataset.coin, actor); return; }

      // Container expand/collapse
      const cHdr = e.target.closest(".scry-container-header[data-container-id]");
      if (cHdr) {
        const body = element.querySelector(`.scry-container-body[data-container-id="${cHdr.dataset.containerId}"]`);
        body?.classList.toggle("collapsed");
        cHdr.classList.toggle("collapsed");
        return;
      }

      // Move to / remove from container
      const cBtn = e.target.closest(".scry-container-btn[data-item-id]");
      if (cBtn) {
        const isNested = cBtn.classList.contains("in-container");
        await this._showContainerPicker(cBtn.dataset.itemId, isNested, actor);
        return;
      }

      // Gear row tap — show item description
      const row = e.target.closest(".scry-gear-row[data-item-id]");
      if (row) { this._showDescription(row.dataset.itemId, actor); return; }
    });
  }

  refresh(element, data) {
    const currEl = element.querySelector(".scry-currency-section");
    if (currEl) currEl.outerHTML = this._buildCurrency(data.currency);

    const encEl = element.querySelector(".scry-encumbrance-section");
    if (encEl) encEl.outerHTML = this._buildEncumbrance(data.encumbrance);

    const eqEl = element.querySelector(".scry-equipment-list");
    if (eqEl) eqEl.outerHTML = this._buildEquipment(data.equipment);
  }

  _buildCurrency(currency) {
    const coins = [
      { key: "pp", label: "PP", color: "#b0c4de" },
      { key: "gp", label: "GP", color: "#ffd700" },
      { key: "ep", label: "EP", color: "#c0c0c0" },
      { key: "sp", label: "SP", color: "#c0c0c0" },
      { key: "cp", label: "CP", color: "#cd7f32" },
    ];

    const coinHtml = coins.map(c => `
      <div class="scry-coin">
        <span class="scry-coin-label" style="color:${c.color}">${c.label}</span>
        <span class="scry-currency-value" data-coin="${c.key}">${currency[c.key] ?? 0}</span>
      </div>`
    ).join("");

    return `
      <section class="scry-card scry-currency-section">
        <h3 class="scry-card-title">Currency</h3>
        <div class="scry-currency-row">${coinHtml}</div>
      </section>`;
  }

  _buildEncumbrance(enc) {
    const pct  = Math.min(100, enc.pct ?? 0);
    const warnClass = pct >= 100 ? "over" : pct >= 66 ? "heavy" : "";
    return `
      <section class="scry-card scry-encumbrance-section">
        <div class="scry-enc-row">
          <span class="scry-enc-label">Encumbrance</span>
          <span class="scry-enc-value">${enc.value} / ${enc.max} lb</span>
        </div>
        <div class="scry-enc-bar ${warnClass}">
          <div class="scry-enc-fill" style="width:${pct}%"></div>
        </div>
      </section>`;
  }

  _buildEquipment(equipment) {
    if (!equipment.length) {
      return `<div class="scry-equipment-list"><p class="scry-empty">No equipment.</p></div>`;
    }

    const TYPE_ORDER  = ["weapon","equipment","consumable","loot","tool","container","backpack"];
    const TYPE_LABELS = {
      weapon:"Weapons", equipment:"Equipment", consumable:"Consumables",
      loot:"Loot", tool:"Tools", container:"Containers", backpack:"Containers",
    };

    const containers   = equipment.filter(i => i.isContainer);
    const containedIds = new Set(containers.flatMap(c => c.contents.map(x => x.id)));
    const standalone   = equipment.filter(i => !i.isContainer && !containedIds.has(i.id));

    // Group standalone by type
    const byType = {};
    for (const item of standalone) {
      if (!byType[item.type]) byType[item.type] = [];
      byType[item.type].push(item);
    }

    let html = `<div class="scry-equipment-list">`;

    for (const t of TYPE_ORDER) {
      if (!byType[t]?.length) continue;
      html += `<div class="scry-gear-type-header">${TYPE_LABELS[t] ?? t} <span class="scry-gear-type-count">${byType[t].length}</span></div>`;
      for (const item of byType[t]) html += this._buildGearRow(item);
    }

    // Containers
    for (const container of containers) {
      html += `
        <div class="scry-container">
          <div class="scry-container-header" data-container-id="${container.id}">
            <img class="scry-item-img" src="${container.img ?? "icons/svg/chest.svg"}" alt="">
            <span class="scry-gear-name">${container.name}</span>
            <span class="scry-container-count">${container.contents.length} items</span>
            <span class="scry-expand-icon">▼</span>
          </div>
          <div class="scry-container-body" data-container-id="${container.id}">
            ${container.contents.map(c => this._buildGearRow(c, true)).join("")}
          </div>
        </div>`;
    }

    html += `</div>`;
    return html;
  }

  _buildGearRow(item, nested = false) {
    const equippable = item.equipped !== undefined && !item.isContainer;
    const equipBtn = equippable
      ? `<button class="scry-equip-toggle scry-btn-sm ${item.equipped ? "equipped" : ""}"
                data-item-id="${item.id}">${item.equipped ? "Eq" : "—"}</button>`
      : "";
    const qty = item.quantity ?? 1;
    const qtyHtml = `
      <div class="scry-qty-ctrl">
        <button class="scry-qty-btn" data-item-id="${item.id}" data-delta="-1">−</button>
        <span class="scry-qty-val">${qty}</span>
        <button class="scry-qty-btn" data-item-id="${item.id}" data-delta="1">+</button>
      </div>`;

    // Container move button — shown when containers exist and this isn't itself a container
    const containerBtn = !item.isContainer && this._containers.length > 0
      ? `<button class="scry-container-btn scry-btn-sm ${nested ? "in-container" : ""}"
               data-item-id="${item.id}" title="${nested ? "Remove from container" : "Move to container"}">📦</button>`
      : "";

    return `
      <div class="scry-gear-row ${nested ? "nested" : ""}" data-item-id="${item.id}">
        <img class="scry-item-img" src="${item.img ?? "icons/svg/item-bag.svg"}" alt="">
        <div class="scry-gear-info">
          <span class="scry-gear-name">${item.name}</span>
        </div>
        ${qtyHtml}
        ${equipBtn}
        ${containerBtn}
      </div>`;
  }

  async _showContainerPicker(itemId, isNested, actor) {
    const item = actor.items.get(itemId);
    if (!item) return;

    const containers = actor.items.filter(i => i.type === "backpack" || i.type === "container");
    if (!containers.length) return;

    const currentContainer = item.system.container;

    if (isNested) {
      // Item is already in a container — just remove it
      await item.update({ "system.container": null });
      return;
    }

    const buttons = [
      ...containers.map(c => ({
        label: c.name,
        className: "scry-modal-btn-primary",
        callback: async ({ closeModal }) => {
          closeModal();
          await item.update({ "system.container": c.id });
        }
      })),
      { label: "Cancel" }
    ];

    game.scry?.view?._openScryModal?.({
      title: `Move ${item.name}`,
      bodyHtml: `<p class="scry-modal-desc">Move to which container?</p>`,
      buttons,
    });
  }

  _editCurrency(coin, actor) {
    const current = actor.system.currency?.[coin] ?? 0;
    const view = game.scry?.view;
    if (!view?._openScryModal) return;
    const { backdrop } = view._openScryModal({
      title: `Edit ${coin.toUpperCase()}`,
      bodyHtml: `<input type="number" id="scry-currency-input" class="scry-modal-num-input" value="${current}">`,
      buttons: [
        {
          label: "Set",
          className: "scry-modal-btn-primary",
          callback: ({ backdrop, closeModal }) => {
            const val = parseInt(backdrop.querySelector("#scry-currency-input")?.value ?? "");
            if (!isNaN(val)) {
              closeModal();
              actor.update({ [`system.currency.${coin}`]: Math.max(0, val) });
            }
          }
        },
        { label: "Cancel" }
      ]
    });
    setTimeout(() => {
      const input = backdrop.querySelector("#scry-currency-input");
      input?.focus();
      input?.select();
    }, 50);
  }

  async _changeQty(itemId, delta, actor) {
    const item = actor.items.get(itemId);
    if (!item) return;
    const newQty = Math.max(0, (item.system.quantity ?? 1) + delta);
    await item.update({ "system.quantity": newQty });
  }

  async _toggleEquip(itemId, actor) {
    const item = actor.items.get(itemId);
    if (!item) return;
    await item.update({ "system.equipped": !item.system.equipped });
  }

  _showDescription(itemId, actor) {
    const item = actor.items.get(itemId);
    if (!item) return;
    game.scry?.view?._openScryModal?.({
      title: item.name,
      bodyHtml: `<div class="scry-modal-desc">${item.system.description?.value ?? "No description."}</div>`,
    });
  }
}
