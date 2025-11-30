import { useState, useEffect } from 'react';
import type { KeybindConfig as KeybindConfigType, ActionBarId } from '../../types';
import { ACTION_BARS } from '../../types';
import styles from '../../styles/shared.module.css';
import keybindStyles from './KeybindConfig.module.css';

interface KeybindConfigProps {
  keybindings: KeybindConfigType;
  onUpdate: (keybindings: KeybindConfigType) => void;
  onBack: () => void;
}

interface ListeningTarget {
  barId: ActionBarId;
  slotIndex: number;
}

export function KeybindConfig({ keybindings, onUpdate, onBack }: KeybindConfigProps) {
  const [selectedBarId, setSelectedBarId] = useState<ActionBarId>('main');
  const [listeningTarget, setListeningTarget] = useState<ListeningTarget | null>(null);

  const currentBarInfo = ACTION_BARS.find(b => b.id === selectedBarId)!;

  // Listen for key presses when binding
  useEffect(() => {
    if (listeningTarget === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();

      const key = event.key.toLowerCase();

      // Ignore modifier keys alone
      if (['shift', 'control', 'alt', 'meta'].includes(key)) {
        return;
      }

      const newBindings = { ...keybindings.bindings };

      // Remove any existing binding for this key
      delete newBindings[key];

      // Remove old binding for this bar+slot
      for (const [existingKey, target] of Object.entries(newBindings)) {
        if (target.barId === listeningTarget.barId && target.slotIndex === listeningTarget.slotIndex) {
          delete newBindings[existingKey];
        }
      }

      // Add new binding
      newBindings[key] = {
        barId: listeningTarget.barId,
        slotIndex: listeningTarget.slotIndex,
      };

      onUpdate({ bindings: newBindings });
      setListeningTarget(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningTarget, keybindings, onUpdate]);

  // Get the key bound to a bar+slot
  const getKeyForSlot = (barId: ActionBarId, slotIndex: number): string | null => {
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
      ' ': 'Space',
      'arrowup': 'Up',
      'arrowdown': 'Down',
      'arrowleft': 'Left',
      'arrowright': 'Right',
    };
    return specialKeys[key] || key.toUpperCase();
  };

  const clearBinding = (barId: ActionBarId, slotIndex: number) => {
    const newBindings = { ...keybindings.bindings };
    for (const [key, target] of Object.entries(newBindings)) {
      if (target.barId === barId && target.slotIndex === slotIndex) {
        delete newBindings[key];
      }
    }
    onUpdate({ bindings: newBindings });
  };

  const isListening = (barId: ActionBarId, slotIndex: number) => {
    return listeningTarget?.barId === barId && listeningTarget?.slotIndex === slotIndex;
  };

  return (
    <div className={styles.screen}>
      <button className={styles.backButton} onClick={onBack}>
        &larr; Back
      </button>

      <h1 className={styles.title}>Keybindings</h1>
      <p className={styles.subtitle}>Select a bar, then click a slot and press a key</p>

      {/* Bar Tabs */}
      <div className={keybindStyles.barTabs}>
        {ACTION_BARS.map((bar) => (
          <button
            key={bar.id}
            className={`${keybindStyles.barTab} ${selectedBarId === bar.id ? keybindStyles.activeTab : ''}`}
            onClick={() => {
              setSelectedBarId(bar.id);
              setListeningTarget(null);
            }}
          >
            {bar.shortName}
          </button>
        ))}
      </div>

      {/* Bar Info */}
      <div className={keybindStyles.barInfo}>
        <span className={keybindStyles.barName}>{currentBarInfo.name}</span>
      </div>

      <div className={keybindStyles.slotGrid}>
        {Array.from({ length: 12 }, (_, index) => {
          const boundKey = getKeyForSlot(selectedBarId, index);
          const listening = isListening(selectedBarId, index);

          return (
            <div key={index} className={keybindStyles.slotRow}>
              <span className={keybindStyles.slotLabel}>Slot {index + 1}</span>

              <button
                className={`${keybindStyles.keyButton} ${listening ? keybindStyles.listening : ''}`}
                onClick={() => setListeningTarget({ barId: selectedBarId, slotIndex: index })}
              >
                {listening ? (
                  'Press a key...'
                ) : boundKey ? (
                  formatKey(boundKey)
                ) : (
                  'Unbound'
                )}
              </button>

              {boundKey && (
                <button
                  className={keybindStyles.clearButton}
                  onClick={() => clearBinding(selectedBarId, index)}
                >
                  Clear
                </button>
              )}
            </div>
          );
        })}
      </div>

      {listeningTarget !== null && (
        <button
          className={styles.backButton}
          onClick={() => setListeningTarget(null)}
          style={{ marginTop: '1rem' }}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
