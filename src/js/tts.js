const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const SEC_MS_GEC_VERSION = '1-143.0.3650.75';
const WSS_BASE = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const WIN_EPOCH = 11644473600;
const NS_PER_SEC = 1e9;

export const VOICES = {
  zh: 'zh-CN-XiaoxiaoNeural',
  en: 'en-US-AriaNeural',
  enKid: 'en-US-AnaNeural',
  enBoy: 'en-US-GuyNeural',
};

function connectId() {
  const a = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(str) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function generateSecMsGec() {
  let ticks = Date.now() / 1000 + WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= NS_PER_SEC / 100;
  const str = `${Math.round(ticks)}${TRUSTED_CLIENT_TOKEN}`;
  return (await sha256Hex(str)).toUpperCase();
}

function dateToString() {
  const utc = new Date().toUTCString();
  const m = utc.match(/^(\w{3}), (\d{2}) (\w{3}) (\d{4}) (\d{2}:\d{2}:\d{2}) GMT$/);
  if (!m) return utc;
  return `${m[1]} ${m[3]} ${m[2]} ${m[4]} ${m[5]} GMT+0000 (Coordinated Universal Time)`;
}

function sanitize(text) {
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    const code = chars[i].codePointAt(0);
    if ((code >= 0 && code <= 8) || (code >= 11 && code <= 12) || (code >= 14 && code <= 31)) {
      chars[i] = ' ';
    }
  }
  return chars.join('').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildSsml(text, voice) {
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${text}</prosody></voice></speak>`;
}

export async function speak(text, { voice = VOICES.en } = {}) {
  const url = `${WSS_BASE}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${connectId()}&Sec-MS-GEC=${await generateSecMsGec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
  return new Promise((resolve, reject) => {
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      reject(e);
      return;
    }
    ws.binaryType = 'arraybuffer';
    const chunks = [];
    let settled = false;
    const timer = setTimeout(() => fail(new Error('TTS 超时')), 8000);

    function fail(err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { ws.close(); } catch (_) {}
      reject(err);
    }

    ws.onopen = () => {
      ws.send(
        `X-Timestamp:${dateToString()}\r\n` +
        'Content-Type:application/json; charset=utf-8\r\n' +
        'Path:speech.config\r\n\r\n' +
        '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"true","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n'
      );
      ws.send(
        `X-RequestId:${connectId()}\r\n` +
        'Content-Type:application/ssml+xml\r\n' +
        `X-Timestamp:${dateToString()}Z\r\n` +
        'Path:ssml\r\n\r\n' +
        buildSsml(sanitize(text), voice)
      );
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        if (ev.data.includes('Path:turn.end')) {
          ws.close();
        }
      } else {
        const buf = new Uint8Array(ev.data);
        if (buf.length < 3) return;
        const headerLen = (buf[0] << 8) | buf[1];
        if (headerLen + 2 > buf.length) return;
        const headers = new TextDecoder().decode(buf.slice(2, headerLen + 2));
        if (!headers.includes('audio/mpeg')) return;
        const audio = buf.slice(headerLen + 2);
        if (audio.length > 0) chunks.push(audio);
      }
    };

    ws.onclose = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (chunks.length > 0) {
        resolve(new Blob(chunks, { type: 'audio/mpeg' }));
      } else {
        reject(new Error('TTS 未收到音频'));
      }
    };

    ws.onerror = () => fail(new Error('TTS 连接失败'));
  });
}
