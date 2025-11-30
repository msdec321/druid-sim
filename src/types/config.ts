import type { PlayerStats } from './player';
import type { RaidComposition } from './raid';

// Gear preset with pre-calculated stats
export interface GearPreset {
  id: string;
  name: string;
  description: string;
  tier: 'pre-raid' | 't4' | 't5' | 't6' | 'sunwell';
  stats: PlayerStats;
}

// Action bar identifiers
export type ActionBarId =
  | 'main'          // Main bar at bottom center
  | 'bottomLeft'    // Above main bar, left side
  | 'bottomRight'   // Above main bar, right side
  | 'right1'        // Vertical bar on far right
  | 'right2';       // Vertical bar next to right1

// Action bar metadata
export interface ActionBarInfo {
  id: ActionBarId;
  name: string;
  shortName: string;
  orientation: 'horizontal' | 'vertical';
  slotCount: number;
}

// All action bars with their metadata
export const ACTION_BARS: ActionBarInfo[] = [
  { id: 'main', name: 'Main Action Bar', shortName: 'Main', orientation: 'horizontal', slotCount: 12 },
  { id: 'bottomLeft', name: 'Bottom Left', shortName: 'Bot Left', orientation: 'horizontal', slotCount: 12 },
  { id: 'bottomRight', name: 'Bottom Right', shortName: 'Bot Right', orientation: 'horizontal', slotCount: 12 },
  { id: 'right1', name: 'Right Action Bar 1', shortName: 'Right 1', orientation: 'vertical', slotCount: 12 },
  { id: 'right2', name: 'Right Action Bar 2', shortName: 'Right 2', orientation: 'vertical', slotCount: 12 },
];

// Single action bar slots
export interface ActionBarSlots {
  slots: (string | null)[]; // 12 slots, index 0-11
}

// All action bars configuration
export interface ActionBarsConfig {
  bars: Record<ActionBarId, ActionBarSlots>;
}

// Keybind target: which bar and slot
export interface KeybindTarget {
  barId: ActionBarId;
  slotIndex: number;
}

// Keybind mapping: keyboard key -> bar + slot
export interface KeybindConfig {
  bindings: Record<string, KeybindTarget>; // e.g., { '1': { barId: 'main', slotIndex: 0 } }
}

// User preferences
export interface Preferences {
  lastEncounter?: string;
  lastGearset?: string;
  showTooltips: boolean;
  soundEnabled: boolean;
}

// Macro definition
export interface Macro {
  id: string;        // Unique identifier
  name: string;      // User-defined name
  body: string;      // Macro body text (commands)
}

// Complete save data structure (versioned for migrations)
export interface SaveData {
  version: number;
  selectedGearset: string;
  actionBars: ActionBarsConfig;
  keybindings: KeybindConfig;
  preferences: Preferences;
  raidComposition: RaidComposition;
  macros: Macro[];
}

// Current save data version
export const SAVE_DATA_VERSION = 4;

// Helper to create empty bar slots
const createEmptyBar = (): ActionBarSlots => ({
  slots: Array(12).fill(null),
});

// Default action bars layout
export const DEFAULT_ACTION_BARS: ActionBarsConfig = {
  bars: {
    main: {
      slots: [
        'lifebloom',         // 1
        'rejuvenation',      // 2
        'regrowth',          // 3
        'healing-touch',     // 4
        'swiftmend',         // 5
        'natures-swiftness', // 6
        'innervate',         // 7
        'tranquility',       // 8
        null,                // 9
        null,                // 10
        null,                // 11
        null,                // 12
      ],
    },
    bottomLeft: createEmptyBar(),
    bottomRight: createEmptyBar(),
    right1: createEmptyBar(),
    right2: createEmptyBar(),
  },
};

// Default keybindings (main bar uses 1-=)
export const DEFAULT_KEYBINDINGS: KeybindConfig = {
  bindings: {
    '1': { barId: 'main', slotIndex: 0 },
    '2': { barId: 'main', slotIndex: 1 },
    '3': { barId: 'main', slotIndex: 2 },
    '4': { barId: 'main', slotIndex: 3 },
    '5': { barId: 'main', slotIndex: 4 },
    '6': { barId: 'main', slotIndex: 5 },
    '7': { barId: 'main', slotIndex: 6 },
    '8': { barId: 'main', slotIndex: 7 },
    '9': { barId: 'main', slotIndex: 8 },
    '0': { barId: 'main', slotIndex: 9 },
    '-': { barId: 'main', slotIndex: 10 },
    '=': { barId: 'main', slotIndex: 11 },
  },
};

// Default preferences
export const DEFAULT_PREFERENCES: Preferences = {
  showTooltips: true,
  soundEnabled: true,
};

// Default raid composition (will be overridden by data/raidComposition.ts presets)
export const DEFAULT_RAID_COMPOSITION: RaidComposition = {
  name: 'Default',
  slots: [
    { specId: 'druid-restoration' },  // Player
    { specId: 'warrior-protection' },
    { specId: 'paladin-protection' },
    { specId: 'priest-holy' },
    { specId: 'priest-holy' },
    { specId: 'paladin-holy' },
    { specId: 'shaman-restoration' },
    { specId: 'warlock-destruction' },
    { specId: 'warlock-destruction' },
    { specId: 'warlock-destruction' },
    { specId: 'mage-fire' },
    { specId: 'mage-fire' },
    { specId: 'mage-fire' },
    { specId: 'hunter-beastmastery' },
    { specId: 'hunter-beastmastery' },
    { specId: 'hunter-beastmastery' },
    { specId: 'rogue-combat' },
    { specId: 'rogue-combat' },
    { specId: 'shaman-enhancement' },
    { specId: 'shaman-enhancement' },
    { specId: 'warrior-fury' },
    { specId: 'warrior-fury' },
    { specId: 'priest-shadow' },
    { specId: 'paladin-retribution' },
    { specId: 'druid-balance' },
  ],
};

// Default save data
export const DEFAULT_SAVE_DATA: SaveData = {
  version: SAVE_DATA_VERSION,
  selectedGearset: 'pre-raid',
  actionBars: DEFAULT_ACTION_BARS,
  keybindings: DEFAULT_KEYBINDINGS,
  preferences: DEFAULT_PREFERENCES,
  raidComposition: DEFAULT_RAID_COMPOSITION,
  macros: [],
};
