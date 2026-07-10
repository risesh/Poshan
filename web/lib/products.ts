// Interim local product catalog — mirrors assets/js/main.js's PRODUCT_CATALOG
// exactly (same ids/prices/copy), extended with the detail-page fields
// authored in kefir.html/punjabi-mango-pickle.html/lacto-fermented-carrots.html/
// dryfruit-millet-laddoo.html. Gets replaced by a Supabase fetch against the
// `products`/`product_variants` tables in backend Phase 2; every call site
// here (ProductCard, product-detail pages) is written against this same
// shape so that swap is a data-source change, not a rewrite.
export type Variant = {
  id: string; // matches the old data-product-id / becomes product_variants.sku eventually
  size: string; // e.g. '500ml' | '1L'
  priceRupees: number;
  unitLabel: string; // e.g. '/ 500 ml jar'
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  badge?: string;
  badgeStyle?: "dark" | "light";
  desc: string;
  attrs: string[];
  price: number;
  size: string;
  image?: string;
  gradient?: "amla" | "turmeric";
  inStock: boolean;
  tabCategories: string[]; // matches the old data-categories values (tab filtering)

  // Detail-page-only fields
  descriptionLines: string[]; // rendered as separate <br>-joined lines, matches product-info__desc
  detailAttrs: string[]; // product-info__attrs differs from the card's attrs
  usageLines: string[];
  vegetarian: boolean;
  ingredients: string;
  netQuantity: string;
  storage: string;
  shelfLife: string;
  nutritionBasis: string;
  nutritionRows: [string, string][];
  variants: Variant[]; // single-entry for every product except Kefir (500ml / 1L)
  placeholderContent?: boolean; // true = author-placeholder copy, not sourced from the design (see CLAUDE.md)

  // Cart line-item thumbnail (cart.html has no product photos, just a
  // gradient swatch + name — matches assets/js/main.js's PRODUCT_CATALOG)
  cartBadge: string; // e.g. 'Probiotic · Best seller'
  thumbGradient: string;
  thumbNameLines: string[]; // 1 or 2 lines, rendered with a <br> between
  thumbNameSize: string; // e.g. '18px' | '14px'
};

export const products: Product[] = [
  {
    id: "kefir-500ml",
    slug: "kefir",
    name: "Kefir",
    category: "Probiotic",
    badge: "Best Seller",
    badgeStyle: "dark",
    desc: "One of the most potent, natural, fermented probiotic food",
    attrs: ["Fermented", "A2 milk", "Small batch"],
    price: 240,
    size: "500ml",
    image: "/kefir.jpg",
    inStock: true,
    tabCategories: ["best-sellers", "probiotics"],
    descriptionLines: [
      'Kefir is a tart, fermented drink made by soaking "Kefir grains" - a symbiotic culture of yeasts and bacteria in milk',
      "- 30+ strains of bacteria & yeast v/s approx. 5 in Curd",
      "- Consume daily for gut health and immunity.",
    ],
    detailAttrs: ["A2 milk", "Made fresh for every order", "Rich in protein, calcium"],
    usageLines: [
      "- Start slow, take 1-2 spoons per day to let your digestion adjust",
      "- Helpful after antibiotics or when digestion feels heavy.",
    ],
    vegetarian: true,
    ingredients: "Pasteurised A2 cow milk, live kefir cultures (Lactococcus, Leuconostoc, kefir yeasts).",
    netQuantity: "500 ml",
    storage: "Refrigerate below 4°C",
    shelfLife: "3-5 days from packing, if kept refrigerated",
    nutritionBasis: "per 100 ml",
    nutritionRows: [
      ["Energy", "62 kcal"],
      ["Protein", "3.3 g"],
      ["Fat", "3.5 g"],
      ["Carbohydrate", "4.2 g"],
      ["Calcium", "115 mg"],
    ],
    variants: [
      { id: "kefir-500ml", size: "500ml", priceRupees: 240, unitLabel: "/ 500 ml jar" },
      { id: "kefir-1l", size: "1L", priceRupees: 440, unitLabel: "/ 1 L jar" },
    ],
    cartBadge: "Probiotic · Best seller",
    thumbGradient: "linear-gradient(135deg,#1E3A34 0%,#4A9B8E 100%)",
    thumbNameLines: ["Kefir"],
    thumbNameSize: "18px",
  },
  {
    id: "punjabi-mango-pickle",
    slug: "punjabi-mango-pickle",
    name: "Punjabi Mango Pickle",
    category: "Probiotic",
    badge: "Seasonal",
    badgeStyle: "light",
    desc: "Traditional lacto-fermented, raw mango pickle from Punjab",
    attrs: ["Fermented", "Seasonal", "Traditional"],
    price: 250,
    size: "250g",
    gradient: "amla",
    inStock: true,
    tabCategories: ["seasonal", "pickles", "probiotics"],
    placeholderContent: true,
    descriptionLines: [
      "A traditional Punjabi-style raw mango pickle, lacto-fermented the way home kitchens have made it for generations.",
      "- Raw mango, mustard oil, and whole spices, fermented slowly for tang and bite",
      "- Live cultures develop naturally over 2-3 weeks, no added vinegar",
      "- A spoonful alongside any meal for a dose of fermented flavor",
    ],
    detailAttrs: ["Fermented", "Seasonal", "Traditional"],
    usageLines: [
      "- Best enjoyed alongside dal, rice, or parathas.",
      "- Refrigerate after opening and use a dry spoon to keep it fresh longer.",
    ],
    vegetarian: true,
    ingredients: "Raw mango, mustard oil, red chilli, mustard seeds, fenugreek, turmeric, salt.",
    netQuantity: "250 g",
    storage: "Cool, dry place; refrigerate after opening",
    shelfLife: "6 months unopened; 4-6 weeks refrigerated after opening",
    nutritionBasis: "per 100 g",
    nutritionRows: [
      ["Energy", "180 kcal"],
      ["Protein", "1.5 g"],
      ["Fat", "14 g"],
      ["Carbohydrate", "12 g"],
      ["Sodium", "850 mg"],
    ],
    variants: [
      { id: "punjabi-mango-pickle", size: "250g", priceRupees: 250, unitLabel: "/ 250 g jar" },
    ],
    cartBadge: "Probiotic · Seasonal",
    thumbGradient: "linear-gradient(135deg,#7A9B76 0%,#E4A335 100%)",
    thumbNameLines: ["Punjabi Mango", "Pickle"],
    thumbNameSize: "14px",
  },
  {
    id: "lacto-fermented-carrots",
    slug: "lacto-fermented-carrots",
    name: "Lacto Fermented Carrots",
    category: "Probiotic",
    badge: "New",
    badgeStyle: "light",
    desc: "Crisp winter carrots, brine-fermented with mustard seeds",
    attrs: ["Live cultures", "Brine-fermented", "Small batch"],
    price: 210,
    size: "250g",
    gradient: "amla",
    inStock: true,
    tabCategories: ["probiotics"],
    placeholderContent: true,
    descriptionLines: [
      "Crisp carrots, brine-fermented the traditional way with mustard seeds for a tangy, probiotic-rich bite.",
      "- Fermented in a simple salt brine, no vinegar or shortcuts",
      "- Live cultures develop naturally over 1-2 weeks",
      "- A crunchy, tangy side to any meal, or eaten straight from the jar",
    ],
    detailAttrs: ["Live cultures", "Brine-fermented", "Small batch"],
    usageLines: [
      "- A few pieces alongside a meal help digestion.",
      "- Keep refrigerated and use a clean, dry spoon each time.",
    ],
    vegetarian: true,
    ingredients: "Carrots, water, sea salt, mustard seeds.",
    netQuantity: "250 g",
    storage: "Refrigerate at all times",
    shelfLife: "4-6 weeks refrigerated",
    nutritionBasis: "per 100 g",
    nutritionRows: [
      ["Energy", "35 kcal"],
      ["Protein", "1 g"],
      ["Fat", "0.3 g"],
      ["Carbohydrate", "7 g"],
      ["Sodium", "620 mg"],
    ],
    variants: [
      { id: "lacto-fermented-carrots", size: "250g", priceRupees: 210, unitLabel: "/ 250 g jar" },
    ],
    cartBadge: "Probiotic · New",
    thumbGradient: "linear-gradient(135deg,#7A9B76 0%,#4A9B8E 100%)",
    thumbNameLines: ["Lacto Fermented", "Carrots"],
    thumbNameSize: "14px",
  },
  {
    id: "dryfruit-millet-laddoo",
    slug: "dryfruit-millet-laddoo",
    name: "Dryfruit Millet Laddoo",
    category: "Energy",
    badge: "Instant Energy",
    badgeStyle: "light",
    desc: "Slow-toasted millet with dates, almonds, and cardamom",
    attrs: ["Iron-rich", "No refined sugar", "Small batch"],
    price: 320,
    size: "500g",
    gradient: "turmeric",
    inStock: false,
    tabCategories: ["energy"],
    placeholderContent: true,
    descriptionLines: [
      "Slow-toasted millet laddoos, sweetened only with dates and rounded out with almonds and cardamom.",
      "- No refined sugar — natural sweetness from dates",
      "- Iron-rich millets, toasted slowly for flavor and digestibility",
      "- A quick, wholesome bite for sustained energy",
    ],
    detailAttrs: ["Iron-rich", "No refined sugar", "Small batch"],
    usageLines: [
      "- One or two laddoos make a satisfying mid-day snack.",
      "- Store in an airtight container away from direct sunlight.",
    ],
    vegetarian: true,
    ingredients: "Finger millet (ragi), dates, almonds, cashews, ghee, cardamom.",
    netQuantity: "500 g",
    storage: "Airtight container, room temperature",
    shelfLife: "3 weeks at room temperature",
    nutritionBasis: "per 100 g",
    nutritionRows: [
      ["Energy", "410 kcal"],
      ["Protein", "8 g"],
      ["Fat", "16 g"],
      ["Carbohydrate", "58 g"],
      ["Iron", "4.5 mg"],
    ],
    variants: [
      { id: "dryfruit-millet-laddoo", size: "500g", priceRupees: 320, unitLabel: "/ 500 g box" },
    ],
    // Unused in practice — out of stock, so never addable to cart — kept
    // for type completeness / in case it's restocked later.
    cartBadge: "Energy · Instant Energy",
    thumbGradient: "linear-gradient(135deg,#C97C3D 0%,#E4A335 100%)",
    thumbNameLines: ["Dryfruit Millet", "Laddoo"],
    thumbNameSize: "14px",
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getVariantById(
  id: string
): { product: Product; variant: Variant } | undefined {
  for (const product of products) {
    const variant = product.variants.find((v) => v.id === id);
    if (variant) return { product, variant };
  }
  return undefined;
}
