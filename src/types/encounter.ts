import type { ActiveHoT } from './spells';

// Raid member role
export type RaidRole = 'tank' | 'healer' | 'dps';

// Individual raid member
export interface RaidMember {
  id: string;
  name: string;
  role: RaidRole;
  class: string;          // for flavor/display
  maxHealth: number;
  currentHealth: number;
  hots: ActiveHoT[];      // active HoTs on this target
  debuffs: Debuff[];      // active debuffs
  isDead: boolean;
}

// Debuff on a raid member
export interface Debuff {
  id: string;
  name: string;
  remainingDuration: number;
  damagePerTick?: number;
  tickInterval?: number;
  nextTickIn?: number;
  stacks?: number;                    // number of stacks (for stacking debuffs)
  maxStacks?: number;                 // maximum stacks allowed
  damageTakenModifier?: number;       // % increased damage taken per stack (e.g., 0.75 = 75%)
  damageType?: 'fire' | 'shadow' | 'nature' | 'physical';  // type of damage affected
}

// Full raid state
export interface RaidState {
  members: RaidMember[];
}

// Damage event types
export type DamageEventType =
  | 'tank_damage'       // constant tank damage
  | 'raid_damage'       // hits everyone
  | 'random_target'     // hits random raid members
  | 'debuff_apply'      // applies a debuff
  | 'meteor_slash';     // cone damage split between tank and players behind

// Scheduled damage event
export interface DamageEvent {
  type: DamageEventType;
  damage: number;
  targetCount?: number;   // for random_target
  targetRole?: RaidRole;  // target specific role
  debuff?: Omit<Debuff, 'id'>; // debuff to apply
}

// Encounter phase
export interface EncounterPhase {
  name: string;
  duration: number | null;  // null = until boss health threshold
  healthThreshold?: number; // phase ends when boss reaches this %
  damagePattern: DamagePattern;
}

// Meteor Slash configuration
export interface MeteorSlashConfig {
  damage: number;           // total damage to be split
  interval: number;         // seconds between casts
  tankIndex: number;        // which tank has aggro (0-indexed)
  debuffDuration: number;   // how long the debuff lasts (seconds)
  debuffModifier: number;   // damage increase per stack (0.75 = 75%)
}

// Burn configuration (Brutallus)
export interface BurnConfig {
  interval: number;         // seconds between burn applications (20s)
  duration: number;         // how long burn lasts (60s)
  baseDamage: number;       // initial damage per second (100)
  tickInterval: number;     // how often burn ticks (1s)
  escalationInterval: number; // how often damage doubles (10s)
}

// Damage pattern within a phase
export interface DamagePattern {
  // Constant damage per second to tanks
  tankDPS?: number;
  // Periodic raid-wide damage
  raidDamage?: {
    damage: number;
    interval: number;     // seconds between raid damage
  };
  // Random target damage
  randomTargetDamage?: {
    damage: number;
    interval: number;
    targetCount: number;
  };
  // Meteor Slash - cone damage split between tank and players behind
  meteorSlash?: MeteorSlashConfig;
  // Burn - DoT applied to random players, damage doubles every 10s
  burn?: BurnConfig;
  // Scheduled events at specific times
  scheduledEvents?: Array<{
    time: number;         // seconds into phase
    event: DamageEvent;
  }>;
}

// Tank position relative to boss
export interface TankPosition {
  angle: number;    // radians: 0 = right, π/2 = down, π = left, -π/2 = up
  radius: number;   // distance from boss center in pixels
}

// Melee DPS positioning configuration
export interface MeleePosition {
  startAngle: number;  // starting angle in radians
  endAngle: number;    // ending angle in radians
  minRadius: number;   // minimum distance from boss center in pixels
  maxRadius: number;   // maximum distance from boss center in pixels
}

// Ranged/healer group positioning configuration
// Can be either boss-relative (startAngle/endAngle) or cone-relative (tankIndex)
export interface RangedGroup {
  // Boss-relative positioning (used if tankIndex is not defined)
  startAngle?: number;  // starting angle in radians
  endAngle?: number;    // ending angle in radians
  minRadius?: number;   // minimum distance from boss center in pixels
  maxRadius?: number;   // maximum distance from boss center in pixels

  // Cone positioning relative to a tank (used if tankIndex is defined)
  tankIndex?: number;       // which tank is at the cone tip (0-indexed into tankPositions)
  coneSpread?: number;      // total angular width of cone in radians (centered on tank direction)
  coneMinDistance?: number; // minimum distance from tank in pixels
  coneMaxDistance?: number; // maximum distance from tank in pixels
}

// Full encounter definition
export interface Encounter {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;       // max duration in seconds (for training dummy)
  bossHealth?: number;    // for bosses with health pools
  bossCount?: number;     // number of bosses (default 1)
  bossNames?: string[];   // custom names for each boss (optional)
  phases: EncounterPhase[];
  disabled?: boolean;     // if true, encounter is not selectable
  tankCount?: number;     // number of tanks required (defaults to bossCount)
  tankPositions?: TankPosition[];  // custom positions for tanks relative to boss
  meleePosition?: MeleePosition;   // custom positioning for melee DPS
  rangedGroups?: RangedGroup[];    // custom positioning for ranged/healers (split evenly between groups)
}

// Encounter runtime state
export interface EncounterState {
  encounterId: string;
  status: 'not_started' | 'in_progress' | 'victory' | 'defeat';
  elapsedTime: number;    // seconds since encounter start
  currentPhase: number;   // index into phases array
  phaseElapsedTime: number;
  bossCurrentHealth?: number;
  nextRaidDamageIn?: number;
  nextRandomDamageIn?: number;
  nextMeteorSlashIn?: number;
  currentMeteorSlashTank?: number;  // which tank currently has aggro for meteor slash
}

// Victory/defeat conditions
export interface EncounterResult {
  victory: boolean;
  elapsedTime: number;
  healingDone: number;
  overheal: number;
  manaUsed: number;
  deaths: number;
}

// Generate default 25-man raid
export function createDefaultRaid(): RaidMember[] {
  const members: RaidMember[] = [];

  // 2 tanks
  for (let i = 0; i < 2; i++) {
    members.push({
      id: `tank-${i + 1}`,
      name: `Tank${i + 1}`,
      role: 'tank',
      class: 'Warrior',
      maxHealth: 22000,
      currentHealth: 22000,
      hots: [],
      debuffs: [],
      isDead: false,
    });
  }

  // 5 healers (including player, but player isn't a target)
  for (let i = 0; i < 5; i++) {
    members.push({
      id: `healer-${i + 1}`,
      name: `Healer${i + 1}`,
      role: 'healer',
      class: 'Priest',
      maxHealth: 10000,
      currentHealth: 10000,
      hots: [],
      debuffs: [],
      isDead: false,
    });
  }

  // 18 DPS
  const dpsClasses = ['Mage', 'Warlock', 'Rogue', 'Hunter', 'Shaman', 'Paladin'];
  for (let i = 0; i < 18; i++) {
    members.push({
      id: `dps-${i + 1}`,
      name: `DPS${i + 1}`,
      role: 'dps',
      class: dpsClasses[i % dpsClasses.length],
      maxHealth: 10000,
      currentHealth: 10000,
      hots: [],
      debuffs: [],
      isDead: false,
    });
  }

  return members;
}
