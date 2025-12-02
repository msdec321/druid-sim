import type { RaidMember } from '../types/encounter';

// ============================================================================
// Resto Shaman Configuration
// ============================================================================

// Resto Shaman stats (as specified)
export const RESTO_SHAMAN_STATS = {
  bonusHealing: 2400,
  spellHasteRating: 320,
} as const;

// ============================================================================
// Holy Paladin Configuration
// ============================================================================

// Holy Paladin stats (as specified)
export const HOLY_PALADIN_STATS = {
  bonusHealing: 2600,
  spellHasteRating: 120,
  critChance: 0.32, // 32% crit chance
} as const;

// ============================================================================
// Holy Priest Configuration
// ============================================================================

// Holy Priest stats
// Haste rating of ~243 gives ~15.4% haste, reducing 1.5s GCD to ~1.3s
export const HOLY_PRIEST_STATS = {
  spellHasteRating: 243,
  critChance: 0.14, // 14% crit chance
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
// Holy Light Spell Data
// ============================================================================

export const HOLY_LIGHT_DATA = {
  // Rank 11 (max at level 70)
  baseHealMin: 4400,
  baseHealMax: 4800,
  manaCost: 840,
  baseCastTime: 1.85, // seconds (after talents, typical Holy Paladin)
  critMultiplier: 2.0, // Crits heal for double
} as const;

// ============================================================================
// Circle of Healing Spell Data
// ============================================================================

export const CIRCLE_OF_HEALING_DATA = {
  // Rank 5 (max at level 70)
  baseHealMin: 1000,
  baseHealMax: 1600,
  manaCost: 450,
  castTime: 0, // Instant cast
  baseGcd: 1.5, // Base GCD before haste
  critMultiplier: 2.0, // Crits heal for double
  maxTargets: 5, // Target + up to 4 group members
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
// Holy Light Calculations
// ============================================================================

export interface HolyLightResult {
  targetId: string;
  healAmount: number;
  isCrit: boolean;
  castTime: number;
  manaCost: number;
}

/**
 * Roll base heal amount for Holy Light (random between min and max)
 */
function rollHolyLightBaseHeal(): number {
  return Math.floor(
    Math.random() * (HOLY_LIGHT_DATA.baseHealMax - HOLY_LIGHT_DATA.baseHealMin + 1) +
    HOLY_LIGHT_DATA.baseHealMin
  );
}

/**
 * Calculate Holy Light heal amount
 *
 * Formula: Heal = Base Heal (no spell power coefficient for simplicity)
 * Crit: 32% chance to do double healing
 */
export function calculateHolyLightAmount(
  critChance: number = HOLY_PALADIN_STATS.critChance,
  baseHeal?: number
): { healAmount: number; isCrit: boolean } {
  const base = baseHeal ?? rollHolyLightBaseHeal();

  // Roll for crit
  const isCrit = Math.random() < critChance;

  // Apply crit multiplier if crit
  const healAmount = isCrit
    ? Math.floor(base * HOLY_LIGHT_DATA.critMultiplier)
    : base;

  return { healAmount, isCrit };
}

/**
 * Calculate full Holy Light result including cast time
 */
export function calculateHolyLight(
  targetId: string,
  hasteRating: number = HOLY_PALADIN_STATS.spellHasteRating,
  critChance: number = HOLY_PALADIN_STATS.critChance
): HolyLightResult {
  // Calculate haste-adjusted cast time
  const hastePercent = calculateSpellHaste(hasteRating);
  const castTime = calculateCastTimeWithHaste(HOLY_LIGHT_DATA.baseCastTime, hastePercent);

  // Calculate heal amount with crit
  const { healAmount, isCrit } = calculateHolyLightAmount(critChance);

  return {
    targetId,
    healAmount,
    isCrit,
    castTime,
    manaCost: HOLY_LIGHT_DATA.manaCost,
  };
}

/**
 * Apply Holy Light heal to a raid member
 * Mutates the raid member's health value
 */
export function applyHolyLight(
  raidMembers: RaidMember[],
  holyLightResult: HolyLightResult
): { targetId: string; amount: number; overheal: number; isCrit: boolean } | null {
  const member = raidMembers.find(m => m.id === holyLightResult.targetId);
  if (!member || member.isDead) return null;

  const missingHealth = member.maxHealth - member.currentHealth;
  const actualHeal = Math.min(holyLightResult.healAmount, missingHealth);
  const overheal = holyLightResult.healAmount - actualHeal;

  member.currentHealth = Math.min(member.maxHealth, member.currentHealth + actualHeal);

  return {
    targetId: member.id,
    amount: holyLightResult.healAmount,
    overheal,
    isCrit: holyLightResult.isCrit,
  };
}

// ============================================================================
// Circle of Healing Calculations
// ============================================================================

export interface CircleOfHealingTarget {
  memberId: string;
  healAmount: number;
  isCrit: boolean;
}

export interface CircleOfHealingResult {
  targets: CircleOfHealingTarget[];
  gcd: number;
  manaCost: number;
}

/**
 * Get the group number for a raid member based on their index
 * Groups are 0-4 in a 25-man raid (5 members per group)
 */
export function getGroupForMemberIndex(index: number): number {
  return Math.floor(index / 5);
}

/**
 * Get all members in the same group as the target
 */
export function getGroupMembers(
  raidMembers: RaidMember[],
  targetId: string
): RaidMember[] {
  const targetIndex = raidMembers.findIndex(m => m.id === targetId);
  if (targetIndex === -1) return [];

  const targetGroup = getGroupForMemberIndex(targetIndex);

  return raidMembers.filter((_, index) => getGroupForMemberIndex(index) === targetGroup);
}

/**
 * Roll base heal amount for Circle of Healing (random between min and max)
 */
function rollCircleOfHealingBaseHeal(): number {
  return Math.floor(
    Math.random() * (CIRCLE_OF_HEALING_DATA.baseHealMax - CIRCLE_OF_HEALING_DATA.baseHealMin + 1) +
    CIRCLE_OF_HEALING_DATA.baseHealMin
  );
}

/**
 * Calculate Circle of Healing heal amount for a single target
 * Each target gets an independent roll for base heal and crit
 */
export function calculateCircleOfHealingAmount(
  critChance: number = HOLY_PRIEST_STATS.critChance
): { healAmount: number; isCrit: boolean } {
  const base = rollCircleOfHealingBaseHeal();

  // Roll for crit (independent per target)
  const isCrit = Math.random() < critChance;

  // Apply crit multiplier if crit
  const healAmount = isCrit
    ? Math.floor(base * CIRCLE_OF_HEALING_DATA.critMultiplier)
    : base;

  return { healAmount, isCrit };
}

/**
 * Calculate full Circle of Healing result for all group members
 *
 * Circle of Healing heals the target and all members in their group
 * Each heal is rolled independently (1000-1600 base, 14% crit for double)
 */
export function calculateCircleOfHealing(
  raidMembers: RaidMember[],
  targetId: string,
  hasteRating: number = HOLY_PRIEST_STATS.spellHasteRating,
  critChance: number = HOLY_PRIEST_STATS.critChance
): CircleOfHealingResult {
  // Calculate haste-adjusted GCD
  const hastePercent = calculateSpellHaste(hasteRating);
  const gcd = calculateCastTimeWithHaste(CIRCLE_OF_HEALING_DATA.baseGcd, hastePercent);

  // Get all group members (alive and damaged)
  const groupMembers = getGroupMembers(raidMembers, targetId)
    .filter(m => !m.isDead);

  // Calculate heal amounts for each target (each roll is independent)
  const targets: CircleOfHealingTarget[] = groupMembers.map(member => {
    const { healAmount, isCrit } = calculateCircleOfHealingAmount(critChance);
    return {
      memberId: member.id,
      healAmount,
      isCrit,
    };
  });

  return {
    targets,
    gcd,
    manaCost: CIRCLE_OF_HEALING_DATA.manaCost,
  };
}

/**
 * Apply Circle of Healing to raid members
 * Mutates the raid members' health values
 *
 * @returns Array of heal events for floating combat text
 */
export function applyCircleOfHealing(
  raidMembers: RaidMember[],
  cohResult: CircleOfHealingResult
): Array<{ targetId: string; amount: number; overheal: number; isCrit: boolean }> {
  const healEvents: Array<{ targetId: string; amount: number; overheal: number; isCrit: boolean }> = [];

  for (const target of cohResult.targets) {
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
      isCrit: target.isCrit,
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
    holyLightResult?: HolyLightResult;
    circleOfHealingResult?: CircleOfHealingResult;
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
 * Initialize NPC healer state for a holy paladin
 * Includes a random initial delay (0-2s) before they start casting
 */
export function createHolyPaladinState(id: string): NPCHealerState {
  // Random initial delay so paladins don't all start casting at the same time
  const initialDelay = Math.random() * (INITIAL_DELAY_MAX - INITIAL_DELAY_MIN) + INITIAL_DELAY_MIN;

  return {
    id,
    specId: 'paladin-holy',
    castTimeRemaining: 0,
    currentCast: null,
    gcdRemaining: 0,
    initialDelay,
    reactionDelay: 0,
  };
}

/**
 * Initialize NPC healer state for a holy priest
 * Includes a random initial delay (0-2s) before they start casting
 */
export function createHolyPriestState(id: string): NPCHealerState {
  // Random initial delay so priests don't all start casting at the same time
  const initialDelay = Math.random() * (INITIAL_DELAY_MAX - INITIAL_DELAY_MIN) + INITIAL_DELAY_MIN;

  return {
    id,
    specId: 'priest-holy',
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

// ============================================================================
// Holy Paladin AI
// ============================================================================

/**
 * Find the best Holy Light target for a Holy Paladin
 *
 * Priority:
 * 1. Tank with aggro (if below 90% health)
 * 2. Any other damaged raid member (lowest health first)
 *
 * @param raidMembers - All raid members
 * @param bossTargetIds - IDs of tanks currently holding aggro
 * @returns Target ID or null if no one needs healing
 */
export function findBestHolyLightTarget(
  raidMembers: RaidMember[],
  bossTargetIds: string[]
): string | null {
  const aliveMembers = raidMembers.filter(m => !m.isDead);
  if (aliveMembers.length === 0) return null;

  // First, check tanks with aggro
  for (const tankId of bossTargetIds) {
    const tank = aliveMembers.find(m => m.id === tankId);
    if (tank) {
      const healthPercent = tank.currentHealth / tank.maxHealth;
      // If tank is below 90%, heal them
      if (healthPercent < 0.90) {
        return tank.id;
      }
    }
  }

  // Tank is above 90%, find the most damaged raid member
  const damagedMembers = aliveMembers
    .filter(m => m.currentHealth < m.maxHealth)
    .map(m => ({
      id: m.id,
      healthPercent: m.currentHealth / m.maxHealth,
      healthDeficit: m.maxHealth - m.currentHealth,
    }))
    .sort((a, b) => a.healthPercent - b.healthPercent); // Sort by lowest health percent first

  // Return the most damaged member, or null if everyone is full health
  return damagedMembers.length > 0 ? damagedMembers[0].id : null;
}

/**
 * Decide if the paladin should start casting Holy Light
 * Simple AI: cast if anyone is damaged and we're not already casting
 */
export function shouldCastHolyLight(
  raidMembers: RaidMember[],
  healerState: NPCHealerState,
  bossTargetIds: string[]
): boolean {
  // Can't cast if already casting or on GCD
  if (healerState.currentCast || healerState.gcdRemaining > 0) {
    return false;
  }

  // Check if tank needs healing (below 90%) or anyone else needs healing
  const tankNeedsHealing = bossTargetIds.some(tankId => {
    const tank = raidMembers.find(m => m.id === tankId && !m.isDead);
    return tank && tank.currentHealth / tank.maxHealth < 0.90;
  });

  if (tankNeedsHealing) {
    return true;
  }

  // Check if anyone else needs healing (below 80% health)
  const anyoneNeedsHealing = raidMembers.some(
    m => !m.isDead && m.currentHealth / m.maxHealth < 0.80
  );

  return anyoneNeedsHealing;
}

// ============================================================================
// Holy Priest AI
// ============================================================================

/**
 * Find the best Circle of Healing target based on group health deficits
 *
 * Circle of Healing heals the target and all members in their group,
 * so we want to find a member whose group has the most total health deficit.
 *
 * @param raidMembers - All raid members
 * @returns Target ID (member of the most damaged group) or null if no one needs healing
 */
export function findBestCircleOfHealingTarget(raidMembers: RaidMember[]): string | null {
  const aliveMembers = raidMembers.filter(m => !m.isDead);
  if (aliveMembers.length === 0) return null;

  // Calculate total health deficit for each group (0-4)
  const groupDeficits: { group: number; totalDeficit: number; memberCount: number }[] = [];

  for (let group = 0; group < 5; group++) {
    const groupMembers = aliveMembers.filter((_, index) => {
      const originalIndex = raidMembers.findIndex(m => m.id === aliveMembers[index].id);
      return getGroupForMemberIndex(originalIndex) === group;
    });

    const totalDeficit = groupMembers.reduce(
      (sum, m) => sum + (m.maxHealth - m.currentHealth),
      0
    );

    if (totalDeficit > 0) {
      groupDeficits.push({
        group,
        totalDeficit,
        memberCount: groupMembers.length,
      });
    }
  }

  if (groupDeficits.length === 0) return null;

  // Sort by total deficit (most damaged group first)
  groupDeficits.sort((a, b) => b.totalDeficit - a.totalDeficit);

  const bestGroup = groupDeficits[0].group;

  // Find a damaged member in the best group to target
  // Prefer the most damaged member in that group
  const bestGroupMembers = raidMembers
    .map((m, index) => ({ member: m, index }))
    .filter(({ member, index }) =>
      !member.isDead &&
      getGroupForMemberIndex(index) === bestGroup &&
      member.currentHealth < member.maxHealth
    )
    .sort((a, b) =>
      (a.member.currentHealth / a.member.maxHealth) -
      (b.member.currentHealth / b.member.maxHealth)
    );

  return bestGroupMembers.length > 0 ? bestGroupMembers[0].member.id : null;
}

/**
 * Decide if the priest should cast Circle of Healing
 * Simple AI: cast if anyone is below 80% health and we're not on GCD
 */
export function shouldCastCircleOfHealing(
  raidMembers: RaidMember[],
  healerState: NPCHealerState
): boolean {
  // Can't cast if on GCD (Circle of Healing is instant, so no cast time check)
  if (healerState.gcdRemaining > 0) {
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
 *
 * @param healerState - The healer's current state
 * @param raidMembers - All raid members
 * @param deltaSeconds - Time since last update
 * @param bossTargetIds - IDs of tanks currently holding aggro (needed for Holy Paladin targeting)
 */
export function updateNPCHealer(
  healerState: NPCHealerState,
  raidMembers: RaidMember[],
  deltaSeconds: number,
  bossTargetIds: string[] = []
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
      // Apply Chain Heal (Resto Shaman)
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

      // Apply Holy Light (Holy Paladin)
      if (healerState.currentCast.holyLightResult) {
        const event = applyHolyLight(raidMembers, healerState.currentCast.holyLightResult);
        if (event) {
          healEvents.push({
            targetId: event.targetId,
            amount: event.amount,
            overheal: event.overheal,
          });

          // Log the heal
          const targetName = raidMembers.find(m => m.id === event.targetId)?.name || 'Unknown';
          const critText = event.isCrit ? ' (CRIT!)' : '';
          console.log(`[NPC Paladin] Holy Light landed on ${targetName} for ${event.amount}${critText}`);
        }
      }

      // Apply Circle of Healing (Holy Priest)
      if (healerState.currentCast.circleOfHealingResult) {
        const events = applyCircleOfHealing(raidMembers, healerState.currentCast.circleOfHealingResult);
        for (const event of events) {
          healEvents.push({
            targetId: event.targetId,
            amount: event.amount,
            overheal: event.overheal,
          });
        }

        // Log the heal
        const targetNames = healerState.currentCast.circleOfHealingResult.targets
          .map(t => {
            const name = raidMembers.find(m => m.id === t.memberId)?.name || 'Unknown';
            return t.isCrit ? `${name}*` : name;
          })
          .join(', ');
        console.log(`[NPC Priest] Circle of Healing healed: ${targetNames}`);

        // Circle of Healing is instant cast, so GCD starts now
        healerState.gcdRemaining = healerState.currentCast.circleOfHealingResult.gcd;
      }

      // Start GCD (cast time > GCD for Shaman/Paladin spells, so no additional GCD needed for them)
      if (!healerState.currentCast.circleOfHealingResult) {
        healerState.gcdRemaining = 0;
      }
      healerState.currentCast = null;
      healerState.castTimeRemaining = 0;

      // Add random reaction delay before next cast (0-0.5 seconds)
      healerState.reactionDelay = Math.random() * (REACTION_DELAY_MAX - REACTION_DELAY_MIN) + REACTION_DELAY_MIN;
    }
  }

  // If not casting, decide whether to cast (also check reaction delay)
  if (!healerState.currentCast && healerState.gcdRemaining <= 0 && healerState.reactionDelay <= 0) {
    // Resto Shaman AI
    if (healerState.specId === 'shaman-restoration') {
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

    // Holy Paladin AI
    if (healerState.specId === 'paladin-holy') {
      if (shouldCastHolyLight(raidMembers, healerState, bossTargetIds)) {
        const targetId = findBestHolyLightTarget(raidMembers, bossTargetIds);

        if (targetId) {
          const holyLightResult = calculateHolyLight(targetId);

          healerState.currentCast = {
            spellId: 'holy-light',
            targetId,
            holyLightResult,
          };
          healerState.castTimeRemaining = holyLightResult.castTime;

          const targetName = raidMembers.find(m => m.id === targetId)?.name || 'Unknown';
          console.log(`[NPC Paladin] Casting Holy Light on ${targetName} (${holyLightResult.castTime.toFixed(2)}s cast)`);
        }
      }
    }

    // Holy Priest AI
    if (healerState.specId === 'priest-holy') {
      if (shouldCastCircleOfHealing(raidMembers, healerState)) {
        const targetId = findBestCircleOfHealingTarget(raidMembers);

        if (targetId) {
          const circleOfHealingResult = calculateCircleOfHealing(raidMembers, targetId);

          healerState.currentCast = {
            spellId: 'circle-of-healing',
            targetId,
            circleOfHealingResult,
          };
          // Circle of Healing is instant cast, set a tiny cast time so it completes next frame
          healerState.castTimeRemaining = 0.001;

          const groupMembers = circleOfHealingResult.targets
            .map(t => raidMembers.find(m => m.id === t.memberId)?.name || 'Unknown')
            .join(', ');
          console.log(`[NPC Priest] Casting Circle of Healing on group: ${groupMembers}`);
        }
      }
    }
  }

  return { healEvents, chainHealVisual };
}
