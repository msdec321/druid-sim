// Combat table system for TBC tank avoidance

// Attack outcome types
export type AttackOutcome = 'miss' | 'dodge' | 'parry' | 'block' | 'hit';

// Tank avoidance stats
export interface AvoidanceStats {
  missChance: number;      // % chance for attack to miss
  dodgeChance: number;     // % chance to dodge
  parryChance: number;     // % chance to parry
  blockChance: number;     // % chance to block
  blockValue: number;      // Damage reduced when blocking
}

// Result of a combat table roll
export interface AttackResult {
  outcome: AttackOutcome;
  damageDealt: number;     // Actual damage after mitigation
  damageMitigated: number; // Damage prevented by block
  roll: number;            // The actual roll (for debugging)
}

// Default tank avoidance stats (Protection Warrior/Paladin)
export const DEFAULT_TANK_AVOIDANCE: AvoidanceStats = {
  missChance: 5,
  dodgeChance: 20,
  parryChance: 15,
  blockChance: 30,
  blockValue: 1800,
};

// Avoidance stats by spec ID
const SPEC_AVOIDANCE: Record<string, AvoidanceStats> = {
  'warrior-protection': {
    missChance: 5,
    dodgeChance: 20,
    parryChance: 15,
    blockChance: 30,
    blockValue: 1800,
  },
  'paladin-protection': {
    missChance: 5,
    dodgeChance: 18,
    parryChance: 14,
    blockChance: 35, // Paladins have higher block from Holy Shield
    blockValue: 1600,
  },
  'druid-feral-tank': {
    missChance: 5,
    dodgeChance: 35, // Bears have high dodge
    parryChance: 0,  // Bears cannot parry
    blockChance: 0,  // Bears cannot block
    blockValue: 0,
  },
};

/**
 * Get avoidance stats for a spec
 */
export function getAvoidanceStats(specId: string): AvoidanceStats | null {
  return SPEC_AVOIDANCE[specId] || null;
}

/**
 * Check if a spec is a tank spec with avoidance
 */
export function isTankSpec(specId: string): boolean {
  return specId in SPEC_AVOIDANCE;
}

/**
 * Roll on the combat table to determine attack outcome
 *
 * Combat table (single roll system):
 * - Roll 0 to 100
 * - Check against stacked thresholds in order: Miss -> Dodge -> Parry -> Block -> Hit
 *
 * Example with default stats (5/20/15/30):
 *   0.00 -  4.99 = Miss
 *   5.00 - 24.99 = Dodge  (5 + 20 = 25)
 *  25.00 - 39.99 = Parry  (25 + 15 = 40)
 *  40.00 - 69.99 = Block  (40 + 30 = 70)
 *  70.00 - 100   = Hit
 */
export function rollCombatTable(
  baseDamage: number,
  avoidance: AvoidanceStats
): AttackResult {
  const roll = Math.random() * 100;

  // Build cumulative thresholds
  const missThreshold = avoidance.missChance;
  const dodgeThreshold = missThreshold + avoidance.dodgeChance;
  const parryThreshold = dodgeThreshold + avoidance.parryChance;
  const blockThreshold = parryThreshold + avoidance.blockChance;

  // Check against thresholds in priority order
  if (roll < missThreshold) {
    return {
      outcome: 'miss',
      damageDealt: 0,
      damageMitigated: baseDamage,
      roll,
    };
  }

  if (roll < dodgeThreshold) {
    return {
      outcome: 'dodge',
      damageDealt: 0,
      damageMitigated: baseDamage,
      roll,
    };
  }

  if (roll < parryThreshold) {
    return {
      outcome: 'parry',
      damageDealt: 0,
      damageMitigated: baseDamage,
      roll,
    };
  }

  if (roll < blockThreshold) {
    // Block reduces damage by block value, minimum 0
    const blockedDamage = Math.min(baseDamage, avoidance.blockValue);
    const damageAfterBlock = Math.max(0, baseDamage - avoidance.blockValue);

    return {
      outcome: 'block',
      damageDealt: damageAfterBlock,
      damageMitigated: blockedDamage,
      roll,
    };
  }

  // Normal hit - full damage
  return {
    outcome: 'hit',
    damageDealt: baseDamage,
    damageMitigated: 0,
    roll,
  };
}

/**
 * Format attack result for logging
 */
export function formatAttackResult(
  attackerName: string,
  targetName: string,
  baseDamage: number,
  result: AttackResult
): string {
  switch (result.outcome) {
    case 'miss':
      return `${attackerName}'s attack MISSED ${targetName}`;
    case 'dodge':
      return `${targetName} DODGED ${attackerName}'s attack`;
    case 'parry':
      return `${targetName} PARRIED ${attackerName}'s attack`;
    case 'block':
      return `${targetName} BLOCKED ${attackerName}'s attack (${result.damageDealt} damage, ${result.damageMitigated} blocked)`;
    case 'hit':
      return `${attackerName} hits ${targetName} for ${result.damageDealt} damage`;
  }
}
