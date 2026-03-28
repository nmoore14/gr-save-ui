// GR Save Editor - Main Application

class SaveEditor {
    constructor() {
        this.saveData = null;
        this.players = [];
        this.selectedItem = null;
        this.selectedPlayerIndex = null;
        this.selectedInventoryType = null;
        this.selectedItemIndex = null;

        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        // Input elements
        this.jsonInput = document.getElementById('jsonInput');
        this.parseBtn = document.getElementById('parseBtn');
        this.parseError = document.getElementById('parseError');
        this.exportBtn = document.getElementById('exportBtn');
        this.loadSampleBtn = document.getElementById('loadSampleBtn');

        // Sections
        this.inputSection = document.getElementById('inputSection');
        this.playersSection = document.getElementById('playersSection');
        this.playersContainer = document.getElementById('playersContainer');

        // Modal elements
        this.transferModal = document.getElementById('transferModal');
        this.targetPlayerSelect = document.getElementById('targetPlayerSelect');
        this.targetInventorySelect = document.getElementById('targetInventorySelect');
        this.transferAmount = document.getElementById('transferAmount');
        this.transferItemName = document.getElementById('transferItemName');
        this.transferItemAmount = document.getElementById('transferItemAmount');
        this.moveCheckbox = document.getElementById('moveCheckbox');
        this.confirmTransferBtn = document.getElementById('confirmTransferBtn');
        this.cancelTransferBtn = document.getElementById('cancelTransferBtn');

        // Clipboard status
        this.clipboardStatus = document.getElementById('clipboardStatus');
    }

    initEventListeners() {
        this.parseBtn.addEventListener('click', () => this.parseSave());
        this.exportBtn.addEventListener('click', () => this.exportSave());
        this.loadSampleBtn.addEventListener('click', () => this.loadSample());

        // Modal events
        document.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
        this.cancelTransferBtn.addEventListener('click', () => this.closeModal());
        this.confirmTransferBtn.addEventListener('click', () => this.confirmTransfer());
        this.transferModal.addEventListener('click', (e) => {
            if (e.target === this.transferModal) this.closeModal();
        });

        // Target player change
        this.targetPlayerSelect.addEventListener('change', () => this.updateTargetInventories());
    }

    parseSave() {
        try {
            const json = this.jsonInput.value.trim();
            if (!json) {
                throw new Error('Please paste a save file JSON');
            }

            this.saveData = JSON.parse(json);

            // Extract players from the save data
            this.extractPlayers();

            if (this.players.length === 0) {
                throw new Error('No players found in save data');
            }

            // Show players section
            this.playersSection.classList.remove('hidden');
            this.exportBtn.disabled = false;
            this.parseError.classList.add('hidden');

            // Render players
            this.renderPlayers();

        } catch (error) {
            this.parseError.textContent = `Error: ${error.message}`;
            this.parseError.classList.remove('hidden');
            console.error('Parse error:', error);
        }
    }

    extractPlayers() {
        this.players = [];

        // Navigate to PlayerSaves in the save data
        const properties = this.saveData?.root?.properties ?? this.saveData?.properties;
        if (!properties) {
            throw new Error('Invalid save format: missing properties');
        }

        // Find PlayerSaves key (it has _0 suffix)
        const playerSavesKey = Object.keys(properties).find(k => k.startsWith('PlayerSaves_'));
        if (!playerSavesKey) {
            throw new Error('No PlayerSaves found in save data');
        }

        const playerSaves = properties[playerSavesKey];
        if (!Array.isArray(playerSaves)) {
            throw new Error('PlayerSaves is not an array');
        }

        // Parse each player
        playerSaves.forEach((playerData, index) => {
            const player = this.parsePlayer(playerData, index);
            this.players.push(player);
        });
    }

    parsePlayer(data, index) {
        const player = {
            index: index,
            rawData: data,
            name: this.findValue(data, 'ConfigName_') || `Player ${index + 1}`,
            id: this.extractPlayerId(data),
            health: this.findValue(data, 'Health_') || 0,
            hunger: this.findValue(data, 'Hunger_') || 0,
            thirst: this.findValue(data, 'Thirst_') || 0,
            location: this.findValue(data, 'Location_') || { x: 0, y: 0, z: 0 },
            rotation: this.findValue(data, 'Rotation_') || { x: 0, y: 0, z: 0 },
            recipes: this.findValue(data, 'Recipes_') || [],
            badges: this.findValue(data, 'Badges_') || [],
            inventory: [],
            equipmentSlots: [],
            weaponSlots: [],
            otherInventories: []
        };

        // Extract equipment save
        const equipSaveKey = Object.keys(data).find(k => k.startsWith('EquipmentSave_'));
        if (equipSaveKey) {
            const equipSave = data[equipSaveKey];

            // Main inventory
            const invKey = Object.keys(equipSave).find(k => k.startsWith('Inventory_'));
            if (invKey) {
                player.inventory = this.parseInventoryItems(equipSave[invKey]);
            }

            // Equipment slots
            const equipSlotsKey = Object.keys(equipSave).find(k => k.startsWith('EquipmentSlots_'));
            if (equipSlotsKey) {
                player.equipmentSlots = this.parseEquipmentSlots(equipSave[equipSlotsKey]);
            }

            // Weapon slots
            const weaponSlotsKey = Object.keys(equipSave).find(k => k.startsWith('WeaponSlots_'));
            if (weaponSlotsKey) {
                player.weaponSlots = this.parseWeaponSlots(equipSave[weaponSlotsKey]);
            }

            // Other inventories (backpack, pockets, etc.)
            const otherInvKey = Object.keys(equipSave).find(k => k.startsWith('OtherInventorys_'));
            if (otherInvKey) {
                player.otherInventories = this.parseOtherInventories(equipSave[otherInvKey]);
            }
        }

        return player;
    }

    extractPlayerId(data) {
        const nameKey = Object.keys(data).find(k => k.startsWith('Name_'));
        if (nameKey) {
            const nameData = data[nameKey];
            if (nameData?.variant?.None?.culture_invariant) {
                return nameData.variant.None.culture_invariant;
            }
        }
        return 'Unknown';
    }

    findValue(data, prefix) {
        const key = Object.keys(data).find(k => k.startsWith(prefix));
        return key ? data[key] : null;
    }

    parseInventoryItems(items) {
        if (!Array.isArray(items)) return [];

        return items.map((item, idx) => ({
            index: idx,
            id: this.findValue(item, 'ID_') || 'Unknown',
            amount: this.findValue(item, 'Amount_') || 0,
            durability: this.findValue(item, 'Durability_') || 0,
            quickBindIndex: this.findValue(item, 'QuickBindIndex_') ?? -1,
            rotated: this.findValue(item, 'Rotated_') || false,
            useAmount: this.findValue(item, 'UseAmount_') || 0,
            rootIndex: this.findValue(item, 'RootIndex_') || 0,
            invIndex: this.findValue(item, 'InvIndex_') ?? -1,
            decayTime: this.findValue(item, 'DecayTime_') || 0,
            rawData: item
        }));
    }

    parseEquipmentSlots(slots) {
        if (!Array.isArray(slots)) return [];

        const slotTypes = {
            'NewEnumerator0': 'Head',
            'NewEnumerator1': 'Hands',
            'NewEnumerator2': 'Jacket',
            'NewEnumerator3': 'Vest',
            'NewEnumerator4': 'Backpack',
            'NewEnumerator5': 'Belt',
            'NewEnumerator6': 'Pants',
            'NewEnumerator7': 'Shoes',
            'NewEnumerator8': 'Accessory 1',
            'NewEnumerator9': 'Accessory 2',
            'NewEnumerator10': 'Protected Case',
            'NewEnumerator11': 'Holster',
            'NewEnumerator12': 'Quiver'
        };

        return slots.map((slot, idx) => {
            const typeKey = this.findValue(slot, 'EquipmentType_') || '';
            const typeEnum = typeKey.split('::')[1] || typeKey;

            return {
                index: idx,
                type: slotTypes[typeEnum] || typeEnum,
                typeEnum: typeKey,
                itemId: this.findValue(slot, 'ItemID_') || 'None',
                amount: this.findValue(slot, 'Amount_') || 0,
                durability: this.findValue(slot, 'Durability_') || 0,
                invIndex: this.findValue(slot, 'InvIndex_') ?? -1,
                decayTime: this.findValue(slot, 'DecayTime_') || 0,
                rawData: slot
            };
        });
    }

    parseWeaponSlots(slots) {
        if (!Array.isArray(slots)) return [];

        const slotTypes = {
            'NewEnumerator0': 'Primary',
            'NewEnumerator1': 'Secondary',
            'NewEnumerator2': 'Melee',
            'NewEnumerator3': 'Sidearm'
        };

        return slots.map((slot, idx) => {
            const typeKey = this.findValue(slot, 'WeaponType_') || '';
            const typeEnum = typeKey.split('::')[1] || typeKey;

            return {
                index: idx,
                type: slotTypes[typeEnum] || typeEnum,
                typeEnum: typeKey,
                itemId: this.findValue(slot, 'ItemID_') || 'None',
                amount: this.findValue(slot, 'Amount_') || 0,
                durability: this.findValue(slot, 'Durability_') || 0,
                quickBindIndex: this.findValue(slot, 'QuickBindIndex_') ?? -1,
                useAmount: this.findValue(slot, 'UseAmount_') || 0,
                invIndex: this.findValue(slot, 'InvIndex_') ?? -1,
                decayTime: this.findValue(slot, 'DecayTime_') || 0,
                rawData: slot
            };
        });
    }

    parseOtherInventories(inventories) {
        if (!Array.isArray(inventories)) return [];

        return inventories.map((inv, idx) => {
            const invIndex = this.findValue(inv, 'Index_') ?? idx;
            const code = this.findValue(inv, 'Code_') || `Inventory ${invIndex}`;
            const invKey = Object.keys(inv).find(k => k.startsWith('Inventory_'));
            const items = invKey ? this.parseInventoryItems(inv[invKey]) : [];

            // Parse attachments if present
            const attachKey = Object.keys(inv).find(k => k.startsWith('Attachments_'));
            const attachments = attachKey ? this.parseAttachments(inv[attachKey]) : [];

            return {
                index: invIndex,
                code: this.formatItemName(code),
                items: items,
                attachments: attachments,
                weight: this.findValue(inv, 'Weight_') || 0,
                itemCount: this.findValue(inv, 'ItemCount_') || 0,
                fireMode: this.findValue(inv, 'FireMode_') || '',
                rawData: inv
            };
        });
    }

    parseAttachments(attachments) {
        if (!Array.isArray(attachments)) return [];

        return attachments.map((att, idx) => ({
            index: idx,
            type: this.findValue(att, 'AttachmentType_') || '',
            itemId: this.findValue(att, 'ItemID_') || 'None',
            amount: this.findValue(att, 'Amount_') || 0,
            useAmount: this.findValue(att, 'UseAmount_') || 0,
            durability: this.findValue(att, 'Durability_') || 0,
            invIndex: this.findValue(att, 'InvIndex_') ?? -1,
            rawData: att
        }));
    }

    formatItemName(id) {
        if (!id || id === 'None') return 'Empty';
        return id
            .replace(/^(Equipment_|Consumable_|Resource_|Weapon_|Tool_|Ammo_|Holdable_|BuildPart_|PadlockKey_|Magazine_|Throwable_)/i, '')
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2');
    }

    renderPlayers() {
        this.playersContainer.innerHTML = '';

        this.players.forEach((player, index) => {
            const card = this.createPlayerCard(player, index);
            this.playersContainer.appendChild(card);
        });
    }

    createPlayerCard(player, playerIndex) {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.dataset.playerIndex = playerIndex;

        card.innerHTML = `
            <div class="player-header">
                <div>
                    <div class="player-name">${player.name}</div>
                    <div class="player-id">${player.id}</div>
                </div>
            </div>

            <!-- Vitals -->
            <div class="vitals-section">
                <h4>Vitals</h4>
                <div class="vitals-grid">
                    <div class="vital-item vital-health">
                        <div class="vital-label">Health</div>
                        <div class="vital-value">
                            <input type="number" class="vital-input" data-vital="health" value="${Math.round(player.health)}" min="0" max="999">
                        </div>
                    </div>
                    <div class="vital-item vital-hunger">
                        <div class="vital-label">Hunger</div>
                        <div class="vital-value">
                            <input type="number" class="vital-input" data-vital="hunger" value="${Math.round(player.hunger)}" min="0" max="100" step="0.1">
                        </div>
                    </div>
                    <div class="vital-item vital-thirst">
                        <div class="vital-label">Thirst</div>
                        <div class="vital-value">
                            <input type="number" class="vital-input" data-vital="thirst" value="${Math.round(player.thirst)}" min="0" max="100" step="0.1">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tabs -->
            <div class="tabs">
                <button class="tab-btn active" data-tab="inventory">Inventory (${player.inventory.length})</button>
                <button class="tab-btn" data-tab="equipment">Equipment (${player.equipmentSlots.length})</button>
                <button class="tab-btn" data-tab="weapons">Weapons (${player.weaponSlots.filter(w => w.itemId !== 'None').length})</button>
                <button class="tab-btn" data-tab="storage">Storage (${player.otherInventories.length})</button>
            </div>

            <!-- Inventory Tab -->
            <div class="tab-content active" data-tab-content="inventory">
                ${this.renderInventorySection(player.inventory, playerIndex, 'inventory')}
            </div>

            <!-- Equipment Tab -->
            <div class="tab-content" data-tab-content="equipment">
                ${this.renderEquipmentSection(player.equipmentSlots, playerIndex)}
            </div>

            <!-- Weapons Tab -->
            <div class="tab-content" data-tab-content="weapons">
                ${this.renderWeaponsSection(player.weaponSlots, playerIndex)}
            </div>

            <!-- Storage Tab -->
            <div class="tab-content" data-tab-content="storage">
                ${this.renderOtherInventoriesSection(player.otherInventories, playerIndex)}
            </div>
        `;

        // Add vital change listeners
        card.querySelectorAll('.vital-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const vital = e.target.dataset.vital;
                const value = parseFloat(e.target.value) || 0;
                this.updateVital(playerIndex, vital, value);
            });
        });

        // Add tab listeners
        card.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                card.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                card.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                card.querySelector(`[data-tab-content="${tab}"]`).classList.add('active');
            });
        });

        // Add item click listeners
        card.querySelectorAll('.item-card').forEach(item => {
            item.addEventListener('click', (e) => {
                const itemData = JSON.parse(item.dataset.item);
                this.openTransferModal(
                    playerIndex,
                    item.dataset.inventoryType,
                    parseInt(item.dataset.itemIndex),
                    itemData
                );
            });
        });

        // Add equipment/weapon slot click listeners
        card.querySelectorAll('.clickable-slot').forEach(slotEl => {
            slotEl.addEventListener('click', () => {
                const slotType = slotEl.dataset.slotType;
                const slotIndex = parseInt(slotEl.dataset.slotIndex);
                const slot = slotType === 'equipment_slot'
                    ? player.equipmentSlots[slotIndex]
                    : player.weaponSlots[slotIndex];
                const normalizedItem = { ...slot, id: slot.itemId };
                this.openTransferModal(playerIndex, slotType, slotIndex, normalizedItem);
            });
        });

        // Add collapsible listeners
        card.querySelectorAll('.collapsible-header').forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
                const grid = header.nextElementSibling;
                grid.classList.toggle('collapsed');
            });
        });

        return card;
    }

    renderInventorySection(items, playerIndex, inventoryType) {
        if (items.length === 0) {
            return '<div class="inventory-section"><p style="color: var(--text-secondary)">No items</p></div>';
        }

        return `
            <div class="inventory-section">
                <div class="inventory-grid">
                    ${items.map((item, idx) => this.renderItemCard(item, playerIndex, inventoryType, idx)).join('')}
                </div>
            </div>
        `;
    }

    renderItemCard(item, playerIndex, inventoryType, itemIndex) {
        const itemData = JSON.stringify(item);
        return `
            <div class="item-card"
                 data-player-index="${playerIndex}"
                 data-inventory-type="${inventoryType}"
                 data-item-index="${itemIndex}"
                 data-item='${itemData.replace(/'/g, "&#39;")}'>
                <div class="item-name">${this.formatItemName(item.id)}</div>
                <div class="item-details">
                    <span class="item-amount">x${item.amount}</span>
                    <span class="item-durability">${Math.round(item.durability)}%</span>
                </div>
            </div>
        `;
    }

    renderEquipmentSection(slots, playerIndex) {
        return `
            <div class="inventory-section">
                <div class="equipment-grid">
                    ${slots.map((slot, idx) => `
                        <div class="equipment-slot ${slot.itemId !== 'None' ? 'clickable-slot' : ''}"
                             data-player-index="${playerIndex}"
                             data-slot-type="equipment_slot"
                             data-slot-index="${idx}">
                            <div class="slot-type">${slot.type}</div>
                            <div class="slot-item ${slot.itemId === 'None' ? 'slot-empty' : ''}">
                                ${this.formatItemName(slot.itemId)}
                            </div>
                            ${slot.itemId !== 'None' ? `
                                <div class="slot-details">
                                    <span>x${slot.amount}</span>
                                    <span>${Math.round(slot.durability)}%</span>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderWeaponsSection(slots, playerIndex) {
        return `
            <div class="inventory-section">
                <div class="weapon-grid">
                    ${slots.map((slot, idx) => `
                        <div class="weapon-slot ${slot.itemId !== 'None' ? 'clickable-slot' : ''}"
                             data-player-index="${playerIndex}"
                             data-slot-type="weapon_slot"
                             data-slot-index="${idx}">
                            <div class="slot-type">${slot.type}</div>
                            <div class="slot-item ${slot.itemId === 'None' ? 'slot-empty' : ''}">
                                ${this.formatItemName(slot.itemId)}
                            </div>
                            ${slot.itemId !== 'None' ? `
                                <div class="slot-details">
                                    <span>${Math.round(slot.durability)}%</span>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderOtherInventoriesSection(inventories, playerIndex) {
        if (inventories.length === 0) {
            return '<div class="inventory-section"><p style="color: var(--text-secondary)">No storage</p></div>';
        }

        return inventories.map((inv, invIdx) => `
            <div class="inventory-section">
                <div class="collapsible-header">
                    <span>${inv.code} (${inv.items.length} items)</span>
                    <span class="toggle-icon">&#9660;</span>
                </div>
                <div class="inventory-grid">
                    ${inv.items.map((item, itemIdx) =>
                        this.renderItemCard(item, playerIndex, `other_${invIdx}`, itemIdx)
                    ).join('')}
                    ${inv.items.length === 0 ? '<p style="color: var(--text-secondary); padding: 10px;">Empty</p>' : ''}
                </div>
            </div>
        `).join('');
    }

    updateVital(playerIndex, vital, value) {
        const player = this.players[playerIndex];
        player[vital] = value;

        // Update raw data
        const rawData = player.rawData;
        const vitalKeyMap = {
            'health': 'Health_',
            'hunger': 'Hunger_',
            'thirst': 'Thirst_'
        };

        const keyPrefix = vitalKeyMap[vital];
        const key = Object.keys(rawData).find(k => k.startsWith(keyPrefix));
        if (key) {
            rawData[key] = value;
        }

        this.showClipboardStatus('Vital updated');
    }

    openTransferModal(playerIndex, inventoryType, itemIndex, item) {
        this.selectedPlayerIndex = playerIndex;
        this.selectedInventoryType = inventoryType;
        this.selectedItemIndex = itemIndex;
        this.selectedItem = item;

        // Update modal content
        this.transferItemName.textContent = this.formatItemName(item.id);
        this.transferItemAmount.textContent = `Amount: ${item.amount}`;
        this.transferAmount.value = item.amount;
        this.transferAmount.max = item.amount;

        // Populate target player select
        this.targetPlayerSelect.innerHTML = this.players.map((p, idx) =>
            `<option value="${idx}"${idx === playerIndex ? ' selected' : ''}>${p.name}</option>`
        ).join('');

        // Update target inventories
        this.updateTargetInventories();

        // Show modal
        this.transferModal.classList.remove('hidden');
    }

    updateTargetInventories() {
        const targetPlayerIdx = parseInt(this.targetPlayerSelect.value);
        const targetPlayer = this.players[targetPlayerIdx];

        let options;
        if (this.selectedInventoryType === 'equipment_slot') {
            options = targetPlayer.equipmentSlots.map((slot, idx) => ({
                value: `equipment_slot_${idx}`,
                label: `${slot.type}${slot.itemId !== 'None' ? ` (${this.formatItemName(slot.itemId)})` : ' (empty)'}`
            }));
            // Default selection: same slot index
            this.targetInventorySelect.innerHTML = options.map((opt, idx) =>
                `<option value="${opt.value}"${idx === this.selectedItemIndex ? ' selected' : ''}>${opt.label}</option>`
            ).join('');
            return;
        } else if (this.selectedInventoryType === 'weapon_slot') {
            options = targetPlayer.weaponSlots.map((slot, idx) => ({
                value: `weapon_slot_${idx}`,
                label: `${slot.type}${slot.itemId !== 'None' ? ` (${this.formatItemName(slot.itemId)})` : ' (empty)'}`
            }));
            this.targetInventorySelect.innerHTML = options.map((opt, idx) =>
                `<option value="${opt.value}"${idx === this.selectedItemIndex ? ' selected' : ''}>${opt.label}</option>`
            ).join('');
            return;
        }

        options = [
            { value: 'inventory', label: 'Main Inventory' },
            ...targetPlayer.otherInventories.map((inv, idx) => ({
                value: `other_${idx}`,
                label: inv.code
            }))
        ];

        this.targetInventorySelect.innerHTML = options.map(opt =>
            `<option value="${opt.value}">${opt.label}</option>`
        ).join('');
    }

    closeModal() {
        this.transferModal.classList.add('hidden');
        this.selectedItem = null;
        this.selectedPlayerIndex = null;
        this.selectedInventoryType = null;
        this.selectedItemIndex = null;
    }

    confirmTransfer() {
        const targetPlayerIdx = parseInt(this.targetPlayerSelect.value);
        const targetInventoryType = this.targetInventorySelect.value;
        const amount = parseInt(this.transferAmount.value);
        const isMove = this.moveCheckbox.checked;

        const sourcePlayer = this.players[this.selectedPlayerIndex];
        const targetPlayer = this.players[targetPlayerIdx];

        // Handle equipment / weapon slot transfers
        if (this.selectedInventoryType === 'equipment_slot' || this.selectedInventoryType === 'weapon_slot') {
            const isEquipment = this.selectedInventoryType === 'equipment_slot';
            const sourceSlots = isEquipment ? sourcePlayer.equipmentSlots : sourcePlayer.weaponSlots;
            const targetSlots = isEquipment ? targetPlayer.equipmentSlots : targetPlayer.weaponSlots;
            const typePrefix = isEquipment ? 'EquipmentType_' : 'WeaponType_';

            const sourceSlot = sourceSlots[this.selectedItemIndex];
            const targetSlotIdx = parseInt(targetInventoryType.split('_').pop());
            const targetSlot = targetSlots[targetSlotIdx];

            const sourceRaw = sourceSlot.rawData;
            const targetRaw = targetSlot.rawData;

            // Copy all fields except the slot-type field (preserve target's slot type)
            for (const key of Object.keys(targetRaw)) {
                if (!key.startsWith(typePrefix) && key in sourceRaw) {
                    targetRaw[key] = sourceRaw[key];
                }
            }

            // Update parsed slot data
            targetSlot.itemId = sourceSlot.itemId;
            targetSlot.amount = sourceSlot.amount;
            targetSlot.durability = sourceSlot.durability;

            if (isMove) {
                for (const key of Object.keys(sourceRaw)) {
                    if (key.startsWith('ItemID_')) sourceRaw[key] = 'None';
                    else if (key.startsWith('Amount_')) sourceRaw[key] = 0;
                    else if (key.startsWith('Durability_')) sourceRaw[key] = 0;
                }
                sourceSlot.itemId = 'None';
                sourceSlot.amount = 0;
                sourceSlot.durability = 0;
            }

            this.renderPlayers();
            this.closeModal();
            this.showClipboardStatus(isMove ? 'Equipment moved' : 'Equipment copied');
            return;
        }

        // Get source inventory
        let sourceItems;
        if (this.selectedInventoryType === 'inventory') {
            sourceItems = sourcePlayer.inventory;
        } else if (this.selectedInventoryType.startsWith('other_')) {
            const invIdx = parseInt(this.selectedInventoryType.split('_')[1]);
            sourceItems = sourcePlayer.otherInventories[invIdx].items;
        }

        // Get target inventory
        let targetItems;
        let targetRawArray;
        if (targetInventoryType === 'inventory') {
            targetItems = targetPlayer.inventory;
            const equipSaveKey = Object.keys(targetPlayer.rawData).find(k => k.startsWith('EquipmentSave_'));
            const equipSave = targetPlayer.rawData[equipSaveKey];
            const invKey = Object.keys(equipSave).find(k => k.startsWith('Inventory_'));
            targetRawArray = equipSave[invKey];
        } else if (targetInventoryType.startsWith('other_')) {
            const invIdx = parseInt(targetInventoryType.split('_')[1]);
            targetItems = targetPlayer.otherInventories[invIdx].items;
            targetRawArray = targetPlayer.otherInventories[invIdx].rawData;
            const invKey = Object.keys(targetRawArray).find(k => k.startsWith('Inventory_'));
            targetRawArray = targetRawArray[invKey];
        }

        // Create a copy of the item
        const sourceItem = sourceItems[this.selectedItemIndex];
        const newItem = JSON.parse(JSON.stringify(sourceItem.rawData));

        // Update amount in the new item
        const amountKey = Object.keys(newItem).find(k => k.startsWith('Amount_'));
        if (amountKey) {
            newItem[amountKey] = amount;
        }

        // Update root index to be at the end
        const rootIndexKey = Object.keys(newItem).find(k => k.startsWith('RootIndex_'));
        if (rootIndexKey) {
            newItem[rootIndexKey] = targetItems.length;
        }

        // Add to target raw data
        targetRawArray.push(newItem);

        // Update parsed target items
        const parsedNewItem = {
            ...sourceItem,
            amount: amount,
            rootIndex: targetItems.length,
            rawData: newItem
        };
        targetItems.push(parsedNewItem);

        // If moving, update source
        if (isMove) {
            const sourceAmount = sourceItem.amount;
            if (amount >= sourceAmount) {
                // Remove entire item
                sourceItems.splice(this.selectedItemIndex, 1);

                // Remove from raw data
                let sourceRawArray;
                if (this.selectedInventoryType === 'inventory') {
                    const equipSaveKey = Object.keys(sourcePlayer.rawData).find(k => k.startsWith('EquipmentSave_'));
                    const equipSave = sourcePlayer.rawData[equipSaveKey];
                    const invKey = Object.keys(equipSave).find(k => k.startsWith('Inventory_'));
                    sourceRawArray = equipSave[invKey];
                } else {
                    const invIdx = parseInt(this.selectedInventoryType.split('_')[1]);
                    const otherInvRaw = sourcePlayer.otherInventories[invIdx].rawData;
                    const invKey = Object.keys(otherInvRaw).find(k => k.startsWith('Inventory_'));
                    sourceRawArray = otherInvRaw[invKey];
                }
                sourceRawArray.splice(this.selectedItemIndex, 1);
            } else {
                // Reduce amount
                sourceItem.amount -= amount;
                const amountKey = Object.keys(sourceItem.rawData).find(k => k.startsWith('Amount_'));
                if (amountKey) {
                    sourceItem.rawData[amountKey] = sourceItem.amount;
                }
            }
        }

        // Re-render players
        this.renderPlayers();
        this.closeModal();
        this.showClipboardStatus(isMove ? 'Item moved' : 'Item copied');
    }

    showClipboardStatus(message) {
        this.clipboardStatus.textContent = message;
        this.clipboardStatus.classList.add('show');
        setTimeout(() => {
            this.clipboardStatus.classList.remove('show');
        }, 2000);
    }

    exportSave() {
        // Update the raw save data with modified values
        const properties = this.saveData?.root?.properties ?? this.saveData?.properties;
        const playerSavesKey = Object.keys(properties).find(k => k.startsWith('PlayerSaves_'));

        // The raw data is already updated in place, so we just need to stringify
        const jsonStr = JSON.stringify(this.saveData, null, 2);

        // Create download
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `save_modified_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showClipboardStatus('Save exported!');
    }

    async loadSample() {
        try {
            // Try to fetch a sample file
            const response = await fetch('GR_Saves/Nick-Jimmy-Base_1.json');
            if (response.ok) {
                const json = await response.text();
                this.jsonInput.value = json;
                this.showClipboardStatus('Sample loaded');
            } else {
                throw new Error('Could not load sample file');
            }
        } catch (error) {
            this.showClipboardStatus('Paste a save manually');
            console.log('Could not load sample:', error);
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.saveEditor = new SaveEditor();
});
