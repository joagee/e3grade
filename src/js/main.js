import { loadData, chapterById, chapterStory } from './data.js';
import * as econ from './economy.js';
import { startStory } from './story.js';
import { startChapter } from './game.js';

const viewEl = document.getElementById('view');
const coinEl = document.getElementById('coin-balance');
const streakEl = document.getElementById('streak');

let state = null;
let data = null;
let playingChapterId = null;

async function init() {
  data = await loadData();
  state = await econ.getState();
  await econ.registerPlay();
  state = await econ.getState();
  bindTabs();
  updateTopbar();
  renderMap();
}

function updateTopbar() {
  coinEl.textContent = `🪙 ${state.coins}`;
  streakEl.textContent = `🔥 ${state.streak} 天`;
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
      if (view === 'map') renderMap();
      else if (view === 'shop') renderShop();
      else if (view === 'wardrobe') renderWardrobe();
    });
  });
}

function chapterStatus(id) {
  if (state.chapterDone[id]) return 'done';
  if (id > state.unlockedChapter) return 'locked';
  return 'open';
}

function renderMap() {
  const list = data.levels.chapters;
  const today = econ.todayStr();
  const blockedToday = state.dailyDone === today;

  const html = list
    .map((c) => {
      const st = chapterStatus(c.id);
      const icons = { done: '✅', locked: '🔒', open: '🏰' };
      const names = { done: '已完成', locked: '未解锁', open: '可挑战' };
      const hint = st === 'open' && blockedToday ? ' · 明天见' : '';
      return `
        <button class="island-card ${st}" data-id="${c.id}">
          <span class="island-icon">${icons[st]}</span>
          <div class="island-info">
            <div class="island-unit">第${c.id}章 · ${c.zhUnit}</div>
            <div class="island-scene">${c.scene}</div>
          </div>
          <span class="island-status">${names[st]}${hint}</span>
        </button>`;
    })
    .join('');

  viewEl.innerHTML = `
    <h2 class="view-title">🗺️ 冒险地图</h2>
    <div class="island-list">${html}</div>`;

  document.querySelectorAll('.island-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = Number(card.dataset.id);
      const st = chapterStatus(id);
      if (st === 'locked') return;
      if (st === 'open' && state.dailyDone === today) {
        renderDoneForToday();
        return;
      }
      startChapterFlow(id);
    });
  });
}

async function startChapterFlow(id) {
  playingChapterId = id;
  updateTopbar();
  await startStory(viewEl, id, {
    lines: 'intro',
    onComplete: () => {
      startChapter(viewEl, id, {
        learnedWords: state.learnedWords,
        onComplete: (result) => settleChapter(id, result),
      });
    },
  });
}

async function settleChapter(id, result) {
  const newWords = result.learnedWordIds || [];
  const earned = newWords.length * data.economy.coinPerWord + data.economy.coinPerChapter;

  state.learnedWords = state.learnedWords.concat(newWords);
  state.coins += earned;
  state.chapterDone[id] = true;
  state.dailyDone = econ.todayStr();
  state.unlockedChapter = Math.max(state.unlockedChapter, id + 1);
  state = await econ.persistState(state);
  updateTopbar();

  const hint = chapterStory(id)?.nextHint || '';
  viewEl.innerHTML = `
    <div class="result-card">
      <div class="result-title">🎉 冒险成功！</div>
      <div class="result-gems">💎 集齐第 ${id} 片魔法宝石</div>
      <div class="result-coins">🪙 +${earned} 金币</div>
      <div class="result-hint">${hint}</div>
      <button class="btn-primary" id="btn-map">回到冒险地图</button>
      <button class="btn" id="btn-shop">去商店看看 🛍️</button>
    </div>`;
  document.getElementById('btn-map').addEventListener('click', renderMap);
  document.getElementById('btn-shop').addEventListener('click', renderShop);
}

function renderDoneForToday() {
  viewEl.innerHTML = `
    <div class="result-card">
      <div class="result-title">🌙 今日冒险已完成！</div>
      <div class="result-hint">明天再来解锁新的章节吧，小魔法师晚安～</div>
      <button class="btn-primary" id="btn-map">回到冒险地图</button>
    </div>`;
  document.getElementById('btn-map').addEventListener('click', renderMap);
}

function renderShop() {
  updateTopbar();
  const items = data.avatars.items;
  const list = items
    .filter((i) => i.source === 'shop')
    .map((i) => {
      const owned = state.ownedItems.includes(i.id);
      return `
        <div class="shop-item">
          <span class="shop-emoji">${i.emoji}</span>
          <div class="shop-name">${i.name}</div>
          ${owned
            ? '<span class="shop-owned">已拥有 ✓</span>'
            : `<button class="btn shop-buy" data-id="${i.id}">🪙 ${i.price} 购买</button>`}
        </div>`;
    })
    .join('');

  viewEl.innerHTML = `
    <h2 class="view-title">🏪 魔法商店</h2>
    <div class="coin-banner">🪙 ${state.coins}</div>
    <div class="gacha-area">
      <button class="btn-primary gacha-btn">🎁 抽盲盒（🪙${data.economy.gachaPrice}）</button>
      <div class="gacha-pity">已抽 ${state.gachaPulls}/${data.economy.gachaPity}，满 ${data.economy.gachaPity} 抽必出传说</div>
      <div class="gacha-result"></div>
    </div>
    <div class="shop-grid">${list}</div>`;

  document.querySelectorAll('.shop-buy').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ok = await econ.equipFromShop(btn.dataset.id);
      state = await econ.getState();
      updateTopbar();
      if (!ok) {
        btn.textContent = '金币不够哦';
      } else {
        renderShop();
      }
    });
  });

  document.querySelector('.gacha-btn').addEventListener('click', async () => {
    const item = await econ.gachaPull();
    state = await econ.getState();
    updateTopbar();
    const resultEl = viewEl.querySelector('.gacha-result');
    if (!item) {
      resultEl.textContent = '🪙 金币不够，先去闯关赚吧！';
      return;
    }
    const rarityText = item.rarity === 'legend' ? '🌟 传说！' : item.rarity === 'rare' ? '✨ 稀有！' : '';
    resultEl.textContent = `🎁 抽到了：${item.emoji} ${item.name} ${rarityText}`;
    viewEl.querySelector('.gacha-pity').textContent =
      `已抽 ${state.gachaPulls}/${data.economy.gachaPity}，满 ${data.economy.gachaPity} 抽必出传说`;
  });
}

function renderWardrobe() {
  updateTopbar();
  const equipped = state.equipped;
  const preview = ['hat', 'outfit', 'pet']
    .map((slot) => data.avatars.items.find((i) => i.id === equipped[slot]))
    .filter(Boolean)
    .map((i) => i.emoji)
    .join(' ');
  const previewHtml = `${data.avatars.base.emoji} ${preview}`.trim();

  const slotsHtml = Object.entries(data.avatars.slots)
    .map(([slot, label]) => {
      const owned = data.avatars.items.filter((i) => i.slot === slot && state.ownedItems.includes(i.id));
      const itemsHtml = owned
        .map(
          (i) => `
          <button class="wear-item ${equipped[slot] === i.id ? 'active' : ''}" data-id="${i.id}">
            <span class="wear-emoji">${i.emoji || '🚫'}</span>
            <span class="wear-name">${i.name}</span>
          </button>`
        )
        .join('');
      return `
        <div class="wear-slot">
          <div class="wear-slot-label">${label}</div>
          <div class="wear-list">${itemsHtml}</div>
        </div>`;
    })
    .join('');

  viewEl.innerHTML = `
    <h2 class="view-title">🧸 我的装扮</h2>
    <div class="avatar-preview">${previewHtml}</div>
    ${slotsHtml}`;

  document.querySelectorAll('.wear-item').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await econ.equipItem(btn.dataset.id);
      state = await econ.getState();
      renderWardrobe();
    });
  });
}

init();
