@AGENTS.md

# Poषण — Next.js app

This is the live application — the original static-site prototype it was migrated from
has been removed (see `../CLAUDE.md`). Design-fidelity rules (grep
`../design/decoded-source.html`, use `app/tokens.css`'s tokens, never hardcode a brand
hex) apply here exactly as documented in `../CLAUDE.md` — this file only covers what's
specific to the Next.js/Supabase app.

## Data layer: products are Supabase-backed; server-side cart still isn't

`lib/products.ts` reads/writes the real `products`/`product_variants` tables (schema in
`0001_init.sql` + `0005_product_catalog_fields.sql`) — the old hardcoded TS array is
gone. Cart-line ids are real `product_variants.id` UUIDs now, so `order_items.
product_variant_id` is populated for real too (`lib/create-order.ts`), not always `null`
like before.

**Server-side cart (`carts`/`cart_items`) is still a separate, still-real gap** —
`cart_items.product_variant_id` being `NOT NULL` is no longer the blocker (variant ids
are real FKs now), but nothing has wired the checkout flow to write there instead of
`localStorage`. Cart stays `localStorage`-backed (`lib/cart-context.tsx`), which now
validates its ids against a live Supabase query on hydration instead of a static array —
this also handles pre-existing carts using the old slug-style ids for free, since those
simply won't match and get pruned.

**`lib/supabase/static.ts`** is a fourth Supabase client variant, used only from
build-time contexts like `generateStaticParams` (`app/products/[slug]/page.tsx`) — that
runs without an HTTP request, so it can't call `next/headers`' `cookies()` the way
`lib/supabase/server.ts`'s client does. Every other server context keeps using
`server.ts`; reach for `static.ts` only where `cookies()` would throw.

**The admin Controls tab** (`app/admin/controls/`) is where products/promo codes get
created and enabled/disabled — its write routes (`app/api/admin/products/**`,
`app/api/admin/promo-codes/**`) follow the same `isAdminEmail` + RLS-is-the-real-boundary
pattern as `app/api/admin/orders/[id]/status/route.ts`, with admin INSERT/UPDATE
policies in `0006_admin_product_write.sql`/`0008_admin_promo_write.sql`. A promo code's
`scopedProductIds` (via `promo_code_products`) is enforced in `lib/order-math.ts`'s
`computePromoDiscount` — partially, not all-or-nothing: a scoped promo still discounts
just its eligible lines in a mixed cart.

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
