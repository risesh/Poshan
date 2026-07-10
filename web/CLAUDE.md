@AGENTS.md

# Poषण — Next.js app

This is the live rebuild of the root-level static site (`../index.html` etc.), per the
backend plan (`/Users/riseshbhutani/.claude/plans/typed-singing-crab.md`). New feature
work happens here, not in the root HTML files — those stay as a design/behavior
reference during the migration, not a second place to implement things. Design-fidelity
rules (grep `../design/decoded-source.html`, use `../assets/css/tokens.css`'s tokens,
never hardcode a brand hex) apply here exactly as documented in `../CLAUDE.md` — this
file only covers what's specific to the Next.js/Supabase rebuild.

## Data layer: `lib/products.ts` is still the source of truth, not Supabase

`supabase/migrations/0001_init.sql` defines `products`/`product_variants`, and
`supabase/seed.sql` seeds them, but the app itself still reads product data from
`lib/products.ts` (a plain TS array) — nothing fetches from Supabase yet. This is a
deliberate, real gap, not an oversight: `lib/products.ts` ids (e.g. `kefir-500ml`) are
plain strings, not `product_variants.id` UUIDs, so nothing in the app can reference a row
in `product_variants` by real foreign key yet.

**This is why `order_items.product_variant_id` is always inserted as `null`** (see
`lib/create-order.ts`) — the snapshot columns (`product_name_snapshot`,
`unit_price_rupees_snapshot`, etc.) carry the real truth instead, which is exactly what
they're for. **This is also why server-side cart (`carts`/`cart_items`) was not built**
despite the tables existing: `cart_items.product_variant_id` is `NOT NULL`, unlike
`order_items`', so a cart row genuinely cannot be inserted until products are fetched
from Supabase for real. Don't wire up server-side cart before that migration happens —
it'll hit the NOT NULL constraint immediately. Cart stays `localStorage`-backed
(`lib/cart-context.tsx`) until then.

## Auth (Supabase Auth, real — not the root site's mock)

`lib/auth-context.tsx` (`AuthProvider`/`useAuth`) is the live session, backed by
`supabase.auth.onAuthStateChange` — every consumer (`Nav`, `CartPageBody`,
`CheckoutBody`) reads through it rather than querying Supabase directly, same pattern as
`lib/cart-context.tsx`. `lib/supabase/{client,server,middleware}.ts` are the three
required Supabase client variants for the App Router (browser / Server Component / the
proxy) — see the comments in each for which context each one is for.

**Google OAuth's "a little about you" onboarding step** (`app/components/AuthPanel.tsx`)
can't reuse the email/password sign-up flow's approach of just setting local state,
because a real OAuth sign-in is a full page redirect through Google and back through
`app/auth/callback/route.ts`. There's no explicit "is this a first-ever login" flag from
Supabase, so the callback route infers it by checking whether `user.created_at` and
`user.last_sign_in_at` land within ~10 seconds of each other, and routes through
`/signin?view=about` if so. This is a heuristic, not a guarantee — see the comment at
the callback route.

`proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`; don't recreate the old
filename) gates `/orders` and `/checkout` server-side via `PROTECTED_PREFIXES` in
`lib/supabase/middleware.ts` — add any future account-only route to that array rather
than gating client-side.

## Checkout & orders

No design source for a saved-address book page (`design/decoded-source.html`'s `4a`/`4b`
only mock up an inline address picker/entry as part of checkout itself), so addresses
are created inline in `app/checkout/page.tsx` / `CheckoutBody.tsx`, not through a
separate account page. Same for Google Places autocomplete in `4b` — that needs a
Google Maps Platform API key, a fourth external account beyond Supabase/Google
OAuth/Razorpay, so checkout's address form is a plain manual form instead; autocomplete
is a future enhancement, not a gap to "fix" without that key existing first.

**Cash on Delivery works with zero external accounts** — `/api/orders/cod` only touches
Supabase. Online payment (`/api/razorpay/create-order` + `/api/razorpay/verify`) needs
real `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` in `.env.local`; without them
`create-order` returns a clean 503 rather than crashing checkout.

`lib/order-math.ts`'s `computeOrderTotals` is the one place order totals are computed —
called both for the checkout page's display and, independently, server-side in the
`cod`/`verify` routes before an order is ever written, so a tampered client-submitted
total can't reach the database. Never trust a total passed from the client.
