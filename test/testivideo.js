'use strict';
/* Testivideoiden generointi selaimessa: canvas → WebCodecs (VP8 + Opus) → oma WebM-muxeri.
   Jokaisen kuvan yläreunaan koodataan kuvanumero 16-bittisenä binäärinauhana, jotta testi voi
   varmistaa, mikä kuva videossa oikeasti näkyy. */

const W = 640, H = 360, BITS = 16, BW = 36, BH = 24, BSTEP = 40;

/* ---------- EBML / WebM ---------- */
function cat(parts) {
  let n = 0; for (const p of parts) n += p.length;
  const out = new Uint8Array(n); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
function idBytes(id) { const a = []; let x = id; while (x > 0) { a.unshift(x % 256); x = Math.floor(x / 256); } return new Uint8Array(a); }
function size8(n) { const b = new Uint8Array(8); b[0] = 1; let x = n; for (let i = 7; i >= 1; i--) { b[i] = x % 256; x = Math.floor(x / 256); } return b; }
function u(n, bytes) { if (!bytes) { bytes = 1; while (n >= 2 ** (8 * bytes)) bytes++; } const b = new Uint8Array(bytes); let x = n; for (let i = bytes - 1; i >= 0; i--) { b[i] = x % 256; x = Math.floor(x / 256); } return b; }
function f64(x) { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, x); return b; }
function str(s) { return new TextEncoder().encode(s); }
function el(id, payload) { const p = Array.isArray(payload) ? cat(payload) : payload; return cat([idBytes(id), size8(p.length), p]); }

function muxWebM({ width, height, fps, video, audio, opusHead, durationMs }) {
  const ebml = el(0x1A45DFA3, [el(0x4286, u(1)), el(0x42F7, u(1)), el(0x42F2, u(4)), el(0x42F3, u(8)), el(0x4282, str('webm')), el(0x4287, u(4)), el(0x4285, u(2))]);
  const info = el(0x1549A966, [el(0x2AD7B1, u(1000000)), el(0x4489, f64(durationMs)), el(0x4D80, str('reaktioaika-testi')), el(0x5741, str('reaktioaika-testi'))]);
  const tracksArr = [el(0xAE, [el(0xD7, u(1)), el(0x73C5, u(1)), el(0x83, u(1)), el(0x86, str('V_VP8')), el(0x23E383, u(Math.round(1e9 / fps))),
    el(0xE0, [el(0xB0, u(width)), el(0xBA, u(height))])])];
  if (audio) tracksArr.push(el(0xAE, [el(0xD7, u(2)), el(0x73C5, u(2)), el(0x83, u(2)), el(0x86, str('A_OPUS')), el(0x63A2, opusHead),
    el(0x56AA, u(Math.round(new DataView(opusHead.buffer, opusHead.byteOffset).getUint16(10, true) / 48000 * 1e9))), el(0x56BB, u(80000000)),
    el(0xE1, [el(0xB5, f64(48000)), el(0x9F, u(1))])]));
  const tracks = el(0x1654AE6B, tracksArr);

  // lohkot aikajärjestykseen, klusteri alkaa jokaisesta videon avainkuvasta
  const blocks = [...video.map(b => ({ ...b, track: 1 })), ...(audio || []).map(b => ({ ...b, track: 2, key: true }))]
    .sort((a, b) => a.ms - b.ms || a.track - b.track);
  const clusters = []; let cur = null;
  for (const b of blocks) {
    if (!cur || (b.track === 1 && b.key) || b.ms - cur.ms > 30000) { cur = { ms: b.track === 1 ? b.ms : Math.min(b.ms, cur ? cur.ms : b.ms), blocks: [] }; clusters.push(cur); }
    cur.blocks.push(b);
  }
  const clusterBytes = clusters.map(c => el(0x1F43B675, [el(0xE7, u(c.ms)), ...c.blocks.map(b => {
    const rel = b.ms - c.ms; const h = new Uint8Array(4);
    h[0] = 0x80 | b.track; new DataView(h.buffer).setInt16(1, rel); h[3] = b.key ? 0x80 : 0;
    return el(0xA3, cat([h, b.data]));
  })]));
  const seekEntry = (id, pos) => el(0x4DBB, [el(0x53AB, idBytes(id)), el(0x53AC, u(pos, 8))]);
  const seekLen = el(0x114D9B74, [seekEntry(0x1549A966, 0), seekEntry(0x1654AE6B, 0), seekEntry(0x1C53BB6B, 0)]).length;
  const infoPos = seekLen, tracksPos = infoPos + info.length, firstCluster = tracksPos + tracks.length;
  const cuePoints = []; let pos = firstCluster;
  clusters.forEach((c, i) => { cuePoints.push(el(0xBB, [el(0xB3, u(c.ms)), el(0xB7, [el(0xF7, u(1)), el(0xF1, u(pos, 8))])])); pos += clusterBytes[i].length; });
  const cues = el(0x1C53BB6B, cuePoints);
  const seekHead = el(0x114D9B74, [seekEntry(0x1549A966, infoPos), seekEntry(0x1654AE6B, tracksPos), seekEntry(0x1C53BB6B, pos)]);
  const segment = el(0x18538067, [seekHead, info, tracks, ...clusterBytes, cues]);
  return new Blob([ebml, segment], { type: 'video/webm' });
}

/* ---------- kuvien piirto ---------- */
function drawFrame(ctx, i, spec) {
  ctx.fillStyle = '#1d2b22'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, BH + 8);
  for (let b = 0; b < BITS; b++) {
    const on = (i >> (BITS - 1 - b)) & 1;
    ctx.fillStyle = on ? '#fff' : '#000'; ctx.fillRect(b * BSTEP + 2, 2, BW, BH);
  }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 64px sans-serif'; ctx.fillText(String(i), 20, 110);
  ctx.font = '18px sans-serif'; ctx.fillStyle = '#c3c2b7';
  ctx.fillText(`${spec.label} · tiedosto ${spec.fps} fps${spec.capFps ? ' · kuvattu ' + spec.capFps + ' fps' : ''}`, 20, 140);
  // aktiivinen toisto
  const rep = [...spec.reps].reverse().find(r => i >= Math.min(r.t0, r.t1 ?? r.t0) - 40) || spec.reps[0];
  const d0 = i - rep.t0;
  // "lukkari": pallo kädessä ennen T0:aa, lentää T0:sta alkaen
  const bx = d0 < 0 ? 470 : 470 - d0 * 12 * (30 / (spec.capFps || spec.fps)) * 4, by = 200;
  ctx.fillStyle = '#b5552a'; ctx.fillRect(455, 180, 50, 110);
  ctx.fillStyle = '#ffee55'; ctx.beginPath(); ctx.arc(Math.max(-40, bx), by, 13, 0, 7); ctx.fill();
  // "etenijä": T1 = värinvaihto (painonsiirto), T2 = siirtyy pesältä
  const moved = rep.t2 != null && i >= rep.t2 ? 20 + (i - rep.t2) * 3 : 0;
  ctx.fillStyle = rep.t1 != null && i >= rep.t1 ? '#1baf7a' : '#3987e5';
  ctx.fillRect(90 + moved, 200, 44, 100);
  ctx.fillStyle = '#888'; ctx.fillRect(70, 300, 90, 10);   // pesä
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif';
  const tags = []; for (const r of spec.reps) { if (i === r.t0) tags.push('T0'); if (i === r.t1) tags.push('T1'); if (i === r.t2) tags.push('T2'); }
  if (tags.length) ctx.fillText(tags.join(' '), 250, 330);
}
/* Kuvanumeron luku videosta (testiä varten) */
function readFrameNumber(video, canvas) {
  const c = canvas || document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, BH + 4).data;
  let n = 0;
  for (let b = 0; b < BITS; b++) {
    const x = b * BSTEP + 2 + BW / 2, y = 2 + BH / 2, k = (y * W + x) * 4;
    n = n * 2 + ((px[k] + px[k + 1] + px[k + 2]) / 3 > 128 ? 1 : 0);
  }
  return n;
}

/* ---------- MP4 (H.264) iPhonea varten ----------
   iPhonen selain ei toista WebM/VP8-videoita luotettavasti, joten siellä testivideo tehdään MP4:ksi.
   Aikaskaala = fps × 100 ja jokaisen kuvan kesto 100 → kuva-ajat ovat täsmälleen i / fps. */
function pickFormat() {
  const q = new URLSearchParams(location.search).get('format');
  if (q === 'mp4' || q === 'webm') return q;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const webmOk = document.createElement('video').canPlayType('video/webm; codecs="vp8"');
  return ios || !webmOk ? 'mp4' : 'webm';
}
const u32 = n => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0); return b; };
const u16 = n => { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n & 0xffff); return b; };
const box = (type, ...parts) => { const body = cat(parts); return cat([u32(8 + body.length), str(type), body]); };
const fullbox = (type, ver, flags, ...parts) => box(type, new Uint8Array([ver, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255]), ...parts);
const MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].map(u32);

function muxMp4({ width, height, fps, samples, avcC }) {
  const T = Math.round(fps * 100), delta = 100, N = samples.length, D = N * delta;
  const keys = []; samples.forEach((sm, i) => { if (sm.key) keys.push(u32(i + 1)); });
  const moovFor = offset => box('moov',
    fullbox('mvhd', 0, 0, u32(0), u32(0), u32(T), u32(D), u32(0x00010000), u16(0x0100), new Uint8Array(10), ...MATRIX, new Uint8Array(24), u32(2)),
    box('trak',
      fullbox('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(D), new Uint8Array(8), u16(0), u16(0), u16(0), u16(0), ...MATRIX, u32(width * 65536), u32(height * 65536)),
      box('mdia',
        fullbox('mdhd', 0, 0, u32(0), u32(0), u32(T), u32(D), u16(0x55c4), u16(0)),
        fullbox('hdlr', 0, 0, u32(0), str('vide'), new Uint8Array(12), str('VideoHandler\0')),
        box('minf',
          fullbox('vmhd', 0, 1, new Uint8Array(8)),
          box('dinf', fullbox('dref', 0, 0, u32(1), fullbox('url ', 0, 1))),
          box('stbl',
            fullbox('stsd', 0, 0, u32(1), box('avc1', new Uint8Array(6), u16(1), new Uint8Array(16), u16(width), u16(height),
              u32(0x00480000), u32(0x00480000), u32(0), u16(1), new Uint8Array(32), u16(0x0018), u16(0xffff), box('avcC', avcC))),
            fullbox('stts', 0, 0, u32(1), u32(N), u32(delta)),
            fullbox('stss', 0, 0, u32(keys.length), ...keys),
            fullbox('stsc', 0, 0, u32(1), u32(1), u32(N), u32(1)),
            fullbox('stsz', 0, 0, u32(0), u32(N), ...samples.map(sm => u32(sm.data.length))),
            fullbox('stco', 0, 0, u32(1), u32(offset)))))));
  const ftyp = box('ftyp', str('isom'), u32(512), str('isom'), str('iso2'), str('avc1'), str('mp41'));
  const moovLen = moovFor(0).length;
  const moov = moovFor(ftyp.length + moovLen + 8);
  const mdat = box('mdat', ...samples.map(sm => sm.data));
  return new Blob([ftyp, moov, mdat], { type: 'video/mp4' });
}
async function generateMp4(spec, onProgress) {
  const { fps, frames } = spec;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const samples = []; let avcC = null, encErr = null;
  const enc = new VideoEncoder({
    output: (c, meta) => {
      const d = new Uint8Array(c.byteLength); c.copyTo(d); samples.push({ ts: c.timestamp, key: c.type === 'key', data: d });
      const dd = meta && meta.decoderConfig && meta.decoderConfig.description;
      if (dd && !avcC) avcC = dd instanceof ArrayBuffer ? new Uint8Array(dd).slice() : new Uint8Array(dd.buffer, dd.byteOffset, dd.byteLength).slice();
    },
    error: e => encErr = e,
  });
  let cfg = null;
  for (const codec of ['avc1.42002a', 'avc1.4d002a', 'avc1.640034', 'avc1.42001f']) {   // baseline 4.2 riittää 240 fps:lle
    const c = { codec, width: W, height: H, bitrate: 2_500_000, framerate: fps, avc: { format: 'avc' } };
    try { if ((await VideoEncoder.isConfigSupported(c)).supported) { cfg = c; break; } } catch (e) { }
  }
  if (!cfg) throw new Error('Selain ei osaa pakata H.264-videota (WebCodecs).');
  enc.configure(cfg);
  for (let i = 0; i < frames; i++) {
    drawFrame(ctx, i, spec);
    const vf = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
    enc.encode(vf, { keyFrame: i % 15 === 0 }); vf.close();
    if (enc.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 5));
    if (onProgress && i % 30 === 0) onProgress(i / frames);
  }
  await enc.flush(); enc.close();
  if (encErr) throw encErr;
  if (!avcC) throw new Error('H.264-pakkaaja ei antanut avcC-tietoja.');
  samples.sort((a, b) => a.ts - b.ts);
  return muxMp4({ width: W, height: H, fps, samples, avcC });
}
/* Testivideon tiedostonimi valitun muodon mukaan */
function videoFileName(spec, blob) { return blob.type === 'video/mp4' ? spec.name.replace(/\.webm$/, '.mp4') : spec.name; }

/* ---------- koodaus ---------- */
async function generateVideo(spec, onProgress) {
  if (pickFormat() === 'mp4') return generateMp4(spec, onProgress);
  const { fps, frames } = spec;
  const cv = new OffscreenCanvas(W, H), ctx = cv.getContext('2d');
  const video = [];
  let encErr = null;
  const enc = new VideoEncoder({
    output: c => { const d = new Uint8Array(c.byteLength); c.copyTo(d); video.push({ ms: Math.round(c.timestamp / 1000), key: c.type === 'key', data: d }); },
    error: e => encErr = e,
  });
  enc.configure({ codec: 'vp8', width: W, height: H, bitrate: 2_500_000, framerate: fps });
  for (let i = 0; i < frames; i++) {
    drawFrame(ctx, i, spec);
    const vf = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
    enc.encode(vf, { keyFrame: i % 15 === 0 }); vf.close();
    if (enc.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 5));
    if (onProgress && i % 30 === 0) onProgress(i / frames);
  }
  await enc.flush(); enc.close();
  if (encErr) throw encErr;

  // ääni: napsahdus jokaisen toiston T0-hetkellä (tiedoston aikaa)
  let audio = null, opusHead = null;
  if (spec.audio && typeof AudioEncoder !== 'undefined') {
    const SR = 48000, total = Math.ceil(frames / fps * SR), pcm = new Float32Array(total);
    let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
    for (let i = 0; i < total; i++) pcm[i] = rnd() * 0.01;
    for (const r of spec.reps) {
      const s0 = Math.round(r.t0 / fps * SR);
      for (let j = 0; j < SR * 0.012 && s0 + j < total; j++) pcm[s0 + j] += rnd() * 1.6 * Math.exp(-j / (SR * 0.003));
    }
    audio = [];
    const aenc = new AudioEncoder({
      output: (c, meta) => {
        const d = new Uint8Array(c.byteLength); c.copyTo(d); audio.push({ ms: Math.round(c.timestamp / 1000), data: d });
        if (meta?.decoderConfig?.description && !opusHead) opusHead = new Uint8Array(meta.decoderConfig.description);
      },
      error: e => encErr = e,
    });
    aenc.configure({ codec: 'opus', sampleRate: SR, numberOfChannels: 1, bitrate: 96000 });
    const N = 960;
    for (let i = 0; i < total; i += N) {
      const chunk = new Float32Array(N); chunk.set(pcm.subarray(i, Math.min(total, i + N)));
      const ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: N, numberOfChannels: 1, timestamp: Math.round(i / SR * 1e6), data: chunk });
      aenc.encode(ad); ad.close();
    }
    await aenc.flush(); aenc.close();
    if (encErr) throw encErr;
    if (!opusHead) {   // OpusHead käsin: versio 1, 1 kanava, pre-skip 312, 48 kHz
      opusHead = new Uint8Array(19); opusHead.set(str('OpusHead')); const dv = new DataView(opusHead.buffer);
      dv.setUint8(8, 1); dv.setUint8(9, 1); dv.setUint16(10, 312, true); dv.setUint32(12, 48000, true);
    }
  }
  return muxWebM({ width: W, height: H, fps, video, audio, opusHead, durationMs: frames / fps * 1000 });
}

/* Testitapaukset: tapahtumat tunnetuissa kuvissa */
const TEST_SPECS = [
  {
    name: 'testi_30fps.webm', label: 'Normaali 30 fps', fps: 30, frames: 240, capFps: null, audio: true,
    reps: [
      { t0: 30, t1: 36, t2: 45, player: 'Testi Aalto', type: 'osuma' },          // R 200 ms, L 500 ms
      { t0: 120, t1: 118, t2: 132, player: 'Testi Bergström', type: 'syotto' },  // R −66,7 ms (ennakointi)
      { t0: 190, t1: 199, t2: 211, player: 'Testi Aalto', type: 'signaali', rej: true, comment: 'testi; "lainaus" – ääkköset' },
    ],
  },
  {
    name: 'testi_slowmo_240_toisto30.webm', label: 'Slow-mo (240 → 30 fps)', fps: 30, frames: 240, capFps: 240, audio: false,
    reps: [
      { t0: 40, t1: 88, t2: 124, player: 'Testi Aalto', type: 'syotto' },       // todellinen R 200 ms, L 350 ms
      { t0: 150, t1: 179, t2: 222, player: 'Testi Bergström', type: 'syotto' },  // R 120,8 ms, L 300 ms
    ],
  },
  {
    name: 'testi_240fps.webm', label: 'Aito 240 fps', fps: 240, frames: 720, capFps: null, audio: true,
    reps: [
      { t0: 100, t1: 148, t2: 184, player: 'Testi Aalto', type: 'osuma' },       // R 200 ms, L 350 ms
      { t0: 400, t1: 437, t2: 471, player: 'Testi Bergström', type: 'osuma' },   // R 154,2 ms, L 295,8 ms
    ],
  },
];
