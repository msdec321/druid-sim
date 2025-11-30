import type { RaidMember } from '../types/encounter';

// ============================================================================
// Resto Shaman Configuration
// ============================================================================

// Resto Shaman stats (as specified)
export const RESTO_SHAMAN_STATS = {
  bonusHealing: 2400,
  spellHasteRating: 320,
} as const;

// TBC haste rating to percent conversion at level 70
const HASTE_RATING_CONVERSION = 15.77;

// Resto Shaman talents
export const SHAMAN_TALENT_CONSTANTS = {
  // Purification: +10% to healing spells
  PURIFICATION: 1.10,
  // Improved Chain Heal: +20% to Chain Heal specifically
  IMPROVED_CHAIN_HEAL: 1.20,
} as const;

// Combined talent multiplier for Chain Heal
const CHAIN_HEAL_TALENT_MULTIPLIER =
  SHAMAN_TALENT_CONSTANTS.PURIFICATION * SHAMAN_TALENT_CONSTANTS.IMPROVED_CHAIN_HEAL;

// ============================================================================
// Chain Heal Spell Data
// ============================================================================

export const CHAIN_HEAL_DATA = {
  // Rank 5 (max at level 70)
  baseHealMin: 826,
  baseHealMax: 943,
  manaCost: 540,
  baseCastTime: 2.5, // seconds
  maxTargets: 3,
  jumpReduction: 0.5, // Each jump heals for 50% of previous
  baseCoefficient: 0.714, // 71.4% spell power coefficient for primary target
  jumpRange: 12.5, // yards (not currently used but documented for future)
} as const;

// ============================================================================
// Chain Heal Calculations
// ============================================================================

export interface ChainHealTarget {
  memberId: string;
  healAmount: number;
  isJump: boolean;
}

export interface ChainHealResult {
  targets: ChainHealTarget[];
  castTime: number;
  manaCost: number;
}

/**
 * Calculate spell haste percentage from haste rating
 * Formula: % Spell Haste = Haste Rating / 15.77
 */
export function calculateSpellHaste(hasteRating: number): number {
  return hasteRating / HASTE_RATING_CONVERSION;
}

/**
 * Calculate cast time after haste
 * Formula: New Cast Time = Base Cast Time / (1 + (% Haste / 100))
 */
export function calculateCastTimeWithHaste(baseCastTime: number, hastePercent: number): number {
  return baseCastTime / (1 + hastePercent / 100);
}

/**
 * Calculate the base heal amount for Chain Heal (random between min and max)
 */
function rollBaseHeal(): number {
  return Math.floor(
    Math.random() * (CHAIN_HEAL_DATA.baseHealMax - CHAIN_HEAL_DATA.baseHealMin + 1) +
    CHAIN_HEAL_DATA.baseHealMin
  );
}

/**
 * Calculate Chain Heal amount for a specific jump
 *
 * Formula: Heal Amount = (Base Heal + Bonus Healing × Coefficient) × Talent Multiplier
 *
 * Coefficients per target (untalented):
 * - 1st target: 71.4% (0.714)
 * - 2nd target: 35.7% (0.714 × 0.5)
 * - 3rd target: 17.85% (0.714 × 0.25)
 *
 * With talents (Purification +10%, Improved Chain Heal +20%):
 * - Coefficient is multiplied by 1.32 (1.1 × 1.2)
 * - Resulting in: 94%, 47%, 24% effective coefficients
 */
export function calculateChainHealAmount(
  jumpIndex: number, // 0 = primary target, 1 = first jump, 2 = second jump
  bonusHealing: number,
  baseHeal?: number, // Optional: use specific base heal value
  applyTalents: boolean = true
): number {
  const base = baseHeal ?? rollBaseHeal();

  // Calculate the reduction multiplier for this jump (1, 0.5, 0.25, etc.)
  const jumpMultiplier = Math.pow(CHAIN_HEAL_DATA.jumpReduction, jumpIndex);

  // Base heal is reduced per jump
  const adjustedBaseHeal = base * jumpMultiplier;

  // Coefficient is also reduced per jump
  const coefficient = CHAIN_HEAL_DATA.baseCoefficient * jumpMultiplier;

  // Calculate spell power contribution
  let spellPowerHeal = bonusHealing * coefficient;

  // Apply talent multiplier if enabled
  const talentMultiplier = applyTalents ? CHAIN_HEAL_TALENT_MULTIPLIER : 1;

  // Total heal = (base + spell power) × talent multiplier
  return Math.floor((adjustedBaseHeal + spellPowerHeal) * talentMultiplier);
}

/**
 * Select the best targets for Chain Heal
 * Chain Heal is a "smart" heal that prioritizes lowest health targets
 *
 * @param raidMembers - All raid members
 * @param primaryTargetId - The initial target (usually lowest health or tank)
 * @param maxTargets - Maximum number of targets (default 3)
 * @returns Array of target IDs in order of healing
 */
export function selectChainHealTargets(
  raidMembers: RaidMember[],
  primaryTargetId: string,
  maxTargets: number = CHAIN_HEAL_DATA.maxTargets
): string[] {
  const targets: string[] = [];

  // Find primary target
  const primaryTarget = raidMembers.find(m => m.id === primaryTargetId);
  if (!primaryTarget || primaryTarget.isDead) {
    return targets;
  }

  targets.push(primaryTargetId);

  // Get alive raid members excluding primary target, sorted by health deficit
  const otherMembers = raidMembers
    .filter(m => !m.isDead && m.id !== primaryTargetId)
    .map(m => ({
      id: m.id,
      healthDeficit: m.maxHealth - m.currentHealth,
      healthPercent: m.currentHealth / m.maxHealth,
    }))
    .filter(m => m.healthDeficit > 0) // Only consider damaged targets
    .sort((a, b) => b.healthDeficit - a.healthDeficit); // Sort by most damaged first

  // Add jump targets (prioritize lowest health)
  for (let i = 0; i < maxTargets - 1 && i < otherMembers.length; i++) {
    targets.push(otherMembers[i].id);
  }

  return targets;
}

/**
 * Calculate full Chain Heal result including all targets and amounts
 */
export function calculateChainHeal(
  raidMembers: RaidMember[],
  primaryTargetId: string,
  bonusHealing: number = RESTO_SHAMAN_STATS.bonusHealing,
  hasteRating: number = RESTO_SHAMAN_STATS.spellHasteRating
): ChainHealResult {
  // Roll base heal once (same base for all jumps)
  const baseHeal = rollBaseHeal();

  // Calculate haste-adjusted cast time
  const hastePercent = calculateSpellHaste(hasteRating);
  const castTime = calculateCastTimeWithHaste(CHAIN_HEAL_DATA.baseCastTime, hastePercent);

  // Select targets
  const targetIds = selectChainHealTargets(raidMembers, primaryTargetId);

  // Calculate heal amounts for each target
  const targets: ChainHealTarget[] = targetIds.map((memberId, index) => ({
    memberId,
    healAmount: calculateChainHealAmount(index, bonusHealing, baseHeal),
    isJump: index > 0,
  }));

  return {
    targets,
    castTime,
    manaCost: CHAIN_HEAL_DATA.manaCost,
  };
}

/**
 * Apply Chain Heal to raid members
 * Mutates the raid members' health values
 *
 * @returns Array of heal events for floating combat text
 */
export function applyChainHeal(
  raidMembers: RaidMember[],
  chainHealResult: ChainHealResult
): Array<{ targetId: string; amount: number; overheal: number }> {
  const healEvents: Array<{ targetId: string; amount: number; overheal: number }> = [];

  for (const target of chainHealResult.targets) {
    const member = raidMembers.find(m => m.id === target.memberId);
    if (!member || member.isDead) continue;

    const missingHealth = member.maxHealth - member.currentHealth;
    const actualHeal = Math.min(target.healAmount, missingHealth);
    const overheal = target.healAmount - actualHeal;

    member.currentHealth = Math.min(member.maxHealth, member.currentHealth + actualHeal);

    healEvents.push({
      targetId: member.id,
      amount: target.healAmount,
      overheal,
    });
  }

  return healEvents;
}

// ============================================================================
// NPC Healer AI
// ============================================================================

export interface NPCHealerState {
  id: string;
  specId: string;
  castTimeRemaining: number;
  currentCast: {
    spellId: string;
    targetId: string;
    chainHealResult?: ChainHealResult;
  } | null;
  gcdRemaining: number;
  /** Initial delay before the healer starts casting (0-2 seconds) */
  initialDelay: number;
  /** Reaction delay after finishing a cast before starting the next (0-0.5 seconds) */
  reactionDelay: number;
}

/**
 * Visual data for Chain Heal effect (yellow bouncing lines)
 */
export interface ChainHealVisual {
  id: number;
  sourceId: string;  // The shaman casting
  targetIds: string[];  // All targets in order (for drawing lines)
  timestamp: number;  // When the heal landed (for fade timing)
}

// Counter for unique visual IDs
let chainHealVisualIdCounter = 0;

/**
 * Result from updating NPC healer, includes both heal events and visual data
 */
export interface NPCHealerUpdateResult {
  healEvents: Array<{ targetId: string; amount: number; overheal: number }>;
  chainHealVisual: ChainHealVisual | null;
}

// Delay constants for natural-feeling AI behavior
const INITIAL_DELAY_MIN = 0;
const INITIAL_DELAY_MAX = 2; // seconds
const REACTION_DELAY_MIN = 0;
const REACTION_DELAY_MAX = 0.5; // seconds

/**
 * Initialize NPC healer state for a resto shaman
 * Includes a random initial delay (0-2s) before they start casting
 */
export function createRestoShamanState(id: string): NPCHealerState {
  // Random initial delay so shamans don't all start casting at the same time
  const initialDelay = Math.random() * (INITIAL_DELAY_MAX - INITIAL_DELAY_MIN) + INITIAL_DELAY_MIN;

  return {
    id,
    specId: 'shaman-restoration',
    castTimeRemaining: 0,
    currentCast: null,
    gcdRemaining: 0,
    initialDelay,
    reactionDelay: 0,
  };
}

/**
 * Find the best Chain Heal target based on raid health
 * Prefers targets with significant health deficits that have nearby injured allies
 */
export function findBestChainHealTarget(raidMembers: RaidMember[]): string | null {
  const aliveMembers = raidMembers.filter(m => !m.isDead);
  if (aliveMembers.length === 0) return null;

  // Score each potential primary target based on total healing potential
  const targetScores = aliveMembers
    .filter(m => m.currentHealth < m.maxHealth) // Only damaged targets
    .map(member => {
      // Simulate chain heal targets from this starting point
      const potentialTargets = selectChainHealTargets(raidMembers, member.id);

      // Calculate total health deficit that would be healed
      let totalDeficit = 0;
      for (let i = 0; i < potentialTargets.length; i++) {
        const target = raidMembers.find(m => m.id === potentialTargets[i]);
        if (target) {
          const deficit = target.maxHealth - target.currentHealth;
          // Weight by jump reduction (primary target matters more)
          const jumpMultiplier = Math.pow(0.5, i);
          totalDeficit += deficit * jumpMultiplier;
        }
      }

      return {
        id: member.id,
        score: totalDeficit,
        targetCount: potentialTargets.length,
      };
    })
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score);

  // Return the best target, or null if no good targets
  return targetScores.length > 0 ? targetScores[0].id : null;
}

/**
 * Decide if the shaman should start casting Chain Heal
 * Simple AI: cast if anyone is below 80% health and we're not already casting
 */
export function shouldCastChainHeal(
  raidMembers: RaidMember[],
  healerState: NPCHealerState
): boolean {
  // Can't cast if already casting or on GCD
  if (healerState.currentCast || healerState.gcdRemaining > 0) {
    return false;
  }

  // Check if anyone needs healing (below 80% health)
  const needsHealing = raidMembers.some(
    m => !m.isDead && m.currentHealth / m.maxHealth < 0.80
  );

  return needsHealing;
}

/**
 * Update NPC healer state for one tick
 * Returns heal events and chain heal visual data if a cast completed
 */
export function updateNPCHealer(
  healerState: NPCHealerState,
  raidMembers: RaidMember[],
  deltaSeconds: number
): NPCHealerUpdateResult {
  const healEvents: Array<{ targetId: string; amount: number; overheal: number }> = [];
  let chainHealVisual: ChainHealVisual | null = null;

  // Update initial delay (before healer starts casting at all)
  if (healerState.initialDelay > 0) {
    healerState.initialDelay = Math.max(0, healerState.initialDelay - deltaSeconds);
    // Don't do anything else while waiting for initial delay
    return { healEvents, chainHealVisual };
  }

  // Update reaction delay (between casts)
  if (healerState.reactionDelay > 0) {
    healerState.reactionDelay = Math.max(0, healerState.reactionDelay - deltaSeconds);
  }

  // Update GCD
  if (healerState.gcdRemaining > 0) {
    healerState.gcdRemaining = Math.max(0, healerState.gcdRemaining - deltaSeconds);
  }

  // If currently casting, update cast time
  if (healerState.currentCast) {
    healerState.castTimeRemaining -= deltaSeconds;

    // Cast complete
    if (healerState.castTimeRemaining <= 0) {
      // Apply the chain heal
      if (healerState.currentCast.chainHealResult) {
        const events = applyChainHeal(raidMembers, healerState.currentCast.chainHealResult);
        healEvents.push(...events);

        // Create visual data for the chain heal effect
        chainHealVisual = {
          id: chainHealVisualIdCounter++,
          sourceId: healerState.id,
          targetIds: healerState.currentCast.chainHealResult.targets.map(t => t.memberId),
          timestamp: Date.now(),
        };

        // Log the heal
        const targetNames = healerState.currentCast.chainHealResult.targets
          .map(t => raidMembers.find(m => m.id === t.memberId)?.name || 'Unknown')
          .join(' -> ');
        console.log(`[NPC Shaman] Chain Heal landed: ${targetNames}`);
      }

      // Start GCD (1.5 seconds base, but already accounted for in cast time)
      healerState.gcdRemaining = 0; // Chain Heal cast time > GCD, so no additional GCD needed
      healerState.currentCast = null;
      healerState.castTimeRemaining = 0;

      // Add random reaction delay before next cast (0-0.5 seconds)
      healerState.reactionDelay = Math.random() * (REACTION_DELAY_MAX - REACTION_DELAY_MIN) + REACTION_DELAY_MIN;
    }
  }

  // If not casting, decide whether to cast (also check reaction delay)
  if (!healerState.currentCast && healerState.gcdRemaining <= 0 && healerState.reactionDelay <= 0) {
    if (shouldCastChainHeal(raidMembers, healerState)) {
      const targetId = findBestChainHealTarget(raidMembers);

      if (targetId) {
        const chainHealResult = calculateChainHeal(raidMembers, targetId);

        healerState.currentCast = {
          spellId: 'chain-heal',
          targetId,
          chainHealResult,
        };
        healerState.castTimeRemaining = chainHealResult.castTime;

        const targetName = raidMembers.find(m => m.id === targetId)?.name || 'Unknown';
        console.log(`[NPC Shaman] Casting Chain Heal on ${targetName} (${chainHealResult.castTime.toFixed(2)}s cast)`);
      }
    }
  }

  return { healEvents, chainHealVisual };
}
