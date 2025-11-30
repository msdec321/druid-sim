import type { ActiveHoT, DirectAndHoTEffect } from '../types/spells';
import type { RaidMember } from '../types/encounter';
import { getSpell } from '../data/spells';
import { TALENT_CONSTANTS, type HealEvent } from './lifebloom';

// Additional talent constants for Regrowth
export const REGROWTH_TALENT_CONSTANTS = {
  // Improved Regrowth: +50% crit chance to Regrowth direct heal
  IMPROVED_REGROWTH_CRIT: 50,
} as const;

export interface RegrowthResult {
  directHeal: number;
  directOverheal: number;
  directCrit: boolean;
  hotApplied: boolean;
  healPerTick: number;
}

/**
 * Calculate the direct heal portion of Regrowth
 * Formula (talented): (baseHeal + coefficient * spellPower) * GoN
 */
export function calculateRegrowthDirectHeal(
  spellPower: number,
  applyTalents: boolean = true
): { min: number; max: number } {
  const spell = getSpell('regrowth');
  if (!spell || spell.effect.type !== 'direct_and_hot') {
    throw new Error('Regrowth spell not found');
  }

  const effect = spell.effect as DirectAndHoTEffect;
  let healMultiplier = 1;

  if (applyTalents) {
    // Gift of Nature applies to total healing
    healMultiplier *= TALENT_CONSTANTS.GIFT_OF_NATURE;
  }

  const spellPowerBonus = effect.direct.coefficient * spellPower;
  const minHeal = Math.floor((effect.direct.minHeal + spellPowerBonus) * healMultiplier);
  const maxHeal = Math.floor((effect.direct.maxHeal + spellPowerBonus) * healMultiplier);

  return { min: minHeal, max: maxHeal };
}

/**
 * Calculate the HoT heal per tick for Regrowth
 * Formula (talented): (basePerTick + coefficient * EmpRej * spellPower) * GoN
 */
export function calculateRegrowthTickHeal(
  spellPower: number,
  applyTalents: boolean = true
): number {
  const spell = getSpell('regrowth');
  if (!spell || spell.effect.type !== 'direct_and_hot') {
    throw new Error('Regrowth spell not found');
  }

  const effect = spell.effect as DirectAndHoTEffect;
  const basePerTick = effect.hot.healPerTick;

  let coefficientMultiplier = effect.hot.coefficient;
  let healMultiplier = 1;

  if (applyTalents) {
    // Empowered Rejuvenation applies to HoT coefficient
    coefficientMultiplier *= TALENT_CONSTANTS.EMPOWERED_REJUVENATION;
    // Gift of Nature applies to total healing
    healMultiplier *= TALENT_CONSTANTS.GIFT_OF_NATURE;
  }

  const spellPowerBonus = coefficientMultiplier * spellPower;
  return Math.floor((basePerTick + spellPowerBonus) * healMultiplier);
}

/**
 * Calculate effective crit chance for Regrowth direct heal
 * Includes base crit chance + Improved Regrowth talent (+50%)
 */
export function calculateRegrowthCritChance(
  baseCritChance: number,
  applyTalents: boolean = true
): number {
  if (applyTalents) {
    return baseCritChance + REGROWTH_TALENT_CONSTANTS.IMPROVED_REGROWTH_CRIT;
  }
  return baseCritChance;
}

/**
 * Apply Regrowth to a target
 * - Calculates and applies direct heal (can crit)
 * - Creates/refreshes HoT on target
 * - Returns result with heal amounts and crit info
 */
export function applyRegrowth(
  target: RaidMember,
  player: {
    spellPower: number;
    critChance: number;
  },
  playerId: string = 'player'
): RegrowthResult {
  const spell = getSpell('regrowth');
  if (!spell || spell.effect.type !== 'direct_and_hot') {
    throw new Error('Regrowth spell not found');
  }

  const effect = spell.effect as DirectAndHoTEffect;

  // Calculate direct heal
  const directHealRange = calculateRegrowthDirectHeal(player.spellPower);
  const baseDirectHeal = Math.floor(
    Math.random() * (directHealRange.max - directHealRange.min + 1) + directHealRange.min
  );

  // Check for crit on direct heal (includes Improved Regrowth +50%)
  const effectiveCritChance = calculateRegrowthCritChance(player.critChance);
  const directCrit = Math.random() * 100 < effectiveCritChance;
  const directHealAmount = directCrit ? Math.floor(baseDirectHeal * 1.5) : baseDirectHeal;

  // Apply direct heal
  const missingHealth = target.maxHealth - target.currentHealth;
  const actualDirectHeal = Math.min(directHealAmount, missingHealth);
  const directOverheal = directHealAmount - actualDirectHeal;
  target.currentHealth = Math.min(target.maxHealth, target.currentHealth + actualDirectHeal);

  // Calculate HoT heal per tick
  const healPerTick = calculateRegrowthTickHeal(player.spellPower);

  // Remove existing Regrowth HoT from this caster (refresh)
  const existingIndex = target.hots.findIndex(
    hot => hot.spellId === 'regrowth' && hot.sourceId === playerId
  );
  if (existingIndex !== -1) {
    target.hots.splice(existingIndex, 1);
  }

  // Create new Regrowth HoT
  const newHot: ActiveHoT = {
    spellId: 'regrowth',
    sourceId: playerId,
    targetId: target.id,
    remainingDuration: effect.hot.duration,
    tickInterval: effect.hot.tickInterval,
    nextTickIn: effect.hot.tickInterval,
    healPerTick,
    stacks: 1,
  };

  target.hots.push(newHot);

  return {
    directHeal: actualDirectHeal,
    directOverheal,
    directCrit,
    hotApplied: true,
    healPerTick,
  };
}

/**
 * Process a Regrowth HoT tick
 * Note: Regrowth HoT ticks do NOT crit
 */
export function processRegrowthTick(
  hot: ActiveHoT,
  target: RaidMember
): HealEvent {
  const healAmount = hot.healPerTick;

  // Calculate actual heal and overheal
  const missingHealth = target.maxHealth - target.currentHealth;
  const actualHeal = Math.min(healAmount, missingHealth);
  const overheal = healAmount - actualHeal;

  // Apply the heal
  target.currentHealth = Math.min(target.maxHealth, target.currentHealth + actualHeal);

  // Reset tick timer
  hot.nextTickIn = hot.tickInterval;

  return {
    targetId: target.id,
    amount: actualHeal,
    overheal,
    isCrit: false, // Regrowth HoT never crits
    spellId: 'regrowth',
    type: 'tick',
  };
}
