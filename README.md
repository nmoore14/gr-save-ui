# ☢ GR // Field Terminal
### Gold River Save Editor

A browser-based save file editor for **Gold River** — a cooperative wilderness survival and mystery-solving game set across abandoned campgrounds, secret Cold War nuclear bunkers, and classified underwater research facilities.

Edit player vitals, inspect inventories, and redistribute items and equipment between survivors — all without touching raw JSON.

---

## Features

- **Decode any save** — paste your Gold River save JSON and parse the full session state
- **Edit vitals** — adjust Health, Hunger, and Thirst for any player
- **View all inventory types** — Main Inventory, Equipment Slots, Weapon Slots, and container/storage inventories (backpacks, pockets, etc.)
- **Transfer items between players** — copy or move any item from one survivor's inventory or storage cache to another's
- **Transfer equipment & weapons** — copy or move equipped gear between players' equipment and weapon slots
- **Export modified save** — download the edited file, ready to drop back into your save folder

---

## How to Use

### 1. Get Your Save File

Gold River saves are stored as `.sav` files. To get the JSON you'll paste into the editor, you'll need to convert the `.sav` to JSON first using a tool like [UE4SS](https://github.com/UE4SS-RE/RE-UE4SS) or the **uesave** CLI:

```bash
uesave to-json --input YourSave.sav --output YourSave.json
```

Your save file is typically found at:
```
%LOCALAPPDATA%\GoldRiver\Saved\SaveGames\
```

---

### 2. Load the Save

Open `index.html` in your browser (no server required — it runs fully client-side).

Paste the contents of your `.json` save file into the **Operative Data Uplink** text area and click **Decode Signal**.

The editor will parse all players in the session and display their dossiers.

> If you see `Error: Invalid save format`, make sure you've converted the `.sav` to JSON first — the editor does not accept raw binary `.sav` files.

---

### 3. Edit Vitals

Each player card shows a **Vitals** panel with editable fields for:

| Field | Range | Notes |
|-------|-------|-------|
| Health | 0 – 999 | Max varies by server config |
| Hunger | 0 – 100 | 100 = full |
| Thirst | 0 – 100 | 100 = fully hydrated |

Click into any field, change the value, and press Tab or Enter. Changes are applied immediately to the underlying save data.

---

### 4. Browse Inventory

Each player has four tabs:

| Tab | Contents |
|-----|----------|
| **Inventory** | Main backpack — all carried items |
| **Equipment** | 13 equipment slots (Head, Jacket, Vest, Belt, etc.) |
| **Weapons** | 4 weapon slots (Primary, Secondary, Melee, Sidearm) |
| **Storage** | Attached containers — backpacks, pockets, holsters, weapon-mounted storage |

Storage entries are collapsible. Click the header to expand or collapse each cache.

---

### 5. Transfer Items

Click any item card in **Inventory** or **Storage** to open the transfer dialog.

1. **Transfer to operative** — choose the destination player (can be the same player for moving between their own caches)
2. **Destination cache** — pick Main Inventory or any of their storage containers
3. **Quantity** — how many to transfer (defaults to the full stack)
4. **Relocate (clear source)** — check this to *move* the item; leave unchecked to *copy* it

Click **Confirm Transfer**, then repeat for any other items.

---

### 6. Transfer Equipment & Weapons

Click any occupied **Equipment** or **Weapon** slot to open the transfer dialog for that slot.

- **Destination cache** shows all slots of the same type (equipment or weapon) on the selected target player — labeled with their current contents
- The transfer overwrites the target slot's item while preserving its slot type assignment
- Check **Relocate** to clear the source slot after copying

---

### 7. Export

When you're done, click **Export Report** in the top-right corner. This downloads a `.json` file with all your changes applied.

Convert it back to a `.sav` file:

```bash
uesave from-json --input save_modified_<timestamp>.json --output YourSave.sav
```

Replace the original `.sav` in your save folder and launch the game.

---

## Running Locally

No build step or server needed. Just open `index.html` directly in any modern browser:

```
File → Open → index.html
```

Or serve it locally if you prefer:

```bash
npx serve .
# or
python -m http.server 8080
```

The **Load Sample** button will attempt to fetch a save from `GR_Saves/` if one is present — useful for development and testing.

---

## Notes & Caveats

- **Back up your saves before editing.** Always keep a copy of the original `.sav` file.
- The editor modifies save data in-place — all changes are reflected immediately in the exported JSON.
- Item format schemas (property key GUIDs) are consistent within a single save file. Transferring items between saves from different game versions is not supported.
- Equipment and weapon transfers preserve slot type assignments — copying a jacket to a jacket slot is safe; the game's slot indexing is maintained.
- Vitals edited beyond the game's intended maximums may be clamped or reset by the game on load.

---

## Save File Format

Gold River uses Unreal Engine 5's binary save format. After converting to JSON, the relevant structure is:

```
root.properties.PlayerSaves_0[]      — array of player save objects
  ├── EquipmentSave_*
  │     ├── Inventory_*[]            — main inventory items
  │     ├── EquipmentSlots_*[]       — 13 equipment slots
  │     ├── WeaponSlots_*[]          — 4 weapon slots
  │     └── OtherInventorys_*[]      — attached container inventories
  ├── Health_*                       — float
  ├── Hunger_*                       — float
  ├── Thirst_*                       — float
  ├── Location_*                     — {x, y, z}
  └── Name_*                         — Steam ID (culture_invariant)
```

Property keys use the format `PropertyName_Index_GUID_0` — the GUIDs are consistent across all players within the same save file.
