import { getAllGearPresets } from '../../data';
import type { GearPreset } from '../../types';
import styles from '../../styles/shared.module.css';

interface GearsetSelectProps {
  selectedGearset: string;
  onSelect: (gearsetId: string) => void;
  onBack: () => void;
}

export function GearsetSelect({ selectedGearset, onSelect, onBack }: GearsetSelectProps) {
  const gearPresets = getAllGearPresets();

  return (
    <div className={styles.screen}>
      <button className={styles.backButton} onClick={onBack}>
        &larr; Back
      </button>

      <h1 className={styles.title}>Gearsets</h1>
      <p className={styles.subtitle}>Select your gear loadout</p>

      <div className={styles.menuList}>
        {gearPresets.map((preset) => (
          <GearsetCard
            key={preset.id}
            preset={preset}
            isSelected={preset.id === selectedGearset}
            onSelect={() => onSelect(preset.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface GearsetCardProps {
  preset: GearPreset;
  isSelected: boolean;
  onSelect: () => void;
}

function GearsetCard({ preset, isSelected, onSelect }: GearsetCardProps) {
  return (
    <button
      className={`${styles.card} ${isSelected ? styles.selected : ''}`}
      onClick={onSelect}
      style={{ cursor: 'pointer', textAlign: 'left' }}
    >
      <h3 className={styles.cardTitle}>{preset.name}</h3>
      <p className={styles.cardDescription}>{preset.description}</p>

      <div style={{ marginTop: '0.75rem' }}>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Bonus Healing</span>
          <span className={styles.statValue}>{preset.stats.spellPower}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>MP5</span>
          <span className={styles.statValue}>{preset.stats.mp5}</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Spell Crit</span>
          <span className={styles.statValue}>{preset.stats.spellCrit}%</span>
        </div>
        <div className={styles.statRow}>
          <span className={styles.statLabel}>Haste Rating</span>
          <span className={styles.statValue}>{preset.stats.hasteRating}</span>
        </div>
      </div>
    </button>
  );
}
