import { loadData, wordById, chapterById, chapterStory } from './data.js';
import { speak, VOICES } from './tts.js';
import { sfx, playBlob, playSpeech, stopTts } from './sfx.js';

function playWord(wordObj) {
  stopTts();
  speak(wordObj.word, { voice: VOICES.en })
    .then((blob) => playBlob(blob))
    .catch((err) => {
      if (window.__dbg) window.__dbg('quest TTS失败: ' + (err && err.message));
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

function themeOf(chapter) {
  const t = chapter.questTheme || {};
  return {
    banner: t.banner || '✨ 冒险',
    listenTitle: t.listenTitle || '魔法书先带你看一看这些词语',
    listenHint: t.listenHint || '🔊 听一听，这是哪个词语？',
    lookHint: t.lookHint || '找出对应的词语',
    repeatHint: t.repeatHint || '先听一听，然后跟着念',
    repeatGo: t.repeatGo || '👍 我念好啦！',
    repeatRecord: t.repeatRecord || '🎤 开始念',
    correct: t.correct || '🎉 答对啦！',
    wrong: t.wrong || '再想想哦～',
    finaleTitle: t.finaleTitle || '🎉 完成！',
    finaleText: t.finaleText || '你做到了！',
    finaleBtn: t.finaleBtn || '领取奖励 →',
  };
}

export async function startQuest(container, chapterId, { learnedWords = [], onComplete } = {}) {
  await loadData();
  const chapter = chapterById(chapterId);
  const theme = themeOf(chapter);
  const quests = chapter.quests.filter((q) => !learnedWords.includes(q.wordId));
  if (quests.length === 0) {
    onComplete({ score: 0, total: 0, learnedWordIds: [] });
    return;
  }
  await listenPhase(container, quests.map((q) => q.wordId), theme);
  rescuePhase(container, chapterId, quests, theme, onComplete);
}

function listenPhase(container, wordIds, theme) {
  return new Promise((resolve) => {
    const words = wordIds.map(wordById);
    let i = 0;
    let timer = null;
    container.innerHTML = `
      <div class="zoo-view">
        <div class="zoo-banner">${theme.banner}</div>
        <p class="zoo-hint">${theme.listenTitle}</p>
        <div class="zoo-grid">
          ${words.map((w, idx) => `<div class="zoo-animal" data-idx="${idx}"><span class="zoo-emoji">${w.emoji}</span><span class="zoo-name">${w.word}</span><span class="zoo-zh">${w.zh}</span></div>`).join('')}
        </div>
        <button class="btn-primary zoo-go" style="display:none">出发去冒险！🚀</button>
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

function rescuePhase(container, chapterId, quests, theme, onComplete) {
  const chapter = chapterById(chapterId);
  const beats = chapterStory(chapterId)?.beats || [];
  const pool = chapter.wordIds;
  let idx = 0;
  let score = 0;
  let total = 0;
  let combo = 0;
  const saved = [];
  const timers = [];
  const later = (fn, ms) => {
    const t = setTimeout(fn, ms);
    timers.push(t);
    return t;
  };
  const clearTimers = () => {
    timers.forEach((t) => clearTimeout(t));
    timers.length = 0;
  };

  const showScene = () => `
    <div class="zoo-top">
      <div class="zoo-rescued">${saved.length ? '已收集：' + saved.map((id) => { const w = wordById(id); return `<span class="rescued-item">${w.emoji}<small>${w.zh}</small></span>`; }).join('') : '🧀 等你来收集…'}</div>
      <div class="zoo-count">还剩 ${quests.length - saved.length} 个</div>
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
      later(() => showBeat(saved.length), 600);
    } else {
      later(next, 900);
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
          feedback.textContent = theme.correct;
          feedback.className = 'q-feedback good';
          btn.classList.add('correct-anim');
          container.querySelector('.cage-animal')?.classList.add('rescued');
          container.querySelectorAll('.q-option').forEach((b) => { b.disabled = true; });
          onCorrect(w.id);
        } else {
          sfx.wrong();
          combo = 0;
          feedback.textContent = theme.wrong;
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
        <div class="cage-bars">黑雾怪把它藏起来了！</div>
        <div class="cage-animal">${w.emoji}</div>
        <div class="cage-word">${w.word} <span class="zoo-zh">${w.zh}</span></div>
        <p class="zoo-q-hint">${theme.listenHint}</p>
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
        <div class="cage-bars">看这个，叫出它的名字！</div>
        <div class="cage-animal look-big">${w.emoji}</div>
        <div class="cage-word">${w.word} <span class="zoo-zh">${w.zh}</span></div>
        <p class="zoo-q-hint">${theme.lookHint}</p>
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
        <div class="cage-bars">它需要你念出它的名字！</div>
        <div class="cage-animal repeat-animal">${w.emoji}</div>
        <div class="cage-word">${w.word} <span class="zoo-zh">${w.zh}</span></div>
        <p class="zoo-q-hint">${theme.repeatHint}</p>
      </div>
      <button class="btn-primary repeat-listen">🔊 听原音</button>
      <button class="btn repeat-record">${theme.repeatRecord}</button>
      <button class="btn repeat-play" disabled>▶️ 听我的</button>
      <button class="btn-primary repeat-good">${theme.repeatGo}</button>
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
      playBlob(blob);
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
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
        const rec = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
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
        <button class="btn-primary beat-continue">继续 →</button>
      </div>`;
    sfx.gem();
    container.querySelector('.beat-continue').addEventListener('click', () => { sfx.tap(); next(); });
  }

  function showFinale() {
    container.innerHTML = `
      <div class="zoo-finale">
        <div class="finale-title">${theme.finaleTitle}</div>
        <div class="finale-animals">${saved.map((id) => wordById(id).emoji).join(' ')}</div>
        <p class="finale-text">${theme.finaleText}</p>
        <button class="btn-primary finale-done">${theme.finaleBtn}</button>
      </div>`;
    sfx.win();
    container.querySelector('.finale-done').addEventListener('click', () => {
      sfx.tap();
      clearTimers();
      onComplete({ score, total, learnedWordIds: saved });
    });
  }

  renderQuest();
}
