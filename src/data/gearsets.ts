import type { GearPreset } from '../types';

// Pre-defined gear presets for different progression levels
// Stats are approximate representations of typical gear at each tier
export const GEAR_PRESETS: GearPreset[] = [
  {
    id: 'pre-raid',
    name: 'Pre-Raid',
    description: 'Best-in-slot gear from heroic dungeons and crafting',
    tier: 'pre-raid',
    stats: {
      stamina: 250,
      intellect: 350,
      spirit: 280,
      spellPower: 950,
      mp5: 45,
      spellCrit: 8.43,
      hasteRating: 0,
    },
  },
  {
    id: 't4',
    name: 'Tier 4 (Karazhan/Gruul/Mag)',
    description: 'Malorne Raiment set with Karazhan upgrades',
    tier: 't4',
    stats: {
      stamina: 300,
      intellect: 420,
      spirit: 340,
      spellPower: 1150,
      mp5: 65,
      spellCrit: 8.43,
      hasteRating: 0,
    },
  },
  {
    id: 't5',
    name: 'Tier 5 (SSC/TK)',
    description: 'Nordrassil Raiment set from Serpentshrine and Tempest Keep',
    tier: 't5',
    stats: {
      stamina: 350,
      intellect: 480,
      spirit: 400,
      spellPower: 1450,
      mp5: 85,
      spellCrit: 8.43,
      hasteRating: 0,
    },
  },
  {
    id: 't6',
    name: 'Tier 6 (BT/Hyjal)',
    description: 'Thunderheart Raiment from Black Temple and Hyjal Summit',
    tier: 't6',
    stats: {
      stamina: 400,
      intellect: 550,
      spirit: 450,
      spellPower: 1800,
      mp5: 110,
      spellCrit: 8.43,
      hasteRating: 150,
    },
  },
  {
    id: 'sunwell',
    name: 'Sunwell Plateau',
    description: 'Best-in-slot gear from Sunwell Plateau',
    tier: 'sunwell',
    stats: {
      stamina: 440,
      intellect: 526,
      spirit: 361,
      spellPower: 2615,
      mp5: 89,
      spellCrit: 8.43,
      hasteRating: 313,
    },
  },
];

// Get gear preset by ID
export function getGearPreset(id: string): GearPreset | undefined {
  return GEAR_PRESETS.find(preset => preset.id === id);
}

// Get all gear presets
export function getAllGearPresets(): GearPreset[] {
  return GEAR_PRESETS;
}

// Default gear preset
export const DEFAULT_GEAR_PRESET = GEAR_PRESETS[0];
