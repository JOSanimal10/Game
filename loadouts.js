'use strict';

const firstEvolutionLevel = 10;
const secondEvolutionLevel = 25;

const tankClasses = [
  { id: 'vanguard', name: 'Vanguard',
    description: 'A quick-firing single cannon with balanced hull and movement. Keep moving and land steady hits at medium range.',
    preview: 'assets/arena-cover.webp', previewAlt: 'Vanguard tank with an angular turret and single cannon on a violet deployment pad.',
    damage: 17.1, reload: .25, speed: 245, hp: 100, shotSpeed: 660, shotLife: 1.12, pierce: 0, pellets: 1, spread: .15 },
  { id: 'lancer', name: 'Lancer',
    description: 'A long-range cannon that hits up to two targets per shot. The second hit deals 65% damage. Line up enemies and keep your distance to protect its lighter hull.',
    preview: 'assets/lancer-cover.webp', previewAlt: 'Slim Lancer tank with a long precision rail cannon on a violet deployment pad.',
    damage: 29, reload: .57, speed: 235, hp: 80, shotSpeed: 820, shotLife: 1.12, pierce: 1, pellets: 1, spread: .09 },
  { id: 'scatter', name: 'Scatter',
    description: 'Fires five pellets in a short-range spread. Close in to land more pellets per volley. Its extra hull helps up close, but it moves and reloads more slowly.',
    preview: 'assets/scatter-cover.webp', previewAlt: 'Heavy Scatter tank with five short cannon barrels on a violet deployment pad.',
    damage: 8.4, reload: .66, speed: 220, hp: 115, shotSpeed: 540, shotLife: .53, pierce: 0, pellets: 5, spread: .14 }
];

const activeAbilities = [
  { id: 'dash', name: 'Dash',
    description: 'Burst forward for 0.19s with damage immunity. Dash follows your current movement, or your last movement direction when stopped. Use it to escape a firing lane.',
    cooldown: 7 },
  { id: 'emp', name: 'EMP pulse',
    description: 'Clear nearby hostile bullets and stun tanks in the pulse for 1.3s. Bosses are stunned for 0.4s. Use it when surrounded or to interrupt an attack.',
    cooldown: 12 },
  { id: 'overdrive', name: 'Overdrive',
    description: 'Fire 45% faster for 3s. Activate when you have a clear shot at a boss or a group of enemies. You can still take damage while it is active.',
    cooldown: 13 },
  { id: 'deflector', name: 'Deflector', unlock: 'deflector',
    description: 'Deploy a temporary shield that absorbs the next 22 damage for up to 3s. Use it just before crossing a firing lane.',
    cooldown: 15 },
  { id: 'repair-kit', name: 'Repair kit', unlock: 'repair-kit',
    description: 'Immediately restore up to 18 hull. Save it until you have room to recover the full amount.',
    cooldown: 24 }
];

const tankEvolutions = {
  vanguard: [
    { id: 'twin', name: 'Twin Gunner', detail: 'Fire two shots at 70% damage each. Reload 12% sooner and cover a wider angle.',
      color: '#a8ffe7', barrels: 2, sound: [210, .075, .047, 'square', 102],
      apply: p => { p.pellets++; p.damageScale *= .70; p.reload *= .88; p.spread *= 1.32; } },
    { id: 'juggernaut', name: 'Juggernaut', detail: 'Gain and repair 26 hull. Take 9% less base damage and move 9% slower.',
      color: '#ffca91', size: 4, sound: [118, .15, .058, 'triangle', 52],
      apply: p => { p.maxHp += 26; p.hp += 26; p.armor += .09; p.speed *= .91; } },
    { id: 'sentinel', name: 'Sentinel', detail: 'Gain 22 shield capacity and refill 22 shield now. Your ability cooldown is 12% shorter, and you move 6% slower.',
      color: '#a3cbff', armor: '#344e76', size: 3, barrelLength: -3, sound: [150, .1, .051, 'triangle', 66],
      apply: p => { p.maxShield += 22; p.shield += 22; p.abilityCooldown *= .88; p.speed *= .94; } },
    { id: 'bombardier', name: 'Bombardier', detail: 'Every fourth volley adds 16 blast damage to enemy tanks around the impact. Reload takes 10% longer.',
      color: '#ffc0a8', armor: '#754842', size: 2, barrelLength: 5, sound: [120, .16, .065, 'sawtooth', 45],
      apply: p => { p.blastDamage += 16; p.reload *= 1.10; } }
  ],
  lancer: [
    { id: 'railgun', name: 'Railgun', detail: 'Deal 28% more damage and pierce one more target. Shots travel faster, but reload takes 14% longer.',
      color: '#d7b6ff', barrelLength: 8, sound: [475, .17, .05, 'sawtooth', 85],
      apply: p => { p.damage *= 1.28; p.pierce++; p.shotSpeed *= 1.18; p.reload *= 1.14; } },
    { id: 'skirmisher', name: 'Skirmisher', detail: 'Move 12% faster and reload 24% faster while moving. Each shot deals 6% less damage.',
      color: '#a8d7ff', size: -2, sound: [380, .09, .05, 'triangle', 167],
      apply: p => { p.speed *= 1.12; p.movingReload += .24; p.damage *= .94; } },
    { id: 'marksman', name: 'Marksman', detail: 'Gain 20 percentage points of critical chance and deal 18% more damage to bosses and elites. Reload takes 8% longer.',
      color: '#ffe495', armor: '#646044', barrelLength: 11, sound: [495, .10, .045, 'triangle', 110],
      apply: p => { p.critChance += .20; p.bossDamage += .18; p.reload *= 1.08; } },
    { id: 'frost-lance', name: 'Frost Lance', detail: 'Hits slow enemy tanks by 24% for 0.8s. Bosses receive half the slow. Gain and repair 12 hull, and deal 10% less shot damage.',
      color: '#aff3ff', armor: '#345e6b', size: 1, barrelLength: 4, sound: [515, .12, .046, 'sine', 184],
      apply: p => { p.slowPower += .24; p.maxHp += 12; p.hp += 12; p.damage *= .90; } }
  ],
  scatter: [
    { id: 'breacher', name: 'Breacher', detail: 'Gain and repair 16 hull. Fire two extra pellets in a wider spread with 12% less range.',
      color: '#ffb7a0', barrels: 5, size: 2, sound: [139, .16, .065, 'sawtooth', 50],
      apply: p => { p.maxHp += 16; p.hp += 16; p.pellets += 2; p.spread *= 1.12; p.shotLife *= .88; } },
    { id: 'choke', name: 'Longshot', detail: 'Fire one fewer pellet in a 45% tighter spread. Pellets travel 50% farther.',
      color: '#fbda9e', barrels: 4, barrelLength: 5, sound: [220, .13, .05, 'triangle', 62],
      apply: p => { p.pellets--; p.spread *= .55; p.shotLife *= 1.50; } },
    { id: 'shredder', name: 'Shredder', detail: 'Pellets pierce one more target, dealing 65% damage on follow-up hits. Reload takes 14% less time, and each pellet deals 12% less damage.',
      color: '#efaaf7', armor: '#65416e', barrels: 5, barrelLength: -4, sound: [173, .11, .055, 'square', 73],
      apply: p => { p.pierce++; p.reload *= .86; p.damage *= .88; } },
    { id: 'raider', name: 'Raider', detail: 'Move 12% faster, pull in energy from 55 units farther away, and repair 1.5 hull per tank destroyed. Lose 12 maximum hull.',
      color: '#bbffa6', armor: '#3c6751', size: -2, sound: [190, .11, .044, 'triangle', 73],
      apply: p => { p.speed *= 1.12; p.pickupRange += 55; p.killRepair += 1.5; p.maxHp -= 12; p.hp = Math.min(p.hp, p.maxHp); } }
  ],
  atlas: [
    { id: 'shield-battery', name: 'Shield Battery', detail: 'Gain 28 shield capacity and fill it now. Gain 6 percentage points of impact resistance and move 7% slower.',
      color: '#b7d9ff', armor: '#4b5783', size: 3, apply: p => { p.maxShield += 28; p.shield += 28; p.contactArmor += .06; p.speed *= .93; } },
    { id: 'overclock', name: 'Overclock', detail: 'Abilities recharge 17% sooner. Reload 13% faster while moving. Lose 10 maximum hull.',
      color: '#baffec', size: -2, barrelLength: 3,
      apply: p => { p.abilityCooldown *= .83; p.movingReload += .13; p.maxHp -= 10; p.hp = Math.min(p.hp, p.maxHp); } },
    { id: 'twin-capacitor', name: 'Twin Capacitor', detail: 'Fire two shots at 67% damage each. Deal 12% extra shot damage for 2 seconds after using an ability.',
      color: '#ffdc9f', barrels: 2, apply: p => { p.pellets++; p.damageScale *= .67; p.spread *= 1.35; p.abilityDamage += .12; } },
    { id: 'siege-plate', name: 'Siege Plate', detail: 'Add 17 blast damage to every fourth volley and 4 percentage points of resistance. Reload takes 12% longer.',
      color: '#ffb9b0', size: 4, barrelLength: -3, apply: p => { p.blastDamage += 17; p.armor += .04; p.reload *= 1.12; } }
  ],
  specter: [
    { id: 'phase-hunter', name: 'Phase Hunter', detail: 'Pierce one more target. Shots deal 12% more damage, and reload takes 12% longer.',
      color: '#d7c0ff', barrelLength: 8, apply: p => { p.pierce++; p.damage *= 1.12; p.reload *= 1.12; } },
    { id: 'ghost-drive', name: 'Ghost Drive', detail: 'Move 14% faster and reload 22% faster while moving. Lose 8 maximum hull.',
      color: '#adf9ee', size: -3, apply: p => { p.speed *= 1.14; p.movingReload += .22; p.maxHp -= 8; p.hp = Math.min(p.hp, p.maxHp); } },
    { id: 'cryo-prism', name: 'Cryo Prism', detail: 'Shots slow enemy tanks by 32% for 0.8 seconds, or 16% against bosses. Shot damage is 7% lower.',
      color: '#c4f3ff', barrelLength: 4, apply: p => { p.slowPower += .32; p.damage *= .93; } },
    { id: 'deadeye-optics', name: 'Deadeye Optics', detail: 'Gain 24 percentage points of critical chance and deal 16% extra shot damage to tanks below 30% hull. Reload takes 10% longer.',
      color: '#fff3ab', barrelLength: 12, apply: p => { p.critChance += .24; p.executeDamage += .16; p.reload *= 1.1; } }
  ],
  behemoth: [
    { id: 'riot-battery', name: 'Riot Battery', detail: 'Fire two extra pellets in a 15% wider spread. Each pellet deals 7% less damage.',
      color: '#ffc4af', barrels: 5, barrelLength: -3, apply: p => { p.pellets += 2; p.spread *= 1.15; p.damage *= .93; } },
    { id: 'scavenger-rig', name: 'Scavenger Rig', detail: 'Move 8% faster, pull energy from 60 units farther away, and repair 2.5 hull on takedowns. Lose 12 maximum hull.',
      color: '#ceffb0', size: -2, apply: p => { p.speed *= 1.08; p.pickupRange += 60; p.killRepair += 2.5; p.maxHp -= 12; p.hp = Math.min(p.hp, p.maxHp); } },
    { id: 'battering-plate', name: 'Battering Plate', detail: 'Gain and repair 22 hull and add 15 percentage points of impact resistance. Move 8% slower.',
      color: '#ffdd9d', size: 4, apply: p => { p.maxHp += 22; p.hp += 22; p.contactArmor += .15; p.speed *= .92; } },
    { id: 'tungsten-fan', name: 'Tungsten Fan', detail: 'Pellets pierce one more target and the spread is 22% tighter. Reload takes 11% longer.',
      color: '#edc9ff', barrels: 5, barrelLength: 4, apply: p => { p.pierce++; p.spread *= .78; p.reload *= 1.11; } }
  ]
};

const tankSounds = {
  vanguard: [160, .075, .048, 'square', 80],
  lancer: [420, .12, .051, 'triangle', 94],
  scatter: [128, .13, .057, 'sawtooth', 49]
};

const advancedTankEvolutions = {
  vanguard: [
    { id: 'assault-command', name: 'Assault Command', detail: 'Deal 20% more shot damage and cut reload time by 10%.',
      color: '#ffd3a6', armor: '#65423d', apply: p => { p.damage *= 1.20; p.reload *= .90; } },
    { id: 'fortress', name: 'Fortress', detail: 'Gain 28 shield capacity and refill it now. Reduce incoming damage by another 6 percentage points.',
      color: '#c1e5ff', armor: '#3b5178', size: 2, apply: p => { p.maxShield += 28; p.shield += 28; p.armor += .06; } }
  ],
  lancer: [
    { id: 'phase-rail', name: 'Phase Rail', detail: 'Pierce two additional targets and gain 25% more shot range.',
      color: '#d8baff', barrelLength: 13, apply: p => { p.pierce += 2; p.shotLife *= 1.25; } },
    { id: 'fulcrum', name: 'Fulcrum', detail: 'Gain 18 percentage points of critical chance and 20% faster reload while moving.',
      color: '#fff1a8', apply: p => { p.critChance += .18; p.movingReload += .20; } }
  ],
  scatter: [
    { id: 'maelstrom', name: 'Maelstrom', detail: 'Fire two additional pellets in a wider spread. Each pellet travels 15% farther.',
      color: '#ffd0e6', barrels: 5, apply: p => { p.pellets += 2; p.spread *= 1.12; p.shotLife *= 1.15; } },
    { id: 'reclaimer', name: 'Reclaimer', detail: 'Gain and repair 22 hull. Restore 3 more hull per tank destroyed.',
      color: '#c5ffdc', armor: '#38634e', apply: p => { p.maxHp += 22; p.hp += 22; p.killRepair += 3; } }
  ],
  atlas: [
    { id: 'citadel-drive', name: 'Citadel Drive', detail: 'Gain 34 shield capacity and fill it now. Add 4 percentage points of resistance and cut ability cooldown by 10%.',
      color: '#c4d8ff', size: 2, apply: p => { p.maxShield += 34; p.shield += 34; p.armor += .04; p.abilityCooldown *= .9; } },
    { id: 'mass-driver', name: 'Mass Driver', detail: 'Deal 22% more shot damage, add 120 shot speed, and extend shot flight by 0.11 seconds.',
      color: '#ffd1ae', barrelLength: 11, apply: p => { p.damage *= 1.22; p.shotSpeed += 120; p.shotLife += .11; } }
  ],
  specter: [
    { id: 'horizon-rail', name: 'Horizon Rail', detail: 'Pierce two more targets, extend shot flight by 0.24 seconds, and deal 12% more damage to bosses and elites.',
      color: '#d6c7ff', barrelLength: 15, apply: p => { p.pierce += 2; p.shotLife += .24; p.bossDamage += .12; } },
    { id: 'slip-engine', name: 'Slip Engine', detail: 'Add 24% reload speed while moving, move 12% faster after 0.65 seconds without firing, and cut ability cooldown by 12%.',
      color: '#bafafe', size: -1, apply: p => { p.movingReload += .24; p.coast += .12; p.abilityCooldown *= .88; } }
  ],
  behemoth: [
    { id: 'flood-cannon', name: 'Flood Cannon', detail: 'Fire two extra pellets with a 12% shorter reload and a 12% wider spread. Pellets travel 10% less far.',
      color: '#ffac9a', barrels: 5, barrelLength: -4, apply: p => { p.pellets += 2; p.reload *= .88; p.spread *= 1.12; p.shotLife *= .9; } },
    { id: 'siege-recycler', name: 'Siege Recycler', detail: 'Add 16 blast damage to every fourth volley and restore 3 more hull on takedowns.',
      color: '#b8f7ac', size: 2, apply: p => { p.blastDamage += 16; p.killRepair += 3; } }
  ]
};

const shopTanks = [
  { id: 'atlas', baseClass: 'vanguard', name: 'Atlas', price: 7200, hullColor: '#594b8b', color: '#ded0ff',
    description: 'A heavier Vanguard with more hull, stronger shots, and a faster reload.',
    hp: 155, damage: 27, reload: .21, speed: 254, shotSpeed: 740 },
  { id: 'specter', baseClass: 'lancer', name: 'Specter', price: 8500, hullColor: '#2e657b', color: '#adf3ff',
    description: 'A faster Lancer with a heavier rail shot and stronger hull.',
    hp: 120, damage: 47, reload: .49, speed: 270, shotSpeed: 940 },
  { id: 'behemoth', baseClass: 'scatter', name: 'Behemoth', price: 9600, hullColor: '#815046', color: '#ffc8ad',
    description: 'An armored Scatter with heavier pellets and longer reach.',
    hp: 174, damage: 13.5, reload: .56, speed: 236, shotLife: .66 }
];

const shopEvolutions = [
  { id: 'warlord', tankId: 'vanguard', name: 'Warlord', price: 32, color: '#ffc395', armor: '#784358', size: 3,
    detail: 'At full strength, deal 38% more damage, reload 15% sooner, and gain 20 shield capacity and 20 shield.',
    apply: (p, s) => { p.damage *= 1.20 + .18 * s; p.reload *= .90 - .05 * s; p.maxShield += Math.round(20 * s); p.shield += Math.round(20 * s); } },
  { id: 'singularity', tankId: 'lancer', name: 'Singularity', price: 38, color: '#e8ccff', barrelLength: 14,
    detail: 'At full strength, deal 45% more shot damage, gain 24 percentage points of critical chance, and extend shot flight by 0.25s.',
    apply: (p, s) => { p.damage *= 1.22 + .23 * s; p.critChance += .10 + .14 * s; p.shotLife += .10 + .15 * s; } },
  { id: 'cataclysm', tankId: 'scatter', name: 'Cataclysm', price: 44, color: '#ffd4bc', armor: '#854d49', barrels: 5,
    detail: 'At full strength, deal 38% more damage per pellet, reload 20% sooner, and add 18 blast damage to every fourth volley.',
    apply: (p, s) => { p.damage *= 1.15 + .23 * s; p.reload *= .92 - .12 * s; p.blastDamage += 18 * s; } },
  { id: 'titan-heart', tankId: 'atlas', name: 'Titan Heart', price: 48, color: '#e9d4ff', armor: '#675384', size: 3,
    detail: 'At full strength, gain and repair 40 hull, fill 26 extra shield capacity, and gain 10 percentage points of resistance.',
    apply: (p, s) => { const hull = Math.round(17 + 23 * s); const shield = Math.round(10 + 16 * s);
      p.maxHp += hull; p.hp += hull; p.maxShield += shield; p.shield += shield; p.armor += .04 + .06 * s; } },
  { id: 'null-rail', tankId: 'specter', name: 'Null Rail', price: 54, color: '#d3f5ff', barrelLength: 16,
    detail: 'At full strength, deal 40% more shot damage, gain 20 percentage points of critical chance, and pierce one more target.',
    apply: (p, s) => { p.damage *= 1.18 + .22 * s; p.critChance += .08 + .12 * s; p.pierce++; } },
  { id: 'supernova', tankId: 'behemoth', name: 'Supernova', price: 60, color: '#ffe0ba', armor: '#81514e', barrels: 5,
    detail: 'At full strength, deal 42% more damage per pellet and reload 14% sooner. Add 24 blast damage to every fourth volley.',
    apply: (p, s) => { p.damage *= 1.18 + .24 * s; p.reload *= .93 - .07 * s; p.blastDamage += 10 + 14 * s; } }
];

function tankEvolutionsAt(tankId, level) {
  return level === firstEvolutionLevel ? tankEvolutions[tankId]
    : [...advancedTankEvolutions[tankId], ...shopEvolutions.filter(item => item.tankId === tankId)];
}

const tankFinishes = [
  { id: 'standard', name: 'Standard' },
  { id: 'cobalt', name: 'Cobalt', color: '#92bfff', armor: '#36567f', unlock: 'cobalt', wave: 4 },
  { id: 'amber', name: 'Amber', color: '#ffce8c', armor: '#815b43', unlock: 'amber' },
  { id: 'orchid', name: 'Orchid', color: '#e7a7ff', armor: '#763b86', unlock: 'orchid', wave: 12 },
  { id: 'ember', name: 'Ember', color: '#ff8767', armor: '#8e3e3e', unlock: 'ember', wave: 16 },
  { id: 'glacier', name: 'Glacier', color: '#b8f7ff', armor: '#517990', unlock: 'glacier', wave: 24 },
  { id: 'jade', name: 'Jade', color: '#a4ef94', armor: '#365f4a', unlock: 'jade', wave: 32 },
  { id: 'eclipse', name: 'Eclipse', color: '#c4baff', armor: '#32274b', unlock: 'eclipse', wave: 45 },
  { id: 'solar', name: 'Solar', color: '#fff0b2', armor: '#826029', unlock: 'solar', wave: 60 }
];

const unlockMilestones = {
  deflector: { name: 'Deflector ability', goal: 'Defeat a boss' },
  'repair-kit': { name: 'Repair kit ability', goal: 'Reach wave 8' }
};

for (const finish of tankFinishes.filter(item => item.unlock)) {
  unlockMilestones[finish.unlock] = {
    name: finish.name + ' finish',
    goal: finish.wave ? 'Reach wave ' + finish.wave : 'Complete a contract'
  };
}
