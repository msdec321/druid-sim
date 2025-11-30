# TBC Resto Druid Simulator  

Note: This app is still in development  

A World of Warcraft: The Burning Crusade Restoration Druid healing simulator. Practice your healing rotation, experiment with different gear sets, and master raid encounters in an interactive browser-based environment that faithfully recreates TBC healing mechanics including HoTs, spell coefficients, and mana management.  

**Live App:** [https://druid-sim.com/](https://druid-sim.com/)

## Encounters

Face off against configurable raid encounters with realistic damage patterns. The simulator features tank damage, raid-wide AoE, and random target mechanics.   
Current contains three "training dummy" encounters (single tank, two tank, and three tank). The plan will have simulated encounters of each boss in Sunwell Plateau (Kalecgos through Kil'jaeden), and perhaps more.  
Currently Resto Shamans will cast Chain Heal on the raid. TODO: Will add functionality to allow Holy Paladins and Priests to heal as well.  
Raid-frames are based on a standard GRID2 layout. I don't particularly plan on adding templates for other raidframe addons.  
TODO: Add mouseover casting support  

## Gearsets

Choose from five progression tiers of pre-configured gear sets spanning the entire TBC content cycle:  

- **Pre-Raid** - Bonus Healng and Primary Stats consistent with Heroic dungeons and crafted gear  
- **Tier 4** - Bonus Healng and Primary Stats consistent with Karazhan, Gruul's Lair, and Magtheridon gear  
- **Tier 5** - Bonus Healng and Primary Stats consistent with Serpentshrine Cavern and Tempest Keep gear  
- **Tier 6** -  Bonus Healng, Haste and Primary Stats consistent with Black Temple and Mount Hyjal gear  
- **Sunwell Plateau** - Bonus Healng, Haste and Primary Stats consistent with Sunwell Plateau gear  

Coming soon: Custom gearsets. Create your own customized loadout of any gear available. Export and Import functionality to save gearsets and share with others.  

## Action Bars, Keybinds, and Macros  

Customize your healing setup with a flexible action bar system:  

- **Action Bars** - Consistent with base WoW interface (Main bar, Bottom Left, Bottom Right, Right 1, and Right 2)  
- **Keybindings** - Bind any key to action bar slots  
- **Macro Support** - Create macros with basic functionality (#showtooltip, cast spell on pre-set target)  

All configurations are saved to your browser's local storage and persist between sessions. Can Import/Export pre-set action bars and macros.  

## Raid Composition  

Configure your 25-man raid with any combination of TBC classes and specializations. The raid composition affects how damage is distributed and how NPC healers prioritize their targets.  
Players can left-click on a grid space to select classes. Right-click on a player to optionally set their name (can be useful for macros). Tanks will hold aggro on bosses. DPS classes don't currently matter, and each DPS player in your raid will do ~500 DPS on average.  
Resto Shamans will help heal the raid with Chain Heal. I am planning to add support for Paladins and Priest bots to also help heal the raid and tanks, respectively. TODO: Add support for shadow priests (ie having a Spriest in your party will increase your mana regen)  
