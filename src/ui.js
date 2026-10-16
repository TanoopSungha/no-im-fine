// No, I'm Fine.: screens, the card table, microgames and input.
(function () {
  'use strict';
  const D = window.NIF_DATA, K = window.NIF_CARDS, E = window.NIF, A = window.NIF_ART, AU = window.NIF_AUDIO;
  const $ = s => document.querySelector(s);
  const stage = $('#stage'), cv = $('#scene'), c = cv.getContext('2d');
  const hud = $('#hud'), play = $('#play'), screen = $('#screen'), toasts = $('#toasts');
  const W = 1280, H = 720;
  const CW = 340, CH = 400, CX = (W - CW) / 2, CY = 178;
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  if (document.fonts) { document.fonts.load('700 20px Fredoka'); document.fonts.load('20px "Luckiest Guy"'); }

  let S = null, meta = E.loadMeta(), mode = 'title', t = 0, last = performance.now();
  let pick = { partner: 'jess', role: 'girlfriend' };
  let cardV = { x: 0, rot: 0, scale: 1, tx: 0, trot: 0, tscale: 1, flip: 1 };
  let drag = null, lean = null, face = 'talk', replyTimer = null, mg = null, pending = null;

  function fit() { const s = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `scale(${s})`; }
  addEventListener('resize', fit); fit();
  function toast(html, cls) { const d = document.createElement('div'); d.className = 'toast ' + (cls || ''); d.innerHTML = html; toasts.appendChild(d); setTimeout(() => d.remove(), 2900); }
  const fmt = s => S ? E.fmt(S, s) : s;
  const partnerDef = () => D.PARTNERS.find(p => p.id === S.partner.id);
  function speakerOf(who) {
    if (who === 'p') { const P = partnerDef(); return { look: P.look, tint: P.tint, name: `${P.name} (your ${D.ROLES[S.partner.role].stages[S.stage]})` }; }
    const cst = D.CAST[who]; return { look: cst.look, tint: cst.tint, name: cst.name, cat: cst.cat };
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
    $('#intro').innerHTML = '<div class="intro"><video src="assets/intro.mp4" autoplay playsinline></video><div class="skip">Press any key or tap to skip</div></div>';
    const v = $('#intro video');
    v.addEventListener('ended', endIntro); v.addEventListener('error', endIntro);
    const p = v.play(); if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(endIntro); });
    setTimeout(() => { document.addEventListener('keydown', endIntro, true); document.addEventListener('pointerdown', endIntro, true); }, 300);
    introTimer = setTimeout(endIntro, 15000);
  }

  // ---------- title, partner pick, help, album ----------
  function showTitle() {
    mode = 'title'; hud.innerHTML = ''; play.innerHTML = '';
    const saved = E.load();
    screen.innerHTML = `<div class="panel" style="background:rgba(26,6,20,.35)">
      <div class="logo"><div class="t1">NO, I'M <em>FINE.</em></div><div class="sub">A relationship survival comedy. Read between the lines, or sleep on the sofa.</div></div>
      <div class="row" style="margin-top:10px">
        ${saved ? `<button class="green" data-a="continue">Carry on with ${esc(saved.partner.name)} (day ${saved.day})</button>` : ''}
        <button class="pink" data-a="pick">${saved ? 'Start a new relationship' : 'Start a relationship'}</button>
        <button class="ghost" data-a="album">Breakup album (${Object.keys(meta.endings).length}/${Object.keys(D.ENDINGS).length})</button>
        <button class="ghost" data-a="how">How to play</button>
      </div>
      ${meta.best ? `<div class="credit">Longest relationship: <b>${meta.best} days</b></div>` : ''}
      <div class="credit">Developed by <b>Snoopster Gaming</b> · <a href="#" data-a="intro">Replay intro</a></div></div>`;
  }

  function showPick() {
    mode = 'pick';
    screen.innerHTML = `<div class="panel">
      <div class="head"><h2>Who's the lucky one?</h2><p>Pick your other half. They're all lovely. Mostly.</p></div>
      <div class="partners">${D.PARTNERS.map(p => `<div class="pcard ${pick.partner === p.id ? 'on' : ''}" data-partner="${p.id}"><div class="pic"></div><b>${p.name}</b><p>${esc(p.bio)}</p></div>`).join('')}</div>
      <div class="row roles"><span style="color:var(--cream)">They are my</span>${Object.keys(D.ROLES).map(r => `<button class="small ${pick.role === r ? 'on' : 'ghost'}" data-role="${r}">${r}</button>`).join('')}</div>
      <div class="row"><button class="ghost" data-a="back">Back</button><button class="pink" data-a="start">Let's do this ❤</button></div></div>`;
    for (const el of screen.querySelectorAll('[data-partner]')) { const P = D.PARTNERS.find(p => p.id === el.dataset.partner); el.querySelector('.pic').appendChild(portrait(P.look, 150, 180, pick.partner === P.id ? 'love' : 'happy', { bg: P.tint })); }
  }

  function showHow() {
    screen.innerHTML = `<div class="panel"><div class="card howto"><h2>How not to get dumped</h2><ul>
      <li>People say things. Swipe the card <b>left or right</b> (or tap a choice, or use the arrow keys) to answer.</li>
      <li>Keep all four meters alive: <b>❤️ Romance</b>, <b>⏳ Their patience</b>, <b>🧠 Your sanity</b> and <b>💷 the joint account</b>.</li>
      <li>Too low ends it. <b>Too high ends it too.</b> Nobody likes a clingy, broke, zen saint.</li>
      <li>Dots above the meters show what a choice will affect (big dot, big change), but not which way. Good luck.</li>
      <li>Every few cards there's a quick-fire challenge: decode "I'm fine", survive "where do you want to eat?", say "mm-hmm" at the right moment, win the duvet war...</li>
      <li>Earn get-out-of-jail cards (💐 🍫 🧘 📱) with good streaks and perfect challenges. Tap them at the top right.</li>
      <li>Make it from first date to the golden years. Collect every breakup on the way.</li></ul>
      <div class="row"><button data-a="back">Got it</button></div></div></div>`;
  }

  function showAlbum() {
    screen.innerHTML = `<div class="panel"><div class="head"><h2>Breakup album</h2><p>Every way it can end. ${Object.keys(meta.endings).length} of ${Object.keys(D.ENDINGS).length} found.</p></div>
      <div class="album">${Object.entries(D.ENDINGS).map(([k, e]) => meta.endings[k] ? `<div class="e"><div class="i">${e.icon}</div><b>${esc(e.title)}</b><small>×${meta.endings[k]}</small></div>` : `<div class="e lock"><div class="i">❓</div><b>???</b><small>Not yet...</small></div>`).join('')}</div>
      <div class="row"><button data-a="back">Back</button></div></div>`;
  }

  // ---------- the card table ----------
  function buildHud() {
    hud.innerHTML = `<div class="meters">${D.METERS.map(m => `<div class="meter" data-m="${m.id}"><div class="dot"></div><div class="jar"><div class="fill" style="background:${m.col}"></div><div class="ic">${m.icon}</div></div><div class="lbl">${m.name}</div></div>`).join('')}</div>
      <div class="chip daychip"><b>Day ${S.day}</b><small>${D.STAGES[S.stage].name}</small></div>
      <div class="items"></div><div class="streak" style="display:none"></div>
      <div class="timeline">${D.STAGES.map((st, i) => `<div class="tl-stop" style="left:${st.from / D.WIN_DAY * 100}%"><i></i><span>${st.name}</span></div>`).join('')}<div class="tl-stop" style="left:100%"><i></i><span>Forever</span></div><div class="tl-fill"></div><div class="tl-heart">❤️</div></div>
      <button class="small ghost mute" data-a="mute">${AU.muted ? '🔇' : '🔊'}</button>`;
    updateHud();
  }
  function updateHud() {
    if (!S || !hud.firstChild) return;
    for (const m of D.METERS) { const el = hud.querySelector(`[data-m="${m.id}"]`); if (!el) continue; const v = S.m[m.id]; el.querySelector('.fill').style.height = v + '%'; el.classList.toggle('danger', v < 18 || v > 82); }
    const dc = hud.querySelector('.daychip'); if (dc) dc.innerHTML = `<b>Day ${S.day}</b><small>${D.STAGES[S.stage].name} · ${D.ROLES[S.partner.role].stages[S.stage]}: ${esc(S.partner.name)}</small>`;
    const tl = hud.querySelector('.timeline'); if (tl) { const k = Math.min(100, S.day / D.WIN_DAY * 100); tl.querySelector('.tl-fill').style.width = k + '%'; tl.querySelector('.tl-heart').style.left = k + '%'; }
    const its = hud.querySelector('.items'); if (its) its.innerHTML = [0, 1, 2].map(i => S.items[i] ? `<button class="it" data-item="${i}" title="${esc(D.ITEMS[S.items[i]].name)}: ${esc(D.ITEMS[S.items[i]].desc)}">${D.ITEMS[S.items[i]].icon}</button>` : '<div class="it empty"></div>').join('');
    const st = hud.querySelector('.streak'); if (st) { st.style.display = S.streak >= 3 ? '' : 'none'; st.textContent = `🔥 ${S.streak} in a row`; }
  }
  function showDots(prev) { for (const m of D.METERS) { const d = hud.querySelector(`[data-m="${m.id}"] .dot`); if (d) d.className = 'dot' + (prev && prev[m.id] ? ' s' + prev[m.id] : ''); } }
  function showDeltas(deltas) {
    for (const k in deltas) { const v = deltas[k]; if (!v) continue; const el = hud.querySelector(`[data-m="${k}"]`); if (!el) continue; const d = document.createElement('div'); d.className = 'delta ' + (v > 0 ? 'up' : 'down'); d.textContent = v > 0 ? '▲' : '▼'; el.appendChild(d); setTimeout(() => d.remove(), 1300); }
    updateHud();
  }

  function startRun() {
    S = E.newRun(pick.partner, pick.role); E.save(S);
    screen.innerHTML = ''; buildHud(); music();
    toast(`Day 1 with <b>${esc(S.partner.name)}</b>. Don't mess it up.`, 'pink');
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
    face = 'talk'; setTimeout(() => { if (mode === 'card') face = 'neutral'; }, 900);
    play.innerHTML = `<div class="question">“${esc(fmt(card.text))}”</div>
      <button class="choice l" data-side="L"><span class="arr">◀ swipe left</span>${esc(fmt(card.L[0]))}</button>
      <button class="choice r" data-side="R"><span class="arr">swipe right ▶</span>${esc(fmt(card.R[0]))}</button>`;
    for (const b of play.querySelectorAll('.choice')) {
      b.addEventListener('pointerenter', () => { lean = b.dataset.side; showDots(E.preview(card, lean)); b.classList.add('lean'); });
      b.addEventListener('pointerleave', () => { if (!drag) { lean = null; showDots(null); } b.classList.remove('lean'); });
    }
  }
  
  function choose(side) {
    if (mode !== 'card') return;
    AU.init();
    mode = 'reply';
    const res = E.choose(S, side);
    if (!res) return;
    E.save(S);
    showDots(null); drag = null; lean = null;
    face = res.face; cardV.tx = 0; cardV.trot = 0; burst(res.face); cardV.scale = 1.06;
    const good = res.face === 'love' || res.face === 'joy' || res.face === 'happy' || res.face === 'smug';
    AU.sfx(good ? (res.face === 'love' ? 'heart' : 'pop') : res.face === 'angry' ? 'fail' : 'click');
    play.innerHTML = `<div class="reply">${esc(res.reply)}<small>tap to carry on</small></div>`;
    showDeltas(res.deltas);
    if (res.item) toast(`Streak bonus! You got <b>${D.ITEMS[res.item].icon} ${esc(D.ITEMS[res.item].name)}</b>`, 'gold');
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
    mode = 'stage'; play.innerHTML = '';
    AU.sfx('level'); music(); buildHud();
    screen.innerHTML = `<div class="panel stageup" data-a="stagego"><div class="small">Day ${S.day} together</div><div class="big">${esc(st.name)}</div><div class="small">${esc(st.blurb)}</div><div class="small" style="font-size:15px;opacity:.8;margin-top:20px">Tap to carry on</div></div>`;
  }

  function showEnding(key) {
    mode = 'end'; play.innerHTML = ''; showDots(null);
    const e = D.ENDINGS[key], isNew = !meta.endings[key];
    meta = E.finish(meta, S); E.saveMeta(meta); E.wipe();
    AU.sfx(key === 'golden' ? 'legend' : 'fail'); AU.stop();
    face = key === 'golden' ? 'love' : 'angry';
    if (key === 'golden') for (let i = 0; i < 80; i++) parts.push({ x: Math.random() * W, y: -20 - Math.random() * 300, vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 120, life: 6, e: ['❤️', '🎉', '✨', '💐'][i % 4], s: 22 + Math.random() * 20 });
    screen.innerHTML = `<div class="panel"><div class="card ending" style="display:flex;gap:22px;align-items:center;max-width:900px;text-align:left"><div id="endPic"></div><div><div class="ic">${e.icon}</div><h2>${esc(e.title)}</h2>${isNew ? '<div style="color:var(--hot);font-weight:700">NEW ENDING UNLOCKED</div>' : ''}
      <p>${esc(fmt(e.text))}</p>
      <div class="stats"><div><b>${S.day}</b>days together</div><div><b>${D.STAGES[S.stage].name}</b>got as far as</div><div><b>${S.bestStreak}</b>best streak</div><div><b>${Object.keys(meta.endings).length}/${Object.keys(D.ENDINGS).length}</b>endings found</div></div>
      ${S.day >= meta.best && meta.runs > 1 ? '<div style="font-weight:700">🏆 Your longest relationship yet!</div>' : `<div>Your record: ${meta.best} days</div>`}
      <div class="row" style="margin-top:12px"><button class="pink" data-a="again">Try again with ${esc(S.partner.name)}</button><button class="ghost" data-a="pick">Someone new</button><button class="ghost" data-a="title">Menu</button></div></div></div></div>`;
    const P = partnerDef(); $('#endPic').appendChild(Object.assign(portrait(P.look, 230, 300, key === 'golden' ? 'love' : key.startsWith('love1') ? 'love' : 'angry', { bg: P.tint, full: true, arm: key === 'golden' ? 'wave' : 'cross' }), { style: 'width:230px;height:300px;border-radius:22px;border:4px solid #2a1a24;flex:none' }));
  }

  // ---------- microgames ----------
  function startGame(id) {
    mode = 'game'; play.innerHTML = '';
    const g = K.GAME_CARDS[id], P = partnerDef();
    const box = document.createElement('div'); box.className = 'mg'; play.appendChild(box);
    const titles = { fine: '"I\'m fine."', eat: 'Where do you want to eat?', mmhmm: 'Mm-hmm', outfit: 'How do I look?', duvet: 'Duvet war', thermo: 'Thermostat wars' };
    box.innerHTML = `<div class="title">${titles[id]}</div><div class="sub">${esc(g.intro)}</div><button class="pink big" id="mgGo">Go!</button>`;
    AU.sfx('alarm');
    $('#mgGo').onclick = () => { AU.init(); GAMES[id](box, P); };
  }
  function endGame(id, score) {
    if (!mg) return; mg = null;
    const res = E.gameResult(S, id, Math.max(0, Math.min(1, score)));
    E.save(S);
    const box = play.querySelector('.mg');
    const win = res.win;
    AU.sfx(win ? (res.perfect ? 'legend' : 'level') : 'fail');
    face = win ? 'love' : 'cross';
    if (box) box.innerHTML = `<div class="result ${win ? 'win' : 'lose'}">${res.perfect ? 'PERFECT!' : win ? 'NAILED IT' : 'OH DEAR'}</div><div class="sub">${win ? fmt(pickLine(WIN_LINES)) : fmt(pickLine(LOSE_LINES))}</div>${res.item ? `<div class="sub">You earned ${D.ITEMS[res.item].icon} ${esc(D.ITEMS[res.item].name)}</div>` : ''}<div class="sub" style="font-size:14px;opacity:.8">Tap to carry on</div>`;
    showDeltas(res.deltas);
    mode = 'reply'; pending = res;
    clearTimeout(replyTimer); replyTimer = setTimeout(afterReply, 2400);
  }
  const WIN_LINES = ['{P} is impressed. Slightly.', 'Crisis averted. For now.', '{P} gives you the good eyebrows.', 'You may keep your side of the bed.'];
  const LOSE_LINES = ['{P} has gone quiet. The bad kind of quiet.', 'That\'ll be mentioned again. In 2034.', 'Debbie will hear about this.', 'You\'re on thin ice. Very thin.'];
  const pickLine = a => a[Math.floor(Math.random() * a.length)];
  function timerBar(box) { const t = document.createElement('div'); t.className = 'timer'; t.innerHTML = '<i></i>'; box.prepend(t); return t.firstChild; }

  const GAMES = {
    fine(box, P) {
      const mood = E.MOODS[Math.floor(Math.random() * E.MOODS.length)];
      const tells = mood.tells.slice().sort(() => Math.random() - 0.5).slice(0, 2);
      const answers = E.MOODS.map(m => m.answer).sort(() => Math.random() - 0.5);
      box.innerHTML = `<div class="title">"I'm fine."</div><div class="body"><div id="por"></div><div><div class="tells">You notice: <b>${esc(fmt(tells[0]))}</b>, and <b>${esc(fmt(tells[1]))}</b>.</div><div class="opts" style="margin-top:14px">${answers.map(a => `<button class="ghost" data-ans="${esc(a)}">${esc(a)}</button>`).join('')}</div></div></div>`;
      box.querySelector('#por').appendChild(Object.assign(portrait(P.look, 220, 260, mood.face, { bg: P.tint }), { className: 'por' }));
      const bar = timerBar(box);
      mg = { id: 'fine', t: 0, len: 6, bar, tick() {}, timeout() { endGame('fine', 0); } };
      box.querySelectorAll('[data-ans]').forEach(b => b.onclick = () => endGame('fine', b.dataset.ans === mood.answer ? 1 : 0.1));
    },
    eat(box, P) {
      const round = E.eatRound();
      box.innerHTML = `<div class="title">Where do you want to eat?</div><div class="body"><div id="por"></div><div><div class="speech" id="eatSay">"I don't mind. You pick."</div><div class="opts three" style="margin-top:14px;width:600px">${round.options.map(o => `<button class="ghost" data-place="${esc(o)}">${esc(o)}</button>`).join('')}</div></div></div>`;
      box.querySelector('#por').appendChild(Object.assign(portrait(P.look, 220, 260, 'smug', { bg: P.tint }), { className: 'por' }));
      const bar = timerBar(box), say = box.querySelector('#eatSay');
      let shown = 0;
      mg = { id: 'eat', t: 0, len: 11, bar, tick() { const k = Math.min(round.hints.length, Math.floor((this.t - 0.6) / 1.4) + 1); if (k > shown) { shown = k; say.innerHTML = '"I don\'t mind. You pick."<br>' + round.hints.slice(0, k).map(h => `"${esc(h)}"`).join('<br>'); AU.sfx('pop'); } }, timeout() { endGame('eat', 0); } };
      box.querySelectorAll('[data-place]').forEach(b => b.onclick = () => endGame('eat', b.dataset.place === round.answer ? (shown >= round.hints.length ? 1 : 0.8) : 0.1));
    },
    mmhmm(box, P) {
      const story = 'So Debbie goes to Karen, right, and Karen goes "well I never said that", and Debbie goes "you DID say that", and then Gary from accounts comes in with the cake, the LEMON one, and nobody even likes lemon, and then Karen starts crying in the stationery cupboard, and I\'m like, what is happening, and THEN the fire alarm goes off...'.split(' ');
      box.innerHTML = `<div class="title">Mm-hmm</div><div class="body"><div id="por"></div><div style="width:620px"><div class="story" id="story"></div><div class="look" id="look"></div><button class="pink big" id="mm">Mm-hmm</button></div></div>`;
      const por = box.querySelector('#por'); const draw = f => { por.innerHTML = ''; por.appendChild(Object.assign(portrait(P.look, 220, 260, f, { bg: P.tint }), { className: 'por' })); };
      draw('talk');
      const bar = timerBar(box), st = box.querySelector('#story'), look = box.querySelector('#look');
      const times = [2.2, 4.6, 7.3, 9.6].map(x => x + Math.random() * 0.6);
      let hits = 0, wrong = 0, open = -1;
      mg = { id: 'mmhmm', t: 0, len: 12, bar, tick() {
        st.textContent = story.slice(Math.max(0, Math.floor(this.t * 4.6) - 14), Math.floor(this.t * 4.6)).join(' ');
        const o = times.findIndex(x => this.t >= x && this.t < x + 1.15);
        if (o !== open) { open = o; if (o >= 0) { look.textContent = '...right?'; draw('sus'); AU.sfx('click'); } else { look.textContent = ''; draw('talk'); } }
      }, timeout() { endGame('mmhmm', Math.max(0, (hits - wrong) / times.length)); } };
      const done = new Set();
      box.querySelector('#mm').onclick = () => { if (open >= 0 && !done.has(open)) { done.add(open); hits++; AU.sfx('pop'); look.textContent = '✓'; } else { wrong++; AU.sfx('fail'); look.textContent = '"Why are you saying mm-hmm?"'; } };
    },
    outfit(box, P) {
      const look = Object.assign({}, P.look, { col: ['#ff5fa2', '#39d0b8', '#f2a93b', '#b14bff', '#e5483b'][Math.floor(Math.random() * 5)], top: ['sequin', 'shirt', 'suit', 'cardigan'][Math.floor(Math.random() * 4)] });
      box.innerHTML = `<div class="title">How do I look?</div><div class="body"><div id="por"></div><div style="width:560px"><div class="tells">Tap <b>4 good words</b> before time runs out. One trap word and it's over.</div><div class="opts three" id="words" style="margin-top:14px;width:560px"></div><div class="look" id="got"></div></div></div>`;
      box.querySelector('#por').appendChild(Object.assign(portrait(look, 220, 260, 'smug', { bg: P.tint, arm: 'wave', full: true }), { className: 'por' }));
      const bar = timerBar(box), words = box.querySelector('#words'), got = box.querySelector('#got');
      let good = 0, next = 0;
      const deal = () => { words.innerHTML = [0, 1, 2].map(() => { const ok = Math.random() < 0.45; const w = ok ? E.GOOD_WORDS[Math.floor(Math.random() * E.GOOD_WORDS.length)] : E.TRAP_WORDS[Math.floor(Math.random() * E.TRAP_WORDS.length)]; return `<button class="ghost word" data-ok="${ok ? 1 : 0}">${esc(w)}</button>`; }).join(''); };
      deal();
      mg = { id: 'outfit', t: 0, len: 9, bar, tick() { if (this.t > next) { next = this.t + 1.1; deal(); } }, timeout() { endGame('outfit', good / 4); } };
      words.onclick = ev => { const b = ev.target.closest('[data-ok]'); if (!b || !mg) return; if (b.dataset.ok === '1') { good++; AU.sfx('heart'); got.textContent = '❤'.repeat(good); b.disabled = true; if (good >= 4) endGame('outfit', 1); } else { AU.sfx('fail'); got.textContent = `"${b.textContent}?!"`; setTimeout(() => endGame('outfit', 0.1), 500); mg.len = 99; } };
    },
    duvet(box, P) {
      box.innerHTML = `<div class="title">Duvet war</div><div class="tells">Keep your share of the duvet in the green zone. Tap <b>Tug</b> (or Space) to pull it back.</div>
        <div class="labels"><span>Your side</span><span>${esc(P.name)}'s side</span></div><div class="bar"><div class="zone" style="left:38%;width:26%"></div><div class="duv" id="duv"></div></div><button class="pink big" id="tug">Tug!</button>`;
      const bar = timerBar(box), duv = box.querySelector('#duv');
      let share = 50, inZone = 0;
      mg = { id: 'duvet', t: 0, len: 9, bar, tick(dt) { const pull = 9 + 22 * (Math.sin(this.t * 2.3) > 0.55 ? 1 : 0) + this.t * 1.5; share = Math.max(0, Math.min(100, share - pull * dt)); duv.style.width = share + '%'; if (share >= 38 && share <= 64) inZone += dt; }, timeout() { endGame('duvet', Math.min(1, inZone / (this.len * 0.75))); }, key() { share = Math.min(100, share + 6); AU.sfx('click'); } };
      box.querySelector('#tug').onclick = () => mg && mg.key();
    },
    thermo(box, P) {
      box.innerHTML = `<div class="title">Thermostat wars</div><div class="tells">${esc(P.name)} keeps changing their mind. Keep the heating on the black line.</div>
        <div class="labels"><span>❄ 15°</span><span id="temp">20°</span><span>🔥 25°</span></div><div class="bar" style="background:linear-gradient(90deg,#9fd2ff,#fff,#ff9a7a)"><div class="zone" id="zone"></div><div class="need" id="need"></div></div><input type="range" min="15" max="25" step="0.1" value="20" id="dial">`;
      const bar = timerBar(box), need = box.querySelector('#need'), zone = box.querySelector('#zone'), dial = box.querySelector('#dial'), temp = box.querySelector('#temp');
      let inZone = 0;
      mg = { id: 'thermo', t: 0, len: 10, bar, tick(dt) { const want = 20 + 3.2 * Math.sin(this.t * 0.9) + 1.3 * Math.sin(this.t * 2.3 + 1); const x = (want - 15) * 10; need.style.left = x + '%'; zone.style.left = (x - 8) + '%'; zone.style.width = '16%'; const v = +dial.value; temp.textContent = v.toFixed(1) + '°'; if (Math.abs(v - want) <= 0.8) inZone += dt; }, timeout() { endGame('thermo', Math.min(1, inZone / (this.len * 0.7))); } };
    },
  };

  // ---------- drawing ----------
  function draw(dt) {
    c.clearRect(0, 0, W, H);
    const roomIx = S ? S.stage : 0;
    c.drawImage(A.room(W, H, roomIx), 0, 0);
    if (mode === 'title' || mode === 'pick' || mode === 'end') {
      c.fillStyle = 'rgba(30,6,24,.3)'; c.fillRect(0, 0, W, H);
      if (mode === 'title') {
        const L = D.PARTNERS[Math.floor(t / 4) % 6], Rr = D.PARTNERS[(Math.floor(t / 4) + 3) % 6];
        A.person(c, L.look, 190, 800, 1.9, { face: (t % 4) < 2 ? 'sus' : 'smug', arm: 'cross', t, blink: (t % 3.3) < 0.12 });
        A.person(c, Rr.look, 1090, 800, 1.9, { face: (t % 2.4) < 1.2 ? 'wow' : 'meh', arm: 'think', t, blink: (t % 2.9) < 0.12 });
        bubble(c, 250, 340, '"I\'m fine."', 1 + Math.sin(t * 3) * 0.03);
        c.font = '900 54px Fredoka'; c.fillStyle = '#fff'; c.strokeStyle = '#2a1a24'; c.lineWidth = 6; c.textAlign = 'center';
        const q = (t % 2.4) < 1.2 ? '?!' : '...'; c.strokeText(q, 1170, 300 + Math.sin(t * 4) * 6); c.fillText(q, 1170, 300 + Math.sin(t * 4) * 6);
        c.fillStyle = '#7fc8ff'; for (let i = 0; i < 2; i++) { const yy = 350 + ((t * 60 + i * 30) % 60); c.beginPath(); c.ellipse(1010 + i * 150, yy, 6, 9, 0, 0, Math.PI * 2); c.fill(); }
        // floating hearts
        for (let i = 0; i < 8; i++) { const y = (H + 40) - ((t * 30 + i * 97) % (H + 80)); c.globalAlpha = 0.35; c.fillStyle = '#ff5fa2'; c.font = (20 + i * 4) + 'px sans-serif'; c.fillText('♥', 80 + i * 150, y); }
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
        c.save(); c.translate(CX + CW / 2 + cardV.x, CY + CH / 2); c.scale(cardV.scale, cardV.scale); c.translate(-(CX + CW / 2), -(CY + CH / 2));
        A.card(c, CX, CY, CW, CH, { look: spk.look, cat: spk.cat, tint: spk.tint, name: spk.name, face: mode === 'card' ? (drag && Math.abs(drag.dx) > 60 ? (drag.dx < 0 ? 'sus' : 'wow') : face) : face, arm: 'idle', t, rot: cardV.rot, blink: (t % 3.7) < 0.12 });
        c.restore();
      }
      if (card) lastCard = card;
    }
  }
  let lastCard = null;
  function bubble(c, x, y, text, k) {
    c.save(); c.translate(x, y); c.scale(k, k); c.font = '700 34px Fredoka'; const w = c.measureText(text).width + 40;
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
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.life -= dt; c.globalAlpha = Math.max(0, Math.min(1, p.life)); c.font = p.s + 'px sans-serif'; c.textAlign = 'center'; c.fillText(p.e, p.x, p.y); }
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

  document.addEventListener('click', ev => {
    AU.init();
    const el = ev.target.closest('[data-a],[data-side],[data-partner],[data-role],[data-item]');
    if (!el) { if (mode === 'reply' && ev.target.closest('#play')) afterReply(); return; }
    if (el.dataset.side) return choose(el.dataset.side);
    if (el.dataset.partner) { pick.partner = el.dataset.partner; AU.sfx('heart'); return showPick(); }
    if (el.dataset.role) { pick.role = el.dataset.role; AU.sfx('click'); return showPick(); }
    if (el.dataset.item) {
      if (mode !== 'card') return;
      const r = E.useItem(S, +el.dataset.item); if (!r) return;
      E.save(S);
      if (r.skip) { toast('📱 "Sorry, got to take this..." You escaped.', 'gold'); AU.sfx('pop'); updateHud(); return nextCard(); }
      AU.sfx('heart'); showDeltas(r.deltas); toast(`${D.ITEMS[r.item].icon} ${esc(D.ITEMS[r.item].name)}!`, 'gold'); return;
    }
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
    }
  });
  document.addEventListener('keydown', ev => {
    if (mode === 'card' && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) choose(ev.key === 'ArrowLeft' ? 'L' : 'R');
    else if (mode === 'reply' && (ev.key === ' ' || ev.key === 'Enter')) { ev.preventDefault(); afterReply(); }
    else if (mode === 'game' && mg && ev.key === ' ') { ev.preventDefault(); if (mg.key) mg.key(); else { const b = $('#mm'); if (b) b.click(); } }
    else if (mode === 'stage' && (ev.key === ' ' || ev.key === 'Enter')) { screen.innerHTML = ''; nextCard(); }
  });

  // ---------- loop ----------
  function frame(now) {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; t += dt;
    if (mg) { mg.t += dt; if (mg.tick) mg.tick(dt); if (mg.bar) mg.bar.style.width = Math.max(0, 100 - mg.t / mg.len * 100) + '%'; if (mg && mg.t >= mg.len) mg.timeout(); }
    draw(dt); drawParts(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.__nif = { get S() { return S; }, set S(v) { S = v; }, startGame, nextCard, showEnding, get mode() { return mode; } };
  playIntro(showTitle);
})();
