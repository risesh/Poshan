import type { MetadataRoute } from "next";
import { getAllProducts } from "@/lib/products";
import { createStaticClient } from "@/lib/supabase/static";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

// SEO-ROADMAP.md §1.5. Uses the cookie-less static client (same one
// generateStaticParams uses in products/[slug]/page.tsx) since this runs
// at build/revalidation time with no request context.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createStaticClient();
  const products = await getAllProducts(supabase);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/our-story`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/shipping`, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Excludes fully-disabled products — no reason to invite indexing of a
  // product that isn't purchasable. `inStock` is the only signal
  // getAllProducts exposes for this (it's `products.is_instock` ANDed
  // with per-variant stock), so a product that's merely out of stock
  // across every variant is excluded the same as an admin-disabled one —
  // both read as "nothing on this page is buyable right now."
  const productRoutes: MetadataRoute.Sitemap = products
    .filter((p) => p.inStock)
    .map((p) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  return [...staticRoutes, ...productRoutes];
}
