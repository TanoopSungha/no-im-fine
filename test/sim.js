// Headless test: checks every card is well-formed, then plays many runs with a careful bot and a random one.
require('../src/data.js'); require('../src/cards.js'); require('../src/engine.js');
const assert = require('assert');
const D = globalThis.NIF_DATA, K = globalThis.NIF_CARDS, E = globalThis.NIF;

const ids = new Set();
for (const c of K.CARDS) {
  assert(!ids.has(c.id), 'duplicate card ' + c.id); ids.add(c.id);
  assert(D.CAST[c.who] || c.who === 'p', 'unknown speaker ' + c.who);
  for (const side of ['L', 'R']) {
    const ch = c[side]; assert(ch && ch[0] && ch[1] && ch[2], c.id + ' ' + side);
    for (const k in ch[1]) assert('lpsm'.includes(k), c.id + ' fx key ' + k);
    if (ch[4] && ch[4].risk) assert(D.ENDINGS[ch[4].risk[2]], 'ending ' + ch[4].risk[2]);
  }
  for (const role of Object.keys(D.ROLES)) { const S = E.newRun('jess', role); for (const t of [c.text, c.L[2], c.R[2]]) assert(!/\{\w+\}/.test(E.fmt(S, t)), 'unfilled token in ' + c.id); }
}
for (let s = 0; s <= 6; s++) assert(K.CARDS.filter(c => c.st[0] <= s && s <= c.st[1]).length >= 12, 'enough cards for stage ' + s);

E.setRandom(D.rng(4242));
function run(careful) {
  const S = E.newRun(D.PARTNERS[Math.floor(Math.random() * 6)].id, ['girlfriend', 'boyfriend', 'partner'][Math.floor(Math.random() * 3)]);
  let guard = 0;
  while (!S.ended && guard++ < 2000) {
    const cur = E.next(S);
    if (cur.game) { E.gameResult(S, cur.game, careful ? (Math.random() < 0.8 ? 1 : 0.3) : Math.random()); continue; }
    const card = E.cardById(cur.id);
    let side;
    if (careful) {
      const score = sd => { let d = 0; for (const [k, key] of [['l', 'love'], ['p', 'patience'], ['s', 'sanity'], ['m', 'money']]) { const v = S.m[key] + (card[sd][1][k] || 0); d += Math.pow(v - 50, 2); } return d; };
      side = score('L') <= score('R') ? 'L' : 'R';
      for (const [k, v] of Object.entries(S.m)) if ((v < 18 || v > 82) && S.items.length) { const i = S.items.findIndex(it => D.ITEMS[it].fx && Object.keys(D.ITEMS[it].fx)[0] === k && v < 50); if (i >= 0) E.useItem(S, i); }
    } else side = Math.random() < 0.5 ? 'L' : 'R';
    const r = E.choose(S, side); assert(r && r.reply);
    for (const v of Object.values(S.m)) assert(v >= 0 && v <= 100);
  }
  assert(S.ended && D.ENDINGS[S.ended], 'run ends with a known ending');
  return S;
}
const careful = [], random = [];
for (let i = 0; i < 300; i++) { careful.push(run(true)); random.push(run(false)); }
const avg = a => Math.round(a.reduce((x, s) => x + s.day, 0) / a.length);
const endings = a => { const o = {}; a.forEach(s => o[s.ended] = (o[s.ended] || 0) + 1); return o; };
console.log('careful bot: average', avg(careful), 'days, golden', careful.filter(s => s.ended === 'golden').length + '/300', endings(careful));
console.log('random bot:  average', avg(random), 'days, golden', random.filter(s => s.ended === 'golden').length + '/300', endings(random));
assert(avg(careful) > avg(random) * 1.5, 'careful play should last much longer');
assert(careful.some(s => s.ended === 'golden'), 'the happy ending must be reachable');
assert(careful.filter(s => s.ended === 'golden').length < 240, 'but not too easy');
console.log(K.CARDS.length + ' cards; all tests passed');
