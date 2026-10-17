// No, I'm Fine.: all music, sound effects, and character voices are synthesised live (no audio files).
(function (G) {
  'use strict';
  const D = G.NIF_DATA;
  let ctx = null, master, comp, musicBus, sfxBus, voiceBus, lp, verb, crackleSrc = null;
  let musicVol = 0.6, sfxVol = 0.8, muted = false;
  let cur = null, timer = null, nextT = 0, stepN = 0;
  let onBeat = null, voiceTimer = null, speakingUntil = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = G.AudioContext || G.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 3.5;
    comp.attack.value = 0.008; comp.release.value = 0.18;
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1;
    master.connect(comp); comp.connect(ctx.destination);

    lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9500; lp.Q.value = 0.45;
    musicBus = ctx.createGain(); musicBus.gain.value = musicVol * 0.56; musicBus.connect(lp); lp.connect(master);

    // Stereo slapback delay for warm room acoustics
    const dL = ctx.createDelay(0.5), dR = ctx.createDelay(0.5), fb = ctx.createGain(), vWet = ctx.createGain(), vFilter = ctx.createBiquadFilter();
    dL.delayTime.value = 0.11; dR.delayTime.value = 0.17; fb.gain.value = 0.25; vWet.gain.value = 0.18;
    vFilter.type = 'lowpass'; vFilter.frequency.value = 2600;
    verb = ctx.createGain();
    verb.connect(dL); dL.connect(dR); dR.connect(vFilter); vFilter.connect(fb); fb.connect(dL);
    vFilter.connect(vWet); vWet.connect(master);
    lp.connect(verb);

    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVol; sfxBus.connect(master);
    voiceBus = ctx.createGain(); voiceBus.gain.value = sfxVol * 0.92; voiceBus.connect(master); voiceBus.connect(verb);
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
  function dist() { if (!distCurve) { distCurve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; distCurve[i] = Math.tanh(x * 5); } } const w = ctx.createWaveShaper(); w.curve = distCurve; return w; }

  // ---------- instruments ----------
  function kick(t, v, out) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
    env(g, t, 0.002, v, 0.24, 0.001); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3);
  }
  function snare(t, v, out, toneF) {
    const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = toneF || 1850; f.Q.value = 0.75;
    env(g, t, 0.001, v, 0.16, 0.001); n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + 0.21);
    const o = ctx.createOscillator(), g2 = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(130, t + 0.07);
    env(g2, t, 0.001, v * 0.55, 0.08, 0.001); o.connect(g2); g2.connect(out); o.start(t); o.stop(t + 0.1);
  }
  function hat(t, v, out, open) { const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 7200; env(g, t, 0.001, v, open ? 0.22 : 0.042, 0.001); n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + (open ? 0.3 : 0.06)); }
  function ride(t, v, out) { const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 5400; f.Q.value = 2.8; env(g, t, 0.001, v, 0.42, 0.001); n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + 0.46); }
  function tone(t, midi, len, v, out, type, cutoff, a, rel, detune) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type || 'sawtooth'; o.frequency.value = mtof(midi); if (detune) o.detune.value = detune;
    f.type = 'lowpass'; f.frequency.setValueAtTime((cutoff || 1200) * 1.35, t);
    f.frequency.exponentialRampToValueAtTime( Math.max(120, cutoff || 1200), t + Math.min(0.18, len * 0.6));
    env(g, t, a || 0.006, v, Math.max(0.02, len * 0.55), 0.62, rel || 0.09, len);
    o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + len + (rel || 0.09) + 0.05);
  }
  function rhodes(t, midi, len, v, out) {
    const f0 = mtof(midi), car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    car.type = 'sine'; car.frequency.value = f0; mod.type = 'sine'; mod.frequency.value = f0 * 2;
    mg.gain.setValueAtTime(f0 * 1.7, t); mg.gain.exponentialRampToValueAtTime(f0 * 0.14, t + Math.min(0.28, len));
    env(g, t, 0.005, v, Math.max(0.08, len * 0.7), 0.48, 0.35, len);
    mod.connect(mg); mg.connect(car.frequency); car.connect(g); g.connect(out);
    car.start(t); mod.start(t); car.stop(t + len + 0.4); mod.stop(t + len + 0.4);
  }
  function chord(t, notes, len, v, out, type, cutoff, a, rel) {
    notes.forEach((n, idx) => tone(t, n, len, v / notes.length * 1.55, out, type, cutoff, a, rel, (idx - 1) * 4));
  }
  function power(t, root, len, v, out) { const d = dist(), g = ctx.createGain(), f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600; g.gain.value = v * 0.35; d.connect(f); f.connect(g); g.connect(out); for (const n of [root, root + 7, root + 12]) { const o = ctx.createOscillator(), e = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = (Math.random() - 0.5) * 12; env(e, t, 0.003, 0.5, len * 0.5, 0.7, 0.05, len); o.connect(e); e.connect(d); o.start(t); o.stop(t + len + 0.1); } }
  function pluck(t, midi, v, out) { tone(t, midi, 0.06, v, out, 'triangle', 2600, 0.002, 0.65); tone(t, midi + 12, 0.03, v * 0.3, out, 'sine', 3200, 0.002, 0.3); }

  // ---------- grooves ----------
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], penta: [0, 3, 5, 7, 10], mixo: [0, 2, 4, 5, 7, 9, 10] };
  const PROGS = { major: [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 4, 0]], minor: [[0, 5, 6, 4], [0, 3, 4, 0], [0, 6, 5, 4]], dorian: [[0, 3, 0, 3], [0, 6, 3, 4]], mixo: [[0, 6, 3, 0], [0, 3, 6, 3]] };
  const STYLE = {
    rock: { scale: 'major', swing: 0, k: 'x...x...x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', bass: '8th', chords: 'power8', lead: 0.35 },
    punk: { scale: 'major', swing: 0, k: 'x.x.x.x.x.x.x.x.', s: '..x...x...x...x.', h: 'xxxxxxxxxxxxxxxx', bass: '8th', chords: 'power8', lead: 0.15 },
    metal: { scale: 'minor', swing: 0, k: 'xxxxxxxxxxxxxxxx', s: '....x.......x...', h: 'x...x...x...x...', bass: '16th', chords: 'chug', lead: 0.25 },
    soul: { scale: 'major', swing: 0.14, k: 'x......xx.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', bass: 'soul', chords: 'organ', lead: 0.52 },
    jazz: { scale: 'dorian', swing: 0.32, k: 'x.......x.......', s: '....x.......x..x', h: 'ride', bass: 'walk', chords: 'comp', lead: 0.58 },
    hiphop: { scale: 'minor', swing: 0.22, k: 'x.....x...x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', bass: 'boom', chords: 'rhodes', lead: 0.3, dusty: true },
    reggae: { scale: 'major', swing: 0.12, k: '........x.......', s: '........x.......', h: '..x...x...x...x.', bass: 'reggae', chords: 'skank', lead: 0.28 },
    house: { scale: 'minor', swing: 0, k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', bass: 'house', chords: 'stab', lead: 0.25, openHat: true },
    disco: { scale: 'mixo', swing: 0, k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', bass: 'octave', chords: 'strings', lead: 0.4, openHat: true },
    folk: { scale: 'major', swing: 0.15, k: 'x.......x.......', s: '....x.......x...', h: 'x...x...x...x...', bass: 'root', chords: 'arp', lead: 0.58 },
  };

  function makeGroove(rec) {
    const st = STYLE[rec.genre] || STYLE.soul, r = D.rng((rec.seed || 1) + 17);
    const g = D.GENRES[rec.genre] || { bpm: 96 };
    const key = 38 + Math.floor(r() * 8);
    const prog = D.pick(r, PROGS[st.scale] || PROGS.major);
    const bpm = Math.round(g.bpm * (0.95 + r() * 0.1));
    const scale = SCALES[st.scale === 'major' || st.scale === 'mixo' ? 'major' : 'penta'];
    // Structured 4-bar call-and-response melody
    const phraseA = [], phraseB = [];
    let degIdx = Math.floor(r() * scale.length);
    for (let i = 0; i < 16; i++) {
      const strong = (i % 4 === 0) || (i % 4 === 2 && r() < 0.65);
      if (r() < (st.lead || 0.35) * (strong ? 0.92 : 0.4)) {
        degIdx = Math.max(0, Math.min(scale.length + 2, degIdx + (r() < 0.5 ? 1 : -1) * (r() < 0.75 ? 1 : 2)));
        const note = scale[degIdx % scale.length] + (degIdx >= scale.length ? 12 : 0);
        phraseA.push(note);
        phraseB.push(i >= 12 ? scale[0] : (r() < 0.7 ? note : scale[(degIdx + 2) % scale.length]));
      } else { phraseA.push(null); phraseB.push(null); }
    }
    const tune = phraseA.concat(phraseB, phraseA, phraseB);
    return { rec, st, key, prog, bpm, tune, scale: SCALES[st.scale] };
  }

  function deg(gr, d, oct) { const s = gr.scale; return gr.key + s[((d % s.length) + s.length) % s.length] + 12 * (Math.floor(d / s.length) + (oct || 0)); }
  function triad(gr, d, oct) { return [deg(gr, d, oct), deg(gr, d + 2, oct), deg(gr, d + 4, oct)]; }

  let walkPos = 0;
  function playStep(gr, n, t) {
    const st = gr.st, out = musicBus, s16 = 60 / gr.bpm / 4, i = n % 16, bar = Math.floor(n / 16);
    const d = gr.prog[bar % gr.prog.length];
    const sw = (i % 2) ? s16 * st.swing : 0; t += sw;
    if (st.k[i] === 'x') kick(t, st.chords === 'chug' ? 0.55 : 0.85, out);
    if (st.s[i] === 'x') snare(t, gr.rec.genre === 'reggae' ? 0.32 : 0.4, out, gr.rec.genre === 'reggae' ? 950 : 1850);
    if (st.h === 'ride') { if (i % 4 === 0 || (i % 4 === 3 && i % 8 === 7)) ride(t, 0.13, out); if (i === 4 || i === 12) hat(t, 0.09, out); }
    else if (st.h[i] === 'x') hat(t, 0.09, out, st.openHat && i % 4 === 2);
    // bass
    const root = deg(gr, d, 0) - 12;
    switch (st.bass) {
      case '8th': if (i % 2 === 0) tone(t, root, s16 * 1.6, 0.42, out, 'sawtooth', 520); break;
      case '16th': tone(t, root, s16 * 0.8, 0.35, out, 'sawtooth', 420); break;
      case 'soul': if (i === 0 || i === 6 || i === 10 || i === 14) tone(t, i === 6 ? root + 7 : i === 14 ? root + 5 : root, s16 * 2.5, 0.48, out, 'triangle', 820); break;
      case 'walk': if (i % 4 === 0) { walkPos = i === 0 ? 0 : walkPos + (Math.random() < 0.7 ? 1 : -1); tone(t, deg(gr, d + walkPos, -1), s16 * 3.5, 0.52, out, 'triangle', 740); } break;
      case 'boom': if (i === 0 || i === 7 || i === 10) tone(t, root, s16 * 3, 0.58, out, 'sine', 420); break;
      case 'reggae': if ([0, 3, 6, 8, 11].includes(i)) tone(t, i === 6 ? root + 7 : i === 11 ? root + 5 : root, s16 * 2.4, 0.6, out, 'sine', 400); break;
      case 'house': if (i % 4 === 2) tone(t, root, s16 * 1.5, 0.5, out, 'sawtooth', 620); break;
      case 'octave': if (i % 2 === 0) tone(t, root + (i % 4 ? 12 : 0), s16 * 1.2, 0.46, out, 'sawtooth', 920); break;
      case 'root': if (i === 0 || i === 8) tone(t, i === 8 ? root + 7 : root, s16 * 6, 0.42, out, 'triangle', 640); break;
    }
    // harmony
    const tri = triad(gr, d, 1);
    switch (st.chords) {
      case 'power8': if (i % 2 === 0) power(t, deg(gr, d, 0), s16 * 1.7, 0.48, out); break;
      case 'chug': if (i % 2 === 0) power(t, deg(gr, 0, 0) - (i % 8 === 6 ? 1 : 0), s16 * 0.9, 0.48, out); break;
      case 'organ': if (i === 0 || i === 8) { tri.forEach(n => rhodes(t, n, s16 * 7, 0.11, out)); } break;
      case 'comp': if (i === 3 || i === 10) { tri.concat(deg(gr, d + 6, 1)).forEach(n => rhodes(t, n, s16 * 2.2, 0.1, out)); } break;
      case 'rhodes': if (i === 0 || i === 6) { tri.concat(deg(gr, d + 6, 1)).forEach(n => rhodes(t, n, s16 * 5, 0.11, out)); } break;
      case 'skank': if (i % 8 === 4) chord(t, tri, s16 * 0.65, 0.34, out, 'triangle', 1900); break;
      case 'stab': if (i === 2 || i === 7 || i === 10) chord(t, tri, s16 * 0.9, 0.34, out, 'sawtooth', 2800); break;
      case 'strings': if (i === 0) chord(t, tri.concat(tri[0] + 12), s16 * 15, 0.22, out, 'sawtooth', 2300, 0.25, 0.35); break;
      case 'arp': if (i % 2 === 0) pluck(t, tri[(i / 2) % 3] + ((i / 2) % 6 > 2 ? 12 : 0), 0.3, out); break;
    }
    // melody
    const note = gr.tune[n % gr.tune.length];
    if (note != null) {
      if (gr.rec.genre === 'jazz' || gr.rec.genre === 'soul') rhodes(t, gr.key + 24 + note, s16 * 2.2, 0.14, out);
      else tone(t, gr.key + 24 + note, s16 * 1.9, 0.15, out, gr.rec.genre === 'folk' ? 'triangle' : 'sine', 2400, 0.008, 0.14);
    }
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
    lp.frequency.setValueAtTime(cur.st.dusty ? 3400 : 9500, ctx.currentTime);
    timer = setInterval(tick, 25);
    startCrackle();
  }
  function stop() { if (timer) clearInterval(timer); timer = null; cur = null; }
  const playing = () => cur && cur.rec;

  function startCrackle() {
    if (crackleSrc || !ctx) return;
    const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0007 ? (Math.random() * 2 - 1) * 0.65 : (Math.random() * 2 - 1) * 0.009;
    crackleSrc = ctx.createBufferSource(); crackleSrc.buffer = b; crackleSrc.loop = true;
    const g = ctx.createGain(); g.gain.value = 0.2; crackleSrc.connect(g); g.connect(musicBus); crackleSrc.start();
  }

  // ---------- Character Voice Synthesizer (formant vowel tract speech) ----------
  const VOWELS = {
    a: [780, 1220], e: [520, 1850], i: [310, 2280], o: [480, 920], u: [340, 820]
  };
  const VOICE_PROFILES = {
    // 6 Partners
    jess:    { pitch: 235, speed: 0.056, wave: 'sawtooth', vib: 5,  inflect: 1.15 },
    dan:     { pitch: 122, speed: 0.060, wave: 'sawtooth', vib: 4,  inflect: 1.18 },
    priya:   { pitch: 248, speed: 0.050, wave: 'triangle', vib: 6,  inflect: 1.22 },
    marcus:  { pitch: 105, speed: 0.065, wave: 'sawtooth', vib: 3.5, inflect: 0.92 },
    chloe:   { pitch: 268, speed: 0.052, wave: 'triangle', vib: 7,  inflect: 1.28 },
    tom:     { pitch: 115, speed: 0.062, wave: 'sawtooth', vib: 3,  inflect: 0.88 },
    // Supporting cast
    steve:   { pitch: 96,  speed: 0.068, wave: 'sawtooth', vib: 3,  inflect: 1.1 },
    debbie:  { pitch: 262, speed: 0.048, wave: 'sawtooth', vib: 8,  inflect: 1.35 },
    linda:   { pitch: 215, speed: 0.064, wave: 'triangle', vib: 9,  inflect: 1.2 },
    pat:     { pitch: 205, speed: 0.062, wave: 'triangle', vib: 8.5, inflect: 1.18 },
    gary:    { pitch: 108, speed: 0.066, wave: 'sawtooth', vib: 3,  inflect: 0.85 },
    waiter:  { pitch: 138, speed: 0.056, wave: 'triangle', vib: 5.5, inflect: 1.2 },
    tyler:   { pitch: 315, speed: 0.048, wave: 'triangle', vib: 6,  inflect: 1.3 },
    you:     { pitch: 168, speed: 0.055, wave: 'triangle', vib: 4.5, inflect: 1.1 },
  };

  function getVoiceProfile(opts) {
    opts = opts || {};
    if (opts.id && VOICE_PROFILES[opts.id]) return VOICE_PROFILES[opts.id];
    return VOICE_PROFILES.you;
  }

  function speakSyllable(t, f0, f1, f2, dur, wave, vib, vol) {
    const o = ctx.createOscillator(), sub = ctx.createOscillator();
    const flt1 = ctx.createBiquadFilter(), flt2 = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = wave || 'sawtooth'; sub.type = 'sine';
    o.frequency.setValueAtTime(f0 * 0.96, t);
    o.frequency.linearRampToValueAtTime(f0 * 1.05, t + dur * 0.45);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.92, t + dur);
    sub.frequency.setValueAtTime(f0 * 0.5, t);
    if (vib) {
      const lfo = ctx.createOscillator(), lfog = ctx.createGain();
      lfo.frequency.value = 6; lfog.gain.value = vib;
      lfo.connect(lfog); lfog.connect(o.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.02);
    }
    flt1.type = 'bandpass'; flt1.frequency.value = f1; flt1.Q.value = 4.2;
    flt2.type = 'bandpass'; flt2.frequency.value = f2; flt2.Q.value = 5.0;
    const g1 = ctx.createGain(), g2 = ctx.createGain(), gSub = ctx.createGain();
    g1.gain.value = 0.85; g2.gain.value = 0.52; gSub.gain.value = 0.25;
    env(g, t, 0.008, vol, dur * 0.5, 0.65, 0.022, dur * 0.82);
    o.connect(flt1); o.connect(flt2); sub.connect(gSub);
    flt1.connect(g1); flt2.connect(g2);
    g1.connect(g); g2.connect(g); gSub.connect(g);
    g.connect(voiceBus);
    o.start(t); sub.start(t); o.stop(t + dur + 0.03); sub.stop(t + dur + 0.03);
  }

  function speak(text, opts) {
    if (!init() || muted || !text) return 0;
    if (opts && opts.id === 'biscuit') { SFX.meow(); return 0.4; }
    if (voiceTimer) { clearTimeout(voiceTimer); voiceTimer = null; }
    const clean = String(text).replace(/<[^>]*>/g, '').replace(/[^\w\s?!.,']/g, '');
    const prof = getVoiceProfile(opts);
    const mood = (opts && opts.mood) || 'neutral';
    const isQuestion = clean.includes('?');
    const isExclaim = clean.includes('!');
    const words = clean.split(/\s+/).filter(Boolean).slice(0, 14);
    let t = ctx.currentTime + 0.02;
    const basePitch = prof.pitch * (mood === 'joy' || mood === 'happy' || mood === 'wow' ? 1.12 : mood === 'angry' || mood === 'cross' ? 0.92 : mood === 'sad' || mood === 'meh' ? 0.94 : 1);
    const step = prof.speed;
    let count = 0;
    for (let w = 0; w < words.length && count < 22; w++) {
      const word = words[w].toLowerCase();
      const chunks = word.match(/[aeiouy]+|[^aeiouy]+/g) || [word];
      const syls = Math.max(1, Math.min(3, Math.ceil(chunks.length / 2)));
      for (let s = 0; s < syls && count < 22; s++) {
        const ch = word[(s * 2) % word.length] || 'a';
        const vw = VOWELS[ch] || VOWELS[['a', 'e', 'i', 'o', 'u'][(word.charCodeAt(0) + s) % 5]];
        const prog = count / Math.max(1, words.length * 1.4);
        let contour = 1 + Math.sin(count * 1.7 + word.length) * 0.08 * prof.inflect;
        if (isQuestion && prog > 0.65) contour += (prog - 0.65) * 0.85;
        else if (isExclaim && prog < 0.4) contour += 0.16;
        else if (mood === 'meh' || mood === 'sus') contour = 1 - prog * 0.06;
        else if (prog > 0.75) contour -= (prog - 0.75) * 0.22;
        const f0 = Math.max(75, Math.min(540, basePitch * contour));
        const dur = step * (0.85 + (word.length > 5 ? 0.2 : 0));
        speakSyllable(t, f0, vw[0] * (f0 > 210 ? 1.12 : 0.95), vw[1] * (f0 > 210 ? 1.08 : 0.95), dur, prof.wave, prof.vib, 0.22);
        t += dur + step * 0.22;
        count++;
      }
      t += step * (word.endsWith(',') || word.endsWith('.') || word.endsWith('—') ? 1.1 : 0.35);
    }
    const totalDur = Math.max(0.25, t - ctx.currentTime);
    speakingUntil = t;
    return totalDur;
  }

  const isSpeaking = () => !!(ctx && ctx.currentTime < speakingUntil);

  // ---------- sound effects ----------
  function blip(f, t, len, v, type, f2) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len); env(g, t, 0.003, v, len, 0.001); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + len + 0.05); }
  function scratch(v) { if (!init()) return; const t = ctx.currentTime, n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = 4; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2600, t + 0.12); f.frequency.exponentialRampToValueAtTime(300, t + 0.25); env(g, t, 0.01, v || 0.5, 0.25, 0.001); n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t); n.stop(t + 0.3); }
  const SFX = {
    till() { const t = ctx.currentTime; blip(2093, t, 0.12, 0.25, 'square'); blip(2637, t + 0.08, 0.35, 0.25, 'square'); const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 4000; env(g, t + 0.05, 0.002, 0.2, 0.2, 0.001); n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t + 0.05); n.stop(t + 0.3); },
    bell() { const t = ctx.currentTime; for (let i = 0; i < 2; i++) { blip(1568, t + i * 0.13, 0.5, 0.12); blip(2350, t + i * 0.13, 0.4, 0.06); } },
    pop() { blip(600, ctx.currentTime, 0.12, 0.3, 'sine', 1400); },
    heart() { const t = ctx.currentTime; [523, 659, 784, 1046].forEach((f, i) => blip(f, t + i * 0.07, 0.25, 0.18, 'triangle')); },
    fail() { scratch(0.5); blip(220, ctx.currentTime + 0.05, 0.4, 0.2, 'sawtooth', 110); },
    flip() { const t = ctx.currentTime, n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 1800; env(g, t, 0.002, 0.25, 0.06, 0.001); n.connect(f); f.connect(g); g.connect(sfxBus); n.start(t); n.stop(t + 0.1); },
    rare() { const t = ctx.currentTime; [659, 784, 988, 1318].forEach((f, i) => blip(f, t + i * 0.06, 0.4, 0.2, 'square')); },
    legend() { const t = ctx.currentTime; [523, 659, 784, 1046, 784, 1046, 1318, 1568].forEach((f, i) => { blip(f, t + i * 0.09, 0.5, 0.18, 'square'); blip(f / 2, t + i * 0.09, 0.5, 0.12, 'triangle'); }); },
    combo(n) { const t = ctx.currentTime; blip(440 * Math.pow(2, Math.min(n, 12) / 12), t, 0.15, 0.2, 'square'); blip(880 * Math.pow(2, Math.min(n, 12) / 12), t + 0.07, 0.2, 0.15, 'square'); },
    alarm() { const t = ctx.currentTime; for (let i = 0; i < 3; i++) blip(880, t + i * 0.18, 0.12, 0.2, 'square', 660); },
    level() { const t = ctx.currentTime; [392, 523, 659, 784, 1046].forEach((f, i) => blip(f, t + i * 0.1, 0.5, 0.2, 'triangle')); },
    click() { blip(1200, ctx.currentTime, 0.04, 0.12, 'square'); },
    meow() {
      const t = ctx.currentTime;
      speakSyllable(t, 540, 820, 1950, 0.16, 'sawtooth', 7, 0.24);
      speakSyllable(t + 0.14, 440, 620, 1300, 0.24, 'triangle', 5, 0.2);
    },
    cash() { const t = ctx.currentTime; for (let i = 0; i < 4; i++) blip(1800 + Math.random() * 800, t + i * 0.05, 0.08, 0.12, 'square'); },
  };
  function sfx(name, arg) { if (!init() || muted) return; try { SFX[name] && SFX[name](arg); } catch (e) { /* audio is best-effort */ } }

  function setVolumes(m, s) { musicVol = m; sfxVol = s; if (musicBus) musicBus.gain.value = m * 0.56; if (sfxBus) sfxBus.gain.value = s; if (voiceBus) voiceBus.gain.value = s * 0.92; }
  function setMuted(v) { muted = v; if (master) master.gain.value = v ? 0 : 1; }
  function duck(on) { if (lp && ctx) lp.frequency.setTargetAtTime(on ? 900 : (cur && cur.st.dusty ? 3400 : 9500), ctx.currentTime, 0.2); }

  G.NIF_AUDIO = { init, play, stop, playing, sfx, speak, isSpeaking, setVolumes, setMuted, duck, set onBeat(f) { onBeat = f; }, get muted() { return muted; } };
})(typeof window !== 'undefined' ? window : globalThis);
