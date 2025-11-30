import { useState } from 'react';
import type { RaidComposition as RaidCompositionType, ClassSpec, WowClass } from '../../types';
import { CLASS_SPECS, CLASS_INFO, RAID_PRESETS, PLAYER_SPEC_ID, getSpec } from '../../data';
import styles from '../../styles/shared.module.css';
import raidStyles from './RaidComposition.module.css';

interface RaidCompositionProps {
  composition: RaidCompositionType;
  onUpdate: (composition: RaidCompositionType) => void;
  onBack: () => void;
}

export function RaidComposition({ composition, onUpdate, onBack }: RaidCompositionProps) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [filterRole, setFilterRole] = useState<'all' | 'tank' | 'healer' | 'dps'>('all');
  const [dragSource, setDragSource] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [namingSlot, setNamingSlot] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState('');

  // Count roles in current composition
  const roleCounts = composition.slots.reduce(
    (acc, slot) => {
      const spec = getSpec(slot.specId);
      if (spec) {
        acc[spec.role]++;
      }
      return acc;
    },
    { tank: 0, healer: 0, dps: 0 }
  );

  const handleSlotClick = (index: number) => {
    // Can't change the player's spec
    if (composition.slots[index].specId === PLAYER_SPEC_ID) return;
    setSelectedSlot(index);
  };

  const handleSpecSelect = (specId: string) => {
    if (selectedSlot === null) return;

    const newSlots = [...composition.slots];
    newSlots[selectedSlot] = { specId };
    onUpdate({ ...composition, name: 'Custom', slots: newSlots });
    setSelectedSlot(null);
  };

  const handleClear = () => {
    // Clear all slots except player (slot 0)
    const newSlots = composition.slots.map((slot, index) =>
      index === 0 ? slot : { specId: '' }
    );
    onUpdate({ name: 'Empty', slots: newSlots });
  };

  const handleLoadDefault = () => {
    // Load the balanced preset
    const balanced = RAID_PRESETS.find(p => p.id === 'balanced');
    if (balanced) {
      onUpdate(balanced.composition);
    }
  };

  // Export composition to JSON file
  const handleExport = () => {
    const exportData = {
      version: 1,
      raidComposition: composition,
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'raid-composition.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import composition from JSON file
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
          if (data.raidComposition && Array.isArray(data.raidComposition.slots)) {
            onUpdate(data.raidComposition);
          } else {
            alert('Invalid raid composition file.');
          }
        } catch (err) {
          console.error('Failed to import composition:', err);
          alert('Failed to import composition. Invalid file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Drag and drop handlers
  const handleDragStart = (index: number, event: React.DragEvent) => {
    setDragSource(index);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number, event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOver !== index) {
      setDragOver(index);
    }
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragSource(null);
    setDragOver(null);
  };

  const handleDrop = (targetIndex: number, event: React.DragEvent) => {
    event.preventDefault();
    if (dragSource === null) {
      setDragSource(null);
      setDragOver(null);
      return;
    }

    // Don't do anything if dropping on same slot
    if (dragSource === targetIndex) {
      setDragSource(null);
      setDragOver(null);
      return;
    }

    // Swap the slots
    const newSlots = [...composition.slots];
    const temp = newSlots[dragSource];
    newSlots[dragSource] = newSlots[targetIndex];
    newSlots[targetIndex] = temp;

    onUpdate({ ...composition, name: 'Custom', slots: newSlots });
    setDragSource(null);
    setDragOver(null);
  };

  // Right-click to open name editing
  const handleSlotRightClick = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    setNamingSlot(index);
    setNameInput(composition.slots[index].name || '');
  };

  // Save the player name
  const handleNameSave = () => {
    if (namingSlot === null) return;

    const newSlots = [...composition.slots];
    newSlots[namingSlot] = {
      ...newSlots[namingSlot],
      name: nameInput.trim() || undefined,
    };
    onUpdate({ ...composition, slots: newSlots });
    setNamingSlot(null);
    setNameInput('');
  };

  // Clear the player name
  const handleNameClear = () => {
    if (namingSlot === null) return;

    const newSlots = [...composition.slots];
    newSlots[namingSlot] = {
      ...newSlots[namingSlot],
      name: undefined,
    };
    onUpdate({ ...composition, slots: newSlots });
    setNamingSlot(null);
    setNameInput('');
  };

  const filteredSpecs = filterRole === 'all'
    ? CLASS_SPECS
    : CLASS_SPECS.filter(s => s.role === filterRole);

  // Group specs by class for display
  const specsByClass = filteredSpecs.reduce((acc, spec) => {
    if (!acc[spec.class]) {
      acc[spec.class] = [];
    }
    acc[spec.class].push(spec);
    return acc;
  }, {} as Record<WowClass, ClassSpec[]>);

  return (
    <div className={styles.screen}>
      <button className={styles.backButton} onClick={onBack}>
        &larr; Back
      </button>

      <h1 className={styles.title}>Raid Composition</h1>
      <p className={styles.subtitle}>
        Click a slot to change its class and specialization
      </p>

      {/* Role Summary */}
      <div className={raidStyles.roleSummary}>
        <span className={raidStyles.roleCount} style={{ color: '#3498db' }}>
          Tanks: {roleCounts.tank}
        </span>
        <span className={raidStyles.roleCount} style={{ color: '#2ecc71' }}>
          Healers: {roleCounts.healer}
        </span>
        <span className={raidStyles.roleCount} style={{ color: '#e74c3c' }}>
          DPS: {roleCounts.dps}
        </span>
      </div>

      {/* Actions */}
      <div className={raidStyles.actions}>
        <button
          className={raidStyles.actionButton}
          onClick={handleClear}
        >
          Clear
        </button>
        <button
          className={raidStyles.actionButton}
          onClick={handleLoadDefault}
        >
          Default
        </button>
        <span className={raidStyles.divider}>|</span>
        <button
          className={raidStyles.importExportButton}
          onClick={handleImport}
        >
          Import
        </button>
        <button
          className={raidStyles.importExportButton}
          onClick={handleExport}
        >
          Export
        </button>
      </div>

      {/* Raid Grid - 5 groups of 5 */}
      <div className={raidStyles.raidContainer}>
        {[0, 1, 2, 3, 4].map(groupIndex => (
          <div key={groupIndex} className={raidStyles.raidGroup}>
            <div className={raidStyles.groupLabel}>Group {groupIndex + 1}</div>
            <div className={raidStyles.groupSlots}>
              {composition.slots.slice(groupIndex * 5, groupIndex * 5 + 5).map((slot, slotInGroup) => {
                const index = groupIndex * 5 + slotInGroup;
                const spec = getSpec(slot.specId);
                const isPlayer = slot.specId === PLAYER_SPEC_ID;
                const isSelected = selectedSlot === index;
                const isDragging = dragSource === index;
                const isDragOver = dragOver === index;
                const classInfo = spec ? CLASS_INFO[spec.class] : null;

                const slotClasses = [
                  raidStyles.slot,
                  isPlayer ? raidStyles.playerSlot : '',
                  isSelected ? raidStyles.selectedSlot : '',
                  !spec ? raidStyles.emptySlot : '',
                  isDragging ? raidStyles.dragging : '',
                  isDragOver ? raidStyles.dragOver : '',
                ].filter(Boolean).join(' ');

                return (
                  <div
                    key={index}
                    className={slotClasses}
                    style={{
                      borderColor: classInfo?.color || '#3d3d5c',
                    }}
                    onClick={() => handleSlotClick(index)}
                    onContextMenu={(e) => handleSlotRightClick(index, e)}
                    title={isPlayer ? 'You (Restoration Druid)' : spec ? `${spec.name} ${classInfo?.name || ''}` : 'Empty'}
                    draggable
                    onDragStart={(e) => handleDragStart(index, e)}
                    onDragOver={(e) => handleDragOver(index, e)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(index, e)}
                  >
                    <div className={raidStyles.slotIndex}>{index + 1}</div>
                    {slot.name && (
                      <div className={raidStyles.slotName}>{slot.name}</div>
                    )}
                    <div
                      className={raidStyles.slotSpec}
                      style={{ color: classInfo?.color }}
                    >
                      {spec?.name || '-'}
                    </div>
                    <div className={raidStyles.slotClass}>
                      {classInfo?.name || ''}
                    </div>
                    {isPlayer && <div className={raidStyles.playerLabel}>YOU</div>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Spec Selection Modal */}
      {selectedSlot !== null && (
        <div className={raidStyles.modalOverlay} onClick={() => setSelectedSlot(null)}>
          <div className={raidStyles.modal} onClick={e => e.stopPropagation()}>
            <h3>Select Specialization for Slot {selectedSlot + 1}</h3>

            {/* Role Filter */}
            <div className={raidStyles.roleFilter}>
              <button
                className={`${raidStyles.filterButton} ${filterRole === 'all' ? raidStyles.activeFilter : ''}`}
                onClick={() => setFilterRole('all')}
              >
                All
              </button>
              <button
                className={`${raidStyles.filterButton} ${filterRole === 'tank' ? raidStyles.activeFilter : ''}`}
                onClick={() => setFilterRole('tank')}
                style={{ borderColor: '#3498db' }}
              >
                Tanks
              </button>
              <button
                className={`${raidStyles.filterButton} ${filterRole === 'healer' ? raidStyles.activeFilter : ''}`}
                onClick={() => setFilterRole('healer')}
                style={{ borderColor: '#2ecc71' }}
              >
                Healers
              </button>
              <button
                className={`${raidStyles.filterButton} ${filterRole === 'dps' ? raidStyles.activeFilter : ''}`}
                onClick={() => setFilterRole('dps')}
                style={{ borderColor: '#e74c3c' }}
              >
                DPS
              </button>
            </div>

            {/* Specs by Class */}
            <div className={raidStyles.specList}>
              {Object.entries(specsByClass).map(([wowClass, specs]) => (
                <div key={wowClass} className={raidStyles.classGroup}>
                  <div
                    className={raidStyles.className}
                    style={{ color: CLASS_INFO[wowClass as WowClass].color }}
                  >
                    {CLASS_INFO[wowClass as WowClass].name}
                  </div>
                  <div className={raidStyles.classSpecs}>
                    {specs.map(spec => (
                      <button
                        key={spec.id}
                        className={raidStyles.specButton}
                        onClick={() => handleSpecSelect(spec.id)}
                        disabled={spec.id === PLAYER_SPEC_ID}
                      >
                        <span className={raidStyles.specName}>{spec.name}</span>
                        <span className={raidStyles.specRole}>({spec.role})</span>
                      </button>
                    ))}
                  </div>
                </div>
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

      {/* Name Editing Modal */}
      {namingSlot !== null && (
        <div className={raidStyles.modalOverlay} onClick={() => setNamingSlot(null)}>
          <div className={raidStyles.nameModal} onClick={e => e.stopPropagation()}>
            <h3>Set Player Name</h3>
            <p className={raidStyles.nameSlotInfo}>
              Slot {namingSlot + 1}: {getSpec(composition.slots[namingSlot].specId)?.name || 'Empty'}
            </p>
            <input
              type="text"
              className={raidStyles.nameInput}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSave();
                if (e.key === 'Escape') setNamingSlot(null);
              }}
              placeholder="Enter player name..."
              autoFocus
              maxLength={12}
            />
            <div className={raidStyles.nameModalButtons}>
              <button
                className={raidStyles.nameButton}
                onClick={handleNameSave}
              >
                Save
              </button>
              <button
                className={raidStyles.nameClearButton}
                onClick={handleNameClear}
              >
                Clear
              </button>
              <button
                className={styles.backButton}
                onClick={() => setNamingSlot(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
