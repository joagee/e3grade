import { loadData, wordById, chapterById, chapterStory } from './data.js';
import { speak, VOICES } from './tts.js';
import { sfx, playBlob, playSpeech, stopTts } from './sfx.js';

function playWord(wordObj) {
  stopTts();
  speak(wordObj.word, { voice: VOICES.en })
    .then((blob) => playBlob(blob))
    .catch((err) => {
      if (window.__dbg) window.__dbg('zoo TTS失败: ' + (err && err.message));
      playSpeech(wordObj.word, 'en-US');
    });
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickOptions(pool, targetId, count) {
  const others = pool.filter((id) => id !== targetId);
  return shuffle([targetId, ...shuffle(others).slice(0, count - 1)]);
}

function estimateListenMs(word) {
  return Math.min(4500, Math.max(1600, word.length * 300 + 900));
}

export async function startZoo(container, chapterId, { learnedWords = [], onComplete } = {}) {
  await loadData();
  const chapter = chapterById(chapterId);
  const quests = chapter.quests.filter((q) => !learnedWords.includes(q.wordId));
  if (quests.length === 0) {
    onComplete({ score: 0, total: 0, learnedWordIds: [] });
    return;
  }
  await listenPhase(container, quests.map((q) => q.wordId));
  rescuePhase(container, chapterId, quests, onComplete);
}

function listenPhase(container, wordIds) {
  return new Promise((resolve) => {
    const words = wordIds.map(wordById);
    let i = 0;
    let timer = null;
    container.innerHTML = `
      <div class="zoo-view">
        <div class="zoo-banner">🦁 魔法动物乐园</div>
        <p class="zoo-hint">魔法书先带你看一看，被关起来的动物们</p>
        <div class="zoo-grid">
          ${words.map((w, idx) => `<div class="zoo-animal" data-idx="${idx}"><span class="zoo-emoji">${w.emoji}</span><span class="zoo-name">${w.word}</span></div>`).join('')}
        </div>
        <button class="btn-primary zoo-go" style="display:none">出发去救动物！🚀</button>
      </div>`;
    const anims = container.querySelectorAll('.zoo-animal');

    const speakNext = () => {
      if (i >= words.length) {
        container.querySelector('.zoo-go').style.display = 'block';
        return;
      }
      anims[i].classList.add('speaking');
      playWord(words[i]);
      timer = setTimeout(() => {
        anims[i].classList.remove('speaking');
        i += 1;
        speakNext();
      }, estimateListenMs(words[i].word));
    };

    container.querySelector('.zoo-go').addEventListener('click', () => {
      sfx.tap();
      clearTimeout(timer);
      stopTts();
      resolve();
    });

    speakNext();
  });
}

function rescuePhase(container, chapterId, quests, onComplete) {
  const chapter = chapterById(chapterId);
  const beats = chapterStory(chapterId)?.beats || [];
  const pool = chapter.wordIds;
  let idx = 0;
  let score = 0;
  let total = 0;
  let combo = 0;
  const saved = [];

  const showScene = () => `
    <div class="zoo-top">
      <div class="zoo-rescued">${saved.length ? '救出的伙伴：' + saved.map((id) => wordById(id).emoji).join(' ') : '🧀 等待你的救援…'}</div>
      <div class="zoo-count">还剩 ${quests.length - saved.length} 只动物被关着</div>
    </div>`;

  const next = () => {
    idx += 1;
    if (idx < quests.length) renderQuest();
    else showFinale();
  };

  const onCorrect = (wordId) => {
    score += 1;
    total += 1;
    combo += 1;
    saved.push(wordId);
    sfx.correct();
    if (combo >= 2 && combo % 2 === 0) sfx.gem();
    if (saved.length % 3 === 0 && saved.length < quests.length) {
      setTimeout(() => showBeat(saved.length), 600);
    } else {
      setTimeout(next, 900);
    }
  };

  const bindChoose = (w, isListen) => {
    const feedback = container.querySelector('.q-feedback');
    const listenBtn = container.querySelector('.q-listen');
    if (listenBtn) listenBtn.addEventListener('click', () => { sfx.tap(); playWord(w); });
    container.querySelectorAll('.q-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        total += 1;
        if (btn.dataset.w === w.word) {
          feedback.textContent = '🎉 笼门打开了！';
          feedback.className = 'q-feedback good';
          btn.classList.add('correct-anim');
          container.querySelector('.cage-animal')?.classList.add('rescued');
          container.querySelectorAll('.q-option').forEach((b) => { b.disabled = true; });
          onCorrect(w.id);
        } else {
          sfx.wrong();
          combo = 0;
          feedback.textContent = '再想想，它还等着你呢～';
          feedback.className = 'q-feedback try';
          btn.disabled = true;
          btn.classList.add('wrong');
        }
      });
    });
    if (isListen) playWord(w);
  };

  const renderQuest = () => {
    const q = quests[idx];
    const w = wordById(q.wordId);
    if (q.type === 'repeat') {
      renderRepeatQuest(q, w);
    } else if (q.type === 'look') {
      renderLookQuest(q, w);
    } else {
      renderListenQuest(q, w);
    }
  };

  function renderListenQuest(q) {
    const w = wordById(q.wordId);
    const options = pickOptions(pool, q.wordId, 4).map(wordById);
    container.innerHTML = `
      ${showScene()}
      <div class="zoo-cage">
        <div class="cage-bars">黑雾怪把${w.zh}关起来了！</div>
        <div class="cage-animal">${w.emoji}</div>
        <p class="zoo-q-hint">🔊 听一听，是哪只动物在叫？</p>
        <button class="btn q-listen">🔊 再听一遍</button>
        <div class="q-options">${options.map((o) => `<button class="q-option" data-w="${o.word}">${o.emoji} ${o.word}</button>`).join('')}</div>
        <div class="q-feedback"></div>
      </div>`;
    bindChoose(w, true);
  }

  function renderLookQuest(q) {
    const w = wordById(q.wordId);
    const options = pickOptions(pool, q.wordId, 4).map(wordById);
    container.innerHTML = `
      ${showScene()}
      <div class="zoo-cage">
        <div class="cage-bars">笼子上贴着它的照片，叫出它的英文名！</div>
        <div class="cage-animal look-big">${w.emoji}</div>
        <p class="zoo-q-hint">找出它的英文名字</p>
        <div class="q-options">${options.map((o) => `<button class="q-option" data-w="${o.word}">${o.word}</button>`).join('')}</div>
        <div class="q-feedback"></div>
      </div>`;
    bindChoose(w, false);
  }

  function renderRepeatQuest(q, w) {
    let recordingBlob = null;
    let stream = null;
    let recorder = null;
    let chunks = [];
    let stopTimer = null;
    container.innerHTML = `
      ${showScene()}
      <div class="zoo-cage">
        <div class="cage-bars">这只动物软趴趴的，念出它的名字唤醒它！</div>
        <div class="cage-animal repeat-animal">${w.emoji}</div>
        <p class="zoo-q-hint">先听一听，然后跟着念</p>
      </div>
      <button class="btn-primary repeat-listen">🔊 听原音</button>
      <button class="btn repeat-record">🎤 开始念</button>
      <button class="btn repeat-play" disabled>▶️ 听我的</button>
      <button class="btn-primary repeat-good">👍 我念好啦！</button>
      <button class="btn repeat-retry">🔁 再听一遍</button>`;

    const recordBtn = container.querySelector('.repeat-record');
    const playBtn = container.querySelector('.repeat-play');
    const goodBtn = container.querySelector('.repeat-good');

    container.querySelector('.repeat-listen').addEventListener('click', () => { sfx.tap(); playWord(w); });
    container.querySelector('.repeat-retry').addEventListener('click', () => { sfx.tap(); playWord(w); });
    goodBtn.addEventListener('click', () => {
      if (goodBtn.disabled) return;
      goodBtn.disabled = true;
      sfx.tap();
      container.querySelector('.cage-animal')?.classList.add('rescued');
      onCorrect(w.id);
    });

    const playRecording = (blob) => {
      sfx.tap();
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      a.preload = 'auto';
      const cleanup = () => URL.revokeObjectURL(url);
      a.onended = cleanup;
      a.onerror = cleanup;
      const doPlay = () => {
        a.currentTime = 0;
        a.play().catch(() => {
          cleanup();
          playBlob(blob);
        });
      };
      if (a.readyState >= 1) doPlay();
      else a.onloadedmetadata = doPlay;
    };

    recordBtn.addEventListener('click', async () => {
      if (recorder && recorder.state === 'recording') {
        clearTimeout(stopTimer);
        recorder.stop();
        return;
      }
      try {
        chunks = [];
        recordingBlob = null;
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(s);
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        rec.onstop = () => {
          recordingBlob = new Blob(chunks, { type: rec.mimeType });
          chunks = [];
          clearTimeout(stopTimer);
          s.getTracks().forEach((t) => t.stop());
          playBtn.disabled = false;
          recordBtn.textContent = '🎤 再念一遍';
          if (recordingBlob) playRecording(recordingBlob);
        };
        stream = s;
        recorder = rec;
        rec.start();
        recordBtn.textContent = '⏹️ 停';
        const ms = Math.min(6000, Math.max(1800, w.word.length * 350 + 700));
        stopTimer = setTimeout(() => {
          if (rec && rec.state === 'recording') rec.stop();
        }, ms);
      } catch (e) {
        recordBtn.textContent = '🎤 麦克风不可用';
        recordBtn.disabled = true;
      }
    });

    playBtn.addEventListener('click', () => {
      if (recordingBlob) playRecording(recordingBlob);
    });
  }

  function showBeat(savedCount) {
    const beatIndex = Math.floor(savedCount / 3) - 1;
    const beat = beats[Math.min(Math.max(beatIndex, 0), beats.length - 1)];
    container.innerHTML = `
      <div class="zoo-beat">
        <div class="beat-emoji">${beat.emoji}</div>
        <p class="beat-text">${beat.text}</p>
        <button class="btn-primary beat-continue">继续救下一只 →</button>
      </div>`;
    sfx.gem();
    container.querySelector('.beat-continue').addEventListener('click', () => { sfx.tap(); next(); });
  }

  function showFinale() {
    container.innerHTML = `
      <div class="zoo-finale">
        <div class="finale-title">🎉 你救出了所有动物！</div>
        <div class="finale-animals">${saved.map((id) => wordById(id).emoji).join(' ')}</div>
        <p class="finale-text">你是真正的动物守护者！魔法宝石集齐了！</p>
        <button class="btn-primary finale-done">领取奖励 →</button>
      </div>`;
    sfx.win();
    container.querySelector('.finale-done').addEventListener('click', () => {
      sfx.tap();
      onComplete({ score, total, learnedWordIds: saved });
    });
  }

  renderQuest();
}
