import { loadData, chapterById, chapterStory } from './data.js';
import * as econ from './economy.js';
import { startStory } from './story.js';
import { startChapter } from './game.js';
import { sfx, unlock } from './sfx.js';

const viewEl = document.getElementById('view');
const coinEl = document.getElementById('coin-balance');
const streakEl = document.getElementById('streak');

let state = null;
let data = null;
let playingChapterId = null;

async function init() {
  setupDebugOverlay();
  registerSW();
  setupAudioUnlock();
  data = await loadData();
  state = await econ.getState();
  await econ.registerPlay();
  state = await econ.getState();
  bindTabs();
  updateTopbar();
  renderMap();
}

function setupDebugOverlay() {
  if (!new URLSearchParams(location.search).has('debug')) return;
  const el = document.createElement('div');
  el.id = 'debug-overlay';
  el.style.cssText = 'position:fixed;top:0;left:0;right:0;max-height:45vh;overflow:auto;background:rgba(0,0,0,0.88);color:#0f0;font:11px monospace;z-index:99999;padding:6px;white-space:pre-wrap;word-break:break-all;';
  document.body.appendChild(el);
  const log = (m) => {
    el.textContent = (el.textContent + '\n' + m).slice(-5000);
  };
  window.addEventListener('error', (e) => log('ERR: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  window.addEventListener('unhandledrejection', (e) => log('REJ: ' + (e.reason && e.reason.message) || e.reason));
  window.__dbg = log;
}

function setupAudioUnlock() {
  const unlockOnce = () => {
    unlock();
    sfx.tap();
  };
  document.addEventListener('pointerdown', unlockOnce, { once: true });
  document.addEventListener('touchstart', unlockOnce, { once: true });
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
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

  if (id >= 6) sfx.win();
  else sfx.gem();

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
      sfx.tap();
      const ok = await econ.equipFromShop(btn.dataset.id);
      state = await econ.getState();
      updateTopbar();
      if (!ok) {
        btn.textContent = '金币不够哦';
      } else {
        sfx.coin();
        renderShop();
      }
    });
  });

  document.querySelector('.gacha-btn').addEventListener('click', async () => {
    sfx.gacha();
    const item = await econ.gachaPull();
    state = await econ.getState();
    updateTopbar();
    const resultEl = viewEl.querySelector('.gacha-result');
    if (!item) {
      resultEl.textContent = '🪙 金币不够，先去闯关赚吧！';
      return;
    }
    if (item.rarity === 'legend') sfx.win();
    else sfx.gem();
    const rarityText = item.rarity === 'legend' ? '🌟 传说！' : item.rarity === 'rare' ? '✨ 稀有！' : '';
    resultEl.textContent = `🎁 抽到了：${item.emoji} ${item.name} ${rarityText}`;
    viewEl.querySelector('.gacha-pity').textContent =
      `已抽 ${state.gachaPulls}/${data.economy.gachaPity}，满 ${data.economy.gachaPity} 抽必出传说`;
  });
}

function avatarSVG() {
  const equipped = state.equipped;
  const item = (id) => data.avatars.items.find((i) => i.id === id);
  const hat = item(equipped.hat);
  const outfit = item(equipped.outfit);
  const pet = item(equipped.pet);
  const b = data.avatars.base;
  const outfitColor = (outfit && outfit.color) || '#4e9cff';
  return `
    <svg viewBox="0 0 200 230" class="avatar-svg">
      <rect x="72" y="132" width="56" height="80" rx="24" fill="${outfitColor}"/>
      <path d="M72 152 Q100 138 128 152" stroke="rgba(255,255,255,0.45)" stroke-width="4" fill="none"/>
      <circle cx="100" cy="92" r="46" fill="${b.skin}"/>
      <path d="M70 66 Q70 40 88 34 Q92 22 108 22 Q118 26 122 40 Q132 46 132 66 Z" fill="${b.hair}"/>
      <circle cx="86" cy="88" r="4.5" fill="#3d405b"/>
      <circle cx="114" cy="88" r="4.5" fill="#3d405b"/>
      <path d="M76 72 Q82 66 90 72" stroke="#3d405b" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M110 72 Q118 66 124 72" stroke="#3d405b" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M89 108 Q100 118 111 108" stroke="#3d405b" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <circle cx="78" cy="112" r="6" fill="#ff8a80"/>
      <circle cx="122" cy="112" r="6" fill="#ff8a80"/>
      <text x="100" y="52" font-size="42" text-anchor="middle">${(hat && hat.emoji) || ''}</text>
      <text x="166" y="218" font-size="32" text-anchor="middle">${(pet && pet.emoji) || ''}</text>
    </svg>`;
}

function renderWardrobe() {
  updateTopbar();
  const equipped = state.equipped;
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
    <div class="avatar-preview">${avatarSVG()}</div>
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
