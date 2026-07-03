# Poषण Design System v2

## Brand Identity

**Brand Name:** Poषण (mixed English + Devanagari script)
**Tagline:** foods that heal
**Positioning:** Clean, sophisticated healthy foods brand rooted in Ayurvedic tradition and traditional Indian cooking heritage. Emphasis on transparency, traceability, and healing through food.

---

## Logo

The primary logo is the teal mortar-and-pestle icon (side view, textured/distressed style with bold herb leaves and curved pestle handle) paired with the Poषण wordmark.

### Logo Variants

| Variant | Usage |
|---------|-------|
| **Icon + Wordmark** | Primary — website header, packaging, signage |
| **Icon only** | Favicon, app icon, social avatar, small-format stamps |
| **Wordmark only** | Footer, minimal contexts, embossed/foil treatments |

### Logo Spacing

Maintain clear space equal to the height of the "o" in "Poषण" on all sides of the logo.

### Logo Don'ts

- Do not recolour the mortar icon outside the approved palette
- Do not separate the leaves from the mortar
- Do not rotate or distort
- Do not place on busy/patterned backgrounds without a solid backing shape

---

## Colour Palette

### Primary Colours

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Ink** | `#1E3A34` | 30, 58, 52 | Primary text, dark backgrounds, buttons, icon details |
| **Teal** | `#4A9B8E` | 74, 155, 142 | Mortar icon, subtitle text, accent links, category labels |
| **Bone** | `#F5F0E6` | 245, 240, 230 | Primary background, hero section, light surfaces |

### Secondary Colours

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Turmeric** | `#E4A335` | 228, 163, 53 | Warm accent, golden product gradients, highlights |
| **Amla** | `#7A9B76` | 122, 155, 118 | Section headers, secondary green, herbaceous accents |
| **Sindoor** | `#C1502E` | 193, 80, 46 | Traditional-use callouts, alert/emphasis, special labels |
| **Mist** | `#DCE6DE` | 220, 230, 222 | Borders, dividers, pill outlines, subtle backgrounds |

### Gradients

| Name | CSS | Usage |
|------|-----|-------|
| Teal | `linear-gradient(135deg, #1E3A34 0%, #2a5249 40%, #4A9B8E 100%)` | Philosophy banner, primary product cards |
| Amla | `linear-gradient(160deg, #1E3A34 0%, #3d5a3a 50%, #7A9B76 100%)` | Digestive/green product cards |
| Turmeric | `linear-gradient(160deg, #4a3a1e 0%, #8a6d2e 50%, #E4A335 100%)` | Golden/anti-inflammatory product cards |

### Colour Usage Rules

- **Page backgrounds** are always Bone or white. Dark colours are reserved for feature sections only.
- **Text on Bone** uses Ink at full or reduced opacity.
- **Text on dark/gradient** uses Bone or Mist. Minimum 12px.
- **Buttons** use solid Ink bg with Bone text. On dark backgrounds, invert.

---

## Typography

### Font Stack

| Role | Family | Weight | Fallback |
|------|--------|--------|----------|
| Brand / Display | Josefin Sans | 300 (Light) | sans-serif |
| Body / UI | Josefin Sans | 400 (Regular) | sans-serif |
| Editorial / Product Names | Libre Baskerville | 400 | serif |
| Data / Monospace | DM Mono | 400–500 | monospace |

### Brand Name Treatment

- **Font:** Josefin Sans Light (300)
- **Letter-spacing:** 0px (natural) — no extra spacing so षण reads as a connected unit
- **Transform:** Uppercase, except "o" which is always lowercase
- **Devanagari (षण):** Same font-size as Latin characters — cap height matches "P". The conjunct षण must read as a connected unit with no extra spacing.
- **Subtitle "foods that heal":** Josefin Sans Regular (400), 13px, letter-spacing 1px, colour Teal on light / Mist on dark

### Type Scale

| Element | Family | Size | Weight | Colour |
|---------|--------|------|--------|--------|
| Hero title | Josefin Sans | 44px | 300 | Ink |
| Section title | Josefin Sans | 22px | 300 | Ink |
| Section label | Josefin Sans | 11px, uppercase | 400 | Teal |
| Product name | Libre Baskerville | 14–18px | 400 | Ink / Bone |
| Category | Josefin Sans | 9px, uppercase | 400 | Teal |
| Body / description | Josefin Sans | 12–13px | 400 | Ink @ 75% |
| Pills / attributes | DM Mono | 10px | 400 | Ink @ 80% |
| Price | DM Mono | 14–16px | 400 | Ink |
| Batch labels | DM Mono | 11px | 400 | Ink @ 50% |
| Batch values | DM Mono | 11px | 500 | Ink |
| Nav links | Josefin Sans | 12px, uppercase | 400 | Ink @ 70% |
| Buttons | Josefin Sans | 10px | 400 | Bone on Ink |

### Readability Rules

- Body text minimum 12px at weight 400. Never use weight 300 below 16px.
- Subtitle minimum 13px at weight 400 for mobile legibility.
- On dark backgrounds, text minimum 12px in Bone or Mist.

---

## Components

### Navigation

- Horizontal layout — logo left, links right
- Logo: Teal icon square (6px radius) + wordmark at natural spacing (0px)
- Links: 12px uppercase, Ink @ 70%, hover → Teal
- Border: 1px bottom in Mist

### Hero Section

- Background: Bone (`#F5F0E6`)
- Pre-heading: 11px uppercase, Amla green
- Title: 44px Josefin Sans Light, Ink, letter-spacing 0px
- Subtitle: 14px Regular, Teal, 1px spacing
- CTA: Outlined, 1px Ink border. Hover fills Ink with Bone text.

### Product Cards

- White background, 10px radius, 1px Mist border
- Image area: 130px height, gradient fill, tag pill top-left
- Description: 12px weight 400, Ink @ 75%
- Attribute pills: 1px Mist border, DM Mono 10px
- Add to cart: Solid Ink background, always visible

### Product Label (Detail View)

- Two-column: gradient product card left, batch label right
- Batch label: Bone bg, DM Mono data grid, Sindoor for "Traditional use"

### Philosophy Banner

- Background: Teal Gradient
- Quote: Libre Baskerville 18px italic, Bone
- Attribution: 11px uppercase, Mist

---

## Spacing and Layout

| Property | Value |
|----------|-------|
| Max content width | 680px (centred) |
| Section padding | 36px vertical, 24px horizontal |
| Product grid | 3 columns, 14px gap |
| Label detail | 2 columns (1fr / 1.2fr), 16px gap |

### Border Radius

| Element | Radius |
|---------|--------|
| Cards | 10px |
| Buttons | 4px |
| Tag pills | 4px |
| Attribute pills | 3px |
| Icon containers | 6px |

---

## Interaction and Motion

- Card hover: `translateY(-3px)`, 0.2s ease
- Button hover (light bg): Fill Ink, text → Bone
- Button hover (dark bg): Lighten to `#2a5249`
- Nav link hover: Colour → Teal
- All transitions: 0.2s ease default

---

## Brand Voice and Tone

### Principles

- **Rooted, not rustic.** Modern clarity with Ayurvedic depth. Never folksy.
- **Transparent, not clinical.** Share batch data and sourcing without sounding like a lab report.
- **Confident, not loud.** Let product quality speak. Minimal copy, maximum trust.

### Copy Style

- Product descriptions: one sentence, conversational — *"A daily spoon, not a supplement aisle."*
- Attribute pills: DM Mono, factual — `Iron-rich`, `No fillers`, `Small batch`
- Traditional use: warm, instructive — *"Taken with warm milk at night for rest and recovery."*
- Clinical notes: understated, factual. Never direct health claims.

### Language Mix

Hindi/Sanskrit terms used naturally alongside English without translation when commonly known (haldi, elaichi, triphala, ashwagandha). Devanagari script appears in the brand name and as accent text on labels.

---

## CSS Custom Properties

```css
:root {
  /* Primary */
  --color-ink: #1E3A34;
  --color-teal: #4A9B8E;
  --color-bone: #F5F0E6;

  /* Secondary */
  --color-turmeric: #E4A335;
  --color-amla: #7A9B76;
  --color-sindoor: #C1502E;
  --color-mist: #DCE6DE;

  /* Gradients */
  --gradient-teal: linear-gradient(135deg, #1E3A34 0%, #2a5249 40%, #4A9B8E 100%);
  --gradient-amla: linear-gradient(160deg, #1E3A34 0%, #3d5a3a 50%, #7A9B76 100%);
  --gradient-turmeric: linear-gradient(160deg, #4a3a1e 0%, #8a6d2e 50%, #E4A335 100%);

  /* Typography */
  --font-display: 'Josefin Sans', sans-serif;
  --font-editorial: 'Libre Baskerville', serif;
  --font-mono: 'DM Mono', monospace;

  /* Brand Name */
  --brand-letter-spacing: 0px; /* natural spacing */
  --subtitle-letter-spacing: 1px;

  /* Spacing */
  --radius-card: 10px;
  --radius-button: 4px;
  --radius-pill: 3px;
  --border-color: #DCE6DE;
}
```
