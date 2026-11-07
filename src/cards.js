// No, I'm Fine.: the cards. Each one is a moment in the relationship with two ways to handle it.
// The words live in the dictionaries (src/i18n/<lang>.js) under card.<id>.q (what they say), .L / .R (your two answers)
// and .Lr / .Rr (what happens next). Tokens like {P} and {they} are explained at the top of src/i18n/en.js.
// fx keys: l = romance, p = their patience, s = your sanity, m = money.
(function (G) {
  'use strict';
  // C(id, who, [fromStage, toStage], left, right, extra)
  // left/right: [fx, partner's face, extra]  extra: { set, risk: [meter, below, ending] }
  // Each side becomes [labelKey, fx, replyKey, face, extra], so card.L[0] / card.L[2] are dictionary keys.
  const C = (id, who, st, L, R, x) => Object.assign({
    id, who, st, text: 'card.' + id + '.q',
    L: ['card.' + id + '.L', L[0], 'card.' + id + '.Lr', L[1], L[2]],
    R: ['card.' + id + '.R', R[0], 'card.' + id + '.Rr', R[1], R[2]],
  }, x || {});

  const CARDS = [
    // ---------- dating ----------
    C('what-are-we', 'p', [0, 0], [{ l: -12, p: -6 }, 'meh'], [{ l: 14, s: -6 }, 'love']),
    C('split-bill', 'p', [0, 1], [{ m: 6, l: -6 }, 'meh'], [{ m: -10, l: 10 }, 'joy']),
    C('ex-photo', 'p', [0, 2], [{ l: -25, p: -8 }, 'angry'], [{ l: 10, p: 4 }, 'smug']),
    C('grey-dinner', 'p', [0, 2], [{ l: -10, s: 4 }, 'cross'], [{ l: 10, s: -10 }, 'joy']),
    C('meet-debbie', 'p', [0, 1], [{ p: -12 }, 'cross'], [{ p: 6, s: -6 }, 'joy', { set: 'debbie' }]),
    C('text-home', 'p', [0, 1], [{ l: -10, p: -10 }, 'angry'], [{ l: 10, s: -5 }, 'love']),
    C('late', 'p', [0, 2], [{ p: 6, s: -10 }, 'smug'], [{ l: -10, p: -6 }, 'cross']),
    C('wine', 'waiter', [0, 1], [{ m: 6, l: -6 }, 'meh'], [{ m: -16, l: 10 }, 'joy']),
    C('star-sign', 'p', [0, 1], [{ l: -6, p: -5 }, 'sus'], [{ l: 10 }, 'love']),
    C('biscuit', 'biscuit', [0, 2], [{ l: -14 }, 'cross'], [{ l: 10, s: -5 }, 'joy']),
    C('steve-saturday', 'steve', [0, 2], [{ l: 10, s: -10 }, 'love'], [{ l: -10, s: 10, m: -6 }, 'sus']),
    C('film', 'p', [0, 3], [{ l: -8, s: 8 }, 'meh'], [{ l: 10, s: -8 }, 'love']),
    C('phone-smile', 'p', [0, 4], [{ p: -6 }, 'sus'], [{ l: 10, s: -8 }, 'sus']),
    C('hot-sauce', 'p', [0, 4], [{ l: -8 }, 'smug'], [{ l: 12, s: -16 }, 'joy', { risk: ['sanity', 30, 'hotsauce'] }]),

    // ---------- official ----------
    C('use-phone', 'p', [1, 3], [{ l: 6, s: -10 }, 'sus'], [{ l: -10, p: -10 }, 'sus']),
    C('magaluf', 'steve', [1, 3], [{ s: -8, l: 6 }, 'joy'], [{ s: 14, m: -14, l: -10 }, 'cross', { set: 'magaluf' }]),
    C('magaluf-photos', 'debbie', [1, 4], [{ p: -10, s: -10 }, 'angry'], [{ l: -12 }, 'sus', { risk: ['love', 40, 'magaluf'] }], { req: 'magaluf' }),
    C('profile-pic', 'p', [1, 3], [{ l: -10 }, 'cross'], [{ l: 10, s: -5 }, 'love']),
    C('debbie-intentions', 'debbie', [1, 2], [{ p: -4, s: 6 }, 'smug'], [{ l: 8, s: -6 }, 'joy']),
    C('holiday', 'p', [1, 4], [{ m: 6, l: -6, s: -4 }, 'meh'], [{ m: -20, l: 14 }, 'love']),
    C('cold', 'p', [0, 6], [{ l: -10, p: -10 }, 'cross'], [{ l: 10, s: -4 }, 'love']),
    C('what-day', 'p', [1, 5], [{ l: -18, p: -14 }, 'angry'], [{ s: -10, l: 6 }, 'sus']),
    C('sunday-lunch', 'p', [1, 3], [{ l: -10, p: -10 }, 'cross'], [{ m: -5, l: 10 }, 'joy', { set: 'linda' }]),
    C('linda-job', 'linda', [1, 4], [{ p: -4, s: -4 }, 'meh'], [{ s: -6, l: 4 }, 'sus']),
    C('ig-like', 'p', [1, 5], [{ l: -10 }, 'sus'], [{ l: 8, s: -5 }, 'cross']),
    C('shoes-price', 'p', [1, 6], [{ l: 10, m: -10 }, 'joy'], [{ l: -14 }, 'angry']),
    C('karen', 'debbie', [1, 6], [{ p: -10 }, 'angry'], [{ s: -10, l: 6 }, 'joy']),
    C('thinking', 'p', [0, 6], [{ p: -10 }, 'sus'], [{ l: 10, s: -5 }, 'smug']),
    C('steve-borrow', 'steve', [1, 6], [{ s: 6 }, 'meh'], [{ m: -10, s: -4 }, 'meh']),
    C('overtime', 'gary', [1, 6], [{ l: 10, m: -6 }, 'love'], [{ m: 16, l: -10, s: -6 }, 'cross']),
    C('promotion', 'gary', [2, 6], [{ s: 8, m: -6 }, 'neutral'], [{ m: 18, s: -12, l: -4 }, 'joy']),
    C('tenner', 'p', [0, 6], [{ m: -4, l: 8 }, 'love'], [{ m: 8, l: -4 }, 'meh']),

    // ---------- moving in ----------
    C('bed-side', 'p', [2, 3], [{ p: -10 }, 'angry'], [{ l: 6, s: -6 }, 'smug']),
    C('dishwasher', 'p', [2, 6], [{ p: -14, s: 6 }, 'angry'], [{ s: -12, p: 10 }, 'smug']),
    C('ikea', 'p', [2, 3], [{ l: -6 }, 'cross'], [{ m: -15, s: -15, l: 10 }, 'joy']),
    C('lost-phone', 'p', [2, 6], [{ p: -14 }, 'angry'], [{ s: -4, l: 6 }, 'joy']),
    C('steve-sofa', 'p', [2, 4], [{ p: -14 }, 'angry'], [{ s: -10, p: 10 }, 'smug']),
    C('joint-account', 'p', [2, 3], [{ l: -10, m: 4 }, 'sus'], [{ l: 10, m: -8 }, 'joy']),
    C('toilet-seat', 'p', [2, 6], [{ p: -10 }, 'angry'], [{ p: 6, s: -5 }, 'smug']),
    C('netflix', 'p', [2, 6], [{ s: -4, l: 6 }, 'love'], [{ l: -6, s: 8 }, 'cross']),
    C('wear-that', 'p', [2, 6], [{ p: -10, s: 6 }, 'sus'], [{ s: -10, l: 4 }, 'meh']),
    C('gerald', 'p', [2, 4], [{ l: -6 }, 'cross', { set: 'gerald' }], [{ l: 10 }, 'love', { set: 'gerald' }]),
    C('gerald-wilting', 'p', [3, 6], [{ l: -14 }, 'angry', { risk: ['love', 40, 'gerald'] }], [{ s: -6, l: 6 }, 'smug'], { req: 'gerald' }),
    C('workout', 'p', [2, 6], [{ l: -6, s: 6 }, 'cross'], [{ s: -10, l: 10 }, 'joy']),
    C('sell-console', 'p', [2, 5], [{ m: -4, l: -6 }, 'cross'], [{ m: 14, s: -14 }, 'smug']),
    C('car-boot', 'p', [2, 6], [{ s: 8, m: -4 }, 'meh'], [{ m: 14, s: -10, l: 4 }, 'joy']),
    C('remote', 'p', [2, 6], [{ p: -10 }, 'cross'], [{ l: 6, m: 2 }, 'joy']),

    // ---------- engaged ----------
    C('propose', 'p', [3, 3], [{ l: 14, m: -10 }, 'love', { set: 'engaged' }], [{ l: 18, s: -8 }, 'wow', { set: 'engaged', risk: ['love', 50, 'jumbotron'] }], { not: 'engaged', weight: 6 }),
    C('wedding-size', 'p', [3, 3], [{ m: 10, l: -6 }, 'meh'], [{ m: -25, l: 10 }, 'joy']),
    C('linda-guest', 'linda', [3, 3], [{ p: -12 }, 'angry'], [{ m: -10, s: -10 }, 'joy']),
    C('first-dance', 'p', [3, 3], [{ l: -10, s: 10 }, 'angry'], [{ l: 10 }, 'sus']),
    C('best-man', 'steve', [3, 3], [{ s: -6 }, 'meh'], [{ l: -14, s: 6 }, 'angry']),
    C('wedding-diet', 'p', [3, 3], [{ l: 6, s: 6 }, 'love'], [{ s: -14, l: 4 }, 'meh']),
    C('venue', 'linda', [3, 3], [{ p: -10, l: 6 }, 'sus'], [{ s: -14 }, 'meh']),
    C('stag-hen', 'steve', [3, 3], [{ s: -6, l: 6 }, 'love'], [{ s: 10, m: -12, l: -8 }, 'cross']),

    // ---------- married ----------
    C('snoring', 'p', [4, 6], [{ p: -10 }, 'smug'], [{ m: -4, s: -4, l: 4 }, 'joy']),
    C('dinner', 'p', [4, 6], [{ p: -10 }, 'angry'], [{ s: 6, l: -4 }, 'meh']),
    C('bins', 'p', [4, 6], [{ p: -10 }, 'angry'], [{ p: 10 }, 'sus']),
    C('look-fat', 'p', [2, 6], [{ l: -25, p: -10 }, 'angry'], [{ l: 10 }, 'sus']),
    C('need-talk', 'p', [3, 6], [{ p: -18, s: 10 }, 'angry'], [{ s: -12 }, 'cross']),
    C('your-mum', 'pat', [2, 6], [{ s: -6, l: 6 }, 'meh'], [{ p: -14 }, 'angry']),
    C('dog', 'p', [4, 5], [{ l: -14 }, 'sad'], [{ m: -14, l: 14, s: -5 }, 'love', { set: 'kevin' }]),
    C('leftovers', 'p', [2, 6], [{ p: -14 }, 'angry'], [{ p: -4, l: 4 }, 'cross']),
    C('hobby', 'p', [4, 6], [{ m: -10, l: 10 }, 'love'], [{ l: -16, s: -10 }, 'angry']),
    C('yoga', 'p', [4, 6], [{ p: -10 }, 'sus'], [{ s: -6, l: 10 }, 'joy']),
    C('thermostat-talk', 'p', [2, 6], [{ l: -10, p: -6 }, 'angry'], [{ m: -8, l: 6 }, 'love']),
    C('veggie', 'p', [1, 6], [{ l: -10 }, 'cross'], [{ s: -10, l: 10 }, 'smug']),
    C('turning-mum', 'p', [4, 6], [{ l: -25 }, 'angry'], [{ l: 10 }, 'love']),
    C('lazy-day', 'p', [1, 6], [{ l: -10, s: 4, m: 4 }, 'meh'], [{ l: 8, s: 8, p: 4 }, 'love']),
    C('bag-hold', 'p', [1, 6], [{ p: -10 }, 'sus'], [{ s: -14, l: 10 }, 'love']),
    C('anniversary-gift', 'p', [4, 6], [{ s: -14, m: -8, l: 6 }, 'sus'], [{ m: -18, l: 16 }, 'love']),
    C('in-laws-xmas', 'p', [3, 6], [{ p: -12 }, 'cross'], [{ s: -12, l: 6 }, 'smug']),

    // ---------- parents ----------
    C('3am', 'p', [5, 5], [{ p: -24 }, 'angry'], [{ s: -14, l: 10 }, 'love']),
    C('first-word', 'p', [5, 5], [{ l: 4, s: 6 }, 'joy'], [{ s: -10, l: 6 }, 'love']),
    C('why-sky', 'tyler', [5, 6], [{ p: -10, s: 8 }, 'cross'], [{ s: -12, l: 6 }, 'joy']),
    C('parents-evening', 'p', [5, 5], [{ p: -14 }, 'angry'], [{ s: -10, l: 6 }, 'sus']),
    C('tyler-pet', 'tyler', [5, 6], [{ s: 6 }, 'meh'], [{ p: -10 }, 'cross']),
    C('school-play', 'tyler', [5, 6], [{ l: 10, s: -6 }, 'love'], [{ l: -16 }, 'sad']),
    C('date-night-kids', 'p', [5, 5], [{ l: -10, s: 6 }, 'meh'], [{ m: -12, l: 14 }, 'love']),

    // ---------- golden years ----------
    C('glasses', 'p', [6, 6], [{ p: -2, l: 6 }, 'smug'], [{ p: -10 }, 'cross']),
    C('ballroom', 'p', [6, 6], [{ l: -6 }, 'meh'], [{ s: -10, l: 14 }, 'love']),
    C('grandkids', 'p', [6, 6], [{ l: -10, s: 10 }, 'smug'], [{ s: -18, l: 10 }, 'joy']),
    C('still-love', 'p', [4, 6], [{ l: -12 }, 'angry'], [{ l: 15 }, 'love']),
    C('cruise', 'p', [6, 6], [{ m: 6, l: -6 }, 'meh'], [{ m: -24, l: 16, s: 8 }, 'love']),
    C('crossword', 'p', [6, 6], [{ l: 8, s: 4 }, 'joy'], [{ p: -12 }, 'cross']),
  ];

  // Little scenes that can't be answered with a simple choice: these launch microgames.
  // Their words are gamecard.<id>.q (what they say) and gamecard.<id>.intro (the rules) in the dictionaries.
  const GAME_CARDS = {
    fine: { who: 'p', text: 'gamecard.fine.q', intro: 'gamecard.fine.intro' },
    eat: { who: 'p', text: 'gamecard.eat.q', intro: 'gamecard.eat.intro' },
    mmhmm: { who: 'p', text: 'gamecard.mmhmm.q', intro: 'gamecard.mmhmm.intro' },
    outfit: { who: 'p', text: 'gamecard.outfit.q', intro: 'gamecard.outfit.intro' },
    duvet: { who: 'p', text: 'gamecard.duvet.q', intro: 'gamecard.duvet.intro' },
    thermo: { who: 'p', text: 'gamecard.thermo.q', intro: 'gamecard.thermo.intro' },
  };

  G.NIF_CARDS = { CARDS, GAME_CARDS };
})(typeof window !== 'undefined' ? window : globalThis);
