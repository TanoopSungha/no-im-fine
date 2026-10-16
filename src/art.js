// No, I'm Fine.: everything is drawn in code (no image files). People, rooms and the cards they sit on.
(function (G) {
  'use strict';
  const D = G.NIF_DATA;
  const TAU = Math.PI * 2;

  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  }
  const OUT = '#2a1a24';  // outline colour for the chunky cartoon look

  // ---------- people ----------
  // look: { skin, hair, hairCol, top, col, legs, acc, build, h }
  // o: { walk (phase or null), face, blink, arm: 'idle'|'wave'|'hold'|'cheer'|'cross'|'point', holdCol, flip, t }
  function person(c, L, x, foot, sc, o) {
    o = o || {};
    const h = (L.h || 1), b = (L.build || 1);
    c.save(); c.translate(x, foot); c.scale(sc * (o.flip ? -1 : 1), sc);
    const t = o.t || 0;
    const step = o.walk != null ? Math.sin(o.walk) : 0;
    const bob = (o.walk != null ? Math.abs(Math.cos(o.walk)) * 4 : Math.sin(t * 2 + (L.seed || 0)) * 1.2) + (o.groove || 0) * 4;
    c.lineWidth = 3.2; c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = OUT;
    const legH = 62 * h, torsoH = 82 * h, bw = 30 * b;
    const hipY = -legH - bob, shY = hipY - torsoH, headY = shY - 34;
    // shadow
    c.fillStyle = 'rgba(30,10,20,.22)'; c.beginPath(); c.ellipse(0, 2, bw * 1.4, 8, 0, 0, TAU); c.fill();
    // long hair behind
    hairBack(c, L, headY);
    // legs
    const legCol = L.legs || '#2b3a67';
    for (const sgn of [-1, 1]) {
      const lift = o.walk != null ? Math.max(0, sgn * step) * 10 : 0, sw = o.walk != null ? sgn * step * 8 : 0;
      c.fillStyle = legCol; rr(c, sgn * bw * 0.45 - 10 + sw, hipY - 4, 20, legH - lift + 2 + bob, 8); c.fill(); c.stroke();
      c.fillStyle = L.shoes || '#231a1a'; rr(c, sgn * bw * 0.45 - 13 + sw + sgn * 3, -12 - lift, 26, 13, 6); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(sgn * bw * 0.45 - 13 + sw + sgn * 3 + 2, -3 - lift, 22, 2);
    }
    // arms behind body (when idle they hang at the sides)
    const arm = o.arm || 'idle';
    const sleeve = topColour(L);
    const handCol = L.skin;
    function limb(sx, sy, ex, ey) {
      c.strokeStyle = OUT; c.lineWidth = 17; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
      c.strokeStyle = sleeve; c.lineWidth = 11; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
      c.fillStyle = handCol; c.lineWidth = 3; c.strokeStyle = OUT; c.beginPath(); c.arc(ex, ey, 7.5, 0, TAU); c.fill(); c.stroke();
    }
    const swing = o.walk != null ? step * 10 : Math.sin(t * 1.6 + (L.seed || 0)) * 2;
    const ax = bw + 2, ay = shY + 12;
    const arms = {
      idle: [[-ax, ay, -ax - 8 - swing * 0.3, hipY + 6 + swing], [ax, ay, ax + 8 + swing * 0.3, hipY + 6 - swing]],
      wave: [[-ax, ay, -ax - 8, hipY + 6], [ax, ay, ax + 26, ay - 40 + Math.sin(t * 12) * 8]],
      cheer: [[-ax, ay, -ax - 22, ay - 52 + Math.sin(t * 14) * 5], [ax, ay, ax + 22, ay - 52 - Math.sin(t * 14) * 5]],
      hold: [[-ax, ay, -10, ay + 30], [ax, ay, 10, ay + 30]],
      cross: [[-ax, ay, bw * 0.6, ay + 26], [ax, ay, -bw * 0.6, ay + 30]],
      point: [[-ax, ay, -ax - 8, hipY + 6], [ax, ay, ax + 40, ay + 4]],
      think: [[-ax, ay, -ax - 8, hipY + 6], [ax, ay, 14, headY + 30]],
      dig: [[-ax, ay, -16, hipY - 4 + Math.sin(t * 7) * 5], [ax, ay, 18, hipY - 8 + Math.cos(t * 7) * 5]],
    }[arm];
    // torso
    torso(c, L, bw, shY, hipY, torsoH);
    if (L.bag) bag(c, L, bw, shY, hipY);
    if (arm !== 'cross' && arm !== 'hold' && arm !== 'dig') arms.forEach(a => limb(...a));
    // neck + head
    c.fillStyle = L.skin; rr(c, -9, shY - 12, 18, 16, 5); c.fill();
    head(c, L, headY, o);
    if (arm === 'cross' || arm === 'hold' || arm === 'dig') arms.forEach(a => limb(...a));
    if (arm === 'hold' && o.holdCol) { // a record sleeve held to the chest
      c.save(); c.translate(0, ay + 10); c.rotate(-0.08); c.fillStyle = o.holdCol; c.lineWidth = 3; rr(c, -26, -26, 52, 52, 3); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.fill(); c.restore();
    }
    c.restore();
  }

  function bag(c, L, bw, shY, hipY) {
    // a canvas tote bag with a record printed on it
    c.strokeStyle = OUT; c.lineWidth = 3;
    c.strokeStyle = shade(L.bag, -0.3); c.lineWidth = 4; c.beginPath(); c.moveTo(-bw * 0.4, shY + 2); c.lineTo(-bw - 8, hipY - 30); c.stroke();
    c.fillStyle = L.bag; c.strokeStyle = OUT; c.lineWidth = 3; rr(c, -bw - 22, hipY - 34, 34, 40, 4); c.fill(); c.stroke();
    c.fillStyle = '#1b1820'; c.beginPath(); c.arc(-bw - 5, hipY - 12, 9, 0, TAU); c.fill(); c.fillStyle = '#ff5fa2'; c.beginPath(); c.arc(-bw - 5, hipY - 12, 3, 0, TAU); c.fill();
  }

  function topColour(L) { return L.top === 'leather' ? '#1d1a1f' : L.top === 'denim' ? '#4d6fa8' : L.col; }

  function torso(c, L, bw, shY, hipY, th) {
    const col = topColour(L);
    c.fillStyle = col; c.strokeStyle = OUT; c.lineWidth = 3.2;
    rr(c, -bw, shY, bw * 2, th + 6, Math.min(26, bw)); c.fill(); c.stroke();
    c.save(); rr(c, -bw, shY, bw * 2, th + 6, Math.min(26, bw)); c.clip();
    if (L.pattern === 'stripes' && (L.top === 'tee' || L.top === 'turtleneck' || L.top === 'shirt')) { c.fillStyle = shade(col, col === '#111' || col === '#222' ? 0.35 : -0.25); for (let y = shY + 8; y < hipY; y += 14) c.fillRect(-bw, y, bw * 2, 6); }
    if (L.pattern === 'spots' && L.top !== 'leather') { c.fillStyle = shade(col, 0.45); for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(-bw + ((i * 29) % (bw * 2)), shY + 10 + ((i * 41) % th), 3.5, 0, TAU); c.fill(); } }
    const sh = c.createLinearGradient(-bw, 0, bw, 0); sh.addColorStop(0, 'rgba(255,255,255,.16)'); sh.addColorStop(0.55, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.2)');
    c.fillStyle = sh; c.fillRect(-bw, shY, bw * 2, th + 6); c.restore();
    c.strokeStyle = OUT; c.lineWidth = 3.2; rr(c, -bw, shY, bw * 2, th + 6, Math.min(26, bw)); c.stroke();
    const mid = shY + th / 2;
    c.lineWidth = 2.4;
    switch (L.top) {
      case 'hoodie':
        c.fillStyle = shade(col, -0.18); rr(c, -bw * 0.55, mid + 6, bw * 1.1, th * 0.28, 8); c.fill(); c.stroke();
        c.strokeStyle = '#eee'; c.beginPath(); c.moveTo(-6, shY + 4); c.lineTo(-7, shY + 26); c.moveTo(6, shY + 4); c.lineTo(7, shY + 26); c.stroke(); break;
      case 'leather':
        c.strokeStyle = '#8a8a96'; c.beginPath(); c.moveTo(4, shY + 2); c.lineTo(-2, hipY); c.stroke();
        c.fillStyle = '#2d2a31'; c.beginPath(); c.moveTo(-bw + 4, shY + 4); c.lineTo(-4, shY + 30); c.lineTo(-10, shY + 2); c.fill();
        c.beginPath(); c.moveTo(bw - 4, shY + 4); c.lineTo(8, shY + 30); c.lineTo(12, shY + 2); c.fill();
        c.fillStyle = '#c7c7d0'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-bw + 9, shY + 14 + i * 12, 2, 0, TAU); c.fill(); } break;
      case 'denim':
        c.strokeStyle = '#e9c46a'; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(0, shY + 4); c.lineTo(0, hipY); c.moveTo(-bw + 6, shY + 26); c.lineTo(bw - 6, shY + 26); c.stroke(); c.setLineDash([]); break;
      case 'cardigan':
        c.fillStyle = '#f4efe1'; c.beginPath(); c.moveTo(-12, shY + 1); c.lineTo(0, shY + 40); c.lineTo(12, shY + 1); c.fill();
        c.fillStyle = shade(col, -0.35); for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, shY + 48 + i * 13, 3, 0, TAU); c.fill(); } break;
      case 'suit':
        c.fillStyle = '#f4f4f4'; c.beginPath(); c.moveTo(-13, shY + 1); c.lineTo(0, shY + 44); c.lineTo(13, shY + 1); c.fill();
        c.fillStyle = '#c3001b'; c.beginPath(); c.moveTo(-3, shY + 6); c.lineTo(3, shY + 6); c.lineTo(5, shY + 38); c.lineTo(0, shY + 44); c.lineTo(-5, shY + 38); c.fill(); break;
      case 'turtleneck':
        c.fillStyle = shade(col, -0.15); rr(c, -14, shY - 10, 28, 16, 6); c.fill(); c.stroke(); break;
      case 'sequin':
        for (let i = 0; i < 26; i++) { const px = -bw + 6 + ((i * 37) % (bw * 2 - 12)), py = shY + 6 + ((i * 53) % (th - 6)); c.fillStyle = i % 2 ? '#fff' : shade(col, 0.5); c.beginPath(); c.arc(px, py, 1.8, 0, TAU); c.fill(); } break;
      case 'shirt':
        c.fillStyle = shade(col, 0.4); c.beginPath(); c.moveTo(-12, shY); c.lineTo(-2, shY + 14); c.lineTo(-14, shY + 12); c.fill(); c.beginPath(); c.moveTo(12, shY); c.lineTo(2, shY + 14); c.lineTo(14, shY + 12); c.fill();
        c.fillStyle = shade(col, -0.4); for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0, shY + 22 + i * 14, 2.2, 0, TAU); c.fill(); } break;
      default: // tee with a little print
        c.fillStyle = shade(col, col === '#111' || col === '#222' ? 0.5 : 0.45); c.beginPath(); c.arc(0, mid - 4, 11, 0, TAU); c.fill();
        c.fillStyle = col; c.beginPath(); c.arc(0, mid - 4, 4, 0, TAU); c.fill();
    }
    if (L.acc === 'chain') { c.strokeStyle = '#ffd34d'; c.lineWidth = 3; c.beginPath(); c.arc(0, shY + 4, 16, 0.25 * Math.PI, 0.75 * Math.PI); c.stroke(); }
  }

  function hairBack(c, L, hy) {
    const hc = L.hairCol; c.fillStyle = hc; c.strokeStyle = OUT; c.lineWidth = 3.2;
    if (L.hair === 'long') { rr(c, -40, hy - 22, 80, 96, 30); c.fill(); c.stroke(); }
    else if (L.hair === 'locs') { for (let i = -4; i <= 4; i++) { rr(c, i * 9 - 5, hy - 6, 11, 80 - Math.abs(i) * 4, 5); c.fill(); c.stroke(); } }
    else if (L.hair === 'braids') { for (const s of [-1, 1]) { rr(c, s * 34 - 6, hy - 6, 12, 64, 6); c.fill(); c.stroke(); } }
    else if (L.hair === 'afro') { c.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; c.moveTo(Math.cos(a) * 44, hy - 8 + Math.sin(a) * 40); c.arc(Math.cos(a) * 44, hy - 8 + Math.sin(a) * 40, 14, 0, TAU); } c.fill(); c.beginPath(); c.arc(0, hy - 8, 48, 0, TAU); c.fill(); c.stroke(); }
    else if (L.hair === 'curly') { c.beginPath(); for (let i = 0; i < 11; i++) { const a = Math.PI + i / 10 * Math.PI; c.moveTo(Math.cos(a) * 36, hy - 4 + Math.sin(a) * 32); c.arc(Math.cos(a) * 36, hy - 4 + Math.sin(a) * 32, 11, 0, TAU); } c.fill(); }
    else if (L.hair === 'bob') { rr(c, -40, hy - 30, 80, 66, 26); c.fill(); c.stroke(); }
    else if (L.hair === 'hood') { c.fillStyle = shade(L.col, -0.1); c.beginPath(); c.arc(0, hy - 2, 44, 0, TAU); c.fill(); c.stroke(); }
  }

  function head(c, L, hy, o) {
    const R = 34;
    c.fillStyle = L.skin; c.strokeStyle = OUT; c.lineWidth = 3.2;
    // ears
    for (const s of [-1, 1]) { c.beginPath(); c.arc(s * R, hy + 4, 8, 0, TAU); c.fill(); c.stroke(); }
    c.beginPath(); c.arc(0, hy, R, 0, TAU); c.fill();
    const hg = c.createRadialGradient(-12, hy - 14, 4, 0, hy, R); hg.addColorStop(0, 'rgba(255,255,255,.22)'); hg.addColorStop(0.6, 'rgba(255,255,255,0)'); hg.addColorStop(1, 'rgba(60,20,30,.16)');
    c.fillStyle = hg; c.beginPath(); c.arc(0, hy, R, 0, TAU); c.fill(); c.stroke(); c.fillStyle = L.skin;
    if (L.acc === 'beard') { c.fillStyle = L.hairCol; c.beginPath(); c.arc(0, hy + 6, R - 1, 0.1 * Math.PI, 0.9 * Math.PI); c.quadraticCurveTo(0, hy + R + 22, R * Math.cos(0.1 * Math.PI), hy + 6 + R * Math.sin(0.1 * Math.PI)); c.fill(); c.stroke(); }
    if (L.acc === 'earrings') { c.fillStyle = '#ffd34d'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * (R + 2), hy + 15, 4, 0, TAU); c.fill(); } }
    face(c, L, hy, o);
    hairFront(c, L, hy, R);
    // accessories on the face/head
    c.lineWidth = 3; c.strokeStyle = OUT;
    if (L.acc === 'glasses') { c.strokeStyle = '#2a1a24'; c.lineWidth = 2.6; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 13, hy, 10, 0, TAU); c.stroke(); } c.beginPath(); c.moveTo(-3, hy); c.lineTo(3, hy); c.stroke(); }
    if (L.acc === 'shades') { c.fillStyle = '#16121a'; for (const s of [-1, 1]) { rr(c, s * 13 - 12, hy - 8, 24, 15, 6); c.fill(); } c.fillRect(-4, hy - 4, 8, 3); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-20, hy - 5, 6, 2); c.fillRect(6, hy - 5, 6, 2); }
    if (L.acc === 'piercing') { c.fillStyle = '#c7c7d0'; c.beginPath(); c.arc(9, hy + 9, 2.5, 0, TAU); c.fill(); c.beginPath(); c.arc(-R - 2, hy + 8, 3, 0, TAU); c.fill(); }
    if (L.acc === 'headphones') { c.strokeStyle = '#222'; c.lineWidth = 5; c.beginPath(); c.arc(0, hy + 30, 26, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); c.fillStyle = '#e23b3b'; for (const s of [-1, 1]) { rr(c, s * 24 - 7, hy + 38, 14, 16, 5); c.fill(); } }
  }

  function face(c, L, hy, o) {
    const f = o.face || 'neutral';
    const blink = o.blink;
    const ey = hy - 2;
    // eyes
    for (const s of [-1, 1]) {
      const ex = s * 12;
      if (f === 'joy') { c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.arc(ex, ey + 3, 6, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); continue; }
      if (f === 'love') { c.fillStyle = '#ff3f7f'; c.beginPath(); c.moveTo(ex, ey + 6); c.bezierCurveTo(ex - 11, ey - 2, ex - 6, ey - 10, ex, ey - 4); c.bezierCurveTo(ex + 6, ey - 10, ex + 11, ey - 2, ex, ey + 6); c.fill(); continue; }
      if (f === 'sus' || f === 'smug') { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey + 1, 7, 4, 0, 0, TAU); c.fill(); c.fillStyle = '#20141c'; c.beginPath(); c.arc(ex + (f === 'sus' ? 2.5 : 0), ey + 1, 3, 0, TAU); c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(ex - 8, ey - 2); c.lineTo(ex + 8, ey - 2); c.stroke(); continue; }
      if (blink) { c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(ex - 5, ey); c.lineTo(ex + 5, ey); c.stroke(); continue; }
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, 7, f === 'wow' ? 9 : 8, 0, 0, TAU); c.fill();
      c.fillStyle = '#20141c'; c.beginPath(); c.arc(ex + (o.look || 0) * 2, ey + 1, f === 'wow' ? 3 : 4, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + 1.5, ey - 1.5, 1.3, 0, TAU); c.fill();
    }
    // brows
    c.strokeStyle = shade(L.hairCol || '#3b2414', -0.2); c.lineWidth = 3.4;
    const tilt = f === 'cross' || f === 'angry' ? 6 : f === 'meh' ? -2 : f === 'wow' ? -4 : f === 'sad' ? -6 : 0;
    for (const s of [-1, 1]) { const tt = f === 'sus' && s > 0 ? -5 : tilt; c.beginPath(); c.moveTo(s * 18, ey - 13 - (f === 'wow' ? 4 : 0) + (f === 'sad' ? 2 : 0)); c.lineTo(s * 6, ey - 13 + tt); c.stroke(); }
    if (f === 'angry') { c.fillStyle = 'rgba(230,40,40,.28)'; c.beginPath(); c.arc(0, hy, 33, 0, TAU); c.fill(); c.strokeStyle = '#c3001b'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(20, hy - 30); c.lineTo(28, hy - 22); c.moveTo(28, hy - 30); c.lineTo(20, hy - 22); c.stroke(); }
    // cheeks
    if (f === 'joy' || f === 'happy' || f === 'love') { c.fillStyle = 'rgba(255,90,110,.35)'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 20, hy + 10, 7, 4, 0, 0, TAU); c.fill(); } }
    // nose
    c.strokeStyle = shade(L.skin, -0.3); c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, hy + 2); c.quadraticCurveTo(4, hy + 8, -1, hy + 10); c.stroke();
    // mouth
    c.strokeStyle = OUT; c.lineWidth = 3; c.fillStyle = '#7a1f2e';
    const my = hy + 18;
    if (f === 'joy') { c.beginPath(); c.arc(0, my - 3, 11, 0.05 * Math.PI, 0.95 * Math.PI); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(-7, my - 3, 14, 3); }
    else if (f === 'happy') { c.beginPath(); c.arc(0, my - 6, 9, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
    else if (f === 'wow') { c.beginPath(); c.ellipse(0, my, 5, 7, 0, 0, TAU); c.fill(); c.stroke(); }
    else if (f === 'cross') { c.beginPath(); c.arc(0, my + 6, 9, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke(); }
    else if (f === 'meh') { c.beginPath(); c.moveTo(-7, my); c.lineTo(7, my - 2); c.stroke(); }
    else if (f === 'talk') { c.beginPath(); c.ellipse(0, my - 1, 7, 3 + Math.abs(Math.sin((o.t || 0) * 18)) * 4, 0, 0, TAU); c.fill(); c.stroke(); }
    else if (f === 'sad') { c.beginPath(); c.arc(0, my + 6, 8, 1.2 * Math.PI, 1.8 * Math.PI); c.stroke(); c.fillStyle = '#7fc8ff'; c.beginPath(); c.moveTo(-12, ey + 8); c.quadraticCurveTo(-17, ey + 18, -12, ey + 20); c.quadraticCurveTo(-7, ey + 18, -12, ey + 8); c.fill(); }
    else if (f === 'angry') { c.fillStyle = '#7a1f2e'; c.beginPath(); c.ellipse(0, my + 1, 9, 4, 0, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(-7, my - 1, 14, 2); }
    else if (f === 'smug') { c.beginPath(); c.moveTo(-8, my - 1); c.quadraticCurveTo(2, my + 3, 10, my - 6); c.stroke(); }
    else if (f === 'sus') { c.beginPath(); c.moveTo(-7, my); c.lineTo(7, my); c.stroke(); }
    else if (f === 'love') { c.beginPath(); c.arc(0, my - 6, 9, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
    else { c.beginPath(); c.arc(0, my - 4, 6, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
  }

  function hairFront(c, L, hy, R) {
    const hc = L.hairCol; c.fillStyle = hc; c.strokeStyle = OUT; c.lineWidth = 3.2;
    switch (L.hair) {
      case 'short': case 'braids': c.beginPath(); c.arc(0, hy - 4, R + 1, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(10, hy - 22, -R, hy - 6); c.fill(); c.stroke(); break;
      case 'quiff': c.beginPath(); c.arc(0, hy - 4, R + 1, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(26, hy - 60, -20, hy - 52); c.quadraticCurveTo(-34, hy - 40, -R, hy - 8); c.fill(); c.stroke(); break;
      case 'shaggy': case 'long': c.beginPath(); c.arc(0, hy - 2, R + 3, Math.PI * 1.0, Math.PI * 2.0); for (let i = 0; i < 6; i++) c.lineTo(R - i * 13, hy - 12 + (i % 2) * 10); c.closePath(); c.fill(); c.stroke(); break;
      case 'mohawk': for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(-7, hy - R + 6 + Math.abs(i) * 2 - i * 0); c.lineTo(i * 4, hy - R - 34 + Math.abs(i) * 5); c.lineTo(7, hy - R + 6); c.closePath(); c.fill(); c.stroke(); } break;
      case 'spiky': c.beginPath(); c.moveTo(-R, hy - 6); for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; c.lineTo(Math.cos(a) * (R + (i % 2 ? 16 : 2)), hy - 4 + Math.sin(a) * (R + (i % 2 ? 16 : 2))); } c.closePath(); c.fill(); c.stroke(); break;
      case 'bob': c.beginPath(); c.arc(0, hy - 4, R + 2, Math.PI * 1.0, Math.PI * 2.0); c.lineTo(R + 2, hy - 8); c.lineTo(-R - 2, hy - 8); c.fill(); c.fillRect(-R - 2, hy - 14, 2 * R + 4, 10); break;
      case 'bun': c.beginPath(); c.arc(0, hy - R - 8, 15, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(0, hy - 4, R + 1, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(0, hy - 18, -R, hy - 8); c.fill(); c.stroke(); break;
      case 'afro': case 'curly': c.beginPath(); c.arc(0, hy - 6, R + 4, Math.PI * 1.05, Math.PI * 1.95); c.quadraticCurveTo(0, hy - 16, -R, hy - 10); c.fill(); break;
      case 'locs': c.beginPath(); c.arc(0, hy - 4, R + 2, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(0, hy - 14, -R, hy - 6); c.fill(); c.stroke(); break;
      case 'cap': c.fillStyle = shade(L.col, -0.05); c.beginPath(); c.arc(0, hy - 6, R + 2, Math.PI, TAU); c.closePath(); c.fill(); c.stroke(); rr(c, -R - 2, hy - 12, 2 * R + 30, 10, 5); c.fill(); c.stroke(); break;
      case 'beret': c.fillStyle = '#1b1b24'; c.beginPath(); c.ellipse(-6, hy - R + 2, R + 6, 14, -0.15, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(-4, hy - R - 12, 3, 0, TAU); c.fill(); break;
      case 'tam': { const cols = ['#d12d2d', '#ffd000', '#2fb35a']; for (let i = 0; i < 3; i++) { c.fillStyle = cols[i]; c.beginPath(); c.ellipse(0, hy - R - 2 - i * 9, R + 8 - i * 4, 11, 0, 0, TAU); c.fill(); c.stroke(); } break; }
      case 'buckethat': c.fillStyle = L.col; c.beginPath(); c.ellipse(0, hy - 14, R + 14, 9, 0, 0, TAU); c.fill(); c.stroke(); rr(c, -R + 4, hy - R - 14, 2 * R - 8, 30, 12); c.fill(); c.stroke(); break;
      case 'beanie': c.fillStyle = shade(L.col, 0.1); c.beginPath(); c.arc(0, hy - 16, R + 2, Math.PI, TAU); c.closePath(); c.fill(); c.stroke(); rr(c, -R - 3, hy - 27, 2 * R + 6, 12, 5); c.fill(); c.stroke(); break;
      case 'hood': c.fillStyle = shade(L.col, -0.1); c.beginPath(); c.arc(0, hy - 2, R + 9, Math.PI * 0.95, Math.PI * 2.05); c.lineTo(R - 2, hy + 4); c.arc(0, hy, R - 4, 0, Math.PI, true); c.closePath(); c.fill(); c.stroke(); break;
      case 'bald': c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(-10, hy - 22, 9, 5, -0.4, 0, TAU); c.fill(); break;
    }
  }

  // ---------- the shop cat ----------
  function cat(c, x, y, sc, t, flip, sleeping) {
    c.save(); c.translate(x, y); c.scale(sc * (flip ? -1 : 1), sc);
    c.fillStyle = '#3a3036'; c.strokeStyle = OUT; c.lineWidth = 3;
    c.fillStyle = 'rgba(30,10,20,.2)'; c.beginPath(); c.ellipse(0, 2, 34, 6, 0, 0, TAU); c.fill();
    c.fillStyle = '#ef9a3a';
    if (sleeping) { c.beginPath(); c.ellipse(0, -14, 30, 16, 0, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.arc(22, -20, 13, 0, TAU); c.fill(); c.stroke(); c.strokeStyle = OUT; c.beginPath(); c.moveTo(17, -20); c.lineTo(22, -19); c.moveTo(25, -19); c.lineTo(30, -20); c.stroke(); c.restore(); return; }
    const w = Math.sin(t * 8);
    c.beginPath(); c.moveTo(-26, -24); c.quadraticCurveTo(-48, -40 + w * 6, -40, -60 + w * 4); c.lineWidth = 7; c.strokeStyle = '#ef9a3a'; c.stroke(); c.lineWidth = 3; c.strokeStyle = OUT;
    c.beginPath(); c.ellipse(0, -24, 30, 16, 0, 0, TAU); c.fill(); c.stroke();
    for (const lx of [-18, -8, 10, 20]) { rr(c, lx - 4, -14 + (lx % 20 ? Math.max(0, w) * 3 : 0), 8, 16, 4); c.fill(); c.stroke(); }
    c.beginPath(); c.arc(26, -38, 15, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(16, -48); c.lineTo(18, -62); c.lineTo(26, -52); c.moveTo(30, -52); c.lineTo(38, -62); c.lineTo(38, -46); c.fill(); c.stroke();
    c.fillStyle = '#20141c'; c.beginPath(); c.arc(21, -39, 2.5, 0, TAU); c.arc(32, -39, 2.5, 0, TAU); c.fill();
    c.fillStyle = '#d0603a'; for (const sx of [-14, -2, 10]) { c.beginPath(); c.ellipse(sx, -34, 3, 8, 0.2, 0, TAU); c.fill(); }
    c.restore();
  }


  // ---------- rooms: one per stage of the relationship ----------
  const ROOMS = [
    { name: 'date', wall: ['#5a2a5e', '#8a3f78'], floor: '#7a4a4a', night: true, props: ['window', 'lights', 'candle', 'frames'] },
    { name: 'flat', wall: ['#3d5a80', '#5b7aa0'], floor: '#8a6a4a', props: ['window', 'sofa', 'lamp', 'frames'] },
    { name: 'moving', wall: ['#e2d6c2', '#f0e6d6'], floor: '#b98b5e', props: ['window', 'boxes', 'lamp', 'plant'] },
    { name: 'wedding', wall: ['#f3c7d6', '#fbe3ea'], floor: '#c79a7a', props: ['window', 'bunting', 'sofa', 'plant'] },
    { name: 'home', wall: ['#8fb9a8', '#b4d4c6'], floor: '#9a7656', props: ['window', 'kitchen', 'frames', 'plant'] },
    { name: 'family', wall: ['#f2c14e', '#f7d77f'], floor: '#8a6a4a', props: ['window', 'sofa', 'toys', 'frames'] },
    { name: 'golden', wall: ['#c9a27a', '#e2c7a2'], floor: '#7a5a3a', props: ['window', 'armchair', 'plant', 'frames'] },
  ];
  const roomCache = {};
  function room(W, H, i) {
    const key = i; if (roomCache[key]) return roomCache[key];
    const R = ROOMS[i] || ROOMS[0];
    const cv = G.document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, H * 0.72); g.addColorStop(0, R.wall[0]); g.addColorStop(1, R.wall[1]); c.fillStyle = g; c.fillRect(0, 0, W, H);
    // wallpaper stripes
    c.fillStyle = 'rgba(255,255,255,.05)'; for (let x = 0; x < W; x += 60) c.fillRect(x, 0, 30, H * 0.72);
    // skirting + floorboards
    const fy = H * 0.72;
    const fg = c.createLinearGradient(0, fy, 0, H); fg.addColorStop(0, shade(R.floor, -0.25)); fg.addColorStop(1, shade(R.floor, 0.12)); c.fillStyle = fg; c.fillRect(0, fy, W, H - fy);
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 2; for (let y = fy + 18; y < H; y += 22 + (y - fy) * 0.15) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    for (let k = 0; k < 40; k++) { const y = fy + ((k * 53) % (H - fy)), x = (k * 211) % W; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 20); c.stroke(); }
    c.fillStyle = '#f4efe1'; c.fillRect(0, fy - 10, W, 12); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(0, fy + 2, W, 4);
    // rug in the middle of the room
    c.save(); c.translate(W / 2, fy + 110); c.scale(1, 0.22);
    ['#e0607e', '#ffd0a8', '#e0607e', '#fff0e0'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(0, 0, 420 - i * 70, 0, TAU); c.fill(); });
    c.restore();
    for (const p of R.props) prop(c, p, W, H, fy, R);
    // warm light pooling in the middle, soft vignette at the edges
    c.save(); c.globalCompositeOperation = 'soft-light'; const wl = c.createRadialGradient(W / 2, H * 0.4, 40, W / 2, H * 0.45, W * 0.6); wl.addColorStop(0, 'rgba(255,220,170,.9)'); wl.addColorStop(1, 'rgba(255,220,170,0)'); c.fillStyle = wl; c.fillRect(0, 0, W, H); c.restore();
    const v = c.createRadialGradient(W / 2, H * 0.45, H * 0.4, W / 2, H * 0.5, H * 1.05); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,0,20,.38)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
    roomCache[key] = cv; return cv;
  }

  function prop(c, p, W, H, fy, R) {
    c.strokeStyle = OUT; c.lineWidth = 3;
    switch (p) {
      case 'window': {
        const x = 70, y = 90, w = 260, h = 250;
        const sky = c.createLinearGradient(0, y, 0, y + h); sky.addColorStop(0, R.night ? '#141a3a' : '#8fd0ff'); sky.addColorStop(1, R.night ? '#3a2a5a' : '#e1f4ff'); c.fillStyle = sky; c.fillRect(x, y, w, h);
        if (R.night) { c.fillStyle = '#fff6c8'; c.beginPath(); c.arc(x + 200, y + 60, 22, 0, TAU); c.fill(); c.fillStyle = sky; c.beginPath(); c.arc(x + 210, y + 54, 20, 0, TAU); c.fill(); for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(x + (i * 37) % w, y + (i * 23) % (h * 0.5), 2, 2); } }
        const bc = R.night ? ['#1f2440', '#2a2f52', '#252a48'] : ['#c98b6a', '#a8705a', '#d8b48a'];
        for (let i = 0; i < 5; i++) { c.fillStyle = bc[i % 3]; c.fillRect(x + i * 56 - 6, y + 120 + (i % 2) * 30, 52, h); c.fillStyle = R.night ? 'rgba(255,220,120,.8)' : 'rgba(255,255,255,.5)'; for (let r = 0; r < 3; r++) c.fillRect(x + i * 56 + 6, y + 140 + (i % 2) * 30 + r * 34, 10, 14); }
        c.strokeStyle = '#f4efe1'; c.lineWidth = 12; c.strokeRect(x, y, w, h); c.lineWidth = 6; c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2); c.stroke();
        c.fillStyle = '#e9b44c'; c.fillRect(x - 30, y - 18, w + 60, 10);
        c.fillStyle = shade(R.wall[1], -0.35); for (const sx of [x - 26, x + w - 14]) { c.beginPath(); c.moveTo(sx, y - 8); c.quadraticCurveTo(sx + 30, y + h / 2, sx + 6, y + h + 30); c.lineTo(sx + 40, y + h + 30); c.quadraticCurveTo(sx + 50, y + h / 2, sx + 40, y - 8); c.fill(); }
        break; }
      case 'lights': { c.strokeStyle = '#1e1020'; c.lineWidth = 2; c.beginPath(); for (let k = 0; k <= 30; k++) { const x = k / 30 * W, y = 30 + Math.sin(k / 30 * Math.PI * 3) * 18 + 20; k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); for (let k = 1; k < 30; k++) { const x = k / 30 * W, y = 54 + Math.sin(k / 30 * Math.PI * 3) * 18; c.fillStyle = ['#ffd34d', '#ff8ac0', '#9ff0e0'][k % 3]; c.shadowColor = c.fillStyle; c.shadowBlur = 14; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill(); } c.shadowBlur = 0; break; }
      case 'candle': { const x = W - 260, y = fy - 10; c.fillStyle = '#7a1f2e'; rr(c, x - 120, y - 70, 240, 16, 6); c.fill(); c.stroke(); c.fillStyle = '#5a3a2a'; c.fillRect(x - 6, y - 54, 12, 64); c.fillStyle = '#fff4d6'; rr(c, x - 8, y - 112, 16, 42, 4); c.fill(); c.stroke(); c.fillStyle = '#ffcf3f'; c.shadowColor = '#ffb000'; c.shadowBlur = 24; c.beginPath(); c.ellipse(x, y - 122, 6, 11, 0, 0, TAU); c.fill(); c.shadowBlur = 0; c.fillStyle = '#c3001b'; c.beginPath(); c.arc(x + 60, y - 80, 9, 0, TAU); c.fill(); c.fillStyle = '#e8e2f0'; rr(c, x - 90, y - 98, 30, 30, 4); c.fill(); break; }
      case 'frames': for (let i = 0; i < 3; i++) { const x = W - 380 + i * 110, y = 110 + (i % 2) * 30; c.fillStyle = '#c98b3c'; c.fillRect(x - 6, y - 6, 82, 92); c.fillStyle = ['#ffd6e0', '#cfe8ff', '#d8f5c8'][i]; c.fillRect(x, y, 70, 80); c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.arc(x + 26, y + 34, 10, 0, TAU); c.arc(x + 46, y + 34, 10, 0, TAU); c.fill(); c.fillRect(x + 14, y + 48, 44, 26); c.fillStyle = '#ff3f7f'; c.font = '16px sans-serif'; c.fillText('♥', x + 30, y + 22); } break;
      case 'sofa': { const x = W - 470, y = fy + 20; c.fillStyle = '#c85a54'; rr(c, x, y - 120, 360, 90, 26); c.fill(); c.stroke(); rr(c, x - 20, y - 70, 400, 70, 22); c.fill(); c.stroke(); c.fillStyle = '#ffd34d'; rr(c, x + 40, y - 110, 60, 50, 12); c.fill(); c.stroke(); c.fillStyle = '#7fc8ff'; rr(c, x + 260, y - 110, 60, 50, 12); c.fill(); c.stroke(); break; }
      case 'armchair': { const x = W - 360, y = fy + 20; c.fillStyle = '#6b8f45'; rr(c, x, y - 150, 200, 120, 30); c.fill(); c.stroke(); rr(c, x - 20, y - 70, 240, 70, 22); c.fill(); c.stroke(); c.fillStyle = '#f4efe1'; rr(c, x + 70, y - 140, 60, 40, 6); c.fill(); break; }
      case 'lamp': { const x = 470, y = fy + 6; c.fillStyle = '#2a1a24'; c.fillRect(x - 3, y - 230, 6, 230); c.fillRect(x - 30, y - 6, 60, 8); c.fillStyle = '#f2a93b'; c.beginPath(); c.moveTo(x - 30, y - 230); c.lineTo(x + 30, y - 230); c.lineTo(x + 46, y - 180); c.lineTo(x - 46, y - 180); c.closePath(); c.fill(); c.stroke(); const lg = c.createRadialGradient(x, y - 180, 6, x, y - 140, 160); lg.addColorStop(0, 'rgba(255,220,140,.4)'); lg.addColorStop(1, 'rgba(255,220,140,0)'); c.fillStyle = lg; c.fillRect(x - 170, y - 200, 340, 260); break; }
      case 'plant': { const x = 440, y = fy + 10; [[-0.8, 90], [-0.3, 120], [0.2, 130], [0.7, 96]].forEach(([a, l], i) => { c.save(); c.translate(x, y - 50); c.rotate(a); c.fillStyle = i % 2 ? '#2f8a4f' : '#3fa45f'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-24, -l * 0.55, 0, -l); c.quadraticCurveTo(24, -l * 0.55, 0, 0); c.fill(); c.stroke(); c.restore(); }); c.fillStyle = '#c86a3d'; c.beginPath(); c.moveTo(x - 30, y - 56); c.lineTo(x + 30, y - 56); c.lineTo(x + 22, y); c.lineTo(x - 22, y); c.closePath(); c.fill(); c.stroke(); break; }
      case 'boxes': for (let i = 0; i < 5; i++) { const x = W - 420 + (i % 3) * 110 + (i > 2 ? 50 : 0), y = fy + 30 - (i > 2 ? 100 : 0); c.fillStyle = '#c9965a'; rr(c, x, y - 100, 104, 100, 4); c.fill(); c.stroke(); c.fillStyle = '#e8d6a8'; c.fillRect(x + 40, y - 100, 24, 100); c.fillStyle = '#2a1a24'; c.font = '700 13px Fredoka, sans-serif'; c.fillText(['KITCHEN', 'MISC??', 'CABLES', 'FRAGILE', 'YOUR STUFF'][i], x + 8, y - 30); } break;
      case 'bunting': { c.strokeStyle = '#1e1020'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 40); c.quadraticCurveTo(W / 2, 110, W, 40); c.stroke(); for (let k = 1; k < 20; k++) { const u = k / 20, x = u * W, y = 40 + 4 * u * (1 - u) * 70; c.fillStyle = ['#ff8ac0', '#fff', '#ffd34d'][k % 3]; c.beginPath(); c.moveTo(x - 16, y); c.lineTo(x + 16, y); c.lineTo(x, y + 30); c.closePath(); c.fill(); c.stroke(); } break; }
      case 'kitchen': { const x = W - 520; c.fillStyle = '#f4efe1'; c.fillRect(x, fy - 140, 460, 140); c.strokeRect(x, fy - 140, 460, 140); c.fillStyle = '#5b6470'; c.fillRect(x - 10, fy - 150, 480, 14); for (let i = 0; i < 4; i++) { c.strokeRect(x + 10 + i * 112, fy - 126, 100, 116); c.fillStyle = '#c0c4cc'; c.fillRect(x + 50 + i * 112, fy - 70, 22, 5); } c.fillStyle = '#e8e2f0'; for (let i = 0; i < 3; i++) { rr(c, x + 40 + i * 150, fy - 340, 110, 90, 4); c.fill(); c.stroke(); } c.fillStyle = '#c3001b'; rr(c, x + 300, fy - 190, 50, 40, 8); c.fill(); c.stroke(); break; }
      case 'toys': { const y = fy + 50; [['#e5483b', 620], ['#2f9bff', 700], ['#ffcf3f', 760]].forEach(([col, x], i) => { c.fillStyle = col; rr(c, x, y - 40 - i * 4, 44, 44, 4); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.font = '900 22px Fredoka'; c.fillText('ABC'[i], x + 14, y - 10 - i * 4); }); c.fillStyle = '#ff8ac0'; c.beginPath(); c.arc(860, y - 20, 24, 0, TAU); c.fill(); c.stroke(); break; }
    }
  }

  // A Reigns-style card with the speaker on it.
  function card(c, x, y, w, h, o) {
    // o: { look, face, arm, t, tint, rot, name, blink, cat }
    c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(o.rot || 0); c.translate(-w / 2, -h / 2);
    c.fillStyle = 'rgba(20,0,20,.35)'; rr(c, 6, 12, w, h, 26); c.fill();
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, shade(o.tint || '#ff8ac0', 0.35)); g.addColorStop(1, o.tint || '#ff8ac0');
    c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 5; rr(c, 0, 0, w, h, 26); c.fill();
    c.save(); rr(c, 0, 0, w, h, 26); c.clip();
    // sunburst behind the character
    c.globalAlpha = 0.18; c.fillStyle = '#fff'; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + (o.t || 0) * 0.08; c.beginPath(); c.moveTo(w / 2, h * 0.42); c.lineTo(w / 2 + Math.cos(a) * w, h * 0.42 + Math.sin(a) * w); c.lineTo(w / 2 + Math.cos(a + 0.18) * w, h * 0.42 + Math.sin(a + 0.18) * w); c.fill(); } c.globalAlpha = 1;
    if (o.cat) cat(c, w / 2 - 20, h * 0.86, 2.6, o.t || 0, false, false);
    else if (o.look) person(c, o.look, w / 2, h * 1.5, h / 205, { face: o.face, arm: o.arm, t: o.t, blink: o.blink });
    c.restore();
    c.lineWidth = 5; rr(c, 0, 0, w, h, 26); c.stroke();
    if (o.name) { c.fillStyle = '#fff4dc'; rr(c, w / 2 - 110, h - 44, 220, 34, 14); c.fill(); c.lineWidth = 3; c.stroke(); c.fillStyle = OUT; c.font = '700 19px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillText(o.name, w / 2, h - 20); }
    c.restore();
  }

  function cardBack(c, x, y, w, h, t) {
    c.save(); c.fillStyle = '#3a1030'; c.strokeStyle = OUT; c.lineWidth = 5; rr(c, x, y, w, h, 26); c.fill(); c.stroke();
    c.fillStyle = '#ff5fa2'; c.font = '120px sans-serif'; c.textAlign = 'center'; c.fillText('♥', x + w / 2, y + h / 2 + 40);
    c.restore();
  }

  G.NIF_ART = { person, cat, room, card, cardBack, rr, shade, ROOMS };
})(typeof window !== 'undefined' ? window : globalThis);
