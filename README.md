# Iron Circuit

Iron Circuit is a single-player tank arena game inspired by tank.io and Diep.io. Fight enemy waves, collect energy, and evolve your tank. Your best score, equipment unlocks, daily progress, and shop wallet are stored in the browser when local storage is available.

## Play

Open `index.html` directly in a modern browser with the other game files and the `assets` folder in the same directory. The game runs offline with no dependencies, build step, or account.

To serve it locally instead, run `python3 -m http.server 8000` from the repository and open `http://localhost:8000`.

| Action | Desktop | Touch |
| --- | --- | --- |
| Move | WASD or arrow keys | Drag the left half |
| Aim and fire | Move the mouse and hold the left button. Space also fires. | Drag the right half |
| Pause or resume | P, Escape, or the Pause button | Pause button |
| Active ability | Q or the ability button | Tap the ability button between the move and aim pads |
| Accept a contract | E or the Accept button | Tap Accept |

On touchscreens, turn on **Auto aim & fire** in the lobby or pause menu to shoot automatically while moving. Drag the right half to aim manually at any time.

Choose a tank and ability before starting. The lobby shows each tank's artwork, starting stats, and weapon behavior. Open **Tank stats** on the pause or upgrade screen to see your current speed, resistance, and other build stats. Every class can start with **Dash**, **EMP pulse**, or **Overdrive**. **Deflector** unlocks when you defeat a boss, and **Repair kit** unlocks when you reach wave 8. The ability button shows when you can activate it again. Open Settings & unlocks to see finish milestones or turn off screen shake.

Open **Field guide** from the lobby or a paused run to look up enemy forms, bosses, starting tanks, abilities, upgrade requirements, contracts, and skin unlocks. Ember, Glacier, Jade, Eclipse, and Solar unlock at waves 16, 24, 32, 45, and 60.

## Progression

Drive near blue energy drops to collect them. Enemy tanks drop more energy than shapes. Clearing a wave awards extra XP and repairs hull. Sound starts muted and can be enabled from the HUD.

Spend one upgrade point per level in **Firepower**, **Defense**, **Mobility**, **Systems**, **Munitions**, or **Tactics**. Each path offers five upgrades with multiple ranks. Investing points in a path unlocks its advanced upgrades. You can specialize or switch paths at any level. Munitions adds critical hits, larger bullets, slows, finishers, and extra damage against elites and bosses. Tactics improves your active ability and rewards timing it well.

At level 10 you choose your first evolution. At level 25 you choose a second evolution that stacks with the first. Both choices include a tank preview and keep your installed upgrades.

| Starting class | Evolution choices |
| --- | --- |
| Vanguard | **Twin Gunner** fires paired shots. **Juggernaut** trades speed for a tougher hull. **Sentinel** adds shields and a shorter ability cooldown. **Bombardier** adds blast damage to every fourth volley. |
| Lancer | **Railgun** hits harder and pierces more targets. **Skirmisher** reloads faster while moving. **Marksman** specializes in critical hits and damage against bosses and elites. **Frost Lance** slows enemy tanks. |
| Scatter | **Breacher** fires more pellets at close range. **Longshot** focuses fewer pellets at longer range. **Shredder** fires piercing pellets. **Raider** moves faster and repairs on takedowns. |
| Atlas | **Shield Battery**, **Overclock**, **Twin Capacitor**, or **Siege Plate**. |
| Specter | **Phase Hunter**, **Ghost Drive**, **Cryo Prism**, or **Deadeye Optics**. |
| Behemoth | **Riot Battery**, **Scavenger Rig**, **Battering Plate**, or **Tungsten Fan**. |

At level 25, Vanguard chooses **Assault Command** or **Fortress**, Lancer chooses **Phase Rail** or **Fulcrum**, and Scatter chooses **Maelstrom** or **Reclaimer**. Atlas chooses **Citadel Drive** or **Mass Driver**, Specter chooses **Horizon Rail** or **Slip Engine**, and Behemoth chooses **Flood Cannon** or **Siege Recycler**. Each tank has one additional shop evolution. See **Field guide → Tanks** for previews and effects.

## Difficulty and the shop

| Mode | Enemy hull and damage | Daily reward | Elite / boss coin drop chance |
| --- | --- | --- | --- |
| Easy | 80% of Medium | Daily progress disabled | None |
| Medium | Standard | 50 coins and 0.5 Evolution Points | None |
| Hard | 165% of Medium | 75 coins and 1 Evolution Point | 5% for 5 coins / 18% for 30 coins |
| Nightmare | 330% of Medium | 110 coins and 1.5 Evolution Points | 8% for 10 coins / 26% for 50 coins |

Reach **wave 60 on Medium** to unlock Hard, then reach **wave 60 on Hard** to unlock Nightmare. Use **Daily & shop** in the lobby to see the current objective, progress, prices, and tank stats for the selected difficulty. Daily progress carries across runs and the objective resets at local midnight. The reward is credited once per day at the difficulty on which you finish it.

Coins buy **Atlas** (7,200), **Specter** (8,500), and **Behemoth** (9,600). Evolution Points buy **Warlord** (32), **Singularity** (38), **Cataclysm** (44), **Titan Heart** (48), **Null Rail** (54), and **Supernova** (60). Shop purchases are permanent. Shop tank bonuses and extra evolution power are strongest on Nightmare and reduced on the lower modes.

## Battlefield

Scouts rush you, flankers circle you, and heavies fire spread shots. Rammers mark a charge lane, snipers show where they are aiming, and mortar tanks mark the ground before impact. Bulwarks can protect nearby tanks while their shield is raised. Mechanics follow wounded allies and heal more hull per repair on tougher tanks. Their green beam shows who they are healing, and cover blocks the repair.

Later waves send more tanks and give them more hull, damage, and movement speed. Wave 15 has 30 tanks, wave 30 has 45, and waves eventually reach 60. Reinforcements arrive gradually, with at most 14 tanks active at once. Crossfire twins join at wave 9 and Triad triple gunners at wave 13. Tanks with multiple guns account for 6 of 20 enemies on wave 9 and 25 of 45 on wave 30. Special enemies attack more often and telegraph their attacks for less time as waves advance.

From wave 7 onward, evolved forms start joining regular tanks. Form II has two chevrons above its hull. Form III starts appearing at wave 24 and has three cyan chevrons. Vipers fire three-shot bursts, Citadels shield from farther away, and Triage Tanks can repair three allies at once. All 11 enemy roles have a third form by wave 47.

Enemies look for open routes around cover, and flankers spread across both sides of the player. Enemies can aim ahead of a moving player, with more lead on evolved forms. Firing lanes and mortar zones lock in when the warning appears. Repair tanks prioritize the most damaged allies they can reach.

Gold-outlined elite tanks appear from wave 4. They have more hull, hit harder, move faster, and fire more often. Every fifth wave rotates through **Blitz** (faster movement and attacks), **Fortified** (extra hull), and **Elite patrol** (two extra elites). Repairs between waves restore only a small part of your hull, so defensive upgrades and well-timed abilities matter.

The arena rotates between **Transit Yard**, **Foundry**, and **Relay Station** every four waves. Cover blocks tanks and shots until destroyed. Foundry vents paint a warning circle before erupting.

Every third wave offers an optional contract. Hold a marked zone, hunt an elite, collect energy, sweep enemy tanks, recover supply crates, or time takedowns with your ability. Hunt timers run only while the target is in the arena. Boss fights pause all contract timers. Modules last for the current run. After installing all ten modules, contracts award score and hull repairs.

A boss interrupts the regular wave every ten **player levels**. Six bosses rotate and each changes its attack pattern at half hull. Ground markers, firing lanes, and the windup bar show what's coming. The wave resumes after the boss is defeated.

Each boss defeat opens an extraction circle in the middle of the map for 30 seconds. Stay inside for two uninterrupted seconds to end the run and earn an extra 10% of the coins collected during it, rounded down to a whole coin. Leaving the circle resets the hold. You can keep playing after the window closes.

| First encounter | Boss | Signature ability |
| --- | --- | --- |
| Level 10 | Gatekeeper | Radial shockwaves and scatter volleys |
| Level 20 | Arc Warden | Electrical pools that damage tanks that stay inside |
| Level 30 | Siege Engine | Cluster bombardments and rail shots |
| Level 40 | Fabricator | Deploys up to three escort tanks |
| Level 50 | Rift Runner | High-speed charges and radial pulses |
| Level 60 | Prism Core | Sweeping beam that solid cover blocks |

The run summary shows your build, damage dealt to enemy tanks, tanks and bosses defeated, completed contracts, and the final hit. Use **Play again** to retry your loadout or **Change loadout** to return to the lobby.
