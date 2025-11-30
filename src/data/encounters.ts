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
  difficulty: 'medium',
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
  difficulty: 'hard',
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

// All available encounters
export const ENCOUNTERS: Encounter[] = [
  TRAINING_DUMMY,
  TWO_TRAINING_DUMMIES,
  THREE_TRAINING_DUMMIES,
];

// Get encounter by ID
export function getEncounter(id: string): Encounter | undefined {
  return ENCOUNTERS.find(enc => enc.id === id);
}

// Get all encounters
export function getAllEncounters(): Encounter[] {
  return ENCOUNTERS;
}
