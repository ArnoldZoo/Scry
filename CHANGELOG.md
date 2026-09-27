# Changelog

Newest first. Built from the commit history; each entry says what changed and what was tested.

## 2.5.17 - 2026-09-26

SonarQube fixes. First scan: 1 bug, 171 code smells. Now 0 bugs and A on security, reliability and maintainability.

- Ping with no ping API pans to the tapped spot. A failed pan was never caught, because the pan is async; it is handled now.
- Code tidied for the scan (nested ternaries, class fields, unused variable, duplicate tab-bar builder). No change at the table.

Testing: 177 automated tests pass, 94.8% coverage in SonarQube. Tested on the live server with the 2.5.17 deploy (FND 1.2.03).

## 2.5.16 - 2026-09-26

Cleanup ahead of the first SonarQube scan.

- The initiative pad now adds up its numbers with a small parser instead of running the typed text as code. Same answers, except a number typed with a leading zero: "0 7 + 2" used to enter 7 and now enters 9.
- Failures that were silently ignored now log at debug level, or say why the fallback is safe.
- The nav panel's zoom uses Math.clamp; Foundry deprecated Math.clamped.
- Removed tab-home.js. Nothing had loaded it since 2.0.00.
- Automated tests added (npm test). They are not part of the module download.

Testing: 177 automated tests pass, 99.6% line coverage. Tested on the live server with the 2.5.17 deploy (FND 1.2.03).

## 2.5.15 - 2026-09-26

Comment pass on scripts and stylesheets.

- Code comments cleaned up to say why, not what. No code changes.

Testing: all scripts pass a syntax check. Tested on the live server with the 2.5.17 deploy (FND 1.2.03).

## 2.5.14 - 2026-09-26

Release licence, credits and copyright headers.

- New LICENSE: install and use in your own games, no redistribution or resale. The playtest-only term is gone.
- Credits are Loremaster and ArcaneLogix. Artwork, font and icon credits added to LICENSE.
- module.json gets the changelog link, dnd5e verified 5.2.4, and a plain description.
- Copyright line at the top of every script and stylesheet. No code changes.

Testing: header and text changes only; all scripts pass a syntax check. Tested on the live server with the 2.5.17 deploy (FND 1.2.03).

## 2.5.13 - 2026-09-26

Clear the low-resolution warning already on screen.

- Foundry can raise its 1024x768 warning before Scry loads, so the warning stayed up on some phones. Scry now clears any that are already showing, and again when the phone rotates.
- The warning on the /join login page can't be removed by any module; Foundry doesn't load modules there.

Testing: tested on the live server.

## 2.5.12 - 2026-07-26

First public release for playtesters.

- Install by manifest URL from the GitHub release.
- All-rights-reserved LICENSE and copyright headers on all source files.

Testing: tested on the live server.

## 2.5.11 - 2026-06-18

Actor switcher.

- If you own more than one actor, the portrait glows. Tap it to pick another character and the whole sheet rebuilds as that actor.
- Action pips are remembered per character, and the choice survives a reload.
- Walk and target follow the switched actor's token, with a warning if it has no token on the scene.

Testing: tested on the live server.

## 2.5.10 - 2026-06-17

Canvas combat overhaul.

- Canvas taps work again. PIXI v8 was swallowing them, so Scry listens at the document level.
- Fixed the grey block over the canvas when entering Table view.
- Attacking or casting with no target opens the map in target mode, then returns you to the tab you came from.
- Target reticule on targeted tokens, and targets are restored if something else clears them.
- Enter mode weapon attacks use the Scry number pad instead of a Foundry dialog.
- End Turn button on the canvas bar during your turn.
- Default canvas zoom pulled further out; Fit All Tokens sizes to the real token bounds.

Testing: tested on the live server.

## 2.5.00 - 2026-06-02

Beyond template.

- New Beyond template with Dark, Light and Parchment themes, crest ability badges, HP pill and a traits description modal.
- Prepared-spell fix for the dnd5e 5.x preparation data.
- Credits renamed to Loremaster and ArcaneLogix.

Testing: tested on the live server.

## 2.4.00 - 2026-05-31

Foundry template themes and waypoint walk.

- More Foundry template themes.
- Walk with TableOS installed uses waypoint pathing with a green/yellow/red cost preview, and draws a walk icon on your token.
- Walk graphics are cleaned up properly when you leave walk mode.

Testing: tested on the live server.

## 2.3.16 - 2026-05-30

Foundry template and journals.

- New Foundry template (Classic, Modern, Enhanced): portrait panel, nav rail, combat strip.
- Journal reader with starring, and page editing that works on a phone.
- Gear shows weapons, handles dnd5e 5.2.4 containers, and can move items into containers.
- Character tab trimmed to abilities, saves and skills; features moved to a new Traits tab.

Testing: tested on the live server.

## 2.2.00 - 2026-05-28

Fix CSS loading.

- Template stylesheets load through @import from scry.css, which fixes stale CSS after an update.

Testing: tested on the live server.

## 2.1.00 - 2026-05-28

Template architecture.

- CSS split into Core, Anvil, Foundry and shared files so each template carries its own layout.

Testing: tested on the live server.

## 2.0.00 - 2026-05-27

Multi-theme framework.

- Themes Cobalt, Atlas, Slate, Nomad, Cipher and Forge. Old theme names still work.
- Description popups on actions and gear; fixed taps on the Spells and Gear tabs after a refresh.

Testing: tested on the live server.

## 0.5.03 - 2026-05-25

Enter mode rewrite.

- Enter mode takes your real d20 roll and hides the damage field when Auto Dmg is on.
- Roll and Enter modes skip the Foundry and midi-qol dialogs.
- Auto Bonus adds the to-hit bonus to a typed roll.
- Table button returns to the canvas when Table view is already open.

Testing: tested on the live server.

## 0.5.02 - 2026-05-25

Table view touch controls.

- Tap to target and tap to walk work on phones and tablets.
- Walk uses TableOS pathfinding when TableOS is installed.
- Attack and spell fixes for dnd5e 5.x.

Testing: tested on the live server.

## 0.1.00 - 2026-05-23

First build.

- Full-screen character sheet for phones and tablets, with the first theme and a responsive layout.

Testing: tested on the live server.
