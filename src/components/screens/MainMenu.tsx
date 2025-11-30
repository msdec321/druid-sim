import type { Screen } from '../../App';
import styles from '../../styles/shared.module.css';

interface MainMenuProps {
  onNavigate: (screen: Screen) => void;
}

export function MainMenu({ onNavigate }: MainMenuProps) {
  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>Tree Simulator</h1>
      <p className={styles.subtitle}>TBC Resto Druid Healing Practice</p>

      <div className={styles.menuList}>
        <button
          className={styles.menuButton}
          onClick={() => onNavigate('encounter-select')}
        >
          Start Encounter
        </button>

        <button
          className={styles.menuButton}
          onClick={() => onNavigate('gearset-select')}
        >
          Gearsets
        </button>

        <button
          className={styles.menuButton}
          onClick={() => onNavigate('talent-tree')}
        >
          Talent Tree
        </button>

        <button
          className={styles.menuButton}
          onClick={() => onNavigate('action-bar-config')}
        >
          Action Bars & Keybinds
        </button>

        <button
          className={styles.menuButton}
          onClick={() => onNavigate('raid-composition')}
        >
          Raid Composition
        </button>
      </div>
    </div>
  );
}
