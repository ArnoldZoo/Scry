# TableOS Scry — Mobile Player Companion

> **Rough draft — first pass.** Written quickly so playtesters have something to work
> from. Expect typos, missing bits, and a couple of "I think" statements. If something
> in here doesn't match what you actually see on your phone, **the phone is right and
> this doc is wrong** — please tell me so I can fix it.
>
> Version this was written against: **v2.5.12 / FND 1.2.01**

---

## What it is

Scry is a Foundry VTT module for **in-person games**. Everybody's sitting at a real
table, the map is on a TV or a projector, and nobody wants to hunch over a laptop to
roll an attack. So each player brings a phone or tablet, logs into Foundry on it, and
Scry replaces the whole Foundry UI with a full-screen, touch-sized character sheet.

You can roll attacks and saves, cast spells, spend HP, track your action economy,
read journals, and drive your token on the map — all from the phone. The GM keeps
running Foundry normally on the big screen.

It's built for **dnd5e** (tested on 5.2.4) on **Foundry v13**.

It's part of a bigger thing called TableOS, but Scry works fine on its own. If TableOS
happens to be installed, Scry uses it for better player/table detection

---

## Requirements

- Foundry VTT **v13** (v13 is minimum AND the only version I've verified)
- **dnd5e** system, 3.0.0 or newer (I test on 5.2.4)
- A phone or tablet with a modern browser. Chrome/Safari both fine.
- TableOS module — **optional**, not required

Things that are NOT required: no server-side install, no companion app, no accounts,
nothing to sign up for.

---

## Install

Foundry → **Add-on Modules** → **Install Module** → paste this into the
*Manifest URL* box at the bottom:

```
https://github.com/ArnoldZoo/Scry/releases/latest/download/module.json
```

Then enable **TableOS Scry** in your world's module settings.

**Only the GM installs it.** Players don't install anything — they just log into your
Foundry world from their phone browser like normal.

> ⚠️ Back up your world before installing. This is playtest software. It shouldn't
> touch your data (it reads actors, it doesn't restructure anything), but back up
> anyway.

---

## Setup — GM side, do this once

Scry does **not** turn itself on for everyone. You tell it which players are on
personal devices.

1. Have your players log in at least once so Foundry knows about them.
2. Open the Scry settings — either **Game Settings → Configure Settings → TableOS
   Scry**, or from inside Scry itself via **Tools → Settings**.
3. You get a list of every non-GM player. Each one gets a dropdown:

   | Option | What it does |
   |---|---|
   | **No Scry** | Player gets normal Foundry. Use this for anyone on a laptop. |
   | **Auto-detect** | Scry looks at their screen width and picks phone or tablet. |
   | **Phone** | Force phone layout. |
   | **Tablet** | Force tablet layout. |

4. That's it. Next time that player refreshes, Scry takes over their screen.

Other settings worth knowing:

- **Default Theme** (world) — the look every player gets unless they pick their own.
- **My Theme (Scry)** (per-device) — a player's personal override. Set from the phone.
- **Tablet Width Threshold** — px width where Auto-detect calls it a tablet.
  Default 768.

If you're running TableOS too, any user flagged as `ir-table` (i.e. the table screen
itself) is automatically excluded from Scry. You don't have to do anything.

---

## Themes and templates — this part confuses people

There are **templates** and there are **themes**, and they're not the same thing.

A **template** is an entirely different HTML layout. A **theme** is a colour scheme
that belongs to one of those templates. Picking a theme is how you pick a template —
there's no separate "choose layout" control.

| Template | Themes in it | Layout | Status |
|---|---|---|---|
| **Core** | Cobalt, Atlas, Slate, Nomad, Cipher | Top header + tab bar across the bottom | Done |
| **Foundry** | Classic, Modern, Frost | Portrait panel down the left + icon nav rail down the right | Done |
| **Foundry-Enhanced** | Nightfall, Twilight, Crystal, Vellum, Amber | same as Foundry, more palettes | Done |
| **Beyond** | Beyond Dark, Beyond Light, Beyond Parchment | D&D-Beyond-ish header + HP pill + bottom tab bar | Done |
| **Anvil** | Forge, Brass, Parchment | hammered-metal look | **NOT BUILT YET** — colours exist, layout doesn't. Don't playtest these, they'll look broken. |

### Changing your theme (player, on the phone)

**Tools → Theme.** You get a scrolling list grouped by template, each row with a
colour swatch. Tap one, it applies immediately. Your pick is saved to that device
only — it doesn't affect anyone else, and the GM's default stops applying to you.

Switching *within* a template family is instant. Switching *across* families (say
Cobalt → Frost) tears the whole sheet down and rebuilds it, so you'll see a blink.
That's expected.

> Known bug: the theme dropdown in Foundry's own Settings window is out of date —
> it still lists "Enhanced" and is missing Frost/Nightfall/Twilight/Crystal/Vellum/
> Amber. Use the in-Scry theme picker instead, that one's current. On the fix list.

---

## The tabs

Same five content tabs on every template, just arranged differently. Core and Beyond
put them on a bottom bar; Foundry puts them on the right-hand rail.

### ⚡ Actions

The main combat tab and the busiest screen in the app.

- **Economy tiles** at the top — Action / Bonus / Reaction, shown as pips. Tap to
  spend, tap again to give back. Movement has its own pip row.
- **Category chips** filter the list below (weapons, features, consumables, etc).
- Every attack row shows your to-hit and damage.
- **Roll mode vs Enter mode** — Roll mode rolls the dice for you. Enter mode lets you
  type in a number you rolled with real dice, which is the whole point of playing in
  person. Toggle at the top.
- **Auto Dmg / Auto Bonus** toggles — auto-apply damage, auto-add bonuses.
- Full midi-qol attack pipeline is wired in if you have it.
- **Status conditions panel** lives here too (the shield button opens straight to it).

### Spells

Grouped by level with slot pips per level. Cast/Enter modes same as Actions. Tap a
spell name for the description in a modal. Prepared/unprepared handled. Cantrips
don't eat slots, obviously.

###  Gear

Everything you're carrying, split into Weapons / Equipment / Consumables / Loot.

- Equip toggle per item
- Quantity +/−
- Currency editor (tap the coins)
- Encumbrance readout
- **Containers** expand and collapse; the 📦 button moves an item into one

### Character

Ability scores with a roll/enter toggle, saving throws, skills with passives, hit
dice.

On the **Foundry and Beyond templates this tab is trimmed** — it's just abilities,
saves, and skills, because features moved to Traits. On Core, everything's still on
this one tab.

###  Traits

Foundry/Beyond only. Class features, racial traits, feats, proficiencies, languages,
plus personality/ideals/bonds/flaws down the bottom. Features with limited uses get a
**Use** button that burns a charge.

### Table

Not a tab exactly — this one drops you onto the map. See below.

---

## HP, rest, and the rest of the portrait panel

Depending on template these buttons are on the portrait panel (Foundry), the header
(Core), or the HP pill area (Beyond), but they do the same things:

- **DMG / HEAL / TMP** — opens a number pad. Type an amount, confirm. Temp HP is
  tracked separately.
- **STATUS** — conditions panel (jumps to the Actions tab, status view)
- **REST** — short or long rest modal. Short rest shows your remaining hit dice per
  class with a Roll button; long rest does the full HP + slot restore. Calls the real
  dnd5e rest functions, so anything your system does on rest still happens.
- **INSP** — toggles inspiration on/off
- **INIT** (the diamond badge) — rolls initiative and adds you to combat if you
  weren't in it

### Switching characters

If you own more than one actor, **your portrait gets a glowing ring — tap it**. You
get a picker of everything you own with portrait, class and HP. Tap another one and
the entire sheet rebuilds as that character.

Action pips are remembered per character, so switching back and forth mid-combat
doesn't lose your economy. Your selection survives a page reload. The canvas stuff
(walk/target) follows whoever you've switched to, and warns you if that actor has no
token on the current scene.

---

## Table Tools (the ≡ Tools button)

Floating panel. Press the button again to close it.

| Button | What it does |
|---|---|
| 📖 **Journal** | Journal picker — see below |
| 🎒 **Items** | Shortcut to the Gear tab |
| 💾 **Macros** | Your hotbar macros + any macro you own. Tap to fire it. |
| 🎨 **Theme** | Theme picker |
| ⚙️ **Settings** | Opens Foundry's Game Settings window (GM device assignment lives here) |

**During combat only**, three more appear:

| Button | What it does |
|---|---|
| ← **Prev** | Steps combat back a turn |
| **Hold** | Marks you as holding |
| **End Turn** (red) | Ends your turn |

---

## Journals

### Reading

**Tools → Journal.** Vertical scrolling list of every journal you have permission to
see. Tap a row to open it.

Tap the **star** on a row to favourite it — starred journals sort to the top and stick
around between sessions (stored in that browser's localStorage, so it's per-device and
per-browser, not per-character).

The reader is themed to match your sheet and has prev/next page arrows for multi-page
entries.

### Editing

If you own the page there's a **pencil** button. Editing works like this:

1. Reader closes and the Scry overlay hides
2. Foundry's real page editor opens full-screen with no sidebar (this is the part that
   makes it usable on a phone)
3. A **"Return to Scry"** bar appears at the top
4. Tap that when you're done and you land back in the reader where you left off

**To add a whole new page**, hit the pencil and the full journal sheet opens — from
there you pinch-zoom to reach "Add Page". It's awkward. Creating new journals is
really a GM-on-a-desktop job; Scry is aimed at reading and quick edits.

---

## Table view (playing on the map)

Hit the **Table** button. Scry gets out of the way, you see the actual Foundry canvas,
and a control bar appears at the bottom.

| Button | Mode |
|---|---|
| ← **Scry** | Back to your sheet |
| 🎯 **Target** | Tap a token to target it |
| 🚶 **Walk** | Tap where you want to go |
| ✊ **Actions** | Jump to Actions without leaving the map |
| 🎩 **Spells** | Same for Spells |
| 🖥 **Nav** | Screen navigation / pan-zoom |
| 📍 **Ping** | Tap the map to ping that spot for everyone |
| 📏 **Ruler** | Two taps = measure between them |

During your turn there's also an **End Turn** button on this bar.

### About Walk

**With TableOS installed** you get the good version: A* pathfinding with waypoints, the
path colour-coded green/yellow/red by how much movement it costs, an auto star marker
at your speed limit, and a live distance readout. Your token auto-selects when you
press Walk, and tapping your own token cancels the path. A little white walking figure
is drawn on your token while walk mode is on.

**Without TableOS** it falls back to a plain grid-snapped move to wherever you tapped.
Functional, no pathing.

---

## Combat

- Core template: turn indicator strip in the header
- Foundry template: **combat strip** in the portrait panel — current combatant's
  portrait, name, HP, and the turn timer
- End Turn is available from Table Tools, and from the table view bar
- Initiative rolls from the INIT diamond

---

## Known rough edges

Honest list. None of these are "it's broken", they're "it's not finished".

- **Anvil themes (Forge / Brass / Parchment) have no layout.** They're colour
  variables only. Pick them and you'll get a mess. Skip them for now.
- The theme list in Foundry's Settings window is stale (see the Themes section).
- **Settings → the Foundry Game Settings dialog** occasionally throws a
  `_updatePosition` error on v13 during async render. It still opens. Shelved.
- **Classic theme on the Core layout** looks off — Classic really belongs to the
  Foundry template now.
- Everything is dnd5e-only. Other systems will not work, they'll probably just fail
  to render.
- Only tested against Foundry v13. Do not try v12.

## Not built yet

- Anvil template (Phase 3)
- **AI Rules Assistant** (Phase 4) — a standalone page for mid-session rules questions
  ("can I counterspell a counterspell?"), player brings their own API key, answers
  grounded in the SRD. Not started.

---

## For playtesters — what I actually want to know

You are the first people to touch this outside my own table. Assume nothing is too
small to mention.

Most useful reports, roughly in order:

1. **Anything that stops you playing.** Sheet won't load, button does nothing, roll
   goes to the wrong place.
2. **Anything you couldn't find.** If you went looking for a feature and couldn't
   work out where it lived, that's a design bug on me, not a you problem.
3. **How it feels on your specific device.** Text too small? Buttons too close
   together? Have to zoom? Tell me your phone model and screen size.
4. **Theme readability** — especially the light ones (Atlas, Crystal, Vellum, Beyond
   Light, Beyond Parchment) in a dimly-lit room, and the dark ones in daylight.
5. **The Enter-a-roll flow.** This is the whole reason the module exists — you roll
   real dice, you type the number in. If that flow is clunky I want to hear it.

When something goes wrong, if you can grab it:

- what you tapped, and what you expected vs what happened
- your theme name
- the **version badge** — Foundry template shows it at the bottom of the portrait
  panel, like `v2.5.12 · FND 1.2.01`. Always include this, it tells me which build
  you're on.
- browser console errors if you know how to get them (you probably don't on a phone,
  that's fine, skip it)

File it at https://github.com/ArnoldZoo/Scry/issues or just message me directly.

---

## Credits and license

Author: **DudleyDoRight**
Coder: **ArnoldZoo**

Copyright © 2026 ArcaneLogix. All rights reserved. **This is not open source.** The
source is public so you can playtest it and see what you're installing. You may
install and play with it; you may not redistribute it, fork it, or sell it. Full
terms in [LICENSE](LICENSE).

Not affiliated with or endorsed by Foundry Gaming LLC, Wizards of the Coast, or D&D
Beyond. Contains no WotC content — it reads whatever's in your own world.

---

*TODO for me, ignore: screenshots of each template, GIF of the walk system, short
"first 5 minutes" quickstart at the top, proper troubleshooting section.*
