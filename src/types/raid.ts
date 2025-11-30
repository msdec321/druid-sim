import type { RaidRole } from './encounter';

// TBC Classes
export type WowClass =
  | 'warrior'
  | 'paladin'
  | 'hunter'
  | 'rogue'
  | 'priest'
  | 'shaman'
  | 'mage'
  | 'warlock'
  | 'druid';

// Specialization definition
export interface ClassSpec {
  id: string;
  name: string;
  class: WowClass;
  role: RaidRole;
}

// A single raid slot (one of the 25 players)
export interface RaidSlot {
  specId: string;  // References a ClassSpec id
  name?: string;   // Optional player name (for macros)
}

// Full raid composition (25 players, index 0 is always the player - Resto Druid)
export interface RaidComposition {
  name: string;
  slots: RaidSlot[];  // 25 slots, index 0 is the player
}

// Preset raid compositions
export interface RaidPreset {
  id: string;
  name: string;
  description: string;
  composition: RaidComposition;
}
