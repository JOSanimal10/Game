'use strict';

const guide = byId('field-guide');
const guideTabs = byId('guide-sections');
const guideSearch = byId('guide-search');
const guideCards = byId('guide-cards');

function guideNode(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function guideCard(name, detail, meta) {
  const card = guideNode('article', null, 'guide-card');
  card.append(guideNode('h3', name));
  if (meta) card.append(guideNode('p', meta, 'guide-meta'));
  if (detail) card.append(guideNode('p', detail));
  return card;
}

function guideThumbnail(model, finish, evolution) {
  const canvas = guideNode('canvas', null, 'guide-thumbnail');
  canvas.width = 146;
  canvas.height = 78;
  canvas.setAttribute('aria-hidden', 'true');
  drawTankThumbnail(canvas, model, finish, evolution);
  return canvas;
}

function describeAttack(attack) {
  const count = attack.count ?? 1;
  switch (attack.kind) {
    case 'charge': return 'Marks a lane, then charges through it. Cover can stop the charge.';
    case 'radial': return 'Fires ' + count + ' projectiles in a ring. Move between the marked lanes.';
    case 'mortar': return count === 1 ? 'Marks a circle on the ground, then bombards it.'
      : 'Marks ' + count + ' circles on the ground, then bombards them together.';
    case 'field': return 'Marks ' + count + ' electrical pools that deal repeated damage for ' + attack.duration + ' seconds.';
    case 'summon': return 'Marks deployment points for up to ' + attack.escorts.length + ' escorts drawn from '
      + attack.escorts.map(kind => enemyTypes[kind].name).join(', ') + '. Surviving escorts leave when the boss falls.';
    case 'beam': return (attack.sweep < 0 ? 'Sweeps a wider beam in reverse. ' : 'Sweeps a beam across the marked arc. ')
      + 'Solid cover blocks the beam.';
    default: {
      const projectiles = count === 1 ? 'one shot' : count + ' shots in a spread';
      if (attack.bursts > 1 && count === 1) return 'Fires ' + attack.bursts + ' quick shots along the same lane.';
      return (attack.bursts > 1 ? 'Fires ' + attack.bursts + ' volleys of ' + projectiles + ' on the same lines.'
        : 'Fires ' + projectiles + '.') + (attack.windup ? ' Watch for the firing lane.' : '');
    }
  }
}

const enemyRoleNotes = {
  scout: 'Rushes to close range.',
  gunner: 'Strafes at medium range.',
  rammer: 'Closes distance to line up charges.',
  sniper: 'Keeps its distance and shows its firing lane before each shot.',
  heavy: 'A slow, durable tank with three barrels.',
  bulwark: 'Raises its shield between volleys.',
  mortar: 'Bombards marked positions from behind cover.',
  flanker: 'Circles to pressure your sides.',
  mechanic: 'Follows wounded allies and prioritizes the lowest hull among those it can reach.',
  crossfire: 'Strafes while firing paired shots.',
  triad: 'Covers wide firing lanes with triple volleys.'
};

function enemyGuideCards() {
  return Object.entries(enemyTypes).map(([kind, type]) => {
    const card = guideCard(type.name, enemyRoleNotes[kind]);
    card.append(guideThumbnail({ ...type, kind }));
    for (const form of [1, 2, 3]) {
      const model = enemyForm(kind, form);
      const block = guideNode('div', null, 'guide-item');
      block.append(guideNode('h4', form === 1 ? 'Form I' : model.name), guideNode('p',
        (form === 1 ? '' : 'Form ' + (form === 2 ? 'II' : 'III') + ' · ') + 'Wave '
        + (form === 1 ? type.unlock : model.wave), 'guide-meta'));
      if (model.orbit) block.append(guideNode('p', model.switchFlank ? 'Circles the player and can switch sides after firing.'
        : 'Circles the player and looks for the opposite flank from its allies.'));
      if (model.frontShield) block.append(guideNode('p', 'The raised front shield blocks 70% of damage from the front. Allies within '
        + (model.guardRange ?? 137) + ' units take ' + Math.round((model.guardReduction ?? .25) * 100) + '% less damage.'));
      if (model.repairs) block.append(guideNode('p', 'Repairs up to ' + (model.repairTargets ?? 1) + ' wounded '
        + (model.repairTargets > 1 ? 'allies' : 'ally') + ' within ' + (model.repairRange ?? 170) + ' units. Cover blocks the beam.'
        + (model.repairTargets > 1 ? ' Extra targets get ' + Math.round((model.sideRepair ?? .5) * 100) + '% of a full repair.' : '')));
      for (const attack of model.attacks) block.append(guideNode('p', describeAttack(attack)));
      card.append(block);
    }
    return card;
  });
}

function bossGuideCards() {
  return bossTypes.map((boss, index) => {
    const card = guideCard(boss.name, null, 'First encounter at level ' + (index + 1) * 10);
    card.append(guideThumbnail({ ...boss, milestone: 10 }));
    for (const attack of [...boss.attacks, boss.phaseAttack]) {
      const block = guideNode('div', null, 'guide-item');
      block.append(guideNode('h4', attack.name));
      if (attack === boss.phaseAttack) block.append(guideNode('p', 'New attack at half hull', 'guide-meta'));
      block.append(guideNode('p', describeAttack(attack)));
      card.append(block);
    }
    return card;
  });
}

function tankGuideCards() {
  const mode = selectedDifficulty();
  const classes = [...tankClasses, ...shopTanks].map(item => {
    const model = item.baseClass ? tuneShopTank(item, mode) : item;
    const stats = model.hp + ' hull · ' + Math.round(model.speed) + ' move speed';
    const card = guideCard(model.name, model.description, model.baseClass ? 'Shop tank · ' + mode.name + ' · ' + stats : stats);
    const image = guideNode('img', null, 'guide-class-art');
    card.prepend(image);
    showTankArtwork(image, model);
    for (const milestone of [firstEvolutionLevel, secondEvolutionLevel]) {
      for (const evolution of tankEvolutionsAt(model.id, milestone)) {
        const block = guideNode('div', null, 'guide-item guide-evolution');
        const description = guideNode('div');
        const price = evolution.price ? ' · ' + evolution.price + ' Evolution Points' : '';
        description.append(guideNode('h4', evolution.name), guideNode('p', 'Level ' + milestone + price, 'guide-meta'),
          guideNode('p', evolution.detail));
        block.append(guideThumbnail(model, tankFinish(model, tankFinishes[0]), evolution), description);
        card.append(block);
      }
    }
    return card;
  });
  return classes.concat(activeAbilities.map(ability => guideCard(ability.name, ability.description,
    'Active ability · ' + ability.cooldown + 's cooldown' + (ability.unlock ? ' · ' + unlockMilestones[ability.unlock].goal : ''))));
}

function upgradeGuideCards() {
  return upgradePaths.map(path => {
    const card = guideCard(path.name);
    card.dataset.path = path.id;
    for (const upgrade of path.upgrades) {
      const block = guideNode('div', null, 'guide-item');
      block.append(guideNode('h4', upgrade.name), guideNode('p', upgrade.max + ' ranks · '
        + (upgrade.needs ? 'Requires ' + upgrade.needs + ' points in ' + path.name : 'Available from the start'), 'guide-meta'),
      guideNode('p', upgrade.detail));
      card.append(block);
    }
    return card;
  });
}

const guideSections = [
  { name: 'Enemies', intro: 'Evolved tanks have two chevrons. Form III has three cyan chevrons. Gold outlines mark elites.',
    cards: enemyGuideCards },
  { name: 'Bosses', intro: 'A boss arrives every ten player levels. The six encounters repeat in this order.',
    cards: bossGuideCards },
  { name: 'Tanks', intro: 'Every tank has its own level 10 and level 25 evolution choices. Buy the special choices with Evolution Points.',
    cards: tankGuideCards },
  { name: 'Upgrades', intro: 'All tanks share these six paths. Spend one point per level. Each rank applies the listed effect and contributes toward that path’s requirements.',
    cards: upgradeGuideCards },
  { name: 'Contracts', intro: 'Every third wave offers an optional contract. Earn a module choice, or score and repairs after installing all modules.',
    cards: () => contractTypes.map(item => guideCard(item.name, item.detail, item.seconds + 's time limit'))
      .concat(modules.map(item => guideCard(item.name, item.detail, 'Contract module'))) },
  { name: 'Skins', intro: 'Equip unlocked skins under Settings & unlocks. Skins are cosmetic.',
    cards: () => tankFinishes.map(finish => {
      const card = guideCard(finish.name, null,
        finish.unlock && !unlocked.has(finish.unlock) ? unlockMilestones[finish.unlock].goal : 'Unlocked');
      card.append(guideThumbnail(tankClasses[0], finish));
      return card;
    }) }
];

let guideSection = guideSections[0];
let guideOpener;

function filterGuide() {
  const terms = guideSearch.value.toLowerCase().trim().split(/\s+/);
  let found = false;
  for (const card of guideCards.children) {
    const content = card.textContent.toLowerCase();
    card.hidden = !terms.every(term => content.includes(term));
    found ||= !card.hidden;
  }
  byId('guide-empty').hidden = found;
}

function selectGuideSection(section) {
  guideSection = section;
  for (const button of guideTabs.children) button.setAttribute('aria-pressed', String(button.textContent === section.name));
  guideSearch.value = '';
  byId('guide-intro').textContent = section.intro;
  guideCards.replaceChildren(...section.cards());
  filterGuide();
  byId('guide-body').scrollTop = 0;
}

for (const section of guideSections) {
  const button = guideNode('button', section.name);
  button.type = 'button';
  button.addEventListener('click', () => selectGuideSection(section));
  guideTabs.append(button);
}
guideSearch.addEventListener('input', filterGuide);
byId('guide-close').addEventListener('click', () => guide.close());
guide.addEventListener('close', () => {
  guideOpener?.focus({ preventScroll: true });
  guideOpener = null;
});
for (const button of document.querySelectorAll('[data-open-guide]')) {
  button.addEventListener('click', () => {
    guideOpener = button;
    selectGuideSection(guideSection);
    guide.showModal();
  });
}

const shop = byId('career-shop');
const openShop = byId('open-shop');

function renderShop() {
  const objective = dailyObjective();
  byId('shop-wallet').textContent = career.coins.toLocaleString() + ' coins · ' + career.points.toLocaleString() + ' Evolution Points';
  byId('daily-objective').textContent = career.daily.claimed ? 'Complete · ' + objective.label : objective.label;
  const meter = byId('daily-progress');
  meter.max = objective.goal;
  meter.value = Math.min(objective.goal, career.daily.progress);
  meter.setAttribute('aria-valuetext', meter.value + ' of ' + meter.max);
  const mode = selectedDifficulty();
  byId('daily-reward').textContent = career.daily.claimed ? 'Reward earned today. A new challenge opens at local midnight.'
    : meter.value + ' / ' + meter.max + ' · ' + (mode.dailyCoins
      ? mode.name + ' reward: ' + mode.dailyCoins + ' coins and ' + mode.dailyPoints.toLocaleString() + ' EP.'
      : 'Daily progress is disabled on Easy.') + ' Progress carries across runs.';
  const stock = [[shopTanks, 'Tanks', 'coins', career.tanks], [shopEvolutions, 'Level 25 evolutions', 'points', career.evolutions]];
  byId('shop-cards').replaceChildren(...stock.map(([items, title, balance, owned]) => {
    const section = guideNode('section', null, 'shop-section');
    section.append(guideNode('h3', title), guideNode('p', balance === 'coins'
      ? 'Shop tank bonuses scale with difficulty. The stats below show their power on ' + mode.name + '.'
      : 'Use Evolution Points from dailies to unlock extra choices at level 25. Bonus power scales with difficulty.', 'shop-note'));
    const grid = guideNode('div', null, 'guide-cards');
    for (const item of items) {
      const tank = balance === 'coins';
      const currency = tank ? 'coins' : 'EP';
      const definition = tank ? item : [...tankClasses, ...shopTanks].find(model => model.id === item.tankId);
      const model = definition.baseClass ? tuneShopTank(definition, mode) : definition;
      const card = guideCard(item.name, item.description ?? item.detail,
        (tank ? 'Tank' : model.name + ' · Level 25') + ' · ' + item.price.toLocaleString() + ' ' + currency);
      card.prepend(guideThumbnail(model, tankFinish(model, tankFinishes[0]), tank ? undefined : item));
      if (tank) {
        const stats = guideNode('dl', null, 'tank-stats shop-stats');
        stats.setAttribute('aria-label', item.name + ' stats on ' + mode.name);
        renderTankStats(stats, model, 'shop-' + item.id);
        card.append(stats);
      }
      const purchased = owned.includes(item.id);
      const label = purchased ? 'Owned' : career[balance] < item.price ? 'Need ' + (item.price - career[balance]).toLocaleString() + ' more ' + currency
        : 'Buy for ' + item.price.toLocaleString() + ' ' + currency;
      const button = guideNode('button', label, 'hud-button');
      button.type = 'button';
      button.dataset.purchase = item.id;
      button.disabled = purchased || career[balance] < item.price;
      button.addEventListener('click', () => {
        if (!buyCareerItem(item.id)) return;
        refreshEquipment();
        if (tank) {
          ui['tank-class'].value = item.id;
          updateLoadoutHelp();
        }
        renderShop();
        byId('shop-close').focus({ preventScroll: true });
      });
      card.append(button);
      grid.append(card);
    }
    section.append(grid);
    return section;
  }));
}

openShop.addEventListener('click', () => {
  renderShop();
  shop.querySelector('.shop-body').scrollTop = 0;
  shop.showModal();
});
byId('shop-close').addEventListener('click', () => shop.close());
shop.addEventListener('close', () => openShop.focus({ preventScroll: true }));
