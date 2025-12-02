// Game engine exports
export {
  TALENT_CONSTANTS,
  calculateLifebloomTickHeal,
  calculateLifebloomBloom,
  applyLifebloom,
  processLifebloomTick,
  processLifebloomExpiration,
  updateLifebloom,
  type LifebloomResult,
  type HealEvent,
} from './lifebloom';

export {
  REGROWTH_TALENT_CONSTANTS,
  calculateRegrowthDirectHeal,
  calculateRegrowthTickHeal,
  calculateRegrowthCritChance,
  applyRegrowth,
  processRegrowthTick,
  type RegrowthResult,
} from './regrowth';

export {
  findConsumableHoT,
  calculateRemainingHoTHealing,
  calculateSwiftmendHeal,
  canSwiftmend,
  applySwiftmend,
  createSwiftmendHealEvent,
  type SwiftmendResult,
} from './swiftmend';

export {
  parseMacro,
  getFirstCastCommand,
  findRaidMemberByName,
  type CastCommand,
  type UnknownCommand,
  type MacroCommand,
  type ParsedMacro,
} from './macros';

export {
  DEFAULT_TANK_AVOIDANCE,
  getAvoidanceStats,
  isTankSpec,
  rollCombatTable,
  formatAttackResult,
  type AttackOutcome,
  type AvoidanceStats,
  type AttackResult,
} from './combat';

export {
  // Resto Shaman constants
  RESTO_SHAMAN_STATS,
  SHAMAN_TALENT_CONSTANTS,
  CHAIN_HEAL_DATA,
  // Holy Paladin constants
  HOLY_PALADIN_STATS,
  HOLY_LIGHT_DATA,
  // Chain Heal calculations
  calculateSpellHaste,
  calculateCastTimeWithHaste,
  calculateChainHealAmount,
  selectChainHealTargets,
  calculateChainHeal,
  applyChainHeal,
  // Holy Light calculations
  calculateHolyLightAmount,
  calculateHolyLight,
  applyHolyLight,
  // Circle of Healing calculations
  getGroupForMemberIndex,
  getGroupMembers,
  calculateCircleOfHealingAmount,
  calculateCircleOfHealing,
  applyCircleOfHealing,
  // NPC Healer AI
  createRestoShamanState,
  createHolyPaladinState,
  createHolyPriestState,
  findBestChainHealTarget,
  shouldCastChainHeal,
  findBestHolyLightTarget,
  shouldCastHolyLight,
  findBestCircleOfHealingTarget,
  shouldCastCircleOfHealing,
  updateNPCHealer,
  type ChainHealTarget,
  type ChainHealResult,
  type HolyLightResult,
  type CircleOfHealingTarget,
  type CircleOfHealingResult,
  type NPCHealerState,
  type ChainHealVisual,
  type NPCHealerUpdateResult,
} from './npcHealers';
