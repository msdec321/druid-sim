import { useState, useEffect, useRef, useCallback } from 'react';
import { getEncounter, getSpell, getSpec, CLASS_INFO, PLAYER_SPEC_ID, getGearPreset, DEFAULT_GEAR_PRESET, isMeleeSpec } from '../../data';
import { ACTION_BARS, calculateCombatStats, calculateGCD } from '../../types';
import type { Encounter as EncounterType, RaidMember, ActionBarsConfig, KeybindConfig, ActionBarId, RaidComposition, CombatStats, ActiveHoT, Macro } from '../../types';
import { applyLifebloom, applyRegrowth, applySwiftmend, canSwiftmend, getFirstCastCommand, findRaidMemberByName, getAvoidanceStats, rollCombatTable, formatAttackResult, createRestoShamanState, updateNPCHealer, type NPCHealerState, type ChainHealVisual } from '../../game';
import styles from './Encounter.module.css';

interface EncounterProps {
  encounterId: string;
  gearsetId: string;
  actionBars: ActionBarsConfig;
  keybindings: KeybindConfig;
  raidComposition: RaidComposition;
  macros: Macro[];
  onExit: () => void;
}

interface BossState {
  name: string;
  maxHealth: number;
  currentHealth: number;
}

// Game loop tick rate (ms)
const TICK_RATE = 16; // ~60 updates per second for responsive gameplay
const PLAYER_SPEED = 150; // pixels per second
const SPELL_QUEUE_WINDOW = 0.4; // 400ms spell queue window

export function Encounter({ encounterId, gearsetId, actionBars, keybindings, raidComposition, macros, onExit }: EncounterProps) {
  const [encounter, setEncounter] = useState<EncounterType | null>(null);
  const [raidMembers, setRaidMembers] = useState<RaidMember[]>([]);
  const raidMembersRef = useRef<RaidMember[]>([]); // Ref for game loop access
  const [bosses, setBosses] = useState<BossState[]>([]);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [bossTargetIds, setBossTargetIds] = useState<string[]>([]);
  const [encounterActive, setEncounterActive] = useState(false);
  const [pressedSlots, setPressedSlots] = useState<Set<string>>(new Set());

  // Player state
  const [combatStats, setCombatStats] = useState<CombatStats | null>(null);
  const [currentMana, setCurrentMana] = useState(0);
  const [gcdRemaining, setGcdRemaining] = useState(0);
  const gcdRemainingRef = useRef(0); // Ref for immediate access in castSpell
  const [gcdTotal, setGcdTotal] = useState(0); // Total GCD duration for sweep calculation
  const spellQueueRef = useRef<{ spellId: string; targetId?: string } | null>(null); // Queued spell
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({}); // spellId -> seconds remaining

  // Floating combat text
  const [floatingText, setFloatingText] = useState<Array<{
    id: number;
    targetId: string;
    amount: number;
    timestamp: number;
  }>>([]);
  const floatingTextIdRef = useRef(0);
  const pendingHealEventsRef = useRef<Array<{ targetId: string; amount: number }>>([]);

  // Player movement
  const [playerPosition, setPlayerPosition] = useState<{ x: number; y: number }>({ x: 0, y: 200 });
  const movementKeysRef = useRef<Set<string>>(new Set());

  // Cast bar state
  const [casting, setCasting] = useState<{
    spellId: string;
    spellName: string;
    targetId: string;
    castTime: number;
    totalCastTime: number;
  } | null>(null);
  const castingRef = useRef<typeof casting>(null); // Ref for immediate access in castSpell

  // Track last update time for delta calculations
  const lastUpdateRef = useRef<number>(Date.now());

  // Five-second rule tracking (time since last mana-spending cast)
  const timeSinceLastCastRef = useRef<number>(10); // Start outside 5SR
  const FIVE_SECOND_RULE = 5.0;
  const SPIRIT_REGEN_WHILE_CASTING = 0.30; // 30% regen inside 5SR

  // Store gear stats for mana regen calculation
  const gearStatsRef = useRef<{ intellect: number; spirit: number; mp5: number } | null>(null);

  // Innervate buff tracking
  const [innervateRemaining, setInnervateRemaining] = useState(0);
  const innervateRemainingRef = useRef<number>(0); // Ref for immediate access in game loop
  const INNERVATE_SPIRIT_MULTIPLIER = 5.0; // 400% increase = 5x total

  // Tree of Life buff tracking (permanent toggle)
  const [treeOfLifeActive, setTreeOfLifeActive] = useState(false);
  const treeOfLifeActiveRef = useRef<boolean>(false); // Ref for immediate access
  const TREE_OF_LIFE_MANA_REDUCTION = 0.25; // 25% mana cost reduction
  const TREE_OF_LIFE_AFFECTED_SPELLS = ['lifebloom', 'rejuvenation', 'regrowth', 'swiftmend', 'innervate'];

  // Consumable buffs
  const [draenicWisdomActive, setDraenicWisdomActive] = useState(false);
  const DRAENIC_WISDOM_BONUS = 30; // +30 Intellect and Spirit
  const [healingPowerActive, setHealingPowerActive] = useState(false);
  const HEALING_POWER_BONUS = 50; // +50 healing power
  const [goldenFishSticksActive, setGoldenFishSticksActive] = useState(false);
  const GOLDEN_FISH_STICKS_HEALING = 44; // +44 healing power
  const GOLDEN_FISH_STICKS_SPIRIT = 20; // +20 spirit
  const [brilliantManaOilActive, setBrilliantManaOilActive] = useState(false);
  const BRILLIANT_MANA_OIL_MP5 = 12; // +12 mana per 5 seconds
  const BRILLIANT_MANA_OIL_HEALING = 25; // +25 healing power
  const [greaterBlessingOfWisdomActive, setGreaterBlessingOfWisdomActive] = useState(false);
  const GREATER_BLESSING_OF_WISDOM_MP5 = 41; // +41 mana per 5 seconds
  const [prayerOfFortitudeActive, setPrayerOfFortitudeActive] = useState(false);
  const PRAYER_OF_FORTITUDE_STAMINA = 79; // +79 stamina
  const [arcaneBrillianceActive, setArcaneBrillianceActive] = useState(false);
  const ARCANE_BRILLIANCE_INTELLECT = 40; // +40 intellect
  const [giftOfTheWildActive, setGiftOfTheWildActive] = useState(false);
  const GIFT_OF_THE_WILD_STATS = 14; // +14 stamina, intellect, and spirit
  const [spiritBuffActive, setSpiritBuffActive] = useState(false);
  const SPIRIT_BUFF_BONUS = 30; // +30 spirit
  const [greaterBlessingOfKingsActive, setGreaterBlessingOfKingsActive] = useState(false);
  const GREATER_BLESSING_OF_KINGS_MULTIPLIER = 1.10; // +10% to stamina, intellect, spirit
  const [manaSpringTotemActive, setManaSpringTotemActive] = useState(false);
  const MANA_SPRING_TOTEM_MP5 = 25; // +25 mana per 5 seconds
  const [wrathOfAirTotemActive, setWrathOfAirTotemActive] = useState(false);
  const WRATH_OF_AIR_TOTEM_HEALING = 101; // +101 healing power
  const restoreManaOnBuffRef = useRef(false); // Flag to restore mana to full after buffing

  // Boss auto attack timer (seconds until next attack)
  const bossAutoAttackTimerRef = useRef<number>(2.0);
  const BOSS_AUTO_ATTACK_INTERVAL = 2.0; // seconds
  const BOSS_AUTO_ATTACK_MIN = 4500;
  const BOSS_AUTO_ATTACK_MAX = 6000;

  // Boss raid damage timer (random target damage)
  const bossRaidDamageTimerRef = useRef<number>(4.0);
  const BOSS_RAID_DAMAGE_INTERVAL = 4.0; // seconds
  const BOSS_RAID_DAMAGE_AMOUNT = 3000;
  const BOSS_RAID_DAMAGE_TARGETS = 6;

  // Raid DPS attack timer
  const raidDpsTimerRef = useRef<number>(1.0);
  const RAID_DPS_INTERVAL = 1.0; // seconds
  const RAID_DPS_MIN = 400;
  const RAID_DPS_MAX = 600;

  // Victory state
  const [encounterVictory, setEncounterVictory] = useState(false);

  // NPC Healer state (for resto shamans and other AI healers)
  const npcHealersRef = useRef<NPCHealerState[]>([]);

  // Chain Heal visual effects (yellow lines connecting targets)
  const [chainHealVisuals, setChainHealVisuals] = useState<ChainHealVisual[]>([]);
  const chainHealVisualsRef = useRef<ChainHealVisual[]>([]); // Ref for game loop access
  const CHAIN_HEAL_VISUAL_DURATION = 500; // 0.5 seconds in ms

  // Refs to track current state values for game loop access
  const encounterActiveRef = useRef(encounterActive);
  const bossTargetIdsRef = useRef(bossTargetIds);
  encounterActiveRef.current = encounterActive;
  bossTargetIdsRef.current = bossTargetIds;
  raidMembersRef.current = raidMembers;
  treeOfLifeActiveRef.current = treeOfLifeActive;
  castingRef.current = casting;

  // Helper to create a unique key for a slot
  const slotKey = (barId: ActionBarId, slotIndex: number) => `${barId}-${slotIndex}`;

  // Helper to check if a slot contains a macro
  const isMacroSlot = (slotContent: string | null): boolean => {
    return slotContent?.startsWith('macro:') ?? false;
  };

  // Get macro ID from slot content
  const getMacroIdFromSlot = (slotContent: string | null): string | null => {
    if (!slotContent?.startsWith('macro:')) return null;
    return slotContent.substring('macro:'.length);
  };

  // Get macro by ID
  const getMacroById = (macroId: string): Macro | undefined => {
    return macros.find(m => m.id === macroId);
  };

  // Create raid members from composition
  const createRaidFromComposition = (composition: RaidComposition): RaidMember[] => {
    return composition.slots.map((slot, index) => {
      const spec = getSpec(slot.specId);
      const isPlayer = slot.specId === PLAYER_SPEC_ID;
      const classInfo = spec ? CLASS_INFO[spec.class] : null;

      // Health based on role
      let maxHealth = 8000;
      if (spec?.role === 'tank') maxHealth = 18000;
      else if (spec?.role === 'healer') maxHealth = 8500;

      return {
        id: `raid-${index}`,
        name: isPlayer ? 'You' : `${classInfo?.name || 'Unknown'} ${index + 1}`,
        role: spec?.role || 'dps',
        class: classInfo?.name || 'Unknown',
        maxHealth,
        currentHealth: maxHealth,
        hots: [],
        debuffs: [],
        isDead: false,
        specId: slot.specId,
      } as RaidMember & { specId: string };
    });
  };

  // Map event.code to the base key character
  const getBaseKeyFromCode = (code: string): string | null => {
    // Digit keys: "Digit1" -> "1"
    if (code.startsWith('Digit')) {
      return code.charAt(5);
    }
    // Letter keys: "KeyA" -> "a"
    if (code.startsWith('Key')) {
      return code.charAt(3).toLowerCase();
    }
    // Special keys
    const codeMap: Record<string, string> = {
      'Space': ' ',
      'Minus': '-',
      'Equal': '=',
      'BracketLeft': '[',
      'BracketRight': ']',
      'Backslash': '\\',
      'Semicolon': ';',
      'Quote': "'",
      'Comma': ',',
      'Period': '.',
      'Slash': '/',
      'Backquote': '`',
      'ArrowUp': 'arrowup',
      'ArrowDown': 'arrowdown',
      'ArrowLeft': 'arrowleft',
      'ArrowRight': 'arrowright',
      'Tab': 'tab',
      'Enter': 'enter',
      'Backspace': 'backspace',
      'Delete': 'delete',
      'Home': 'home',
      'End': 'end',
      'PageUp': 'pageup',
      'PageDown': 'pagedown',
    };
    return codeMap[code] || null;
  };

  // Build key string with modifiers
  const buildKeyString = (event: KeyboardEvent): string | null => {
    const rawKey = event.key.toLowerCase();

    // Ignore modifier keys alone
    if (['shift', 'control', 'alt', 'meta'].includes(rawKey)) {
      return null;
    }

    // Build modifier prefix
    const modifiers: string[] = [];
    if (event.shiftKey) modifiers.push('shift');
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.altKey) modifiers.push('alt');

    // When shift is held, use event.code to get the base key
    // This prevents "Shift+1" from becoming "shift+!"
    let key = rawKey;
    if (event.shiftKey) {
      const baseKey = getBaseKeyFromCode(event.code);
      if (baseKey) {
        key = baseKey;
      }
    }

    // Combine modifiers with key
    if (modifiers.length > 0) {
      return [...modifiers, key].join('+');
    }

    return key;
  };

  // Helper to calculate effective mana cost with Tree of Life reduction
  const getEffectiveManaCost = useCallback((spellId: string, baseCost: number): number => {
    if (treeOfLifeActiveRef.current && TREE_OF_LIFE_AFFECTED_SPELLS.includes(spellId)) {
      return Math.floor(baseCost * (1 - TREE_OF_LIFE_MANA_REDUCTION));
    }
    return baseCost;
  }, []);

  // Cast a spell on a target (defaults to current target)
  const castSpell = useCallback((spellId: string, overrideTargetId?: string) => {
    // Debug: log why cast might be blocked
    if (!combatStats) {
      console.log('Cast blocked: no combat stats');
      return;
    }
    const spell = getSpell(spellId);
    if (!spell) {
      console.log(`Cast blocked: spell not found (${spellId})`);
      return;
    }

    // Handle Tree of Life toggle - deactivating does NOT trigger GCD
    if (spellId === 'tree-of-life') {
      if (treeOfLifeActiveRef.current) {
        // Deactivate - no GCD, no mana cost
        treeOfLifeActiveRef.current = false;
        setTreeOfLifeActive(false);
        console.log('Tree of Life deactivated');
        return;
      }
      // Activating continues with normal spell logic below (will trigger GCD)
    }

    // Off-GCD spells (gcd: false) can be cast during GCD
    // Use ref for real-time GCD check (state may be stale due to React batching)
    if (gcdRemainingRef.current > 0 && spell.gcd) {
      // Spell queueing: if within queue window, queue the spell for when GCD ends
      if (gcdRemainingRef.current <= SPELL_QUEUE_WINDOW) {
        spellQueueRef.current = { spellId, targetId: overrideTargetId ?? targetId ?? undefined };
        console.log(`Spell queued: ${spell.name} (GCD ends in ${gcdRemainingRef.current.toFixed(2)}s)`);
        return;
      }
      console.log(`Cast blocked: GCD (${gcdRemainingRef.current.toFixed(2)}s remaining)`);
      return;
    }
    // Use ref for real-time casting check (state may be stale due to React batching)
    if (castingRef.current) {
      // Also allow queueing during a cast if within queue window of cast completing
      if (castingRef.current.castTime <= SPELL_QUEUE_WINDOW) {
        spellQueueRef.current = { spellId, targetId: overrideTargetId ?? targetId ?? undefined };
        console.log(`Spell queued: ${spell.name} (cast ends in ${castingRef.current.castTime.toFixed(2)}s)`);
        return;
      }
      console.log(`Cast blocked: already casting ${castingRef.current.spellName}`);
      return;
    }

    // Clear the queue since we're casting directly
    spellQueueRef.current = null;

    // Self-cast spells don't require a target (mana potions, Innervate on self, Tree of Life)
    const isSelfCast = spell.effect.type === 'mana_restore' ||
                       (spell.effect.type === 'buff' && (spell.effect.effect === 'mana_regen' || spell.effect.effect === 'tree_of_life'));
    const effectiveTargetId = overrideTargetId ?? targetId;
    if (!isSelfCast && !effectiveTargetId) {
      console.log('Cast blocked: no target selected');
      return;
    }

    // Calculate effective mana cost (with Tree of Life reduction if applicable)
    const effectiveManaCost = getEffectiveManaCost(spellId, spell.manaCost);

    // Check mana
    if (currentMana < effectiveManaCost) {
      console.log(`Cast blocked: not enough mana (${currentMana}/${effectiveManaCost})`);
      return;
    }

    // Check cooldown
    if (spell.cooldown > 0 && cooldowns[spellId] && cooldowns[spellId] > 0) {
      console.log(`${spell.name} is on cooldown (${cooldowns[spellId].toFixed(1)}s remaining)`);
      return;
    }

    // If spell has a cast time, start casting instead of instant
    if (spell.castTime > 0) {
      const actualCastTime = spell.castTime / (1 + combatStats.hastePercent / 100);

      // GCD starts when cast begins, not when it finishes
      if (spell.gcd) {
        const gcdDuration = calculateGCD(combatStats.hastePercent);
        gcdRemainingRef.current = gcdDuration;
        setGcdRemaining(gcdDuration);
        setGcdTotal(gcdDuration);
      }

      // Update casting state and ref immediately
      // effectiveTargetId is guaranteed non-null here since we checked earlier for non-self-cast spells
      const newCasting = {
        spellId,
        spellName: spell.name,
        targetId: effectiveTargetId!,
        castTime: actualCastTime,
        totalCastTime: actualCastTime,
      };
      castingRef.current = newCasting;
      setCasting(newCasting);
      return; // Don't apply spell yet - wait for cast to complete
    }

    // Instant cast spells - deduct mana and trigger GCD immediately
    setCurrentMana(prev => prev - effectiveManaCost);

    // Reset 5-second rule timer if spell costs mana
    if (effectiveManaCost > 0) {
      timeSinceLastCastRef.current = 0;
    }

    // Trigger GCD
    if (spell.gcd) {
      const gcdDuration = calculateGCD(combatStats.hastePercent);
      console.log(`GCD triggered: ${gcdDuration.toFixed(3)}s (haste: ${combatStats.hastePercent.toFixed(2)}%)`);
      gcdRemainingRef.current = gcdDuration;
      setGcdRemaining(gcdDuration);
      setGcdTotal(gcdDuration);
    }

    // Handle Lifebloom
    if (spellId === 'lifebloom') {
      // Update raid members state - use functional update to get fresh state
      setRaidMembers(prev => {
        const targetIndex = prev.findIndex(m => m.id === effectiveTargetId);
        if (targetIndex === -1) return prev;

        // Clone the target and its hots array to avoid mutation issues
        const target = {
          ...prev[targetIndex],
          hots: prev[targetIndex].hots.map(hot => ({ ...hot })),
        };

        const result = applyLifebloom(
          target,
          { spellPower: combatStats.spellPower, critChance: combatStats.critChance },
          'player'
        );

        console.log(`Lifebloom ${result.type} on ${target.name} - ${result.stacks} stack(s), ${result.healPerTick} per tick`);

        const updated = [...prev];
        updated[targetIndex] = target;
        return updated;
      });
    }

    // Handle Rejuvenation
    if (spellId === 'rejuvenation') {
      setRaidMembers(prev => {
        const targetIndex = prev.findIndex(m => m.id === effectiveTargetId);
        if (targetIndex === -1) return prev;

        const target = prev[targetIndex];
        const effect = spell.effect as { type: 'hot'; duration: number; tickInterval: number; healPerTick: number; coefficient: number };

        // Calculate heal per tick with spell power
        const healPerTick = Math.floor(effect.healPerTick + effect.coefficient * combatStats.spellPower);

        // Remove existing Rejuvenation from this caster (refresh)
        const filteredHots = target.hots.filter(
          hot => !(hot.spellId === 'rejuvenation' && hot.sourceId === 'player')
        );

        // Add new Rejuvenation HoT
        const newHot: ActiveHoT = {
          spellId: 'rejuvenation',
          sourceId: 'player',
          targetId: target.id,
          remainingDuration: effect.duration,
          tickInterval: effect.tickInterval,
          nextTickIn: effect.tickInterval,
          healPerTick,
          stacks: 1,
        };

        console.log(`Rejuvenation applied on ${target.name} - ${healPerTick} per tick`);

        const updated = [...prev];
        updated[targetIndex] = {
          ...target,
          hots: [...filteredHots, newHot],
        };
        return updated;
      });
    }

    // Handle Swiftmend
    if (spellId === 'swiftmend') {
      // First check if target has a valid HoT to consume (need to read current state)
      setRaidMembers(prev => {
        const targetIndex = prev.findIndex(m => m.id === effectiveTargetId);
        if (targetIndex === -1) return prev;

        // Clone the target and its hots array to avoid mutation issues
        const target = {
          ...prev[targetIndex],
          hots: prev[targetIndex].hots.map(hot => ({ ...hot })),
        };

        // Check if we can Swiftmend this target
        if (!canSwiftmend(target, 'player')) {
          console.log(`Swiftmend failed: ${target.name} has no Rejuvenation or Regrowth to consume`);
          // Refund mana since we already deducted it (use effective cost with Tree of Life reduction)
          setCurrentMana(m => m + effectiveManaCost);
          return prev;
        }

        const result = applySwiftmend(
          target,
          { critChance: combatStats.critChance },
          'player'
        );

        if (result.success) {
          console.log(
            `Swiftmend on ${target.name} - Consumed ${result.consumedHoT}, healed for ${result.healAmount}${result.isCrit ? ' (CRIT!)' : ''}`
          );

          // Add heal to floating combat text
          const totalHeal = result.healAmount + result.overheal;
          const targetIdForText = target.id;
          setTimeout(() => {
            setFloatingText(prevText => [...prevText, {
              id: floatingTextIdRef.current++,
              targetId: targetIdForText,
              amount: totalHeal,
              timestamp: Date.now(),
            }]);
          }, 0);

          // Start cooldown
          setCooldowns(cd => ({ ...cd, [spellId]: spell.cooldown }));
        }

        const updated = [...prev];
        updated[targetIndex] = target;
        return updated;
      });
    }

    // Handle Innervate
    if (spellId === 'innervate') {
      const effect = spell.effect as { type: 'buff'; duration: number };
      innervateRemainingRef.current = effect.duration;
      setInnervateRemaining(effect.duration);
      console.log(`Innervate activated for ${effect.duration} seconds - 400% spirit increase, full mana regen`);

      // Start cooldown
      setCooldowns(cd => ({ ...cd, [spellId]: spell.cooldown }));
      return;
    }

    // Handle Tree of Life activation
    if (spellId === 'tree-of-life') {
      treeOfLifeActiveRef.current = true;
      setTreeOfLifeActive(true);
      console.log('Tree of Life activated - 25% mana cost reduction on Lifebloom, Rejuvenation, Regrowth, Swiftmend, and Innervate');
      return;
    }

    // Handle mana restore effects (Super Mana Potion, Dark Rune)
    if (spell.effect.type === 'mana_restore') {
      const effect = spell.effect as { type: 'mana_restore'; minMana: number; maxMana: number; selfDamageMin?: number; selfDamageMax?: number };
      const manaRestored = Math.floor(Math.random() * (effect.maxMana - effect.minMana + 1) + effect.minMana);

      setCurrentMana(prev => {
        const newMana = Math.min(prev + manaRestored, combatStats.maxMana);
        console.log(`${spell.name} restored ${manaRestored} mana (${Math.floor(prev)} -> ${Math.floor(newMana)})`);
        return newMana;
      });

      // Handle self-damage (Dark Rune)
      if (effect.selfDamageMin && effect.selfDamageMax) {
        const selfDamage = Math.floor(Math.random() * (effect.selfDamageMax - effect.selfDamageMin + 1) + effect.selfDamageMin);

        // Find and damage the player (raid member index 0)
        setRaidMembers(prev => {
          const playerIndex = prev.findIndex(m => (m as RaidMember & { specId?: string }).specId === PLAYER_SPEC_ID);
          if (playerIndex === -1) return prev;

          const player = prev[playerIndex];
          const newHealth = Math.max(0, player.currentHealth - selfDamage);
          console.log(`${spell.name} dealt ${selfDamage} damage to self (${player.currentHealth} -> ${newHealth})`);

          const updated = [...prev];
          updated[playerIndex] = {
            ...player,
            currentHealth: newHealth,
            isDead: newHealth <= 0,
          };
          return updated;
        });
      }

      // Start cooldown
      setCooldowns(cd => ({ ...cd, [spellId]: spell.cooldown }));
      return; // Don't process other spell logic
    }

    // Start cooldown for other spells with cooldowns (non-Swiftmend, as it handles its own)
    if (spell.cooldown > 0 && spellId !== 'swiftmend') {
      setCooldowns(cd => ({ ...cd, [spellId]: spell.cooldown }));
    }

  }, [combatStats, gcdRemaining, casting, targetId, currentMana, cooldowns]);

  // Complete a cast and apply the spell effect
  const completeCast = useCallback(() => {
    if (!casting || !combatStats) return;

    const spell = getSpell(casting.spellId);
    if (!spell) {
      castingRef.current = null;
      setCasting(null);
      return;
    }

    // Calculate effective mana cost (with Tree of Life reduction if applicable)
    const effectiveManaCost = getEffectiveManaCost(casting.spellId, spell.manaCost);

    // Deduct mana (GCD was already triggered when cast started)
    setCurrentMana(prev => prev - effectiveManaCost);

    // Reset 5-second rule timer if spell costs mana
    if (effectiveManaCost > 0) {
      timeSinceLastCastRef.current = 0;
    }

    // Handle Regrowth completion
    if (casting.spellId === 'regrowth') {
      setRaidMembers(prev => {
        const targetIndex = prev.findIndex(m => m.id === casting.targetId);
        if (targetIndex === -1) return prev;

        // Clone the target and its hots array to avoid mutation issues
        const target = {
          ...prev[targetIndex],
          hots: prev[targetIndex].hots.map(hot => ({ ...hot })),
        };

        const result = applyRegrowth(
          target,
          { spellPower: combatStats.spellPower, critChance: combatStats.critChance },
          'player'
        );

        console.log(
          `Regrowth on ${target.name} - Direct: ${result.directHeal}${result.directCrit ? ' (CRIT!)' : ''}, HoT: ${result.healPerTick} per tick`
        );

        // Add direct heal to floating combat text (show total heal amount including overheal)
        const totalDirectHeal = result.directHeal + result.directOverheal;
        if (totalDirectHeal > 0) {
          const targetIdForText = target.id;
          // Use setTimeout to ensure this runs after state update
          setTimeout(() => {
            setFloatingText(prevText => [...prevText, {
              id: floatingTextIdRef.current++,
              targetId: targetIdForText,
              amount: totalDirectHeal,
              timestamp: Date.now(),
            }]);
          }, 0);
        }

        const updated = [...prev];
        updated[targetIndex] = target;
        return updated;
      });
    }

    // Clear casting state and ref
    castingRef.current = null;
    setCasting(null);

    // Process spell queue when cast completes
    if (spellQueueRef.current) {
      const queued = spellQueueRef.current;
      spellQueueRef.current = null;
      console.log(`Executing queued spell after cast: ${queued.spellId}`);
      setTimeout(() => castSpell(queued.spellId, queued.targetId), 0);
    }
  }, [casting, combatStats, castSpell]);

  // Listen for WASD movement keys
  useEffect(() => {
    const movementCodes: Record<string, string> = {
      'KeyW': 'w',
      'KeyA': 'a',
      'KeyS': 's',
      'KeyD': 'd',
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = movementCodes[event.code];
      if (key) {
        event.preventDefault();
        movementKeysRef.current.add(key);

        // Cancel any active cast when movement starts
        if (casting) {
          console.log('Cast cancelled by movement');
          setCasting(null);
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = movementCodes[event.code];
      if (key) {
        movementKeysRef.current.delete(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [casting]);

  // Activate a slot (cast the spell or macro in it)
  const handleSlotActivation = useCallback((barId: ActionBarId, slotIndex: number) => {
    const slotContent = actionBars.bars[barId]?.slots[slotIndex];
    if (!slotContent) return;

    // Visual feedback
    const key = slotKey(barId, slotIndex);
    setPressedSlots(prev => new Set(prev).add(key));
    setTimeout(() => {
      setPressedSlots(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 100);

    // Check if this is a macro
    if (isMacroSlot(slotContent)) {
      const macroId = getMacroIdFromSlot(slotContent);
      if (!macroId) return;

      const macro = getMacroById(macroId);
      if (!macro) return;

      // Parse the macro and get the first cast command
      const castCommand = getFirstCastCommand(macro.body);
      if (!castCommand) return;

      // If macro has a target name, find the raid member
      if (castCommand.targetName) {
        const targetIndex = findRaidMemberByName(raidComposition.slots, castCommand.targetName);
        if (targetIndex !== -1) {
          const targetMemberId = `raid-${targetIndex}`;
          castSpell(castCommand.spellId, targetMemberId);
        }
      } else {
        // No specific target, use current target
        castSpell(castCommand.spellId);
      }
    } else {
      // Regular spell
      castSpell(slotContent);
    }
  }, [actionBars, castSpell, macros, raidComposition.slots]);

  // Listen for keybind presses to highlight slots and cast spells
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const keyString = buildKeyString(event);
      if (!keyString) return;

      // Check if this key is bound to a slot
      const binding = keybindings.bindings[keyString];
      if (!binding) return;

      // Activate the slot
      handleSlotActivation(binding.barId, binding.slotIndex);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keybindings, handleSlotActivation]);

  // Initialize encounter
  useEffect(() => {
    const enc = getEncounter(encounterId);
    if (!enc) {
      console.error('Encounter not found:', encounterId);
      onExit();
      return;
    }

    setEncounter(enc);
    const initialRaidMembers = createRaidFromComposition(raidComposition);
    setRaidMembers(initialRaidMembers);

    // Initialize NPC healers (find all resto shamans in raid composition)
    const npcHealers: NPCHealerState[] = [];
    raidComposition.slots.forEach((slot, index) => {
      if (slot.specId === 'shaman-restoration') {
        npcHealers.push(createRestoShamanState(`raid-${index}`));
        console.log(`Initialized NPC Resto Shaman healer at raid slot ${index}`);
      }
    });
    npcHealersRef.current = npcHealers;

    // Find all tank specs to be boss targets (any spec with role 'tank')
    const tankIndices: number[] = [];
    raidComposition.slots.forEach((slot, index) => {
      const spec = getSpec(slot.specId);
      if (spec?.role === 'tank') {
        tankIndices.push(index);
      }
    });

    // Determine number of bosses (default 1)
    const bossCount = enc.bossCount ?? 1;

    // Assign tanks to bosses (one tank per boss)
    const targetIds: string[] = [];
    for (let i = 0; i < bossCount; i++) {
      if (i < tankIndices.length) {
        targetIds.push(`raid-${tankIndices[i]}`);
      }
    }
    setBossTargetIds(targetIds);

    // Initialize bosses
    const initialBosses: BossState[] = [];
    for (let i = 0; i < bossCount; i++) {
      initialBosses.push({
        name: enc.bossNames?.[i] ?? enc.name,
        maxHealth: enc.bossHealth ?? 1000000,
        currentHealth: enc.bossHealth ?? 1000000,
      });
    }
    setBosses(initialBosses);

    // Initialize player stats from gearset
    const gearset = getGearPreset(gearsetId) ?? DEFAULT_GEAR_PRESET;
    const stats = calculateCombatStats(gearset.stats);
    setCombatStats(stats);
    setCurrentMana(stats.maxMana);
    gcdRemainingRef.current = 0;
    setGcdRemaining(0);

    // Update player's health in raid to match calculated stats
    setRaidMembers(prevMembers => {
      return prevMembers.map(member => {
        const memberWithSpec = member as RaidMember & { specId?: string };
        if (memberWithSpec.specId !== PLAYER_SPEC_ID) return member;

        return {
          ...member,
          maxHealth: stats.maxHealth,
          currentHealth: stats.maxHealth,
        };
      });
    });

    // Store gear stats for mana regen calculation
    gearStatsRef.current = {
      intellect: gearset.stats.intellect,
      spirit: gearset.stats.spirit,
      mp5: gearset.stats.mp5,
    };

    // Reset update timer
    lastUpdateRef.current = Date.now();
  }, [encounterId, gearsetId, raidComposition, onExit]);

  // Recalculate combat stats when consumable buffs change
  useEffect(() => {
    if (!gearStatsRef.current) return;

    const gearset = getGearPreset(gearsetId) ?? DEFAULT_GEAR_PRESET;

    // Apply buff bonuses to base stats (flat bonuses first)
    let stamina = gearset.stats.stamina
      + (prayerOfFortitudeActive ? PRAYER_OF_FORTITUDE_STAMINA : 0)
      + (giftOfTheWildActive ? GIFT_OF_THE_WILD_STATS : 0);
    let intellect = gearset.stats.intellect
      + (draenicWisdomActive ? DRAENIC_WISDOM_BONUS : 0)
      + (arcaneBrillianceActive ? ARCANE_BRILLIANCE_INTELLECT : 0)
      + (giftOfTheWildActive ? GIFT_OF_THE_WILD_STATS : 0);
    let spirit = gearset.stats.spirit
      + (draenicWisdomActive ? DRAENIC_WISDOM_BONUS : 0)
      + (goldenFishSticksActive ? GOLDEN_FISH_STICKS_SPIRIT : 0)
      + (giftOfTheWildActive ? GIFT_OF_THE_WILD_STATS : 0)
      + (spiritBuffActive ? SPIRIT_BUFF_BONUS : 0);

    // Apply Kings multiplier (10% to stamina, intellect, spirit)
    if (greaterBlessingOfKingsActive) {
      stamina = Math.floor(stamina * GREATER_BLESSING_OF_KINGS_MULTIPLIER);
      intellect = Math.floor(intellect * GREATER_BLESSING_OF_KINGS_MULTIPLIER);
      spirit = Math.floor(spirit * GREATER_BLESSING_OF_KINGS_MULTIPLIER);
    }

    const buffedStats = {
      ...gearset.stats,
      stamina,
      intellect,
      spirit,
      spellPower: gearset.stats.spellPower
        + (healingPowerActive ? HEALING_POWER_BONUS : 0)
        + (goldenFishSticksActive ? GOLDEN_FISH_STICKS_HEALING : 0)
        + (brilliantManaOilActive ? BRILLIANT_MANA_OIL_HEALING : 0)
        + (wrathOfAirTotemActive ? WRATH_OF_AIR_TOTEM_HEALING : 0),
      mp5: gearset.stats.mp5
        + (brilliantManaOilActive ? BRILLIANT_MANA_OIL_MP5 : 0)
        + (greaterBlessingOfWisdomActive ? GREATER_BLESSING_OF_WISDOM_MP5 : 0)
        + (manaSpringTotemActive ? MANA_SPRING_TOTEM_MP5 : 0),
    };

    const stats = calculateCombatStats(buffedStats);
    setCombatStats(stats);

    // Update stored gear stats with buff bonuses for mana regen calculation
    gearStatsRef.current = {
      intellect: buffedStats.intellect,
      spirit: buffedStats.spirit,
      mp5: buffedStats.mp5,
    };

    // Update mana - restore to full if buffing, otherwise keep percentage
    if (restoreManaOnBuffRef.current) {
      setCurrentMana(stats.maxMana);
      restoreManaOnBuffRef.current = false;
    } else {
      setCurrentMana(prevMana => {
        if (!combatStats) return stats.maxMana;
        const manaPercent = prevMana / combatStats.maxMana;
        return Math.floor(manaPercent * stats.maxMana);
      });
    }

    // Update player's health in raid members based on combat stats
    setRaidMembers(prevMembers => {
      return prevMembers.map(member => {
        const memberWithSpec = member as RaidMember & { specId?: string };
        if (memberWithSpec.specId !== PLAYER_SPEC_ID) return member;

        // Keep health percentage when max health changes
        const healthPercent = combatStats ? member.currentHealth / member.maxHealth : 1;
        const newMaxHealth = stats.maxHealth;
        const newCurrentHealth = Math.floor(healthPercent * newMaxHealth);

        return {
          ...member,
          maxHealth: newMaxHealth,
          currentHealth: newCurrentHealth,
        };
      });
    });
  }, [draenicWisdomActive, healingPowerActive, goldenFishSticksActive, brilliantManaOilActive, greaterBlessingOfWisdomActive, prayerOfFortitudeActive, arcaneBrillianceActive, giftOfTheWildActive, spiritBuffActive, greaterBlessingOfKingsActive, manaSpringTotemActive, wrathOfAirTotemActive, gearsetId]);

  // Game loop - process HoT ticks, GCD, etc.
  useEffect(() => {
    if (!combatStats) return;

    // Reset timing reference when game loop starts to avoid false initial spike
    lastUpdateRef.current = Date.now();

    // Frame timing diagnostics
    let frameCount = 0;
    let totalDelta = 0;
    let maxDelta = 0;

    const gameLoop = () => {
      const now = Date.now();
      const deltaMs = now - lastUpdateRef.current;
      // Cap delta to prevent huge jumps after frame drops (max 100ms = 10fps)
      const cappedDeltaMs = Math.min(deltaMs, 100);
      const deltaSeconds = cappedDeltaMs / 1000;
      lastUpdateRef.current = now;

      // Track frame timing for diagnostics
      frameCount++;
      totalDelta += deltaMs;
      if (deltaMs > maxDelta) maxDelta = deltaMs;

      // Log warning if frame took too long (> 50ms = dropped frames)
      if (deltaMs > 50) {
        console.warn(`[Frame Drop] Delta: ${deltaMs.toFixed(1)}ms (capped to ${cappedDeltaMs.toFixed(1)}ms)`);
      }

      // Log stats every 5 seconds
      if (frameCount % 300 === 0) {
        const avgDelta = totalDelta / frameCount;
        console.log(`[Frame Stats] Avg: ${avgDelta.toFixed(1)}ms, Max: ${maxDelta.toFixed(1)}ms, Frames: ${frameCount}`);
      }

      // Update GCD (update ref immediately for real-time checks)
      const wasOnGcd = gcdRemainingRef.current > 0;
      gcdRemainingRef.current = Math.max(0, gcdRemainingRef.current - deltaSeconds);
      setGcdRemaining(gcdRemainingRef.current);

      // Process spell queue when GCD ends
      if (wasOnGcd && gcdRemainingRef.current === 0 && spellQueueRef.current) {
        const queued = spellQueueRef.current;
        spellQueueRef.current = null;
        console.log(`Executing queued spell: ${queued.spellId}`);
        // Use setTimeout to avoid calling castSpell during render
        setTimeout(() => castSpell(queued.spellId, queued.targetId), 0);
      }

      // Update cooldowns
      setCooldowns(prev => {
        const updated: Record<string, number> = {};
        let hasChanges = false;
        for (const [spellId, remaining] of Object.entries(prev)) {
          const newRemaining = Math.max(0, remaining - deltaSeconds);
          if (newRemaining > 0) {
            updated[spellId] = newRemaining;
          }
          if (newRemaining !== remaining) {
            hasChanges = true;
          }
        }
        return hasChanges ? updated : prev;
      });

      // Update 5-second rule timer
      timeSinceLastCastRef.current += deltaSeconds;

      // Update Innervate duration (use ref for immediate access)
      if (innervateRemainingRef.current > 0) {
        innervateRemainingRef.current -= deltaSeconds;
        if (innervateRemainingRef.current <= 0) {
          innervateRemainingRef.current = 0;
          console.log('Innervate expired');
        }
        setInnervateRemaining(innervateRemainingRef.current);
      }

      // Mana regeneration
      if (gearStatsRef.current && combatStats) {
        const { intellect, spirit, mp5 } = gearStatsRef.current;

        // Check if Innervate is active (use ref for current value)
        const hasInnervate = innervateRemainingRef.current > 0;

        // Calculate effective spirit (5x during Innervate)
        const effectiveSpirit = hasInnervate ? spirit * INNERVATE_SPIRIT_MULTIPLIER : spirit;

        // Calculate spirit-based regen (per 5 seconds)
        // Formula: 5 * 0.00932715221261 * sqrt(Intellect) * Spirit
        const spiritRegenPer5 = 5 * 0.00932715221261 * Math.sqrt(intellect) * effectiveSpirit;

        // Determine if we're inside or outside the 5-second rule
        // Innervate always counts as outside 5SR (full regen)
        const isOutsideFSR = hasInnervate || timeSinceLastCastRef.current >= FIVE_SECOND_RULE;
        const spiritRegenMultiplier = isOutsideFSR ? 1.0 : SPIRIT_REGEN_WHILE_CASTING;

        // Total MP5 = gear MP5 + (spirit regen * multiplier)
        const totalMp5 = mp5 + (spiritRegenPer5 * spiritRegenMultiplier);

        // Convert MP5 to mana per second, then to mana this tick
        const manaPerSecond = totalMp5 / 5;
        const manaThisTick = manaPerSecond * deltaSeconds;

        setCurrentMana(prev => Math.min(prev + manaThisTick, combatStats.maxMana));
      }

      // Update player movement
      const keys = movementKeysRef.current;
      if (keys.size > 0) {
        // Cancel any active cast when moving
        if (castingRef.current) {
          console.log(`Cast cancelled: ${castingRef.current.spellName} (moved)`);
          castingRef.current = null;
          setCasting(null);
        }

        setPlayerPosition(prev => {
          let dx = 0;
          let dy = 0;
          if (keys.has('w')) dy -= 1;
          if (keys.has('s')) dy += 1;
          if (keys.has('a')) dx -= 1;
          if (keys.has('d')) dx += 1;

          // Normalize diagonal movement
          if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx /= length;
            dy /= length;
          }

          return {
            x: prev.x + dx * PLAYER_SPEED * deltaSeconds,
            y: prev.y + dy * PLAYER_SPEED * deltaSeconds,
          };
        });
      }

      // Update cast bar
      setCasting(prev => {
        if (!prev) return null;
        const newCastTime = prev.castTime - deltaSeconds;
        if (newCastTime <= 0) {
          // Cast complete - will be handled by completeCast
          return { ...prev, castTime: 0 };
        }
        return { ...prev, castTime: newCastTime };
      });

      // Boss auto attack processing (each boss attacks its assigned tank)
      if (encounterActiveRef.current && bossTargetIdsRef.current.length > 0) {
        bossAutoAttackTimerRef.current -= deltaSeconds;

        if (bossAutoAttackTimerRef.current <= 0) {
          // Reset timer
          bossAutoAttackTimerRef.current = BOSS_AUTO_ATTACK_INTERVAL;

          // Each boss attacks its assigned tank
          const targetIds = bossTargetIdsRef.current;
          setRaidMembers(prevMembers => {
            return prevMembers.map(member => {
              // Check if this member is a target of any boss
              if (!targetIds.includes(member.id)) return member;

              // Calculate random base damage between min and max (per boss attack)
              const baseDamage = Math.floor(
                Math.random() * (BOSS_AUTO_ATTACK_MAX - BOSS_AUTO_ATTACK_MIN + 1) + BOSS_AUTO_ATTACK_MIN
              );

              // Check if target has avoidance stats (tanks)
              const memberWithSpec = member as RaidMember & { specId?: string };
              const avoidance = memberWithSpec.specId
                ? getAvoidanceStats(memberWithSpec.specId)
                : null;

              let finalDamage = baseDamage;
              let logMessage: string;

              if (avoidance) {
                // Roll on combat table for tanks
                const attackResult = rollCombatTable(baseDamage, avoidance);
                finalDamage = attackResult.damageDealt;
                logMessage = formatAttackResult('Boss', member.name, baseDamage, attackResult);
              } else {
                // Non-tanks take full damage
                logMessage = `Boss hits ${member.name} for ${baseDamage} damage`;
              }

              const newHealth = Math.max(0, member.currentHealth - finalDamage);
              console.log(`${logMessage} (${newHealth}/${member.maxHealth})`);

              return {
                ...member,
                currentHealth: newHealth,
                isDead: newHealth <= 0,
              };
            });
          });
        }
      }

      // Boss raid damage processing (random targets)
      if (encounterActiveRef.current) {
        bossRaidDamageTimerRef.current -= deltaSeconds;

        if (bossRaidDamageTimerRef.current <= 0) {
          // Reset timer
          bossRaidDamageTimerRef.current = BOSS_RAID_DAMAGE_INTERVAL;

          // Select random targets and apply damage
          setRaidMembers(prevMembers => {
            // Get alive members
            const aliveMembers = prevMembers.filter(m => !m.isDead);
            if (aliveMembers.length === 0) return prevMembers;

            // Randomly select targets (up to BOSS_RAID_DAMAGE_TARGETS)
            const shuffled = [...aliveMembers].sort(() => Math.random() - 0.5);
            const targets = shuffled.slice(0, Math.min(BOSS_RAID_DAMAGE_TARGETS, shuffled.length));
            const targetIds = new Set(targets.map(t => t.id));

            console.log(`Boss raid damage hits: ${targets.map(t => t.name).join(', ')} for ${BOSS_RAID_DAMAGE_AMOUNT} each`);

            return prevMembers.map(member => {
              if (!targetIds.has(member.id)) return member;

              const newHealth = Math.max(0, member.currentHealth - BOSS_RAID_DAMAGE_AMOUNT);

              return {
                ...member,
                currentHealth: newHealth,
                isDead: newHealth <= 0,
              };
            });
          });
        }
      }

      // Raid DPS attacking the boss
      if (encounterActiveRef.current) {
        raidDpsTimerRef.current -= deltaSeconds;

        if (raidDpsTimerRef.current <= 0) {
          // Reset timer
          raidDpsTimerRef.current = RAID_DPS_INTERVAL;

          // Count alive DPS members and calculate total damage
          setRaidMembers(prevMembers => {
            const aliveDps = prevMembers.filter(member => {
              if (member.isDead) return false;
              const memberWithSpec = member as RaidMember & { specId?: string };
              const spec = memberWithSpec.specId ? getSpec(memberWithSpec.specId) : null;
              return spec?.role === 'dps';
            });

            if (aliveDps.length > 0) {
              // Each DPS does random damage
              let totalDamage = 0;
              for (let i = 0; i < aliveDps.length; i++) {
                totalDamage += Math.floor(Math.random() * (RAID_DPS_MAX - RAID_DPS_MIN + 1) + RAID_DPS_MIN);
              }

              // Apply damage to all bosses (split evenly)
              setBosses(prevBosses => {
                if (prevBosses.length === 0) return prevBosses;
                const damagePerBoss = Math.floor(totalDamage / prevBosses.length);

                const updatedBosses = prevBosses.map(boss => ({
                  ...boss,
                  currentHealth: Math.max(0, boss.currentHealth - damagePerBoss),
                }));

                // Check for victory (all bosses dead)
                const allDead = updatedBosses.every(b => b.currentHealth <= 0);
                const wasAnyAlive = prevBosses.some(b => b.currentHealth > 0);
                if (allDead && wasAnyAlive) {
                  console.log('VICTORY! All bosses defeated!');
                  setEncounterVictory(true);
                  setEncounterActive(false);
                }

                return updatedBosses;
              });

              console.log(`Raid DPS: ${aliveDps.length} DPS dealing ${totalDamage} total damage to boss`);
            }

            return prevMembers; // No changes to raid members
          });
        }
      }

      // Process NPC healers (Resto Shamans casting Chain Heal)
      // IMPORTANT: Process outside setRaidMembers callback to prevent healer state
      // from being mutated multiple times if React calls the callback more than once
      if (encounterActiveRef.current && npcHealersRef.current.length > 0) {
        const allHealEvents: Array<{ targetId: string; amount: number }> = [];
        const newChainHealVisuals: ChainHealVisual[] = [];

        // Use a snapshot of raid members for NPC healer decisions
        // The healer state mutations happen exactly once per frame here
        const raidSnapshot = raidMembersRef.current.map(m => ({ ...m }));

        for (const healer of npcHealersRef.current) {
          const result = updateNPCHealer(healer, raidSnapshot, deltaSeconds);

          // Collect heal events
          for (const event of result.healEvents) {
            allHealEvents.push({
              targetId: event.targetId,
              amount: event.amount,
            });
          }

          // Collect chain heal visuals
          if (result.chainHealVisual) {
            newChainHealVisuals.push(result.chainHealVisual);
          }
        }

        // Apply heal events to raid members via state update
        if (allHealEvents.length > 0) {
          setRaidMembers(prevMembers => {
            const updatedMembers = prevMembers.map(member => {
              const healsForMember = allHealEvents.filter(e => e.targetId === member.id);
              if (healsForMember.length === 0) return member;

              let newHealth = member.currentHealth;
              for (const heal of healsForMember) {
                newHealth = Math.min(member.maxHealth, newHealth + heal.amount);
              }
              return { ...member, currentHealth: newHealth };
            });
            return updatedMembers;
          });

          // Add to floating combat text
          for (const event of allHealEvents) {
            pendingHealEventsRef.current.push(event);
          }
        }

        // Update chain heal visuals
        if (newChainHealVisuals.length > 0) {
          chainHealVisualsRef.current = [...chainHealVisualsRef.current, ...newChainHealVisuals];
          setChainHealVisuals(chainHealVisualsRef.current);
        }
      }

      // Clean up old chain heal visuals (older than CHAIN_HEAL_VISUAL_DURATION)
      // Only call setState if there are visuals to check (use ref to avoid unnecessary calls)
      if (chainHealVisualsRef.current.length > 0) {
        const now = Date.now();
        const filtered = chainHealVisualsRef.current.filter(
          v => now - v.timestamp < CHAIN_HEAL_VISUAL_DURATION
        );
        // Only trigger re-render if something was actually removed
        if (filtered.length !== chainHealVisualsRef.current.length) {
          chainHealVisualsRef.current = filtered;
          setChainHealVisuals(filtered);
        }
      }

      // Process all HoTs on all raid members (immutable update)
      setRaidMembers(prevMembers => {
        let hasActiveHoTs = false;

        const updatedMembers = prevMembers.map(member => {
          if (member.hots.length === 0) return member;

          hasActiveHoTs = true;
          let newHealth = member.currentHealth;

          // Process each HoT immutably
          const updatedHots: ActiveHoT[] = [];

          for (const hot of member.hots) {
            // Create a new HoT object with updated timers
            const updatedHot = {
              ...hot,
              remainingDuration: hot.remainingDuration - deltaSeconds,
              nextTickIn: hot.nextTickIn - deltaSeconds,
            };

            // Process ticks
            while (updatedHot.nextTickIn <= 0 && updatedHot.remainingDuration > 0) {
              const healAmount = updatedHot.healPerTick;
              const missingHealth = member.maxHealth - newHealth;
              const actualHeal = Math.min(healAmount, missingHealth);
              newHealth = Math.min(member.maxHealth, newHealth + actualHeal);

              // Track heal event for floating text (show full amount even if overheal)
              pendingHealEventsRef.current.push({ targetId: member.id, amount: healAmount });

              updatedHot.nextTickIn += updatedHot.tickInterval;
            }

            // Check for expiration
            if (updatedHot.remainingDuration <= 0) {
              // Bloom!
              if (updatedHot.spellId === 'lifebloom' && updatedHot.bloomHeal) {
                const bloomAmount = updatedHot.bloomHeal;
                const missingHealth = member.maxHealth - newHealth;
                const actualHeal = Math.min(bloomAmount, missingHealth);
                newHealth = Math.min(member.maxHealth, newHealth + actualHeal);
                console.log(`Lifebloom bloomed on ${member.name} for ${bloomAmount}`);

                // Track bloom heal event (show full amount even if overheal)
                pendingHealEventsRef.current.push({ targetId: member.id, amount: bloomAmount });
              }
              // Don't add to updatedHots (removes it)
            } else {
              updatedHots.push(updatedHot);
            }
          }

          // Return new member object with updated hots and health
          return {
            ...member,
            currentHealth: newHealth,
            hots: updatedHots,
          };
        });

        // Always re-render if there are active HoTs (for smooth sweep animation)
        return hasActiveHoTs ? updatedMembers : prevMembers;
      });

      // Add pending heal events as floating text
      if (pendingHealEventsRef.current.length > 0) {
        const now = Date.now();
        const newFloatingText = pendingHealEventsRef.current.map(event => ({
          id: floatingTextIdRef.current++,
          targetId: event.targetId,
          amount: event.amount,
          timestamp: now,
        }));
        pendingHealEventsRef.current = []; // Clear pending events
        setFloatingText(prev => [...prev, ...newFloatingText]);
      }

      // Clean up old floating text (older than 2 seconds)
      setFloatingText(prev => {
        if (prev.length === 0) return prev;
        const now = Date.now();
        const filtered = prev.filter(ft => now - ft.timestamp < 2000);
        return filtered.length === prev.length ? prev : filtered;
      });
    };

    const intervalId = setInterval(gameLoop, TICK_RATE);
    return () => clearInterval(intervalId);
  }, [combatStats]);

  // Complete cast when cast time reaches 0
  useEffect(() => {
    if (casting && casting.castTime <= 0) {
      completeCast();
    }
  }, [casting, completeCast]);

  if (!encounter || bosses.length === 0) {
    return <div className={styles.loading}>Loading encounter...</div>;
  }

  const getHealthPercent = (current: number, max: number) =>
    Math.max(0, Math.min(100, (current / max) * 100));

  // Get keybind for a specific bar+slot
  const getKeybindForSlot = (barId: ActionBarId, slotIndex: number): string | null => {
    for (const [key, target] of Object.entries(keybindings.bindings)) {
      if (target.barId === barId && target.slotIndex === slotIndex) {
        return key;
      }
    }
    return null;
  };

  // Format key for display
  const formatKey = (key: string): string => {
    const parts = key.split('+');
    const formattedParts = parts.map(part => {
      if (part === 'shift') return 'S';
      if (part === 'ctrl') return 'C';
      if (part === 'alt') return 'A';
      return part.toUpperCase();
    });
    return formattedParts.join('+');
  };

  // Parse macro #showtooltip for icon
  const getMacroSpell = (macro: Macro) => {
    const castCommand = getFirstCastCommand(macro.body);
    if (castCommand) {
      return castCommand.spell;
    }
    // Try parsing #showtooltip manually
    const lines = macro.body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed.startsWith('#showtooltip')) {
        const spellName = line.trim().substring('#showtooltip'.length).trim();
        if (spellName) {
          // Look up by iterating spells
          const spell = getSpell(spellName.toLowerCase().replace(/['\s]/g, '-'));
          if (spell) return spell;
        }
      }
    }
    return null;
  };

  const renderActionBar = (barId: ActionBarId) => {
    const bar = actionBars.bars[barId];
    const barInfo = ACTION_BARS.find(b => b.id === barId)!;
    const isVertical = barInfo.orientation === 'vertical';

    return (
      <div
        key={barId}
        className={`${styles.actionBar} ${isVertical ? styles.verticalBar : styles.horizontalBar}`}
      >
        {bar.slots.map((slotContent, index) => {
          // Determine if slot contains a spell or macro
          const isMacro = isMacroSlot(slotContent);
          const macroId = getMacroIdFromSlot(slotContent);
          const macro = macroId ? getMacroById(macroId) : null;
          const macroSpell = macro ? getMacroSpell(macro) : null;
          const spell = !isMacro && slotContent ? getSpell(slotContent) : null;

          // Get icon for display (Tree of Life shows active icon when buff is active)
          const baseIcon = spell?.icon || macroSpell?.icon;
          const icon = (spell?.id === 'tree-of-life' || macroSpell?.id === 'tree-of-life') && treeOfLifeActive
            ? '/icons/tree-of-life-active.jpg'
            : baseIcon;
          const displaySpell = spell || macroSpell;
          const hasContent = spell || macro;

          const keybind = getKeybindForSlot(barId, index);
          const isPressed = pressedSlots.has(slotKey(barId, index));
          const showGcd = displaySpell?.gcd && gcdRemaining > 0 && gcdTotal > 0;

          // Check if this spell is on cooldown
          const spellId = spell?.id || macroSpell?.id;
          const spellCooldownTotal = spell?.cooldown || macroSpell?.cooldown || 0;
          const spellCooldownRemaining = spellId ? (cooldowns[spellId] || 0) : 0;
          const showCooldown = spellCooldownTotal > 0 && spellCooldownRemaining > 0;

          const slotClasses = [
            styles.actionSlot,
            isPressed ? styles.pressed : '',
          ].filter(Boolean).join(' ');

          // Calculate GCD sweep progress (0 = just started, 1 = complete)
          const gcdProgress = gcdTotal > 0 ? 1 - (gcdRemaining / gcdTotal) : 1;
          const gcdDegrees = gcdProgress * 360;

          // Calculate cooldown sweep progress
          const cooldownProgress = spellCooldownTotal > 0 ? 1 - (spellCooldownRemaining / spellCooldownTotal) : 1;
          const cooldownDegrees = cooldownProgress * 360;

          return (
            <div
              key={index}
              className={slotClasses}
              onClick={() => hasContent && handleSlotActivation(barId, index)}
              style={{ cursor: hasContent ? 'pointer' : 'default' }}
            >
              {icon ? (
                <img
                  src={icon}
                  alt={displaySpell?.name || macro?.name || ''}
                  className={styles.actionIcon}
                  draggable={false}
                />
              ) : macro ? (
                <span className={styles.macroSlotIcon}>M</span>
              ) : (
                <span className={styles.emptySlot} />
              )}
              {/* Macro name overlay */}
              {macro && (
                <span className={styles.macroNameLabel}>{macro.name}</span>
              )}
              {/* Cooldown sweep overlay (takes priority over GCD) */}
              {showCooldown ? (
                <div
                  className={styles.gcdSweep}
                  style={{
                    background: `conic-gradient(from 0deg, transparent ${cooldownDegrees}deg, rgba(0,0,0,0.7) ${cooldownDegrees}deg)`,
                  }}
                />
              ) : showGcd && (
                <div
                  className={styles.gcdSweep}
                  style={{
                    background: `conic-gradient(from 0deg, transparent ${gcdDegrees}deg, rgba(0,0,0,0.7) ${gcdDegrees}deg)`,
                  }}
                />
              )}
              {keybind && (
                <span className={styles.keybindLabel}>{formatKey(keybind)}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.encounterScreen}>
      {/* Victory Overlay */}
      {encounterVictory && (
        <div className={styles.victoryOverlay}>
          <div className={styles.victoryModal}>
            <h1 className={styles.victoryTitle}>Victory!</h1>
            <p className={styles.victoryText}>{encounter.name} has been defeated!</p>
            <button className={styles.victoryButton} onClick={onExit}>
              Return to Menu
            </button>
          </div>
        </div>
      )}

      {/* Header with encounter info and exit button */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.exitButton} onClick={onExit}>
            Exit Encounter
          </button>
          <h1 className={styles.encounterName}>{encounter.name}</h1>
        </div>
        <div className={styles.headerCenter}>
          {!encounterActive && (
            <>
              <button
                className={styles.startButton}
                onClick={() => setEncounterActive(true)}
              >
                Start Encounter
              </button>
              <button
                className={styles.buffButton}
                onClick={() => {
                  // Set flag to restore mana to full after buffs are applied
                  restoreManaOnBuffRef.current = true;
                  setDraenicWisdomActive(true);
                  setHealingPowerActive(true);
                  setGoldenFishSticksActive(true);
                  setBrilliantManaOilActive(true);
                  setGreaterBlessingOfWisdomActive(true);
                  setPrayerOfFortitudeActive(true);
                  setArcaneBrillianceActive(true);
                  setGiftOfTheWildActive(true);
                  setSpiritBuffActive(true);
                  setGreaterBlessingOfKingsActive(true);
                  // Find the player's slot index in the raid composition
                  const playerSlotIndex = raidComposition.slots.findIndex(slot => slot.specId === PLAYER_SPEC_ID);
                  // Calculate which group the player is in (0-4 = group 0, 5-9 = group 1, etc.)
                  const playerGroupIndex = Math.floor(playerSlotIndex / 5);
                  const groupStart = playerGroupIndex * 5;
                  const groupEnd = groupStart + 5;
                  // Get the player's party (5 slots in their group)
                  const playerParty = raidComposition.slots.slice(groupStart, groupEnd);
                  // Mana Spring Totem only applies if there's a Shaman in the player's party
                  const hasShamanInParty = playerParty.some(slot => {
                    const spec = getSpec(slot.specId);
                    return spec?.class === 'shaman';
                  });
                  if (hasShamanInParty) {
                    setManaSpringTotemActive(true);
                  }
                  // Wrath of Air Totem only applies if there's a Resto or Elemental Shaman in the player's party
                  const hasRestoOrEleShaman = playerParty.some(slot => {
                    return slot.specId === 'shaman-restoration' || slot.specId === 'shaman-elemental';
                  });
                  if (hasRestoOrEleShaman) {
                    setWrathOfAirTotemActive(true);
                  }
                }}
              >
                Buff me!
              </button>
            </>
          )}
        </div>
        <div className={styles.headerRight}>
          {/* Reserved for future header controls */}
        </div>
      </div>

      {/* Buff Bar - top right corner */}
      <div className={styles.buffBar}>
        {draenicWisdomActive && (
          <div className={styles.buffIconWithTooltip}>
            <img
              src="/icons/draenic-wisdom.jpg"
              alt="Elixir of Draenic Wisdom"
              className={styles.buffImage}
            />
            <img
              src="/tooltips/draenic-wisdom.png"
              alt="Elixir of Draenic Wisdom tooltip"
              className={styles.buffTooltip}
            />
          </div>
        )}
        {healingPowerActive && (
          <div className={styles.buffIconWithTooltip}>
            <img
              src="/icons/healing-power.jpg"
              alt="Elixir of Healing Power"
              className={styles.buffImage}
            />
            <img
              src="/tooltips/healing-power.png"
              alt="Elixir of Healing Power tooltip"
              className={styles.buffTooltip}
            />
          </div>
        )}
        {goldenFishSticksActive && (
          <div className={styles.buffIconWithTooltip}>
            <img
              src="/icons/fish-sticks.jpg"
              alt="Golden Fish Sticks"
              className={styles.buffImage}
            />
            <img
              src="/tooltips/fish-sticks.png"
              alt="Golden Fish Sticks tooltip"
              className={styles.buffTooltip}
            />
          </div>
        )}
        {brilliantManaOilActive && (
          <div className={styles.buffIconWithTooltip}>
            <img
              src="/icons/mana-oil.jpg"
              alt="Brilliant Mana Oil"
              className={styles.buffImage}
            />
            <img
              src="/tooltips/mana-oil.png"
              alt="Brilliant Mana Oil tooltip"
              className={styles.buffTooltip}
            />
          </div>
        )}
        {greaterBlessingOfWisdomActive && (
          <div className={styles.buffIconWithTooltip}>
            <img
              src="/icons/wisdom.jpg"
              alt="Greater Blessing of Wisdom"
              className={styles.buffImage}
            />
            <img
              src="/tooltips/wisdom.png"
              alt="Greater Blessing of Wisdom tooltip"
              className={styles.buffTooltip}
            />
          </div>
        )}
        {prayerOfFortitudeActive && (
          <div className={styles.buffIconWithTooltip}>
            <img
              src="/icons/fortitude.jpg"
              alt="Prayer of Fortitude"
              className={styles.buffImage}
            />
            <img
              src="/tooltips/fortitude.png"
              alt="Prayer of Fortitude tooltip"
              className={styles.buffTooltip}
            />
          </div>
        )}
        {arcaneBrillianceActive && (
          <div className={styles.buffIconWithTooltip}>
            <img
              src="/icons/brilliance.jpg"
              alt="Arcane Brilliance"
              className={styles.buffImage}
            />
            <img
              src="/tooltips/brilliance.png"
              alt="Arcane Brilliance tooltip"
              className={styles.buffTooltip}
            />
          </div>
        )}
        {giftOfTheWildActive && (
          <div className={styles.buffIconWithTooltip}>
            <img
              src="/icons/gift.jpg"
              alt="Gift of the Wild"
              className={styles.buffImage}
            />
            <img
              src="/tooltips/gift.png"
              alt="Gift of the Wild tooltip"
              className={styles.buffTooltip}
            />
          </div>
        )}
        {spiritBuffActive && (
          <div className={styles.buffIconWithTooltip}>
            <img
              src="/icons/spirit.jpg"
              alt="Spirit"
              className={styles.buffImage}
            />
            <img
              src="/tooltips/spirit.png"
              alt="Spirit tooltip"
              className={styles.buffTooltip}
            />
          </div>
        )}
        {greaterBlessingOfKingsActive && (
          <div className={styles.buffIconWithTooltip}>
            <img
              src="/icons/kings.jpg"
              alt="Greater Blessing of Kings"
              className={styles.buffImage}
            />
            <img
              src="/tooltips/kings.png"
              alt="Greater Blessing of Kings tooltip"
              className={styles.buffTooltip}
            />
          </div>
        )}
        {manaSpringTotemActive && (
          <div className={styles.buffIconWithTooltip}>
            <img
              src="/icons/mana-spring.jpg"
              alt="Mana Spring Totem"
              className={styles.buffImage}
            />
            <img
              src="/tooltips/mana-spring.png"
              alt="Mana Spring Totem tooltip"
              className={styles.buffTooltip}
            />
          </div>
        )}
        {wrathOfAirTotemActive && (
          <div className={styles.buffIconWithTooltip}>
            <img
              src="/icons/wrath.jpg"
              alt="Wrath of Air Totem"
              className={styles.buffImage}
            />
            <img
              src="/tooltips/wrath.png"
              alt="Wrath of Air Totem tooltip"
              className={styles.buffTooltip}
            />
          </div>
        )}
        {treeOfLifeActive && (
          <div className={styles.buffIcon}>
            <img
              src="/icons/tree-of-life.jpg"
              alt="Tree of Life"
              className={styles.buffImage}
            />
          </div>
        )}
        {innervateRemaining > 0 && (
          <div className={styles.buffIcon}>
            <img
              src="/icons/innervate.jpg"
              alt="Innervate"
              className={styles.buffImage}
            />
            <span className={styles.buffTimer}>
              {Math.ceil(innervateRemaining)}
            </span>
          </div>
        )}
      </div>

      {/* Boss Frames - one per boss */}
      <div className={styles.bossSection}>
        {bosses.map((boss, index) => (
          <div key={index} className={styles.bossFrame}>
            <div className={styles.bossName}>{boss.name}</div>
            <div className={styles.bossHealthBar}>
              <div
                className={styles.bossHealthFill}
                style={{
                  width: `${getHealthPercent(boss.currentHealth, boss.maxHealth)}%`,
                }}
              />
              <span
                className={styles.bossHealthText}
                style={{
                  fontSize: bosses.length > 1 ? '0.7rem' : '0.85rem',
                }}
              >
                {Math.floor(boss.currentHealth).toLocaleString()} / {boss.maxHealth.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Boss Circles - one per boss, positioned on page */}
      {bosses.map((_, index) => (
        <div
          key={index}
          className={styles.bossCircle}
          style={{
            left: `calc(50% + ${(index - (bosses.length - 1) / 2) * 100}px)`,
          }}
        />
      ))}

      {/* Chain Heal Visual Lines */}
      {chainHealVisuals.length > 0 && (
        <svg className={styles.chainHealSvg} style={{ overflow: 'visible' }}>
          {chainHealVisuals.map((visual) => {
            const age = Date.now() - visual.timestamp;
            const opacity = Math.max(0, 1 - age / CHAIN_HEAL_VISUAL_DURATION);

            // Get center X position (50% of viewport)
            const centerX = window.innerWidth / 2;
            const baseY = 280;

            // Helper to get member position
            const getMemberPosition = (memberId: string): { x: number; y: number } | null => {
              const member = raidMembers.find(m => m.id === memberId);
              if (!member) return null;

              const memberWithSpec = member as RaidMember & { specId?: string };
              const spec = memberWithSpec.specId ? getSpec(memberWithSpec.specId) : null;
              const isMelee = spec ? isMeleeSpec(spec.id) : false;
              const isPlayer = memberWithSpec.specId === PLAYER_SPEC_ID;

              const meleeMembers = raidMembers.filter((m) => {
                const s = (m as RaidMember & { specId?: string }).specId;
                return s && isMeleeSpec(s);
              });
              const rangedMembers = raidMembers.filter((m) => {
                const s = (m as RaidMember & { specId?: string }).specId;
                return s && !isMeleeSpec(s);
              });

              let angle: number;
              let radius: number;
              let bossOffset = 0;

              // Check if this member is a tank assigned to a boss
              const tankIndex = bossTargetIds.indexOf(member.id);
              const isTank = tankIndex !== -1;

              // Calculate boss positions (same formula as boss circles)
              const getBossXOffset = (bossIndex: number) => {
                return (bossIndex - (bosses.length - 1) / 2) * 100;
              };

              if (isTank) {
                angle = -Math.PI / 2;
                radius = 50;
                bossOffset = getBossXOffset(tankIndex);
              } else if (isMelee) {
                const nonTankMelee = meleeMembers.filter(m => !bossTargetIds.includes(m.id));
                const meleeIndex = nonTankMelee.findIndex(m => m.id === member.id);
                const meleeCount = nonTankMelee.length;

                const bossCount = bosses.length;
                const meleePerBoss = Math.ceil(meleeCount / bossCount);
                const assignedBoss = Math.min(Math.floor(meleeIndex / meleePerBoss), bossCount - 1);
                const indexWithinBossGroup = meleeIndex % meleePerBoss;
                const countInThisBossGroup = assignedBoss < bossCount - 1
                  ? meleePerBoss
                  : meleeCount - (meleePerBoss * (bossCount - 1));

                angle = Math.PI * 0.2 + (Math.PI * 0.6) * (indexWithinBossGroup / Math.max(1, countInThisBossGroup - 1));
                radius = 50;
                bossOffset = getBossXOffset(assignedBoss);
              } else {
                const rangedIndex = rangedMembers.findIndex(m => m.id === member.id);
                const rangedCount = rangedMembers.length;
                const baseAngle = Math.PI * 0.1 + (Math.PI * 0.8) * (rangedIndex / Math.max(1, rangedCount - 1));
                const angleOffset = Math.sin(rangedIndex * 7.3) * 0.3;
                const radiusOffset = Math.cos(rangedIndex * 5.1) * 40;
                angle = baseAngle + angleOffset;
                radius = 200 + radiusOffset;
              }

              const x = isPlayer ? playerPosition.x : Math.cos(angle) * radius + bossOffset;
              const y = isPlayer ? playerPosition.y : Math.sin(angle) * radius;

              // Return absolute screen coordinates
              return { x: centerX + x, y: baseY + y };
            };

            // Get positions for source and all targets
            const sourcePos = getMemberPosition(visual.sourceId);
            const targetPositions = visual.targetIds.map(id => ({
              id,
              pos: getMemberPosition(id),
            })).filter(t => t.pos !== null);

            if (!sourcePos || targetPositions.length === 0) return null;

            // Draw lines: source -> target1 -> target2 -> target3
            const lines: React.ReactElement[] = [];

            // First line: source (shaman) to first target
            const firstTarget = targetPositions[0];
            if (firstTarget.pos) {
              lines.push(
                <line
                  key={`${visual.id}-source`}
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={firstTarget.pos.x}
                  y2={firstTarget.pos.y}
                  className={styles.chainHealLine}
                  style={{ opacity }}
                />
              );
            }

            // Chain lines between targets
            for (let i = 0; i < targetPositions.length - 1; i++) {
              const from = targetPositions[i];
              const to = targetPositions[i + 1];
              if (from.pos && to.pos) {
                lines.push(
                  <line
                    key={`${visual.id}-chain-${i}`}
                    x1={from.pos.x}
                    y1={from.pos.y}
                    x2={to.pos.x}
                    y2={to.pos.y}
                    className={styles.chainHealLine}
                    style={{ opacity }}
                  />
                );
              }
            }

            return <g key={visual.id}>{lines}</g>;
          })}
        </svg>
      )}

      {/* Floating Combat Text */}
      {floatingText.map((ft) => {
        // Find the member to get their position
        const member = raidMembers.find(m => m.id === ft.targetId);
        if (!member) return null;

        const spec = (member as RaidMember & { specId?: string }).specId
          ? getSpec((member as RaidMember & { specId?: string }).specId!)
          : null;
        const isMelee = spec ? isMeleeSpec(spec.id) : false;
        const isPlayer = (member as RaidMember & { specId?: string }).specId === PLAYER_SPEC_ID;

        // Recalculate position (same logic as player circles)
        const meleeMembers = raidMembers.filter((m) => {
          const s = (m as RaidMember & { specId?: string }).specId;
          return s && isMeleeSpec(s);
        });
        const rangedMembers = raidMembers.filter((m) => {
          const s = (m as RaidMember & { specId?: string }).specId;
          return s && !isMeleeSpec(s);
        });

        let angle: number;
        let radius: number;
        let bossOffset = 0;

        // Check if this member is a tank assigned to a boss
        const tankIndex = bossTargetIds.indexOf(member.id);
        const isTank = tankIndex !== -1;

        // Calculate boss positions (same formula as boss circles)
        const getBossXOffset = (bossIndex: number) => {
          return (bossIndex - (bosses.length - 1) / 2) * 100;
        };

        if (isTank) {
          angle = -Math.PI / 2;
          radius = 50;
          bossOffset = getBossXOffset(tankIndex);
        } else if (isMelee) {
          const nonTankMelee = meleeMembers.filter(m => !bossTargetIds.includes(m.id));
          const meleeIndex = nonTankMelee.findIndex(m => m.id === member.id);
          const meleeCount = nonTankMelee.length;

          const bossCount = bosses.length;
          const meleePerBoss = Math.ceil(meleeCount / bossCount);
          const assignedBoss = Math.min(Math.floor(meleeIndex / meleePerBoss), bossCount - 1);
          const indexWithinBossGroup = meleeIndex % meleePerBoss;
          const countInThisBossGroup = assignedBoss < bossCount - 1
            ? meleePerBoss
            : meleeCount - (meleePerBoss * (bossCount - 1));

          angle = Math.PI * 0.2 + (Math.PI * 0.6) * (indexWithinBossGroup / Math.max(1, countInThisBossGroup - 1));
          radius = 50;
          bossOffset = getBossXOffset(assignedBoss);
        } else {
          const rangedIndex = rangedMembers.findIndex(m => m.id === member.id);
          const rangedCount = rangedMembers.length;
          const baseAngle = Math.PI * 0.1 + (Math.PI * 0.8) * (rangedIndex / Math.max(1, rangedCount - 1));
          const angleOffset = (Math.sin(rangedIndex * 7.3) * 0.3);
          const radiusOffset = (Math.cos(rangedIndex * 5.1) * 40);
          angle = baseAngle + angleOffset;
          radius = 200 + radiusOffset;
        }

        // For player, use playerPosition instead of calculated position
        const x = isPlayer ? playerPosition.x : Math.cos(angle) * radius + bossOffset;
        const y = isPlayer ? playerPosition.y : Math.sin(angle) * radius;

        const age = Date.now() - ft.timestamp;
        const floatOffset = (age / 2000) * 30; // Float up 30px over 2 seconds

        return (
          <div
            key={ft.id}
            className={styles.floatingHealText}
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(280px + ${y}px - 20px - ${floatOffset}px)`,
              opacity: 1 - (age / 2000),
            }}
          >
            +{ft.amount}
          </div>
        );
      })}

      {/* Player Circles - positioned around the page */}
      {raidMembers.map((member) => {
        const spec = (member as RaidMember & { specId?: string }).specId
          ? getSpec((member as RaidMember & { specId?: string }).specId!)
          : null;
        const classColor = spec ? CLASS_INFO[spec.class]?.color : '#888';
        const isMelee = spec ? isMeleeSpec(spec.id) : false;
        const isPlayer = (member as RaidMember & { specId?: string }).specId === PLAYER_SPEC_ID;

        // Calculate position based on melee/ranged
        const meleeMembers = raidMembers.filter((m) => {
          const s = (m as RaidMember & { specId?: string }).specId;
          return s && isMeleeSpec(s);
        });
        const rangedMembers = raidMembers.filter((m) => {
          const s = (m as RaidMember & { specId?: string }).specId;
          return s && !isMeleeSpec(s);
        });

        let angle: number;
        let radius: number;
        let bossOffset = 0; // X offset to position around specific boss

        // Check if this member is a tank assigned to a boss
        const tankIndex = bossTargetIds.indexOf(member.id);
        const isTank = tankIndex !== -1;

        // Calculate boss positions (same formula as boss circles)
        const getBossXOffset = (bossIndex: number) => {
          return (bossIndex - (bosses.length - 1) / 2) * 100;
        };

        if (isTank) {
          // Tank positioned above their assigned boss
          angle = -Math.PI / 2; // Straight up
          radius = 50;
          bossOffset = getBossXOffset(tankIndex);
        } else if (isMelee) {
          // Filter out tanks from melee positioning
          const nonTankMelee = meleeMembers.filter(m => !bossTargetIds.includes(m.id));
          const meleeIndex = nonTankMelee.findIndex(m => m.id === member.id);
          const meleeCount = nonTankMelee.length;

          // Split melee between bosses (first half -> boss 0, second half -> boss 1)
          const bossCount = bosses.length;
          const meleePerBoss = Math.ceil(meleeCount / bossCount);
          const assignedBoss = Math.min(Math.floor(meleeIndex / meleePerBoss), bossCount - 1);
          const indexWithinBossGroup = meleeIndex % meleePerBoss;
          const countInThisBossGroup = assignedBoss < bossCount - 1
            ? meleePerBoss
            : meleeCount - (meleePerBoss * (bossCount - 1));

          // Spread melee in a semicircle below their assigned boss
          angle = Math.PI * 0.2 + (Math.PI * 0.6) * (indexWithinBossGroup / Math.max(1, countInThisBossGroup - 1));
          radius = 50;
          bossOffset = getBossXOffset(assignedBoss);
        } else {
          const rangedIndex = rangedMembers.findIndex(m => m.id === member.id);
          const rangedCount = rangedMembers.length;
          // Spread ranged with randomized positions (centered between bosses)
          // Use index-based pseudo-random offsets for stability
          const baseAngle = Math.PI * 0.1 + (Math.PI * 0.8) * (rangedIndex / Math.max(1, rangedCount - 1));
          const angleOffset = (Math.sin(rangedIndex * 7.3) * 0.3); // ±0.3 radians variation
          const radiusOffset = (Math.cos(rangedIndex * 5.1) * 40); // ±40px variation
          angle = baseAngle + angleOffset;
          radius = 200 + radiusOffset;
        }

        // Convert polar to cartesian - boss is at top center of page
        // For player, use playerPosition instead of calculated position
        // Add bossOffset for melee/tanks to position around their specific boss
        const x = isPlayer ? playerPosition.x : Math.cos(angle) * radius + bossOffset;
        const y = isPlayer ? playerPosition.y : Math.sin(angle) * radius;

        // Check if this is a Resto Shaman with an active cast
        const memberSpecId = (member as RaidMember & { specId?: string }).specId;
        const isRestoShaman = memberSpecId === 'shaman-restoration';
        const npcHealer = isRestoShaman
          ? npcHealersRef.current.find(h => h.id === member.id)
          : null;
        const isNpcCasting = npcHealer?.currentCast != null;

        return (
          <div
            key={member.id}
            className={`${styles.playerCircle} ${targetId === member.id ? styles.targetedCircle : ''} ${isPlayer ? styles.playerSelfCircle : ''}`}
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(280px + ${y}px)`,
              backgroundColor: classColor,
            }}
            onClick={() => setTargetId(member.id)}
            title={member.name}
          >
            {/* NPC Healer Cast Bar */}
            {isNpcCasting && npcHealer && npcHealer.currentCast?.chainHealResult && (
              <div className={styles.npcCastBarContainer}>
                <span className={styles.npcCastBarText}>Chain Heal</span>
                <div className={styles.npcCastBar}>
                  <div
                    className={styles.npcCastBarFill}
                    style={{
                      width: `${((npcHealer.currentCast.chainHealResult.castTime - npcHealer.castTimeRemaining) / npcHealer.currentCast.chainHealResult.castTime) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Raid Grid - 5x5 grid of player squares */}
      <div className={styles.raidGrid}>
        {raidMembers.map(member => (
          <RaidSquare
            key={member.id}
            member={member}
            isTargeted={targetId === member.id}
            hasAggro={encounterActive && bossTargetIds.includes(member.id)}
            onClick={() => setTargetId(member.id)}
          />
        ))}
      </div>

      {/* Player Mana Bar */}
      {combatStats && (
        <div className={styles.manaBarContainer}>
          <div className={styles.manaBar}>
            <div
              className={styles.manaBarFill}
              style={{
                width: `${(currentMana / combatStats.maxMana) * 100}%`,
              }}
            />
            <span className={styles.manaBarText}>
              {Math.floor(currentMana)} / {combatStats.maxMana}
            </span>
          </div>
        </div>
      )}

      {/* Cast Bar */}
      {casting && (
        <div className={styles.castBarContainer}>
          <div className={styles.castBar}>
            <div
              className={styles.castBarFill}
              style={{
                width: `${((casting.totalCastTime - casting.castTime) / casting.totalCastTime) * 100}%`,
              }}
            />
            <span className={styles.castBarText}>{casting.spellName}</span>
          </div>
        </div>
      )}

      {/* Action Bars */}
      <div className={styles.actionBarLayout}>
        {/* Right side vertical bars */}
        <div className={styles.rightBars}>
          {renderActionBar('right2')}
          {renderActionBar('right1')}
        </div>

        {/* Bottom bars */}
        <div className={styles.bottomBars}>
          <div className={styles.secondaryBars}>
            {renderActionBar('bottomLeft')}
            {renderActionBar('bottomRight')}
          </div>
          <div className={styles.mainBar}>
            {renderActionBar('main')}
          </div>
        </div>
      </div>
    </div>
  );
}

interface RaidSquareProps {
  member: RaidMember & { specId?: string };
  isTargeted: boolean;
  hasAggro: boolean;
  onClick: () => void;
}

function RaidSquare({ member, isTargeted, hasAggro, onClick }: RaidSquareProps) {
  const healthPercent = Math.max(0, Math.min(100, (member.currentHealth / member.maxHealth) * 100));
  const spec = member.specId ? getSpec(member.specId) : null;
  const classColor = spec ? CLASS_INFO[spec.class]?.color : '#888';
  const isPlayer = member.specId === PLAYER_SPEC_ID;

  const getHealthColor = (percent: number) => {
    if (percent > 50) return '#2ecc71';
    if (percent > 25) return '#f1c40f';
    return '#e74c3c';
  };

  const classNames = [
    styles.raidSquare,
    member.isDead ? styles.dead : '',
    isTargeted ? styles.targeted : '',
    isPlayer ? styles.playerSquare : '',
  ].filter(Boolean).join(' ');

  // Find HoTs if present
  const lifebloomHot = member.hots.find(hot => hot.spellId === 'lifebloom');
  const rejuvHot = member.hots.find(hot => hot.spellId === 'rejuvenation');
  const regrowthHot = member.hots.find(hot => hot.spellId === 'regrowth');

  return (
    <div
      className={classNames}
      style={{
        '--health-percent': `${healthPercent}%`,
        '--health-color': getHealthColor(healthPercent),
        '--class-color': classColor,
      } as React.CSSProperties}
      title={`${member.name} - ${member.currentHealth}/${member.maxHealth}`}
      onClick={onClick}
    >
      {/* HoT Overlays */}
      {lifebloomHot && (
        <HoTOverlay
          hot={lifebloomHot}
          maxDuration={7}
        />
      )}
      {/* Rejuvenation indicator */}
      {rejuvHot && (
        <div className={styles.rejuvIndicator} />
      )}
      {/* Regrowth indicator */}
      {regrowthHot && (
        <div className={styles.regrowthIndicator} />
      )}
      {/* Aggro indicator */}
      {hasAggro && (
        <div className={styles.aggroIndicator} />
      )}
    </div>
  );
}

interface HoTOverlayProps {
  hot: ActiveHoT;
  maxDuration: number;
}

function HoTOverlay({ hot, maxDuration }: HoTOverlayProps) {
  const spell = getSpell(hot.spellId);
  if (!spell) return null;

  // Calculate the sweep progress (0 = full, 1 = empty)
  const progress = 1 - (hot.remainingDuration / maxDuration);
  // Convert to degrees for conic-gradient (clockwise from top)
  const degrees = progress * 360;

  return (
    <div className={styles.hotOverlay}>
      <img
        src={spell.icon}
        alt={spell.name}
        className={styles.hotIcon}
        draggable={false}
      />
      {/* Clockwise sweep fade overlay */}
      <div
        className={styles.hotSweep}
        style={{
          background: `conic-gradient(from 0deg, rgba(0,0,0,0.7) ${degrees}deg, transparent ${degrees}deg)`,
        }}
      />
      {/* Stack count for Lifebloom */}
      {hot.stacks > 1 && (
        <span className={styles.hotStacks}>{hot.stacks}</span>
      )}
    </div>
  );
}
