let ctx = null;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function unlock() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

let currentSrc = null;

export function stopTts() {
  if (currentSrc) {
    try { currentSrc.stop(); } catch (_) {}
    currentSrc = null;
  }
}

function playViaElement(blob) {
  stopTts();
  const url = URL.createObjectURL(blob);
  const a = new Audio(url);
  a.onended = () => URL.revokeObjectURL(url);
  a.play().catch(() => URL.revokeObjectURL(url));
}

export function playBlob(blob) {
  const c = getCtx();
  if (!c) return playViaElement(blob);
  return c.decodeAudioData(blob.arrayBuffer()).then((buf) => {
    stopTts();
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.onended = () => {
      if (currentSrc === src) currentSrc = null;
    };
    src.start();
    currentSrc = src;
  }).catch((err) => {
    if (window.__dbg) window.__dbg('decode失败回退: ' + (err && err.message));
    playViaElement(blob);
  });
}

export function playSpeech(text, lang) {
  if (!('speechSynthesis' in window)) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (lang) u.lang = lang;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
    return true;
  } catch (err) {
    if (window.__dbg) window.__dbg('speechSynthesis失败: ' + (err && err.message));
    return false;
  }
}

function tone(freq, dur, type = 'sine', gain = 0.15, when = 0) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  tap() {
    tone(600, 0.05, 'triangle', 0.12);
  },
  correct() {
    tone(660, 0.12, 'triangle', 0.18);
    tone(880, 0.14, 'triangle', 0.18, 0.09);
    tone(1320, 0.2, 'triangle', 0.16, 0.18);
  },
  wrong() {
    tone(200, 0.2, 'sine', 0.14);
    tone(160, 0.22, 'sine', 0.12, 0.1);
  },
  coin() {
    tone(988, 0.08, 'square', 0.1);
    tone(1319, 0.16, 'square', 0.1, 0.07);
  },
  gem() {
    tone(784, 0.1, 'sine', 0.18);
    tone(1047, 0.1, 'sine', 0.18, 0.08);
    tone(1568, 0.22, 'sine', 0.16, 0.16);
  },
  gacha() {
    tone(392, 0.1, 'sawtooth', 0.1);
    tone(523, 0.1, 'sawtooth', 0.1, 0.12);
    tone(659, 0.16, 'sawtooth', 0.1, 0.24);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.18, i * 0.12));
  },
};
