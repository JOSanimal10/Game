'use strict';

const enemyTypes = {
  scout: {
    name: 'Scout',
    color: '#ff7997', armor: '#71394f', r: 17, hp: 34, speed: 140, range: 70, strafe: .13, turret: 4,
    interval: 2.12, contact: 10, reward: 32, energy: 18, unlock: 1, weight: 7,
    attacks: [{ reach: 240, speed: 285, damage: 8 }]
  },
  gunner: {
    name: 'Gunner',
    color: '#ffc174', armor: '#73513a', r: 20, hp: 52, speed: 96, range: 258, strafe: .55,
    interval: 1.85, contact: 10, reward: 48, energy: 22, unlock: 2, weight: 6,
    attacks: [{ reach: 470, speed: 350, damage: 9 }]
  },
  rammer: {
    name: 'Rammer',
    color: '#ff9c8a', armor: '#7c3f37', r: 22, hp: 60, speed: 117, range: 95, strafe: 0, turret: 3, barrels: 0,
    interval: 3.0, contact: 10, reward: 58, energy: 24, unlock: 3, weight: 3,
    attacks: [{ kind: 'charge', windup: .74, reach: 290, speed: 430, duration: .66, damage: 18 }]
  },
  sniper: {
    name: 'Sniper',
    color: '#96adff', armor: '#3f4b86', r: 17, hp: 45, speed: 86, range: 407, strafe: .38, turret: 4,
    interval: 2.75, contact: 8, reward: 62, energy: 24, unlock: 4, weight: 2, limit: 2,
    attacks: [{ windup: .97, reach: 575, speed: 610, life: 1.1, damage: 16 }]
  },
  heavy: {
    name: 'Heavy',
    color: '#df93ff', armor: '#5e3d7c', r: 28, hp: 102, speed: 73, range: 210, strafe: .22, barrels: 3,
    interval: 2.35, contact: 16, reward: 80, energy: 31, unlock: 5, weight: 3,
    attacks: [{ reach: 430, count: 3, spread: .21, speed: 325, damage: 10 }]
  },
  bulwark: {
    name: 'Bulwark',
    color: '#e8dc86', armor: '#6a6439', r: 25, hp: 77, speed: 84, range: 153, strafe: .29, turret: 8, barrels: 2,
    interval: 2.45, contact: 14, reward: 72, energy: 28, unlock: 6, weight: 3, frontShield: true,
    attacks: [{ windup: .5, reach: 360, count: 2, spread: .19, speed: 325, damage: 10 }]
  },
  mortar: {
    name: 'Mortar tank',
    color: '#ffa4d6', armor: '#794669', r: 20, hp: 59, speed: 80, range: 350, strafe: .4, turret: 4,
    interval: 3.25, contact: 9, reward: 76, energy: 27, unlock: 7, weight: 2, limit: 2,
    attacks: [{ kind: 'mortar', windup: 1.17, reach: 510, radius: 70, damage: 16 }]
  },
  flanker: {
    name: 'Flanker', color: '#f883ad', armor: '#754a6e', r: 16, hp: 42, speed: 149, range: 190, strafe: .87, orbit: true,
    interval: 1.55, contact: 8, reward: 64, energy: 24, unlock: 3, weight: 3, limit: 3,
    attacks: [{ reach: 330, windup: .45, speed: 450, damage: 8, life: .86 }]
  },
  mechanic: {
    name: 'Mechanic', color: '#a5e9a3', armor: '#416a54', r: 19, hp: 52, speed: 103, range: 300, strafe: .24, repairs: true,
    interval: 2.4, contact: 6, reward: 82, energy: 30, unlock: 5, weight: 2, limit: 2,
    attacks: [{ reach: 430, speed: 310, damage: 7 }]
  },
  crossfire: {
    name: 'Crossfire', color: '#f3ab8e', armor: '#734443', r: 21, hp: 62, speed: 103, range: 267, strafe: .55, barrels: 2,
    interval: 2.12, contact: 10, reward: 68, energy: 25, unlock: 9, weight: 5,
    attacks: [{ windup: .42, reach: 462, count: 2, spread: .15, speed: 394, life: 1.25, damage: 8.5 }]
  },
  triad: {
    name: 'Triad', color: '#b4b3ff', armor: '#504772', r: 24, hp: 80, speed: 88, range: 244, strafe: .34, barrels: 3,
    interval: 2.48, contact: 13, reward: 76, energy: 28, unlock: 13, weight: 4,
    attacks: [{ windup: .61, reach: 507, count: 3, spread: .23, speed: 423, life: 1.27, damage: 9 }]
  }
};

// These forms occupy their original role's slot in the wave roster.
const enemyEvolutions = {
  scout: {
    wave: 7, name: 'Interceptor', color: '#ffadcb', speed: 155, range: 102, strafe: .32,
    attacks: [{ windup: .38, reach: 278, speed: 360, damage: 7, bursts: 2, burstDelay: .22 }]
  },
  gunner: {
    wave: 10, name: 'Cycler', color: '#ffe199', range: 280, strafe: .64,
    attacks: [{ windup: .46, reach: 501, speed: 405, damage: 8, bursts: 2, burstDelay: .29 }]
  },
  rammer: {
    wave: 12, name: 'Breaker', color: '#ffb28c', r: 24,
    attacks: [
      { kind: 'charge', windup: .87, reach: 384, speed: 535, duration: .73, damage: 21 },
      { kind: 'radial', windup: .78, reach: 255, count: 8, speed: 310, life: 1.0, damage: 8 }
    ]
  },
  flanker: {
    wave: 15, name: 'Pincer', color: '#ff9bdc', speed: 156, strafe: 1.02, switchFlank: true,
    attacks: [{ windup: .47, reach: 355, speed: 460, life: .89, damage: 7.5, bursts: 2, burstDelay: .24 }]
  },
  sniper: {
    wave: 17, name: 'Deadeye', color: '#b1ccff', barrelLength: 6,
    attacks: [{ windup: 1.05, reach: 610, speed: 685, life: 1.12, damage: 12, bursts: 2, burstDelay: .32 }]
  },
  heavy: {
    wave: 19, name: 'Dreadnought', color: '#f4a5ff', r: 30,
    attacks: [
      { windup: .55, reach: 477, count: 3, spread: .29, speed: 376, damage: 11 },
      { kind: 'radial', windup: .85, reach: 245, count: 10, speed: 309, life: 1.05, damage: 9 }
    ]
  },
  bulwark: {
    wave: 21, name: 'Aegis', color: '#fff09b', guardRange: 178, guardReduction: .32,
    attacks: [{ windup: .56, reach: 405, count: 2, spread: .16, speed: 386, damage: 11 }]
  },
  mortar: {
    wave: 23, name: 'Siege Mortar', color: '#ffb6ee',
    attacks: [{ kind: 'mortar', windup: 1.31, reach: 560, radius: 55, count: 3, damage: 17 }]
  },
  mechanic: {
    wave: 25, name: 'Field Medic', color: '#ceffc0', repairTargets: 2, repairRange: 195,
    attacks: [{ reach: 465, speed: 335, damage: 7 }]
  },
  crossfire: {
    wave: 27, name: 'Cyclone', color: '#ffc8aa', interval: 2.35,
    attacks: [{ windup: .51, reach: 480, count: 2, spread: .19, speed: 432, life: 1.22, damage: 8, bursts: 2, burstDelay: .28 }]
  },
  triad: {
    wave: 30, name: 'Cerberus', color: '#d1caff', r: 26,
    attacks: [
      { windup: .65, reach: 550, count: 3, spread: .29, speed: 456, life: 1.3, damage: 9.5 },
      { windup: .82, reach: 600, count: 3, spread: .10, speed: 530, life: 1.18, damage: 10.5 }
    ]
  }
};

const enemyAdvancedForms = {
  scout: {
    wave: 24, name: 'Viper', color: '#ffc4df', speed: 162,
    attacks: [{ windup: .49, reach: 305, speed: 391, damage: 7, bursts: 3, burstDelay: .22 }]
  },
  gunner: {
    wave: 26, name: 'Repeater', color: '#ffd69b', range: 310,
    attacks: [{ windup: .57, reach: 550, speed: 452, damage: 8, bursts: 3, burstDelay: .26 }]
  },
  rammer: {
    wave: 28, name: 'Siegebreaker', color: '#ffd0a6', range: 132, r: 26,
    attacks: [
      { kind: 'charge', windup: .98, reach: 445, speed: 615, duration: .74, damage: 24 },
      { kind: 'radial', windup: .86, reach: 290, count: 12, speed: 344, life: 1.04, damage: 9 }
    ]
  },
  flanker: {
    wave: 31, name: 'Ambusher', color: '#ffc1f4', speed: 164, strafe: 1.10, switchFlank: false,
    attacks: [
      { windup: .56, reach: 385, speed: 489, life: .95, damage: 8, bursts: 2, burstDelay: .24 },
      { windup: .61, reach: 345, count: 3, spread: .22, speed: 382, life: .98, damage: 8 }
    ]
  },
  sniper: {
    wave: 33, name: 'Longbow', color: '#cee0ff', barrelLength: 9, range: 455,
    attacks: [{ windup: 1.14, reach: 685, speed: 755, life: 1.13, damage: 13, bursts: 3, burstDelay: .30 }]
  },
  heavy: {
    wave: 35, name: 'Warhound', color: '#f6bcff', r: 31,
    attacks: [
      { windup: .72, reach: 530, count: 3, spread: .27, speed: 415, damage: 10, bursts: 2, burstDelay: .27 },
      { kind: 'radial', windup: .94, reach: 280, count: 12, speed: 328, life: 1.06, damage: 10 }
    ]
  },
  bulwark: {
    wave: 37, name: 'Citadel', color: '#fff9bf', guardRange: 198, guardReduction: .37,
    attacks: [{ windup: .68, reach: 455, count: 2, spread: .19, speed: 395, damage: 10, bursts: 2, burstDelay: .27 }]
  },
  mortar: {
    wave: 39, name: 'Barrage Mortar', color: '#ffd3f1',
    attacks: [
      { kind: 'mortar', windup: 1.47, reach: 610, radius: 52, count: 3, damage: 18 },
      { kind: 'mortar', windup: 1.16, reach: 535, radius: 83, damage: 20 }
    ]
  },
  mechanic: {
    wave: 41, name: 'Triage Tank', color: '#dcffd6', repairTargets: 3, repairRange: 207, sideRepair: .35,
    attacks: [{ windup: .49, reach: 482, speed: 356, damage: 8, bursts: 2, burstDelay: .28 }]
  },
  crossfire: {
    wave: 44, name: 'Tempest', color: '#ffddbe', interval: 2.55,
    attacks: [{ windup: .64, reach: 525, count: 2, spread: .19, speed: 469, life: 1.29, damage: 8.5, bursts: 3, burstDelay: .24 }]
  },
  triad: {
    wave: 47, name: 'Hydra', color: '#e2dbff', r: 27,
    attacks: [
      { windup: .79, reach: 575, count: 3, spread: .30, speed: 485, life: 1.31, damage: 10, bursts: 2, burstDelay: .29 },
      { windup: .87, reach: 625, count: 3, spread: .13, speed: 561, life: 1.22, damage: 11 }
    ]
  }
};

function enemyForm(kind, form) {
  if (form === 3) return { ...enemyTypes[kind], ...enemyEvolutions[kind], ...enemyAdvancedForms[kind] };
  if (form === 2) return { ...enemyTypes[kind], ...enemyEvolutions[kind] };
  return enemyTypes[kind];
}

const bossTypes = [
  {
    kind: 'gatekeeper', name: 'Gatekeeper', color: '#ffb77e', armor: '#7b4547',
    r: 43, hp: 750, speed: 86, range: 217, strafe: .18, interval: 2.0, contact: 19, barrels: 3, turret: 8,
    reward: 640, energy: 135, attacks: [
      { kind: 'radial', name: 'Shockwave salvo', windup: .96, reach: 400, count: 14, speed: 285, life: 1.8, damage: 15 },
      { name: 'Scatter volley', windup: .77, reach: 515, count: 5, spread: .21, speed: 380, life: 1.4, damage: 14 }
    ], phaseAttack: { kind: 'radial', name: 'Breach ring', windup: 1.15, reach: 450, count: 20, speed: 345, life: 1.6, damage: 17 }
  },
  {
    kind: 'arc-warden', name: 'Arc Warden', color: '#79ecef', armor: '#376773',
    hint: 'Ground markers become electrical pools. Keep moving.',
    r: 41, hp: 660, speed: 87, range: 262, strafe: .22, interval: 2.10, contact: 17, barrels: 2, turret: 4,
    reward: 880, energy: 170, attacks: [
      { kind: 'field', name: 'Arc pools', windup: 1.22, reach: 560, radius: 82, count: 2, duration: 3.1, damage: 10 },
      { name: 'Arc bolts', windup: .79, reach: 545, count: 4, spread: .20, speed: 434, life: 1.37, damage: 12 }
    ], phaseAttack: { kind: 'field', name: 'Grid overload', windup: 1.43, reach: 615, radius: 86, count: 3, duration: 3.6, damage: 13 }
  },
  {
    kind: 'siege', name: 'Siege Engine', color: '#f9a1df', armor: '#754465',
    r: 47, hp: 630, speed: 71, range: 285, strafe: .19, interval: 2.15, contact: 20, barrels: 3,
    reward: 880, energy: 170, attacks: [
      { kind: 'mortar', name: 'Cluster bombardment', windup: 1.3, reach: 580, radius: 64, count: 3, damage: 24 },
      { name: 'Triple rail shot', windup: .95, reach: 590, count: 3, spread: .12, speed: 635, life: 1.15, damage: 18 }
    ], phaseAttack: { kind: 'mortar', name: 'Carpet barrage', windup: 1.48, reach: 650, radius: 69, count: 5, damage: 27 }
  },
  {
    kind: 'fabricator', name: 'Fabricator', color: '#9ae899', armor: '#416b53',
    hint: 'Watch for escort deployment markers.',
    r: 46, hp: 685, speed: 77, range: 273, strafe: .16, interval: 2.2, contact: 19, barrels: 2, turret: 8,
    reward: 1320, energy: 220, attacks: [
      { name: 'Forge volley', windup: .87, reach: 560, count: 4, spread: .18, speed: 460, life: 1.35, damage: 13 },
      { kind: 'summon', name: 'Deploy escort', windup: 1.18, reach: 620, escorts: ['gunner', 'crossfire'] }
    ], phaseAttack: { kind: 'summon', name: 'Deploy strike team', windup: 1.35, reach: 620, escorts: ['triad', 'crossfire', 'gunner'] }
  },
  {
    kind: 'rift', name: 'Rift Runner', color: '#c8a4ff', armor: '#634592',
    r: 39, hp: 650, speed: 123, range: 184, strafe: .29, interval: 1.7, contact: 18, turret: 3,
    reward: 1120, energy: 205, attacks: [
      { kind: 'charge', name: 'Rift charge', windup: .91, reach: 365, speed: 525, duration: .67, damage: 29 },
      { kind: 'radial', name: 'Rift pulse', windup: .76, reach: 440, count: 18, speed: 340, life: 1.5, damage: 18 }
    ], phaseAttack: { kind: 'charge', name: 'Rift overrun', windup: 1.06, reach: 515, speed: 630, duration: .82, damage: 32 }
  },
  {
    kind: 'prism-core', name: 'Prism Core', color: '#ffe69c', armor: '#776447',
    hint: 'Solid cover blocks the sweeping beam.',
    r: 44, hp: 720, speed: 94, range: 280, strafe: .16, interval: 2.06, contact: 19, turret: 3,
    reward: 1660, energy: 255, attacks: [
      { kind: 'beam', name: 'Prism sweep', windup: 1.17, reach: 585, sweep: 1.03, duration: .86, damage: 26 },
      { kind: 'radial', name: 'Refraction', windup: .87, reach: 455, count: 12, speed: 420, life: 1.28, damage: 14 }
    ], phaseAttack: { kind: 'beam', name: 'Reverse sweep', windup: 1.42, reach: 660, sweep: -1.58, duration: .84, damage: 30 }
  }
];

const waveRules = [
  { name: 'Blitz', description: 'Tanks move 15% faster and recover from attacks 10% faster.', speed: 1.15, cooldown: .9, hull: 1, elites: 0 },
  { name: 'Fortified', description: 'Tanks have 25% more hull.', speed: 1, cooldown: 1, hull: 1.25, elites: 0 },
  { name: 'Elite patrol', description: 'Two additional elite tanks join this wave.', speed: 1, cooldown: 1, hull: 1, elites: 2 }
];

function ruleForWave(wave) {
  return wave > 0 && wave % 5 === 0 ? waveRules[(wave / 5 - 1) % waveRules.length] : null;
}

function enemyScaling(type, wave, bossTier = 0) {
  const depth = wave - 1;
  if (bossTier) {
    const tier = bossTier - 1;
    return {
      maxHp: Math.round(type.hp * (1.08 + tier * .22 + depth * .03)),
      power: 1.08 + Math.min(.45, tier * .085) + Math.min(.35, depth * .009),
      speed: type.speed * (1 + Math.min(.12, depth * .006)),
      cooldownScale: .90 - Math.min(.16, depth * .007),
      windupScale: .91 - Math.min(.15, depth * .005)
    };
  }

  const special = type.attacks.some(attack => attack.windup || attack.count > 1);
  return {
    maxHp: Math.round(type.hp * (1.05 + depth * .10 + Math.max(0, depth - 9) * .022)),
    power: 1.10 + Math.min(.95, depth * .039),
    speed: type.speed * (1 + Math.min(.22, depth * .011)),
    cooldownScale: special ? .82 - Math.min(.22, depth * .012) : 1 - Math.min(.15, depth * .007),
    windupScale: .85 - Math.min(.15, depth * .0085)
  };
}

function waveSize(wave) {
  if (wave <= 15) return 7 + Math.floor((wave - 1) * 1.65);
  if (wave <= 30) return 30 + (wave - 15);
  return Math.min(60, 45 + Math.floor((wave - 30) / 2));
}

function waveActiveLimit(wave) {
  return Math.min(14, 7 + Math.floor((wave - 1) / 3));
}

function waveSpawnInterval(wave) {
  return Math.max(.42, .74 - (wave - 1) * .028);
}

function promoteEnemies(roster, wave, forms, form, share, rng) {
  const candidates = roster.filter(entry => entry.form < form && wave >= (forms[entry.kind]?.wave ?? Infinity));
  let slots = Math.round(roster.length * share) - roster.filter(entry => entry.form >= form).length;
  for (const [index, entry] of candidates.entries()) {
    if (slots <= 0) break;
    if (rng() * (candidates.length - index) < slots) {
      entry.form = form;
      slots--;
    }
  }
}

function waveRoster(wave, rng = Math.random) {
  const size = waveSize(wave);
  const available = Object.entries(enemyTypes).filter(([, type]) => type.unlock <= wave);
  // Debut waves always feature their new role or evolved form.
  const roster = available.filter(([kind, type]) => type.unlock === wave || enemyEvolutions[kind]?.wave === wave
    || enemyAdvancedForms[kind]?.wave === wave).map(([kind]) => ({
    kind, form: enemyAdvancedForms[kind]?.wave === wave ? 3 : enemyEvolutions[kind]?.wave === wave ? 2 : 1
  }));
  const used = new Map(roster.map(({ kind }) => [kind, 1]));
  const multiGunShare = Math.min(.56, .28 + (wave - 9) * .014);
  let multiGunSlots = Math.round(size * multiGunShare)
    - roster.filter(({ kind }) => enemyTypes[kind].barrels >= 2).length;
  while (roster.length < size) {
    // Spread the heavier weapons through the queue while keeping their share predictable.
    const multiGun = wave >= 9 ? rng() * (size - roster.length) < multiGunSlots : null;
    const pool = available.filter(([kind, type]) => (used.get(kind) ?? 0) < (type.limit ?? size)
      && (multiGun === null || (type.barrels >= 2) === multiGun));
    let roll = rng() * pool.reduce((total, [, type]) => total + type.weight, 0);
    for (const [kind, type] of pool) {
      roll -= type.weight;
      if (roll < 0) {
        roster.push({ kind, form: 1 });
        used.set(kind, (used.get(kind) ?? 0) + 1);
        if (multiGun) multiGunSlots--;
        break;
      }
    }
  }
  // The third forms take up part of the wave's existing evolution budget.
  promoteEnemies(roster, wave, enemyAdvancedForms, 3, Math.min(.44, .06 + (wave - 24) * .013), rng);
  promoteEnemies(roster, wave, enemyEvolutions, 2, Math.min(.82, .10 + (wave - 7) * .019), rng);
  const eliteCount = wave >= 4 ? Math.min(3, 1 + Math.floor((wave - 4) / 8)) + (ruleForWave(wave)?.elites ?? 0) : 0;
  for (let i = 0; i < eliteCount; i++) {
    roster[Math.floor((i + 1) * roster.length / (eliteCount + 1))].elite = true;
  }
  return roster;
}
