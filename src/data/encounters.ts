import type { Encounter } from '../types';

// Training dummy encounter for testing
export const TRAINING_DUMMY: Encounter = {
  id: 'training-dummy',
  name: 'Training Dummy',
  description: 'A basic training encounter with constant tank damage and periodic raid damage.',
  difficulty: 'easy',
  duration: 120, // 2 minutes
  phases: [
    {
      name: 'Training',
      duration: null, // runs for full encounter duration
      damagePattern: {
        // Constant tank damage: 2000 DPS on main tank
        tankDPS: 2000,
        // Raid-wide damage every 10 seconds
        raidDamage: {
          damage: 1500,
          interval: 10,
        },
        // Random target damage every 5 seconds
        randomTargetDamage: {
          damage: 3000,
          interval: 5,
          targetCount: 3,
        },
      },
    },
  ],
};

// Two training dummies encounter (75% damage scaling per target)
export const TWO_TRAINING_DUMMIES: Encounter = {
  id: 'two-training-dummies',
  name: 'Two Training Dummies',
  description: 'Two training dummies with a tank on each. Damage scaled to 75% per target.',
  difficulty: 'easy',
  duration: 120,
  bossCount: 2,
  bossNames: ['Training Dummy', 'Training Dummy'],
  phases: [
    {
      name: 'Training',
      duration: null,
      damagePattern: {
        // 75% of 2000 = 1500 DPS per tank
        tankDPS: 1500,
        // 75% of 1500 = 1125 raid damage
        raidDamage: {
          damage: 1125,
          interval: 10,
        },
        // 75% of 3000 = 2250, reduced to 2 targets
        randomTargetDamage: {
          damage: 2250,
          interval: 5,
          targetCount: 2,
        },
      },
    },
  ],
};

// Three training dummies encounter (66% damage scaling per target)
export const THREE_TRAINING_DUMMIES: Encounter = {
  id: 'three-training-dummies',
  name: 'Three Training Dummies',
  description: 'Three training dummies with a tank on each. Damage scaled to 66% per target.',
  difficulty: 'easy',
  duration: 120,
  bossCount: 3,
  bossNames: ['Training Dummy', 'Training Dummy', 'Training Dummy'],
  phases: [
    {
      name: 'Training',
      duration: null,
      damagePattern: {
        // 66% of 2000 = 1333 DPS per tank
        tankDPS: 1333,
        // 66% of 1500 = 1000 raid damage
        raidDamage: {
          damage: 1000,
          interval: 10,
        },
        // 66% of 3000 = 2000, reduced to 2 targets
        randomTargetDamage: {
          damage: 2000,
          interval: 5,
          targetCount: 2,
        },
      },
    },
  ],
};

// Sunwell Plateau Boss Encounters
export const KALECGOS: Encounter = {
  id: 'kalecgos',
  name: 'Kalecgos',
  description: 'The first boss of Sunwell Plateau. A corrupted blue dragon with portal mechanics.',
  difficulty: 'hard',
  duration: 180, // 3 minutes
  disabled: true,
  phases: [
    {
      name: 'Phase 1',
      duration: null,
      damagePattern: {
        tankDPS: 2500,
        raidDamage: {
          damage: 2000,
          interval: 8,
        },
        randomTargetDamage: {
          damage: 4000,
          interval: 4,
          targetCount: 3,
        },
      },
    },
  ],
};

export const BRUTALLUS: Encounter = {
  id: 'brutallus',
  name: 'Brutallus (Under Construction)',
  description: 'A brutal pit lord with heavy tank damage and raid-wide burns.',
  difficulty: 'hard',
  duration: 300, // 5 minutes
  bossHealth: 4000000, // 4 million HP
  tankCount: 2,  // Brutallus requires 2 tanks for Meteor Slash
  tankPositions: [
    { angle: 0, radius: 60 },              // Tank 1: right side of boss
    { angle: Math.PI / 2, radius: 60 },    // Tank 2: bottom side of boss
  ],
  meleePosition: {
    startAngle: -Math.PI * 0.95,           // Top-left area (wider spread)
    endAngle: -Math.PI * 0.55,
    minRadius: 55,
    maxRadius: 100,
  },
  rangedGroups: [
    {
      // Group 1: Cone behind Tank 1 (east tank)
      tankIndex: 0,
      coneSpread: Math.PI / 2,  // 90 degree cone (wider)
      coneMinDistance: 80,      // first row further from tank
      coneMaxDistance: 260,     // ~45 units between rows
    },
    {
      // Group 2: Cone behind Tank 2 (south tank)
      tankIndex: 1,
      coneSpread: Math.PI / 2,  // 90 degree cone (wider)
      coneMinDistance: 80,
      coneMaxDistance: 260,
    },
  ],
  phases: [
    {
      name: 'Phase 1',
      duration: null,
      damagePattern: {
        tankDPS: 3500,
        raidDamage: {
          damage: 2500,
          interval: 6,
        },
        // Meteor Slash: 20000 fire damage split among tank and cone behind
        // Applies stacking debuff that increases fire damage taken by 75% per stack
        meteorSlash: {
          damage: 20000,
          interval: 10,           // every 10 seconds
          tankIndex: 0,           // hits tank 0 and their cone
          debuffDuration: 40,     // debuff lasts 40 seconds
          debuffModifier: 0.75,   // 75% increased fire damage per stack
        },
        // Burn: DoT applied to random player every 20s
        // Lasts 60s, starts at 100 DPS, doubles every 10s
        // Affected by Meteor Slash debuff (+75% per stack)
        burn: {
          interval: 20,           // apply burn every 20 seconds
          duration: 60,           // burn lasts 60 seconds
          baseDamage: 100,        // 100 damage per second initially
          tickInterval: 1,        // ticks every 1 second
          escalationInterval: 10, // damage doubles every 10 seconds
        },
      },
    },
  ],
};

export const FELMYST: Encounter = {
  id: 'felmyst',
  name: 'Felmyst',
  description: 'The reanimated corpse of Madrigosa. Features ground and air phases.',
  difficulty: 'hard',
  duration: 360, // 6 minutes
  disabled: true,
  phases: [
    {
      name: 'Phase 1',
      duration: null,
      damagePattern: {
        tankDPS: 3000,
        raidDamage: {
          damage: 2200,
          interval: 7,
        },
        randomTargetDamage: {
          damage: 4500,
          interval: 4,
          targetCount: 3,
        },
      },
    },
  ],
};

export const EREDAR_TWINS: Encounter = {
  id: 'eredar-twins',
  name: 'Eredar Twins',
  description: 'Lady Sacrolash and Grand Warlock Alythess. Two bosses with shadow and fire mechanics.',
  difficulty: 'hard',
  duration: 180, // 3 minutes
  disabled: true,
  bossCount: 2,
  bossNames: ['Lady Sacrolash', 'Grand Warlock Alythess'],
  phases: [
    {
      name: 'Phase 1',
      duration: null,
      damagePattern: {
        tankDPS: 2800,
        raidDamage: {
          damage: 1800,
          interval: 5,
        },
        randomTargetDamage: {
          damage: 3500,
          interval: 3,
          targetCount: 4,
        },
      },
    },
    {
      name: 'Phase 2',
      duration: null,
      damagePattern: {
        tankDPS: 2800,
        raidDamage: {
          damage: 1800,
          interval: 5,
        },
        randomTargetDamage: {
          damage: 3500,
          interval: 3,
          targetCount: 4,
        },
      },
    },
  ],
};

export const MURU: Encounter = {
  id: 'muru',
  name: "M'uru",
  description: 'A fallen naaru with intense add spawns and a challenging Entropius phase.',
  difficulty: 'hard',
  duration: 240, // 4 minutes
  disabled: true,
  phases: [
    {
      name: 'Phase 1',
      duration: null,
      damagePattern: {
        tankDPS: 3200,
        raidDamage: {
          damage: 2800,
          interval: 5,
        },
        randomTargetDamage: {
          damage: 4800,
          interval: 3,
          targetCount: 5,
        },
      },
    },
    {
      name: 'Phase 2',
      duration: null,
      damagePattern: {
        tankDPS: 3200,
        raidDamage: {
          damage: 2800,
          interval: 5,
        },
        randomTargetDamage: {
          damage: 4800,
          interval: 3,
          targetCount: 5,
        },
      },
    },
  ],
};

export const KILJAEDEN: Encounter = {
  id: 'kiljaeden',
  name: "Kil'jaeden",
  description: 'The final boss of Sunwell Plateau. The deceiver himself emerges from the Sunwell.',
  difficulty: 'hard',
  duration: 420, // 7 minutes
  disabled: true,
  phases: [
    {
      name: 'Phase 1',
      duration: null,
      damagePattern: {
        tankDPS: 3800,
        raidDamage: {
          damage: 3000,
          interval: 6,
        },
        randomTargetDamage: {
          damage: 5500,
          interval: 3,
          targetCount: 4,
        },
      },
    },
  ],
};

// Training dummy encounters
export const TRAINING_ENCOUNTERS: Encounter[] = [
  TRAINING_DUMMY,
  TWO_TRAINING_DUMMIES,
  THREE_TRAINING_DUMMIES,
];

// Boss encounters
export const BOSS_ENCOUNTERS: Encounter[] = [
  KALECGOS,
  BRUTALLUS,
  FELMYST,
  EREDAR_TWINS,
  MURU,
  KILJAEDEN,
];

// All available encounters
export const ENCOUNTERS: Encounter[] = [
  ...TRAINING_ENCOUNTERS,
  ...BOSS_ENCOUNTERS,
];

// Get encounter by ID
export function getEncounter(id: string): Encounter | undefined {
  return ENCOUNTERS.find(enc => enc.id === id);
}

// Get all encounters
export function getAllEncounters(): Encounter[] {
  return ENCOUNTERS;
}

// Get training encounters
export function getTrainingEncounters(): Encounter[] {
  return TRAINING_ENCOUNTERS;
}

// Get boss encounters
export function getBossEncounters(): Encounter[] {
  return BOSS_ENCOUNTERS;
}
