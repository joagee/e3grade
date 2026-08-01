import { loadData, wordById, chapterById } from './data.js';
import { speak, VOICES } from './tts.js';

let currentAudio = null;
let currentUrl = null;

function stopAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}

function playWord(wordObj) {
  stopAudio();
  speak(wordObj.word, { voice: VOICES.en })
    .then((blob) => {
      currentUrl = URL.createObjectURL(blob);
      currentAudio = new Audio(currentUrl);
      currentAudio.play().catch(() => {});
    })
    .catch(() => {});
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickOptions(pool, targetId, count) {
  const others = pool.filter((id) => id !== targetId);
  const distractors = shuffle(others).slice(0, count - 1);
  return shuffle([targetId, ...distractors]);
}

export async function startChapter(container, chapterId, { learnedWords = [], onComplete } = {}) {
  await loadData();
  const chapter = chapterById(chapterId);
  const newWordIds = chapter.wordIds.filter((id) => !learnedWords.includes(id));
  const pool = chapter.wordIds;

  const steps = [];
  for (const id of newWordIds) steps.push({ type: 'learn', id });
  for (const id of newWordIds) steps.push({ type: 'repeat', id });
  for (let i = 0; i < 6; i++) steps.push({ type: 'listen_choose', id: randomFrom(pool) });
  for (let i = 0; i < 6; i++) steps.push({ type: 'look_choose', id: randomFrom(pool) });

  let idx = 0;
  let score = 0;
  let total = 0;
  let recording = null;

  function next() {
    idx += 1;
    if (idx < steps.length) {
      renderStep();
    } else if (onComplete) {
      onComplete({ score, total, learnedWordIds: newWordIds });
    }
  }

  function progress() {
    return `<div class="game-progress">冒险进度 ${idx + 1} / ${steps.length}</div>`;
  }

  function renderLearn(step) {
    const w = wordById(step.id);
    stopAudio();
    container.innerHTML = `
      ${progress()}
      <div class="learn-card">
        <div class="learn-emoji">${w.emoji}</div>
        <div class="learn-word">${w.word}</div>
        <div class="learn-phonetic">${w.phonetic}</div>
        <div class="learn-zh">${w.zh}</div>
      </div>
      <button class="btn-primary learn-speak">🔊 听一听</button>
      <button class="btn-primary learn-next">学会了，下一步 →</button>`;
    container.querySelector('.learn-speak').addEventListener('click', () => playWord(w));
    container.querySelector('.learn-next').addEventListener('click', next);
    speak(w.word, { voice: VOICES.en }).catch(() => {});
  }

  function renderRepeat(step) {
    const w = wordById(step.id);
    stopAudio();
    let recordingBlob = null;
    container.innerHTML = `
      ${progress()}
      <div class="repeat-card">
        <div class="learn-word">${w.word}</div>
        <div class="learn-zh">${w.zh} · ${w.emoji}</div>
      </div>
      <button class="btn-primary repeat-listen">🔊 听原音</button>
      <button class="btn repeat-record">🎤 录音</button>
      <button class="btn repeat-play" disabled>▶️ 听我的</button>
      <button class="btn-primary repeat-good">👍 我读得像！</button>
      <button class="btn repeat-retry">🔁 再听一遍</button>`;

    const recordBtn = container.querySelector('.repeat-record');
    const playBtn = container.querySelector('.repeat-play');
    const goodBtn = container.querySelector('.repeat-good');
    const retryBtn = container.querySelector('.repeat-retry');

    container.querySelector('.repeat-listen').addEventListener('click', () => playWord(w));
    retryBtn.addEventListener('click', () => playWord(w));
    goodBtn.addEventListener('click', next);

    let stream = null;
    let recorder = null;
    let chunks = [];

    recordBtn.addEventListener('click', async () => {
      if (recorder && recorder.state === 'recording') {
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
          playBtn.disabled = false;
          recordBtn.textContent = '🎤 录音';
          s.getTracks().forEach((t) => t.stop());
        };
        stream = s;
        recorder = rec;
        rec.start();
        recordBtn.textContent = '⏹️ 停';
      } catch (e) {
        recordBtn.textContent = '🎤 麦克风不可用';
        recordBtn.disabled = true;
      }
    });

    playBtn.addEventListener('click', () => {
      if (recordingBlob) {
        const url = URL.createObjectURL(recordingBlob);
        new Audio(url).play().catch(() => {});
      }
    });
  }

  function renderChoose(step) {
    const w = wordById(step.id);
    stopAudio();
    const options = pickOptions(pool, step.id, 4).map(wordById);
    container.innerHTML = `
      ${progress()}
      <div class="q-card">
        ${step.type === 'listen_choose'
          ? `<button class="btn q-listen">🔊 听发音</button>
             <p class="q-hint">听一听，选出你听到的单词</p>`
          : `<div class="q-emoji">${w.emoji}</div>
             <p class="q-hint">选出对应的单词</p>`}
        <div class="q-options">
          ${options.map((o) => `<button class="q-option" data-w="${o.word}">${o.word}</button>`).join('')}
        </div>
        <div class="q-feedback"></div>
      </div>`;

    if (step.type === 'listen_choose') {
      container.querySelector('.q-listen').addEventListener('click', () => speak(w.word, { voice: VOICES.en }).catch(() => {}));
      speak(w.word, { voice: VOICES.en }).catch(() => {});
    }

    const feedback = container.querySelector('.q-feedback');
    container.querySelectorAll('.q-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        total += 1;
        if (btn.dataset.w === w.word) {
          score += 1;
          feedback.textContent = '🎉 太棒了！';
          feedback.className = 'q-feedback good';
          container.querySelectorAll('.q-option').forEach((b) => { b.disabled = true; });
          setTimeout(next, 700);
        } else {
          feedback.textContent = '再想想哦～';
          feedback.className = 'q-feedback try';
          btn.disabled = true;
          btn.classList.add('wrong');
        }
      });
    });
  }

  function renderStep() {
    const step = steps[idx];
    if (step.type === 'learn') renderLearn(step);
    else if (step.type === 'repeat') renderRepeat(step);
    else renderChoose(step);
  }

  renderStep();
}
