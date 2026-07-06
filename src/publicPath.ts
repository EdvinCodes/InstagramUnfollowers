// BUG FIX: Webpack's default ("auto") publicPath detection relies on
// `document.currentScript`, which is null when this bundle runs as a
// Chrome/Firefox content script (injected by the browser, not via a
// `<script src>` tag) or when it's pasted directly into DevTools console.
// Without this fix, the lazy-loaded chunks used by the PDF export feature
// (jsPDF, jsPDF-AutoTable, Chart.js — see utils/pdfGenerator.ts) would try
// to resolve against `https://www.instagram.com/...` and fail to load.
//
// This file MUST be the first import in main.tsx so it runs before any
// dynamic import() is triggered.
declare let __webpack_public_path__: string;

// Public GitHub Pages copy, used as a fallback when running as a pasted
// console script or mobile bookmarklet (no `chrome.runtime` available).
const FALLBACK_ORIGIN = 'https://edvincodes.github.io/InstagramUnfollowers/';

function resolvePublicPath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      return chrome.runtime.getURL('/');
    }
  } catch {
    // chrome.runtime not available (console/bookmarklet mode) — fall through
  }
  return FALLBACK_ORIGIN;
}

// eslint-disable-next-line prefer-const -- webpack requires `let` for this global, see declaration above
__webpack_public_path__ = resolvePublicPath();
