// @ts-nocheck
// Copies the built content script (and any lazy-loaded chunk, e.g. jspdf/chart.js)
// from dist/ into public/ as plain static files, so the landing page can fetch()
// them on demand instead of embedding ~900KB of JS directly inside index.html.
const fs = require('fs');
const path = require('path');

if (process.argv.length < 4) {
  console.error('Usage: node copy-script.js <distDir> <publicDir>');
  process.exit(1);
}

const distDir = process.argv[2];
const publicDir = process.argv[3];

if (!fs.existsSync(distDir)) {
  console.error(`Error: dist dir not found at ${distDir}. Run "npm run webpack-build" first.`);
  process.exit(1);
}

const files = fs.readdirSync(distDir).filter(f => f.endsWith('content.js'));

if (files.length === 0) {
  console.error(`Error: no *.content.js files found in ${distDir}.`);
  process.exit(1);
}

for (const file of files) {
  fs.copyFileSync(path.join(distDir, file), path.join(publicDir, file));
  console.log(`Copied ${file} -> ${path.join(publicDir, file)}`);
}
