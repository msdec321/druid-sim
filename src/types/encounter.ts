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
  | 'debuff_apply';     // applies a debuff

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
  // Scheduled events at specific times
  scheduledEvents?: Array<{
    time: number;         // seconds into phase
    event: DamageEvent;
  }>;
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
      maxHealth: 18000,
      currentHealth: 18000,
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
      maxHealth: 8500,
      currentHealth: 8500,
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
      maxHealth: 8000,
      currentHealth: 8000,
      hots: [],
      debuffs: [],
      isDead: false,
    });
  }

  return members;
}
