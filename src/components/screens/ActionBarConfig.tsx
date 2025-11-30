import { useState, useEffect } from 'react';
import type { ActionBarsConfig, ActionBarId, KeybindConfig, Macro } from '../../types';
import { ACTION_BARS } from '../../types';
import { getAllSpells, getSpell, getSpellByName } from '../../data';
import { SpellTooltip } from '../ui/SpellTooltip';
import styles from '../../styles/shared.module.css';
import actionBarStyles from './ActionBarConfig.module.css';

interface ActionBarConfigProps {
  actionBars: ActionBarsConfig;
  keybindings: KeybindConfig;
  macros: Macro[];
  onUpdateBars: (actionBars: ActionBarsConfig) => void;
  onUpdateKeybinds: (keybindings: KeybindConfig) => void;
  onUpdateMacros: (macros: Macro[]) => void;
  onBack: () => void;
}

// Parse #showtooltip from macro body and return the spell if found
function parseMacroShowtooltip(body: string) {
  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    if (trimmed.startsWith('#showtooltip')) {
      // Extract spell name after #showtooltip
      const spellName = line.trim().substring('#showtooltip'.length).trim();
      if (spellName) {
        return getSpellByName(spellName);
      }
    }
  }
  return undefined;
}

interface SlotLocation {
  barId: ActionBarId;
  slotIndex: number;
}

type EditMode = 'spell' | 'keybind';

export function ActionBarConfig({
  actionBars,
  keybindings,
  macros,
  onUpdateBars,
  onUpdateKeybinds,
  onUpdateMacros,
  onBack,
}: ActionBarConfigProps) {
  const [selectedSlot, setSelectedSlot] = useState<SlotLocation | null>(null);
  const [editMode, setEditMode] = useState<EditMode>('spell');
  const [dragSource, setDragSource] = useState<SlotLocation | null>(null);
  const [dragOver, setDragOver] = useState<SlotLocation | null>(null);
  const [pressedSlots, setPressedSlots] = useState<Set<string>>(new Set());
  const [showMacroModal, setShowMacroModal] = useState(false);
  const [editingMacro, setEditingMacro] = useState<Macro | null>(null);
  const [macroName, setMacroName] = useState('');
  const [macroBody, setMacroBody] = useState('');
  const [draggingMacro, setDraggingMacro] = useState<Macro | null>(null);
  const allSpells = getAllSpells();

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

  // Helper to create a unique key for a slot
  const slotKey = (barId: ActionBarId, slotIndex: number) => `${barId}-${slotIndex}`;

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
    const specialKeys: Record<string, string> = {
      ' ': 'Spc',
      'arrowup': '↑',
      'arrowdown': '↓',
      'arrowleft': '←',
      'arrowright': '→',
    };

    // Handle modifier combinations (e.g., "shift+1", "ctrl+r")
    const parts = key.split('+');
    const formattedParts = parts.map(part => {
      if (part === 'shift') return 'S';
      if (part === 'ctrl') return 'C';
      if (part === 'alt') return 'A';
      return specialKeys[part] || part.toUpperCase();
    });

    return formattedParts.join('+');
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

  // Listen for keybind when in keybind mode
  useEffect(() => {
    if (selectedSlot === null || editMode !== 'keybind') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();

      // Escape cancels (without modifiers)
      if (event.key.toLowerCase() === 'escape' && !event.shiftKey && !event.ctrlKey && !event.altKey) {
        setSelectedSlot(null);
        return;
      }

      const keyString = buildKeyString(event);

      // Ignore if just a modifier key
      if (keyString === null) {
        return;
      }

      const newBindings = { ...keybindings.bindings };

      // Remove any existing binding for this key combo
      delete newBindings[keyString];

      // Remove old binding for this bar+slot
      for (const [existingKey, target] of Object.entries(newBindings)) {
        if (target.barId === selectedSlot.barId && target.slotIndex === selectedSlot.slotIndex) {
          delete newBindings[existingKey];
        }
      }

      // Add new binding
      newBindings[keyString] = {
        barId: selectedSlot.barId,
        slotIndex: selectedSlot.slotIndex,
      };

      onUpdateKeybinds({ bindings: newBindings });
      setSelectedSlot(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSlot, editMode, keybindings, onUpdateKeybinds]);

  // Listen for keybind presses to highlight slots (when not editing)
  useEffect(() => {
    // Don't trigger highlights when editing keybinds
    if (selectedSlot !== null && editMode === 'keybind') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const keyString = buildKeyString(event);
      if (!keyString) return;

      // Check if this key is bound to a slot
      const binding = keybindings.bindings[keyString];
      if (!binding) return;

      const key = slotKey(binding.barId, binding.slotIndex);

      // Add to pressed slots
      setPressedSlots(prev => new Set(prev).add(key));

      // Remove after 100ms
      setTimeout(() => {
        setPressedSlots(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 100);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSlot, editMode, keybindings]);

  const handleSlotClick = (barId: ActionBarId, slotIndex: number, event: React.MouseEvent) => {
    event.preventDefault();

    if (event.button === 2 || event.shiftKey) {
      // Right-click or shift+click: edit keybind
      setEditMode('keybind');
      setSelectedSlot({ barId, slotIndex });
    } else {
      // Left-click: edit spell
      setEditMode('spell');
      setSelectedSlot({ barId, slotIndex });
    }
  };

  const handleSpellSelect = (spellId: string | null) => {
    if (selectedSlot === null) return;

    const newBars = { ...actionBars.bars };
    const newSlots = [...newBars[selectedSlot.barId].slots];
    newSlots[selectedSlot.slotIndex] = spellId;
    newBars[selectedSlot.barId] = { slots: newSlots };

    onUpdateBars({ bars: newBars });
    setSelectedSlot(null);
  };

  const handleClearKeybind = () => {
    if (selectedSlot === null) return;

    const newBindings = { ...keybindings.bindings };
    for (const [key, target] of Object.entries(newBindings)) {
      if (target.barId === selectedSlot.barId && target.slotIndex === selectedSlot.slotIndex) {
        delete newBindings[key];
      }
    }
    onUpdateKeybinds({ bindings: newBindings });
    setSelectedSlot(null);
  };

  // Drag and drop handlers
  const handleDragStart = (barId: ActionBarId, slotIndex: number, event: React.DragEvent) => {
    const spellId = actionBars.bars[barId].slots[slotIndex];
    if (!spellId) {
      event.preventDefault();
      return;
    }
    setDragSource({ barId, slotIndex });
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (barId: ActionBarId, slotIndex: number, event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = draggingMacro ? 'copy' : 'move';

    // Update dragOver state for visual feedback
    if (!dragOver || dragOver.barId !== barId || dragOver.slotIndex !== slotIndex) {
      setDragOver({ barId, slotIndex });
    }
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragSource(null);
    setDragOver(null);
    setDraggingMacro(null);
  };

  const handleDrop = (targetBarId: ActionBarId, targetSlotIndex: number, event: React.DragEvent) => {
    event.preventDefault();

    // Handle macro drop
    if (draggingMacro) {
      const newBars = { ...actionBars.bars };
      const newSlots = [...newBars[targetBarId].slots];
      newSlots[targetSlotIndex] = `macro:${draggingMacro.id}`;
      newBars[targetBarId] = { slots: newSlots };
      onUpdateBars({ bars: newBars });
      setDraggingMacro(null);
      setDragOver(null);
      setShowMacroModal(false); // Close modal after successful drop
      return;
    }

    if (!dragSource) return;

    // Don't do anything if dropping on the same slot
    if (dragSource.barId === targetBarId && dragSource.slotIndex === targetSlotIndex) {
      setDragSource(null);
      setDragOver(null);
      return;
    }

    const newBars = { ...actionBars.bars };

    // Get the spells from both slots
    const sourceSpellId = newBars[dragSource.barId].slots[dragSource.slotIndex];
    const targetSpellId = newBars[targetBarId].slots[targetSlotIndex];

    // Swap the spells
    const newSourceSlots = [...newBars[dragSource.barId].slots];
    const newTargetSlots = dragSource.barId === targetBarId
      ? newSourceSlots
      : [...newBars[targetBarId].slots];

    newSourceSlots[dragSource.slotIndex] = targetSpellId;
    newTargetSlots[targetSlotIndex] = sourceSpellId;

    newBars[dragSource.barId] = { slots: newSourceSlots };
    if (dragSource.barId !== targetBarId) {
      newBars[targetBarId] = { slots: newTargetSlots };
    }

    onUpdateBars({ bars: newBars });
    setDragSource(null);
    setDragOver(null);
  };

  // Macro handling functions
  const handleNewMacro = () => {
    setEditingMacro(null);
    setMacroName('');
    setMacroBody('');
  };

  const handleEditMacro = (macro: Macro) => {
    setEditingMacro(macro);
    setMacroName(macro.name);
    setMacroBody(macro.body);
  };

  const handleSaveMacro = () => {
    if (!macroName.trim()) return;

    if (editingMacro) {
      // Update existing macro
      const updatedMacros = macros.map(m =>
        m.id === editingMacro.id
          ? { ...m, name: macroName.trim(), body: macroBody }
          : m
      );
      onUpdateMacros(updatedMacros);
    } else {
      // Create new macro
      const newMacro: Macro = {
        id: `macro-${Date.now()}`,
        name: macroName.trim(),
        body: macroBody,
      };
      onUpdateMacros([...macros, newMacro]);
    }

    setEditingMacro(null);
    setMacroName('');
    setMacroBody('');
  };

  const handleDeleteMacro = (macroId: string) => {
    onUpdateMacros(macros.filter(m => m.id !== macroId));
    if (editingMacro?.id === macroId) {
      setEditingMacro(null);
      setMacroName('');
      setMacroBody('');
    }
  };

  const handleCloseMacroModal = () => {
    setShowMacroModal(false);
    setEditingMacro(null);
    setMacroName('');
    setMacroBody('');
  };

  // Macro drag handlers
  const handleMacroDragStart = (macro: Macro, event: React.DragEvent) => {
    setDraggingMacro(macro);
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', `macro:${macro.id}`);
  };

  const handleMacroDragEnd = () => {
    setDraggingMacro(null);
  };

  const renderActionBar = (barId: ActionBarId) => {
    const bar = actionBars.bars[barId];
    const barInfo = ACTION_BARS.find(b => b.id === barId)!;
    const isVertical = barInfo.orientation === 'vertical';

    return (
      <div
        className={`${actionBarStyles.bar} ${isVertical ? actionBarStyles.verticalBar : actionBarStyles.horizontalBar}`}
        title={barInfo.name}
      >
        <div className={actionBarStyles.barLabel}>{barInfo.shortName}</div>
        <div className={`${actionBarStyles.slots} ${isVertical ? actionBarStyles.verticalSlots : ''}`}>
          {bar.slots.map((slotContent, index) => {
            // Determine if slot contains a spell or macro
            const isMacro = isMacroSlot(slotContent);
            const macroId = getMacroIdFromSlot(slotContent);
            const macro = macroId ? getMacroById(macroId) : null;
            const macroSpell = macro ? parseMacroShowtooltip(macro.body) : null;
            const spell = !isMacro && slotContent ? getSpell(slotContent) : null;

            // Get icon and name for display
            const icon = spell?.icon || macroSpell?.icon;
            const name = spell?.name || macro?.name || '';
            const hasContent = spell || macro;

            const keybind = getKeybindForSlot(barId, index);
            const isSelected = selectedSlot?.barId === barId && selectedSlot?.slotIndex === index;
            const isDragging = dragSource?.barId === barId && dragSource?.slotIndex === index;
            const isDragOver = dragOver?.barId === barId && dragOver?.slotIndex === index;
            const isPressed = pressedSlots.has(slotKey(barId, index));

            const slotClasses = [
              actionBarStyles.slot,
              isSelected ? actionBarStyles.selectedSlot : '',
              isDragging ? actionBarStyles.dragging : '',
              isDragOver ? actionBarStyles.dragOver : '',
              isPressed ? actionBarStyles.pressed : '',
            ].filter(Boolean).join(' ');

            const slotButton = (
              <button
                className={slotClasses}
                onClick={(e) => handleSlotClick(barId, index, e)}
                onContextMenu={(e) => handleSlotClick(barId, index, e)}
                draggable={!!hasContent}
                onDragStart={(e) => handleDragStart(barId, index, e)}
                onDragOver={(e) => handleDragOver(barId, index, e)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(barId, index, e)}
              >
                <span className={actionBarStyles.slotNumber}>{index + 1}</span>
                {icon ? (
                  <img
                    src={icon}
                    alt={name}
                    className={actionBarStyles.spellIcon}
                    draggable={false}
                  />
                ) : macro ? (
                  <span className={actionBarStyles.macroSlotIcon}>M</span>
                ) : (
                  <span className={actionBarStyles.emptySlot}>-</span>
                )}
                {macro && (
                  <span className={actionBarStyles.macroNameLabel}>
                    {macro.name}
                  </span>
                )}
                {keybind && (
                  <span className={actionBarStyles.keybindLabel}>
                    {formatKey(keybind)}
                  </span>
                )}
              </button>
            );

            if (spell) {
              return (
                <SpellTooltip key={index} spell={spell}>
                  {slotButton}
                </SpellTooltip>
              );
            }

            // For macros with a #showtooltip spell, show that spell's tooltip
            if (macro && macroSpell) {
              return (
                <SpellTooltip key={index} spell={macroSpell}>
                  {slotButton}
                </SpellTooltip>
              );
            }

            return <div key={index}>{slotButton}</div>;
          })}
        </div>
      </div>
    );
  };

  const selectedBarInfo = selectedSlot
    ? ACTION_BARS.find(b => b.id === selectedSlot.barId)
    : null;

  // Export settings to JSON file
  const handleExport = () => {
    const exportData = {
      version: 1,
      actionBars,
      keybindings,
      macros,
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'action-bar-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import settings from JSON file
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.actionBars) {
            onUpdateBars(data.actionBars);
          }
          if (data.keybindings) {
            onUpdateKeybinds(data.keybindings);
          }
          if (data.macros) {
            onUpdateMacros(data.macros);
          }
        } catch (err) {
          console.error('Failed to import settings:', err);
          alert('Failed to import settings. Invalid file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Export macros only to JSON file
  const handleExportMacros = () => {
    const exportData = {
      version: 1,
      macros,
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'macros.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import macros only from JSON file
  const handleImportMacros = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.macros && Array.isArray(data.macros)) {
            onUpdateMacros(data.macros);
          } else {
            alert('No macros found in file.');
          }
        } catch (err) {
          console.error('Failed to import macros:', err);
          alert('Failed to import macros. Invalid file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className={styles.screen}>
      <button className={styles.backButton} onClick={onBack}>
        &larr; Back
      </button>

      <h1 className={styles.title}>Action Bars</h1>
      <p className={styles.subtitle}>
        Left-click: assign spell | Right-click or Shift+click: set keybind
      </p>

      <div className={actionBarStyles.importExportButtons}>
        <button className={actionBarStyles.importExportButton} onClick={handleImport}>
          Import
        </button>
        <button className={actionBarStyles.importExportButton} onClick={handleExport}>
          Export
        </button>
        <span className={actionBarStyles.buttonDivider}>|</span>
        <button className={actionBarStyles.macroButton} onClick={() => setShowMacroModal(true)}>
          Macros
        </button>
      </div>

      {/* WoW-style action bar layout */}
      <div className={actionBarStyles.actionBarLayout}>
        {/* Right side vertical bars */}
        <div className={actionBarStyles.rightBars}>
          {renderActionBar('right2')}
          {renderActionBar('right1')}
        </div>

        {/* Bottom bars area */}
        <div className={actionBarStyles.bottomArea}>
          {/* Bottom Left and Bottom Right on same row */}
          <div className={actionBarStyles.secondaryBars}>
            {renderActionBar('bottomLeft')}
            {renderActionBar('bottomRight')}
          </div>

          {/* Main action bar at the very bottom */}
          <div className={actionBarStyles.mainBarContainer}>
            {renderActionBar('main')}
          </div>
        </div>
      </div>

      {/* Spell Selection Modal */}
      {selectedSlot !== null && editMode === 'spell' && (
        <div className={actionBarStyles.spellPickerOverlay} onClick={() => setSelectedSlot(null)}>
          <div className={actionBarStyles.spellPicker} onClick={(e) => e.stopPropagation()}>
            <h3>
              {selectedBarInfo?.shortName} - Slot {selectedSlot.slotIndex + 1}
            </h3>

            <div className={actionBarStyles.spellGrid}>
              <button
                className={actionBarStyles.spellOption}
                onClick={() => handleSpellSelect(null)}
              >
                <span className={actionBarStyles.spellOptionName}>Empty</span>
                <span className={actionBarStyles.spellOptionDesc}>Clear this slot</span>
              </button>

              {allSpells.map((spell) => (
                <SpellTooltip key={spell.id} spell={spell}>
                  <button
                    className={actionBarStyles.spellOption}
                    onClick={() => handleSpellSelect(spell.id)}
                  >
                    <img
                      src={spell.icon}
                      alt={spell.name}
                      className={actionBarStyles.spellOptionIcon}
                    />
                    <div className={actionBarStyles.spellOptionText}>
                      <span className={actionBarStyles.spellOptionName}>{spell.name}</span>
                      <span className={actionBarStyles.spellOptionDesc}>
                        {spell.castTime > 0 ? `${spell.castTime}s cast` : 'Instant'}
                        {spell.cooldown > 0 ? ` | ${spell.cooldown}s CD` : ''}
                      </span>
                    </div>
                  </button>
                </SpellTooltip>
              ))}
            </div>

            <button
              className={styles.backButton}
              onClick={() => setSelectedSlot(null)}
              style={{ marginTop: '1rem' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keybind Modal */}
      {selectedSlot !== null && editMode === 'keybind' && (
        <div className={actionBarStyles.spellPickerOverlay} onClick={() => setSelectedSlot(null)}>
          <div className={actionBarStyles.keybindModal} onClick={(e) => e.stopPropagation()}>
            <h3>
              Set Keybind: {selectedBarInfo?.shortName} - Slot {selectedSlot.slotIndex + 1}
            </h3>
            <p className={actionBarStyles.keybindPrompt}>
              Press any key to bind...
            </p>
            <p className={actionBarStyles.keybindCurrent}>
              Current: {getKeybindForSlot(selectedSlot.barId, selectedSlot.slotIndex)
                ? formatKey(getKeybindForSlot(selectedSlot.barId, selectedSlot.slotIndex)!)
                : 'None'}
            </p>
            <div className={actionBarStyles.keybindActions}>
              <button
                className={actionBarStyles.clearKeybindButton}
                onClick={handleClearKeybind}
              >
                Clear Keybind
              </button>
              <button
                className={styles.backButton}
                onClick={() => setSelectedSlot(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Macro Modal */}
      {showMacroModal && (
        <div
          className={`${actionBarStyles.spellPickerOverlay} ${draggingMacro ? actionBarStyles.overlayDragging : ''}`}
          onClick={handleCloseMacroModal}
        >
          <div className={actionBarStyles.macroModal} onClick={(e) => e.stopPropagation()}>
            <h3>Macros</h3>
            <p className={actionBarStyles.macroDescription}>
              Create macros to automate spell casting. Use <code>#showtooltip Spell Name</code> to set the icon.
            </p>

            <div className={actionBarStyles.macroContainer}>
              {/* Macro List */}
              <div className={actionBarStyles.macroList}>
                {macros.length === 0 ? (
                  <p className={actionBarStyles.macroEmpty}>No macros created yet.</p>
                ) : (
                  macros.map(macro => {
                    const spell = parseMacroShowtooltip(macro.body);
                    return (
                      <div
                        key={macro.id}
                        className={`${actionBarStyles.macroItem} ${editingMacro?.id === macro.id ? actionBarStyles.macroItemSelected : ''}`}
                        onClick={() => handleEditMacro(macro)}
                        draggable
                        onDragStart={(e) => handleMacroDragStart(macro, e)}
                        onDragEnd={handleMacroDragEnd}
                        title="Drag to action bar"
                      >
                        <div className={actionBarStyles.macroIcon}>
                          {spell?.icon ? (
                            <img src={spell.icon} alt={spell.name} draggable={false} />
                          ) : (
                            <span className={actionBarStyles.macroIconPlaceholder}>?</span>
                          )}
                        </div>
                        <span className={actionBarStyles.macroItemName}>{macro.name}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Macro Editor */}
              <div className={actionBarStyles.macroEditor}>
                <div className={actionBarStyles.macroEditorHeader}>
                  <input
                    type="text"
                    className={actionBarStyles.macroNameInput}
                    value={macroName}
                    onChange={(e) => setMacroName(e.target.value)}
                    placeholder="Macro name..."
                    maxLength={24}
                  />
                  {editingMacro && (
                    <button
                      className={actionBarStyles.macroDeleteButton}
                      onClick={() => handleDeleteMacro(editingMacro.id)}
                      title="Delete macro"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <textarea
                  className={actionBarStyles.macroBodyInput}
                  value={macroBody}
                  onChange={(e) => setMacroBody(e.target.value)}
                  placeholder="#showtooltip Lifebloom&#10;/cast Lifebloom"
                  rows={6}
                />
                <div className={actionBarStyles.macroEditorActions}>
                  <button
                    className={actionBarStyles.newMacroButton}
                    onClick={handleSaveMacro}
                    disabled={!macroName.trim()}
                  >
                    {editingMacro ? 'Save' : 'Create'}
                  </button>
                  {(editingMacro || macroName || macroBody) && (
                    <button
                      className={actionBarStyles.macroCancelButton}
                      onClick={handleNewMacro}
                    >
                      {editingMacro ? 'Cancel' : 'Clear'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className={actionBarStyles.macroActions}>
              <button
                className={actionBarStyles.importExportButton}
                onClick={handleImportMacros}
              >
                Import
              </button>
              <button
                className={actionBarStyles.importExportButton}
                onClick={handleExportMacros}
              >
                Export
              </button>
              <button
                className={styles.backButton}
                onClick={handleCloseMacroModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
