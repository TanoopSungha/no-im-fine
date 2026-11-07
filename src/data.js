// No, I'm Fine.: characters, stages, endings and other game data. Every person here is made up.
// The words for all of this live in the dictionaries (src/i18n/<lang>.js): meter.<id>, stage.<n>.name/.blurb, partner.<id>.bio,
// cast.<id>, ending.<id>.title/.text, item.<id>.name/.desc and role.<role>.*.
(function (G) {
  'use strict';
  function rng(seed) {
    let s = (typeof seed === 'string' ? hash(seed) : seed >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  // The four things you're juggling. Hit 0 OR 100 on any of them and it's over.
  const METERS = [
    { id: 'love', icon: '❤️', col: '#ff3f7f' },
    { id: 'patience', icon: '⏳', col: '#f2a93b' },
    { id: 'sanity', icon: '🧠', col: '#39d0b8' },
    { id: 'money', icon: '💷', col: '#7bd35a' },
  ];

  // Stages of the relationship, by days together.
  const STAGES = [
    { id: 0, from: 0 },
    { id: 1, from: 18 },
    { id: 2, from: 45 },
    { id: 3, from: 80 },
    { id: 4, from: 120 },
    { id: 5, from: 170 },
    { id: 6, from: 230 },
  ];
  const WIN_DAY = 300;

  // Who you can fall for. role decides the words the game uses: girlfriend/boyfriend/partner (see role.* in the dictionaries).
  const PARTNERS = [
    { id: 'jess', name: 'Jess', look: { skin: '#f6d3b3', hair: 'bob', hairCol: '#d84a2c', top: 'cardigan', col: '#ff8ac0', legs: '#2b3a67', acc: 'earrings', build: 0.9, h: 0.96 , eyes: '#3f7a4a', lashes: true, lips: '#d9506a'}, tint: '#ff8ac0' },
    { id: 'dan', name: 'Dan', look: { skin: '#eebd94', hair: 'quiff', hairCol: '#3b2414', top: 'denim', col: '#4d6fa8', legs: '#222', acc: 'none', build: 1.1, h: 1.05 , eyes: '#3a6aa8'}, tint: '#7fc8ff' },
    { id: 'priya', name: 'Priya', look: { skin: '#b97a4e', hair: 'long', hairCol: '#1c1410', top: 'shirt', col: '#f2a93b', legs: '#2b3a67', acc: 'earrings', build: 0.9, h: 0.98 , eyes: '#4a2a14', lashes: true, lips: '#b8405a'}, tint: '#ffcf6a' },
    { id: 'marcus', name: 'Marcus', look: { skin: '#5f3a22', hair: 'short', hairCol: '#1c1410', top: 'hoodie', col: '#2fb35a', legs: '#2b3a67', acc: 'chain', build: 1.15, h: 1.06 , eyes: '#3a2010'}, tint: '#8ee06b' },
    { id: 'chloe', name: 'Chloe', look: { skin: '#ffd9c2', hair: 'bun', hairCol: '#e8c46a', top: 'tee', col: '#b14bff', legs: '#222', acc: 'glasses', build: 0.88, h: 0.94, pattern: 'stripes' , eyes: '#3a7ab8', lashes: true, lips: '#e0607e'}, tint: '#c99bff' },
    { id: 'tom', name: 'Tom', look: { skin: '#d9a06f', hair: 'shaggy', hairCol: '#6b3d1f', top: 'tee', col: '#e5483b', legs: '#4a3b2a', acc: 'beard', build: 1.2, h: 1.04 , eyes: '#5a7a3a'}, tint: '#ff9a7a' },
  ];
  const ROLES = { girlfriend: { g: 0 }, boyfriend: { g: 1 }, partner: { g: 2 } }; // g picks from {g:feminine|masculine|neutral}

  // The supporting cast.
  const CAST = {
    steve: { look: { skin: '#f0c9a8', hair: 'bald', hairCol: '#6b3d1f', top: 'tee', col: '#c3001b', legs: '#2b3a67', acc: 'beard', build: 1.4, h: 1.08, pattern: 'stripes', eyes: '#5a7848' }, tint: '#ff7a6a' },
    debbie: { look: { skin: '#eebd94', hair: 'curly', hairCol: '#b5752f', top: 'sequin', col: '#ff5fa2', legs: '#222', acc: 'shades', build: 1, h: 0.98, lips: '#e0306a', lashes: true, eyes: '#4880b8' }, tint: '#ff9fd0' },
    linda: { look: { skin: '#f6d3b3', hair: 'bun', hairCol: '#9a9a9a', top: 'cardigan', col: '#7a5ba8', legs: '#2b3a67', acc: 'glasses', build: 1.05, h: 0.92, lashes: true, lips: '#b8405a', eyes: '#4a6a8a' }, tint: '#c9b0ff' },
    pat: { look: { skin: '#d9a06f', hair: 'curly', hairCol: '#d9d9d9', top: 'cardigan', col: '#2f9bff', legs: '#2b3a67', acc: 'earrings', build: 1.1, h: 0.9, lashes: true, lips: '#c0606a', eyes: '#5a7048' }, tint: '#9fd2ff' },
    gary: { look: { skin: '#f0c9a8', hair: 'bald', hairCol: '#9a9a9a', top: 'suit', col: '#3a3a44', legs: '#2a2a30', acc: 'glasses', build: 1.25, h: 1.04, eyes: '#606870' }, tint: '#b8c0cc' },
    waiter: { look: { skin: '#b97a4e', hair: 'short', hairCol: '#1c1410', top: 'suit', col: '#1b1b24', legs: '#1b1b24', acc: 'none', build: 0.95, h: 1.02, eyes: '#382418' }, tint: '#e9d9b0' },
    tyler: { look: { skin: '#e9b98f', hair: 'spiky', hairCol: '#6b3d1f', top: 'tee', col: '#ffcf3f', legs: '#2f9bff', acc: 'none', build: 0.8, h: 0.66, eyes: '#426b8c' }, tint: '#ffe28a' },
    biscuit: { cat: true, tint: '#ffcf8a' },
  };

  // How it can end. Every 0 and 100 has its own ending, plus some special ones.
  const ENDINGS = {
    love0: { icon: '💔' },
    love100: { icon: '🥰' },
    patience0: { icon: '🧳' },
    patience100: { icon: '😶' },
    sanity0: { icon: '🛖' },
    sanity100: { icon: '🧘' },
    money0: { icon: '🐟' },
    money100: { icon: '🍫' },
    jumbotron: { icon: '📺' },
    magaluf: { icon: '🏝️' },
    hotsauce: { icon: '🌶️' },
    gerald: { icon: '🪴' },
    golden: { icon: '👵' },
  };

  // Get-out-of-jail cards you can earn and spend.
  const ITEMS = {
    flowers: { icon: '💐', fx: { love: 15 } },
    choc: { icon: '🍫', fx: { patience: 15 } },
    breathe: { icon: '🧘', fx: { sanity: 15 } },
    call: { icon: '📱', skip: true },
  };

  // Audio styles used for the background grooves (shared synth engine).
  const GENRES = { soul: { bpm: 92 }, disco: { bpm: 116 }, jazz: { bpm: 108 }, folk: { bpm: 100 }, house: { bpm: 122 }, reggae: { bpm: 76 }, rock: { bpm: 128 }, hiphop: { bpm: 88 } };
  const STAGE_MUSIC = ['jazz', 'soul', 'folk', 'disco', 'soul', 'reggae', 'jazz'];

  G.NIF_DATA = { rng, hash, pick, METERS, STAGES, WIN_DAY, PARTNERS, ROLES, CAST, ENDINGS, ITEMS, GENRES, STAGE_MUSIC };
})(typeof window !== 'undefined' ? window : globalThis);
