# TableOS Scry - Mobile Player Companion

Scry is a Foundry VTT module for **in-person games**. Everybody's sitting at a real table, the map is on a TV or a projector, and nobody wants to hunch over a laptop to roll an attack. Each player logs into Foundry on a phone or tablet, and Scry replaces the Foundry UI with a full-screen, touch-sized character sheet. The GM keeps running Foundry normally on the big screen.

## What it does

- Roll attacks, saves and checks, or type in what you rolled on real dice (Enter mode). Playing with real dice is the reason this exists.
- Cast spells with slot tracking, and place area templates with a touch D-pad.
- Damage, heal and temp HP from a number pad; short and long rest with the real dnd5e rest functions.
- Action / Bonus / Reaction and movement pips, remembered per character.
- Gear with equip, quantity, currency, encumbrance and containers.
- Read journals, and edit your own pages in Foundry's editor full-screen.
- Table view: target, walk, ping and measure on the real map by tapping.
- Switch between characters you own by tapping your portrait.
- Three layouts and 16 themes. Each player picks their own on their own device.

## Requirements

- Foundry VTT v13 (verified on v13). Do not try v12.
- D&D 5e system 3.0.0 or newer (verified on 5.2.4). Other systems will not render.
- A phone or tablet with a current browser. Chrome and Safari both work.
- Optional: TableOS - keeps the table screen user off Scry, adds pathfinding to Walk, and shows the TableOS turn timer on the phone.

Nothing else is needed: no server-side install, no app, no accounts.

## Install

In Foundry, **Add-on Modules > Install Module**, paste this manifest URL, then **Install**:

```
https://github.com/ArnoldZoo/Scry/releases/latest/download/module.json
```

Enable **TableOS Scry** in your world under **Manage Modules**.

**Only the GM installs it.** Players don't install anything. They log into your world from the phone browser like normal.

Back up your world before installing. Scry reads actors and doesn't restructure anything, but back up anyway.

## Setup (GM, once)

Scry does **not** turn itself on for everyone. You tell it which players are on personal devices.

1. Have your players log in at least once so Foundry knows about them.
2. Open the Scry settings: **Game Settings > Configure Settings > TableOS Scry > Device Assignments**, or from inside Scry with **Tools > Settings**.
3. Every non-GM player gets a dropdown:

   | Option | What it does |
   | --- | --- |
   | **No Scry** | Normal Foundry. Use this for anyone on a laptop. |
   | **Auto-detect** | Scry looks at the screen width and picks phone or tablet. |
   | **Phone** | Force the phone layout. |
   | **Tablet** | Force the tablet layout. |

4. Next time that player refreshes, Scry takes over their screen.

With TableOS installed, any user TableOS marks as the IR table (the table screen itself) is left out of Scry automatically.

## Settings

| Setting | What it does |
| --- | --- |
| Device Assignments | GM. Which players get Scry, and phone or tablet layout. |
| Default Theme | GM, world. The theme every player gets unless they pick their own. |
| My Theme (Scry) | Player, this device only. A personal override, set from the phone. |
| Tablet Width Threshold (px) | GM, world. Screen width where Auto-detect calls it a tablet. Default 768. |

## How to use it

### Templates and themes

A **template** is a different layout. A **theme** is a colour scheme that belongs to one template. Picking a theme is how you pick a template; there is no separate layout control.

| Template | Themes | Layout |
| --- | --- | --- |
| Core | Cobalt, Atlas, Slate, Nomad, Cipher | Top header, tab bar across the bottom |
| Foundry | Classic, Modern, Frost | Portrait panel on the left, icon nav rail on the right |
| Foundry-Enhanced | Nightfall, Twilight, Crystal, Vellum, Amber | Same as Foundry, more palettes |
| Beyond | Beyond Dark, Beyond Light, Beyond Parchment | D&D Beyond style header, HP pill, bottom tab bar |
| Anvil | Forge, Brass, Parchment | Not built yet. Colours only, no layout. Don't use these. |

To change your theme on the phone: **Tools > Theme**. Tap a row and it applies straight away, on that device only. Switching within a template is instant. Switching to another template (say Cobalt to Frost) rebuilds the sheet, so you'll see a blink.

### The tabs

The same content tabs on every template. Core and Beyond put them on a bottom bar; Foundry puts them on the right-hand rail.

**Actions.** The combat tab.

- Action / Bonus / Reaction pips at the top. Tap to spend, tap again to give it back. Movement has its own pip row.
- Category chips filter the list (weapons, features, consumables and so on). Every attack shows to-hit and damage.
- **Roll** mode rolls for you. **Enter** mode lets you type in what you rolled on real dice.
- **Auto Dmg** applies damage automatically. **Auto Bonus** adds bonuses automatically.
- Works with the midi-qol attack pipeline if you have it.
- The status conditions panel is here too; the STATUS button opens straight to it.

**Spells.** Grouped by level with slot pips. Roll and Enter modes work as on Actions. Tap a spell for its description. Cantrips don't use slots.

**Gear.** Weapons, Equipment, Consumables and Loot. Equip toggle, quantity +/-, currency editor (tap the coins), encumbrance, and containers that expand and collapse, with a button to move an item into one.

**Character.** Ability scores with roll/enter, saving throws, skills with passives, hit dice. On the Foundry and Beyond templates this tab is only abilities, saves and skills; features are on Traits. On Core everything is on this tab.

**Traits.** Foundry and Beyond only. Class features, racial traits, feats, proficiencies, languages, and personality, ideals, bonds and flaws. Features with limited uses get a **Use** button that spends a charge.

**Table.** Not a tab; it drops you onto the map. See Table view below.

### HP, rest and initiative

These sit on the portrait panel (Foundry), the header (Core) or the HP pill (Beyond), and do the same thing everywhere:

- **DMG / HEAL / TMP** open a number pad. Temp HP is tracked separately.
- **STATUS** opens the conditions panel.
- **REST** opens short or long rest. Short rest shows your remaining hit dice per class with a Roll button; long rest restores HP and slots. It calls the real dnd5e rest, so anything your system does on rest still happens.
- **INSP** toggles inspiration.
- **INIT** (the diamond) rolls initiative and adds you to combat if you weren't in it.

### Switching characters

If you own more than one actor, your portrait gets a glowing ring. Tap it for a picker of every actor you own, with portrait, class and HP. Tap another one and the sheet rebuilds as that character. Action pips are kept per character, and your pick survives a reload. Walk and target follow the character you switched to, and warn you if it has no token on the current scene.

### Table Tools

The **Tools** button opens a floating panel. Press it again to close.

| Button | What it does |
| --- | --- |
| Journal | Journal picker, see below |
| Items | Goes to the Gear tab |
| Macros | Your hotbar macros and any macro you own. Tap to run it. |
| Theme | Theme picker |
| Settings | Foundry's Game Settings window (GM device assignment is here) |

During combat three more appear: **Prev** steps combat back a turn, **Hold** marks you as holding, and **End Turn** ends your turn.

### Journals

**Tools > Journal** lists every journal you can see. Tap a row to open it. Tap the star to favourite it; starred journals sort to the top. Stars are saved in that browser, so they are per device, not per character. The reader matches your theme and has page arrows for multi-page entries.

If you own the page there's a **pencil** button:

1. The reader closes and Scry steps aside.
2. Foundry's own page editor opens full-screen with no sidebar, which is what makes it usable on a phone.
3. A **Return to Scry** bar shows at the top. Tap it when you're done and you're back in the reader where you left off.

Adding a new page means pinch-zooming to Foundry's "Add Page" in the full journal sheet. It's awkward; new journals are really a GM-at-a-desk job.

### Table view

Tap **Table**. Scry gets out of the way, you see the Foundry canvas, and a control bar shows at the bottom.

| Button | What it does |
| --- | --- |
| Scry | Back to your sheet |
| Target | Tap a token to target it |
| Walk | Tap where you want to go |
| Actions | Actions without leaving the map |
| Spells | Spells without leaving the map |
| Nav | Pan and zoom |
| Ping | Tap the map to ping that spot for everyone |
| Ruler | Two taps measure the distance between them |

On your turn the bar also has **End Turn**.

**Walk with TableOS installed** uses pathfinding with waypoints. The path is coloured green, yellow or red by movement cost, with a marker at your speed limit and a live distance readout. Your token is selected when you press Walk, and tapping your own token cancels the path. **Without TableOS** Walk moves your token straight to the grid square you tapped.

### Combat

- Core: a turn indicator in the header.
- Foundry: a combat strip in the portrait panel with the current combatant's portrait, name, HP and the turn timer.
- End Turn is on Table Tools and on the Table view bar. Initiative rolls from the INIT diamond.

## Known issues

- Anvil themes (Forge, Brass, Parchment) have no layout yet. Skip them.
- The theme dropdown in Foundry's own Settings window is out of date: it still lists "Enhanced" and is missing Frost, Nightfall, Twilight, Crystal, Vellum and Amber. Use the Scry theme picker (**Tools > Theme**) instead.
- Classic looks off on the Core layout. It belongs with the Foundry template.
- The Foundry Game Settings window can log an `_updatePosition` error on v13 when opened from Scry. It still opens.
- Foundry shows its "screen too small" warning on the /join login page. Modules don't load on that page, so Scry can't remove it. It's advisory only; once you're in the game Scry clears it.

## Support

Report bugs and ask for features at https://github.com/ArnoldZoo/Scry/issues.

Include:

- what you tapped, what you expected, and what happened
- your theme name
- the version badge from the bottom of the portrait panel (Foundry template), for example `v2.5.15 · FND 1.2.02`
- your phone or tablet model
- browser console errors, if you can get them

## Credits and license

Made by Loremaster, ArcaneLogix - https://arcanelogix.com

Copyright (c) 2026 ArcaneLogix. All rights reserved. You may install and use it in your own games; you may not copy, redistribute or sell it. See [LICENSE](LICENSE).

Artwork by graphic designers subcontracted through Fiverr. No AI-generated art. Fonts and icons (Signika, Roboto, Font Awesome) are the ones Foundry already loads; see LICENSE.

Not affiliated with or endorsed by Wizards of the Coast, D&D Beyond or Foundry Gaming LLC. Scry contains no Wizards of the Coast content; it reads what's in your own world.

Changes by version: [CHANGELOG](CHANGELOG.md)
