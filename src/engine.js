// No, I'm Fine.: game rules. No DOM in here, so it can be tested in Node.
(function (G) {
  'use strict';
  const D = G.NIF_DATA, K = G.NIF_CARDS, I = G.I18N;
  const SAVE = 'no-im-fine-run-v1', META = 'no-im-fine-meta-v1';
  const MK = { l: 'love', p: 'patience', s: 'sanity', m: 'money' };
  let R = Math.random;
  const rand = (a, b) => a + R() * (b - a);
  const pickR = a => a[Math.floor(R() * a.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function weighted(items, w) { let t = 0; for (const i of items) t += w(i); let x = R() * t; for (const i of items) { x -= w(i); if (x <= 0) return i; } return items[items.length - 1]; }

  const GAMES = [
    { id: 'fine', from: 0 }, { id: 'eat', from: 0 }, { id: 'outfit', from: 0 },
    { id: 'mmhmm', from: 1 }, { id: 'duvet', from: 2 }, { id: 'thermo', from: 2 },
  ];

  function newMeta() { return { best: 0, endings: {}, runs: 0, perfect: 0, bestStage: 0 }; }

  function newRun(partnerId, role) {
    const P = D.PARTNERS.find(p => p.id === partnerId) || D.PARTNERS[0];
    return {
      v: 1, partner: { id: P.id, name: P.name, role: role in D.ROLES ? role : 'partner' },
      day: 0, stage: 0, m: { love: 50, patience: 50, sanity: 50, money: 50 },
      flags: {}, seen: {}, n: 0, sinceGame: 0, nextGame: 4, items: ['flowers'], streak: 0, bestStreak: 0,
      cur: null, ended: null, lastItemDay: 0, gamesWon: 0,
    };
  }

  const stageFor = day => { let s = 0; for (const st of D.STAGES) if (day >= st.from) s = st.id; return s; };

  // Fill in names and pronouns, in the current language (role.<role>.* keys). {g:fem|masc|neutral} picks by role.
  function fmt(S, text) {
    const role = S.partner.role, g = D.ROLES[role].g, w = k => I.t('role.' + role + '.' + k);
    const cap = x => x.charAt(0).toLocaleUpperCase(I.locale()) + x.slice(1);
    // Order matters: pronouns first (a language may define one as "{P}"), then the name, then {g:...} (which may contain {P}).
    return String(text)
      .replace(/\{They\}/g, () => cap(w('they'))).replace(/\{they\}/g, () => w('they'))
      .replace(/\{them\}/g, () => w('them')).replace(/\{their\}/g, () => w('their')).replace(/\{theyre\}/g, () => w('theyre'))
      .replace(/\{role\}/g, () => w('stage' + S.stage)).replace(/\{your\}/g, () => w('your' + S.stage))
      .replace(/\{P\}/g, S.partner.name)
      .replace(/\{g:([^{}]*)\}/g, (m, alts) => { const a = alts.split('|'); return a[g] != null ? a[g] : a[a.length - 1]; });
  }
  // Look a dictionary key up and fill it in.
  const tx = (S, key, vars) => fmt(S, I.t(key, vars));

  // Draw the next card (or a microgame).
  function next(S) {
    if (S.ended) return null;
    if (S.sinceGame >= S.nextGame) {
      const pool = GAMES.filter(g => g.from <= S.stage);
      const g = pickR(pool.filter(x => x.id !== S.lastGame).length ? pool.filter(x => x.id !== S.lastGame) : pool);
      S.sinceGame = 0; S.nextGame = Math.round(rand(4, 7)); S.lastGame = g.id;
      S.cur = { game: g.id };
      return S.cur;
    }
    const ok = c => c.st[0] <= S.stage && S.stage <= c.st[1] && (!c.req || S.flags[c.req]) && (!c.not || !S.flags[c.not]);
    let pool = K.CARDS.filter(c => ok(c) && (S.seen[c.id] == null || S.n - S.seen[c.id] > 45));
    if (!pool.length) pool = K.CARDS.filter(ok);
    const card = weighted(pool, c => (c.weight || 1) * (c.st[0] === S.stage ? 2.2 : 1) * (S.seen[c.id] == null ? 1.6 : 1));
    S.cur = { id: card.id };
    return S.cur;
  }
  const cardById = id => K.CARDS.find(c => c.id === id);

  // What the meters would do: Reigns-style, you see WHICH meters move and roughly how much, not which way.
  function preview(card, side) {
    const fx = card[side][1], out = {};
    for (const k in fx) if (fx[k]) out[MK[k]] = Math.abs(fx[k]) >= 12 ? 2 : 1;
    return out;
  }

  function applyFx(S, fx) {
    const d = {};
    for (const k in fx) { const key = MK[k] || k; const before = S.m[key]; S.m[key] = clamp(S.m[key] + fx[k], 0, 100); d[key] = S.m[key] - before; }
    return d;
  }

  function checkEnd(S) {
    for (const k of ['love', 'patience', 'sanity', 'money']) {
      if (S.m[k] <= 0) return k + '0';
      if (S.m[k] >= 100) return k + '100';
    }
    if (S.day >= D.WIN_DAY) return 'golden';
    return null;
  }

  function advance(S, res) {
    S.n++; S.sinceGame++;
    const before = S.stage;
    S.day += Math.round(rand(1, 4));
    S.stage = stageFor(S.day);
    if (S.stage > before) res.stageUp = D.STAGES[S.stage];
    // A fresh get-out-of-jail card every so often (max three in hand).
    if (S.day - S.lastItemDay >= 22 && S.items.length < 3) { S.lastItemDay = S.day; const it = pickR(Object.keys(D.ITEMS)); S.items.push(it); res.item = it; }
    const end = res.ending || checkEnd(S);
    if (end) { S.ended = end; res.ending = end; }
  }

  function choose(S, side) {
    const card = cardById(S.cur && S.cur.id);
    if (!card || S.ended) return null;
    const ch = card[side];
    const deltas = applyFx(S, ch[1]);
    const res = { reply: tx(S, ch[2]), replyKey: ch[2], face: ch[3] || 'neutral', deltas };
    const x = ch[4] || {};
    if (x.set) S.flags[x.set] = true;
    if (x.risk) { const [meter, below, end] = x.risk; if (S.m[meter] < below) res.ending = end; }
    S.seen[card.id] = S.n;
    const good = (ch[1].l || 0) + (ch[1].p || 0) > 0;
    S.streak = good ? S.streak + 1 : 0; S.bestStreak = Math.max(S.bestStreak, S.streak);
    res.streak = S.streak;
    if (S.streak > 0 && S.streak % 5 === 0 && S.items.length < 3) { const it = pickR(Object.keys(D.ITEMS)); S.items.push(it); res.item = it; }
    advance(S, res);
    S.cur = null;
    return res;
  }

  // Microgame results: score 0..1.
  const GAME_FX = {
    fine: [{ l: 10, p: 8 }, { l: -12, p: -12 }],
    eat: [{ p: 10, l: 6, m: -4 }, { p: -14, m: -6 }],
    mmhmm: [{ p: 12, s: -4 }, { p: -14, l: -6 }],
    outfit: [{ l: 14 }, { l: -16, p: -6 }],
    duvet: [{ s: 10, l: 6 }, { s: -12, l: -6 }],
    thermo: [{ m: 6, p: 8 }, { m: -10, p: -10 }],
  };
  function gameResult(S, game, score) {
    if (!S.cur || S.cur.game !== game) return null;
    const [win, lose] = GAME_FX[game];
    const fx = {};
    const w = score >= 0.5;
    for (const k in (w ? win : lose)) fx[k] = Math.round((w ? win : lose)[k] * (w ? 0.6 + score * 0.6 : 1.6 - score * 1.2));
    const deltas = applyFx(S, fx);
    const res = { deltas, win: w, perfect: score >= 0.99 };
    if (w) S.gamesWon++;
    if (res.perfect && S.items.length < 3) { const it = pickR(Object.keys(D.ITEMS)); S.items.push(it); res.item = it; }
    S.streak = w ? S.streak + 1 : 0; S.bestStreak = Math.max(S.bestStreak, S.streak);
    advance(S, res);
    S.cur = null;
    return res;
  }

  function useItem(S, i) {
    const id = S.items[i]; if (!id || S.ended) return null;
    const it = D.ITEMS[id];
    S.items.splice(i, 1);
    if (it.skip) { S.cur = null; return { skip: true, item: id }; }
    return { item: id, deltas: applyFx(S, Object.fromEntries(Object.entries(it.fx).map(([k, v]) => [Object.keys(MK).find(x => MK[x] === k), v]))) };
  }

  // Record a finished run in the long-term stats.
  function finish(meta, S) {
    meta.runs++;
    meta.best = Math.max(meta.best, S.day);
    meta.bestStage = Math.max(meta.bestStage, S.stage);
    if (S.ended) meta.endings[S.ended] = (meta.endings[S.ended] || 0) + 1;
    return meta;
  }

  // ---------- microgame content ----------
  // "I'm fine" decoder: the tells point at what's really going on.
  // The words are in the dictionaries: mood.<id>.tell0-2 / .answer, place.<id>, nope.<tag>, word.good.<n>, word.trap.<n>.
  const MOODS = [
    { id: 'fine', face: 'happy', tells: 3 }, { id: 'forgot', face: 'sus', tells: 3 },
    { id: 'sad', face: 'sad', tells: 3 }, { id: 'hangry', face: 'angry', tells: 3 },
  ];
  const PLACES = [
    { id: 'pizza', tags: ['italian', 'heavy', 'cheese'] }, { id: 'sushi', tags: ['light', 'fish'] },
    { id: 'chippy', tags: ['heavy', 'chips', 'fried'] }, { id: 'curry', tags: ['spicy', 'heavy'] },
    { id: 'salad', tags: ['light', 'healthy'] }, { id: 'burger', tags: ['heavy', 'chips', 'meat'] },
    { id: 'thai', tags: ['spicy', 'light'] }, { id: 'pasta', tags: ['italian', 'heavy'] },
    { id: 'taco', tags: ['spicy', 'meat'] }, { id: 'dimsum', tags: ['light', 'steamed'] },
  ];
  // Build an "eat" round: two or three things they don't want, exactly one place that fits. Returns ids; the UI looks the words up.
  function eatRound() {
    for (let tries = 0; tries < 50; tries++) {
      const opts = PLACES.slice().sort(() => R() - 0.5).slice(0, 5);
      const target = opts[0];
      const banned = [...new Set(opts.slice(1).flatMap(p => p.tags))].filter(t => !target.tags.includes(t));
      const hints = banned.sort(() => R() - 0.5).slice(0, 3);
      const fits = opts.filter(p => !p.tags.some(t => hints.includes(t)));
      if (fits.length === 1 && fits[0] === target) return { options: opts.sort(() => R() - 0.5).map(p => p.id), answer: target.id, hints };
    }
    return { options: ['pizza', 'sushi'], answer: 'sushi', hints: ['heavy'] };
  }
  const GOOD_WORDS = [0, 1, 2, 3, 4, 5, 6, 7].map(i => 'word.good.' + i);
  const TRAP_WORDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => 'word.trap.' + i);

  function save(S, store) { try { (store || G.localStorage).setItem(SAVE, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  function load(store) { try { const s = (store || G.localStorage).getItem(SAVE); const S = s && JSON.parse(s); return S && S.v === 1 && !S.ended ? S : null; } catch (e) { return null; } }
  function wipe(store) { try { (store || G.localStorage).removeItem(SAVE); } catch (e) { /* ignore */ } }
  function saveMeta(m, store) { try { (store || G.localStorage).setItem(META, JSON.stringify(m)); } catch (e) { /* ignore */ } }
  function loadMeta(store) { try { const s = (store || G.localStorage).getItem(META); return s ? Object.assign(newMeta(), JSON.parse(s)) : newMeta(); } catch (e) { return newMeta(); } }

  G.NIF = { newRun, newMeta, next, cardById, choose, preview, gameResult, useItem, finish, fmt, tx, PLACES, stageFor, checkEnd, MOODS, eatRound, GOOD_WORDS, TRAP_WORDS, save, load, wipe, saveMeta, loadMeta, GAMES, setRandom: f => { R = f; } };
})(typeof window !== 'undefined' ? window : globalThis);
