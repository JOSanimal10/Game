'use strict';

const sectors = [
  {
    name: 'Transit Yard', center: '#241a3c', edge: '#101322', color: '#a78bdd',
    cover: [[-320, -165, 45], [320, 165, 45], [-515, 200, 54], [515, -200, 54], [0, -440, 42], [0, 440, 42],
      [-870, -405, 53], [870, 405, 53], [-910, 360, 42], [910, -360, 42]]
  },
  {
    name: 'Foundry', center: '#38222c', edge: '#1d151e', color: '#e69c82', vents: true,
    cover: [[-270, -110, 42], [270, 110, 42], [-500, -110, 54], [500, 110, 54], [-690, 310, 51], [690, -310, 51],
      [-250, 480, 57], [250, -480, 57], [-940, -450, 45], [940, 450, 45]]
  },
  {
    name: 'Relay Station', center: '#142c37', edge: '#111a29', color: '#81beda',
    cover: [[0, -225, 59], [0, 225, 59], [-360, 0, 48], [360, 0, 48], [-565, -255, 47], [565, 255, 47],
      [-720, 270, 60], [720, -270, 60], [-995, -250, 43], [995, 250, 43]]
  }
];

const contractTypes = [
  { id: 'hold', name: 'Hold the zone', detail: 'Stay inside the marked zone for 7 seconds total.', seconds: 24, goal: 7 },
  { id: 'hunt', name: 'Elite hunt', detail: 'Destroy the marked elite.', seconds: 24 },
  { id: 'salvage', name: 'Salvage run', detail: 'Collect 60 energy from drops and destroyed shapes.', seconds: 28, goal: 60, unit: 'energy' },
  { id: 'sweep', name: 'Tank sweep', detail: 'Destroy five enemy tanks.', seconds: 32, goal: 5, unit: 'tanks', needsTargets: true },
  { id: 'supply', name: 'Supply run', detail: 'Drive over all the marked supply crates. Radar shows their locations.', seconds: 23, goal: 3, unit: 'crates' },
  { id: 'ability', name: 'Ability strike', detail: 'Destroy two tanks within 3 seconds of using your ability. You can use more than one activation.', seconds: 35, goal: 2, unit: 'takedowns', needsTargets: true }
];

const modules = [
  { id: 'impact-fuse', name: 'Impact Fuse', detail: 'Every fourth volley adds 10 blast damage around the impact.', apply: p => p.blastDamage += 10 },
  { id: 'spare-cell', name: 'Spare Cell', detail: 'Gain 16 shield capacity and refill 16 shield now.', apply: p => { p.maxShield += 16; p.shield += 16; } },
  { id: 'field-kit', name: 'Field Kit', detail: 'Repair 24 hull now and recover 4 more after clearing each wave.', apply: p => { p.hp = Math.min(p.maxHp, p.hp + 24); p.waveRepair += 4; } },
  { id: 'boost-coil', name: 'Boost Coil', detail: 'Move 7% faster and charge your ability 10% sooner.', apply: p => { p.speed *= 1.07; p.abilityCooldown *= .90; } },
  { id: 'weak-point', name: 'Weak Point Scanner', detail: 'Deal 14% extra damage against elite tanks and bosses.', apply: p => p.bossDamage += .14 },
  { id: 'recovery', name: 'Recovery Circuit', detail: 'Repair 1 hull and cut 0.2 seconds from your ability cooldown for each tank destroyed.', apply: p => { p.killRepair++; p.killRecharge += .2; } },
  { id: 'overrun', name: 'Overrun Drive', detail: 'Move 10% faster for 2 seconds after a hit and recover 4 more hull at wave clear.', apply: p => { p.afterburn += .10; p.waveRepair += 4; } },
  { id: 'prism', name: 'Prism Barrel', detail: 'Add 55 shot speed and 0.6 units of projectile radius.', apply: p => { p.shotSpeed += 55; p.shotRadius += .6; } },
  { id: 'collector', name: 'Salvage Net', detail: 'Pull in energy from 50 units farther away.', apply: p => p.pickupRange += 50 },
  { id: 'cold-circuit', name: 'Cold Circuit', detail: 'Shots add an 8% slow and abilities recharge 6% sooner.', apply: p => { p.slowPower += .08; p.abilityCooldown *= .94; } }
];
