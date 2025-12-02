# TBC Resto Druid Simulator  

Note: This app is still in development  

A World of Warcraft: The Burning Crusade Restoration Druid healing simulator. Practice your healing rotation, experiment with different gear sets, and master raid encounters in an interactive browser-based environment that faithfully recreates TBC healing mechanics including HoTs, spell coefficients, and mana management.  

**Live App:** [https://druid-sim.com/](https://druid-sim.com/)

Example gameplay:
[tree-sim-sample.webm](https://github.com/user-attachments/assets/ddd628a5-a2af-413a-8ec9-a6ea4a1eff2e)


## Encounters

The simulation will feature standalone encounters of each boss in Sunwell Plateau (Kalecgos through Kil'jaeden), and perhaps more. Currently implemented is a Brutallus encounter along with a few target dummy encounters. Raid-frames are based on a standard GRID2 layout. I don't particularly plan on adding templates for other raidframe addons. TODO: Add mouseover casting support  

Below is a description of how each boss' abilities and damage profiles have been implemented.

### Brutallus

Brutallus is a 5-minute encounter (4M HP) featuring heavy tank damage and raid-wide burns.

| Ability | Details |
|---------|---------|
| **Melee Attacks** | Dual-wield attack every 1.1-1.3s. Main-hand: 2,275-9,685 damage. Off-hand: 1,277-4,714 damage. Each weapon rolls avoidance separately. |
| **Meteor Slash** | Every 10s. 20,000 fire damage split between tank and players in cone behind. Applies debuff (40s duration) increasing fire damage taken by 75% per stack. |
| **Burn** | Every 20s on random player. Lasts 60s. Ticks for 100 DPS initially, doubling every 10s (100→200→400→800→1600→3200). Amplified by Meteor Slash stacks. |

Burned players automatically move out of Meteor Slash soak groups to avoid gaining stacks.

## Gearsets

Choose from five progression tiers of pre-configured gear sets spanning the entire TBC content cycle:  

- **Pre-Raid** - Bonus Healng and Primary Stats consistent with Heroic dungeons and crafted gear  
- **Tier 4** - Bonus Healng and Primary Stats consistent with Karazhan, Gruul's Lair, and Magtheridon gear  
- **Tier 5** - Bonus Healng and Primary Stats consistent with Serpentshrine Cavern and Tempest Keep gear  
- **Tier 6** -  Bonus Healng, Haste and Primary Stats consistent with Black Temple and Mount Hyjal gear  
- **Sunwell Plateau** - Bonus Healng, Haste and Primary Stats consistent with Sunwell Plateau gear  

Coming soon: Custom gearsets. Create your own customized loadout of any gear available. Export and Import functionality to save gearsets and share with others.  

## Talent Trees (Under construction)

Choose from a set of three pre-set talent loadouts (Deep resto, Dreamstate, or Nature's Grace), or optionally create your own custom talent loadout. Export/Import talents to share with others.

## Action Bars, Keybinds, and Macros  

Customize your healing setup with a flexible action bar system. Left-click on an action bar slot to set a spell. Right-click on an action bar slot to set a keybind.  

- **Action Bars** - Consistent with base WoW interface (Main bar, Bottom Left, Bottom Right, Right 1, and Right 2)  
- **Keybindings** - Bind any key to action bar slots  
- **Macro Support** - Create macros with basic functionality (#showtooltip, cast spell on pre-set target)  

All configurations are saved to your browser's local storage and persist between sessions. Can Import/Export pre-set action bars and macros.  

## Raid Composition

Configure your 25-man raid with any combination of TBC classes and specializations. Left-click a slot to select a spec, right-click to set a player name (useful for macros).

| Role | Behavior |
|------|----------|
| **Prot Warrior** | 5% miss, 20% dodge, 15% parry, 30% block (1,800 block value). |
| **Prot Paladin** | 5% miss, 18% dodge, 14% parry, 35% block (1,600 block value). |
| **Feral Druid** | 5% miss, 35% dodge. Cannot parry or block. |
| **DPS** | Deal ~500 DPS on average to the boss. Specific DPS specs don't affect damage output. |
| **Resto Shaman** | Casts Chain Heal (2.5s cast) when any raid member drops below 80% HP. Heals 826-943 on primary target, then jumps to 2 additional targets with 50% reduction per jump. |
| **Holy Paladin** | Casts Holy Light (1.85s cast) when tanks drop below 90% or any raid member below 80% HP. Heals 4,400-4,800. Prioritizes tanks. 32% crit chance for double healing. |
| **Holy Priest** | Casts Circle of Healing (instant, 1.3s GCD) when any raid member drops below 80% HP. Heals 1,000-1,600 to each member of the most damaged group (up to 5 targets). 14% crit chance. |

TODO: Add support for Shadow Priests (having one in your party increases mana regen).
