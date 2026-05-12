// Render the marketplace icon (full-color speech bubble with eyes) at 256x256.
// Run with: node scripts/make-icon.cjs

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0a0b"/>
      <stop offset="100%" stop-color="#1a1a1f"/>
    </linearGradient>
    <linearGradient id="bubble" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffb380"/>
      <stop offset="35%" stop-color="#ff8a3a"/>
      <stop offset="70%" stop-color="#ff5e3a"/>
      <stop offset="100%" stop-color="#cc2e1a"/>
    </linearGradient>
    <linearGradient id="blob" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffd9b8" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#ff8a3a" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="url(#bg)"/>
  <path d="M52 12 C74 12 88 28 88 48 C88 63 78 76 64 81 L52 92 L46 81 C26 79 12 64 12 48 C12 28 30 12 52 12 Z"
        fill="url(#bubble)" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
  <path d="M30 38 C30 28 42 22 55 26 C50 40 42 50 32 56 C26 50 28 44 30 38 Z" fill="url(#blob)"/>
  <circle cx="42" cy="50" r="5.5" fill="#fff"/>
  <circle cx="60" cy="50" r="5.5" fill="#fff"/>
</svg>`;

(async () => {
  const out = path.join(__dirname, "..", "media", "icon.png");
  await sharp(Buffer.from(svg)).resize(256, 256).png().toFile(out);
  const stat = fs.statSync(out);
  console.log(`Wrote ${out} (${stat.size} bytes)`);
})().catch((e) => { console.error(e); process.exit(1); });
