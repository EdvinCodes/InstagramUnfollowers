# Private analytics (optional)

Privacy-first analytics for the landing page. **Not wired yet** — requires a free project ID from you.

## Recommended: Plausible or Umami

| Tool | Why |
|------|-----|
| [Plausible](https://plausible.io/) | Cookie-less, GDPR-friendly, simple |
| [Umami](https://umami.is/) | Open source, self-host or cloud |

## How to enable (5 minutes)

1. Create a site for `edvincodes.github.io` (or your custom domain).
2. Copy the snippet they give you (usually a single `<script defer …>`).
3. Paste it once into `public/index.html` just before `</head>` (and optionally into the guide pages).
4. Do **not** add Google Analytics or Meta Pixel — conflicts with our “100% local / no tracking” positioning.

## What to measure

- Landing → Copy Script / Get Extension clicks (event goals if available)
- Guide page views (`ghost-score.html`, `detect-instagram-bots.html`)
- Referrers (GitHub vs Google vs Chrome Store later)

When you have the script tag, open an issue or paste it in chat and it can be committed in one PR.
