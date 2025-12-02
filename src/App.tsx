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
  const [naturalistPoints, setNaturalistPoints] = useState(0);
  const [naturalistHovered, setNaturalistHovered] = useState(false);
  const [naturesFocusPoints, setNaturesFocusPoints] = useState(0);
  const [naturesFocusHovered, setNaturesFocusHovered] = useState(false);
  const [naturalShapeshifterPoints, setNaturalShapeshifterPoints] = useState(0);
  const [naturalShapeshifterHovered, setNaturalShapeshifterHovered] = useState(false);
  const [intensityPoints, setIntensityPoints] = useState(0);
  const [intensityHovered, setIntensityHovered] = useState(false);
  const [subtletyPoints, setSubtletyPoints] = useState(0);
  const [subtletyHovered, setSubtletyHovered] = useState(false);
  const [omenPoints, setOmenPoints] = useState(0);
  const [omenHovered, setOmenHovered] = useState(false);
  const [tranquilSpiritPoints, setTranquilSpiritPoints] = useState(0);
  const [tranquilSpiritHovered, setTranquilSpiritHovered] = useState(false);
  const [improvedRejuvenationPoints, setImprovedRejuvenationPoints] = useState(0);
  const [improvedRejuvenationHovered, setImprovedRejuvenationHovered] = useState(false);
  const saveDataHook = useSaveData();

  // Calculate total points spent in the tree for prerequisite checks
  const row1Points = talentPoints + furorPoints;
  const row2Points = naturalistPoints + naturesFocusPoints + naturalShapeshifterPoints;
  const row3Points = intensityPoints + subtletyPoints + omenPoints;
  const row2Unlocked = row1Points >= 5;
  const row3Unlocked = row1Points + row2Points >= 10;
  const row4Unlocked = row1Points + row2Points + row3Points >= 15;

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
            }}>Talent Tree (Under Construction)</h1>
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
                      zIndex: 100,
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
                      zIndex: 100,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '70px',
                  left: '730px',
                  cursor: row2Unlocked ? 'pointer' : 'not-allowed',
                  opacity: row2Unlocked ? 1 : 0.5,
                  zIndex: naturalistHovered ? 100 : 1,
                }}
                onClick={() => row2Unlocked && setNaturalistPoints(p => Math.min(p + 1, 5))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setNaturalistPoints(p => Math.max(p - 1, 0));
                }}
                onMouseEnter={() => setNaturalistHovered(true)}
                onMouseLeave={() => setNaturalistHovered(false)}
              >
                <img
                  src="/icons/talents/naturalist.jpg"
                  alt="Naturalist"
                  style={{
                    width: '40px',
                    height: '40px',
                    border: `1px solid ${row2Unlocked ? 'green' : 'grey'}`,
                    display: 'block',
                  }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '-5px',
                  right: '-5px',
                  backgroundColor: 'black',
                  color: row2Unlocked ? 'green' : 'grey',
                  fontSize: '12px',
                  padding: '0 2px',
                }}>{naturalistPoints}/5</span>
                {naturalistHovered && (
                  <img
                    src={`/tooltips/talents/naturalist_${naturalistPoints}.png`}
                    alt="Naturalist tooltip"
                    style={{
                      position: 'absolute',
                      top: '50px',
                      left: '0',
                      pointerEvents: 'none',
                      transform: 'scale(0.75)',
                      transformOrigin: 'top left',
                      zIndex: 100,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '70px',
                  left: '800px',
                  cursor: row2Unlocked ? 'pointer' : 'not-allowed',
                  opacity: row2Unlocked ? 1 : 0.5,
                  zIndex: naturesFocusHovered ? 100 : 1,
                }}
                onClick={() => row2Unlocked && setNaturesFocusPoints(p => Math.min(p + 1, 5))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setNaturesFocusPoints(p => Math.max(p - 1, 0));
                }}
                onMouseEnter={() => setNaturesFocusHovered(true)}
                onMouseLeave={() => setNaturesFocusHovered(false)}
              >
                <img
                  src="/icons/talents/natures-focus.jpg"
                  alt="Nature's Focus"
                  style={{
                    width: '40px',
                    height: '40px',
                    border: `1px solid ${row2Unlocked ? 'green' : 'grey'}`,
                    display: 'block',
                  }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '-5px',
                  right: '-5px',
                  backgroundColor: 'black',
                  color: row2Unlocked ? 'green' : 'grey',
                  fontSize: '12px',
                  padding: '0 2px',
                }}>{naturesFocusPoints}/5</span>
                {naturesFocusHovered && (
                  <img
                    src={`/tooltips/talents/natures-focus_${naturesFocusPoints}.png`}
                    alt="Nature's Focus tooltip"
                    style={{
                      position: 'absolute',
                      top: '50px',
                      left: '0',
                      pointerEvents: 'none',
                      transform: 'scale(0.75)',
                      transformOrigin: 'top left',
                      zIndex: 100,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '70px',
                  left: '875px',
                  cursor: row2Unlocked ? 'pointer' : 'not-allowed',
                  opacity: row2Unlocked ? 1 : 0.5,
                  zIndex: naturalShapeshifterHovered ? 100 : 1,
                }}
                onClick={() => row2Unlocked && setNaturalShapeshifterPoints(p => Math.min(p + 1, 3))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setNaturalShapeshifterPoints(p => Math.max(p - 1, 0));
                }}
                onMouseEnter={() => setNaturalShapeshifterHovered(true)}
                onMouseLeave={() => setNaturalShapeshifterHovered(false)}
              >
                <img
                  src="/icons/talents/natural-shapeshifter.jpg"
                  alt="Natural Shapeshifter"
                  style={{
                    width: '40px',
                    height: '40px',
                    border: `1px solid ${row2Unlocked ? 'green' : 'grey'}`,
                    display: 'block',
                  }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '-5px',
                  right: '-5px',
                  backgroundColor: 'black',
                  color: row2Unlocked ? 'green' : 'grey',
                  fontSize: '12px',
                  padding: '0 2px',
                }}>{naturalShapeshifterPoints}/3</span>
                {naturalShapeshifterHovered && (
                  <img
                    src={`/tooltips/talents/natural-shapeshifter_${naturalShapeshifterPoints}.png`}
                    alt="Natural Shapeshifter tooltip"
                    style={{
                      position: 'absolute',
                      top: '50px',
                      left: '0',
                      pointerEvents: 'none',
                      transform: 'scale(0.75)',
                      transformOrigin: 'top left',
                      zIndex: 100,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '130px',
                  left: '730px',
                  cursor: row3Unlocked ? 'pointer' : 'not-allowed',
                  opacity: row3Unlocked ? 1 : 0.5,
                  zIndex: intensityHovered ? 100 : 1,
                }}
                onClick={() => row3Unlocked && setIntensityPoints(p => Math.min(p + 1, 3))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setIntensityPoints(p => Math.max(p - 1, 0));
                }}
                onMouseEnter={() => setIntensityHovered(true)}
                onMouseLeave={() => setIntensityHovered(false)}
              >
                <img
                  src="/icons/talents/intensity.jpg"
                  alt="Intensity"
                  style={{
                    width: '40px',
                    height: '40px',
                    border: `1px solid ${row3Unlocked ? 'green' : 'grey'}`,
                    display: 'block',
                  }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '-5px',
                  right: '-5px',
                  backgroundColor: 'black',
                  color: row3Unlocked ? 'green' : 'grey',
                  fontSize: '12px',
                  padding: '0 2px',
                }}>{intensityPoints}/3</span>
                {intensityHovered && (
                  <img
                    src={`/tooltips/talents/intensity_${intensityPoints}.png`}
                    alt="Intensity tooltip"
                    style={{
                      position: 'absolute',
                      top: '50px',
                      left: '0',
                      pointerEvents: 'none',
                      transform: 'scale(0.75)',
                      transformOrigin: 'top left',
                      zIndex: 100,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '130px',
                  left: '800px',
                  cursor: row3Unlocked ? 'pointer' : 'not-allowed',
                  opacity: row3Unlocked ? 1 : 0.5,
                  zIndex: subtletyHovered ? 100 : 1,
                }}
                onClick={() => row3Unlocked && setSubtletyPoints(p => Math.min(p + 1, 5))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSubtletyPoints(p => Math.max(p - 1, 0));
                }}
                onMouseEnter={() => setSubtletyHovered(true)}
                onMouseLeave={() => setSubtletyHovered(false)}
              >
                <img
                  src="/icons/talents/subtlety.jpg"
                  alt="Subtlety"
                  style={{
                    width: '40px',
                    height: '40px',
                    border: `1px solid ${row3Unlocked ? 'green' : 'grey'}`,
                    display: 'block',
                  }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '-5px',
                  right: '-5px',
                  backgroundColor: 'black',
                  color: row3Unlocked ? 'green' : 'grey',
                  fontSize: '12px',
                  padding: '0 2px',
                }}>{subtletyPoints}/5</span>
                {subtletyHovered && (
                  <img
                    src={`/tooltips/talents/subtlety_${subtletyPoints}.png`}
                    alt="Subtlety tooltip"
                    style={{
                      position: 'absolute',
                      top: '50px',
                      left: '0',
                      pointerEvents: 'none',
                      transform: 'scale(0.75)',
                      transformOrigin: 'top left',
                      zIndex: 100,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '130px',
                  left: '875px',
                  cursor: row3Unlocked ? 'pointer' : 'not-allowed',
                  opacity: row3Unlocked ? 1 : 0.5,
                  zIndex: omenHovered ? 100 : 1,
                }}
                onClick={() => row3Unlocked && setOmenPoints(p => Math.min(p + 1, 1))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setOmenPoints(p => Math.max(p - 1, 0));
                }}
                onMouseEnter={() => setOmenHovered(true)}
                onMouseLeave={() => setOmenHovered(false)}
              >
                <img
                  src="/icons/talents/omen-of-clarity.jpg"
                  alt="Omen of Clarity"
                  style={{
                    width: '40px',
                    height: '40px',
                    border: `1px solid ${row3Unlocked ? 'green' : 'grey'}`,
                    display: 'block',
                  }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '-5px',
                  right: '-5px',
                  backgroundColor: 'black',
                  color: row3Unlocked ? 'green' : 'grey',
                  fontSize: '12px',
                  padding: '0 2px',
                }}>{omenPoints}/1</span>
                {omenHovered && (
                  <img
                    src="/tooltips/talents/omen-of-clarity.png"
                    alt="Omen of Clarity tooltip"
                    style={{
                      position: 'absolute',
                      top: '50px',
                      left: '0',
                      pointerEvents: 'none',
                      transform: 'scale(0.75)',
                      transformOrigin: 'top left',
                      zIndex: 100,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '190px',
                  left: '800px',
                  cursor: row4Unlocked ? 'pointer' : 'not-allowed',
                  opacity: row4Unlocked ? 1 : 0.5,
                  zIndex: tranquilSpiritHovered ? 100 : 1,
                }}
                onClick={() => row4Unlocked && setTranquilSpiritPoints(p => Math.min(p + 1, 5))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setTranquilSpiritPoints(p => Math.max(p - 1, 0));
                }}
                onMouseEnter={() => setTranquilSpiritHovered(true)}
                onMouseLeave={() => setTranquilSpiritHovered(false)}
              >
                <img
                  src="/icons/talents/tranquil-spirit.jpg"
                  alt="Tranquil Spirit"
                  style={{
                    width: '40px',
                    height: '40px',
                    border: `1px solid ${row4Unlocked ? 'green' : 'grey'}`,
                    display: 'block',
                  }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '-5px',
                  right: '-5px',
                  backgroundColor: 'black',
                  color: row4Unlocked ? 'green' : 'grey',
                  fontSize: '12px',
                  padding: '0 2px',
                }}>{tranquilSpiritPoints}/5</span>
                {tranquilSpiritHovered && (
                  <img
                    src={`/tooltips/talents/tranquil-spirit_${tranquilSpiritPoints}.png`}
                    alt="Tranquil Spirit tooltip"
                    style={{
                      position: 'absolute',
                      top: '50px',
                      left: '0',
                      pointerEvents: 'none',
                      transform: 'scale(0.75)',
                      transformOrigin: 'top left',
                      zIndex: 100,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '190px',
                  left: '875px',
                  cursor: row4Unlocked ? 'pointer' : 'not-allowed',
                  opacity: row4Unlocked ? 1 : 0.5,
                  zIndex: improvedRejuvenationHovered ? 100 : 1,
                }}
                onClick={() => row4Unlocked && setImprovedRejuvenationPoints(p => Math.min(p + 1, 3))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setImprovedRejuvenationPoints(p => Math.max(p - 1, 0));
                }}
                onMouseEnter={() => setImprovedRejuvenationHovered(true)}
                onMouseLeave={() => setImprovedRejuvenationHovered(false)}
              >
                <img
                  src="/icons/talents/improved-rejuvenation.jpg"
                  alt="Improved Rejuvenation"
                  style={{
                    width: '40px',
                    height: '40px',
                    border: `1px solid ${row4Unlocked ? 'green' : 'grey'}`,
                    display: 'block',
                  }}
                />
                <span style={{
                  position: 'absolute',
                  bottom: '-5px',
                  right: '-5px',
                  backgroundColor: 'black',
                  color: row4Unlocked ? 'green' : 'grey',
                  fontSize: '12px',
                  padding: '0 2px',
                }}>{improvedRejuvenationPoints}/3</span>
                {improvedRejuvenationHovered && (
                  <img
                    src={`/tooltips/talents/improved-rejuvenation_${improvedRejuvenationPoints}.png`}
                    alt="Improved Rejuvenation tooltip"
                    style={{
                      position: 'absolute',
                      top: '50px',
                      left: '0',
                      pointerEvents: 'none',
                      transform: 'scale(0.75)',
                      transformOrigin: 'top left',
                      zIndex: 100,
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
