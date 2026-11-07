// Language checks: every dictionary has exactly the English keys, nothing is empty, {placeholders} survive translation,
// the picker offers exactly the six languages, and a missing key falls back to English instead of showing the raw key.
const assert = require('assert');
const CODES = ['en', 'fr', 'de', 'es', 'hi', 'zh-Hans'];
for (const c of CODES) require('../src/i18n/' + c + '.js');
require('../src/i18n.js'); require('../src/data.js'); require('../src/cards.js'); require('../src/engine.js');
const I = globalThis.I18N, DICTS = globalThis.I18N_DICTS, D = globalThis.NIF_DATA, E = globalThis.NIF, K = globalThis.NIF_CARDS;
const en = DICTS.en, enKeys = Object.keys(en);

// the picker: exactly these six, in this order, each in its own language
assert.deepStrictEqual(I.LANGS.map(l => l.code), CODES, 'picker lists exactly the six languages');
assert.deepStrictEqual(I.LANGS.map(l => l.label), ['English', 'Français', 'Deutsch', 'Español', 'हिन्दी', '简体中文']);

// Pronoun tokens are grammar, not data: a translation may restructure the sentence (Chinese drops pronouns, German uses the
// name), so they are optional. Every other {placeholder} in English must appear in each translation.
const GRAMMAR = new Set(['they', 'them', 'their', 'theyre', 'They']);
const KNOWN = new Set(['P', 'they', 'them', 'their', 'theyre', 'They', 'role', 'your', 'name', 'day', 'found', 'total', 'n', 'item', 'desc', 'stage', 'a', 'b', 'word', 'q']);
const tokens = s => (s.replace(/\{g:[^{}]*(\{P\}[^{}]*)*\}/g, m => (m.includes('{P}') ? ' {P} ' : ' ')).match(/\{(\w+)\}/g) || []).map(x => x.slice(1, -1));
let checked = 0;
for (const code of CODES) {
  const d = DICTS[code];
  assert(d, 'dictionary ' + code + ' is loaded');
  const keys = Object.keys(d);
  const missing = enKeys.filter(k => !(k in d)), extra = keys.filter(k => !(k in en));
  assert.deepStrictEqual(missing, [], code + ': missing keys');
  assert.deepStrictEqual(extra, [], code + ': unknown keys');
  for (const k of keys) {
    const v = d[k];
    assert(typeof v === 'string' && v.trim() !== '', `${code}: empty string for ${k}`);
    const have = new Set(tokens(v));
    for (const tk of have) assert(KNOWN.has(tk), `${code}: unknown token {${tk}} in ${k}`);
    for (const tk of tokens(en[k])) if (!GRAMMAR.has(tk)) assert(have.has(tk), `${code}: ${k} lost {${tk}}: ${v}`);
    for (const g of v.match(/\{g:[^{}]*(?:\{P\}[^{}]*)*\}/g) || []) assert.strictEqual(g.slice(3, -1).split('|').length, 3, `${code}: ${k} {g:...} needs three forms (feminine|masculine|neutral)`);
    if (/<b>/.test(en[k])) assert.strictEqual((v.match(/<b>/g) || []).length, (v.match(/<\/b>/g) || []).length, `${code}: ${k} unbalanced <b>`);
    assert(!/<(?!\/?b>)/.test(v), `${code}: ${k} has markup other than <b>`);
    checked++;
  }
}

// fallback: a key missing in the current language comes from English; an unknown key never shows the raw key
I.setLang('fr');
assert.strictEqual(I.getLang(), 'fr');
const saved = DICTS.fr['title.how']; delete DICTS.fr['title.how'];
assert.strictEqual(I.t('title.how'), en['title.how'], 'missing key falls back to English');
DICTS.fr['title.how'] = saved;
assert.strictEqual(I.t('title.how'), saved);
const warn = console.warn; console.warn = () => {};
assert.strictEqual(I.t('no.such.key'), '', 'an unknown key never shows the raw key');
console.warn = warn;
assert.strictEqual(I.setLang('xx'), false, 'unknown codes are refused'); assert.strictEqual(I.getLang(), 'fr');
assert.strictEqual(I.t('title.continue', { name: 'Jess', day: 3 }), 'Continuer avec Jess (jour 3)');
assert.strictEqual(I.tp('end.record', 1), 'Ton record : 1 jour');
assert.strictEqual(I.tp('end.record', 12), 'Ton record : 12 jours');
I.setLang('de'); assert.strictEqual(I.num(40000), '40.000');
I.setLang('en');

// first run: navigator.languages picks one of the six, zh-CN/zh-SG/zh-Hans/zh → zh-Hans, anything else → English
const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const detectWith = langs => { Object.defineProperty(globalThis, 'navigator', { value: { languages: langs, language: langs[0] }, configurable: true }); return I.detect(); };
try {
  assert.strictEqual(detectWith(['fr-CA']), 'fr'); assert.strictEqual(detectWith(['de-AT', 'en']), 'de');
  assert.strictEqual(detectWith(['es-419']), 'es'); assert.strictEqual(detectWith(['hi-IN']), 'hi');
  for (const z of ['zh-CN', 'zh-SG', 'zh-Hans', 'zh', 'zh-Hans-CN']) assert.strictEqual(detectWith([z]), 'zh-Hans', z);
  assert.strictEqual(detectWith(['zh-TW', 'ja']), 'en'); assert.strictEqual(detectWith(['pt-BR', 'es-MX']), 'es');
  assert.strictEqual(detectWith(['nl']), 'en');
} finally { if (nav) Object.defineProperty(globalThis, 'navigator', nav); else delete globalThis.navigator; }

// every text the game fills in, in every language, for every role and stage: no raw {token}, no leftovers
let filled = 0;
for (const code of CODES) {
  I.setLang(code);
  for (const role of Object.keys(D.ROLES)) for (let st = 0; st <= 6; st++) {
    const S = E.newRun('jess', role); S.stage = st;
    for (const k of enKeys) {
      if (/^(card|role)\./.test(k)) continue; // cards are covered by test/sim.js; role.* are the token values themselves
      const out = E.tx(S, k, { name: 'Jess', day: 1, found: 1, total: 13, n: 2, item: 'X', desc: 'Y', stage: 'Z', role: 'R', your: 'W', a: 'A', b: 'B', word: 'V', q: 'Q' });
      assert(out && !/[{}]/.test(out), `${code}/${role}/${st}: ${k} → ${out}`);
      filled++;
    }
  }
}
I.setLang('en');
assert(K.CARDS.every(c => en[c.text] && en[c.L[0]] && en[c.R[2]]), 'every card has English text');

console.log(`i18n: ${CODES.length} languages × ${enKeys.length} keys checked (${checked} strings, ${filled} filled-in texts); all passed`);
