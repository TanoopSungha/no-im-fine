// Assembles the web build used by the iOS and Android apps (Capacitor) into ./www.
// The desktop app is untouched: this only copies the game files and adds a small phone/tablet helper.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'www');
const cfg = require(path.join(ROOT, 'capacitor.web.json')); // { "from": "src" | ".", "include": [...] }

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const base = path.join(ROOT, cfg.from);
for (const item of cfg.include) fs.cpSync(path.join(base, item), path.join(OUT, item), { recursive: true });

// Phones get the desktop layout scaled to fit (these games are designed for a wide screen); tablets get it at full size.
const helper = `(function () {
  var long = Math.max(screen.width, screen.height), w = ${cfg.layoutWidth || 1100};
  var m = document.querySelector('meta[name=viewport]') || document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'viewport' }));
  m.content = long < w ? 'width=' + w + ', viewport-fit=cover' : 'width=device-width, initial-scale=1, viewport-fit=cover';
  document.documentElement.classList.add('mobile-app');
})();
`;
fs.writeFileSync(path.join(OUT, 'mobile.js'), helper);
const idx = path.join(OUT, 'index.html');
let html = fs.readFileSync(idx, 'utf8');
html = html.replace(/(<meta name="viewport"[^>]*>)/, '$1\n<script src="mobile.js"></script>');
if (!html.includes('mobile.js')) html = html.replace('<head>', '<head>\n<script src="mobile.js"></script>');
fs.writeFileSync(idx, html);
console.log('web build ready in www/ (' + cfg.include.join(', ') + ')');
