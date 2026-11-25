'use strict';

const difficultyUnlockWave = 60;
const difficultyModes = [
  { id: 'easy', name: 'Easy', scale: .8, powerShare: .08, dailyCoins: 0, dailyPoints: 0 },
  { id: 'medium', name: 'Medium', scale: 1, powerShare: .22, dailyCoins: 50, dailyPoints: .5 },
  { id: 'hard', name: 'Hard', unlockOn: 'medium', scale: 1.65, powerShare: .64, dailyCoins: 75, dailyPoints: 1,
    eliteDrop: .05, bossDrop: .18, eliteCoins: 5, bossCoins: 30 },
  { id: 'nightmare', name: 'Nightmare', unlockOn: 'hard', scale: 3.3, powerShare: 1, dailyCoins: 110, dailyPoints: 1.5,
    eliteDrop: .08, bossDrop: .26, eliteCoins: 10, bossCoins: 50 }
];

const dailyObjectives = [
  { id: 'kills', label: 'Defeat 50 enemy tanks', goal: 50 },
  { id: 'waves', label: 'Clear 6 waves', goal: 6 },
  { id: 'elites', label: 'Defeat 7 elites', goal: 7 },
  { id: 'contracts', label: 'Complete 2 contracts', goal: 2 }
];

const careerKey = 'iron-circuit-career';
const career = { coins: 0, points: 0, hard: false, nightmare: false, tanks: [], evolutions: [], daily: null };
try {
  const saved = JSON.parse(localStorage.getItem(careerKey));
  if (saved) {
    if (Number.isSafeInteger(saved.coins) && saved.coins >= 0) career.coins = saved.coins;
    if (typeof saved.points === 'number' && Number.isSafeInteger(saved.points * 2) && saved.points >= 0) career.points = saved.points;
    career.hard = saved.hard === true;
    career.nightmare = career.hard && saved.nightmare === true;
    if (Array.isArray(saved.tanks)) career.tanks = shopTanks.filter(item => saved.tanks.includes(item.id)).map(item => item.id);
    if (Array.isArray(saved.evolutions)) career.evolutions = shopEvolutions.filter(item => saved.evolutions.includes(item.id)).map(item => item.id);
    if (/^\d{4}-\d{2}-\d{2}$/.test(saved.daily?.date) && Number.isFinite(saved.daily.progress)) {
      career.daily = { date: saved.daily.date, progress: Math.max(0, saved.daily.progress), claimed: saved.daily.claimed === true };
    }
  }
} catch {}

function saveCareer() {
  try { localStorage.setItem(careerKey, JSON.stringify(career)); } catch {}
}

function dailyObjective(now = new Date()) {
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  if (!career.daily || career.daily.date < today) career.daily = { date: today, progress: 0, claimed: false };
  const day = Math.floor(Date.parse(career.daily.date + 'T00:00:00Z') / 86400000);
  return dailyObjectives[(day % dailyObjectives.length + dailyObjectives.length) % dailyObjectives.length];
}

function canPlayDifficulty(mode) {
  if (mode.id === 'nightmare') return career.hard && career.nightmare;
  if (mode.id === 'hard') return career.hard;
  return true;
}

function loadoutTank(id, mode) {
  const standard = tankClasses.find(model => model.id === id);
  if (standard) return standard;
  const item = shopTanks.find(model => model.id === id);
  if (!item || !career.tanks.includes(id)) return tankClasses[0];
  return tuneShopTank(item, mode);
}

function tuneShopTank(item, mode) {
  const base = tankClasses.find(model => model.id === item.baseClass);
  const model = { ...base, ...item, preview: null, previewAlt: item.name + ' tank' };
  for (const stat of ['hp', 'damage', 'reload', 'speed', 'shotSpeed', 'shotLife']) {
    model[stat] = base[stat] + ((item[stat] ?? base[stat]) - base[stat]) * mode.powerShare;
  }
  model.hp = Math.round(model.hp);
  return model;
}

function buyCareerItem(id) {
  const tank = shopTanks.find(item => item.id === id);
  const item = tank ?? shopEvolutions.find(evolution => evolution.id === id);
  const balance = tank ? 'coins' : 'points';
  const owned = tank ? career.tanks : career.evolutions;
  if (!item || owned.includes(id) || career[balance] < item.price) return false;
  career[balance] -= item.price;
  owned.push(id);
  saveCareer();
  return true;
}
