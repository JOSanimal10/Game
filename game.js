'use strict';

const byId = id => document.getElementById(id);
const arena = byId('arena');
const field = byId('field');
const ctx = field.getContext('2d');
const radar = byId('radar').getContext('2d');
const ui = Object.fromEntries([
  'wave', 'remaining', 'sound', 'pause', 'notice', 'score', 'best', 'hull', 'health',
  'level', 'xp-label', 'xp', 'overlay', 'eyebrow', 'headline', 'description',
  'paths', 'choices', 'primary', 'primary-label', 'lobby', 'launch', 'lobby-best', 'match',
  'sound-label', 'combat-hud', 'tank-status', 'run-summary', 'final-wave', 'final-level', 'final-score', 'final-best',
  'boss-hud', 'boss-name', 'boss-level', 'boss-meter', 'boss-health', 'boss-attack',
  'tank-class', 'ability-select', 'tank-help', 'ability-help', 'ability-button', 'ability-name', 'ability-ready',
  'return-lobby', 'wave-rule', 'tank-preview', 'tank-preview-mobile', 'tank-stats', 'build-stats', 'build-stats-list', 'ability-timing',
  'boss-windup', 'tank-finish', 'unlock-list', 'screen-shake', 'pause-shake', 'pause-controls',
  'contract', 'contract-name', 'contract-info', 'accept-contract', 'final-kills', 'final-damage', 'final-bosses',
  'final-contracts', 'final-build', 'final-loadout', 'final-cause', 'final-unlocks', 'build-list', 'build-details', 'final-build-stats',
  'field-guide', 'finish-preview', 'difficulty', 'difficulty-help', 'career-shop', 'run-coins', 'final-coins',
  'touch-pad-hints', 'touch-aim-label', 'touch-aim', 'pause-touch-aim', 'pause-touch-controls', 'ability-control'
].map(id => [id, byId(id)]));
const world = { w: 2500, h: 1800 };
const extractionZone = { x: world.w / 2, y: world.h / 2, r: 105 };
const extractionHold = 2;
const colors = { player: '#82f9dd', danger: '#ff7997', core: '#9fbaff', blast: '#c0a2ff' };
const shapeColors = { 3: '#62d8cc', 4: '#efbb7c', 5: '#b28dff' };
const shapeEnergy = { 3: 8, 4: 10, 5: 13 };

const keys = new Set();
const pointer = { x: 0, y: 0, down: false, active: false };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const coarsePointer = matchMedia('(pointer: coarse)');
const stickRadius = 42;
const stickDeadZone = 7;
let touchInput = coarsePointer.matches;
let leftTouch, rightTouch;
let autoAim = false, aimTarget, aimRefreshAt = 0;
let width, height, zoom, camera;
let player, enemies, shapes, shots, motes, sparks, scorePops, groundBursts;
let state = 'menu', wave, reinforcements, spawnIn, nextWave, score, xp, level, choicesDue, elapsed;
let boss, bossFields, bossLevels, banner, bannerText, upgradePath;
let cover, sector, arenaFloor, vent, nextVent, contract, run, damagePops, shake, hitSoundAt;
let difficulty = difficultyModes[1], coinDrops, extraction;
let best = 0, sound = false, audio;
let unlocked = new Set(), screenShake = !reducedMotion.matches;
try {
  best = Number(localStorage.getItem('iron-circuit-best')) || 0;
  const saved = JSON.parse(localStorage.getItem('iron-circuit-pilot'));
  if (Array.isArray(saved?.unlocked)) unlocked = new Set(saved.unlocked.filter(id => Object.hasOwn(unlockMilestones, id)));
  if (typeof saved?.screenShake === 'boolean') screenShake = saved.screenShake;
  if (typeof saved?.autoAim === 'boolean') autoAim = saved.autoAim;
} catch {}
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const random = (low, high) => low + Math.random() * (high - low);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const xpNeeded = () => xpForLevel(level);

function volleyStats(tank) {
  const barrels = tank.barrels ?? 1;
  const count = tank.pellets + barrels - 1;
  const pelletScale = [1, 1.44, 1.71][barrels - 1] * tank.pellets / count;
  return { count, damage: tank.damage * (tank.damageScale ?? 1) * pelletScale };
}

function incomingDamageScale(tank, contact = false) {
  return (1 - (tank.armor ?? 0)) * (contact ? 1 - (tank.contactArmor ?? 0) : 1);
}

function renderTankStats(list, tank, prefix) {
  const number = (value, digits = 1) => value.toLocaleString(undefined, { maximumFractionDigits: digits });
  const { count, damage } = volleyStats(tank);
  const stats = [
    ['hull', 'Max hull', number(tank.maxHp ?? tank.hp, 0), 'Hull capacity before shields.'],
    ['resistance', 'Resistance', number((1 - incomingDamageScale(tank)) * 100) + '%', 'Reduction to incoming damage before shields.'],
    ['speed', 'Move speed', number(tank.speed, 0) + ' u/s', 'Movement speed in arena units per second before temporary boosts.'],
    ['damage', 'Damage', number(damage) + (count > 1 ? ' × ' + count : ''), 'Base damage per projectile, with the number fired per volley.'],
    ['reload', 'Reload', number(tank.reload, 2) + ' s', 'Time between volleys before conditional bonuses.'],
    ['range', 'Shot range', number(tank.shotSpeed * tank.shotLife, 0) + ' u', 'Approximate distance a shot can travel after leaving the cannon.']
  ];
  if (tank.contactArmor) stats.push(['impact', 'Impact resist.', number((1 - incomingDamageScale(tank, true)) * 100) + '%', 'Total damage reduction against collisions and charges, including regular resistance.']);
  if (tank.maxShield) stats.push(['shield', 'Max shield', number(tank.maxShield, 0), 'Shield capacity that refills at wave clear and before boss fights.']);
  if (tank.ability && tank.pierce) stats.push(['pierce', 'Pierce', (tank.pierce + 1) + ' targets', 'Maximum targets hit by each projectile.']);
  if (tank.movingReload) stats.push(['moving-reload', 'Moving reload', number(tank.reload / (1 + tank.movingReload), 2) + ' s', 'Time between volleys while moving, before temporary boosts.']);
  if (tank.critChance) stats.push(['crit', 'Crit chance', number(tank.critChance * 100) + '%', 'Chance for a volley to deal 150% damage.']);
  if (tank.ability) stats.push(['cooldown', 'Ability cooldown', number(tank.ability.cooldown * tank.abilityCooldown, 2) + ' s', 'Time before the ability recharges, before any takedown bonuses.']);

  list.replaceChildren(...stats.map(([id, label, value, tip]) => {
    const item = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    item.title = tip;
    term.textContent = label;
    description.id = prefix + '-' + id;
    description.textContent = value;
    item.append(term, description);
    return item;
  }));
}

function savePilot() {
  try { localStorage.setItem('iron-circuit-pilot', JSON.stringify({ unlocked: [...unlocked], screenShake, autoAim })); } catch {}
}

function unlock(id) {
  if (unlocked.has(id)) return;
  unlocked.add(id);
  run.unlocks.push(id);
  savePilot();
}

function resize() {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  if (width && (Math.abs(width - field.clientWidth) > 32 || Math.abs(height - field.clientHeight) > 32)) clearTouchSticks();
  width = field.clientWidth;
  height = field.clientHeight;
  zoom = clamp(width / 1000, .62, 1);
  field.width = width * ratio;
  field.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (state !== 'menu') draw();
}

function reset() {
  difficulty = selectedDifficulty();
  const tankClass = loadoutTank(ui['tank-class'].value, difficulty);
  const available = item => !item.unlock || unlocked.has(item.unlock);
  const ability = activeAbilities.find(item => item.id === ui['ability-select'].value && available(item)) ?? activeAbilities[0];
  const skin = tankFinishes.find(item => item.id === ui['tank-finish'].value && available(item)) ?? tankFinishes[0];
  const finish = tankFinish(tankClass, skin);
  player = {
    x: world.w / 2, y: world.h / 2, r: 21, hp: 100, maxHp: 100, speed: 245, angle: -.65, hit: 0,
    vx: 0, vy: 0,
    damage: 17.1, reload: .25, cooldown: 0, shotSpeed: 660, shotLife: 1.12, barrels: 1, pierce: 0,
    armor: tankClass.armor ?? 0, waveRepair: 0, shield: 0, maxShield: 0, regen: 0,
    contactArmor: 0, movingReload: 0, afterburn: 0, coast: 0,
    pickupRange: 145, salvageBonus: 0, killRepair: 0, energyDamage: 0, blastDamage: 0, volleys: 0,
    damageAt: -Infinity, pickupAt: -Infinity, firedAt: -Infinity, ranks: {},
    classId: tankClass.baseClass ?? tankClass.id, tankId: tankClass.id, tankName: tankClass.name, finish, evolution: null,
    firstEvolution: null, secondEvolution: null, modules: [], pellets: tankClass.pellets, spread: tankClass.spread, damageScale: 1,
    critChance: 0, shotRadius: 4, slowPower: 0, executeDamage: 0, bossDamage: 0,
    ability, abilityReadyAt: 0, abilityUntil: 0, abilityAt: -Infinity, abilityCooldown: 1,
    abilityDuration: 1, abilityRepair: 0, abilityDamage: 0, killRecharge: 0, dashAngle: 0, moveAngle: -.65,
    deflector: 0
  };
  Object.assign(player, { hp: tankClass.hp, maxHp: tankClass.hp, damage: tankClass.damage, reload: tankClass.reload,
    speed: tankClass.speed, shotSpeed: tankClass.shotSpeed, shotLife: tankClass.shotLife, pierce: tankClass.pierce });
  enemies = [];
  shapes = [];
  shots = [];
  motes = [];
  coinDrops = [];
  extraction = null;
  sparks = [];
  scorePops = [];
  groundBursts = [];
  damagePops = [];
  shake = 0;
  hitSoundAt = -Infinity;
  contract = null;
  sector = null;
  cover = [];
  vent = null;
  run = { kills: 0, bosses: 0, damage: 0, contracts: 0, cause: '', unlocks: [], moduleChoices: [],
    coins: 0, points: 0, extracted: false, bonus: 0, hardUnlocked: false, nightmareUnlocked: false };
  wave = 0;
  reinforcements = [];
  nextWave = null;
  boss = null;
  bossFields = [];
  bossLevels = [];
  score = 0;
  xp = 0;
  level = 1;
  choicesDue = 0;
  banner = 0;
  bannerText = '';
  upgradePath = null;
  elapsed = 0;
  setSector(sectors[0]);
  for (let i = 0; i < 85; i++) addShape(i < 14);
}

function addShape(near = false) {
  const sides = Math.random() < .25 ? 5 : Math.random() < .57 ? 4 : 3;
  const angle = random(0, Math.PI * 2);
  const reach = random(125, 460);
  const position = near
    ? { x: player.x + Math.cos(angle) * reach, y: player.y + Math.sin(angle) * reach }
    : { x: random(50, world.w - 50), y: random(50, world.h - 50) };
  if (distance(position, player) < 75 || coverAt(position, sides * 3.7)) return;
  shapes.push({ ...position, sides, angle, r: sides * 3.7, hp: sides * 8, hit: 0, color: shapeColors[sides] });
}

function playTone(freq, duration, volume, type = 'triangle', end = freq / 2) {
  if (!sound || !audio || audio.state !== 'running') return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, now);
  oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(.001, now + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(now + duration);
}

function setState(next) {
  state = next;
  arena.dataset.state = state;
  pointer.down = false;
  clearTouchSticks();
  keys.clear();
  const inLobby = state === 'menu';
  const playing = state === 'playing';
  const paused = state === 'paused';
  ui.lobby.hidden = !inLobby;
  ui.match.hidden = inLobby;
  ui['combat-hud'].hidden = inLobby;
  ui.overlay.hidden = inLobby || playing;
  ui.pause.hidden = !playing && !paused;
  ui['ability-button'].hidden = !playing;
  ui['return-lobby'].hidden = state !== 'ended';
  ui['pause-controls'].hidden = !paused;
  ui['pause-touch-controls'].hidden = !paused;
  ui['touch-pad-hints'].hidden = !playing;
  ui.contract.hidden = !playing || !contract || Boolean(boss);
  const pauseAction = paused ? 'Resume' : 'Pause';
  ui.pause.setAttribute('aria-label', pauseAction);
  ui.pause.title = pauseAction + (touchInput ? '' : ' (P)');
  if (!playing) ui.notice.textContent = '';
  if (playing || inLobby) {
    if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
    return;
  }
  const refit = state === 'upgrade';
  const evolution = state === 'evolution';
  const reward = state === 'reward';
  const choosing = refit || evolution || reward;
  const ended = state === 'ended';
  ui.eyebrow.hidden = !choosing;
  ui.description.hidden = !choosing;
  ui.description.textContent = refit ? 'Spend one point. Investing in a path unlocks its advanced upgrades.' : '';
  ui.paths.hidden = !refit;
  ui.choices.hidden = !choosing;
  ui.primary.hidden = choosing;
  ui['run-summary'].hidden = !ended;
  ui['final-build'].hidden = !ended;
  ui['build-stats'].hidden = ended;
  ui['build-stats'].open = paused;
  if (paused || choosing) renderTankStats(ui['build-stats-list'], player, 'build');
  if (refit) {
    ui.eyebrow.textContent = 'Level ' + (level - choicesDue + 1);
    ui.headline.textContent = 'Pick an upgrade';
    showUpgradePaths();
    return;
  }
  if (evolution || reward) {
    ui.eyebrow.textContent = evolution ? 'Level ' + evolutionDue() : 'Contract complete';
    ui.headline.textContent = evolution ? 'Evolve your tank' : 'Pick a module';
    ui.description.textContent = evolution ? 'Choose a specialization for the rest of this run.' : 'Install one module for the rest of this run.';
    showSpecialChoices(evolution);
    return;
  }
  ui.headline.textContent = ended ? (run.extracted ? 'Extracted' : 'Run complete') : 'Paused';
  ui['primary-label'].textContent = ended ? 'Play again' : 'Resume game';
  if (ended) showRunSummary();
  ui.overlay.scrollTop = 0;
  ui.primary.focus({ preventScroll: true });
}

function showRunSummary() {
  for (const [stat, value] of Object.entries({ wave, level, score, best, kills: run.kills,
    damage: Math.round(run.damage), bosses: run.bosses, contracts: run.contracts })) {
    ui['final-' + stat].textContent = value.toLocaleString();
  }
  ui['final-loadout'].textContent = [player.tankName, player.firstEvolution?.name, player.secondEvolution?.name,
    player.ability.name, difficulty.name].filter(Boolean).join(' · ');
  ui['final-cause'].textContent = run.extracted ? '' : 'Destroyed by ' + run.cause + '.';
  ui['final-coins'].textContent = (run.coins + run.bonus).toLocaleString() + ' coins earned'
    + (run.extracted ? ' · +' + run.bonus.toLocaleString() + ' extraction bonus' : '')
    + (run.points ? ' · +' + run.points.toLocaleString() + ' Evolution Points' : '');
  const unlocks = run.unlocks.map(id => unlockMilestones[id].name);
  if (run.hardUnlocked) unlocks.push('Hard');
  if (run.nightmareUnlocked) unlocks.push('Nightmare');
  ui['final-unlocks'].textContent = unlocks.length ? 'Unlocked ' + unlocks.join(', ') + '.' : '';
  renderTankStats(ui['final-build-stats'], player, 'final-tank');
  const upgrades = upgradePaths.flatMap(path => path.upgrades)
    .filter(upgrade => upgradeRank(player, upgrade))
    .map(upgrade => upgrade.name + ' · Rank ' + upgradeRank(player, upgrade));
  const build = [...player.modules.map(module => module.name + ' · Module'), ...upgrades];
  ui['build-list'].replaceChildren(...(build.length ? build : ['No upgrades installed']).map(name => {
    const item = document.createElement('li');
    item.textContent = name;
    return item;
  }));
  ui['build-details'].open = false;
  refreshEquipment();
}

function showSpecialChoices(evolution) {
  ui.choices.dataset.path = evolution ? 'systems' : 'munitions';
  const milestone = evolution ? evolutionDue() : null;
  const options = evolution
    ? tankEvolutionsAt(player.tankId, milestone).filter(item => !item.price || career.evolutions.includes(item.id))
    : run.moduleChoices;
  ui.choices.replaceChildren(...options.map(option => {
    const button = document.createElement('button');
    const name = document.createElement('strong');
    const detail = document.createElement('span');
    button.type = 'button';
    button.className = 'choice';
    button.dataset.option = option.id;
    name.textContent = option.name;
    detail.className = 'choice-detail';
    detail.textContent = option.detail + (option.price && difficulty.powerShare < 1
      ? ' Extra shop power at ' + Math.round(difficulty.powerShare * 100) + '% on ' + difficulty.name + '.' : '');
    const appearance = { ...player.evolution, ...option };
    if (evolution) {
      const preview = document.createElement('canvas');
      preview.className = 'evolution-preview';
      preview.width = 128;
      preview.height = 80;
      preview.setAttribute('aria-hidden', 'true');
      tank({ ...player, evolution: appearance, r: player.r + (option.size ?? 0), x: 55, y: 41, angle: -.22,
        hit: 0, firedAt: -Infinity, abilityUntil: 0, shield: 0 }, true, preview.getContext('2d'));
      button.append(preview);
    }
    button.append(name, detail);
    button.addEventListener('click', () => {
      if (state !== (evolution ? 'evolution' : 'reward') || (evolution && evolutionDue() !== milestone)) return;
      if (evolution) {
        if (milestone === firstEvolutionLevel) player.firstEvolution = option;
        else player.secondEvolution = option;
        player.evolution = appearance;
        player.r += option.size ?? 0;
        announce(option.name + ' evolution installed', 2.5);
      } else {
        player.modules.push(option);
        run.moduleChoices = [];
      }
      option.apply(player, difficulty.powerShare);
      playTone(380, .27, .06, 'triangle', 730);
      showPendingChoice();
    });
    return button;
  }));
  ui.overlay.scrollTop = 0;
  ui.choices.querySelector('button').focus({ preventScroll: true });
}

function evolutionDue() {
  if (level >= firstEvolutionLevel && !player.firstEvolution) return firstEvolutionLevel;
  if (level >= secondEvolutionLevel && !player.secondEvolution) return secondEvolutionLevel;
  return null;
}

function showPendingChoice() {
  if (evolutionDue()) setState('evolution');
  else if (run.moduleChoices.length) setState('reward');
  else if (choicesDue && upgradePaths.some(pathHasUpgrades)) setState('upgrade');
  else {
    choicesDue = 0;
    if (state !== 'playing') setState('playing');
  }
}

function pathHasUpgrades(path) {
  return path.upgrades.some(upgrade => canUpgrade(player, path, upgrade));
}

function showUpgradePaths() {
  if (!upgradePath || !pathHasUpgrades(upgradePath)) upgradePath = upgradePaths.find(pathHasUpgrades);
  const tabs = upgradePaths.map(path => {
    const button = document.createElement('button');
    const name = document.createElement('strong');
    const points = document.createElement('span');
    button.type = 'button';
    button.className = 'path';
    button.dataset.path = path.id;
    name.textContent = path.name;
    points.textContent = pathPoints(player, path) + ' spent';
    button.append(name, points);
    button.addEventListener('click', () => showUpgradeChoices(path));
    return button;
  });
  ui.paths.replaceChildren(...tabs);
  showUpgradeChoices(upgradePath);
  ui.overlay.scrollTop = 0;
  ui.paths.querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
}

function showUpgradeChoices(path) {
  upgradePath = path;
  for (const tab of ui.paths.children) tab.setAttribute('aria-pressed', String(tab.dataset.path === path.id));
  ui.choices.dataset.path = path.id;
  const options = path.upgrades.map(upgrade => {
    const button = document.createElement('button');
    const name = document.createElement('strong');
    const rank = document.createElement('span');
    const detail = document.createElement('span');
    const current = upgradeRank(player, upgrade);
    button.type = 'button';
    button.className = 'choice';
    button.dataset.upgrade = upgrade.id;
    button.disabled = !canUpgrade(player, path, upgrade);
    name.textContent = upgrade.name;
    rank.className = 'choice-rank';
    rank.textContent = current + ' / ' + upgrade.max;
    detail.className = 'choice-detail';
    detail.textContent = upgrade.detail;
    button.append(name, rank, detail);
    if (button.disabled) {
      const locked = document.createElement('span');
      locked.className = 'choice-lock';
      locked.textContent = current === upgrade.max ? 'Max rank' : 'Requires ' + upgrade.needs + ' points in ' + path.name;
      button.append(locked);
    }
    button.addEventListener('click', () => {
      if (state !== 'upgrade' || !canUpgrade(player, path, upgrade)) return;
      player.ranks[upgrade.id] = upgradeRank(player, upgrade) + 1;
      upgrade.apply(player);
      choicesDue--;
      showPendingChoice();
    });
    return button;
  });
  ui.choices.replaceChildren(...options);
}

function start() {
  reset();
  setState('playing');
  startWave();
  updateHud();
}

function announce(text, duration = 2.2) {
  bannerText = text;
  banner = duration;
}

function startWave() {
  wave++;
  const newMode = wave === difficultyUnlockWave
    ? difficultyModes.find(mode => mode.unlockOn === difficulty.id && !canPlayDifficulty(mode))
    : null;
  if (newMode) {
    career[newMode.id] = true;
    run[newMode.id + 'Unlocked'] = true;
    saveCareer();
  }
  reinforcements = waveRoster(wave);
  spawnIn = .45;
  nextWave = null;
  vent = null;
  const site = sectors[Math.floor((wave - 1) / 4) % sectors.length];
  const changed = sector !== site || wave === 1;
  if (sector !== site) {
    setSector(site);
    for (let i = shapes.length; i < 85; i++) addShape();
  }
  nextVent = elapsed + 9;
  contract = wave % 3 === 0
    ? { ...contractTypes[(wave / 3 - 1) % contractTypes.length], status: 'offered' } : null;
  for (const finish of tankFinishes) {
    if (finish.wave && wave >= finish.wave) unlock(finish.unlock);
  }
  if (wave === 8) unlock('repair-kit');
  const rule = ruleForWave(wave);
  const advanced = Object.values(enemyAdvancedForms).find(form => form.wave === wave);
  const evolution = Object.values(enemyEvolutions).find(form => form.wave === wave);
  const label = newMode ? newMode.name + ' unlocked' : advanced ? 'Form III · ' + advanced.name : evolution ? 'Evolution · ' + evolution.name
    : changed ? sector.name : rule?.name ?? (wave === 4 ? 'Elite tanks incoming' : '');
  announce('Wave ' + wave + (label ? ' · ' + label : ''), label ? 3 : 2.2);
  playTone(240, .3, .07, 'triangle', 530);
}

function coverAt(position, radius) {
  return cover.find(block => block.hp > 0 && distance(position, block) < radius + block.r);
}

function setSector(site) {
  sector = site;
  cover = site.cover.map(([x, y, r]) => ({
    x: world.w / 2 + x, y: world.h / 2 + y, r, hp: 105, maxHp: 105, hit: 0
  })).filter(block => distance(block, player) > block.r + player.r + 27);
  shapes = shapes.filter(shape => !coverAt(shape, shape.r));
  shots = [];
  arenaFloor = paintArenaFloor();
}

function spawnPosition(min, max, r) {
  const padding = r + 12;
  let furthest;
  let largest = -1;
  for (let i = 0; i < 14; i++) {
    const angle = random(0, Math.PI * 2);
    const reach = random(min, max);
    const point = {
      x: clamp(player.x + Math.cos(angle) * reach, padding, world.w - padding),
      y: clamp(player.y + Math.sin(angle) * reach, padding, world.h - padding)
    };
    if (coverAt(point, r + 12)) continue;
    const separation = distance(point, player);
    if (separation >= min && enemies.every(enemy => distance(point, enemy) > r + enemy.r + 28)) return point;
    if (separation > largest) {
      furthest = point;
      largest = separation;
    }
  }
  if (furthest) return furthest;
  // The open center never contains a cover block.
  return { x: world.w / 2, y: world.h / 2 };
}

function spawnEnemy({ kind, hp: savedHp, elite = false, form = 1, contractTarget = false, bossEscort = false, position }) {
  const type = enemyForm(kind, form);
  const scaling = enemyScaling(type, wave);
  const rule = ruleForWave(wave);
  scaling.maxHp = Math.round(scaling.maxHp * (rule?.hull ?? 1) * (elite ? 1.65 : 1));
  scaling.speed *= (rule?.speed ?? 1) * (elite ? 1.08 : 1);
  scaling.power *= elite ? 1.18 : 1;
  scaling.cooldownScale *= (rule?.cooldown ?? 1) * (elite ? .88 : 1);
  if (bossEscort) {
    scaling.maxHp = Math.min(scaling.maxHp, Math.round(type.hp * 1.65));
    scaling.power *= .72;
  }
  scaling.maxHp = Math.round(scaling.maxHp * difficulty.scale);
  scaling.power *= difficulty.scale;
  const spawn = position ?? spawnPosition(wave <= 2 ? 310 : 360, 615, type.r);
  const flankBalance = type.orbit ? enemies.reduce((balance, ally) => balance + (ally.orbit ? ally.flankSide : 0), 0) : 0;
  const enemy = { ...type, ...spawn, ...scaling, kind, elite, form, contractTarget, bossEscort, hp: savedHp ?? scaling.maxHp,
    reward: Math.round(type.reward * (elite ? 2 : 1) * (1 + (form - 1) * .25)),
    energy: type.energy * (elite ? 1.4 : 1), slowUntil: 0, stunUntil: 0,
    angle: 0, cooldown: random(.9, 1.45) * scaling.cooldownScale, hit: 0, phase: random(0, Math.PI * 2), attackIndex: 0,
    flankSide: flankBalance ? -Math.sign(flankBalance) : Math.random() < .5 ? -1 : 1, repairAt: 0 };
  enemies.push(enemy);
  return enemy;
}

function startBoss(milestone) {
  const tier = milestone / 10;
  const type = bossTypes[(tier - 1) % bossTypes.length];
  const scaling = enemyScaling(type, wave, tier);
  scaling.maxHp = Math.round(scaling.maxHp * difficulty.scale);
  scaling.power *= difficulty.scale;
  // Put surviving tanks back in the wave queue with their remaining hull.
  reinforcements.unshift(...enemies.map(({ kind, hp, elite, form, contractTarget }) => ({ kind, hp, elite, form, contractTarget })));
  enemies = [];
  shots = [];
  bossFields = [];
  vent = null;
  const position = spawnPosition(350, 425, type.r);
  boss = { ...type, ...position, ...scaling, milestone, hp: scaling.maxHp,
    slowUntil: 0, stunUntil: 0,
    angle: 0, cooldown: 1.18 * scaling.cooldownScale, hit: 0, phase: random(0, Math.PI * 2), attackIndex: 0, enraged: false };
  enemies.push(boss);
  repairPlayer(Math.ceil(player.maxHp * .15));
  player.shield = player.maxShield;
  announce(type.hint ?? 'Regular wave on hold', type.hint ? 3.8 : 2.1);
  playTone(140, .52, .09, 'triangle', 290);
}

function finishBoss() {
  boss = null;
  extraction = { left: 30, held: 0 };
  bossFields = [];
  enemies = enemies.filter(enemy => !enemy.bossEscort);
  nextVent = elapsed + 5;
  shots = shots.filter(shot => shot.friendly);
  repairPlayer(Math.ceil(player.maxHp * .18));
  spawnIn = Math.max(spawnIn, 1.5);
  announce('Boss defeated', 2.9);
}

function collectRunCoins(value) {
  career.coins += value;
  run.coins += value;
  saveCareer();
}

function progressDaily(event) {
  if (!difficulty.dailyCoins) return;
  const objective = dailyObjective();
  if (career.daily.claimed || objective.id !== event) return;
  career.daily.progress = Math.min(objective.goal, career.daily.progress + 1);
  if (career.daily.progress < objective.goal) {
    saveCareer();
    return;
  }
  career.daily.claimed = true;
  run.points += difficulty.dailyPoints;
  career.points += difficulty.dailyPoints;
  collectRunCoins(difficulty.dailyCoins);
  announce('Daily complete · +' + difficulty.dailyCoins + ' coins', 3);
  playTone(420, .19, .06, 'triangle', 720);
}

function dropCoins(enemy) {
  const chance = enemy.milestone ? difficulty.bossDrop : enemy.elite ? difficulty.eliteDrop : 0;
  if (!chance || Math.random() >= chance) return;
  coinDrops.push({ x: enemy.x, y: enemy.y, life: 38, value: enemy.milestone ? difficulty.bossCoins : difficulty.eliteCoins });
}

function updateCoinDrops(dt) {
  for (const drop of coinDrops) {
    drop.life -= dt;
    const gap = distance(player, drop);
    if (drop.life > 0 && gap < 26) {
      drop.life = 0;
      collectRunCoins(drop.value);
      playTone(550, .12, .05, 'triangle', 900);
    } else if (gap < player.pickupRange) {
      const pull = Math.min(1, dt * 5);
      drop.x += (player.x - drop.x) * pull;
      drop.y += (player.y - drop.y) * pull;
    }
  }
  coinDrops = coinDrops.filter(drop => drop.life > 0);
}

function updateExtraction(dt) {
  if (!extraction || boss) return;
  const time = Math.min(dt, extraction.left);
  extraction.left -= time;
  extraction.held = distance(player, extractionZone) <= extractionZone.r ? extraction.held + time : 0;
  if (extraction.held + 1e-6 >= extractionHold) {
    run.extracted = true;
    run.bonus = Math.floor(run.coins * .1);
    career.coins += run.bonus;
    saveCareer();
    extraction = null;
    setState('ended');
  } else if (extraction.left <= 0) {
    extraction = null;
  }
}

function contractOffered() {
  return contract?.status === 'offered' && nextWave === null
    && (!contract.needsTargets || enemies.length + reinforcements.length >= contract.goal);
}

function placeSupplyCrates(count) {
  const crates = [];
  const angle = random(0, Math.PI * 2);
  for (const reach of [155, 240, 330]) {
    for (let i = 0; i < 12; i++) {
      const heading = angle + i * Math.PI / 6;
      const point = {
        x: clamp(player.x + Math.cos(heading) * reach, 28, world.w - 28),
        y: clamp(player.y + Math.sin(heading) * reach, 28, world.h - 28)
      };
      if (distance(player, point) < 110 || coverAt(point, 24)) continue;
      if (crates.some(crate => distance(crate, point) < 102)) continue;
      crates.push(point);
      if (crates.length === count) return crates;
    }
  }
  return crates;
}

function acceptContract() {
  if (state !== 'playing' || boss || !contractOffered()) return;
  contract.status = 'active';
  contract.left = contract.seconds;
  contract.held = 0;
  contract.progress = 0;
  if (contract.id === 'hold') {
    const position = spawnPosition(115, 195, 78);
    contract.zone = { ...position, r: 78 };
  } else if (contract.id === 'hunt') {
    const target = { kind: 'flanker', elite: true, contractTarget: true };
    if (enemies.length < waveActiveLimit(wave)) {
      spawnEnemy(target);
      spawnIn = Math.max(spawnIn, waveSpawnInterval(wave));
    } else {
      reinforcements.unshift(target);
    }
  } else if (contract.id === 'supply') {
    contract.crates = placeSupplyCrates(contract.goal);
    contract.goal = contract.crates.length;
  }
  ui['accept-contract'].blur();
  updateHud();
}

function completeContract() {
  if (boss || contract?.status !== 'active') return;
  contract.status = 'complete';
  run.contracts++;
  progressDaily('contracts');
  unlock('amber');
  const pool = modules.filter(module => !player.modules.includes(module));
  if (!pool.length) {
    addScore(300 + wave * 25);
    repairPlayer(Math.ceil(player.maxHp * .12));
    announce('Contract complete · Score and hull restored', 3);
    return;
  }
  while (run.moduleChoices.length < 3 && pool.length) {
    const index = Math.floor(Math.random() * pool.length);
    run.moduleChoices.push(pool.splice(index, 1)[0]);
  }
  announce('Contract complete · Module earned', 3);
}

function advanceContract(id, amount) {
  if (boss || contract?.status !== 'active' || contract.id !== id) return;
  contract.progress += amount;
  if (contract.progress + 1e-6 >= contract.goal) completeContract();
}

function huntTargetPending() {
  return contract?.id === 'hunt' && !enemies.some(enemy => enemy.contractTarget);
}

function updateContract(dt) {
  if (boss || contract?.status !== 'active' || huntTargetPending()) return;
  contract.left = Math.max(0, contract.left - dt);
  if (contract.zone && distance(player, contract.zone) <= contract.zone.r) {
    contract.held += dt;
    if (contract.held >= contract.goal) completeContract();
  } else if (contract.crates) {
    const before = contract.crates.length;
    contract.crates = contract.crates.filter(crate => distance(player, crate) > player.r + 14);
    const collected = before - contract.crates.length;
    if (collected || !contract.goal) {
      burst(player.x, player.y, colors.player, 7);
      advanceContract('supply', collected);
    }
  }
  const outOfTargets = contract.needsTargets && enemies.length + reinforcements.length < contract.goal - contract.progress;
  if (contract.status !== 'active' || (contract.left > 0 && !outOfTargets)) return;
  contract.status = 'failed';
  for (const enemy of [...enemies, ...reinforcements]) enemy.contractTarget = false;
  announce(outOfTargets ? 'Contract incomplete' : 'Contract expired', 2.4);
}

function updateVent() {
  if (!sector.vents || boss || nextWave !== null) return;
  if (!vent && elapsed >= nextVent && enemies.length) {
    vent = { x: player.x, y: player.y, r: 81, at: elapsed + 1.25 };
    playTone(195, .19, .05, 'triangle', 420);
  }
  if (!vent || elapsed < vent.at) return;
  groundBursts.push({ ...vent, color: sector.color, at: elapsed });
  if (distance(vent, player) < vent.r + player.r * .25) {
    damagePlayer((13 + Math.min(wave, 18) * .4) * difficulty.scale, false, 'a foundry vent');
  }
  vent = null;
  nextVent = elapsed + 8.5;
}

function updateWave(dt) {
  if (boss) return;
  if (bossLevels.length && !extraction) {
    startBoss(bossLevels.shift());
    return;
  }
  if (reinforcements.length) {
    spawnIn = Math.max(0, spawnIn - dt);
    if (spawnIn === 0 && enemies.length < waveActiveLimit(wave)) {
      spawnEnemy(reinforcements.shift());
      spawnIn = waveSpawnInterval(wave);
    }
    return;
  }
  if (enemies.length || contract?.status === 'active') return;
  if (nextWave === null) {
    nextWave = 2.4;
    progressDaily('waves');
    vent = null;
    xp += waveExperience(wave);
    repairPlayer(9 + Math.ceil(player.maxHp * .03) + player.waveRepair);
    player.shield = player.maxShield;
    shots = shots.filter(shot => shot.friendly);
  }
  nextWave -= dt;
  if (nextWave <= 0) startWave();
}

function move(entity, dx, dy, dt) {
  const desired = { x: entity.x + dx * dt, y: entity.y + dy * dt };
  const point = {
    x: clamp(desired.x, entity.r, world.w - entity.r),
    y: clamp(desired.y, entity.r, world.h - entity.r)
  };
  const block = coverAt(point, entity.r);
  if (block && distance(point, block) <= distance(entity, block)) {
    if (!coverAt({ x: point.x, y: entity.y }, entity.r)) entity.x = point.x;
    else if (!coverAt({ x: entity.x, y: point.y }, entity.r)) entity.y = point.y;
    return true;
  }
  Object.assign(entity, point);
  return point.x !== desired.x || point.y !== desired.y || Boolean(block);
}

const detourAngles = [.55, 1.10, 1.57, 2.15, 2.72, Math.PI];

function openDriveLane(enemy, x, y) {
  const point = { x: enemy.x + x * 66, y: enemy.y + y * 66 };
  const r = enemy.r;
  return point.x >= r && point.x <= world.w - r && point.y >= r && point.y <= world.h - r
    && !blockedLane(enemy, point, r);
}

function steerEnemy(enemy, dx, dy, dt) {
  const speed = Math.hypot(dx, dy);
  if (!speed) return;
  if (!openDriveLane(enemy, dx / speed, dy / speed)) {
    const heading = Math.atan2(dy, dx);
    const side = enemy.detourSide ?? enemy.flankSide ?? 1;
    for (const turn of detourAngles) {
      for (const direction of [side, -side]) {
        const angle = heading + turn * direction;
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        if (!openDriveLane(enemy, x, y)) continue;
        enemy.detourSide = direction;
        move(enemy, x * speed, y * speed, dt);
        return;
      }
    }
  }
  move(enemy, dx, dy, dt);
}

function launchShot(tank, angle, { speed, ...projectile }) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  shots.push({ ...projectile, x: tank.x + dx * (tank.r + 14), y: tank.y + dy * (tank.r + 14),
    vx: dx * speed, vy: dy * speed });
}

function shootPlayer() {
  player.firedAt = elapsed;
  player.volleys++;
  const { count, damage: baseDamage } = volleyStats(player);
  const energyBoost = elapsed - player.pickupAt < 2 ? player.energyDamage : 0;
  const abilityBoost = elapsed - player.abilityAt < 2 ? player.abilityDamage : 0;
  const critical = Math.random() < player.critChance;
  const damage = baseDamage * (1 + energyBoost + abilityBoost) * (critical ? 1.5 : 1);
  for (let i = 0; i < count; i++) {
    const angle = player.angle + (i - (count - 1) / 2) * player.spread;
    const blast = player.volleys % 4 === 0 && i === Math.floor(count / 2) ? player.blastDamage : 0;
    launchShot(player, angle, { speed: player.shotSpeed, life: player.shotLife, r: player.shotRadius + (blast ? 1 : 0),
      color: critical ? '#ffe78f' : blast ? colors.blast : colors.player, damage, friendly: true,
      hits: 1 + player.pierce, blast, slow: player.slowPower, execute: player.executeDamage, bossBonus: player.bossDamage, critical });
  }
  shake = Math.max(shake, player.classId === 'vanguard' ? 1.1 : 2.7);
  playTone(...(player.evolution?.sound ?? tankSounds[player.classId]));
}

function blockedLane(from, to, padding = 0) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return false;
  return cover.some(block => {
    if (block.hp <= 0) return false;
    const x = block.x - from.x, y = block.y - from.y;
    const fraction = clamp((x * dx + y * dy) / lengthSquared, 0, 1);
    const nearestX = dx * fraction - x, nearestY = dy * fraction - y;
    const radius = block.r + padding;
    return nearestX * nearestX + nearestY * nearestY < radius * radius;
  });
}

function enemyAim(enemy, attack, separation) {
  if (enemy.milestone || wave < 4 || ['radial', 'summon', 'field', 'beam'].includes(attack.kind)) return player;
  const strength = [.16, .44, .68][enemy.form - 1];
  const windup = (attack.windup ?? 0) * enemy.windupScale;
  const travel = attack.speed ? separation / attack.speed : windup;
  const lead = Math.min(.54, travel + windup * .35) * strength;
  const x = player.vx * lead;
  const y = player.vy * lead;
  const cap = Math.min(1, 89 / Math.max(1, Math.hypot(x, y)));
  const point = {
    x: clamp(player.x + x * cap, player.r, world.w - player.r),
    y: clamp(player.y + y * cap, player.r, world.h - player.r)
  };
  return attack.kind !== 'mortar' && blockedLane(enemy, point) ? player : point;
}

function attackAngles(enemy, attack) {
  const count = attack.count ?? 1;
  if (attack.kind === 'radial') {
    const step = Math.PI * 2 / count;
    const offset = .5 + Math.sin(enemy.phase + enemy.attackIndex) * .3;
    return Array.from({ length: count }, (_, i) => enemy.angle + (i + offset) * step);
  }
  return Array.from({ length: count }, (_, i) => enemy.angle + (i - (count - 1) / 2) * (attack.spread ?? 0));
}

function fireEnemyVolley(enemy, attack, damage) {
  enemy.firedAt = elapsed;
  for (const angle of attackAngles(enemy, attack)) {
    launchShot(enemy, angle, { speed: attack.speed, life: attack.life ?? 1.5, r: enemy.milestone ? 6 : 5,
      color: enemy.color, damage, friendly: false, source: enemy.name });
  }
}

function escortTargets(enemy, kinds) {
  const slots = kinds.length - enemies.filter(tank => tank.bossEscort).length;
  const targets = [];
  for (let i = 0; i < slots; i++) {
    const kind = kinds[i];
    const r = enemyTypes[kind].r;
    const angle = enemy.angle + Math.PI + (i - (slots - 1) / 2) * 1.03;
    for (const offset of [0, .55, -.55, 1.1, -1.1, Math.PI]) {
      const point = {
        x: clamp(enemy.x + Math.cos(angle + offset) * 119, r, world.w - r),
        y: clamp(enemy.y + Math.sin(angle + offset) * 119, r, world.h - r)
      };
      if (coverAt(point, r + 5) || distance(point, player) < player.r + r + 40) continue;
      if ([...enemies, ...targets].some(other => distance(other, point) < other.r + r + 12)) continue;
      targets.push({ ...point, kind, r });
      break;
    }
  }
  return targets;
}

function beginAttack(enemy, attack, aim = player) {
  const targets = attack.kind === 'summon' ? escortTargets(enemy, attack.escorts) : [];
  if (attack.kind === 'mortar' || attack.kind === 'field') {
    const count = attack.count ?? 1;
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * attack.radius * 1.9;
      targets.push({
        x: clamp(aim.x - Math.sin(enemy.angle) * offset, 0, world.w),
        y: clamp(aim.y + Math.cos(enemy.angle) * offset, 0, world.h)
      });
    }
  }
  const duration = (attack.windup ?? 0) * enemy.windupScale;
  enemy.warning = { attack, duration, left: duration, targets };
  if (duration === 0) releaseAttack(enemy);
  else if (enemy.milestone) playTone(220, .24, .04, 'triangle', 380);
}

function releaseAttack(enemy) {
  const { attack, targets } = enemy.warning;
  const damage = (attack.damage ?? 0) * enemy.power;
  enemy.warning = null;
  enemy.cooldown = enemy.interval * enemy.cooldownScale * random(.9, 1.11);
  enemy.firedAt = elapsed;
  if (attack.kind === 'charge') {
    enemy.charge = { left: attack.duration, speed: attack.speed, damage };
  } else if (attack.kind === 'mortar') {
    for (const target of targets) {
      groundBursts.push({ ...target, r: attack.radius, color: enemy.color, at: elapsed });
      burst(target.x, target.y, enemy.color, 11);
    }
    if (targets.some(target => distance(target, player) <= attack.radius + player.r * .25)) damagePlayer(damage, false, enemy.name + ' bombardment');
  } else if (attack.kind === 'field') {
    for (const target of targets) {
      bossFields.push({ ...target, r: attack.radius, until: elapsed + attack.duration, pulseAt: elapsed, damage,
        color: enemy.color, source: attack.name });
      burst(target.x, target.y, enemy.color, 13);
    }
  } else if (attack.kind === 'summon') {
    for (const { x, y, kind, r } of targets) {
      spawnEnemy({ kind, bossEscort: true, position: { x, y } });
      groundBursts.push({ x, y, r: r * 1.7, color: enemy.color, at: elapsed });
      burst(x, y, enemy.color, 10);
    }
  } else if (attack.kind === 'beam') {
    enemy.beam = { attack, angle: enemy.angle - attack.sweep / 2, originAngle: enemy.angle, left: attack.duration, damage, hitPlayer: false };
  } else {
    fireEnemyVolley(enemy, attack, damage);
    if (attack.bursts > 1) enemy.volley = { attack, damage, remaining: attack.bursts - 1, wait: attack.burstDelay };
  }
  if (enemy.switchFlank && !enemies.some(ally => ally.orbit && ally.flankSide === -enemy.flankSide)) enemy.flankSide *= -1;
  const count = enemy.attacks.length + Number(Boolean(enemy.enraged));
  enemy.attackIndex = (enemy.attackIndex + 1) % count;
}

function beamLength(enemy, angle, reach) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let length = reach;
  for (const block of cover) {
    if (block.hp <= 0) continue;
    const x = block.x - enemy.x, y = block.y - enemy.y;
    const along = x * dx + y * dy;
    const across = x * dy - y * dx;
    if (along <= 0 || Math.abs(across) >= block.r) continue;
    length = Math.min(length, Math.max(0, along - Math.sqrt(block.r ** 2 - across ** 2)));
  }
  return length;
}

function updateBeam(enemy, dt) {
  const beam = enemy.beam;
  beam.left = Math.max(0, beam.left - dt);
  beam.angle = beam.originAngle + (0.5 - beam.left / beam.attack.duration) * beam.attack.sweep;
  const dx = Math.cos(beam.angle), dy = Math.sin(beam.angle);
  const x = player.x - enemy.x, y = player.y - enemy.y;
  const along = x * dx + y * dy;
  if (!beam.hitPlayer && along > 0 && along <= beamLength(enemy, beam.angle, beam.attack.reach)
      && Math.abs(x * dy - y * dx) < player.r + 8) {
    beam.hitPlayer = true;
    damagePlayer(beam.damage, false, enemy.name + ' beam sweep');
  }
  if (beam.left === 0) enemy.beam = null;
}

function updateBossFields() {
  if (!bossFields.length) return;
  bossFields = bossFields.filter(zone => elapsed < zone.until);
  for (const zone of bossFields) {
    if (elapsed < zone.pulseAt || distance(zone, player) > zone.r + player.r * .25) continue;
    zone.pulseAt = elapsed + .85;
    damagePlayer(zone.damage, false, zone.source);
    if (state === 'ended') return;
  }
}

function shieldRaised(enemy) {
  return enemy.frontShield && !enemy.warning && elapsed >= enemy.stunUntil && enemy.cooldown > .72;
}

function protectingTank(target) {
  if (!target.kind || target.milestone || target.frontShield) return null;
  let strongest = null;
  for (const guard of enemies) {
    if (guard.hp <= 0 || !shieldRaised(guard) || distance(target, guard) > (guard.guardRange ?? 137)) continue;
    if (strongest && (strongest.guardReduction ?? .25) >= (guard.guardReduction ?? .25)) continue;
    if (!blockedLane(target, guard)) strongest = guard;
  }
  return strongest;
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = random(0, Math.PI * 2);
    const speed = random(26, 160);
    const life = random(.19, .51);
    sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life, color });
  }
}

function addScore(points) {
  score += points;
  if (score > best) {
    best = score;
    try { localStorage.setItem('iron-circuit-best', String(best)); } catch {}
  }
}

function award(points, target, energy) {
  addScore(points);
  scorePops.push({ x: target.x, y: target.y + (target.kind ? target.r + 23 : -24), points, at: elapsed });
  const count = target.milestone ? 8 : 3;
  for (let i = 0; i < count; i++) {
    motes.push({ x: target.x + random(-17, 17), y: target.y + random(-17, 17), energy: energy / count, life: 32 });
  }
  burst(target.x, target.y, target.color, target.milestone ? 24 : 12);
  playTone(330, .1, .045, 'triangle', 650);
}

function repairPlayer(amount) {
  player.hp = Math.min(player.maxHp, player.hp + amount);
}

function damagePlayer(amount, contact = false, source = 'incoming fire') {
  if (player.hit > 0 || player.hp <= 0 || (player.ability.id === 'dash' && elapsed < player.abilityUntil)) return;
  const damage = amount * incomingDamageScale(player, contact);
  const deflected = elapsed < player.abilityUntil ? Math.min(player.deflector, damage) : 0;
  player.deflector -= deflected;
  const absorbed = Math.min(player.shield, damage - deflected);
  player.shield -= absorbed;
  player.hp = Math.max(0, player.hp - (damage - absorbed - deflected));
  player.hit = .27;
  player.damageAt = elapsed;
  shake = Math.max(shake, 6);
  burst(player.x, player.y, absorbed + deflected >= damage - .001 ? colors.core : colors.danger, 6);
  playTone(110, .12, .09, 'sawtooth');
  if (player.hp === 0) {
    run.cause = source;
    setState('ended');
  }
}

function hitTarget(target, amount, impact) {
  if (target.hp <= 0) return;
  if (shieldRaised(target)) {
    const facing = (impact.x - target.x) * Math.cos(target.angle) + (impact.y - target.y) * Math.sin(target.angle);
    if (facing > distance(impact, target) * .48) amount *= .30;
  }
  const guard = protectingTank(target);
  if (guard) amount *= 1 - (guard.guardReduction ?? .25);
  if (target.kind) {
    const dealt = Math.min(target.hp, amount);
    run.damage += dealt;
    if (target.damagePop && elapsed - target.damagePop.at < .12) {
      target.damagePop.value += dealt;
      target.damagePop.critical ||= Boolean(impact.critical);
    } else if (damagePops.length < 60) {
      target.damagePop = { x: target.x, y: target.y - target.r, value: dealt, critical: Boolean(impact.critical), at: elapsed };
      damagePops.push(target.damagePop);
    }
    if (elapsed - hitSoundAt > .07) {
      hitSoundAt = elapsed;
      playTone(impact.critical ? 720 : 295, .05, .022, 'triangle');
    }
  }
  target.hp -= amount;
  target.hit = .1;
  if (target.hp > 0) {
    if (target.milestone && !target.enraged && target.hp <= target.maxHp * .5) {
      target.enraged = true;
      target.attackIndex = target.attacks.length;
      target.cooldown = Math.max(target.cooldown, .95);
      target.warning = null;
      target.charge = null;
      target.beam = null;
      target.cooldownScale *= .82;
      announce(target.name + ' · Phase 2', 2.8);
      playTone(125, .38, .07, 'triangle', 405);
    }
    burst(impact.x, impact.y, target.color, 3);
    return;
  }
  if (target.bossEscort) {
    run.kills++;
    burst(target.x, target.y, target.color, 12);
    return;
  }
  award(target.reward ?? target.sides * 4, target, target.energy ?? shapeEnergy[target.sides]);
  if (target.kind) {
    run.kills++;
    progressDaily('kills');
    if (target.elite) progressDaily('elites');
    dropCoins(target);
    if (target.milestone) {
      run.bosses++;
      unlock('deflector');
    }
    if (target.contractTarget) completeContract();
    advanceContract('sweep', 1);
    if (elapsed - (contract?.abilityAt ?? -Infinity) <= 3) {
      advanceContract('ability', 1);
    }
    repairPlayer(player.killRepair);
    player.abilityReadyAt = Math.max(elapsed, player.abilityReadyAt - player.killRecharge);
  }
}

function activateAbility() {
  if (state !== 'playing' || elapsed < player.abilityReadyAt) return;
  const { id, cooldown } = player.ability;
  player.abilityReadyAt = elapsed + cooldown * player.abilityCooldown;
  player.abilityAt = elapsed;
  if (!boss && contract?.id === 'ability' && contract.status === 'active') contract.abilityAt = elapsed;
  repairPlayer(player.abilityRepair);
  if (id === 'dash') {
    player.dashAngle = player.moveAngle;
    player.abilityUntil = elapsed + .19 * player.abilityDuration;
  } else if (id === 'overdrive') {
    player.abilityUntil = elapsed + 3 * player.abilityDuration;
  } else if (id === 'deflector') {
    player.abilityUntil = elapsed + 3 * player.abilityDuration;
    player.deflector = 22;
  } else if (id === 'repair-kit') {
    repairPlayer(18 * player.abilityDuration);
  } else {
    const radius = 245 * player.abilityDuration;
    groundBursts.push({ x: player.x, y: player.y, r: radius, color: colors.core, at: elapsed });
    shots = shots.filter(shot => shot.friendly || distance(player, shot) > radius);
    for (const enemy of enemies) {
      if (distance(player, enemy) > radius + enemy.r) continue;
      enemy.stunUntil = elapsed + (enemy.milestone ? .4 : 1.3) * player.abilityDuration;
    }
  }
  playTone(440, .15, .06, 'triangle', 780);
}

function findTouchTarget() {
  if (elapsed < aimRefreshAt) return aimTarget?.hp > 0 ? aimTarget : null;
  aimRefreshAt = elapsed + .12;
  aimTarget = null;
  updateCamera();
  const viewRight = camera.x + width / zoom;
  const viewBottom = camera.y + height / zoom;
  let bestDistance = player.shotSpeed * player.shotLife + player.r;
  for (const targets of [enemies, shapes]) {
    for (const target of targets) {
      if (target.hp <= 0 || target.x < camera.x || target.x > viewRight || target.y < camera.y || target.y > viewBottom) continue;
      const gap = distance(player, target);
      if (gap >= bestDistance || blockedLane(player, target)) continue;
      aimTarget = target;
      bestDistance = gap;
    }
    if (aimTarget) break;
  }
  return aimTarget;
}

function updatePlayer(dt) {
  player.hit -= dt;
  let dx = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
  let dy = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
  if (leftTouch) {
    dx = leftTouch.x - leftTouch.startX;
    dy = leftTouch.y - leftTouch.startY;
    const gap = Math.hypot(dx, dy);
    const strength = clamp((gap - stickDeadZone) / (stickRadius - stickDeadZone), 0, 1);
    dx *= strength / Math.max(1, gap);
    dy *= strength / Math.max(1, gap);
  }
  const input = Math.hypot(dx, dy);
  if (input > .1) player.moveAngle = Math.atan2(dy, dx);
  const aimX = rightTouch ? rightTouch.x - rightTouch.startX : 0;
  const aimY = rightTouch ? rightTouch.y - rightTouch.startY : 0;
  const manualAim = Math.hypot(aimX, aimY) > stickDeadZone;
  const automaticTarget = autoAim && touchInput && !rightTouch && !pointer.down ? findTouchTarget() : null;
  const firing = pointer.down || manualAim || automaticTarget || keys.has(' ');
  const afterburn = elapsed - player.damageAt < 2 ? player.afterburn : 0;
  const coast = !firing && elapsed - player.firedAt > .65 ? player.coast : 0;
  const speed = player.speed * (1 + afterburn + coast) / Math.max(1, input);
  const previousX = player.x;
  const previousY = player.y;
  const dashing = player.ability.id === 'dash' && elapsed < player.abilityUntil;
  if (dashing) move(player, Math.cos(player.dashAngle) * 760, Math.sin(player.dashAngle) * 760, dt);
  else move(player, dx * speed, dy * speed, dt);
  if (dashing) {
    player.vx = player.vy = 0;
  } else if (dt > 0) {
    const blend = Math.min(1, dt * 8);
    player.vx += ((player.x - previousX) / dt - player.vx) * blend;
    player.vy += ((player.y - previousY) / dt - player.vy) * blend;
  }
  const moving = previousX !== player.x || previousY !== player.y;
  const overdrive = player.ability.id === 'overdrive' && elapsed < player.abilityUntil ? .45 : 0;
  player.cooldown -= dt * (1 + (moving ? player.movingReload : 0) + overdrive);
  if (elapsed - player.damageAt >= 5 && player.regen) repairPlayer(player.regen * dt);
  updateCamera();
  if (manualAim) {
    player.angle = Math.atan2(aimY, aimX);
  } else if (automaticTarget) {
    player.angle = Math.atan2(automaticTarget.y - player.y, automaticTarget.x - player.x);
  } else if (!rightTouch && pointer.active) {
    player.angle = Math.atan2(pointer.y / zoom + camera.y - player.y, pointer.x / zoom + camera.x - player.x);
  } else if (!rightTouch && input) {
    player.angle = Math.atan2(dy, dx);
  }
  if (firing && player.cooldown <= 0) {
    shootPlayer();
    player.cooldown = player.reload;
  }
}

function updateEnemy(enemy, dt) {
  enemy.hit -= dt;
  if (elapsed < enemy.stunUntil) return;
  const movementScale = elapsed < enemy.slowUntil ? 1 - enemy.slowStrength : 1;
  const charging = enemy.charge;
  if (charging) {
    charging.left -= dt;
    const hitWall = move(enemy, Math.cos(enemy.angle) * charging.speed, Math.sin(enemy.angle) * charging.speed, dt * movementScale);
    if (charging.left <= 0 || hitWall) enemy.charge = null;
  } else if (enemy.beam) {
    updateBeam(enemy, dt);
  } else if (enemy.volley) {
    const volley = enemy.volley;
    volley.wait -= dt;
    if (volley.wait <= 0) {
      fireEnemyVolley(enemy, volley.attack, volley.damage);
      volley.remaining--;
      if (volley.remaining === 0) enemy.volley = null;
      else volley.wait += volley.attack.burstDelay;
    }
  } else if (enemy.warning) {
    enemy.warning.left -= dt;
    if (enemy.warning.left <= 0) releaseAttack(enemy);
  } else {
    enemy.cooldown -= dt;
    const separation = distance(enemy, player);
    enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    let attack = enemy.attacks[enemy.attackIndex] ?? enemy.phaseAttack;
    if (attack.kind === 'summon' && enemies.filter(tank => tank.bossEscort).length >= attack.escorts.length) {
      // The Fabricator uses its cannon while its escort slots are full.
      enemy.attackIndex = 0;
      attack = enemy.attacks[0];
    }
    const indirect = ['mortar', 'radial', 'field', 'summon'].includes(attack.kind);
    const blocked = !indirect && blockedLane(enemy, player);
    const ally = enemy.repairs ? repairAlly(enemy) : null;
    if (enemy.cooldown <= 0 && separation < attack.reach && !blocked) {
      const aim = enemyAim(enemy, attack, separation);
      enemy.angle = Math.atan2(aim.y - enemy.y, aim.x - enemy.x);
      beginAttack(enemy, attack, aim);
    } else {
      const approach = blocked || separation > enemy.range ? 1 : separation < enemy.range * .71 ? -.63 : 0;
      const strafe = (enemy.orbit ? enemy.flankSide : Math.sin(elapsed * 1.72 + enemy.phase)) * enemy.strafe;
      const cos = Math.cos(enemy.angle);
      const sin = Math.sin(enemy.angle);
      if (ally && distance(enemy, ally) > 106 && separation > 145) {
        const heading = Math.atan2(ally.y - enemy.y, ally.x - enemy.x);
        steerEnemy(enemy, Math.cos(heading) * enemy.speed, Math.sin(heading) * enemy.speed, dt * movementScale);
      } else {
        steerEnemy(enemy, (cos * approach - sin * strafe) * enemy.speed, (sin * approach + cos * strafe) * enemy.speed, dt * movementScale);
      }
    }
  }

  for (const other of enemies) {
    if (other === enemy) break;
    const gap = distance(enemy, other);
    const overlap = enemy.r + other.r + 4 - gap;
    if (overlap <= 0) continue;
    const direction = gap ? Math.atan2(enemy.y - other.y, enemy.x - other.x) : enemy.phase;
    const pushX = Math.cos(direction) * overlap / 2;
    const pushY = Math.sin(direction) * overlap / 2;
    move(enemy, pushX, pushY, 1);
    move(other, -pushX, -pushY, 1);
  }
  if (distance(enemy, player) < player.r + enemy.r) {
    damagePlayer(charging?.damage ?? enemy.contact * enemy.power, true, enemy.name + (charging ? ' charge' : ' collision'));
  }
}

function repairAlly(mechanic) {
  const wounded = enemies.filter(enemy => !enemy.repairs && enemy.hp > 0
    && enemy.hp < enemy.maxHp * .90 && distance(mechanic, enemy) <= 290);
  const reachable = wounded.filter(enemy => distance(mechanic, enemy) <= (mechanic.repairRange ?? 170) && !blockedLane(mechanic, enemy)
    && elapsed >= (enemy.repairLockUntil ?? 0)).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  if (reachable.length && elapsed >= mechanic.repairAt) {
    const targets = reachable.slice(0, mechanic.repairTargets ?? 1);
    for (const [index, ally] of targets.entries()) {
      const amount = Math.min(52, 16 + ally.maxHp * .085) * (index === 0 ? 1 : mechanic.sideRepair ?? .5);
      ally.hp = Math.min(ally.maxHp, ally.hp + amount);
      ally.repairLockUntil = elapsed + .75;
    }
    mechanic.repairAt = elapsed + 1.65;
    mechanic.repairBeam = { targets, at: elapsed };
  }
  return reachable[0] ?? wounded[0];
}

function updateShots(dt) {
  for (const shot of shots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (shot.life <= 0 || shot.x < 0 || shot.x > world.w || shot.y < 0 || shot.y > world.h) {
      shot.life = 0;
      continue;
    }
    if (!shot.friendly && boss && boss.hp <= 0) {
      shot.life = 0;
      continue;
    }
    const block = coverAt(shot, shot.r);
    if (block) {
      block.hp -= shot.damage;
      block.hit = .1;
      shot.life = 0;
      burst(shot.x, shot.y, sector.color, block.hp <= 0 ? 13 : 3);
      continue;
    }
    if (!shot.friendly) {
      if (distance(shot, player) < shot.r + player.r) {
        shot.life = 0;
        damagePlayer(shot.damage, false, shot.source);
        if (state === 'ended') return;
      }
      continue;
    }
    const intersects = target => target.hp > 0 && !shot.struck?.includes(target) && distance(shot, target) < shot.r + target.r;
    const target = enemies.find(intersects) || shapes.find(intersects);
    if (!target) continue;
    const execute = target.kind && target.hp / target.maxHp < .3 ? shot.execute : 0;
    const bossBonus = target.milestone || target.elite ? shot.bossBonus : 0;
    hitTarget(target, shot.damage * (1 + (execute ?? 0) + (bossBonus ?? 0)), shot);
    if (target.kind && shot.slow) {
      target.slowUntil = elapsed + .8;
      target.slowStrength = shot.slow * (target.milestone ? .5 : 1);
    }
    if (shot.blast) {
      const radius = 73;
      groundBursts.push({ x: shot.x, y: shot.y, r: radius, color: colors.blast, at: elapsed });
      for (const enemy of enemies) {
        if (enemy !== target && enemy.hp > 0 && distance(shot, enemy) <= radius + enemy.r && !blockedLane(shot, enemy)) {
          hitTarget(enemy, shot.blast, { x: shot.x, y: shot.y });
        }
      }
      shot.blast = 0;
    }
    shot.hits--;
    if (shot.hits <= 0) shot.life = 0;
    else {
      (shot.struck ??= []).push(target);
      shot.damage *= .65;
    }
  }
  shots = shots.filter(shot => shot.life > 0);
}

function updatePickups(dt) {
  for (const mote of motes) {
    const gap = distance(player, mote);
    mote.life -= dt;
    if (gap < 23) {
      xp += mote.energy * (1 + player.salvageBonus);
      advanceContract('salvage', mote.energy);
      player.pickupAt = elapsed;
      mote.life = 0;
    } else if (gap < player.pickupRange) {
      const pull = Math.min(1, dt * (3.6 + (player.pickupRange - gap) / 22));
      mote.x += (player.x - mote.x) * pull;
      mote.y += (player.y - mote.y) * pull;
    }
  }
  motes = motes.filter(mote => mote.life > 0);
}

function updateProgression() {
  while (xp + 1e-6 >= xpNeeded()) {
    xp = Math.max(0, xp - xpNeeded());
    level++;
    choicesDue++;
    if (level % 10 === 0) bossLevels.push(level);
  }
  if (choicesDue || run.moduleChoices.length) {
    playTone(430, .24, .07, 'triangle', 860);
    showPendingChoice();
  }
}

function update(dt) {
  elapsed += dt;
  banner -= dt;
  updatePlayer(dt);
  updateWave(dt);
  updateVent();
  if (state === 'ended') return;
  updateBossFields();
  if (state === 'ended') return;
  updateContract(dt);

  for (const enemy of enemies) {
    updateEnemy(enemy, dt);
    if (state === 'ended') return;
  }

  for (const shape of shapes) shape.hit -= dt;
  for (const block of cover) block.hit -= dt;
  updateShots(dt);
  if (state === 'ended') return;
  const destroyed = shapes.filter(shape => shape.hp <= 0).length;
  shapes = shapes.filter(shape => shape.hp > 0);
  for (let i = 0; i < destroyed; i++) addShape();
  enemies = enemies.filter(enemy => enemy.hp > 0);
  if (boss && boss.hp <= 0) finishBoss();

  updatePickups(dt);
  updateCoinDrops(dt);
  updateExtraction(dt);
  if (state === 'ended') return;
  for (const spark of sparks) {
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.life -= dt;
  }
  sparks = sparks.filter(spark => spark.life > 0);
  scorePops = scorePops.filter(pop => elapsed - pop.at < .72);
  damagePops = damagePops.filter(pop => elapsed - pop.at < .50);
  shake = Math.max(0, shake - dt * 24);
  groundBursts = groundBursts.filter(impact => elapsed - impact.at < .4);
  updateProgression();
}

function updateCamera() {
  const viewW = width / zoom, viewH = height / zoom;
  camera = {
    x: viewW >= world.w ? (world.w - viewW) / 2 : clamp(player.x - viewW / 2, 0, world.w - viewW),
    y: viewH >= world.h ? (world.h - viewH) / 2 : clamp(player.y - viewH / 2, 0, world.h - viewH)
  };
}

function polygon(x, y, r, sides, angle, brush = ctx) {
  brush.beginPath();
  for (let i = 0; i < sides; i++) {
    const theta = angle + i * Math.PI * 2 / sides;
    brush.lineTo(x + Math.cos(theta) * r, y + Math.sin(theta) * r);
  }
  brush.closePath();
}

function paintArenaFloor() {
  const floor = document.createElement('canvas');
  const { w, h } = world;
  floor.width = w;
  floor.height = h;
  const art = floor.getContext('2d');
  const gradient = art.createRadialGradient(w / 2, h / 2, 70, w / 2, h / 2, 1450);
  gradient.addColorStop(0, sector.center);
  gradient.addColorStop(.5, '#18152a');
  gradient.addColorStop(1, sector.edge);
  art.fillStyle = gradient;
  art.fillRect(0, 0, w, h);

  const tile = 44;
  for (const step of [tile, tile * 5]) {
    art.strokeStyle = sector.color + (step === tile ? '19' : '2e');
    art.beginPath();
    for (let x = w / 2 % step + .5; x < w; x += step) {
      art.moveTo(x, 0);
      art.lineTo(x, h);
    }
    for (let y = h / 2 % step + .5; y < h; y += step) {
      art.moveTo(0, y);
      art.lineTo(w, y);
    }
    art.stroke();
  }
  art.fillStyle = '#d9c1ff35';
  for (let x = w / 2 % (tile * 5); x < w; x += tile * 5) {
    for (let y = h / 2 % (tile * 5); y < h; y += tile * 5) {
      art.fillRect(x - 3, y, 7, 1);
      art.fillRect(x, y - 3, 1, 7);
    }
  }

  art.save();
  art.translate(w / 2, h / 2);
  art.strokeStyle = '#a87df632';
  art.setLineDash([3, 8]);
  art.beginPath();
  art.arc(0, 0, 249, 0, Math.PI * 2);
  art.stroke();
  art.setLineDash([]);
  art.beginPath();
  art.arc(0, 0, 115, 0, Math.PI * 2);
  art.stroke();
  for (let i = 0; i < 4; i++) {
    art.strokeStyle = '#aa78f954';
    art.lineWidth = 5;
    art.beginPath();
    art.arc(0, 0, 132, .11, Math.PI / 2 - .11);
    art.stroke();
    art.fillStyle = '#b389fa48';
    art.fillRect(150, -2, 17, 4);
    art.rotate(Math.PI / 2);
  }
  art.restore();
  art.strokeStyle = sector.color;
  art.lineWidth = 4;
  art.strokeRect(2, 2, w - 4, h - 4);
  art.strokeStyle = '#75649e55';
  art.strokeRect(10, 10, w - 20, h - 20);
  return floor;
}

function circle(x, y, radius, brush = ctx) {
  brush.beginPath();
  brush.arc(x, y, radius, 0, Math.PI * 2);
}

function drawWarning(enemy) {
  const { attack, duration, left, targets } = enemy.warning;
  const charge = clamp(1 - left / duration, 0, 1);
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle = enemy.color;
  if (attack.kind === 'mortar' || attack.kind === 'field') {
    if (attack.kind === 'field') ctx.setLineDash([8, 6]);
    for (const target of targets) {
      circle(target.x, target.y, attack.radius);
      ctx.globalAlpha = .16;
      ctx.fill();
      ctx.globalAlpha = .85;
      ctx.lineWidth = 2;
      ctx.stroke();
      circle(target.x, target.y, attack.radius * charge);
      ctx.globalAlpha = .23;
      ctx.fill();
      ctx.globalAlpha = .85;
      ctx.stroke();
    }
  } else if (attack.kind === 'summon') {
    for (const { x, y, r } of targets) {
      circle(x, y, r + 11);
      ctx.globalAlpha = .16;
      ctx.fill();
      ctx.globalAlpha = .90;
      ctx.lineWidth = 2;
      ctx.stroke();
      polygon(x, y, 8 + 8 * charge, 4, 0);
      ctx.stroke();
    }
  } else if (attack.kind === 'beam') {
    const start = enemy.angle - attack.sweep / 2;
    const end = enemy.angle + attack.sweep / 2;
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.arc(enemy.x, enemy.y, attack.reach, start, end, attack.sweep < 0);
    ctx.closePath();
    ctx.globalAlpha = .12 + .09 * charge;
    ctx.fill();
    ctx.globalAlpha = .80;
    ctx.setLineDash([10, 7]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(enemy.x + Math.cos(start) * attack.reach, enemy.y + Math.sin(start) * attack.reach);
    ctx.stroke();
  } else if (attack.kind === 'charge') {
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle);
    const reach = attack.speed * attack.duration + enemy.r;
    ctx.globalAlpha = .11 + charge * .10;
    ctx.fillRect(0, -enemy.r, reach, enemy.r * 2);
    ctx.globalAlpha = .72;
    ctx.setLineDash([9, 6]);
    ctx.lineWidth = 2;
    ctx.strokeRect(0, -enemy.r, reach, enemy.r * 2);
    ctx.setLineDash([]);
    ctx.fillRect(reach * charge - 2, -enemy.r, 4, enemy.r * 2);
  } else {
    const radial = attack.kind === 'radial';
    const reach = enemy.r + 14 + attack.speed * (attack.life ?? 1.5);
    ctx.globalAlpha = radial ? .27 + charge * .21 : .43 + charge * .45;
    ctx.lineWidth = radial ? 1.5 : 2;
    ctx.setLineDash(radial ? [4, 12] : [13, 7]);
    ctx.beginPath();
    for (const angle of attackAngles(enemy, attack)) {
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      ctx.moveTo(enemy.x + dx * enemy.r, enemy.y + dy * enemy.r);
      ctx.lineTo(enemy.x + dx * reach, enemy.y + dy * reach);
    }
    ctx.stroke();
    if (radial) {
      ctx.setLineDash([]);
      circle(enemy.x, enemy.y, enemy.r + 12 + charge * 17);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBossEffects() {
  for (const zone of bossFields) {
    circle(zone.x, zone.y, zone.r);
    ctx.fillStyle = zone.color + '32';
    ctx.strokeStyle = zone.color;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.setLineDash([5, 9]);
    circle(zone.x, zone.y, zone.r * .74);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (!boss?.beam) return;
  const { attack, angle } = boss.beam;
  const length = beamLength(boss, angle, attack.reach);
  ctx.beginPath();
  ctx.moveTo(boss.x, boss.y);
  ctx.lineTo(boss.x + Math.cos(angle) * length, boss.y + Math.sin(angle) * length);
  ctx.strokeStyle = boss.color + '70';
  ctx.lineWidth = 21;
  ctx.stroke();
  ctx.strokeStyle = '#fff5c5';
  ctx.lineWidth = 8;
  ctx.stroke();
}

function tank(entity, friendly, brush = ctx) {
  const { x, y, r, angle } = entity;
  const color = friendly ? entity.finish.color ?? entity.evolution?.color ?? colors.player : entity.color;
  const flash = reducedMotion.matches ? 0 : Math.max(0, 1 - ((elapsed ?? 0) - (entity.firedAt ?? -1)) / .1);
  brush.fillStyle = '#0908139c';
  brush.beginPath();
  brush.ellipse(x + 2, y + 6, r * 1.1, r * .83, 0, 0, Math.PI * 2);
  brush.fill();
  if (friendly) {
    circle(x, y, r + 9, brush);
    brush.strokeStyle = '#88f6df74';
    brush.lineWidth = 1;
    brush.stroke();
    brush.strokeStyle = color;
    brush.lineWidth = 2;
    for (const side of [-1, 1]) {
      const start = angle + side * Math.PI / 2 - .25;
      brush.beginPath();
      brush.arc(x, y, r + 9, start, start + .5);
      brush.stroke();
    }
  }
  if (friendly && (entity.shield > 0 || (entity.deflector > 0 && elapsed < entity.abilityUntil))) {
    circle(x, y, r + 13, brush);
    brush.strokeStyle = '#9fbaffa6';
    brush.lineWidth = 2;
    brush.stroke();
  }
  if (friendly && elapsed < entity.abilityUntil) {
    circle(x, y, r + 17, brush);
    brush.strokeStyle = entity.ability.id === 'dash' ? '#e5fffa' : '#ffc57c';
    brush.lineWidth = 3;
    brush.stroke();
  }
  if (shieldRaised(entity)) {
    brush.beginPath();
    brush.arc(x, y, r + 7, angle - 1.07, angle + 1.07);
    brush.strokeStyle = color;
    brush.lineWidth = 4;
    brush.stroke();
  }
  if (entity.milestone) {
    circle(x, y, r + 10, brush);
    brush.strokeStyle = color;
    brush.lineWidth = 2;
    brush.setLineDash([8, 5]);
    brush.stroke();
    brush.setLineDash([]);
  }
  if (entity.elite) {
    polygon(x, y, r + 9, 6, 0, brush);
    brush.strokeStyle = '#ffe58f';
    brush.lineWidth = 2;
    brush.stroke();
  }
  if (elapsed < entity.stunUntil || elapsed < entity.slowUntil) {
    circle(x, y, r + 5, brush);
    brush.strokeStyle = '#9fdfff';
    brush.lineWidth = 2;
    brush.stroke();
  }

  brush.save();
  brush.translate(x, y);
  brush.rotate(angle);
  brush.lineJoin = 'round';
  for (const side of [-1, 1]) {
    const offset = side * r * .69;
    brush.beginPath();
    brush.roundRect(-r * .96, offset - r * .21, r * 1.86, r * .42, 3.5);
    brush.fillStyle = '#171627';
    brush.fill();
    brush.strokeStyle = '#080813';
    brush.lineWidth = 2;
    brush.stroke();
    brush.fillStyle = '#4f4c68';
    for (let notch = -r * .75; notch < r * .78; notch += 5.5) {
      brush.fillRect(notch, offset - r * .12, 2, r * .24);
    }
  }
  polygon(0, 0, r * .89, 8, Math.PI / 8, brush);
  brush.fillStyle = entity.hit > 0 && !reducedMotion.matches ? '#ccbed7'
    : friendly ? entity.finish.armor ?? entity.evolution?.armor ?? '#2f656c' : entity.armor;
  brush.fill();
  brush.strokeStyle = color;
  brush.lineWidth = 1.5;
  brush.stroke();
  brush.fillStyle = color;
  brush.fillRect(-r * .65, -r * .24, r * .22, r * .14);
  brush.fillRect(-r * .65, r * .09, r * .22, r * .14);

  const baseBarrels = entity.evolution?.barrels ?? (entity.classId === 'scatter' ? 3 : 1);
  const barrels = friendly ? Math.min(5, baseBarrels + entity.barrels - 1) : entity.barrels ?? 1;
  const length = entity.kind === 'sniper' || entity.classId === 'lancer' ? 21 : 11;
  const barrelEnd = r + length + (entity.evolution?.barrelLength ?? entity.barrelLength ?? 0) - flash * (friendly ? 7 : 4);
  brush.lineWidth = 1.2;
  for (let i = 0; i < barrels; i++) {
    const offset = (i - (barrels - 1) / 2) * 8;
    const thickness = barrels === 1 ? 11 : 6;
    brush.beginPath();
    brush.roundRect(0, offset - thickness / 2, barrelEnd, thickness, 2);
    brush.fillStyle = '#292840';
    brush.fill();
    brush.stroke();
    brush.fillStyle = color;
    brush.fillRect(barrelEnd - 5, offset - thickness / 2 + 1.5, 2, thickness - 3);
    if (flash > 0) {
      brush.globalAlpha = flash;
      circle(barrelEnd + 3, offset, 2 + flash * 4, brush);
      brush.fill();
      brush.globalAlpha = 1;
    }
  }
  polygon(0, 0, r * .49, entity.repairs ? 4 : entity.turret ?? 6, Math.PI / 6, brush);
  brush.fillStyle = '#161829';
  brush.fill();
  brush.stroke();
  polygon(0, 0, r * .19, 4, 0, brush);
  brush.fillStyle = color;
  brush.fill();
  brush.restore();

  if (!friendly && !entity.milestone && entity.hp < entity.maxHp) {
    const barWidth = r * 1.65;
    brush.fillStyle = '#191325';
    brush.fillRect(x - barWidth / 2, y - r - 9, barWidth, 4);
    brush.fillStyle = color;
    brush.fillRect(x - barWidth / 2, y - r - 9, barWidth * entity.hp / entity.maxHp, 4);
  }
}

function drawShape(shape) {
  const { x, y, r, sides, color } = shape;
  const angle = shape.angle + elapsed * .28;
  polygon(x + 2, y + 4, r, sides, angle);
  ctx.fillStyle = '#0a08177d';
  ctx.fill();
  polygon(x, y, r, sides, angle);
  ctx.fillStyle = color;
  ctx.globalAlpha = shape.hit > 0 && !reducedMotion.matches ? .65 : .28;
  ctx.fill();
  ctx.globalAlpha = .9;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = .62;
  polygon(x, y, r * .43, sides, angle);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawShots() {
  ctx.lineCap = 'round';
  for (const shot of shots) {
    const color = shot.color;
    ctx.strokeStyle = color;
    ctx.globalAlpha = .5;
    ctx.lineWidth = shot.r * 1.5;
    ctx.beginPath();
    ctx.moveTo(shot.x - shot.vx * .035, shot.y - shot.vy * .035);
    ctx.lineTo(shot.x, shot.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    circle(shot.x, shot.y, shot.r);
    ctx.fillStyle = color;
    ctx.fill();
    circle(shot.x, shot.y, shot.r * .56);
    ctx.fillStyle = '#fff2fe';
    ctx.fill();
  }
  ctx.lineCap = 'butt';
}

function drawCover() {
  for (const block of cover) {
    const { x, y, r } = block;
    if (block.hp <= 0) {
      polygon(x, y, r * .85, 8, Math.PI / 8);
      ctx.fillStyle = '#1613228f';
      ctx.fill();
      continue;
    }
    polygon(x + 4, y + 6, r + 2, 8, Math.PI / 8);
    ctx.fillStyle = '#080713a8';
    ctx.fill();
    polygon(x, y, r, 8, Math.PI / 8);
    ctx.fillStyle = block.hit > 0 && !reducedMotion.matches ? '#796485' : '#353047';
    ctx.fill();
    ctx.strokeStyle = sector.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    polygon(x, y, r * .76, 8, Math.PI / 8);
    ctx.fillStyle = '#201b30';
    ctx.fill();
    ctx.strokeStyle = '#ffffff26';
    ctx.stroke();
    ctx.fillStyle = sector.color;
    ctx.fillRect(x - r * .46, y - 2, r * .92, 4);
    if (block.hp < block.maxHp) {
      ctx.fillStyle = '#110d1a';
      ctx.fillRect(x - r * .49, y - r - 8, r * .98, 4);
      ctx.fillStyle = sector.color;
      ctx.fillRect(x - r * .49, y - r - 8, r * .98 * block.hp / block.maxHp, 4);
    }
  }
}

function drawObjectives() {
  if (extraction && !boss) {
    const { x, y, r } = extractionZone;
    circle(x, y, r);
    ctx.fillStyle = '#82f9dd22';
    ctx.strokeStyle = '#82f9dd';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.stroke();
    if (extraction.held > 0) {
      ctx.beginPath();
      ctx.arc(x, y, r + 7, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * extraction.held / extractionHold);
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    ctx.fillStyle = '#9dffea';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXTRACTION', x, y - r + 22);
  }
  if (vent) {
    circle(vent.x, vent.y, vent.r);
    ctx.fillStyle = '#ff995040';
    ctx.fill();
    ctx.strokeStyle = '#ffb582';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
    circle(vent.x, vent.y, vent.r * clamp(1 - (vent.at - elapsed) / 1.25, 0, 1));
    ctx.stroke();
  }
  if (boss || contract?.status !== 'active') return;
  if (contract.zone) {
    const { x, y, r } = contract.zone;
    circle(x, y, r);
    ctx.fillStyle = '#83f9dc29';
    ctx.fill();
    ctx.strokeStyle = '#83f9dcb0';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * contract.held / contract.goal);
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  for (const { x, y } of contract.crates ?? []) {
    circle(x, y, 25);
    ctx.fillStyle = '#82f9dd29';
    ctx.fill();
    ctx.strokeStyle = '#82f9dd';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#284a48';
    ctx.fillRect(x - 10, y - 8, 20, 16);
    ctx.strokeRect(x - 10, y - 8, 20, 16);
    ctx.fillStyle = '#82f9dd';
    ctx.fillRect(x - 3, y - 2, 6, 4);
  }
}

function drawSupport(enemy) {
  const guard = protectingTank(enemy);
  if (guard) {
    ctx.strokeStyle = '#f3df8b90';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(enemy.x, enemy.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (enemy.repairBeam && elapsed - enemy.repairBeam.at < .32) {
    ctx.strokeStyle = '#a5e9a3';
    ctx.lineWidth = 3;
    for (const target of enemy.repairBeam.targets) {
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      circle(target.x, target.y, 9 + (elapsed - enemy.repairBeam.at) * 55);
      ctx.stroke();
    }
  }
  if (enemy.form > 1) {
    ctx.strokeStyle = enemy.form === 3 ? '#b7faff' : '#ead7ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < enemy.form; i++) {
      const y = enemy.y - enemy.r - 19 - i * 6;
      ctx.moveTo(enemy.x - 5, y);
      ctx.lineTo(enemy.x, y - 4);
      ctx.lineTo(enemy.x + 5, y);
    }
    ctx.stroke();
  }
  if (enemy.contractTarget) {
    polygon(enemy.x, enemy.y - enemy.r - 20, 7, 4, 0);
    ctx.fillStyle = '#ffce8c';
    ctx.fill();
  }
}

function drawRadar() {
  const { width: mapW, height: mapH } = radar.canvas;
  const inset = 7;
  const innerW = mapW - inset * 2;
  const innerH = mapH - inset * 2;
  const sx = innerW / world.w;
  const sy = innerH / world.h;
  radar.fillStyle = '#0e0c1b';
  radar.fillRect(0, 0, mapW, mapH);
  radar.save();
  radar.beginPath();
  radar.rect(inset, inset, innerW, innerH);
  radar.clip();
  if (extraction && !boss) {
    radar.beginPath();
    radar.ellipse(inset + extractionZone.x * sx, inset + extractionZone.y * sy,
      extractionZone.r * sx, extractionZone.r * sy, 0, 0, 2 * Math.PI);
    radar.strokeStyle = colors.player;
    radar.stroke();
  }
  radar.strokeStyle = '#5a4f743f';
  radar.beginPath();
  for (const portion of [.25, .5, .75]) {
    const x = inset + innerW * portion;
    const y = inset + innerH * portion;
    radar.moveTo(x, inset);
    radar.lineTo(x, mapH - inset);
    radar.moveTo(inset, y);
    radar.lineTo(mapW - inset, y);
  }
  radar.stroke();

  const view = [inset + camera.x * sx, inset + camera.y * sy, width / zoom * sx, height / zoom * sy];
  radar.fillStyle = '#b992ff22';
  radar.fillRect(...view);
  radar.strokeStyle = '#b992ff8d';
  radar.strokeRect(...view);
  for (const block of cover) {
    if (block.hp <= 0) continue;
    radar.fillStyle = '#88779f';
    radar.fillRect(inset + (block.x - block.r) * sx, inset + (block.y - block.r) * sy, block.r * 2 * sx, block.r * 2 * sy);
  }
  if (!boss && contract?.status === 'active' && contract.zone) {
    const { x, y, r } = contract.zone;
    radar.beginPath();
    radar.ellipse(inset + x * sx, inset + y * sy, r * sx, r * sy, 0, 0, Math.PI * 2);
    radar.strokeStyle = colors.player;
    radar.lineWidth = 2;
    radar.stroke();
    radar.lineWidth = 1;
  }
  if (!boss && contract?.status === 'active') {
    radar.fillStyle = colors.player;
    for (const crate of contract.crates ?? []) radar.fillRect(inset + crate.x * sx - 3, inset + crate.y * sy - 3, 6, 6);
  }
  for (const enemy of enemies) {
    radar.beginPath();
    radar.arc(inset + enemy.x * sx, inset + enemy.y * sy, enemy.milestone ? 6 : 3.2, 0, Math.PI * 2);
    radar.fillStyle = enemy.color;
    radar.fill();
    if (enemy.contractTarget) {
      radar.strokeStyle = '#ffce8c';
      radar.stroke();
    }
  }
  radar.save();
  radar.translate(inset + player.x * sx, inset + player.y * sy);
  radar.rotate(player.angle);
  radar.beginPath();
  radar.moveTo(6, 0);
  radar.lineTo(-4, -4);
  radar.lineTo(-3, 0);
  radar.lineTo(-4, 4);
  radar.closePath();
  radar.fillStyle = colors.player;
  radar.fill();
  radar.restore();
  radar.restore();
  radar.strokeStyle = '#7664949e';
  radar.strokeRect(inset + .5, inset + .5, innerW - 1, innerH - 1);
}

function draw() {
  updateCamera();
  ctx.fillStyle = '#0a0915';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  if (screenShake && !reducedMotion.matches && shake > 0) {
    ctx.translate(Math.sin(elapsed * 123) * shake, Math.cos(elapsed * 147) * shake * .6);
  }
  ctx.scale(zoom, zoom);
  ctx.translate(-camera.x, -camera.y);
  ctx.drawImage(arenaFloor, 0, 0);

  const right = camera.x + width / zoom + 70;
  const bottom = camera.y + height / zoom + 70;
  const visible = ({ x, y }) => x >= camera.x - 70 && x <= right && y >= camera.y - 70 && y <= bottom;
  drawCover();
  drawObjectives();
  drawBossEffects();
  for (const enemy of enemies) if (enemy.warning) drawWarning(enemy);
  for (const impact of groundBursts) {
    const age = (elapsed - impact.at) / .4;
    circle(impact.x, impact.y, impact.r * (.65 + .35 * age));
    ctx.globalAlpha = .3 * (1 - age);
    ctx.fillStyle = ctx.strokeStyle = impact.color;
    ctx.fill();
    ctx.globalAlpha = .9 * (1 - age);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const shape of shapes) if (visible(shape)) drawShape(shape);
  for (const mote of motes) {
    if (!visible(mote)) continue;
    circle(mote.x, mote.y, 9);
    ctx.fillStyle = '#9fbaff2e';
    ctx.fill();
    polygon(mote.x, mote.y, 5.5, 4, elapsed * 3);
    ctx.fillStyle = colors.core;
    ctx.fill();
  }
  for (const drop of coinDrops) {
    if (!visible(drop)) continue;
    circle(drop.x, drop.y, 9);
    ctx.fillStyle = '#efbe57';
    ctx.fill();
    ctx.strokeStyle = '#fff0a8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#6e4719';
    ctx.fillRect(drop.x - 1.5, drop.y - 4, 3, 8);
  }
  for (const enemy of enemies) if (visible(enemy)) drawSupport(enemy);
  for (const enemy of enemies) if (visible(enemy)) tank(enemy, false);
  tank(player, true);
  drawShots();
  for (const spark of sparks) {
    ctx.globalAlpha = spark.life / spark.maxLife;
    ctx.fillStyle = spark.color;
    ctx.fillRect(spark.x, spark.y, 3, 3);
  }
  ctx.font = '800 15px Bricolage, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#141123';
  ctx.fillStyle = '#ecdeff';
  for (const pop of scorePops) {
    const age = (elapsed - pop.at) / .72;
    const y = pop.y - (reducedMotion.matches ? 0 : age * 22);
    ctx.globalAlpha = Math.min(1, (1 - age) * 2.3);
    ctx.strokeText('+' + pop.points, pop.x, y);
    ctx.fillText('+' + pop.points, pop.x, y);
  }
  for (const pop of damagePops) {
    const age = (elapsed - pop.at) / .50;
    const y = pop.y - 9 - (reducedMotion.matches ? 0 : age * 24);
    const number = String(Math.max(1, Math.round(pop.value)));
    ctx.globalAlpha = Math.min(1, (1 - age) * 2.3);
    ctx.fillStyle = pop.critical ? '#ffe58f' : '#f6eaff';
    ctx.strokeText(number, pop.x, y);
    ctx.fillText(number, pop.x, y);
  }
  ctx.restore();

  for (const touch of [leftTouch, rightTouch]) {
    if (!touch) continue;
    const dx = touch.x - touch.startX;
    const dy = touch.y - touch.startY;
    const travel = stickRadius - 10;
    const scale = travel / Math.max(stickRadius, Math.hypot(dx, dy));
    ctx.lineWidth = 1.5;
    circle(touch.startX, touch.startY, stickRadius - 4);
    ctx.fillStyle = '#15102588';
    ctx.fill();
    ctx.strokeStyle = '#c0a2ff96';
    ctx.stroke();
    circle(touch.startX + dx * scale, touch.startY + dy * scale, 13);
    ctx.fillStyle = touch === leftTouch ? '#82f9dda9' : '#c0a2ffb5';
    ctx.fill();
  }
  drawRadar();
}

function updateHud() {
  const hostiles = reinforcements.length + enemies.length;
  const shield = Math.ceil(player.shield + (elapsed < player.abilityUntil ? player.deflector : 0));
  const values = {
    wave: String(wave).padStart(2, '0'),
    remaining: boss ? 'Boss fight' : hostiles ? hostiles + (hostiles === 1 ? ' hostile' : ' hostiles')
      : contract?.status === 'active' ? 'Contract active' : 'Wave clear',
    score: score.toLocaleString(), best: best.toLocaleString(),
    hull: Math.ceil(player.hp) + ' / ' + player.maxHp + (shield ? ' · +' + shield : ''),
    level: 'Level ' + level,
    'xp-label': Math.floor(xp + 1e-6) + ' / ' + xpNeeded() + ' XP'
  };
  let notice = '';
  if (state === 'playing') {
    if (extraction && !boss) {
      notice = extraction.held > 0 ? 'Extracting · ' + (extractionHold - extraction.held).toFixed(1) + 's'
        : 'Extract at center · ' + Math.ceil(extraction.left) + 's left · Hold 2s';
    } else if (banner > 0) notice = bannerText;
    else if (hostiles === 0 && nextWave !== null) notice = 'Wave clear · +' + waveExperience(wave) + ' XP';
  }
  values.notice = notice;
  ui['run-coins'].hidden = !run.coins && !difficulty.eliteDrop;
  values['run-coins'] = run.coins.toLocaleString() + ' coins collected';
  const abilityWait = Math.max(0, player.abilityReadyAt - elapsed);
  values['ability-name'] = player.ability.name;
  const activeTime = Math.max(0, player.abilityUntil - elapsed);
  values['ability-ready'] = activeTime > 0 ? 'Active · ' + Math.ceil(activeTime) + 's'
    : abilityWait > 0 ? Math.ceil(abilityWait) + 's' : touchInput ? 'Ready' : 'Q · Ready';
  ui['ability-button'].disabled = abilityWait > 0;
  ui['ability-button'].title = player.ability.description + ' ' + player.ability.cooldown + 's base cooldown.';
  const rule = ruleForWave(wave);
  ui['wave-rule'].hidden = !rule || Boolean(boss);
  values['wave-rule'] = rule?.name ?? '';
  ui['wave-rule'].title = rule?.description ?? '';
  if (boss) {
    values['boss-name'] = boss.name;
    values['boss-level'] = 'Lv. ' + boss.milestone + ' · Phase ' + (boss.enraged ? '2' : '1');
    values['boss-attack'] = elapsed < boss.stunUntil ? 'Stunned'
      : boss.warning?.attack.name ?? boss.beam?.attack.name ?? (boss.charge ? 'Charging' : 'Recovering');
    const warning = boss.warning;
    ui['boss-windup'].style.width = (warning ? (1 - warning.left / warning.duration) * 100 : 0) + '%';
    const percent = Math.max(0, boss.hp / boss.maxHp * 100);
    ui['boss-health'].style.width = percent + '%';
    const value = String(Math.ceil(percent));
    if (ui['boss-meter'].getAttribute('aria-valuenow') !== value) ui['boss-meter'].setAttribute('aria-valuenow', value);
  }
  ui['boss-hud'].hidden = !boss;
  const offered = contractOffered();
  const active = contract?.status === 'active';
  ui.contract.hidden = state !== 'playing' || Boolean(boss) || (!offered && !active);
  if (offered || active) {
    ui['accept-contract'].hidden = !offered;
    values['contract-name'] = offered ? contract.name + ' · ' + contract.seconds + 's' : contract.name;
    const objective = contract.id === 'hold' ? Math.floor(contract.held) + ' / ' + contract.goal + 's in zone'
      : contract.id === 'hunt' ? 'Destroy the marked elite'
      : Math.min(contract.goal, Math.floor(contract.progress + 1e-6)) + ' / ' + contract.goal + ' ' + contract.unit;
    const reward = player.modules.length < modules.length ? 'Module reward.' : 'Score and hull reward.';
    values['contract-info'] = offered ? contract.detail + ' ' + reward
      : huntTargetPending() ? 'Marked elite incoming'
      : objective + ' · ' + Math.ceil(contract.left) + 's left';
  }
  arena.classList.toggle('boss-fight', Boolean(boss));
  for (const [id, value] of Object.entries(values)) if (ui[id].textContent !== value) ui[id].textContent = value;
  const hullFraction = player.hp / player.maxHp;
  ui['tank-status'].classList.toggle('critical', hullFraction <= .3);
  ui.health.style.width = hullFraction * 100 + '%';
  ui.xp.style.width = xp / xpNeeded() * 100 + '%';
}

function togglePause() {
  if (state === 'playing') setState('paused');
  else if (state === 'paused') setState('playing');
}

ui.launch.addEventListener('click', start);
ui['accept-contract'].addEventListener('click', acceptContract);
ui['ability-button'].addEventListener('click', () => {
  activateAbility();
  ui['ability-button'].blur();
});
ui['return-lobby'].addEventListener('click', () => {
  reset();
  setState('menu');
  updateHud();
  ui['lobby-best'].textContent = best.toLocaleString();
});
ui.primary.addEventListener('click', () => {
  if (state === 'paused') togglePause();
  else if (state === 'ended') start();
});
ui.pause.addEventListener('click', togglePause);
ui.sound.addEventListener('click', async () => {
  if (sound) {
    sound = false;
  } else {
    try {
      audio ||= new AudioContext();
      await audio.resume();
      sound = true;
      playTone(330, .12, .05, 'triangle', 550);
    } catch {
      ui.sound.disabled = true;
      ui.sound.title = ui['sound-label'].textContent = 'Sound unavailable';
      ui.sound.setAttribute('aria-label', 'Sound unavailable');
      return;
    }
  }
  ui.sound.title = ui['sound-label'].textContent = sound ? 'Sound on' : 'Sound off';
  ui.sound.setAttribute('aria-pressed', String(sound));
});

const gameKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ']);
addEventListener('keydown', event => {
  const modal = ui['field-guide'].open ? ui['field-guide'] : ui['career-shop'].open ? ui['career-shop'] : null;
  if (modal) {
    if (event.key === 'Escape' && !event.repeat) {
      event.preventDefault();
      modal.close();
    }
    return;
  }
  const key = event.key.toLowerCase();
  if (key === 'q' && !event.repeat && state === 'playing') {
    event.preventDefault();
    activateAbility();
  }
  if (key === 'e' && !event.repeat) acceptContract();
  if ((key === 'p' || key === 'escape') && !event.repeat) togglePause();
  if (state === 'playing' && gameKeys.has(key) && !(event.target instanceof HTMLButtonElement)) {
    event.preventDefault();
    keys.add(key);
  }
});
addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
addEventListener('blur', () => { if (state === 'playing') setState('paused'); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') setState('paused');
});
function setTouchInput(enabled) {
  touchInput = enabled;
  arena.dataset.input = enabled ? 'touch' : 'pointer';
  ui['ability-control'].textContent = enabled ? 'Tap the ability button between the sticks in play.' : 'Press Q or click the ability button in play.';
}

function syncTouchSticks() {
  arena.classList.toggle('move-stick-active', Boolean(leftTouch));
  arena.classList.toggle('aim-stick-active', Boolean(rightTouch));
}

function clearTouchSticks() {
  const captures = [leftTouch, rightTouch];
  leftTouch = rightTouch = null;
  aimTarget = null;
  aimRefreshAt = 0;
  syncTouchSticks();
  for (const touch of captures) {
    if (touch?.id != null && field.hasPointerCapture(touch.id)) field.releasePointerCapture(touch.id);
  }
}

field.addEventListener('pointerdown', event => {
  if (state !== 'playing' || event.button !== 0) return;
  if (event.pointerType === 'touch') {
    const moveStick = event.clientX < width / 2;
    if (moveStick ? leftTouch : rightTouch) return;
    setTouchInput(true);
    pointer.active = false;
    pointer.down = false;
    const touch = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY };
    if (moveStick) leftTouch = touch;
    else rightTouch = touch;
    syncTouchSticks();
  } else {
    if (leftTouch || rightTouch) return;
    setTouchInput(false);
    Object.assign(pointer, { x: event.clientX, y: event.clientY, active: true, down: true });
  }
  field.setPointerCapture(event.pointerId);
});
field.addEventListener('pointermove', event => {
  if (state !== 'playing') return;
  if (event.pointerType === 'touch') {
    const touch = [leftTouch, rightTouch].find(item => item?.id === event.pointerId);
    if (!touch) return;
    const dx = event.clientX - touch.startX;
    const dy = event.clientY - touch.startY;
    const gap = Math.hypot(dx, dy);
    if (gap > stickRadius) {
      touch.startX = event.clientX - dx * stickRadius / gap;
      touch.startY = event.clientY - dy * stickRadius / gap;
    }
    Object.assign(touch, { x: event.clientX, y: event.clientY });
  } else if (!leftTouch && !rightTouch) {
    Object.assign(pointer, { x: event.clientX, y: event.clientY, active: true });
  }
});
function releasePointer(event) {
  if (leftTouch?.id === event.pointerId) leftTouch = null;
  if (rightTouch?.id === event.pointerId) {
    rightTouch = null;
    aimRefreshAt = 0;
  }
  syncTouchSticks();
  if (event.pointerType !== 'touch') pointer.down = false;
}
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) field.addEventListener(event, releasePointer);

function selectedDifficulty() {
  const mode = difficultyModes.find(item => item.id === ui.difficulty.value);
  return mode && canPlayDifficulty(mode) ? mode : difficultyModes[1];
}

function tankFinish(model, skin) {
  return model.baseClass && skin.id === 'standard' ? { ...skin, color: model.color, armor: model.hullColor } : skin;
}

function refreshEquipment() {
  const tankId = ui['tank-class'].value;
  ui['tank-class'].replaceChildren(...[...tankClasses, ...shopTanks.filter(item => career.tanks.includes(item.id))]
    .map(model => new Option(model.name, model.id)));
  if ([...ui['tank-class'].options].some(option => option.value === tankId)) ui['tank-class'].value = tankId;
  const modeId = selectedDifficulty().id;
  ui.difficulty.replaceChildren(...difficultyModes.map(mode => {
    const locked = !canPlayDifficulty(mode);
    const previousMode = difficultyModes.find(item => item.id === mode.unlockOn);
    const requirement = locked ? ' · Wave ' + difficultyUnlockWave + ' on ' + previousMode.name : '';
    const option = new Option(mode.name + requirement, mode.id);
    option.disabled = locked;
    return option;
  }));
  ui.difficulty.value = modeId;
  for (const [id, items] of [['ability-select', activeAbilities], ['tank-finish', tankFinishes]]) {
    const select = ui[id];
    const selected = select.value;
    select.replaceChildren(...items.map(item => {
      const locked = item.unlock && !unlocked.has(item.unlock);
      const label = item.name + (locked ? ' · ' + unlockMilestones[item.unlock].goal : '');
      const option = new Option(label, item.id);
      option.disabled = Boolean(locked);
      return option;
    }));
    if ([...select.options].some(option => option.value === selected && !option.disabled)) select.value = selected;
  }
  ui['unlock-list'].replaceChildren(...Object.entries(unlockMilestones).map(([id, item]) => {
    const row = document.createElement('li');
    row.textContent = item.name + ' · ' + (unlocked.has(id) ? 'Unlocked' : item.goal);
    return row;
  }));
  updateLoadoutHelp();
}

function updateLoadoutHelp() {
  const mode = selectedDifficulty();
  const tank = loadoutTank(ui['tank-class'].value, mode);
  const ability = activeAbilities.find(ability => ability.id === ui['ability-select'].value);
  ui['tank-help'].textContent = tank.description + (tank.baseClass ? ' Shop power at ' + Math.round(mode.powerShare * 100) + '%.' : '');
  const strength = mode.scale === 1 ? 'Standard enemy hull and damage.'
    : Math.round(mode.scale * 100) + '% of Medium enemy hull and damage.';
  const nextMode = difficultyModes.find(item => item.unlockOn === mode.id);
  const unlockInfo = nextMode ? ' Reach wave ' + difficultyUnlockWave + ' to unlock ' + nextMode.name + '.' : '';
  const rewardInfo = {
    easy: ' Daily progress is disabled.',
    medium: '',
    hard: ' Elites and bosses can drop coins.',
    nightmare: ' More coin drops. Shop tanks recommended.'
  }[mode.id];
  ui['difficulty-help'].textContent = strength + unlockInfo + rewardInfo;
  ui['ability-help'].textContent = ability.description;
  renderTankStats(ui['tank-stats'], tank, 'tank');
  ui['ability-timing'].textContent = ability.cooldown + 's cooldown';
  for (const preview of [ui['tank-preview'], ui['tank-preview-mobile']]) {
    showTankArtwork(preview, tank);
  }
  updateFinishPreview();
}
function drawTankThumbnail(canvas, model, finish, evolution, scale = 1) {
  const brush = canvas.getContext('2d');
  brush.clearRect(0, 0, canvas.width, canvas.height);
  brush.save();
  brush.translate(canvas.width * .45, canvas.height * .54);
  brush.scale(scale, scale);
  tank({ ...model, finish, evolution, classId: model.baseClass ?? model.id, maxHp: model.hp, firedAt: -Infinity,
    x: 0, y: 0, r: Math.min(26, model.r ?? 20) + (evolution?.size ?? 0),
    angle: -.35, barrels: model.barrels ?? 1 }, Boolean(finish), brush);
  brush.restore();
}

function showTankArtwork(image, model) {
  if (image.dataset.tank === model.id) return;
  image.dataset.tank = model.id;
  image.alt = model.previewAlt;

  let fallback = image.nextElementSibling;
  if (!fallback?.classList.contains('tank-art-fallback')) {
    fallback = document.createElement('canvas');
    fallback.className = 'tank-art-fallback ' + image.className;
    fallback.width = 480;
    fallback.height = 320;
    fallback.setAttribute('role', 'img');
    image.after(fallback);
  }
  fallback.setAttribute('aria-label', model.name + ' tank as it appears in the arena');
  drawTankThumbnail(fallback, model, tankFinish(model, tankFinishes[0]), null, 4);
  fallback.hidden = false;
  image.hidden = true;

  if (!model.preview) {
    image.removeAttribute('src');
    return;
  }
  if (image.getAttribute('src') !== model.preview) image.src = model.preview;
  const source = new URL(model.preview, document.baseURI).href;
  image.decode().then(() => {
    if (image.dataset.tank !== model.id || image.currentSrc !== source) return;
    image.hidden = false;
    fallback.hidden = true;
  }).catch(() => {
    // The in-game illustration stays visible if the preview can't load its artwork.
  });
}

function updateFinishPreview() {
  const model = loadoutTank(ui['tank-class'].value, selectedDifficulty());
  const finish = tankFinishes.find(skin => skin.id === ui['tank-finish'].value) ?? tankFinishes[0];
  drawTankThumbnail(ui['finish-preview'], model, tankFinish(model, finish));
  ui['finish-preview'].setAttribute('aria-label', finish.name + ' skin on ' + model.name);
}
ui['tank-class'].addEventListener('change', updateLoadoutHelp);
ui['ability-select'].addEventListener('change', updateLoadoutHelp);
ui.difficulty.addEventListener('change', updateLoadoutHelp);
ui['tank-finish'].addEventListener('change', updateFinishPreview);
for (const control of [ui['screen-shake'], ui['pause-shake']]) {
  control.checked = screenShake;
  control.addEventListener('change', () => {
    screenShake = ui['screen-shake'].checked = ui['pause-shake'].checked = control.checked;
    savePilot();
  });
}
function syncTouchAim() {
  ui['touch-aim'].checked = ui['pause-touch-aim'].checked = autoAim;
  ui['touch-aim-label'].textContent = autoAim ? 'Manual aim' : 'Aim & fire';
}
for (const control of [ui['touch-aim'], ui['pause-touch-aim']]) {
  control.addEventListener('change', () => {
    autoAim = control.checked;
    syncTouchAim();
    savePilot();
  });
}
setTouchInput(touchInput);
syncTouchAim();
refreshEquipment();
ui['lobby-best'].textContent = best.toLocaleString();
addEventListener('resize', resize);
resize();
reset();
let last = performance.now();
function frame(now) {
  const dt = Math.min(.033, Math.max(0, (now - last) / 1000));
  last = now;
  if (state === 'playing') {
    const steps = Math.max(1, Math.ceil(dt * 120));
    for (let step = 0; step < steps && state === 'playing'; step++) update(dt / steps);
    draw();
    updateHud();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
