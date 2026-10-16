// No, I'm Fine.: characters, stages, endings and other game data. Every person here is made up.
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
    { id: 'love', name: 'Romance', icon: '❤️', col: '#ff3f7f' },
    { id: 'patience', name: 'Their patience', icon: '⏳', col: '#f2a93b' },
    { id: 'sanity', name: 'Your sanity', icon: '🧠', col: '#39d0b8' },
    { id: 'money', name: 'Joint account', icon: '💷', col: '#7bd35a' },
  ];

  // Stages of the relationship, by days together.
  const STAGES = [
    { id: 0, name: 'Dating', from: 0, blurb: 'Butterflies. Pretending to like olives.' },
    { id: 1, name: 'Official', from: 18, blurb: 'Facebook official. Debbie has been informed.' },
    { id: 2, name: 'Moving in', from: 45, blurb: 'One flat. Two opinions about everything.' },
    { id: 3, name: 'Engaged', from: 80, blurb: 'A ring, a budget, and 300 opinions.' },
    { id: 4, name: 'Married', from: 120, blurb: 'Till death, or the dishwasher, do you part.' },
    { id: 5, name: 'Parents', from: 170, blurb: 'Sleep is a rumour.' },
    { id: 6, name: 'Golden years', from: 230, blurb: 'Matching cardigans. Competitive crosswords.' },
  ];
  const WIN_DAY = 300;

  // Who you can fall for. role decides the words the game uses: girlfriend/boyfriend/partner.
  const PARTNERS = [
    { id: 'jess', name: 'Jess', look: { skin: '#f6d3b3', hair: 'bob', hairCol: '#d84a2c', top: 'cardigan', col: '#ff8ac0', legs: '#2b3a67', acc: 'earrings', build: 0.9, h: 0.96 , eyes: '#3f7a4a', lashes: true, lips: '#d9506a'}, tint: '#ff8ac0', bio: 'Loves true crime, hates being asked "what\'s wrong?"' },
    { id: 'dan', name: 'Dan', look: { skin: '#eebd94', hair: 'quiff', hairCol: '#3b2414', top: 'denim', col: '#4d6fa8', legs: '#222', acc: 'none', build: 1.1, h: 1.05 , eyes: '#3a6aa8'}, tint: '#7fc8ff', bio: 'Owns 14 identical t-shirts. Cries at dog adverts.' },
    { id: 'priya', name: 'Priya', look: { skin: '#b97a4e', hair: 'long', hairCol: '#1c1410', top: 'shirt', col: '#f2a93b', legs: '#2b3a67', acc: 'earrings', build: 0.9, h: 0.98 , eyes: '#4a2a14', lashes: true, lips: '#b8405a'}, tint: '#ffcf6a', bio: 'Has a spreadsheet for everything. Including you.' },
    { id: 'marcus', name: 'Marcus', look: { skin: '#5f3a22', hair: 'short', hairCol: '#1c1410', top: 'hoodie', col: '#2fb35a', legs: '#2b3a67', acc: 'chain', build: 1.15, h: 1.06 , eyes: '#3a2010'}, tint: '#8ee06b', bio: 'Will fight you over the last roast potato.' },
    { id: 'chloe', name: 'Chloe', look: { skin: '#ffd9c2', hair: 'bun', hairCol: '#e8c46a', top: 'tee', col: '#b14bff', legs: '#222', acc: 'glasses', build: 0.88, h: 0.94, pattern: 'stripes' , eyes: '#3a7ab8', lashes: true, lips: '#e0607e'}, tint: '#c99bff', bio: 'Remembers everything you have ever said. Everything.' },
    { id: 'tom', name: 'Tom', look: { skin: '#d9a06f', hair: 'shaggy', hairCol: '#6b3d1f', top: 'tee', col: '#e5483b', legs: '#4a3b2a', acc: 'beard', build: 1.2, h: 1.04 , eyes: '#5a7a3a'}, tint: '#ff9a7a', bio: 'Thinks every dinner is a chance to try "a new hot sauce".' },
  ];
  const ROLES = {
    girlfriend: { they: 'she', them: 'her', their: 'her', theyre: "she's", stages: ['girlfriend', 'girlfriend', 'girlfriend', 'fiancée', 'wife', 'wife', 'wife'] },
    boyfriend: { they: 'he', them: 'him', their: 'his', theyre: "he's", stages: ['boyfriend', 'boyfriend', 'boyfriend', 'fiancé', 'husband', 'husband', 'husband'] },
    partner: { they: 'they', them: 'them', their: 'their', theyre: "they're", stages: ['partner', 'partner', 'partner', 'fiancé(e)', 'spouse', 'spouse', 'spouse'] },
  };

  // The supporting cast.
  const CAST = {
    steve: { name: 'Big Steve (your mate)', look: { skin: '#f0c9a8', hair: 'bald', hairCol: '#6b3d1f', top: 'tee', col: '#c3001b', legs: '#2b3a67', acc: 'beard', build: 1.4, h: 1.08, pattern: 'stripes' }, tint: '#ff7a6a' },
    debbie: { name: 'Debbie (their best friend)', look: { skin: '#eebd94', hair: 'curly', hairCol: '#b5752f', top: 'sequin', col: '#ff5fa2', legs: '#222', acc: 'shades', build: 1, h: 0.98, lips: '#e0306a' }, tint: '#ff9fd0' },
    linda: { name: 'Linda (their mum)', look: { skin: '#f6d3b3', hair: 'bun', hairCol: '#9a9a9a', top: 'cardigan', col: '#7a5ba8', legs: '#2b3a67', acc: 'glasses', build: 1.05, h: 0.92, lashes: true, lips: '#b8405a', eyes: '#4a6a8a' }, tint: '#c9b0ff' },
    pat: { name: 'Pat (your mum)', look: { skin: '#d9a06f', hair: 'curly', hairCol: '#d9d9d9', top: 'cardigan', col: '#2f9bff', legs: '#2b3a67', acc: 'earrings', build: 1.1, h: 0.9 }, tint: '#9fd2ff' },
    gary: { name: 'Gary (your boss)', look: { skin: '#f0c9a8', hair: 'bald', hairCol: '#9a9a9a', top: 'suit', col: '#3a3a44', legs: '#2a2a30', acc: 'glasses', build: 1.25, h: 1.04 }, tint: '#b8c0cc' },
    waiter: { name: 'The waiter', look: { skin: '#b97a4e', hair: 'short', hairCol: '#1c1410', top: 'suit', col: '#1b1b24', legs: '#1b1b24', acc: 'none', build: 0.95, h: 1.02 }, tint: '#e9d9b0' },
    tyler: { name: 'Tyler (your kid)', look: { skin: '#e9b98f', hair: 'spiky', hairCol: '#6b3d1f', top: 'tee', col: '#ffcf3f', legs: '#2f9bff', acc: 'none', build: 0.8, h: 0.66 }, tint: '#ffe28a' },
    biscuit: { name: 'Biscuit (the cat)', cat: true, tint: '#ffcf8a' },
  };

  // How it can end. Every 0 and 100 has its own ending, plus some special ones.
  const ENDINGS = {
    love0: { title: 'Left for a podcaster', text: 'The spark went out. {P} left you for someone who "actually listens". He hosts a podcast about cryptocurrency.', icon: '💔' },
    love100: { title: 'Too much, too soon', text: 'Matching fleeces. A shared Instagram. Pet names for each other\'s elbows. Your friends staged an intervention, and {P} quietly moved to Norway.', icon: '🥰' },
    patience0: { title: '"We need to talk"', text: 'You did not, in fact, talk. {P} talked. For three hours. Then {they} packed a bag and took the good saucepan.', icon: '🧳' },
    patience100: { title: 'Too chilled to care', text: '{P} became so patient that {they} stopped noticing you exist. You split up over a shrug.', icon: '😶' },
    sanity0: { title: 'You live in the shed now', text: 'Something snapped while reloading the dishwasher. You now live in the shed. It has Wi-Fi. You\'re happier, honestly.', icon: '🛖' },
    sanity100: { title: 'Total zen', text: 'You achieved inner peace, shaved your head and moved to a monastery in Wales. {P} kept the sofa.', icon: '🧘' },
    money0: { title: 'Skint', text: 'The joint account hit zero. The final argument was about who ate the last fish finger. It was you.', icon: '🐟' },
    money100: { title: 'Tight as a drum', text: 'So careful with money you split a Twix on your anniversary. {P} found someone who buys whole Twixes.', icon: '🍫' },
    jumbotron: { title: 'No, on the big screen', text: 'You proposed on the big screen at half-time. {P} said no. On the big screen. You\'re a meme in four countries.', icon: '📺' },
    magaluf: { title: 'What happens in Magaluf', text: 'Steve\'s "quiet weekend away" ended up on the local news. {P} saw it before you got home.', icon: '🏝️' },
    hotsauce: { title: 'Death by hot sauce', text: 'You agreed to try "the hottest one". You survived, but the relationship didn\'t. Neither did your eyebrows.', icon: '🌶️' },
    gerald: { title: 'Justice for Gerald', text: 'You forgot to water Gerald the plant. For the ninth time. {P} chose Gerald.', icon: '🪴' },
    golden: { title: 'Happily ever after', text: 'You did it. Through dishwashers, in-laws, thermostats and Debbie, you grew old together. {P} still says "I\'m fine" and you still know what it means.', icon: '👵' },
  };

  // Get-out-of-jail cards you can earn and spend.
  const ITEMS = {
    flowers: { name: 'Emergency flowers', icon: '💐', desc: '+15 romance', fx: { love: 15 } },
    choc: { name: 'Apology chocolate', icon: '🍫', desc: '+15 patience', fx: { patience: 15 } },
    breathe: { name: 'Deep breath', icon: '🧘', desc: '+15 sanity', fx: { sanity: 15 } },
    call: { name: 'Fake phone call', icon: '📱', desc: 'Skip this conversation', skip: true },
  };

  // Audio styles used for the background grooves (shared synth engine).
  const GENRES = { soul: { bpm: 92 }, disco: { bpm: 116 }, jazz: { bpm: 108 }, folk: { bpm: 100 }, house: { bpm: 122 }, reggae: { bpm: 76 }, rock: { bpm: 128 }, hiphop: { bpm: 88 } };
  const STAGE_MUSIC = ['jazz', 'soul', 'folk', 'disco', 'soul', 'reggae', 'jazz'];

  G.NIF_DATA = { rng, hash, pick, METERS, STAGES, WIN_DAY, PARTNERS, ROLES, CAST, ENDINGS, ITEMS, GENRES, STAGE_MUSIC };
})(typeof window !== 'undefined' ? window : globalThis);
