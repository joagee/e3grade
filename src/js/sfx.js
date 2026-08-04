let ctx = null;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

const sharedAudio = new Audio();

const BEEP_WAV = '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'
  ;

export function unlock() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export function unlockHtmlAudio() {
  try {
    sharedAudio.volume = 0.1;
    sharedAudio.src = 'data:audio/wav;base64,' + BEEP_WAV;
    const p = sharedAudio.play();
    if (p) p.catch(() => {});
    if (window.__dbg) window.__dbg('unlockHtmlAudio 有声beep已触发');
  } catch (e) {
    if (window.__dbg) window.__dbg('unlockHtmlAudio 失败: ' + e.message);
  }
}

let currentSrc = null;

export function stopTts() {
  if (currentSrc) {
    try { currentSrc.stop(); } catch (_) {}
    currentSrc = null;
  }
}

export function playElementBlob(blob, onEnd) {
  stopTts();
  const url = URL.createObjectURL(blob);
  const a = sharedAudio;
  a.preload = 'auto';
  a.src = url;
  a.volume = 1;
  const cleanup = () => URL.revokeObjectURL(url);
  a.onended = () => { cleanup(); if (onEnd) onEnd(); };
  a.onerror = cleanup;
  const doPlay = () => {
    a.currentTime = 0;
    a.muted = true;
    const p = a.play();
    if (p) {
      p.then(() => {
        a.muted = false;
        if (window.__dbg) window.__dbg('HTMLAudioElement 已播放(muted hack生效)');
      }).catch((err) => {
        if (window.__dbg) window.__dbg('HTMLAudioElement play被拦: ' + (err && err.message));
        cleanup();
        playBlob(blob);
      });
    }
  };
  if (a.readyState >= 3) doPlay();
  else {
    a.addEventListener('canplaythrough', doPlay, { once: true });
    a.addEventListener('canplay', doPlay, { once: true });
  }
  if (window.__dbg) window.__dbg('playElementBlob HTMLAudioElement 播放');
}

function playViaElement(blob) {
  playElementBlob(blob);
}

export async function playBlob(blob) {
  const c = getCtx();
  if (!c) return playViaElement(blob);
  try {
    const buf = await blob.arrayBuffer();
    const decoded = await c.decodeAudioData(buf);
    stopTts();
    const src = c.createBufferSource();
    src.buffer = decoded;
    src.connect(c.destination);
    src.onended = () => {
      if (currentSrc === src) currentSrc = null;
    };
    src.start();
    currentSrc = src;
    if (window.__dbg) window.__dbg('playBlob 解码成功已播放');
  } catch (err) {
    if (window.__dbg) window.__dbg('decode失败回退: ' + (err && err.message));
    playViaElement(blob);
  }
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
    tone(466, 0.12, 'triangle', 0.22);
    tone(392, 0.12, 'triangle', 0.22, 0.1);
    tone(311, 0.2, 'triangle', 0.22, 0.2);
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
