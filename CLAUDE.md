# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

No build step required — open `index.html` directly in a browser, or serve locally:

```bash
python -m http.server 8080
# or
npx serve .
```

No package.json, no dependencies, no linting or test configuration.

## Architecture

This is a zero-dependency vanilla JS save file editor for the game Gold River. All logic lives in three files:

- **`app.js`** — Single `SaveEditor` class (~845 lines) containing all parsing, rendering, state, and export logic
- **`index.html`** — Static shell with a textarea for JSON input, player card container, and transfer modal
- **`styles.css`** — Retro cold-war terminal aesthetic; CSS variables define the color scheme

### Data Flow

1. User pastes Unreal Engine 5 save JSON (converted from `.sav` via `uesave`) → `parseSave()`
2. Players extracted from `properties.PlayerSaves_*` array by prefix matching
3. Each player's gear lives under their `EquipmentSave_*` key
4. UI renders player cards with four tabs: Inventory, Equipment, Weapons, Storage
5. Clicking an item opens the transfer modal → user picks target player/inventory → `confirmTransfer()`
6. Changes update both the parsed player objects AND the raw `this.saveData` JSON in-place
7. Export stringifies the full `saveData` and downloads it as JSON

### Save File JSON Structure

Property keys use Unreal Engine format `PropertyName_Index_GUID_0` — GUIDs are consistent within a single save but differ across saves. The code uses prefix matching (e.g. `key.startsWith('PlayerSaves_')`) to handle this.

```
root.properties.PlayerSaves_* → array of player objects
  player.EquipmentSave_* →
    Inventory_*         → main inventory items
    EquipmentSlots_*    → 13 equipment slots
    WeaponSlots_*       → 4 weapon slots
    OtherInventorys_*   → attached containers (backpacks, pockets)
```

### Key State (`this.*`)

- `saveData` — raw parsed JSON, mutated in-place on all edits
- `players[]` — parsed player objects with normalized references
- `selectedItem / selectedPlayerIndex / selectedInventoryType / selectedItemIndex` — transfer source tracking

### Sample Saves

`GR_Saves/` is gitignored. `loadSample()` fetches `GR_Saves/Nick-Jimmy-Base_1.json` — this only works when served over HTTP, not via `file://`.
