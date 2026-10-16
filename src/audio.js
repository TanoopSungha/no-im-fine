// No, I'm Fine.: all music and sound effects are synthesised live (no audio files).
// Every record has its own little groove: the genre sets the style, the record's seed sets the key, tempo and tune.
(function (G) {
  'use strict';
  const D = G.NIF_DATA;
  let ctx = null, master, musicBus, sfxBus, lp, crackleSrc = null;
  let musicVol = 0.6, sfxVol = 0.8, muted = false;
  let cur = null, timer = null, nextT = 0, stepN = 0;
  let onBeat = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = G.AudioContext || G.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000; lp.Q.value = 0.4;
    musicBus = ctx.createGain(); musicBus.gain.value = musicVol * 0.55; musicBus.connect(lp); lp.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVol; sfxBus.connect(master);
    return true;
  }

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  let noiseBuf = null;
  function noise() {
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; return s;
  }
  function env(g, t, a, peak, dcy, sus, rel, len) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + dcy);
    if (len != null) { g.gain.setValueAtTime(Math.max(0.0001, peak * sus), t + len); g.gain.exponentialRampToValueAtTime(0.0001, t + len + rel); }
  }
  let distCurve = null;
  function dist() { if (!distCurve) { distCurve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; distCurve[i] = Math.tanh(x * 6); } } const w = ctx.createWaveShaper(); w.curve = distCurve; return w; }

  // ---------- instruments ----------
  function kick(t, v, out) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); env(g, t, 0.002, v, 0.25, 0.001); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3); }
  function snare(t, v, out, tone) { const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = tone || 1800; f.Q.value = 0.7; env(g, t, 0.001, v, 0.16, 0.001); n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + 0.2); const o = ctx.createOscillator(), g2 = ctx.createGain(); o.frequency.value = 190; env(g2, t, 0.001, v * 0.5, 0.08, 0.001); o.connect(g2); g2.connect(out); o.start(t); o.stop(t + 0.1); }
  function hat(t, v, out, open) { const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 7000; env(g, t, 0.001, v, open ? 0.22 : 0.04, 0.001); n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + (open ? 0.3 : 0.06)); }
  function ride(t, v, out) { const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 5200; f.Q.value = 3; env(g, t, 0.001, v, 0.4, 0.001); n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + 0.45); }
  function tone(t, midi, len, v, out, type, cutoff, a, rel) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type || 'sawtooth'; o.frequency.value = mtof(midi); f.type = 'lowpass'; f.frequency.value = cutoff || 1200;
    env(g, t, a || 0.005, v, Math.max(0.02, len * 0.6), 0.6, rel || 0.08, len);
    o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + len + (rel || 0.08) + 0.05);
  }
  function chord(t, notes, len, v, out, type, cutoff, a, rel) { for (const n of notes) tone(t, n, len, v / notes.length * 1.6, out, type, cutoff, a, rel); }
  function power(t, root, len, v, out) { const d = dist(), g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600; g.gain.value = v * 0.35; d.connect(f); f.connect(g); g.connect(out); for (const n of [root, root + 7, root + 12]) { const o = ctx.createOscillator(), e = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = (Math.random() - 0.5) * 12; env(e, t, 0.003, 0.5, len * 0.5, 0.7, 0.05, len); o.connect(e); e.connect(d); o.start(t); o.stop(t + len + 0.1); } }
  function pluck(t, midi, v, out) { tone(t, midi, 0.05, v, out, 'triangle', 2400, 0.002, 0.6); }

  // ---------- grooves ----------
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], penta: [0, 3, 5, 7, 10], mixo: [0, 2, 4, 5, 7, 9, 10] };
  const PROGS = { major: [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 0, 4]], minor: [[0, 5, 6, 4], [0, 3, 4, 0], [0, 6, 5, 4]], dorian: [[0, 3, 0, 3], [0, 6, 3, 0]], mixo: [[0, 6, 3, 0], [0, 3, 6, 3]] };
  const STYLE = {
    rock: { scale: 'major', swing: 0, k: 'x...x...x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', bass: '8th', chords: 'power8', lead: 0.3 },
    punk: { scale: 'major', swing: 0, k: 'x.x.x.x.x.x.x.x.', s: '..x...x...x...x.', h: 'xxxxxxxxxxxxxxxx', bass: '8th', chords: 'power8', lead: 0.1 },
    metal: { scale: 'minor', swing: 0, k: 'xxxxxxxxxxxxxxxx', s: '....x.......x...', h: 'x...x...x...x...', bass: '16th', chords: 'chug', lead: 0.25 },
    soul: { scale: 'major', swing: 0.12, k: 'x......xx.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', bass: 'soul', chords: 'organ', lead: 0.5 },
    jazz: { scale: 'dorian', swing: 0.33, k: '................', s: '..........x.....', h: 'ride', bass: 'walk', chords: 'comp', lead: 0.55 },
    hiphop: { scale: 'minor', swing: 0.22, k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', bass: 'boom', chords: 'rhodes', lead: 0.25, dusty: true },
    reggae: { scale: 'major', swing: 0.1, k: '........x.......', s: '........x.......', h: '..x...x...x...x.', bass: 'reggae', chords: 'skank', lead: 0.2 },
    house: { scale: 'minor', swing: 0, k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', bass: 'house', chords: 'stab', lead: 0.2, openHat: true },
    disco: { scale: 'mixo', swing: 0, k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', bass: 'octave', chords: 'strings', lead: 0.35, openHat: true },
    folk: { scale: 'major', swing: 0.15, k: 'x.......x.......', s: '................', h: '................', bass: 'root', chords: 'arp', lead: 0.6 },
  };

  function makeGroove(rec) {
    const st = STYLE[rec.genre] || STYLE.rock, r = D.rng((rec.seed || 1) + 17);
    const g = D.GENRES[rec.genre];
    const key = 36 + Math.floor(r() * 9);
    const prog = D.pick(r, PROGS[st.scale] || PROGS.major);
    const bpm = Math.round(g.bpm * (0.94 + r() * 0.12));
    // a little two-bar tune, regenerated per record
    const scale = SCALES[st.scale === 'major' || st.scale === 'mixo' ? 'major' : 'penta'];
    const tune = []; for (let i = 0; i < 32; i++) tune.push(r() < (st.lead || 0.3) * 0.7 ? scale[Math.floor(r() * scale.length)] + (r() < 0.3 ? 12 : 0) : null);
    return { rec, st, key, prog, bpm, tune, scale: SCALES[st.scale] };
  }

  function deg(gr, d, oct) { const s = gr.scale; return gr.key + s[((d % s.length) + s.length) % s.length] + 12 * (Math.floor(d / s.length) + (oct || 0)); }
  function triad(gr, d, oct) { return [deg(gr, d, oct), deg(gr, d + 2, oct), deg(gr, d + 4, oct)]; }

  let walkPos = 0;
  function playStep(gr, n, t) {
    const st = gr.st, out = musicBus, s16 = 60 / gr.bpm / 4, i = n % 16, bar = Math.floor(n / 16);
    const d = gr.prog[bar % gr.prog.length];
    const sw = (i % 2) ? s16 * st.swing : 0; t += sw;
    if (st.k[i] === 'x') kick(t, st.chords === 'chug' ? 0.55 : 0.9, out);
    if (st.s[i] === 'x') snare(t, gr.rec.genre === 'reggae' ? 0.35 : 0.45, out, gr.rec.genre === 'reggae' ? 900 : 1800);
    if (st.h === 'ride') { if (i % 4 === 0 || i % 4 === 3 && i % 8 === 7) ride(t, 0.12, out); if (i === 4 || i === 12) hat(t, 0.1, out); }
    else if (st.h[i] === 'x') hat(t, 0.1, out, st.openHat && i % 4 === 2);
    // bass
    const root = deg(gr, d, 0) - 12;
    switch (st.bass) {
      case '8th': if (i % 2 === 0) tone(t, root, s16 * 1.6, 0.45, out, 'sawtooth', 500); break;
      case '16th': tone(t, root, s16 * 0.8, 0.35, out, 'sawtooth', 420); break;
      case 'soul': if (i === 0 || i === 6 || i === 10) tone(t, i === 6 ? root + 7 : root, s16 * 2.5, 0.5, out, 'triangle', 800); break;
      case 'walk': if (i % 4 === 0) { walkPos = i === 0 ? 0 : walkPos + (Math.random() < 0.7 ? 1 : -1); tone(t, deg(gr, d + walkPos, -1), s16 * 3.5, 0.55, out, 'triangle', 700); } break;
      case 'boom': if (i === 0 || i === 7 || i === 10) tone(t, root, s16 * 3, 0.6, out, 'sine', 400); break;
      case 'reggae': if ([0, 3, 6, 8, 11].includes(i)) tone(t, i === 6 ? root + 7 : i === 11 ? root + 5 : root, s16 * 2.4, 0.65, out, 'sine', 380); break;
      case 'house': if (i % 4 === 2) tone(t, root, s16 * 1.5, 0.55, out, 'sawtooth', 600); break;
      case 'octave': if (i % 2 === 0) tone(t, root + (i % 4 ? 12 : 0), s16 * 1.2, 0.5, out, 'sawtooth', 900); break;
      case 'root': if (i === 0 || i === 8) tone(t, root, s16 * 6, 0.4, out, 'triangle', 600); break;
    }
    // harmony
    const tri = triad(gr, d, 1);
    switch (st.chords) {
      case 'power8': if (i % 2 === 0) power(t, deg(gr, d, 0), s16 * 1.7, 0.5, out); break;
      case 'chug': if (i % 2 === 0) power(t, deg(gr, 0, 0) - (i % 8 === 6 ? 1 : 0), s16 * 0.9, 0.5, out); break;
      case 'organ': if (i === 0 || i === 8) chord(t, tri, s16 * 7, 0.3, out, 'square', 1100, 0.05, 0.2); break;
      case 'comp': if (i === 3 || i === 10) chord(t, tri.concat(deg(gr, d + 6, 1)), s16 * 1.5, 0.28, out, 'sine', 2000, 0.01, 0.3); break;
      case 'rhodes': if (i === 0 || i === 6) chord(t, tri, s16 * 5, 0.28, out, 'sine', 1800, 0.01, 0.4); break;
      case 'skank': if (i % 8 === 4) chord(t, tri, s16 * 0.6, 0.35, out, 'square', 1800); break;
      case 'stab': if (i === 2 || i === 7 || i === 10) chord(t, tri, s16 * 0.9, 0.35, out, 'triangle', 3200); break;
      case 'strings': if (i === 0) chord(t, tri.concat(tri[0] + 12), s16 * 15, 0.22, out, 'sawtooth', 2400, 0.25, 0.3); break;
      case 'arp': if (i % 2 === 0) pluck(t, tri[(i / 2) % 3] + ((i / 2) % 6 > 2 ? 12 : 0), 0.3, out); break;
    }
    // tune
    const note = gr.tune[n % 32];
    if (note != null) tone(t, gr.key + 24 + note, s16 * 1.8, 0.16, out, gr.rec.genre === 'jazz' ? 'sine' : gr.rec.genre === 'folk' ? 'triangle' : 'square', 2400);
    if (onBeat && i % 4 === 0) { const dl = Math.max(0, (t - ctx.currentTime) * 1000); setTimeout(() => onBeat && onBeat(i === 0 ? 1 : 0.6), dl); }
  }

  function tick() {
    if (!cur || !ctx) return;
    const s16 = 60 / cur.bpm / 4;
    while (nextT < ctx.currentTime + 0.12) { playStep(cur, stepN, nextT); nextT += s16; stepN++; }
  }

  function play(rec) {
    if (!init()) return;
    if (cur && rec && cur.rec.id === rec.id) return;
    stop();
    if (!rec) return;
    cur = makeGroove(rec); stepN = 0; walkPos = 0; nextT = ctx.currentTime + 0.12;
    lp.frequency.setValueAtTime(cur.st.dusty ? 3200 : 9000, ctx.currentTime);
    timer = setInterval(tick, 25);
    scratch(0.25);
    startCrackle();
  }
  function stop() { if (timer) clearInterval(timer); timer = null; cur = null; }
  const playing = () => cur && cur.rec;

  function startCrackle() {
    if (crackleSrc || !ctx) return;
    const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.8 : (Math.random() * 2 - 1) * 0.012;
    crackleSrc = ctx.createBufferSource(); crackleSrc.buffer = b; crackleSrc.loop = true;
    const g = ctx.createGain(); g.gain.value = 0.25; crackleSrc.connect(g); g.connect(musicBus); crackleSrc.start();
  }

  // ---------- sound effects ----------
  function blip(f, t, len, v, type, f2) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len); env(g, t, 0.003, v, len, 0.001); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + len + 0.05); }
  function scratch(v) { if (!init()) return; const t = ctx.currentTime, n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = 4; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.12); f.frequency.exponentialRampToValueAtTime(300, t + 0.25); env(g, t, 0.01, v || 0.5, 0.25, 0.001); n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t); n.stop(t + 0.3); }
  const SFX = {
    till() { const t = ctx.currentTime; blip(2093, t, 0.12, 0.25, 'square'); blip(2637, t + 0.08, 0.35, 0.25, 'square'); const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 4000; env(g, t + 0.05, 0.002, 0.2, 0.2, 0.001); n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t + 0.05); n.stop(t + 0.3); },
    bell() { const t = ctx.currentTime; for (let i = 0; i < 2; i++) { blip(1568, t + i * 0.13, 0.5, 0.12); blip(2350, t + i * 0.13, 0.4, 0.06); } },
    pop() { blip(600, ctx.currentTime, 0.12, 0.3, 'sine', 1400); },
    heart() { const t = ctx.currentTime; [523, 659, 784, 1046].forEach((f, i) => blip(f, t + i * 0.07, 0.25, 0.18, 'triangle')); },
    fail() { scratch(0.6); blip(220, ctx.currentTime + 0.05, 0.4, 0.2, 'sawtooth', 110); },
    flip() { const t = ctx.currentTime, n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 1800; env(g, t, 0.002, 0.25, 0.06, 0.001); n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t); n.stop(t + 0.1); },
    rare() { const t = ctx.currentTime; [659, 784, 988, 1318].forEach((f, i) => blip(f, t + i * 0.06, 0.4, 0.2, 'square')); },
    legend() { const t = ctx.currentTime; [523, 659, 784, 1046, 784, 1046, 1318, 1568].forEach((f, i) => { blip(f, t + i * 0.09, 0.5, 0.18, 'square'); blip(f / 2, t + i * 0.09, 0.5, 0.12, 'triangle'); }); },
    combo(n) { const t = ctx.currentTime; blip(440 * Math.pow(2, Math.min(n, 12) / 12), t, 0.15, 0.2, 'square'); blip(880 * Math.pow(2, Math.min(n, 12) / 12), t + 0.07, 0.2, 0.15, 'square'); },
    alarm() { const t = ctx.currentTime; for (let i = 0; i < 3; i++) blip(880, t + i * 0.18, 0.12, 0.2, 'square', 660); },
    level() { const t = ctx.currentTime; [392, 523, 659, 784, 1046].forEach((f, i) => blip(f, t + i * 0.1, 0.5, 0.2, 'triangle')); },
    click() { blip(1200, ctx.currentTime, 0.04, 0.12, 'square'); },
    meow() { const t = ctx.currentTime; blip(700, t, 0.35, 0.18, 'triangle', 500); blip(900, t + 0.02, 0.3, 0.08, 'sine', 600); },
    cash() { const t = ctx.currentTime; for (let i = 0; i < 4; i++) blip(1800 + Math.random() * 800, t + i * 0.05, 0.08, 0.12, 'square'); },
  };
  function sfx(name, arg) { if (!init() || muted) return; try { SFX[name] && SFX[name](arg); } catch (e) { /* audio is best-effort */ } }

  function setVolumes(m, s) { musicVol = m; sfxVol = s; if (musicBus) musicBus.gain.value = m * 0.55; if (sfxBus) sfxBus.gain.value = s; }
  function setMuted(v) { muted = v; if (master) master.gain.value = v ? 0 : 1; }
  function duck(on) { if (lp && ctx) lp.frequency.setTargetAtTime(on ? 900 : (cur && cur.st.dusty ? 3200 : 9000), ctx.currentTime, 0.2); }

  G.NIF_AUDIO = { init, play, stop, playing, sfx, setVolumes, setMuted, duck, set onBeat(f) { onBeat = f; }, get muted() { return muted; } };
})(typeof window !== 'undefined' ? window : globalThis);
