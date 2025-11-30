import { useState } from 'react';
import { MainMenu } from './components/screens/MainMenu';
import { GearsetSelect } from './components/screens/GearsetSelect';
import { ActionBarConfig } from './components/screens/ActionBarConfig';
import { EncounterSelect } from './components/screens/EncounterSelect';
import { Encounter } from './components/screens/Encounter';
import { RaidComposition } from './components/screens/RaidComposition';
import { useSaveData } from './hooks/useStorage';
import styles from './App.module.css';

// Application screens
export type Screen =
  | 'main-menu'
  | 'gearset-select'
  | 'talent-tree'
  | 'action-bar-config'
  | 'raid-composition'
  | 'encounter-select'
  | 'encounter';

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('main-menu');
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);
  const [talentPoints, setTalentPoints] = useState(0);
  const [talentHovered, setTalentHovered] = useState(false);
  const [furorPoints, setFurorPoints] = useState(0);
  const [furorHovered, setFurorHovered] = useState(false);
  const saveDataHook = useSaveData();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'main-menu':
        return <MainMenu onNavigate={setCurrentScreen} />;
      case 'gearset-select':
        return (
          <GearsetSelect
            selectedGearset={saveDataHook.saveData.selectedGearset}
            onSelect={saveDataHook.setSelectedGearset}
            onBack={() => setCurrentScreen('main-menu')}
          />
        );
      case 'talent-tree':
        // TODO: Implement TalentTree component
        return (
          <div style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
          }}>
            <h1 style={{
              position: 'absolute',
              top: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
              margin: 0,
            }}>Talent Tree</h1>
            <button
              onClick={() => setCurrentScreen('main-menu')}
              style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
              }}
            >Back</button>
            <div style={{
              position: 'relative',
              backgroundImage: 'url(/assets/talent-art.png)',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              width: '1024px',
              height: '576px',
            }}>
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '800px',
                  cursor: 'pointer',
                }}
                onClick={() => setTalentPoints(p => Math.min(p + 1, 5))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setTalentPoints(p => Math.max(p - 1, 0));
                }}
                onMouseEnter={() => setTalentHovered(true)}
                onMouseLeave={() => setTalentHovered(false)}
              >
                <img
                  src="/icons/talents/mark.jpg"
                  alt="Mark of the Wild"
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '1px solid green',
                    display: 'block',
                  }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '-5px',
                  right: '-5px',
                  backgroundColor: 'black',
                  color: 'green',
                  fontSize: '12px',
                  padding: '0 2px',
                }}>{talentPoints}/5</span>
                {talentHovered && (
                  <img
                    src={`/tooltips/talents/improved_mark_${talentPoints}.png`}
                    alt="Improved Mark of the Wild tooltip"
                    style={{
                      position: 'absolute',
                      top: '50px',
                      left: '0',
                      pointerEvents: 'none',
                      transform: 'scale(0.75)',
                      transformOrigin: 'top left',
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '875px',
                  cursor: 'pointer',
                }}
                onClick={() => setFurorPoints(p => Math.min(p + 1, 5))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setFurorPoints(p => Math.max(p - 1, 0));
                }}
                onMouseEnter={() => setFurorHovered(true)}
                onMouseLeave={() => setFurorHovered(false)}
              >
                <img
                  src="/icons/talents/furor.jpg"
                  alt="Furor"
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '1px solid green',
                    display: 'block',
                  }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '-5px',
                  right: '-5px',
                  backgroundColor: 'black',
                  color: 'green',
                  fontSize: '12px',
                  padding: '0 2px',
                }}>{furorPoints}/5</span>
                {furorHovered && (
                  <img
                    src={`/tooltips/talents/furor_${furorPoints}.png`}
                    alt="Furor tooltip"
                    style={{
                      position: 'absolute',
                      top: '50px',
                      left: '0',
                      pointerEvents: 'none',
                      transform: 'scale(0.75)',
                      transformOrigin: 'top left',
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      case 'action-bar-config':
        return (
          <ActionBarConfig
            actionBars={saveDataHook.saveData.actionBars}
            keybindings={saveDataHook.saveData.keybindings}
            macros={saveDataHook.saveData.macros}
            onUpdateBars={saveDataHook.setActionBars}
            onUpdateKeybinds={saveDataHook.setKeybindings}
            onUpdateMacros={saveDataHook.setMacros}
            onBack={() => setCurrentScreen('main-menu')}
          />
        );
      case 'raid-composition':
        return (
          <RaidComposition
            composition={saveDataHook.saveData.raidComposition}
            onUpdate={saveDataHook.setRaidComposition}
            onBack={() => setCurrentScreen('main-menu')}
          />
        );
      case 'encounter-select':
        return (
          <EncounterSelect
            onSelect={(encounterId) => {
              setSelectedEncounterId(encounterId);
              setCurrentScreen('encounter');
            }}
            onBack={() => setCurrentScreen('main-menu')}
          />
        );
      case 'encounter':
        if (!selectedEncounterId) {
          setCurrentScreen('encounter-select');
          return null;
        }
        return (
          <Encounter
            encounterId={selectedEncounterId}
            gearsetId={saveDataHook.saveData.selectedGearset}
            actionBars={saveDataHook.saveData.actionBars}
            keybindings={saveDataHook.saveData.keybindings}
            raidComposition={saveDataHook.saveData.raidComposition}
            macros={saveDataHook.saveData.macros}
            onExit={() => {
              setSelectedEncounterId(null);
              setCurrentScreen('main-menu');
            }}
          />
        );
      default:
        return <MainMenu onNavigate={setCurrentScreen} />;
    }
  };

  return (
    <div className={styles.app}>
      {renderScreen()}
    </div>
  );
}

export default App;
