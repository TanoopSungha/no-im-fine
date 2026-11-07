# No, I'm Fine.

A relationship survival comedy by **Snoopster Gaming**.

Your other half says "I'm fine." You have about five seconds to work out what that actually means.

## How it plays

- **Swipe or tap to answer.** Your partner, their mum Linda, their best friend Debbie, your mate Big Steve, your boss Gary, the cat and eventually your kid all want something from you. Every answer moves four meters: **Romance**, **Their patience**, **Your sanity** and **the Joint account**.
- **Too low ends it, and so does too high.** Nobody wants a clingy, skint, enlightened saint. Dots show which meters a choice will hit, but not which way.
- **Quick-fire challenges** pop up between cards: decode "I'm fine", survive "where do you want to eat?", say "mm-hmm" only when they look at you, compliment the outfit without saying "brave", win the duvet war and the thermostat war.
- **From first date to the golden years:** Dating, Official, Moving in, Engaged, Married, Parents, Golden years. Each stage has its own cards and room.
- **Get-out-of-jail cards** (emergency flowers, apology chocolate, a deep breath, a fake phone call) come from streaks and perfect challenges.
- **Thirteen endings** to collect in the Breakup album, from "Left for a podcaster" to "Justice for Gerald" (the plant), plus the happy one if you make it to day 300.

Pick from six partners and choose whether they're your girlfriend, boyfriend or partner; the game uses the right words throughout.

## Languages

Play in **English**, **Français**, **Deutsch**, **Español**, **हिन्दी** (Hindi) or **简体中文** (Simplified Chinese). Pick a language on the title screen, or mid-game with the 🌐 button next to the sound button; everything switches straight away and the choice is remembered. On first launch the game follows your device's language if it is one of these six, otherwise English. The jokes are rewritten for each language rather than translated word for word.

The text lives in `src/i18n/<language>.js` (English is `en.js`, the master copy) and `npm test` checks every language has every line.

## Run it

```
npm install
npm start      # desktop (Electron)
npm test       # checks every card and plays 600 runs to check the balance
```

Phones and tablets use Capacitor (`npm run mobile:android`, `npm run mobile:ios`). GitHub Actions builds macOS, Windows, Linux, Android and iOS packages on every push.

## Assets

Characters, rooms, music and sound effects are all made in code. The only files are the Snoopster Gaming intro video and two free fonts, Fredoka (SIL Open Font License) and Luckiest Guy (Apache 2.0); licences are in `src/assets/fonts`. Every character is made up.
