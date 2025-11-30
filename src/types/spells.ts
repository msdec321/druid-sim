// Spell effect types for different healing mechanics
export type SpellEffectType = 'direct' | 'hot' | 'channel' | 'buff';

// Direct heal effect
export interface DirectHealEffect {
  type: 'direct';
  minHeal: number;
  maxHeal: number;
  coefficient: number; // spell power coefficient
}

// HoT (Heal over Time) effect
export interface HoTEffect {
  type: 'hot';
  duration: number;      // total duration in seconds
  tickInterval: number;  // seconds between ticks
  healPerTick: number;   // base heal per tick
  coefficient: number;   // spell power coefficient per tick
  maxStacks?: number;    // for Lifebloom
  bloomHeal?: number;    // heal on expire (Lifebloom)
  bloomCoefficient?: number;
}

// Combined direct + HoT (Regrowth)
export interface DirectAndHoTEffect {
  type: 'direct_and_hot';
  direct: Omit<DirectHealEffect, 'type'>;
  hot: Omit<HoTEffect, 'type'>;
}

// Channeled heal effect (Tranquility)
export interface ChannelEffect {
  type: 'channel';
  duration: number;       // channel duration in seconds
  tickInterval: number;   // seconds between ticks
  healPerTick: number;    // base heal per tick
  coefficient: number;
  targetsParty: boolean;  // heals party members
}

// Buff effect (Nature's Swiftness, Innervate, Tree of Life)
export interface BuffEffect {
  type: 'buff';
  duration: number;
  effect: 'next_instant' | 'mana_regen' | 'tree_of_life';
  regenMultiplier?: number; // for Innervate
  manaCostReduction?: number; // for Tree of Life (0.25 = 25% reduction)
  affectedSpells?: string[]; // for Tree of Life (spells affected by mana reduction)
}

// Swiftmend special effect
export interface SwiftmendEffect {
  type: 'swiftmend';
  consumesHoT: ('rejuvenation' | 'regrowth')[];
  healMultiplier: number; // multiplier of consumed HoT's total healing
}

// Mana restore effect (potions, runes)
export interface ManaRestoreEffect {
  type: 'mana_restore';
  minMana: number;
  maxMana: number;
  selfDamageMin?: number;  // Dark Rune damages the player
  selfDamageMax?: number;
}

export type SpellEffect =
  | DirectHealEffect
  | HoTEffect
  | DirectAndHoTEffect
  | ChannelEffect
  | BuffEffect
  | SwiftmendEffect
  | ManaRestoreEffect;

// Main spell definition
export interface Spell {
  id: string;
  name: string;
  icon: string;
  tooltip?: string;       // path to tooltip image
  manaCost: number;
  castTime: number;       // seconds, 0 = instant
  cooldown: number;       // seconds, 0 = no cooldown
  gcd: boolean;           // triggers GCD?
  effect: SpellEffect;
}

// Active HoT on a target
export interface ActiveHoT {
  spellId: string;
  sourceId: string;       // caster ID (for tracking)
  targetId: string;
  remainingDuration: number;
  tickInterval: number;
  nextTickIn: number;     // time until next tick
  healPerTick: number;    // calculated with spell power
  stacks: number;         // 1-3 for Lifebloom, 1 for others
  bloomHeal?: number;     // for Lifebloom
}

// Active buff on the player
export interface ActiveBuff {
  id: string;
  spellId: string;
  remainingDuration: number;
  effect: BuffEffect['effect'];
  regenMultiplier?: number;
}

// Cast state when player is casting
export interface CastState {
  spellId: string;
  targetId: string;
  totalCastTime: number;
  remainingCastTime: number;
}

// Channel state when player is channeling
export interface ChannelState {
  spellId: string;
  targetIds: string[];    // party members for Tranquility
  totalDuration: number;
  remainingDuration: number;
  nextTickIn: number;
  tickInterval: number;
}
