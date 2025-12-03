import { useState } from 'react';
import { getTrainingEncounters, getBossEncounters } from '../../data';
import type { Encounter } from '../../types';
import styles from '../../styles/shared.module.css';
import encounterStyles from './EncounterSelect.module.css';

// Mechanic with icon and description
interface MechanicInfo {
  icon: string;
  description: string;
}

// Mechanics info for encounters that have detailed mechanics
const ENCOUNTER_MECHANICS: Record<string, { title: string; mechanics: MechanicInfo[] }> = {
  brutallus: {
    title: 'Brutallus Mechanics',
    mechanics: [
      {
        icon: '/icons/glaive.jpg',
        description: 'Brutallus performs a main-hand and off-hand attack simultaneously every 1.1-1.3 seconds, dealing 2,275-9,685 and 1,277-4,717 damage, respectively. A mitigation check is performed separately for both attacks.',
      },
      {
        icon: '/icons/meteor-slash.jpg',
        description: 'Meteor Slash occurs every 10 seconds, targeted on the player with aggro. Tanks will swap when a soak group reaches 3 stacks.',
      },
      {
        icon: '/icons/burn.jpg',
        description: 'Burn occurs every 20 seconds. Initially does 100 damage per second, doubling every 10 seconds. Lasts 60 seconds. Paladin NPCs can remove 1 Burn per fight via Divine Shield. Mages can remove 2 Burns per fight via Ice Block and Cold Snap + Ice Block. Burn targets will automatically move out of the Meteor Slash area, and move back in after burn. Burn does NOT spread upon player contact.',
      },
      {
        icon: '/icons/stomp.jpg',
        description: 'Stomp occurs every 30 seconds. Increases damage taken by 30%, lasts 10 seconds. Stomp will remove Burn on the target.',
      },
    ],
  },
};

interface EncounterSelectProps {
  onSelect: (encounterId: string) => void;
  onBack: () => void;
}

export function EncounterSelect({ onSelect, onBack }: EncounterSelectProps) {
  const [hoveredEncounter, setHoveredEncounter] = useState<string | null>(null);
  const trainingEncounters = getTrainingEncounters();
  const bossEncounters = getBossEncounters();

  const mechanicsInfo = hoveredEncounter ? ENCOUNTER_MECHANICS[hoveredEncounter] : null;

  return (
    <div className={styles.screen}>
      <button className={styles.backButton} onClick={onBack}>
        &larr; Back
      </button>

      <h1 className={styles.title}>Select Encounter</h1>
      <p className={styles.subtitle}>Choose a boss encounter to practice</p>

      <div className={encounterStyles.mainContainer}>
        <div className={encounterStyles.columnsContainer}>
          <div className={encounterStyles.column}>
            <h2 className={encounterStyles.columnHeader}>Training Dummies</h2>
            <div className={encounterStyles.encounterList}>
              {trainingEncounters.map((encounter) => (
                <EncounterCard
                  key={encounter.id}
                  encounter={encounter}
                  onSelect={() => onSelect(encounter.id)}
                  onHover={() => setHoveredEncounter(encounter.id)}
                  onLeave={() => setHoveredEncounter(null)}
                />
              ))}
            </div>
          </div>

          <div className={encounterStyles.column}>
            <h2 className={encounterStyles.columnHeader}>Sunwell Plateau</h2>
            <div className={encounterStyles.encounterList}>
              {bossEncounters.map((encounter) => (
                <EncounterCard
                  key={encounter.id}
                  encounter={encounter}
                  onSelect={() => onSelect(encounter.id)}
                  onHover={() => setHoveredEncounter(encounter.id)}
                  onLeave={() => setHoveredEncounter(null)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className={encounterStyles.mechanicsPanel}>
          {mechanicsInfo ? (
            <>
              <h2 className={encounterStyles.mechanicsTitle}>{mechanicsInfo.title}</h2>
              <ul className={encounterStyles.mechanicsList}>
                {mechanicsInfo.mechanics.map((mechanic, index) => (
                  <li key={index} className={encounterStyles.mechanicItem}>
                    <img
                      src={mechanic.icon}
                      alt=""
                      className={encounterStyles.mechanicIcon}
                    />
                    <span>{mechanic.description}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={encounterStyles.mechanicsPlaceholder}>
              Hover over an encounter to see its mechanics
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface EncounterCardProps {
  encounter: Encounter;
  onSelect: () => void;
  onHover: () => void;
  onLeave: () => void;
}

function EncounterCard({ encounter, onSelect, onHover, onLeave }: EncounterCardProps) {
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

  const isDisabled = encounter.disabled ?? false;

  return (
    <button
      className={`${styles.card} ${isDisabled ? encounterStyles.disabled : ''}`}
      onClick={isDisabled ? undefined : onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      disabled={isDisabled}
      style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', textAlign: 'left' }}
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
