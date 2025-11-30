import type { ActiveHoT } from '../types/spells';
import type { RaidMember } from '../types/encounter';
import { TALENT_CONSTANTS, type HealEvent } from './lifebloom';

// HoTs that Swiftmend can consume, in priority order
const CONSUMABLE_HOTS = ['rejuvenation', 'regrowth'] as const;

export interface SwiftmendResult {
  success: boolean;
  healAmount: number;
  overheal: number;
  isCrit: boolean;
  consumedHoT: string | null;
  error?: string;
}

/**
 * Find a valid HoT to consume for Swiftmend
 * Priority: Rejuvenation > Regrowth
 * Only considers HoTs from the specified caster
 */
export function findConsumableHoT(
  target: RaidMember,
  casterId: string
): ActiveHoT | null {
  for (const hotId of CONSUMABLE_HOTS) {
    const hot = target.hots.find(
      h => h.spellId === hotId && h.sourceId === casterId
    );
    if (hot) {
      return hot;
    }
  }
  return null;
}

/**
 * Calculate the remaining healing of a HoT
 * This is the total healing that would occur if the HoT ran its full remaining duration
 */
export function calculateRemainingHoTHealing(hot: ActiveHoT): number {
  // Calculate remaining ticks (including partial tick at the end)
  const remainingTicks = Math.ceil(hot.remainingDuration / hot.tickInterval);
  return hot.healPerTick * remainingTicks;
}

/**
 * Calculate Swiftmend heal amount with talent scaling
 * Formula: remainingHoTHealing * GoN (if not already applied to the HoT)
 *
 * Note: Since Regrowth HoTs already have GoN applied, we need to be careful
 * For simplicity, we apply GoN here and assume it stacks (TBC behavior varied)
 */
export function calculateSwiftmendHeal(
  remainingHealing: number,
  applyTalents: boolean = true
): number {
  let healMultiplier = 1;

  if (applyTalents) {
    // Gift of Nature applies to Swiftmend healing
    healMultiplier *= TALENT_CONSTANTS.GIFT_OF_NATURE;
  }

  return Math.floor(remainingHealing * healMultiplier);
}

/**
 * Check if Swiftmend can be cast on a target
 * Returns true if the target has a valid HoT to consume
 */
export function canSwiftmend(
  target: RaidMember,
  casterId: string
): boolean {
  return findConsumableHoT(target, casterId) !== null;
}

/**
 * Apply Swiftmend to a target
 * - Finds and consumes a Rejuvenation or Regrowth HoT
 * - Instantly heals for the remaining value of that HoT
 * - Can crit based on player's crit chance
 */
export function applySwiftmend(
  target: RaidMember,
  player: {
    critChance: number;
  },
  playerId: string = 'player'
): SwiftmendResult {
  // Find a HoT to consume
  const hotToConsume = findConsumableHoT(target, playerId);

  if (!hotToConsume) {
    return {
      success: false,
      healAmount: 0,
      overheal: 0,
      isCrit: false,
      consumedHoT: null,
      error: 'No Rejuvenation or Regrowth to consume',
    };
  }

  // Calculate the heal amount from remaining HoT healing
  const remainingHealing = calculateRemainingHoTHealing(hotToConsume);
  const baseHeal = calculateSwiftmendHeal(remainingHealing);

  // Check for crit
  const isCrit = Math.random() * 100 < player.critChance;
  const healAmount = isCrit ? Math.floor(baseHeal * 1.5) : baseHeal;

  // Apply the heal
  const missingHealth = target.maxHealth - target.currentHealth;
  const actualHeal = Math.min(healAmount, missingHealth);
  const overheal = healAmount - actualHeal;
  target.currentHealth = Math.min(target.maxHealth, target.currentHealth + actualHeal);

  // Remove the consumed HoT
  const hotIndex = target.hots.findIndex(
    h => h.spellId === hotToConsume.spellId && h.sourceId === playerId
  );
  if (hotIndex !== -1) {
    target.hots.splice(hotIndex, 1);
  }

  return {
    success: true,
    healAmount: actualHeal,
    overheal,
    isCrit,
    consumedHoT: hotToConsume.spellId,
  };
}

/**
 * Create a heal event from a Swiftmend result
 */
export function createSwiftmendHealEvent(
  result: SwiftmendResult,
  targetId: string
): HealEvent | null {
  if (!result.success) return null;

  return {
    targetId,
    amount: result.healAmount,
    overheal: result.overheal,
    isCrit: result.isCrit,
    spellId: 'swiftmend',
    type: 'direct',
  };
}
