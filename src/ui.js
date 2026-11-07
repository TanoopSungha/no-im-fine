// No, I'm Fine.: screens, the card table, microgames and input.
(function () {
  'use strict';
  const D = window.NIF_DATA, K = window.NIF_CARDS, E = window.NIF, A = window.NIF_ART, AU = window.NIF_AUDIO, I = window.I18N;
  const t_ = I.t, tp = I.tp, N = v => I.num(v);
  const FONT = 'Fredoka, ' + I.FONT_FALLBACK;
  const $ = s => document.querySelector(s);
  const stage = $('#stage'), cv = $('#scene'), c = cv.getContext('2d');
  const hud = $('#hud'), play = $('#play'), screen = $('#screen'), toasts = $('#toasts');
  const W = 1280, H = 720;
  const CW = 340, CH = 400, CX = (W - CW) / 2, CY = 178;
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  if (document.fonts) { document.fonts.load('700 20px Fredoka'); document.fonts.load('20px "Luckiest Guy"'); }

  let S = null, meta = E.loadMeta(), mode = 'title', view = 'title', t = 0, last = performance.now();
  let replyView = null, stageShown = null, endShown = null, langOpen = false;
  let pick = { partner: 'jess', role: 'girlfriend' };
  let cardV = { x: 0, rot: 0, scale: 1, tx: 0, trot: 0, tscale: 1, flip: 1 };
  let drag = null, lean = null, face = 'talk', replyTimer = null, mg = null, pending = null, beatPulse = 0;
  AU.onBeat = v => { beatPulse = Math.max(beatPulse, v || 0.7); };

  function fit() { const s = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `scale(${s})`; }
  addEventListener('resize', fit); fit();
  function toast(html, cls) { const d = document.createElement('div'); d.className = 'toast ' + (cls || ''); d.innerHTML = html; toasts.appendChild(d); setTimeout(() => d.remove(), 2900); }
  const fmt = s => S ? E.fmt(S, s) : s;
  const tx = (key, vars) => (S ? E.tx(S, key, vars) : t_(key, vars));
  const ex = key => esc(tx(key));
  const partnerDef = () => D.PARTNERS.find(p => p.id === S.partner.id);
  function speakerOf(who) {
    if (who === 'p') { const P = partnerDef(); return { id: P.id, look: P.look, tint: P.tint, name: tx('speaker.partner', { name: P.name, your: tx('role.' + S.partner.role + '.your' + S.stage) }) }; }
    const cst = D.CAST[who]; return { id: who, look: cst.look, tint: cst.tint, name: tx('cast.' + who), cat: cst.cat };
  }
  function portrait(look, w, h, f, opts) {
    const p = document.createElement('canvas'); p.width = w * 2; p.height = h * 2; const pc = p.getContext('2d'); pc.scale(2, 2);
    if (opts && opts.bg) { pc.fillStyle = opts.bg; pc.fillRect(0, 0, w, h); }
    A.person(pc, look, w / 2, h * ((opts && opts.full) ? 1.0 : 1.66), h / ((opts && opts.full) ? 270 : 162), { face: f || 'happy', t: 0, arm: (opts && opts.arm) || 'idle' });
    return p;
  }
  function music() { if (!S) return; AU.play({ id: 'stage' + S.stage, genre: D.STAGE_MUSIC[S.stage], seed: 900 + S.stage * 77 }); }

  // ---------- intro (same Snoopster video as the other games) ----------
  let introDone = null, introTimer = null;
  function endIntro() {
    clearTimeout(introTimer);
    document.removeEventListener('keydown', endIntro, true); document.removeEventListener('pointerdown', endIntro, true);
    const el = $('#intro .intro'); if (el) { el.classList.add('fadeout'); const v = el.querySelector('video'); if (v) v.pause(); setTimeout(() => { $('#intro').innerHTML = ''; }, 450); }
    if (introDone) { const f = introDone; introDone = null; f(); }
  }
  function playIntro(done) {
    introDone = done;
    $('#intro').innerHTML = `<div class="intro"><video src="assets/intro.mp4" autoplay playsinline></video><div class="skip">${esc(t_('intro.skip'))}</div></div>`;
    const v = $('#intro video');
    v.addEventListener('ended', endIntro); v.addEventListener('error', endIntro);
    const p = v.play(); if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(endIntro); });
    setTimeout(() => { document.addEventListener('keydown', endIntro, true); document.addEventListener('pointerdown', endIntro, true); }, 300);
    introTimer = setTimeout(endIntro, 15000);
  }

  // ---------- language picker (title screen and the 🌐 button in the HUD) ----------
  function langPicker(extra) {
    const cur = I.getLang();
    return `<div class="langs ${extra || ''}" role="radiogroup" aria-label="${esc(t_('lang.choose'))}">${I.LANGS.map(l => `<button class="small ${l.code === cur ? 'on' : 'ghost'}" role="radio" aria-checked="${l.code === cur}" tabindex="${l.code === cur ? 0 : -1}" lang="${l.code}" data-lang="${l.code}">${l.code === cur ? '✓ ' : ''}${esc(l.label)}</button>`).join('')}</div>`;
  }
  function langMenu() {
    const old = hud.querySelector('.langpop'); if (old) old.remove();
    if (!langOpen || !hud.firstChild) return;
    const d = document.createElement('div'); d.className = 'langpop'; d.innerHTML = `<div class="lp-h">🌐 ${esc(t_('lang.label'))}</div>${langPicker('stack')}`;
    hud.appendChild(d);
    const on = d.querySelector('[aria-checked="true"]'); if (on) on.focus();
  }

  // ---------- title, partner pick, help, album ----------
  function showTitle() {
    mode = 'title'; view = 'title'; hud.innerHTML = ''; play.innerHTML = ''; langOpen = false;
    const saved = E.load();
    screen.innerHTML = `<div class="panel" style="background:rgba(26,6,20,.35)">
      <div class="logo"><div class="t1" lang="en">NO, I'M <em>FINE.</em></div><div class="sub">${esc(t_('title.sub'))}</div></div>
      <div class="row" style="margin-top:10px">
        ${saved ? `<button class="green" data-a="continue">${esc(t_('title.continue', { name: saved.partner.name, day: N(saved.day) }))}</button>` : ''}
        <button class="pink" data-a="pick">${esc(t_(saved ? 'title.startNew' : 'title.start'))}</button>
        <button class="ghost" data-a="album">${esc(t_('title.album', { found: N(Object.keys(meta.endings).length), total: N(Object.keys(D.ENDINGS).length) }))}</button>
        <button class="ghost" data-a="how">${esc(t_('title.how'))}</button>
      </div>
      <div class="langrow"><span class="ll">🌐 ${esc(t_('lang.label'))}</span>${langPicker()}</div>
      ${meta.best ? `<div class="credit">${tp('title.best', meta.best)}</div>` : ''}
      <div class="credit">${t_('title.credit')} · <a href="#" data-a="intro">${esc(t_('title.replay'))}</a></div></div>`;
  }

  function showPick() {
    mode = 'pick'; view = 'pick';
    screen.innerHTML = `<div class="panel">
      <div class="head"><h2>${esc(t_('pick.head'))}</h2><p>${esc(t_('pick.sub'))}</p></div>
      <div class="partners">${D.PARTNERS.map(p => `<div class="pcard ${pick.partner === p.id ? 'on' : ''}" data-partner="${p.id}" role="button" tabindex="0"><div class="pic"></div><b>${p.name}</b><p>${esc(t_('partner.' + p.id + '.bio'))}</p></div>`).join('')}</div>
      <div class="row roles"><span style="color:var(--cream)">${esc(t_('pick.roleIntro'))}</span>${Object.keys(D.ROLES).map(r => `<button class="small ${pick.role === r ? 'on' : 'ghost'}" data-role="${r}">${esc(t_('role.' + r + '.pick'))}</button>`).join('')}</div>
      <div class="row"><button class="ghost" data-a="back">${esc(t_('pick.back'))}</button><button class="pink" data-a="start">${esc(t_('pick.go'))}</button></div></div>`;
    for (const el of screen.querySelectorAll('[data-partner]')) { const P = D.PARTNERS.find(p => p.id === el.dataset.partner); el.querySelector('.pic').appendChild(portrait(P.look, 150, 180, pick.partner === P.id ? 'love' : 'happy', { bg: P.tint, arm: pick.partner === P.id ? 'wave' : 'idle' })); }
  }

  function showHow() {
    view = 'how';
    screen.innerHTML = `<div class="panel"><div class="card howto"><h2>${esc(t_('how.head'))}</h2><ul>
      ${[1, 2, 3, 4, 5, 6, 7].map(n => `<li>${t_('how.' + n)}</li>`).join('')}</ul>
      <div class="row"><button data-a="back">${esc(t_('how.ok'))}</button></div></div></div>`;
  }

  function showAlbum() {
    view = 'album';
    screen.innerHTML = `<div class="panel"><div class="head"><h2>${esc(t_('album.head'))}</h2><p>${esc(t_('album.sub', { found: N(Object.keys(meta.endings).length), total: N(Object.keys(D.ENDINGS).length) }))}</p></div>
      <div class="album">${Object.entries(D.ENDINGS).map(([k, e]) => meta.endings[k] ? `<div class="e"><div class="i">${e.icon}</div><b>${esc(t_('ending.' + k + '.title'))}</b><small>${esc(t_('album.count', { n: N(meta.endings[k]) }))}</small></div>` : `<div class="e lock"><div class="i">❓</div><b>???</b><small>${esc(t_('album.locked'))}</small></div>`).join('')}</div>
      <div class="row"><button data-a="back">${esc(t_('back'))}</button></div></div>`;
  }

  // ---------- the card table ----------
  function buildHud() {
    hud.innerHTML = `<div class="meters">${D.METERS.map(m => `<div class="meter" data-m="${m.id}" title="${ex('meter.' + m.id)}"><div class="dot"></div><div class="jar"><div class="fill" style="background:${m.col}"></div><div class="ic">${m.icon}</div><div class="pct">${I.pct(50)}</div></div><div class="lbl">${ex('meter.' + m.id)}</div></div>`).join('')}</div>
      <div class="chip daychip"><b>${esc(t_('hud.day', { n: N(S.day) }))}</b><small>${esc(t_('stage.' + S.stage + '.name'))}</small></div>
      <div class="chip vibechip" id="vibeChip"></div>
      <div class="items"></div><div class="streak" style="display:none"></div>
      <div class="timeline">${D.STAGES.map((st, i) => `<div class="tl-stop ${i % 2 ? 'up' : ''}" style="left:${st.from / D.WIN_DAY * 100}%"><i></i><span>${esc(t_('stage.' + st.id + '.name'))}</span></div>`).join('')}<div class="tl-stop" style="left:100%"><i></i><span>${esc(t_('hud.forever'))}</span></div><div class="tl-fill"></div><div class="tl-heart">❤️</div></div>
      <button class="small ghost langbtn" data-a="lang" title="${esc(t_('lang.label'))}" aria-label="${esc(t_('lang.label'))}" aria-expanded="${langOpen}">🌐</button>
      <button class="small ghost mute" data-a="mute" title="${esc(t_('hud.mute'))}" aria-label="${esc(t_('hud.mute'))}">${AU.muted ? '🔇' : '🔊'}</button>`;
    updateHud(); langMenu();
  }
  function vibeStatus() {
    if (!S) return { icon: '✨', key: 'sweet', cls: 'good' };
    const m = S.m;
    if (m.patience < 22) return { icon: '💣', key: 'eggshells', cls: 'danger' };
    if (m.sanity < 22) return { icon: '🌀', key: 'spiral', cls: 'danger' };
    if (m.love < 22) return { icon: '🧊', key: 'frosty', cls: 'danger' };
    if (m.money < 22) return { icon: '💸', key: 'declined', cls: 'danger' };
    if (m.love > 80) return { icon: '🥺', key: 'clingy', cls: 'warn' };
    if (m.patience > 80) return { icon: '😇', key: 'saintly', cls: 'warn' };
    if (m.sanity > 80) return { icon: '🧘', key: 'zen', cls: 'warn' };
    if (m.money > 80) return { icon: '🪙', key: 'spender', cls: 'warn' };
    if (S.streak >= 4) return { icon: '🔥', key: 'goals', cls: 'hot' };
    return { icon: '💖', key: 'cosy', cls: 'good' };
  }
  function updateHud() {
    if (!S || !hud.firstChild) return;
    for (const m of D.METERS) {
      const el = hud.querySelector(`[data-m="${m.id}"]`); if (!el) continue;
      const v = Math.round(S.m[m.id]);
      el.querySelector('.fill').style.height = v + '%';
      const pctEl = el.querySelector('.pct'); if (pctEl) pctEl.textContent = I.pct(v);
      el.classList.toggle('danger', v < 18 || v > 82);
    }
    const dc = hud.querySelector('.daychip'); if (dc) dc.innerHTML = `<b>${esc(t_('hud.day', { n: N(S.day) }))}</b><small>${esc(t_('hud.daySub', { stage: t_('stage.' + S.stage + '.name'), role: t_('role.' + S.partner.role + '.stage' + S.stage), name: S.partner.name }))}</small>`;
    const vc = hud.querySelector('#vibeChip');
    if (vc) { const vb = vibeStatus(); vc.className = 'chip vibechip ' + vb.cls; vc.innerHTML = `<span>${vb.icon}</span> <b>${esc(t_('vibe.' + vb.key))}</b>`; }
    const tl = hud.querySelector('.timeline'); if (tl) { const k = Math.min(100, S.day / D.WIN_DAY * 100); tl.querySelector('.tl-fill').style.width = k + '%'; tl.querySelector('.tl-heart').style.left = k + '%'; }
    const its = hud.querySelector('.items'); if (its) its.innerHTML = [0, 1, 2].map(i => S.items[i] ? `<button class="it" data-item="${i}" title="${esc(itemTip(i))}" aria-label="${esc(itemTip(i))}">${D.ITEMS[S.items[i]].icon}</button>` : '<div class="it empty"></div>').join('');
    const st = hud.querySelector('.streak'); if (st) { st.style.display = S.streak >= 3 ? '' : 'none'; st.textContent = t_('hud.streak', { n: N(S.streak) }); }
  }
  const itemName = id => `${D.ITEMS[id].icon} ${t_('item.' + id + '.name')}`;
  function itemTip(i) { const id = S.items[i]; return t_('hud.item', { name: t_('item.' + id + '.name'), n: N(i + 1), desc: t_('item.' + id + '.desc') }); }
  function showDots(prev) { for (const m of D.METERS) { const d = hud.querySelector(`[data-m="${m.id}"] .dot`); if (d) d.className = 'dot' + (prev && prev[m.id] ? ' s' + prev[m.id] : ''); } }
  function showDeltas(deltas) {
    for (const k in deltas) { const v = deltas[k]; if (!v) continue; const el = hud.querySelector(`[data-m="${k}"]`); if (!el) continue; const d = document.createElement('div'); d.className = 'delta ' + (v > 0 ? 'up' : 'down'); d.textContent = v > 0 ? '▲' : '▼'; el.appendChild(d); setTimeout(() => d.remove(), 1300); }
    updateHud();
  }

  function startRun() {
    S = E.newRun(pick.partner, pick.role); E.save(S);
    screen.innerHTML = ''; buildHud(); music();
    toast(t_('run.day1', { name: esc(S.partner.name) }), 'pink');
    nextCard();
  }
  function resume() { S = E.load(); if (!S) return showTitle(); screen.innerHTML = ''; buildHud(); music(); if (S.cur && S.cur.id) showCard(); else nextCard(); }

  function nextCard() {
    play.innerHTML = ''; showDots(null);
    const cur = E.next(S); E.save(S);
    if (!cur) return;
    if (cur.game) return startGame(cur.game);
    cardV = { x: 0, rot: 0, scale: 0.6, tx: 0, trot: 0, tscale: 1, flip: 0 };
    AU.sfx('flip');
    showCard();
  }

  function showCard() {
    mode = 'card';
    const card = E.cardById(S.cur.id), sp = speakerOf(card.who);
    const dur = AU.speak(tx(card.text), { id: sp.id, mood: 'talk' });
    face = 'talk'; setTimeout(() => { if (mode === 'card') face = 'neutral'; }, Math.max(900, dur * 1000));
    renderCard();
  }
  function renderCard() {
    const card = E.cardById(S.cur.id);
    play.innerHTML = `<div class="question">${esc(t_('quote', { q: tx(card.text) }))}</div>
      <button class="choice l" data-side="L"><span class="arr">${esc(t_('card.swipeL'))}</span>${ex(card.L[0])}</button>
      <button class="choice r" data-side="R"><span class="arr">${esc(t_('card.swipeR'))}</span>${ex(card.R[0])}</button>`;
    for (const b of play.querySelectorAll('.choice')) {
      b.addEventListener('pointerenter', () => { lean = b.dataset.side; showDots(E.preview(card, lean)); b.classList.add('lean'); });
      b.addEventListener('pointerleave', () => { if (!drag) { lean = null; showDots(null); } b.classList.remove('lean'); });
    }
  }

  function choose(side) {
    if (mode !== 'card') return;
    AU.init();
    const card = E.cardById(S.cur.id), sp = speakerOf(card.who);
    mode = 'reply';
    const res = E.choose(S, side);
    if (!res) return;
    E.save(S);
    showDots(null); drag = null; lean = null;
    face = res.face; cardV.tx = 0; cardV.trot = 0; burst(res.face); cardV.scale = 1.06;
    const good = res.face === 'love' || res.face === 'joy' || res.face === 'happy' || res.face === 'smug';
    AU.sfx(good ? (res.face === 'love' ? 'heart' : 'pop') : res.face === 'angry' ? 'fail' : 'click');
    AU.speak(res.reply, { id: sp.id, mood: res.face });
    replyView = () => { play.innerHTML = `<div class="reply">${ex(res.replyKey)}<small>${esc(t_('reply.tap'))}</small></div>`; };
    replyView();
    showDeltas(res.deltas);
    if (res.item) toast(t_('bonus.streak', { item: esc(itemName(res.item)) }), 'gold');
    pending = res;
    clearTimeout(replyTimer); replyTimer = setTimeout(afterReply, 2600);
  }

  function afterReply() {
    if (mode !== 'reply' && mode !== 'gameover') return;
    clearTimeout(replyTimer);
    const res = pending; pending = null;
    if (!res) return;
    cardV.tx = (Math.random() < 0.5 ? -1 : 1) * 900; cardV.trot = cardV.tx / 1500;
    if (res.ending) return setTimeout(() => showEnding(res.ending), 350);
    if (res.stageUp) return setTimeout(() => showStage(res.stageUp), 350);
    setTimeout(nextCard, 280);
  }

  function showStage(st) {
    mode = 'stage'; play.innerHTML = ''; stageShown = st;
    AU.sfx('level'); music(); buildHud();
    renderStage();
  }
  function renderStage() {
    const st = stageShown;
    screen.innerHTML = `<div class="panel stageup" data-a="stagego"><div class="small">${esc(tp('stage.together', S.day))}</div><div class="big">${esc(t_('stage.' + st.id + '.name'))}</div><div class="small">${esc(t_('stage.' + st.id + '.blurb'))}</div><div class="small" style="font-size:15px;opacity:.8;margin-top:20px">${esc(t_('stage.tap'))}</div></div>`;
  }

  function showEnding(key) {
    mode = 'end'; play.innerHTML = ''; showDots(null);
    const e = D.ENDINGS[key], isNew = !meta.endings[key];
    meta = E.finish(meta, S); E.saveMeta(meta); E.wipe();
    AU.sfx(key === 'golden' ? 'legend' : 'fail'); AU.stop();
    const P = partnerDef();
    AU.speak(tx('ending.' + key + '.text'), { id: P.id, mood: key === 'golden' ? 'joy' : 'sad' });
    face = key === 'golden' ? 'love' : 'angry';
    if (key === 'golden') for (let i = 0; i < 80; i++) parts.push({ x: Math.random() * W, y: -20 - Math.random() * 300, vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 120, life: 6, e: ['❤️', '🎉', '✨', '💐'][i % 4], s: 22 + Math.random() * 20 });
    endShown = { key, isNew };
    renderEnding();
  }
  function renderEnding() {
    const { key, isNew } = endShown, e = D.ENDINGS[key], P = partnerDef();
    screen.innerHTML = `<div class="panel"><div class="card ending" style="display:flex;gap:22px;align-items:center;max-width:900px;text-align:left"><div id="endPic"></div><div><div class="ic">${e.icon}</div><h2>${ex('ending.' + key + '.title')}</h2>${isNew ? `<div style="color:var(--hot);font-weight:700">${esc(t_('end.new'))}</div>` : ''}
      <p>${ex('ending.' + key + '.text')}</p>
      <div class="stats"><div><b>${N(S.day)}</b>${esc(tp('end.days', S.day))}</div><div><b>${esc(t_('stage.' + S.stage + '.name'))}</b>${esc(t_('end.stage'))}</div><div><b>${N(S.bestStreak)}</b>${esc(t_('end.streak'))}</div><div><b>${N(Object.keys(meta.endings).length)}/${N(Object.keys(D.ENDINGS).length)}</b>${esc(t_('end.endings'))}</div></div>
      ${S.day >= meta.best && meta.runs > 1 ? `<div style="font-weight:700">${esc(t_('end.best'))}</div>` : `<div>${esc(tp('end.record', meta.best))}</div>`}
      <div class="row" style="margin-top:12px"><button class="pink" data-a="again">${esc(t_('end.again', { name: S.partner.name }))}</button><button class="ghost" data-a="pick">${esc(t_('end.someone'))}</button><button class="ghost" data-a="title">${esc(t_('end.menu'))}</button></div></div></div></div>`;
    $('#endPic').appendChild(Object.assign(portrait(P.look, 230, 300, key === 'golden' ? 'love' : key.startsWith('love1') ? 'love' : 'angry', { bg: P.tint, full: true, arm: key === 'golden' ? 'wave' : 'cross' }), { style: 'width:230px;height:300px;border-radius:22px;border:4px solid #2a1a24;flex:none' }));
  }

  // ---------- microgames ----------
  function startGame(id) {
    mode = 'game'; play.innerHTML = '';
    const g = K.GAME_CARDS[id], P = partnerDef();
    const box = document.createElement('div'); box.className = 'mg'; play.appendChild(box);
    box.innerHTML = `<div class="title">${ex('game.' + id + '.title')}</div><div class="sub">${ex(g.intro)}</div><button class="pink big" id="mgGo">${esc(t_('mg.go'))}</button>`;
    AU.sfx('alarm');
    $('#mgGo').onclick = () => { AU.init(); GAMES[id](box, P); };
  }
  function endGame(id, score) {
    if (!mg) return; mg = null;
    const res = E.gameResult(S, id, Math.max(0, Math.min(1, score)));
    E.save(S);
    const box = play.querySelector('.mg');
    const win = res.win, P = partnerDef();
    AU.sfx(win ? (res.perfect ? 'legend' : 'level') : 'fail');
    const lineKey = pickLine(win ? WIN_LINES : LOSE_LINES);
    AU.speak(tx(lineKey), { id: P.id, mood: win ? 'joy' : 'cross' });
    face = win ? 'love' : 'cross';
    replyView = () => { const b = play.querySelector('.mg'); if (b) b.innerHTML = `<div class="result ${win ? 'win' : 'lose'}">${esc(t_(res.perfect ? 'mg.perfect' : win ? 'mg.won' : 'mg.lost'))}</div><div class="sub">${ex(lineKey)}</div>${res.item ? `<div class="sub">${esc(t_('mg.earned', { item: itemName(res.item) }))}</div>` : ''}<div class="sub" style="font-size:14px;opacity:.8">${esc(t_('mg.tap'))}</div>`; };
    if (box) replyView();
    showDeltas(res.deltas);
    mode = 'reply'; pending = res;
    clearTimeout(replyTimer); replyTimer = setTimeout(afterReply, 2400);
  }
  const WIN_LINES = [0, 1, 2, 3].map(i => 'mg.win.' + i), LOSE_LINES = [0, 1, 2, 3].map(i => 'mg.lose.' + i);
  const pickLine = a => a[Math.floor(Math.random() * a.length)];
  function timerBar(box) { const t = document.createElement('div'); t.className = 'timer'; t.innerHTML = '<i></i>'; box.prepend(t); return t.firstChild; }

  const GAMES = {
    fine(box, P) {
      const mood = E.MOODS[Math.floor(Math.random() * E.MOODS.length)];
      const tells = [0, 1, 2].slice(0, mood.tells).sort(() => Math.random() - 0.5).slice(0, 2);
      const answers = E.MOODS.map(m => m.id).sort(() => Math.random() - 0.5);
      AU.speak(tx('mg.fine.say'), { id: P.id, mood: mood.face });
      box.innerHTML = `<div class="title">${ex('game.fine.title')}</div><div class="body"><div id="por"></div><div><div class="tells">${tx('mg.fine.notice', { a: esc(tx('mood.' + mood.id + '.tell' + tells[0])), b: esc(tx('mood.' + mood.id + '.tell' + tells[1])) })}</div><div class="opts" style="margin-top:14px">${answers.map(a => `<button class="ghost" data-ans="${a}">${ex('mood.' + a + '.answer')}</button>`).join('')}</div></div></div>`;
      box.querySelector('#por').appendChild(Object.assign(portrait(P.look, 220, 260, mood.face, { bg: P.tint, arm: mood.face === 'cross' ? 'cross' : mood.face === 'sad' ? 'facepalm' : 'shrug' }), { className: 'por' }));
      const bar = timerBar(box);
      mg = { id: 'fine', t: 0, len: 6, bar, tick() {}, timeout() { endGame('fine', 0); } };
      box.querySelectorAll('[data-ans]').forEach(b => b.onclick = () => endGame('fine', b.dataset.ans === mood.id ? 1 : 0.1));
    },
    eat(box, P) {
      const round = E.eatRound();
      const say0 = esc(t_('quote', { q: tx('mg.eat.say') }));
      AU.speak(tx('mg.eat.say'), { id: P.id, mood: 'smug' });
      box.innerHTML = `<div class="title">${ex('game.eat.title')}</div><div class="body"><div id="por"></div><div><div class="speech" id="eatSay">${say0}</div><div class="opts three" style="margin-top:14px;width:600px">${round.options.map(o => `<button class="ghost" data-place="${o}">${ex('place.' + o)}</button>`).join('')}</div></div></div>`;
      box.querySelector('#por').appendChild(Object.assign(portrait(P.look, 220, 260, 'smug', { bg: P.tint, arm: 'shrug' }), { className: 'por' }));
      const bar = timerBar(box), say = box.querySelector('#eatSay');
      let shown = 0;
      mg = { id: 'eat', t: 0, len: 11, bar, tick() { const k = Math.min(round.hints.length, Math.floor((this.t - 0.6) / 1.4) + 1); if (k > shown) { shown = k; say.innerHTML = say0 + '<br>' + round.hints.slice(0, k).map(h => esc(t_('quote', { q: tx('nope.' + h) }))).join('<br>'); AU.speak(tx('nope.' + round.hints[k - 1]), { id: P.id, mood: 'meh' }); } }, timeout() { endGame('eat', 0); } };
      box.querySelectorAll('[data-place]').forEach(b => b.onclick = () => endGame('eat', b.dataset.place === round.answer ? (shown >= round.hints.length ? 1 : 0.8) : 0.1));
    },
    mmhmm(box, P) {
      // Chinese has no spaces, so it is revealed a character at a time; the speed always fits the story into the round.
      const storyText = tx('mg.mmhmm.story'), noSpaces = !/\s/.test(storyText.trim());
      const story = noSpaces ? Array.from(storyText) : storyText.split(/\s+/), joiner = noSpaces ? '' : ' ';
      const rate = story.length / 12.5, windowLen = noSpaces ? 30 : 14;
      box.innerHTML = `<div class="title">${ex('game.mmhmm.title')}</div><div class="body"><div id="por"></div><div style="width:620px"><div class="story" id="story"></div><div class="look" id="look"></div><button class="pink big" id="mm">${ex('mg.mmhmm.btn')}</button></div></div>`;
      const por = box.querySelector('#por'); const draw = f => { por.innerHTML = ''; por.appendChild(Object.assign(portrait(P.look, 220, 260, f, { bg: P.tint, arm: f === 'sus' ? 'cross' : 'wave' }), { className: 'por' })); };
      draw('talk');
      AU.speak(tx('mg.mmhmm.say'), { id: P.id, mood: 'talk' });
      const bar = timerBar(box), st = box.querySelector('#story'), look = box.querySelector('#look');
      const times = [2.2, 4.6, 7.3, 9.6].map(x => x + Math.random() * 0.6);
      let hits = 0, wrong = 0, open = -1;
      mg = { id: 'mmhmm', t: 0, len: 12, bar, tick() {
        st.textContent = story.slice(Math.max(0, Math.floor(this.t * rate) - windowLen), Math.floor(this.t * rate)).join(joiner);
        const o = times.findIndex(x => this.t >= x && this.t < x + 1.15);
        if (o !== open) { open = o; if (o >= 0) { look.textContent = tx('mg.mmhmm.right'); draw('sus'); AU.speak(tx('mg.mmhmm.rightSay'), { id: P.id, mood: 'sus' }); } else { look.textContent = ''; draw('talk'); } }
      }, timeout() { endGame('mmhmm', Math.max(0, (hits - wrong) / times.length)); } };
      const done = new Set();
      box.querySelector('#mm').onclick = () => { if (open >= 0 && !done.has(open)) { done.add(open); hits++; AU.speak(tx('mg.mmhmm.yes'), { id: 'you', mood: 'happy' }); look.textContent = '✓'; } else { wrong++; AU.sfx('fail'); look.textContent = tx('mg.mmhmm.why'); } };
    },
    outfit(box, P) {
      const look = Object.assign({}, P.look, { col: ['#ff5fa2', '#39d0b8', '#f2a93b', '#b14bff', '#e5483b'][Math.floor(Math.random() * 5)], top: ['sequin', 'shirt', 'suit', 'cardigan'][Math.floor(Math.random() * 4)] });
      AU.speak(tx('mg.outfit.say'), { id: P.id, mood: 'smug' });
      box.innerHTML = `<div class="title">${ex('game.outfit.title')}</div><div class="body"><div id="por"></div><div style="width:560px"><div class="tells">${tx('mg.outfit.rules')}</div><div class="opts three" id="words" style="margin-top:14px;width:560px"></div><div class="look" id="got"></div></div></div>`;
      box.querySelector('#por').appendChild(Object.assign(portrait(look, 220, 260, 'smug', { bg: P.tint, arm: 'wave', full: true }), { className: 'por' }));
      const bar = timerBar(box), words = box.querySelector('#words'), got = box.querySelector('#got');
      let good = 0, next = 0;
      const deal = () => { words.innerHTML = [0, 1, 2].map(() => { const ok = Math.random() < 0.45; const w = ok ? E.GOOD_WORDS[Math.floor(Math.random() * E.GOOD_WORDS.length)] : E.TRAP_WORDS[Math.floor(Math.random() * E.TRAP_WORDS.length)]; return `<button class="ghost word" data-ok="${ok ? 1 : 0}">${ex(w)}</button>`; }).join(''); };
      deal();
      mg = { id: 'outfit', t: 0, len: 9, bar, tick() { if (this.t > next) { next = this.t + 1.1; deal(); } }, timeout() { endGame('outfit', good / 4); } };
      words.onclick = ev => { const b = ev.target.closest('[data-ok]'); if (!b || !mg) return; if (b.dataset.ok === '1') { good++; AU.sfx('heart'); got.textContent = '❤'.repeat(good); b.disabled = true; if (good >= 4) endGame('outfit', 1); } else { AU.sfx('fail'); const trap = t_('quote', { q: t_('mg.outfit.trap', { word: b.textContent }) }); got.textContent = trap; AU.speak(trap, { id: P.id, mood: 'angry' }); setTimeout(() => endGame('outfit', 0.1), 500); mg.len = 99; } };
    },
    duvet(box, P) {
      box.innerHTML = `<div class="title">${ex('game.duvet.title')}</div><div class="tells">${tx('mg.duvet.rules')}</div>
        <div class="labels"><span>${ex('mg.duvet.you')}</span><span>${esc(tx('mg.duvet.them', { name: P.name }))}</span></div><div class="bar"><div class="zone" style="left:38%;width:26%"></div><div class="duv" id="duv"></div></div><button class="pink big" id="tug">${ex('mg.duvet.tug')}</button>`;
      const bar = timerBar(box), duv = box.querySelector('#duv');
      let share = 50, inZone = 0;
      mg = { id: 'duvet', t: 0, len: 9, bar, tick(dt) { const pull = 9 + 22 * (Math.sin(this.t * 2.3) > 0.55 ? 1 : 0) + this.t * 1.5; share = Math.max(0, Math.min(100, share - pull * dt)); duv.style.width = share + '%'; if (share >= 38 && share <= 64) inZone += dt; }, timeout() { endGame('duvet', Math.min(1, inZone / (this.len * 0.75))); }, key() { share = Math.min(100, share + 6); AU.sfx('click'); } };
      box.querySelector('#tug').onclick = () => mg && mg.key();
    },
    thermo(box, P) {
      const deg = v => t_('mg.thermo.deg', { n: I.num(v, { minimumFractionDigits: v % 1 ? 1 : 0, maximumFractionDigits: 1 }) });
      box.innerHTML = `<div class="title">${ex('game.thermo.title')}</div><div class="tells">${ex('mg.thermo.rules')}</div>
        <div class="labels"><span>❄ ${esc(deg(15))}</span><span id="temp">${esc(deg(20))}</span><span>🔥 ${esc(deg(25))}</span></div><div class="bar" style="background:linear-gradient(90deg,#9fd2ff,#fff,#ff9a7a)"><div class="zone" id="zone"></div><div class="need" id="need"></div></div><input type="range" min="15" max="25" step="0.1" value="20" id="dial">`;
      const bar = timerBar(box), need = box.querySelector('#need'), zone = box.querySelector('#zone'), dial = box.querySelector('#dial'), temp = box.querySelector('#temp');
      let inZone = 0;
      mg = { id: 'thermo', t: 0, len: 10, bar, tick(dt) { const want = 20 + 3.2 * Math.sin(this.t * 0.9) + 1.3 * Math.sin(this.t * 2.3 + 1); const x = (want - 15) * 10; need.style.left = x + '%'; zone.style.left = (x - 8) + '%'; zone.style.width = '16%'; const v = +dial.value; temp.textContent = t_('mg.thermo.deg', { n: I.num(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }); if (Math.abs(v - want) <= 0.8) inZone += dt; }, timeout() { endGame('thermo', Math.min(1, inZone / (this.len * 0.7))); } };
    },
  };

  // ---------- drawing ----------
  function draw(dt) {
    c.clearRect(0, 0, W, H);
    const roomIx = S ? S.stage : 0;
    c.drawImage(A.room(W, H, roomIx), 0, 0);
    if (A.roomFx) A.roomFx(c, W, H, roomIx, t);
    beatPulse = Math.max(0, beatPulse - dt * 4.5);
    if (mode === 'title' || mode === 'pick' || mode === 'end') {
      c.fillStyle = 'rgba(30,6,24,.3)'; c.fillRect(0, 0, W, H);
      if (mode === 'title') {
        const L = D.PARTNERS[Math.floor(t / 4) % 6], Rr = D.PARTNERS[(Math.floor(t / 4) + 3) % 6];
        A.person(c, L.look, 190, 800, 1.9, { face: (t % 4) < 2 ? 'sus' : 'smug', arm: 'cross', t, blink: (t % 3.3) < 0.12, groove: beatPulse * 0.4 });
        A.person(c, Rr.look, 1090, 800, 1.9, { face: (t % 2.4) < 1.2 ? 'wow' : 'meh', arm: (t % 2.4) < 1.2 ? 'shrug' : 'think', t, blink: (t % 2.9) < 0.12, groove: beatPulse * 0.4 });
        { c.font = '700 34px ' + FONT; const bw = c.measureText(t_('title.bubble')).width + 40; bubble(c, Math.max(24 + bw / 2, Math.min(250, 282 - bw / 2)), 306, t_('title.bubble'), 1 + Math.sin(t * 3) * 0.03); } // kept clear of the logo and subtitle in every language
        c.font = '900 54px ' + FONT; c.fillStyle = '#fff'; c.strokeStyle = '#2a1a24'; c.lineWidth = 6; c.textAlign = 'center';
        const q = (t % 2.4) < 1.2 ? '?!' : '...'; c.strokeText(q, 1170, 300 + Math.sin(t * 4) * 6); c.fillText(q, 1170, 300 + Math.sin(t * 4) * 6);
        c.fillStyle = '#7fc8ff'; for (let i = 0; i < 2; i++) { const yy = 350 + ((t * 60 + i * 30) % 60); c.beginPath(); c.ellipse(1010 + i * 150, yy, 6, 9, 0, 0, Math.PI * 2); c.fill(); }
        // floating hearts
        for (let i = 0; i < 8; i++) { const y = (H + 40) - ((t * 30 + i * 97) % (H + 80)); c.globalAlpha = 0.35; c.fillStyle = '#ff5fa2'; c.font = (20 + i * 4) + 'px ' + I.FONT_FALLBACK; c.fillText('♥', 80 + i * 150, y); }
        c.globalAlpha = 1;
      }
      return;
    }
    if (!S) return;
    if (mode === 'game') return;
    // the deck behind
    for (let i = 2; i >= 1; i--) A.cardBack(c, CX + i * 5, CY + i * 6, CW, CH, t);
    if (mode === 'card' || mode === 'reply' || mode === 'gameover') {
      const k = Math.min(1, dt * 12);
      cardV.x += ((drag ? drag.dx : cardV.tx) - cardV.x) * k;
      cardV.rot += ((drag ? drag.dx / 900 : cardV.trot) - cardV.rot) * k;
      cardV.scale += (cardV.tscale - cardV.scale) * k;
      const card = S.cur && S.cur.id ? E.cardById(S.cur.id) : null;
      const shown = card || lastCard;
      if (shown) {
        const spk = speakerOf(shown.who);
        const curFace = AU.isSpeaking && AU.isSpeaking() ? 'talk' : (mode === 'card' ? (drag && Math.abs(drag.dx) > 60 ? (drag.dx < 0 ? 'sus' : 'wow') : face) : face);
        const badgeText = mode === 'card' && lean && shown[lean] ? tx(shown[lean][0]) : null; // art.card shortens it to fit
        c.save(); c.translate(CX + CW / 2 + cardV.x, CY + CH / 2); c.scale(cardV.scale, cardV.scale); c.translate(-(CX + CW / 2), -(CY + CH / 2));
        A.card(c, CX, CY, CW, CH, { look: spk.look, cat: spk.cat, tint: spk.tint, name: spk.name, face: curFace, lean, badge: badgeText, groove: beatPulse * 0.35, t, rot: cardV.rot, blink: (t % 3.7) < 0.12 });
        c.restore();
      }
      if (card) lastCard = card;
    }
  }
  let lastCard = null;
  function bubble(c, x, y, text, k) {
    c.save(); c.translate(x, y); c.scale(k, k); c.font = '700 34px ' + FONT; const w = c.measureText(text).width + 40;
    c.fillStyle = '#fff'; c.strokeStyle = '#2a1a24'; c.lineWidth = 4; A.rr(c, -w / 2, -36, w, 64, 24); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-30, 26); c.lineTo(-50, 56); c.lineTo(-6, 26); c.fill(); c.stroke(); c.fillRect(-32, 22, 28, 6);
    c.fillStyle = '#2a1a24'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 0, -2); c.restore();
  }
  // little reaction bursts over the card: hearts, steam, question marks...
  const parts = [];
  function burst(f) {
    const set = { love: ['❤️', '💕', '💖'], joy: ['✨', '⭐', '😂'], happy: ['✨'], smug: ['😏', '✨'], angry: ['💢', '😤', '🔥'], cross: ['💢', '😒'], sus: ['❓', '🤨', '👀'], sad: ['💧', '😢'], wow: ['❗', '😳'], meh: ['😐', '…'] }[f] || ['✨'];
    for (let i = 0; i < 9; i++) parts.push({ x: W / 2 + (Math.random() - 0.5) * 260, y: CY + 120 + Math.random() * 100, vx: (Math.random() - 0.5) * 90, vy: -120 - Math.random() * 120, life: 1.4 + Math.random() * 0.5, e: set[i % set.length], s: 26 + Math.random() * 22 });
  }
  function drawParts(dt) {
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt; c.globalAlpha = Math.max(0, Math.min(1, p.life)); c.font = p.s + 'px ' + I.FONT_FALLBACK; c.textAlign = 'center'; c.fillText(p.e, p.x, p.y); }
    c.globalAlpha = 1;
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
  }

  // ---------- input ----------
  cv.addEventListener('pointerdown', ev => {
    if (mode === 'reply') { afterReply(); return; }
    if (mode !== 'card') return;
    const r = cv.getBoundingClientRect(), sx = W / r.width, x = (ev.clientX - r.left) * sx, y = (ev.clientY - r.top) * sx;
    if (x < CX - 20 || x > CX + CW + 20 || y < CY || y > CY + CH) return;
    drag = { x0: ev.clientX, dx: 0, sx }; cv.setPointerCapture(ev.pointerId);
  });
  cv.addEventListener('pointermove', ev => {
    if (!drag || mode !== 'card') return;
    drag.dx = (ev.clientX - drag.x0) * drag.sx;
    const side = drag.dx < -40 ? 'L' : drag.dx > 40 ? 'R' : null;
    if (side !== lean) { lean = side; const card = E.cardById(S.cur.id); showDots(side ? E.preview(card, side) : null); play.querySelectorAll('.choice').forEach(b => b.classList.toggle('lean', b.dataset.side === side)); }
  });
  cv.addEventListener('pointerup', () => {
    if (!drag) return;
    const dx = drag.dx; drag = null;
    if (Math.abs(dx) > 130) choose(dx < 0 ? 'L' : 'R');
    else { lean = null; showDots(null); play.querySelectorAll('.choice').forEach(b => b.classList.remove('lean')); }
  });

  function useItemSlot(idx) {
    if (mode !== 'card' || !S) return;
    const r = E.useItem(S, idx); if (!r) return;
    E.save(S);
    if (r.skip) { toast(esc(t_('item.callUsed')), 'gold'); AU.sfx('pop'); updateHud(); return nextCard(); }
    AU.sfx('heart'); showDeltas(r.deltas); toast(esc(t_('item.used', { item: itemName(r.item) })), 'gold');
  }

  document.addEventListener('click', ev => {
    AU.init();
    const el = ev.target.closest('[data-a],[data-side],[data-partner],[data-role],[data-item],[data-lang]');
    if (!el) { if (langOpen && !ev.target.closest('.langpop')) { langOpen = false; buildHud(); } if (mode === 'reply' && ev.target.closest('#play')) afterReply(); return; }
    if (el.dataset.lang) { AU.sfx('click'); I.setLang(el.dataset.lang); return; }
    if (el.dataset.side) return choose(el.dataset.side);
    if (el.dataset.partner) {
      pick.partner = el.dataset.partner;
      const P = D.PARTNERS.find(p => p.id === pick.partner);
      AU.speak(t_('pick.hi', { name: P.name }), { id: P.id, mood: 'happy' });
      return showPick();
    }
    if (el.dataset.role) { pick.role = el.dataset.role; AU.sfx('click'); return showPick(); }
    if (el.dataset.item) return useItemSlot(+el.dataset.item);
    switch (el.dataset.a) {
      case 'pick': showPick(); break;
      case 'start': startRun(); break;
      case 'continue': resume(); break;
      case 'again': pick.partner = S.partner.id; pick.role = S.partner.role; startRun(); break;
      case 'title': case 'back': showTitle(); break;
      case 'how': showHow(); break;
      case 'album': showAlbum(); break;
      case 'intro': ev.preventDefault(); AU.stop(); playIntro(showTitle); break;
      case 'stagego': screen.innerHTML = ''; nextCard(); break;
      case 'mute': AU.setMuted(!AU.muted); el.textContent = AU.muted ? '🔇' : '🔊'; break;
      case 'lang': langOpen = !langOpen; buildHud(); break;
    }
  });
  document.addEventListener('keydown', ev => {
    // language picker: arrow keys move between languages, Escape closes the HUD menu
    const lp = ev.target && ev.target.closest && ev.target.closest('.langs');
    if (lp && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(ev.key)) {
      ev.preventDefault(); ev.stopPropagation();
      const bs = [...lp.querySelectorAll('[data-lang]')], i = bs.indexOf(ev.target.closest('[data-lang]'));
      const n = ev.key === 'Home' ? 0 : ev.key === 'End' ? bs.length - 1 : (i + (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 1) + bs.length) % bs.length;
      bs[n].focus(); return;
    }
    if (lp && (ev.key === ' ' || ev.key === 'Enter')) return; // let the button click
    if (ev.key === 'Escape' && langOpen) { langOpen = false; buildHud(); const b = hud.querySelector('.langbtn'); if (b) b.focus(); return; }
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target && ev.target.dataset && ev.target.dataset.partner) { ev.preventDefault(); ev.target.click(); return; }
    if (ev.key === 'm' || ev.key === 'M') { AU.setMuted(!AU.muted); const m = hud.querySelector('[data-a="mute"]'); if (m) m.textContent = AU.muted ? '🔇' : '🔊'; return; }
    if (mode === 'card') {
      if (ev.key === 'ArrowLeft' || ev.key === 'a' || ev.key === 'A') return choose('L');
      if (ev.key === 'ArrowRight' || ev.key === 'd' || ev.key === 'D') return choose('R');
      if (ev.key >= '1' && ev.key <= '3') return useItemSlot(+ev.key - 1);
    } else if (mode === 'reply' && (ev.key === ' ' || ev.key === 'Enter')) { ev.preventDefault(); afterReply(); }
    else if (mode === 'game' && mg && ev.key === ' ') { ev.preventDefault(); if (mg.key) mg.key(); else { const b = $('#mm'); if (b) b.click(); } }
    else if (mode === 'stage' && (ev.key === ' ' || ev.key === 'Enter')) { screen.innerHTML = ''; nextCard(); }
  });

  // ---------- switching language: redraw whatever is on screen, straight away ----------
  addEventListener('langchange', rerender);
  function rerender() {
    I.applyDom(document);
    const intro = $('#intro .skip'); if (intro) intro.textContent = t_('intro.skip');
    if (mode === 'title' || mode === 'pick') {
      ({ title: showTitle, pick: showPick, how: showHow, album: showAlbum })[view]();
      const on = screen.querySelector('[data-lang][aria-checked="true"]'); if (on) on.focus();
      return;
    }
    if (!S) return;
    if (hud.firstChild) buildHud();
    if (mode === 'card') renderCard();
    else if (mode === 'reply' && replyView) replyView();
    else if (mode === 'stage' && stageShown) renderStage();
    else if (mode === 'end' && endShown) { renderEnding(); }
    else if (mode === 'game' && S.cur && S.cur.game) { mg = null; startGame(S.cur.game); } // a microgame restarts from its intro card
  }
  I.applyDom(document);

  // ---------- loop ----------
  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; t += dt;
    if (mg) { mg.t += dt; if (mg.tick) mg.tick(dt); if (mg.bar) mg.bar.style.width = Math.max(0, 100 - mg.t / mg.len * 100) + '%'; if (mg && mg.t >= mg.len) mg.timeout(); }
    draw(dt); drawParts(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__nif = { get S() { return S; }, set S(v) { S = v; }, startGame, nextCard, showEnding, rerender, get mode() { return mode; } };
  playIntro(showTitle);
})();
