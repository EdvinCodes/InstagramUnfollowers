# Payment provider migration (post Lemon Squeezy)

Lemon Squeezy declined this product category. PRO features stay **unlocked for free** (`PRO_PROMO_FREE = true` in `src/hooks/useLicense.ts`) until a new provider is integrated.

## Candidates

| Provider | Pros | Cons |
|----------|------|------|
| **Gumroad** | Fast setup, digital licenses, creator-friendly | Fees; less “SaaS” feeling |
| **Paddle** | Merchant of record, tax handling | Approval process; more paperwork |
| **Ko-fi Shop** | Already have Ko-fi donation link | Weaker license-key automation |
| **Stripe Payment Links** | Flexible | You handle tax/VAT yourself |

## Integration checklist (when ready)

1. Create merchant account and a one-time “PRO lifetime” product.
2. Decide license delivery: email key vs webhook → your backend (today license check is mostly client-side promo).
3. Re-enable real validation in `useLicense.ts` (`PRO_PROMO_FREE = false`).
4. Update landing pricing CTAs and `docs/CHROME_WEB_STORE.md` (remove “free during beta” when charging).
5. Keep a grace period for existing beta users if you switch to paid.

## Current public messaging

Landing + README: “PRO free during beta / payment provider migration.” Do not advertise a checkout URL until a provider is live.
