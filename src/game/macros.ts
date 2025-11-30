import { getSpellByName } from '../data';
import type { Spell } from '../types';

// Parsed macro command types
export interface CastCommand {
  type: 'cast';
  spellId: string;
  spell: Spell;
  targetName?: string;  // If specified, cast on this player by name
}

export interface UnknownCommand {
  type: 'unknown';
  raw: string;
}

export type MacroCommand = CastCommand | UnknownCommand;

// Result of parsing a full macro
export interface ParsedMacro {
  showtooltipSpell?: Spell;  // Spell from #showtooltip
  commands: MacroCommand[];
}

/**
 * Parse a /cast command line
 * Supported formats:
 *   /cast Lifebloom
 *   /cast [target=PlayerName] Lifebloom
 *   /cast [@PlayerName] Lifebloom
 */
function parseCastCommand(line: string): MacroCommand | null {
  // Match /cast with optional conditions
  const castMatch = line.match(/^\/cast\s+(.+)$/i);
  if (!castMatch) return null;

  const args = castMatch[1].trim();

  let targetName: string | undefined;
  let spellName: string;

  // Check for [target=Name] or [@Name] syntax
  const targetMatch = args.match(/^\[(?:target=|@)([^\]]+)\]\s*(.+)$/i);
  if (targetMatch) {
    targetName = targetMatch[1].trim();
    spellName = targetMatch[2].trim();
  } else {
    spellName = args;
  }

  // Look up the spell
  const spell = getSpellByName(spellName);
  if (!spell) {
    return { type: 'unknown', raw: line };
  }

  return {
    type: 'cast',
    spellId: spell.id,
    spell,
    targetName,
  };
}

/**
 * Parse a full macro body into commands
 */
export function parseMacro(body: string): ParsedMacro {
  const lines = body.split('\n');
  const result: ParsedMacro = {
    commands: [],
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Handle #showtooltip
    if (trimmed.toLowerCase().startsWith('#showtooltip')) {
      const spellName = trimmed.substring('#showtooltip'.length).trim();
      if (spellName) {
        const spell = getSpellByName(spellName);
        if (spell) {
          result.showtooltipSpell = spell;
        }
      }
      continue;
    }

    // Handle /cast
    if (trimmed.toLowerCase().startsWith('/cast')) {
      const command = parseCastCommand(trimmed);
      if (command) {
        result.commands.push(command);
      }
      continue;
    }

    // Unknown command
    if (trimmed.startsWith('/')) {
      result.commands.push({ type: 'unknown', raw: trimmed });
    }
  }

  return result;
}

/**
 * Get the first cast command from a macro (for simple execution)
 */
export function getFirstCastCommand(body: string): CastCommand | null {
  const parsed = parseMacro(body);
  for (const cmd of parsed.commands) {
    if (cmd.type === 'cast') {
      return cmd;
    }
  }
  return null;
}

/**
 * Find a raid member index by name
 */
export function findRaidMemberByName(
  slots: Array<{ name?: string }>,
  targetName: string
): number {
  const lowerTarget = targetName.toLowerCase();
  return slots.findIndex(slot =>
    slot.name?.toLowerCase() === lowerTarget
  );
}
