# Chrome Web Store — Listing Prep

Use this document when submitting **Instagram Unfollowers PRO** to the [Chrome Web Store](https://chrome.google.com/webstore/devconsole).

**Status:** Not submitted yet — extension distributed via GitHub Releases (`dist.zip`, load unpacked).

---

## Store listing (English)

### Name (max 75 chars)

```
Instagram Unfollowers PRO — Ghost Score & Safe Unfollow
```

### Short description (max 132 chars)

```
See who doesn't follow you back. Ghost Score 0-100, PDF reports, 16 languages. 100% local — no password.
```

### Detailed description

```
Instagram Unfollowers PRO is the safest way to clean your Instagram community.

Unlike risky third-party apps, everything runs 100% locally in your browser using Instagram's official connection. We never ask for your password.

✨ KEY FEATURES
• Unlimited scans — see who doesn't follow you back
• Ghost Score (0-100) — detect bots, inactive accounts, and empty profiles
• Real-time unfollower alerts while you browse
• PDF & CSV health reports for your community
• Whitelist — protect friends and brands from accidental unfollows
• Soft block — remove followers without fully blocking them
• Multi-account support — isolated data per profile
• 16 languages — English, Spanish, Portuguese, French, German, Turkish, Hindi, Indonesian, Arabic, Japanese, Korean, Russian, Polish, Dutch, Vietnamese
• Growth Engine (beta) — follow engaged commenters in your niche with anti-ban delays

🛡️ PRIVACY & SAFETY
• No password required — uses your existing Instagram session
• No data sent to external servers
• Open source: https://github.com/EdvinCodes/InstagramUnfollowers

🎁 PRO FEATURES FREE DURING BETA
Payment provider migration in progress. All premium features unlocked at no cost during v8.4 beta.

📱 ALSO WORKS WITHOUT INSTALLING
Visit https://edvincodes.github.io/InstagramUnfollowers/ for console script and mobile bookmarklet.

Support: https://github.com/EdvinCodes/InstagramUnfollowers/issues
```

---

## Store listing (Español) — optional localized listing

### Nombre

```
Instagram Unfollowers PRO — Ghost Score y Unfollow Seguro
```

### Descripción corta

```
Descubre quién no te sigue. Ghost Score 0-100, informes PDF, 16 idiomas. 100% local — sin contraseña.
```

---

## Category & type

| Field | Value |
|-------|-------|
| Category | **Productivity** or **Social & Communication** |
| Language | English (primary), Spanish (secondary if supported) |
| Visibility | Public |

---

## Permissions justification (manifest)

Document these in the developer dashboard if asked:

| Permission | Why |
|------------|-----|
| `storage` | Save whitelist, settings, scan history locally |
| `notifications` | Real-time unfollower alerts |
| `host_permissions: *://*.instagram.com/*` | Run scanner on Instagram only |

No broad `<all_urls>` — scope is Instagram only.

---

## Screenshots checklist (1280×800 or 640×400)

Capture from a test account (blur usernames if needed):

1. **Hero** — Main scan results with non-followers count
2. **Ghost Score** — Filter panel showing ghost accounts with scores
3. **History** — Timeline of unfollow events
4. **PDF Export** — Preview of health report
5. **Settings** — Language selector (show 16 languages)
6. **Growth Engine** — Setup screen (beta badge visible)

Save as PNG in `docs/store-screenshots/` before upload.

---

## Privacy policy URL

```
https://edvincodes.github.io/InstagramUnfollowers/privacy.html
```

---

## Support URL

```
https://github.com/EdvinCodes/InstagramUnfollowers/issues
```

---

## Pre-submission checklist

- [ ] Build production `dist/` with `npm run build`
- [ ] Zip `dist/` folder (not repo root)
- [ ] Verify manifest version matches release tag
- [ ] Test load unpacked on Chrome + Edge
- [ ] No console errors on instagram.com
- [ ] Privacy policy live and linked
- [ ] Single-purpose description matches actual behavior
- [ ] No misleading "official Instagram" claims

---

## Payment note

Lemon Squeezy declined this product category. Do **not** mention paid checkout in store listing until a new provider (Gumroad, Paddle, Ko-fi Shop) is integrated. Current copy: "PRO free during beta."
