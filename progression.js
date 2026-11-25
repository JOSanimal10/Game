'use strict';

function xpForLevel(level) {
  return 110 + (level - 1) * 40;
}

function waveExperience(wave) {
  return 20 + Math.min(wave * 3, 42);
}

// Later upgrades require points invested in their own path. Ranks are per run.
const upgradePaths = [
  { id: 'firepower', name: 'Firepower', upgrades: [
    { id: 'rounds', name: 'Heavy Rounds', max: 4, needs: 0, detail: '+3.6 damage per shot.', apply: p => p.damage += 3.6 },
    { id: 'accelerator', name: 'Accelerator', max: 4, needs: 0, detail: '10% shorter reload.', apply: p => p.reload *= .90 },
    { id: 'rail', name: 'Rail Chamber', max: 3, needs: 2, detail: '+75 shot speed and 0.10 seconds of flight.', apply: p => { p.shotSpeed += 75; p.shotLife += .10; } },
    { id: 'split', name: 'Split Breech', max: 2, needs: 3, detail: 'Add one projectile per volley. Total volley damage becomes 144% at rank 1 and 171% at rank 2.', apply: p => p.barrels++ },
    { id: 'pierce', name: 'Piercing Tips', max: 2, needs: 5, detail: 'Shots pass through one more target, dealing 65% damage on each follow-up hit.', apply: p => p.pierce++ }
  ] },
  { id: 'defense', name: 'Defense', upgrades: [
    { id: 'hull', name: 'Reinforced Hull', max: 4, needs: 0, detail: '+18 maximum hull and repair 18.', apply: p => { p.maxHp += 18; p.hp += 18; } },
    { id: 'plating', name: 'Reactive Plating', max: 4, needs: 0, detail: 'Reduce incoming damage by another 7 percentage points.', apply: p => p.armor += .07 },
    { id: 'repair', name: 'Field Repairs', max: 3, needs: 2, detail: 'Recover 8 more hull after clearing a wave.', apply: p => p.waveRepair += 8 },
    { id: 'barrier', name: 'Barrier Cells', max: 2, needs: 3, detail: '+12 shield capacity. Recharges when you clear a wave or enter a boss fight.', apply: p => { p.maxShield += 12; p.shield += 12; } },
    { id: 'nanites', name: 'Nanite Recovery', max: 3, needs: 5, detail: 'Recover 0.5 hull per second after 5 seconds without taking damage.', apply: p => p.regen += .5 }
  ] },
  { id: 'mobility', name: 'Mobility', upgrades: [
    { id: 'drive', name: 'Drive Tuning', max: 4, needs: 0, detail: 'Move 6% faster.', apply: p => p.speed *= 1.06 },
    { id: 'mounts', name: 'Shock Mounts', max: 3, needs: 0, detail: 'Reduce collisions and charge damage by 13 percentage points.', apply: p => p.contactArmor += .13 },
    { id: 'skirmish', name: 'Skirmisher', max: 3, needs: 2, detail: '+9% reload speed while moving.', apply: p => p.movingReload += .09 },
    { id: 'afterburn', name: 'Afterburner', max: 3, needs: 3, detail: 'Move another 9% faster for 2 seconds after a hit.', apply: p => p.afterburn += .09 },
    { id: 'slipstream', name: 'Slipstream', max: 2, needs: 4, detail: 'Move another 11% faster when you stop firing for 0.65 seconds.', apply: p => p.coast += .11 }
  ] },
  { id: 'systems', name: 'Systems', upgrades: [
    { id: 'magnet', name: 'Magnet Coil', max: 4, needs: 0, detail: 'Pull in energy from 33 units farther away.', apply: p => p.pickupRange += 33 },
    { id: 'scanner', name: 'Salvage Scanner', max: 3, needs: 0, detail: '+6% XP from energy pickups.', apply: p => p.salvageBonus += .06 },
    { id: 'recycler', name: 'Recycler', max: 3, needs: 2, detail: 'Repair 2 hull when an enemy tank is destroyed.', apply: p => p.killRepair += 2 },
    { id: 'capacitor', name: 'Energy Capacitor', max: 2, needs: 3, detail: '+12% shot damage for 2 seconds after collecting energy.', apply: p => p.energyDamage += .12 },
    { id: 'volatile', name: 'Volatile Core', max: 3, needs: 5, detail: 'Every fourth volley hits nearby enemy tanks for 8.1 blast damage per rank.', apply: p => p.blastDamage += 8.1 }
  ] },
  { id: 'munitions', name: 'Munitions', upgrades: [
    { id: 'critical', name: 'Precision Rounds', max: 3, needs: 0, detail: '+6% chance for a critical volley dealing 150% damage.', apply: p => p.critChance += .06 },
    { id: 'caliber', name: 'Wide Caliber', max: 3, needs: 0, detail: 'Increase bullet radius by 0.7 units.', apply: p => p.shotRadius += .7 },
    { id: 'cryo', name: 'Cryo Rounds', max: 3, needs: 2, detail: 'Hits slow tank movement by 8% per rank for 0.8s. Bosses receive half the slow.', apply: p => p.slowPower += .08 },
    { id: 'execution', name: 'Finisher', max: 3, needs: 3, detail: '+12% shot damage against tanks below 30% hull.', apply: p => p.executeDamage += .12 },
    { id: 'bossbreaker', name: 'Boss Breaker', max: 3, needs: 5, detail: '+10% shot damage against bosses and elite tanks.', apply: p => p.bossDamage += .10 }
  ] },
  { id: 'tactics', name: 'Tactics', upgrades: [
    { id: 'cycle', name: 'Rapid Cycling', max: 3, needs: 0, detail: 'Reduce active ability cooldown by 8%.', apply: p => p.abilityCooldown *= .92 },
    { id: 'reserve', name: 'Emergency Reserve', max: 3, needs: 0, detail: 'Restore 3 hull each time you use your ability.', apply: p => p.abilityRepair += 3 },
    { id: 'extension', name: 'Extended Activation', max: 2, needs: 2, detail: '+15% ability duration. Also extends EMP radius and increases Repair kit healing.', apply: p => p.abilityDuration += .15 },
    { id: 'followup', name: 'Follow-through', max: 3, needs: 3, detail: '+8% shot damage for 2 seconds after activating an ability.', apply: p => p.abilityDamage += .08 },
    { id: 'recharge', name: 'Combat Recharge', max: 3, needs: 5, detail: 'Destroying a tank removes 0.15s from your ability cooldown per rank.', apply: p => p.killRecharge += .15 }
  ] }
];

function upgradeRank(player, upgrade) {
  return player.ranks[upgrade.id] ?? 0;
}

function pathPoints(player, path) {
  return path.upgrades.reduce((total, upgrade) => total + upgradeRank(player, upgrade), 0);
}

function canUpgrade(player, path, upgrade) {
  return upgradeRank(player, upgrade) < upgrade.max && pathPoints(player, path) >= upgrade.needs;
}
