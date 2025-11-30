import type { Spell } from '../types';

// TBC Restoration Druid spells (max rank values)
export const SPELLS: Record<string, Spell> = {
  'lifebloom': {
    id: 'lifebloom',
    name: 'Lifebloom',
    icon: '/icons/lifebloom.jpg',
    tooltip: '/tooltips/lifebloom.png',
    manaCost: 220,
    castTime: 0,
    cooldown: 0,
    gcd: true,
    effect: {
      type: 'hot',
      duration: 7,
      tickInterval: 1,
      healPerTick: 43,       // base per stack (42.9 rounded)
      coefficient: 0.0981,   // per tick per stack (9.81%)
      maxStacks: 3,
      bloomHeal: 600,        // final heal when expires
      bloomCoefficient: 0.34, // 34% of bonus healing
    },
  },

  'rejuvenation': {
    id: 'rejuvenation',
    name: 'Rejuvenation',
    icon: '/icons/rejuvenation.jpg',
    tooltip: '/tooltips/rejuvenation.png',
    manaCost: 415,
    castTime: 0,
    cooldown: 0,
    gcd: true,
    effect: {
      type: 'hot',
      duration: 12,
      tickInterval: 3,
      healPerTick: 176,
      coefficient: 0.10,     // per tick (total 0.40)
    },
  },

  'regrowth': {
    id: 'regrowth',
    name: 'Regrowth',
    icon: '/icons/regrowth.jpg',
    tooltip: '/tooltips/regrowth.png',
    manaCost: 675,
    castTime: 2,
    cooldown: 0,
    gcd: true,
    effect: {
      type: 'direct_and_hot',
      direct: {
        minHeal: 1215,
        maxHeal: 1355,
        coefficient: 0.286,
      },
      hot: {
        duration: 21,
        tickInterval: 3,
        healPerTick: 98,
        coefficient: 0.043,  // per tick
      },
    },
  },

  'healing-touch': {
    id: 'healing-touch',
    name: 'Healing Touch',
    icon: '/icons/healing_touch.jpg',
    manaCost: 935,
    castTime: 3,
    cooldown: 0,
    gcd: true,
    effect: {
      type: 'direct',
      minHeal: 2707,
      maxHeal: 3179,
      coefficient: 1.0,      // full coefficient for long cast
    },
  },

  'swiftmend': {
    id: 'swiftmend',
    name: 'Swiftmend',
    icon: '/icons/swiftmend.jpg',
    tooltip: '/tooltips/swiftmend.png',
    manaCost: 375,
    castTime: 0,
    cooldown: 15,
    gcd: true,
    effect: {
      type: 'swiftmend',
      consumesHoT: ['rejuvenation', 'regrowth'],
      healMultiplier: 1.0,   // consumes and heals for remaining HoT value
    },
  },

  'natures-swiftness': {
    id: 'natures-swiftness',
    name: "Nature's Swiftness",
    icon: '/icons/natures_swiftness.jpg',
    tooltip: '/tooltips/natures_swiftness.jpg',
    manaCost: 0,
    castTime: 0,
    cooldown: 180,           // 3 minutes
    gcd: false,              // off GCD
    effect: {
      type: 'buff',
      duration: 0,           // consumed on next cast
      effect: 'next_instant',
    },
  },

  'innervate': {
    id: 'innervate',
    name: 'Innervate',
    icon: '/icons/innervate.jpg',
    tooltip: '/tooltips/innervate.png',
    manaCost: 0,
    castTime: 0,
    cooldown: 360,           // 6 minutes
    gcd: true,
    effect: {
      type: 'buff',
      duration: 20,
      effect: 'mana_regen',
      regenMultiplier: 4.0,  // 400% mana regen
    },
  },

  'tranquility': {
    id: 'tranquility',
    name: 'Tranquility',
    icon: '/icons/tranquility.jpg',
    tooltip: '/tooltips/tranquility.png',
    manaCost: 1650,
    castTime: 0,             // channeled, not cast time
    cooldown: 600,           // 10 minutes
    gcd: true,
    effect: {
      type: 'channel',
      duration: 8,
      tickInterval: 2,
      healPerTick: 1518,
      coefficient: 0.538,    // per tick
      targetsParty: true,    // heals party members only
    },
  },

  'super-mana-potion': {
    id: 'super-mana-potion',
    name: 'Super Mana Potion',
    icon: '/icons/mana-potion.jpg',
    tooltip: '/tooltips/mana-potion.png',
    manaCost: 0,
    castTime: 0,
    cooldown: 120,           // 2 minutes
    gcd: false,              // potions don't trigger GCD
    effect: {
      type: 'mana_restore',
      minMana: 1800,
      maxMana: 3000,
    },
  },

  'dark-rune': {
    id: 'dark-rune',
    name: 'Dark Rune',
    icon: '/icons/dark-rune.jpg',
    tooltip: '/tooltips/dark-rune.png',
    manaCost: 0,
    castTime: 0,
    cooldown: 120,           // 2 minutes
    gcd: false,              // runes don't trigger GCD
    effect: {
      type: 'mana_restore',
      minMana: 900,
      maxMana: 1500,
      selfDamageMin: 600,
      selfDamageMax: 1000,
    },
  },

  'tree-of-life': {
    id: 'tree-of-life',
    name: 'Tree of Life',
    icon: '/icons/tree-of-life.jpg',
    tooltip: '/tooltips/tree-of-life.png',
    manaCost: 0,
    castTime: 0,
    cooldown: 0,
    gcd: true,               // triggers GCD when activating (not when deactivating)
    effect: {
      type: 'buff',
      duration: 0,           // permanent until cancelled
      effect: 'tree_of_life',
      manaCostReduction: 0.25, // 25% mana cost reduction
      affectedSpells: ['lifebloom', 'rejuvenation', 'regrowth', 'swiftmend', 'innervate'],
    },
  },
};

// Get spell by ID
export function getSpell(id: string): Spell | undefined {
  return SPELLS[id];
}

// Get spell by name (case-insensitive)
export function getSpellByName(name: string): Spell | undefined {
  const lowerName = name.toLowerCase();
  return Object.values(SPELLS).find(
    spell => spell.name.toLowerCase() === lowerName
  );
}

// Get all spells as array
export function getAllSpells(): Spell[] {
  return Object.values(SPELLS);
}

// Spell IDs for iteration
export const SPELL_IDS = Object.keys(SPELLS);
