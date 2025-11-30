import { useState, useCallback } from 'react';
import {
  loadSaveData,
  setSelectedGearset as persistGearset,
  setActionBars as persistActionBars,
  setKeybindings as persistKeybindings,
  setActionBarSlot as persistActionBarSlot,
  setKeybinding as persistKeybinding,
  setRaidComposition as persistRaidComposition,
  setMacros as persistMacros,
} from '../storage/persistence';
import type {
  SaveData,
  ActionBarsConfig,
  ActionBarId,
  KeybindConfig,
  KeybindTarget,
  RaidComposition,
  Macro,
} from '../types';

// Hook to manage save data with React state
export function useSaveData() {
  const [saveData, setSaveData] = useState<SaveData>(loadSaveData);

  // Reload from storage (useful if storage changes externally)
  const reload = useCallback(() => {
    setSaveData(loadSaveData());
  }, []);

  // Update and persist gearset selection
  const setSelectedGearset = useCallback((gearsetId: string) => {
    persistGearset(gearsetId);
    setSaveData(prev => ({ ...prev, selectedGearset: gearsetId }));
  }, []);

  // Update and persist all action bars
  const setActionBars = useCallback((actionBars: ActionBarsConfig) => {
    persistActionBars(actionBars);
    setSaveData(prev => ({ ...prev, actionBars }));
  }, []);

  // Update and persist keybindings
  const setKeybindings = useCallback((keybindings: KeybindConfig) => {
    persistKeybindings(keybindings);
    setSaveData(prev => ({ ...prev, keybindings }));
  }, []);

  // Update a single action bar slot
  const setActionBarSlot = useCallback((
    barId: ActionBarId,
    slotIndex: number,
    spellId: string | null
  ) => {
    persistActionBarSlot(barId, slotIndex, spellId);
    setSaveData(prev => {
      const newBars = { ...prev.actionBars.bars };
      const newSlots = [...newBars[barId].slots];
      newSlots[slotIndex] = spellId;
      newBars[barId] = { slots: newSlots };
      return { ...prev, actionBars: { bars: newBars } };
    });
  }, []);

  // Update a single keybinding
  const setKeybinding = useCallback((key: string, target: KeybindTarget) => {
    persistKeybinding(key, target);
    setSaveData(prev => ({
      ...prev,
      keybindings: {
        bindings: { ...prev.keybindings.bindings, [key]: target },
      },
    }));
  }, []);

  // Update raid composition
  const setRaidComposition = useCallback((composition: RaidComposition) => {
    persistRaidComposition(composition);
    setSaveData(prev => ({ ...prev, raidComposition: composition }));
  }, []);

  // Update macros
  const setMacros = useCallback((macros: Macro[]) => {
    persistMacros(macros);
    setSaveData(prev => ({ ...prev, macros }));
  }, []);

  return {
    saveData,
    reload,
    setSelectedGearset,
    setActionBars,
    setKeybindings,
    setActionBarSlot,
    setKeybinding,
    setRaidComposition,
    setMacros,
  };
}

// Simpler hook for just reading save data
export function useReadOnlySaveData(): SaveData {
  const [saveData] = useState<SaveData>(loadSaveData);
  return saveData;
}
