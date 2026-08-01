const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const SEC_MS_GEC_VERSION = '1-143.0.3650.75';
const BASE_URL = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const WIN_EPOCH = 11644473600;

function connectId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(str) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function generateSecMsGec() {
  let ticks = Date.now() / 1000 + WIN_EPOCH;
  ticks -= ticks % 300;
  ticks *= 1e9 / 100;
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

async function connect(url) {
  const resp = await fetch(url, {
    headers: {
      Upgrade: 'websocket',
      Connection: 'Upgrade',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
      Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      'Sec-WebSocket-Version': '13',
    },
  });
  const ws = resp.webSocket;
  if (!ws) throw new Error('WS upgrade failed: ' + resp.status);
  ws.binaryType = 'arraybuffer';
  ws.accept();
  return ws;
}

function edgeTTS(text, voice) {
  return new Promise((resolve, reject) => {
    generateSecMsGec().then((gec) => {
      const url = `${BASE_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${connectId()}&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
      let done = false;
      const chunks = [];
      const finish = (err) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (err) reject(err);
        else {
          const total = chunks.reduce((a, b) => a + b.length, 0);
          const out = new Uint8Array(total);
          let off = 0;
          for (const c of chunks) {
            out.set(c, off);
            off += c.length;
          }
          resolve(out.buffer);
        }
      };
      const timer = setTimeout(() => {
        try { ws && ws.close(); } catch (_) {}
        finish(new Error('TTS 超时'));
      }, 15000);
      let ws = null;

      connect(url).then((sock) => {
        ws = sock;
        ws.addEventListener('open', () => {
          const dts = dateToString();
          ws.send(
            `X-Timestamp:${dts}\r\n` +
            'Content-Type:application/json; charset=utf-8\r\n' +
            'Path:speech.config\r\n\r\n' +
            '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"true","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n'
          );
          ws.send(
            `X-RequestId:${connectId()}\r\n` +
            'Content-Type:application/ssml+xml\r\n' +
            `X-Timestamp:${dts}Z\r\n` +
            'Path:ssml\r\n\r\n' +
            buildSsml(sanitize(text), voice)
          );
        });

        ws.addEventListener('message', (event) => {
          if (done) return;
          if (typeof event.data === 'string') {
            if (event.data.includes('Path:turn.end')) ws.close();
            return;
          }
          const consume = (buf) => {
            if (buf.length < 3) return;
            const headerLen = (buf[0] << 8) | buf[1];
            if (headerLen + 2 > buf.length) return;
            const headers = new TextDecoder().decode(buf.slice(2, headerLen + 2));
            if (!headers.includes('audio/mpeg')) return;
            const audio = buf.slice(headerLen + 2);
            if (audio.length > 0) chunks.push(audio);
          };
          if (event.data instanceof ArrayBuffer) {
            consume(new Uint8Array(event.data));
          } else if (event.data && typeof event.data.arrayBuffer === 'function') {
            event.data.arrayBuffer().then((ab) => consume(new Uint8Array(ab))).catch(() => {});
          }
        });

        ws.addEventListener('close', () => finish(null));
        ws.addEventListener('error', () => finish(new Error('TTS 连接失败')));
      }).catch((err) => finish(err));
    }).catch((err) => reject(err));
  });
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch (_) {
    return new Response(JSON.stringify({ error: 'bad request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const text = (body && body.text) || '';
  const voice = (body && body.voice) || 'en-US-AriaNeural';
  if (!text) {
    return new Response(JSON.stringify({ error: 'no text' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const audio = await edgeTTS(text, voice);
    return new Response(audio, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
