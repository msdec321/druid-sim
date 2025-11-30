import type { ClassSpec, WowClass, RaidPreset, RaidComposition } from '../types';

// Class display info
export const CLASS_INFO: Record<WowClass, { name: string; color: string }> = {
  warrior: { name: 'Warrior', color: '#C79C6E' },
  paladin: { name: 'Paladin', color: '#F58CBA' },
  hunter: { name: 'Hunter', color: '#ABD473' },
  rogue: { name: 'Rogue', color: '#FFF569' },
  priest: { name: 'Priest', color: '#FFFFFF' },
  shaman: { name: 'Shaman', color: '#0070DE' },
  mage: { name: 'Mage', color: '#69CCF0' },
  warlock: { name: 'Warlock', color: '#9482C9' },
  druid: { name: 'Druid', color: '#FF7D0A' },
};

// All TBC specializations
export const CLASS_SPECS: ClassSpec[] = [
  // Warrior
  { id: 'warrior-protection', name: 'Protection', class: 'warrior', role: 'tank' },
  { id: 'warrior-arms', name: 'Arms', class: 'warrior', role: 'dps' },
  { id: 'warrior-fury', name: 'Fury', class: 'warrior', role: 'dps' },

  // Paladin
  { id: 'paladin-holy', name: 'Holy', class: 'paladin', role: 'healer' },
  { id: 'paladin-protection', name: 'Protection', class: 'paladin', role: 'tank' },
  { id: 'paladin-retribution', name: 'Retribution', class: 'paladin', role: 'dps' },

  // Hunter
  { id: 'hunter-beastmastery', name: 'Beast Mastery', class: 'hunter', role: 'dps' },
  { id: 'hunter-marksmanship', name: 'Marksmanship', class: 'hunter', role: 'dps' },
  { id: 'hunter-survival', name: 'Survival', class: 'hunter', role: 'dps' },

  // Rogue
  { id: 'rogue-assassination', name: 'Assassination', class: 'rogue', role: 'dps' },
  { id: 'rogue-combat', name: 'Combat', class: 'rogue', role: 'dps' },
  { id: 'rogue-subtlety', name: 'Subtlety', class: 'rogue', role: 'dps' },

  // Priest
  { id: 'priest-discipline', name: 'Discipline', class: 'priest', role: 'healer' },
  { id: 'priest-holy', name: 'Holy', class: 'priest', role: 'healer' },
  { id: 'priest-shadow', name: 'Shadow', class: 'priest', role: 'dps' },

  // Shaman
  { id: 'shaman-elemental', name: 'Elemental', class: 'shaman', role: 'dps' },
  { id: 'shaman-enhancement', name: 'Enhancement', class: 'shaman', role: 'dps' },
  { id: 'shaman-restoration', name: 'Restoration', class: 'shaman', role: 'healer' },

  // Mage
  { id: 'mage-arcane', name: 'Arcane', class: 'mage', role: 'dps' },
  { id: 'mage-fire', name: 'Fire', class: 'mage', role: 'dps' },
  { id: 'mage-frost', name: 'Frost', class: 'mage', role: 'dps' },

  // Warlock
  { id: 'warlock-affliction', name: 'Affliction', class: 'warlock', role: 'dps' },
  { id: 'warlock-demonology', name: 'Demonology', class: 'warlock', role: 'dps' },
  { id: 'warlock-destruction', name: 'Destruction', class: 'warlock', role: 'dps' },

  // Druid
  { id: 'druid-balance', name: 'Balance', class: 'druid', role: 'dps' },
  { id: 'druid-feral', name: 'Feral', class: 'druid', role: 'dps' },
  { id: 'druid-feral-tank', name: 'Feral (Bear)', class: 'druid', role: 'tank' },
  { id: 'druid-restoration', name: 'Restoration', class: 'druid', role: 'healer' },
];

// Helper to get spec by ID
export function getSpec(specId: string): ClassSpec | undefined {
  return CLASS_SPECS.find(s => s.id === specId);
}

// Helper to get specs by role
export function getSpecsByRole(role: 'tank' | 'healer' | 'dps'): ClassSpec[] {
  return CLASS_SPECS.filter(s => s.role === role);
}

// Helper to get specs by class
export function getSpecsByClass(wowClass: WowClass): ClassSpec[] {
  return CLASS_SPECS.filter(s => s.class === wowClass);
}

// The player's spec (always Restoration Druid)
export const PLAYER_SPEC_ID = 'druid-restoration';

// Create a default raid composition
export function createDefaultRaidComposition(): RaidComposition {
  return {
    name: 'Custom',
    slots: [
      // Slot 0: Player (Resto Druid)
      { specId: PLAYER_SPEC_ID },
      // Tanks (3)
      { specId: 'warrior-protection' },
      { specId: 'paladin-protection' },
      { specId: 'druid-feral-tank' },
      // Healers (4 more, 5 total with player)
      { specId: 'priest-holy' },
      { specId: 'priest-holy' },
      { specId: 'paladin-holy' },
      { specId: 'shaman-restoration' },
      // DPS (17)
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
    ],
  };
}

// Preset raid compositions
export const RAID_PRESETS: RaidPreset[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'A well-rounded 25-man composition with good buffs and utility.',
    composition: createDefaultRaidComposition(),
  },
  {
    id: 'melee-heavy',
    name: 'Melee Heavy',
    description: 'Melee-focused composition for physical damage.',
    composition: {
      name: 'Melee Heavy',
      slots: [
        { specId: PLAYER_SPEC_ID },
        // Tanks
        { specId: 'warrior-protection' },
        { specId: 'druid-feral-tank' },
        // Healers
        { specId: 'priest-holy' },
        { specId: 'priest-holy' },
        { specId: 'paladin-holy' },
        { specId: 'shaman-restoration' },
        // DPS - Melee heavy
        { specId: 'rogue-combat' },
        { specId: 'rogue-combat' },
        { specId: 'rogue-combat' },
        { specId: 'rogue-combat' },
        { specId: 'warrior-fury' },
        { specId: 'warrior-fury' },
        { specId: 'warrior-fury' },
        { specId: 'warrior-fury' },
        { specId: 'shaman-enhancement' },
        { specId: 'shaman-enhancement' },
        { specId: 'shaman-enhancement' },
        { specId: 'paladin-retribution' },
        { specId: 'paladin-retribution' },
        { specId: 'druid-feral' },
        { specId: 'druid-feral' },
        { specId: 'hunter-beastmastery' },
        { specId: 'hunter-beastmastery' },
        { specId: 'warlock-destruction' },
      ],
    },
  },
  {
    id: 'caster-heavy',
    name: 'Caster Heavy',
    description: 'Caster-focused composition for spell damage.',
    composition: {
      name: 'Caster Heavy',
      slots: [
        { specId: PLAYER_SPEC_ID },
        // Tanks
        { specId: 'warrior-protection' },
        { specId: 'paladin-protection' },
        // Healers
        { specId: 'priest-holy' },
        { specId: 'priest-holy' },
        { specId: 'paladin-holy' },
        { specId: 'shaman-restoration' },
        // DPS - Caster heavy
        { specId: 'warlock-destruction' },
        { specId: 'warlock-destruction' },
        { specId: 'warlock-destruction' },
        { specId: 'warlock-affliction' },
        { specId: 'warlock-affliction' },
        { specId: 'mage-fire' },
        { specId: 'mage-fire' },
        { specId: 'mage-fire' },
        { specId: 'mage-arcane' },
        { specId: 'mage-arcane' },
        { specId: 'priest-shadow' },
        { specId: 'priest-shadow' },
        { specId: 'shaman-elemental' },
        { specId: 'shaman-elemental' },
        { specId: 'druid-balance' },
        { specId: 'druid-balance' },
        { specId: 'hunter-beastmastery' },
        { specId: 'hunter-beastmastery' },
      ],
    },
  },
];

export function getRaidPreset(presetId: string): RaidPreset | undefined {
  return RAID_PRESETS.find(p => p.id === presetId);
}

// Melee DPS spec IDs
const MELEE_DPS_SPECS = new Set([
  'warrior-arms',
  'warrior-fury',
  'rogue-assassination',
  'rogue-combat',
  'rogue-subtlety',
  'paladin-retribution',
  'shaman-enhancement',
  'druid-feral',
]);

// Determine if a spec is melee (tanks are always melee, plus melee DPS)
export function isMeleeSpec(specId: string): boolean {
  const spec = getSpec(specId);
  if (!spec) return false;

  // Tanks are always melee
  if (spec.role === 'tank') return true;

  // Check if it's a melee DPS spec
  return MELEE_DPS_SPECS.has(specId);
}

// Determine if a spec is ranged (healers + ranged DPS)
export function isRangedSpec(specId: string): boolean {
  return !isMeleeSpec(specId);
}
