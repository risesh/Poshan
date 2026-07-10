# Poषण — web app

The live Next.js + Supabase application. See the [repo-root README](../README.md)
for the full project description and setup walkthrough (Supabase project
setup, environment variables, optional Google/Razorpay integrations).

## Quick reference

```bash
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY at minimum
npm run dev                  # http://localhost:3000
```

Other commands:

```bash
npm run build     # production build
npm run start     # run the production build locally
npm run lint      # eslint
npx tsc --noEmit  # type-check without emitting
```

## Where things live

- `app/` — routes (App Router) and shared UI components (`app/components/`)
- `lib/` — data/business logic: cart state, auth context, Supabase clients,
  order math, Google Places integration
- `supabase/migrations/` — SQL schema, run in order against a Supabase project
- `supabase/seed.sql` — demo product data

See [`CLAUDE.md`](CLAUDE.md) → `AGENTS.md` for architecture decisions and
gotchas specific to this codebase (why server-side cart isn't wired up yet,
the checkout snapshot design, session-token handling for Places Autocomplete,
etc.) before making non-trivial changes.
