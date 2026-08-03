// Generates public/loader.js — a tiny bootstrap (~300 bytes) for console paste &
// mobile bookmarklet. The full app (~1MB) is fetched from GitHub Pages on demand.
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = pkg.version;
const origin = 'https://edvincodes.github.io/InstagramUnfollowers';

const loader = `(function(){if(!location.hostname.includes('instagram.com')){alert('Open instagram.com first, then run Instagram Unfollowers PRO again.');return;}if(window.__IGUFPRO_LOADED__)return;window.__IGUFPRO_LOADED__=1;var s=document.createElement('script');s.src='${origin}/content.js?v=${version}';s.onerror=function(){alert('Could not load Instagram Unfollowers PRO. Check your connection and try again.');};document.body.appendChild(s);})();`;

const outPath = path.join(__dirname, '../public/loader.js');
fs.writeFileSync(outPath, loader);
console.log(`Generated ${outPath} (${loader.length} bytes, v${version})`);
