# Poषण — SEO + AEO/GEO roadmap

Reference roadmap for search-engine and AI-answer-engine (AEO/GEO) optimization. Tick
items off with `- [x]` as they ship, and update this file in the same commit as the
work it describes — same spirit as how `CLAUDE.md` is kept current alongside the code it
documents. Items are independently implementable; §5 gives a recommended order but
nothing here is strictly sequential except where a dependency is called out.

## Context

The goal is to rank and be found for the full range of searches a customer or an AI
assistant might run on Poषण's behalf: individual product names, "healthy eating"/
"nutritious food brand" category terms, **recipes that use Poषण's products as an
ingredient**, and **"benefits of [product]"-style questions** — the last one needs care
(see §4.4) since the brand's own voice rules out direct clinical benefit claims, but the
search/AI-answer demand for that phrasing is real and worth addressing honestly within
those limits.

**Decisions already made:**
- **Domain**: not yet registered. Use placeholder `https://www.poshan.example`
  everywhere a domain is needed, routed through a single `NEXT_PUBLIC_SITE_URL` env var
  so swapping in the real domain later is a one-line change, not a multi-file search.
- **AI crawlers**: allow all of them (GPTBot, ClaudeBot, PerplexityBot, Google-Extended,
  CCBot, etc.) on public content — maximize citation/recommendation surface area, accept
  that some also train on the content.
- **New content route**: `/explore` — houses both recipes and educational/process
  content under one section (chosen over `/blog`/`/journal`). Recipes living here unlock
  `Recipe` schema.org markup (§2.5) a plain guides-only section wouldn't.
- **FAQ placement**: per-product FAQ sections directly on each product detail page, not
  a separate standalone `/faq` page — see §4.2/§2.6.

**Known dependencies/gaps:**
- Product photography is largely missing — `product.image` is unpopulated for most/all
  products today, so `ProductCard`/`ProductHero` render CSS gradient fallbacks, not
  photos. Items gated on real photos (OG images, `Product.image` JSON-LD, Image Search)
  each specify a photo-less fallback so they're not fully blocked.
- `web/app/favicon.ico` exists (real 16×16/32×32 ICO) but it's unverified whether it's a
  genuine Poषण icon or a leftover Next.js default — worth a 10-second visual check.
- No social media accounts found referenced anywhere in the codebase — if any exist,
  they should feed `Organization` schema's `sameAs` field (§2.2); flagged as open.

---

## 1. Technical SEO foundation

*Nothing in this section changes how the site looks — it changes what Google, and the
AI systems that build on Google/Bing's index (§3.4), are able to understand and trust
about the site. Most of it doesn't directly boost ranking by itself, but its absence
actively holds the site back or makes it invisible in specific situations (social share
previews, image search, AI citation). Prerequisites for §2 and §3.*

- [x] **1.1 — Tell the site its own web address, consistently**
  *In plain terms*: right now nothing in the code knows the site's real domain name.
  Every other item below needs to state a full web address (e.g.
  `https://poshan.co/products/kefir`), not a shortcut like `/products/kefir`. This
  creates one single place that address is defined so it can be set once and reused
  everywhere. Also standardizes browser-tab titles to consistently end in "— Poषण".
  *Technical*: add `NEXT_PUBLIC_SITE_URL=https://www.poshan.example` to
  `web/.env.example`/`.env.local`; in `web/app/layout.tsx`'s `metadata` export, add
  `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!)` and a
  `title: { default, template: "%s — Poषण" }` object.

- [x] **1.2 — Give every page its own title and description**
  *In plain terms*: the blue title link and gray snippet in a Google result come from a
  page's metadata. Most pages (including the **homepage**) don't have their own today —
  they fall back to one generic sitewide description.
  *Technical*: add `export const metadata`/`generateMetadata` to `web/app/page.tsx`,
  `web/app/signin/page.tsx`, `web/app/orders/[id]/page.tsx`; give `web/app/admin/**`
  `robots: { index: false, follow: false }`.

- [x] **1.3 — Confirm the site displays correctly on phones**
  *In plain terms*: a technical formality Google checks as part of "is this page
  usable." Does the admin page's mobile-friendliness count against this? No — Google's
  mobile-usability scoring only applies to pages it's allowed to index. `/admin/**` is
  both `Disallow`'d in robots.ts (1.4) *and* marked `noindex` (1.2), so it's excluded
  from scoring by two independent mechanisms regardless of how mobile-friendly it is.
  *Technical*: Next 16 moved `viewport` into its own `viewport: Viewport` export — check
  current convention in `node_modules/next/dist/docs/` and add to `web/app/layout.tsx`.

- [x] **1.4 — Tell search engines which pages to look at, and which to skip**
  *In plain terms*: `/admin`, `/cart`, `/checkout`, account pages should never show up
  in a search result. This file tells every crawler what to skip and points to the
  sitemap for everything else.
  *Technical*: new `web/app/robots.ts`. Disallow `/admin`, `/admin/*`, `/cart`,
  `/checkout`, `/orders`, `/orders/*`, `/signin`, `/api/*`; allow everything else;
  `sitemap` field points at `/sitemap.xml`. Cross-check against
  `web/lib/supabase/middleware.ts`'s `PROTECTED_PREFIXES`.

- [x] **1.5 — Give search engines a complete, accurate list of every real page**
  *In plain terms*: the single highest-impact item in this section — a literal list of
  every URL worth indexing, so new products/articles get discovered fast instead of
  waiting on inbound links.
  *Technical*: new `web/app/sitemap.ts`. Static entries for `/`, `/our-story`,
  `/explore`, `/privacy`, `/terms`, `/shipping`; dynamic entries per product via
  `getAllProducts` + `web/lib/supabase/static.ts`. Exclude fully-disabled products.

- [x] **1.6 — State each page's one "official" address**
  *In plain terms*: if the same content is reachable at two addresses (www vs non-www,
  trailing slash or not), Google has to guess which is "real" and can split ranking
  credit. This removes the guesswork.
  *Technical*: `alternates.canonical` on each page's metadata, especially
  `web/app/products/[slug]/page.tsx` and the homepage.

- [x] **1.7 — Make links to the site look good when shared**
  *In plain terms*: pasting a Poषण link into WhatsApp/iMessage/Twitter should show a
  preview card (image + title + description), not bare text.
  *Technical*: add `openGraph`/`twitter` fields (`layout.tsx`, `products/[slug]`). New
  `web/app/opengraph-image.tsx` (site-wide, generated) and
  `web/app/products/[slug]/opengraph-image.tsx` (per-product; `product.image` when
  present, else a generated card using the `amla`/`turmeric` gradient tokens). Ship the
  generated-fallback version first.

- [ ] **1.8 — Make product photos findable in Google Image Search**
  *In plain terms*: photos today are painted on as a CSS background, invisible to
  Image Search and with no alt text.
  *Technical*: migrate `ProductCard.tsx`/`ProductHero.tsx` from CSS `background-image`
  to `next/image` with `alt: `${product.name} — ${product.category}``; add
  `images.remotePatterns` to `web/next.config.ts` if photos end up remote-hosted.
  Sequence once real photography lands.

- [x] **1.9 — Add a proper app icon/manifest**
  *In plain terms*: minor polish — browser-tab icon, "add to home screen" support.
  *Technical*: new `web/app/manifest.ts` with colors from `app/tokens.css`; a proper
  `apple-icon.png` (180×180) — check `logo-icon.png`'s native resolution first.

- [x] **1.10 — General config housekeeping**
  *In plain terms*: a placeholder for future needs, not an action today.
  *Technical*: `web/next.config.ts` is currently empty — home for
  `images.remotePatterns` (1.8) and future `redirects()`/`headers()`.

---

## 2. Structured data (JSON-LD)

*A hidden block of clearly-labeled facts attached to a page — "this page's price is
₹450" — in a strict format machines can parse with zero ambiguity, instead of guessing
from prose. **Not visible on the website** — it lives as a `<script
type="application/ld+json">` tag in the page's raw HTML, never rendered; only seen via
"View Page Source"/dev tools. Mostly restates facts already visible elsewhere on the
page in normal text (Google requires that overlap for several of these blocks). Depends
on §1.1. Verify each block with Google's Rich Results Test.*

- [x] **2.1 — Shared rendering helper**
  New `web/app/components/JsonLd.tsx` — renders
  `<script type="application/ld+json">{JSON.stringify(data)}</script>`. Every item below
  uses this.

- [x] **2.2 — State who the brand is, once, sitewide**
  *In plain terms*: a single block of facts about Poषण as a company — name, logo, real
  web address — placed on every page.
  *Technical*: rendered once in `web/app/layout.tsx`. `name: "Poषण"`,
  `alternateName: "Poshan"`, `url` from `metadataBase`, `logo`, `description`.
  `sameAs: []` — populate if/when real social accounts exist. Skip `WebSite` +
  `SearchAction` — no real site-search feature exists to back it.

- [x] **2.3 — State the page hierarchy explicitly**
  *In plain terms*: mirrors the product page's existing visual breadcrumb
  ("Products · {category} · {product name}") in machine-readable form.
  *Technical*: on `web/app/products/[slug]/page.tsx`, must exactly match the visible
  breadcrumb: `Home → Products → {category} → {product.name}`.

- [x] **2.4 — State every product's real facts explicitly**
  *In plain terms*: name, price, stock, category as hard facts — what an AI shopping
  assistant would quote when asked "does Poषण sell X, how much."
  *Technical*: mapped from `web/lib/products.ts`'s `Product`/`Variant` types — `name`/
  `description`/`category` direct; `image` omitted if undefined; `brand` hardcoded to
  Poषण; `sku` omitted (no real SKU field exists — `variant.id` is a UUID); `offers` one
  per variant (`price`, `priceCurrency: "INR"`, `availability` from `isInStock`, `url`);
  nutrition/weight/vegetarian/storage mapped as `additionalProperty` entries or left
  visible-only; **no `aggregateRating`/`review`** — no reviews feature exists, don't
  fabricate one.

- [ ] **2.5 — State each recipe's ingredients/steps explicitly**
  *In plain terms*: unlocks Google's recipe rich-result card and is read natively by AI
  cooking assistants.
  *Technical*: any `/explore` recipe gets `Recipe` JSON-LD (`recipeIngredient`,
  `recipeInstructions`, `prepTime`/`cookTime`, `recipeYield`, `nutrition`). Do once
  `/explore` ships recipe content (§4.3).

- [ ] **2.6 — State product-page FAQs explicitly**
  *In plain terms*: FAQ structured data does not need a separate page — it attaches to
  any page with a real visible Q&A section, and per-product placement is the better fit
  here (answering "is this vegetarian?" right where someone's deciding to buy it).
  *Technical*: `FAQPage` JSON-LD on `web/app/products/[slug]/page.tsx`, generated from
  the visible Q&A added in §4.2. No standalone `/faq` route.

---

## 3. AEO/GEO-specific items

*§1 and §2 are classic SEO, aimed at ranking in a Google results page. This section
targets showing up as a citation/recommendation inside an AI system's answer (ChatGPT,
Claude, Perplexity, Google AI Overviews) — newer, less standardized.*

- [x] **3.1 — Explicitly welcome AI crawlers**
  *In plain terms*: a second pass on the robots file naming specific AI crawlers and
  explicitly allowing them — some sites block these by default, which works against
  being cited.
  *Technical*: second pass on `web/app/robots.ts`. Explicit rules for OpenAI's
  `GPTBot`/`OAI-SearchBot`/`ChatGPT-User`; Anthropic's `ClaudeBot`/`anthropic-ai`/
  `Claude-Web`; Perplexity's `PerplexityBot`/`Perplexity-User`; Google's
  `Google-Extended`; `CCBot`; `Bytespider`, `Amazonbot`, `Applebot-Extended`. All
  allowed on the same public paths as 1.4's general rule.

- [x] **3.2 — Add an "for AI" summary file (`llms.txt`)** — minimal version; add a Recipes/Guides section once §4.1's `/explore` route ships
  *In plain terms*: an emerging, informal convention — a short curated brand summary +
  key links for AI systems, instead of making them piece it together from a full crawl.
  Cheap, unproven, near-zero downside.
  *Technical*: new `web/public/llms.txt` (plain static file). Brand description, links
  to `/our-story`, `/products/*`, `/explore`, positioning statement. Draft after §4
  content exists.

- [x] **3.3 — Why factual, specific content helps AI answer engines** *(reference note, not an action item)*
  Answer engines chunk pages into passages and match/rank them against a question, then
  cite the source. Short, self-contained factual statements and explicit Q&A pairs chunk
  far more cleanly than long narrative prose — direct rationale for §4.2/§2.6. The
  brand's own voice constraint (`Design.md`'s "understated, factual, never direct health
  claims") is an advantage here, not just a limitation: concrete, verifiable copy
  ("fermented for 24 hours using live kefir grains") is more citable than vague
  superlative marketing language would be, even if the brand allowed it.

- [x] **3.4 — Traditional indexing gates AEO, not a separate track** *(reference note, not an action item)*
  Most AI engines' citation layer sits on top of an existing web search index rather
  than an independent crawl (ChatGPT search mode and Bing Copilot lean on Bing's index;
  Google AI Overviews on Google's; Perplexity leans on established search infra too). A
  page that isn't crawlable, canonical, or indexed by traditional search is unlikely to
  be surfaced by an AI engine regardless of `llms.txt`/FAQ schema quality. §1 is a hard
  prerequisite for §3, not parallel work.

---

## 4. Content strategy

*Ongoing editorial work, not a one-time task. Realistic timeline: 3–6 months minimum to
show ranking movement, 6–12 months for competitive terms; AI-citation impact is even
less predictable. Treat as continuous, not a checklist that finishes.*

**Hard constraint on every item below**: no curative framing, no "cures/treats/boosts
immunity/detoxifies," no supplement-style or miracle-food language — per `Design.md`'s
brand voice and the "No Exaggerated Health Claims" principle (already stated in the root
layout description, homepage trust bar, `our-story`'s stated principles). Every topic
below is process/tradition/education-focused — both the brand-compliant version and,
per §3.3, the more AI-citable version.

- [ ] **4.1 — `/explore` route + pipeline**
  New section under `web/app/explore/`, houses recipes and educational/process guides.
  All-TSX, no-CMS, no-MDX — matches the codebase's current pattern. For content needing
  a source-of-truth file, the existing `Quotes.txt` → `build-quotes.py` →
  `web/lib/quotes.json` → `Footer.tsx` pipeline is a reasonable precedent to follow
  conceptually.

- [ ] **4.2 — Per-product FAQ sections** *(highest-leverage, lowest-risk content item)*
  Add a visible "Frequently asked questions" section to
  `web/app/products/[slug]/page.tsx`, per product, reusing existing fields — close to
  pure reuse, not new writing:
  - "How should I store this?" ← `product.storage`
  - "How long does it keep once opened?" ← `product.shelfLife`
  - "Is this vegetarian?" ← `product.vegetarian`
  - "What's in it?" ← `product.ingredients`
  - "How do I use it?" ← `product.usageBullets`

  Feeds §2.6 directly once shipped.

- [ ] **4.3 — Recipes under `/explore`**
  Real recipes using Poषण products as an ingredient — targets "recipes using [product]"
  search/AI-question intent. Starting set: one recipe per existing product (kefir,
  mango pickle, lacto-fermented carrots, dryfruit millet laddoo). Feeds §2.5.

- [ ] **4.4 — Educational/process guides under `/explore`**
  A note on "benefits of [product]" queries: real demand exists for that phrasing, but
  the brand's no-exaggerated-claims rule means these guides can't answer with clinical
  claims. The honest approach is traditional-use framing ("traditionally associated
  with...", never present-tense "cures"/"treats") plus real, checkable nutritional facts
  (`product.nutritionRows`) — informative, not promotional. Topic 3 below is the direct
  vehicle for this.
  1. "What is lacto-fermentation, and how is it different from vinegar pickling?" —
     process/science education, zero health claims.
  2. "How we ferment our Kefir: grains, time, and temperature" — operational
     transparency.
  3. "Reading an Ayurvedic ingredient: what haldi, elaichi, and triphala are
     traditionally used for" — strictly historical/traditional-use framing, never
     present-tense clinical claims. Natural home for "benefits of [product]" demand —
     highest claim-drift risk, needs the most editorial care.
  4. "Why we don't use preservatives — and what that means for shelf life" — reuses
     `shelfLife`/`storage`/`netQuantity` directly, no claim risk.
  5. "Small-batch, made-to-order: what that actually means for a jar of pickle" —
     process/operations content.

  Each should go deeper than existing `our-story` content rather than re-explaining it.

---

## 5. Recommended implementation order

1. **1.2** — homepage + other missing metadata
2. **1.1** — `NEXT_PUBLIC_SITE_URL` + `metadataBase` + title template
3. **1.4** — `robots.ts` baseline rules
4. **1.5** — `sitemap.ts`
5. **1.6** — `alternates.canonical`
6. **1.3** — `viewport`
7. **2.1 + 2.2** — JSON-LD helper + Organization facts
8. **2.3** — breadcrumb structured data
9. **2.4** — Product/Offer structured data
10. **3.1** — AI-crawler robots directives
11. **1.9 + 1.10** — manifest/icon + next.config housekeeping
12. **1.7** — social share metadata + generated fallback images
13. **1.8** — product image markup migration
14. **3.2** — `llms.txt`
15. **4.1** — `/explore` route + pipeline
16. **4.2** — per-product FAQ sections
17. **2.6** — FAQ structured data
18. **4.3** — recipes under `/explore`, then **2.5** — Recipe structured data
19. **4.4** — educational/process guides

## Critical files

- `web/app/layout.tsx` — root metadata, `metadataBase`, viewport, sitewide Organization structured data
- `web/app/products/[slug]/page.tsx` — `generateMetadata`, canonical, social share image, Product/Offer/breadcrumb/FAQ structured data, per-product FAQ section
- `web/lib/products.ts` — the `Product`/`Variant` types every §2 mapping is written against
- `web/app/robots.ts` (new) — baseline rules (§1.4) and AI-bot directives (§3.1), same file, two passes
- `web/app/sitemap.ts` (new) — the indexing backbone
- `web/next.config.ts` — currently empty; gains `images.remotePatterns` once §1.8 lands
- `web/app/explore/` (new) — §4's content route
- `web/lib/supabase/static.ts` — reused by `sitemap.ts`, same cookie-less-context reason `generateStaticParams` already uses it

## Verification

- **§1**: `npm run build` in `web/` to confirm `robots.ts`/`sitemap.ts`/`manifest.ts`
  compile and emit correctly; fetch `/robots.txt`, `/sitemap.xml`,
  `/manifest.webmanifest` in dev and inspect directly.
- **§2**: Google's Rich Results Test to confirm each structured-data block validates;
  visually diff FAQ/breadcrumb structured data against the real rendered page content.
- **§3**: `robots.txt` output inspection for per-bot rules; `llms.txt` reachable at
  `/llms.txt`.
- **§4**: standard content review against the brand-voice constraint — specifically
  re-check topic 4.4.3 (Ayurvedic ingredient traditional-use claims) for present-tense
  clinical language before publishing.
