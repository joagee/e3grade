import { loadState, saveState } from './storage.js';
import { loadData, avatarItemById } from './data.js';

export function defaultState() {
  return {
    coins: 0,
    unlockedChapter: 1,
    chapterDone: {},
    dailyDone: null,
    learnedWords: [],
    ownedItems: ['hat_none', 'outfit_none', 'pet_none'],
    equipped: { hat: 'hat_none', outfit: 'outfit_none', pet: 'pet_none' },
    gachaPulls: 0,
    lastPlayDate: null,
    streak: 0,
  };
}

export async function persistState(s) {
  await saveState(s);
  return s;
}

export async function getState() {
  const s = await loadState();
  if (s) return { ...defaultState(), ...s };
  const fresh = defaultState();
  await saveState(fresh);
  return fresh;
}

async function saveMerged(s) {
  await saveState(s);
  return s;
}

export async function addCoins(n) {
  const s = await getState();
  s.coins += n;
  return saveMerged(s);
}

export async function spendCoins(n) {
  const s = await getState();
  if (s.coins < n) return false;
  s.coins -= n;
  await saveState(s);
  return true;
}

export async function buyItem(itemId) {
  await loadData();
  const item = avatarItemById(itemId);
  if (!item || item.source !== 'shop') return false;
  const s = await getState();
  if (s.ownedItems.includes(itemId)) return false;
  if (s.coins < item.price) return false;
  s.coins -= item.price;
  s.ownedItems.push(itemId);
  await saveState(s);
  return true;
}

export async function equipItem(itemId) {
  await loadData();
  const item = avatarItemById(itemId);
  if (!item) return false;
  const s = await getState();
  if (!s.ownedItems.includes(itemId)) return false;
  s.equipped[item.slot] = itemId;
  await saveState(s);
  return true;
}

function weightedRandom(items) {
  const total = items.reduce((a, i) => a + (i.weight || 1), 0);
  let r = Math.random() * total;
  for (const i of items) {
    r -= i.weight || 1;
    if (r <= 0) return i;
  }
  return items[items.length - 1];
}

export async function gachaPull() {
  await loadData();
  const data = await loadData();
  const econ = data.economy;
  const items = data.avatars.items.filter((i) => i.source === 'gacha');
  const s = await getState();
  if (s.coins < econ.gachaPrice) return null;
  s.coins -= econ.gachaPrice;
  s.gachaPulls += 1;
  let item;
  if (s.gachaPulls >= econ.gachaPity) {
    const legends = items.filter((i) => i.rarity === 'legend');
    item = legends.length ? weightedRandom(legends) : weightedRandom(items);
    s.gachaPulls = 0;
  } else {
    item = weightedRandom(items);
  }
  s.ownedItems.push(item.id);
  await saveState(s);
  return item;
}

export async function equipFromShop(itemId) {
  const bought = await buyItem(itemId);
  if (!bought) return false;
  return equipItem(itemId);
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function registerPlay(dateStr = todayStr()) {
  const s = await getState();
  if (s.lastPlayDate === dateStr) return s;
  const y = new Date(dateStr + 'T00:00:00');
  y.setDate(y.getDate() - 1);
  const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  s.streak = s.lastPlayDate === yStr ? s.streak + 1 : 1;
  s.lastPlayDate = dateStr;
  return saveMerged(s);
}

export async function unlockNextChapter() {
  const s = await getState();
  if (s.unlockedChapter < 6) s.unlockedChapter += 1;
  return saveMerged(s);
}
