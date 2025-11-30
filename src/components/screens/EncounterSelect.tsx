import { getAllEncounters } from '../../data';
import type { Encounter } from '../../types';
import styles from '../../styles/shared.module.css';
import encounterStyles from './EncounterSelect.module.css';

interface EncounterSelectProps {
  onSelect: (encounterId: string) => void;
  onBack: () => void;
}

export function EncounterSelect({ onSelect, onBack }: EncounterSelectProps) {
  const encounters = getAllEncounters();

  return (
    <div className={styles.screen}>
      <button className={styles.backButton} onClick={onBack}>
        &larr; Back
      </button>

      <h1 className={styles.title}>Select Encounter</h1>
      <p className={styles.subtitle}>Choose a boss encounter to practice</p>

      <div className={styles.menuList}>
        {encounters.map((encounter) => (
          <EncounterCard
            key={encounter.id}
            encounter={encounter}
            onSelect={() => onSelect(encounter.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface EncounterCardProps {
  encounter: Encounter;
  onSelect: () => void;
}

function EncounterCard({ encounter, onSelect }: EncounterCardProps) {
  const getDifficultyColor = (difficulty: Encounter['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return '#2ecc71';
      case 'medium':
        return '#f1c40f';
      case 'hard':
        return '#e74c3c';
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  return (
    <button
      className={styles.card}
      onClick={onSelect}
      style={{ cursor: 'pointer', textAlign: 'left' }}
    >
      <div className={encounterStyles.cardHeader}>
        <h3 className={styles.cardTitle}>{encounter.name}</h3>
        <span
          className={encounterStyles.difficulty}
          style={{ color: getDifficultyColor(encounter.difficulty) }}
        >
          {encounter.difficulty}
        </span>
      </div>

      <p className={styles.cardDescription}>{encounter.description}</p>

      <div className={encounterStyles.cardFooter}>
        <span className={encounterStyles.duration}>
          Duration: {formatDuration(encounter.duration)}
        </span>
        <span className={encounterStyles.phases}>
          {encounter.phases.length} phase{encounter.phases.length !== 1 ? 's' : ''}
        </span>
      </div>
    </button>
  );
}
