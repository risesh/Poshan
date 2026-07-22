# Poषण — foods that heal

Poषण is an ecommerce brand for healthy foods rooted in Ayurvedic tradition —
fermented probiotics, small-batch pickles, and energy foods, made without
exaggerated health claims. This repo is its website.

## Repo structure

- **`web/`** — the live application. Next.js (App Router) + Supabase, actively
  developed. Start here.
- **`design/`** — the decoded Claude Design export (`decoded-source.html`) —
  the source of truth for exact pixel/color/copy values used while building.
- **`Design.md`** — the brand design system (colors, type scale, spacing,
  component patterns).

## Tech stack

- **Next.js 16** (App Router) + React 19, TypeScript
- **Supabase** — Postgres, Auth (email/password + Google OAuth), Row Level
  Security
- **Razorpay** — online payment at checkout (UPI/card/netbanking)
- **Cash on Delivery** — zero-fee alternative, no external account needed
- **Google Places API** — address autocomplete at checkout (optional; manual
  entry works without it)

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) 20.9 or later
- A free [Supabase](https://supabase.com) account
- Optional: a [Google Cloud](https://console.cloud.google.com) account (for
  Google sign-in and/or address autocomplete)
- Optional: a [Razorpay](https://razorpay.com) account (for online payment —
  Cash on Delivery works without this)

### 1. Clone and install

```bash
git clone https://github.com/risesh/Poshan.git
cd Poshan/web
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the project dashboard, go to **Settings → API** and copy the **Project
   URL** and **anon public** key.
3. In **SQL Editor**, run these files in order (copy/paste each, click Run):
   1. `web/supabase/migrations/0001_init.sql` — schema (products, profiles,
      addresses, carts, orders, etc.) with Row Level Security on every table
   2. `web/supabase/migrations/0002_address_google_components.sql` — adds
      Google Places-native address columns for analytics
   3. `web/supabase/seed.sql` — loads the 4 demo products

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `web/.env.local`:

| Variable | Required? | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase → Settings → API |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | No | Razorpay → Settings → API Keys — only needed for online payment; Cash on Delivery works without it |
| `GOOGLE_PLACES_API_KEY` | No | Google Cloud Console — only needed for address autocomplete at checkout; manual address entry works without it |

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. (Optional) Enable Google sign-in

The app works with email/password sign-in out of the box. To also enable
"Continue with Google":

1. **Google Cloud Console** → APIs & Services → OAuth consent screen → fill
   in the required fields, keep publishing status as **Testing**, and add
   your own Google account under **Test users**.
2. APIs & Services → Credentials → **Create Credentials → OAuth client ID** →
   Web application → add this Authorized redirect URI:
   ```
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   ```
3. Copy the Client ID/Secret into **Supabase Dashboard → Authentication →
   Sign In / Providers → Google**, enable it, save.
4. Under **Authentication → URL Configuration → Redirect URLs**, add
   `http://localhost:3000/auth/callback` for local testing.

## Features

- Product catalog with category filtering, dynamic product-detail pages
- Cart (localStorage-backed)
- Real authentication — email/password and Google OAuth, via Supabase Auth
- Checkout — saved/new delivery addresses with Google Places autocomplete,
  Cash on Delivery (fully functional) or Razorpay online payment
- Order confirmation and order history, gated to signed-in users
- Row Level Security on every table — users can only ever see their own
  addresses, carts, and orders

## Further documentation

- [`web/CLAUDE.md`](web/CLAUDE.md) — architecture decisions, cross-file
  gotchas, and where things live, for anyone (human or AI) extending the app
- [`CLAUDE.md`](CLAUDE.md) — same, for the legacy static site
- [`Design.md`](Design.md) — the brand design system
