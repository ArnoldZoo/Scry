// Copyright (c) 2026 ArcaneLogix. All rights reserved. See LICENSE.
/*
Module: TableOS Scry - Mobile Player Companion
Component: templates/foundry/foundry-tab-character.js
Purpose: Scry-FOUNDRY Character tab: ability scores, saving throws, skills only.
         Features, feats, proficiencies and languages live in the Traits tab.

Author: Loremaster
Coder: ArcaneLogix
Revision: FND 1.2.01
*/

import { TabCharacter } from "../../tabs/tab-character.js";

export class FoundryTabCharacter extends TabCharacter {
  render(data) {
    return `
      <div class="scry-tab-character">
        ${this._buildAbilityScores(data.abilities, data.inspiration)}
        ${this._buildRollModeBar()}
        ${this._buildSavingThrows(data.abilities)}
        ${this._buildSkills(data.skills)}
      </div>`;
  }
}
