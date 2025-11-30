import type { ActiveBuff, CastState, ChannelState } from './spells';

// Player stats derived from gear
export interface PlayerStats {
  stamina: number;
  intellect: number;
  spirit: number;
  spellPower: number;
  mp5: number;           // mana per 5 seconds
  spellCrit: number;     // spell crit percentage
  hasteRating: number;
}

// Calculated combat stats
export interface CombatStats {
  maxHealth: number;
  maxMana: number;
  spellPower: number;
  critChance: number;    // percentage (0-100)
  hastePercent: number;  // percentage
  mp5: number;
  spiritRegen: number;   // mana per second from spirit (out of FSR)
}

// Player state during encounter
export interface PlayerState {
  stats: CombatStats;
  currentMana: number;
  gcdRemaining: number;           // seconds until GCD ends
  casting: CastState | null;      // current cast in progress
  channeling: ChannelState | null; // current channel in progress
  cooldowns: Record<string, number>; // spellId -> seconds remaining
  buffs: ActiveBuff[];            // active self-buffs
  inFiveSecondRule: boolean;      // true if cast a spell in last 5 seconds
  fiveSecondRuleTimer: number;    // time remaining in 5SR
}

// Constants for TBC mechanics
export const TBC_CONSTANTS = {
  BASE_GCD: 1.5,              // seconds
  MIN_GCD: 1.0,               // minimum GCD with haste
  CRIT_RATING_PER_PERCENT: 22.08,
  HASTE_RATING_PER_PERCENT: 15.77,
  INTELLECT_PER_CRIT: 80,     // intellect needed for 1% crit
  MANA_PER_INTELLECT: 15,
  HEALTH_PER_STAMINA: 10,
  BASE_HEALTH: 4254,          // base health before stamina
  FIVE_SECOND_RULE: 5,        // seconds
  TREE_OF_LIFE_MANA_REDUCTION: 0.20, // 20% mana cost reduction
} as const;

// Helper to calculate combat stats from player stats
export function calculateCombatStats(stats: PlayerStats): CombatStats {
  return {
    maxHealth: TBC_CONSTANTS.BASE_HEALTH + (stats.stamina * TBC_CONSTANTS.HEALTH_PER_STAMINA),
    maxMana: 2958 + (stats.intellect * TBC_CONSTANTS.MANA_PER_INTELLECT), // base mana + int
    spellPower: stats.spellPower,
    critChance: stats.spellCrit,
    hastePercent: stats.hasteRating / TBC_CONSTANTS.HASTE_RATING_PER_PERCENT,
    mp5: stats.mp5,
    spiritRegen: calculateSpiritRegen(stats.spirit, stats.intellect),
  };
}

// Spirit-based mana regen formula for TBC
function calculateSpiritRegen(spirit: number, intellect: number): number {
  // TBC formula: 0.009327 * Spirit * sqrt(Intellect)
  return 0.009327 * spirit * Math.sqrt(intellect);
}

// Calculate effective GCD with haste
export function calculateGCD(hastePercent: number): number {
  const reducedGCD = TBC_CONSTANTS.BASE_GCD / (1 + hastePercent / 100);
  return Math.max(reducedGCD, TBC_CONSTANTS.MIN_GCD);
}

// Calculate cast time with haste
export function calculateCastTime(baseCastTime: number, hastePercent: number): number {
  if (baseCastTime === 0) return 0; // instant cast
  return baseCastTime / (1 + hastePercent / 100);
}
