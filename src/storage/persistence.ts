import type {
  SaveData,
  ActionBarsConfig,
  ActionBarId,
  KeybindConfig,
  KeybindTarget,
  Preferences,
  RaidComposition,
  Macro,
} from '../types';
import {
  SAVE_DATA_VERSION,
  DEFAULT_SAVE_DATA,
  DEFAULT_ACTION_BARS,
  DEFAULT_RAID_COMPOSITION,
} from '../types';

const STORAGE_KEY = 'tree-sim-save';

// V1 types for migration
interface V1ActionBarConfig {
  slots: (string | null)[];
}

interface V1SaveData {
  version: number;
  selectedGearset: string;
  actionBar: V1ActionBarConfig;
  keybindings: { bindings: Record<string, number> };
  preferences: Preferences;
}

// Load save data from localStorage
export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SAVE_DATA;
    }

    const data = JSON.parse(raw);

    // Handle version migrations
    const migrated = migrateSaveData(data);

    return migrated;
  } catch (error) {
    console.error('Failed to load save data:', error);
    return DEFAULT_SAVE_DATA;
  }
}

// Save data to localStorage
export function saveSaveData(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data:', error);
  }
}

// Migrate save data from older versions
function migrateSaveData(data: V1SaveData | SaveData): SaveData {
  let current = { ...data } as SaveData;

  // Migrate v1 to v2: single actionBar -> multiple actionBars
  if (data.version < 2) {
    const v1Data = data as V1SaveData;

    // Convert single action bar to multi-bar format
    const actionBars: ActionBarsConfig = {
      bars: {
        ...DEFAULT_ACTION_BARS.bars,
        main: { slots: v1Data.actionBar.slots },
      },
    };

    // Convert old keybindings (just slot index) to new format (bar + slot)
    const newBindings: Record<string, KeybindTarget> = {};
    for (const [key, slotIndex] of Object.entries(v1Data.keybindings.bindings)) {
      newBindings[key] = { barId: 'main', slotIndex: slotIndex as number };
    }

    // Create new save data without the old actionBar property
    current = {
      version: current.version,
      selectedGearset: current.selectedGearset,
      actionBars,
      keybindings: { bindings: newBindings },
      preferences: current.preferences,
      raidComposition: DEFAULT_RAID_COMPOSITION,
    };
  }

  // Migrate v2 to v3: add raidComposition
  if (data.version < 3) {
    current.raidComposition = current.raidComposition || DEFAULT_RAID_COMPOSITION;
  }

  // Migrate v3 to v4: add macros
  if (data.version < 4) {
    current.macros = current.macros || [];
  }

  // Ensure version is current
  current.version = SAVE_DATA_VERSION;

  return current;
}

// Clear all saved data
export function clearSaveData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Individual getters and setters for convenience

export function getSelectedGearset(): string {
  return loadSaveData().selectedGearset;
}

export function setSelectedGearset(gearsetId: string): void {
  const data = loadSaveData();
  data.selectedGearset = gearsetId;
  saveSaveData(data);
}

export function getActionBars(): ActionBarsConfig {
  return loadSaveData().actionBars;
}

export function setActionBars(actionBars: ActionBarsConfig): void {
  const data = loadSaveData();
  data.actionBars = actionBars;
  saveSaveData(data);
}

export function getKeybindings(): KeybindConfig {
  return loadSaveData().keybindings;
}

export function setKeybindings(keybindings: KeybindConfig): void {
  const data = loadSaveData();
  data.keybindings = keybindings;
  saveSaveData(data);
}

export function getPreferences(): Preferences {
  return loadSaveData().preferences;
}

export function setPreferences(preferences: Partial<Preferences>): void {
  const data = loadSaveData();
  data.preferences = { ...data.preferences, ...preferences };
  saveSaveData(data);
}

// Update a single action bar slot
export function setActionBarSlot(
  barId: ActionBarId,
  slotIndex: number,
  spellId: string | null
): void {
  const data = loadSaveData();
  const bar = data.actionBars.bars[barId];
  if (bar && slotIndex >= 0 && slotIndex < bar.slots.length) {
    bar.slots[slotIndex] = spellId;
    saveSaveData(data);
  }
}

// Update a single keybinding
export function setKeybinding(key: string, target: KeybindTarget): void {
  const data = loadSaveData();
  data.keybindings.bindings[key] = target;
  saveSaveData(data);
}

// Remove a keybinding
export function removeKeybinding(key: string): void {
  const data = loadSaveData();
  delete data.keybindings.bindings[key];
  saveSaveData(data);
}

// Raid composition
export function getRaidComposition(): RaidComposition {
  return loadSaveData().raidComposition;
}

export function setRaidComposition(composition: RaidComposition): void {
  const data = loadSaveData();
  data.raidComposition = composition;
  saveSaveData(data);
}

// Macros
export function getMacros(): Macro[] {
  return loadSaveData().macros;
}

export function setMacros(macros: Macro[]): void {
  const data = loadSaveData();
  data.macros = macros;
  saveSaveData(data);
}

export function addMacro(macro: Macro): void {
  const data = loadSaveData();
  data.macros.push(macro);
  saveSaveData(data);
}

export function updateMacro(macro: Macro): void {
  const data = loadSaveData();
  const index = data.macros.findIndex(m => m.id === macro.id);
  if (index !== -1) {
    data.macros[index] = macro;
    saveSaveData(data);
  }
}

export function deleteMacro(macroId: string): void {
  const data = loadSaveData();
  data.macros = data.macros.filter(m => m.id !== macroId);
  saveSaveData(data);
}
