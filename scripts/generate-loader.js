// Generates public/loader.js — tiny bootstrap for console paste & bookmarklet.
// IMPORTANT: Instagram CSP blocks <script src="external">. We fetch the bundle
// as text and eval it instead (works from DevTools console and javascript: bookmarks).
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const version = pkg.version;
const origin = 'https://edvincodes.github.io/InstagramUnfollowers';
const url = `${origin}/content.js?v=${version}`;

const loader = `(function(){if(!location.hostname.includes('instagram.com')){alert('Open instagram.com first, then run Instagram Unfollowers PRO again.');return;}if(window.__IGUFPRO_LOADED__)return;window.__IGUFPRO_LOADED__=1;fetch('${url}').then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text();}).then(function(code){(0,eval)(code);}).catch(function(e){window.__IGUFPRO_LOADED__=0;alert('Could not load Instagram Unfollowers PRO. Check your connection and try again.\\n'+(e&&e.message?e.message:e));});})();`;

const outPath = path.join(__dirname, '../public/loader.js');
fs.writeFileSync(outPath, loader, 'utf8');
console.log(`Generated ${outPath} (${loader.length} bytes, v${version})`);
