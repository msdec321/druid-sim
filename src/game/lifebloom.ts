import type { ActiveHoT, HoTEffect } from '../types/spells';
import type { RaidMember } from '../types/encounter';
import { getSpell } from '../data/spells';

// Talent multipliers for a standard Resto Druid build
export const TALENT_CONSTANTS = {
  // Empowered Rejuvenation: +20% to HoT spell power coefficients
  EMPOWERED_REJUVENATION: 1.2,
  // Gift of Nature: +10% to all healing done
  GIFT_OF_NATURE: 1.1,
} as const;

export interface LifebloomResult {
  type: 'applied' | 'refreshed' | 'stacked';
  stacks: number;
  healPerTick: number;
  bloomHeal: number;
  bloomed: boolean;
  bloomAmount?: number;
}

export interface HealEvent {
  targetId: string;
  amount: number;
  overheal: number;
  isCrit: boolean;
  spellId: string;
  type: 'tick' | 'bloom' | 'direct';
}

/**
 * Calculate the heal per tick for Lifebloom based on stacks and spell power
 * Formula (talented): basePerTick * stacks * GoN + (coefficient * stacks * EmpRej * GoN * spellPower)
 */
export function calculateLifebloomTickHeal(
  stacks: number,
  spellPower: number,
  applyTalents: boolean = true
): number {
  const spell = getSpell('lifebloom');
  if (!spell || spell.effect.type !== 'hot') {
    throw new Error('Lifebloom spell not found');
  }

  const effect = spell.effect as HoTEffect;
  const basePerTick = effect.healPerTick * stacks;

  let coefficientMultiplier = effect.coefficient * stacks;
  let healMultiplier = 1;

  if (applyTalents) {
    // Empowered Rejuvenation applies to coefficient
    coefficientMultiplier *= TALENT_CONSTANTS.EMPOWERED_REJUVENATION;
    // Gift of Nature applies to total healing
    healMultiplier *= TALENT_CONSTANTS.GIFT_OF_NATURE;
  }

  const spellPowerBonus = coefficientMultiplier * spellPower;
  return Math.floor((basePerTick + spellPowerBonus) * healMultiplier);
}

/**
 * Calculate the bloom heal for Lifebloom
 * Formula (talented): baseBloom * GoN + (bloomCoeff * EmpRej * GoN * spellPower)
 */
export function calculateLifebloomBloom(
  spellPower: number,
  applyTalents: boolean = true
): number {
  const spell = getSpell('lifebloom');
  if (!spell || spell.effect.type !== 'hot') {
    throw new Error('Lifebloom spell not found');
  }

  const effect = spell.effect as HoTEffect;
  const baseBloom = effect.bloomHeal ?? 600;

  let coefficientMultiplier = effect.bloomCoefficient ?? 0.34;
  let healMultiplier = 1;

  if (applyTalents) {
    // Empowered Rejuvenation now applies to bloom (post-2.4)
    coefficientMultiplier *= TALENT_CONSTANTS.EMPOWERED_REJUVENATION;
    // Gift of Nature applies to total healing
    healMultiplier *= TALENT_CONSTANTS.GIFT_OF_NATURE;
  }

  const spellPowerBonus = coefficientMultiplier * spellPower;
  return Math.floor((baseBloom + spellPowerBonus) * healMultiplier);
}

/**
 * Apply or refresh Lifebloom on a target
 * - If no Lifebloom exists: creates new HoT at 1 stack
 * - If Lifebloom exists at < 3 stacks: adds a stack and resets duration
 * - If Lifebloom exists at 3 stacks: resets duration (rolling, no bloom)
 *
 * Returns the result of the application and whether a bloom occurred
 */
export function applyLifebloom(
  target: RaidMember,
  player: {
    spellPower: number;
    critChance: number;
  },
  playerId: string = 'player'
): LifebloomResult {
  const spell = getSpell('lifebloom');
  if (!spell || spell.effect.type !== 'hot') {
    throw new Error('Lifebloom spell not found');
  }

  const effect = spell.effect as HoTEffect;
  const existingLifebloom = target.hots.find(
    hot => hot.spellId === 'lifebloom' && hot.sourceId === playerId
  );

  const healPerTick = calculateLifebloomTickHeal(1, player.spellPower);
  const bloomHeal = calculateLifebloomBloom(player.spellPower);

  if (!existingLifebloom) {
    // No existing Lifebloom - apply fresh at 1 stack
    const newHot: ActiveHoT = {
      spellId: 'lifebloom',
      sourceId: playerId,
      targetId: target.id,
      remainingDuration: effect.duration,
      tickInterval: effect.tickInterval,
      nextTickIn: effect.tickInterval,
      healPerTick: healPerTick,
      stacks: 1,
      bloomHeal: bloomHeal,
    };

    target.hots.push(newHot);

    return {
      type: 'applied',
      stacks: 1,
      healPerTick,
      bloomHeal,
      bloomed: false,
    };
  }

  // Existing Lifebloom found
  const currentStacks = existingLifebloom.stacks;

  if (currentStacks < (effect.maxStacks ?? 3)) {
    // Add a stack and reset duration
    existingLifebloom.stacks += 1;
    existingLifebloom.remainingDuration = effect.duration;
    existingLifebloom.healPerTick = calculateLifebloomTickHeal(
      existingLifebloom.stacks,
      player.spellPower
    );
    // Note: nextTickIn is NOT reset - tick timer continues

    return {
      type: 'stacked',
      stacks: existingLifebloom.stacks,
      healPerTick: existingLifebloom.healPerTick,
      bloomHeal,
      bloomed: false,
    };
  }

  // Already at max stacks - just refresh duration (rolling)
  existingLifebloom.remainingDuration = effect.duration;
  // Recalculate in case spell power changed
  existingLifebloom.healPerTick = calculateLifebloomTickHeal(3, player.spellPower);
  existingLifebloom.bloomHeal = bloomHeal;

  return {
    type: 'refreshed',
    stacks: 3,
    healPerTick: existingLifebloom.healPerTick,
    bloomHeal,
    bloomed: false,
  };
}

/**
 * Process a Lifebloom tick
 * Called when nextTickIn reaches 0
 * Returns the heal event
 */
export function processLifebloomTick(
  hot: ActiveHoT,
  target: RaidMember,
  critChance: number
): HealEvent {
  // Roll for crit (healer's crit chance)
  const isCrit = Math.random() * 100 < critChance;
  const healAmount = isCrit ? Math.floor(hot.healPerTick * 1.5) : hot.healPerTick;

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
    isCrit,
    spellId: 'lifebloom',
    type: 'tick',
  };
}

/**
 * Process Lifebloom expiration (bloom)
 * Called when remainingDuration reaches 0
 * The bloom heal crits based on the TARGET's crit chance, not the druid's
 * Returns the heal event and removes the HoT from the target
 */
export function processLifebloomExpiration(
  hot: ActiveHoT,
  target: RaidMember,
  targetCritChance: number = 0 // Target's spell crit chance
): HealEvent {
  const bloomAmount = hot.bloomHeal ?? calculateLifebloomBloom(0);

  // Bloom crit is based on target's crit chance (per TBC mechanics)
  const isCrit = Math.random() * 100 < targetCritChance;
  const healAmount = isCrit ? Math.floor(bloomAmount * 1.5) : bloomAmount;

  // Calculate actual heal and overheal
  const missingHealth = target.maxHealth - target.currentHealth;
  const actualHeal = Math.min(healAmount, missingHealth);
  const overheal = healAmount - actualHeal;

  // Apply the heal
  target.currentHealth = Math.min(target.maxHealth, target.currentHealth + actualHeal);

  // Remove the HoT from target
  const hotIndex = target.hots.findIndex(
    h => h.spellId === hot.spellId && h.sourceId === hot.sourceId
  );
  if (hotIndex !== -1) {
    target.hots.splice(hotIndex, 1);
  }

  return {
    targetId: target.id,
    amount: actualHeal,
    overheal,
    isCrit,
    spellId: 'lifebloom',
    type: 'bloom',
  };
}

/**
 * Update Lifebloom HoT for a time delta
 * Processes ticks and expiration
 * Returns all heal events that occurred
 */
export function updateLifebloom(
  hot: ActiveHoT,
  target: RaidMember,
  deltaTime: number,
  healerCritChance: number,
  targetCritChance: number = 0
): HealEvent[] {
  const events: HealEvent[] = [];
  let remainingDelta = deltaTime;

  while (remainingDelta > 0 && hot.remainingDuration > 0) {
    // Check if a tick occurs before expiration
    const timeToNextTick = hot.nextTickIn;
    const timeToExpire = hot.remainingDuration;

    if (timeToNextTick <= remainingDelta && timeToNextTick <= timeToExpire) {
      // Tick occurs
      remainingDelta -= timeToNextTick;
      hot.remainingDuration -= timeToNextTick;
      hot.nextTickIn = 0;

      const tickEvent = processLifebloomTick(hot, target, healerCritChance);
      events.push(tickEvent);

      // Check if expired right at the tick
      if (hot.remainingDuration <= 0) {
        const bloomEvent = processLifebloomExpiration(hot, target, targetCritChance);
        events.push(bloomEvent);
        break;
      }
    } else if (timeToExpire <= remainingDelta) {
      // Expiration occurs before next tick
      remainingDelta -= timeToExpire;
      hot.remainingDuration = 0;
      hot.nextTickIn -= timeToExpire;

      const bloomEvent = processLifebloomExpiration(hot, target, targetCritChance);
      events.push(bloomEvent);
      break;
    } else {
      // Neither tick nor expiration in this delta
      hot.remainingDuration -= remainingDelta;
      hot.nextTickIn -= remainingDelta;
      remainingDelta = 0;
    }
  }

  return events;
}
