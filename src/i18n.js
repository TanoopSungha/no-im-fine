// No, I'm Fine.: languages. Dictionaries live in src/i18n/<code>.js and register themselves in I18N_DICTS.
// t(key, vars) looks the key up in the current language, falls back to English, and never shows a raw key.
// Switching language fires a 'langchange' event on window so every screen redraws straight away.
(function (G) {
  'use strict';
  const GAME = 'no-im-fine';
  const STORE = GAME + '-lang';
  const LANGS = [
    { code: 'en', label: 'English', locale: 'en-GB' },
    { code: 'fr', label: 'Français', locale: 'fr-FR' },
    { code: 'de', label: 'Deutsch', locale: 'de-DE' },
    { code: 'es', label: 'Español', locale: 'es-ES' },
    { code: 'hi', label: 'हिन्दी', locale: 'hi-IN' },
    { code: 'zh-Hans', label: '简体中文', locale: 'zh-Hans-CN' },
  ];
  // Added after the game's own fonts everywhere text is drawn, so Hindi and Chinese have glyphs on every platform.
  const FONT_FALLBACK = '"Noto Sans Devanagari", "Nirmala UI", "Kohinoor Devanagari", "Noto Sans SC", "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif';
  const dicts = () => G.I18N_DICTS || {};
  const known = code => LANGS.some(l => l.code === code);

  function storage() { try { return G.localStorage || null; } catch (e) { return null; } }
  function detect() {
    let list = [];
    try { const n = G.navigator; list = (n && (n.languages && n.languages.length ? n.languages : [n.language])) || []; } catch (e) { list = []; }
    for (const raw of list) {
      const l = String(raw || '').toLowerCase();
      if (/^fr\b/.test(l)) return 'fr';
      if (/^de\b/.test(l)) return 'de';
      if (/^es\b/.test(l)) return 'es';
      if (/^hi\b/.test(l)) return 'hi';
      if (l === 'zh' || /^zh-(cn|sg|hans)\b/.test(l)) return 'zh-Hans';
      if (/^en\b/.test(l)) return 'en';
    }
    return 'en';
  }
  let cur = (() => {
    try { const s = storage(); const v = s && s.getItem(STORE); if (v && known(v)) return v; } catch (e) { /* private mode */ }
    return detect();
  })();

  const getLang = () => cur;
  const info = () => LANGS.find(l => l.code === cur) || LANGS[0];
  const locale = () => info().locale;

  function raw(key) {
    const d = dicts(), here = d[cur], en = d.en || {};
    if (here && typeof here[key] === 'string' && here[key] !== '') return here[key];
    if (typeof en[key] === 'string') return en[key];
    return null;
  }
  const has = key => raw(key) != null;
  function fill(s, vars) {
    if (!vars) return s;
    return s.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));
  }
  function t(key, vars) {
    const s = raw(key);
    if (s == null) { if (G.console) G.console.warn('[i18n] missing key', key); return ''; }
    return fill(s, vars);
  }
  // Plurals: key.one / key.few / key.other ... chosen by Intl.PluralRules, .other as the fallback.
  function tp(key, n, vars) {
    let cat = 'other';
    try { cat = new Intl.PluralRules(locale()).select(n); } catch (e) { cat = n === 1 ? 'one' : 'other'; }
    const v = Object.assign({ n: num(n) }, vars || {});
    return has(key + '.' + cat) ? t(key + '.' + cat, v) : t(key + '.other', v);
  }
  function num(v, opts) { try { return new Intl.NumberFormat(locale(), opts).format(v); } catch (e) { return String(v); } }
  function pct(v) { return num(v / 100, { style: 'percent', maximumFractionDigits: 0 }); }
  function date(d, opts) { try { return new Intl.DateTimeFormat(locale(), opts).format(d); } catch (e) { return String(d); } }
  function money(v, currency) { return num(v, { style: 'currency', currency: currency || 'GBP' }); }

  function applyDom(root) {
    const doc = G.document; if (!doc) return;
    doc.documentElement.lang = cur === 'en' ? 'en-GB' : cur;
    const r = root || doc;
    r.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    for (const [attr, ds] of [['title', 'i18nTitle'], ['placeholder', 'i18nPlaceholder'], ['aria-label', 'i18nAriaLabel']]) {
      r.querySelectorAll('[data-i18n-' + attr + ']').forEach(el => el.setAttribute(attr, t(el.dataset[ds])));
    }
  }
  function setLang(code) {
    if (!known(code)) return false;
    const changed = code !== cur;
    cur = code;
    try { const s = storage(); if (s) s.setItem(STORE, code); } catch (e) { /* ignore */ }
    applyDom();
    if (changed && typeof G.dispatchEvent === 'function' && typeof G.CustomEvent === 'function') G.dispatchEvent(new G.CustomEvent('langchange', { detail: { lang: code } }));
    return true;
  }

  G.I18N = { LANGS, FONT_FALLBACK, STORE, t, tp, has, getLang, setLang, applyDom, locale, num, pct, date, money, detect };
})(typeof window !== 'undefined' ? window : globalThis);
