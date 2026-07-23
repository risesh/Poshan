import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, getAllProducts, type Product } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import ProductHero from "@/app/components/ProductHero";
import ProductPanel from "@/app/components/ProductPanel";
import Footer from "@/app/components/Footer";
import JsonLd from "@/app/components/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!;

// SEO-ROADMAP.md §2.3. Mirrors the *visible* breadcrumb below exactly
// (Products · {category} · {product.name}) rather than the plan's original
// 4-level "Home → Products → category → name" sketch — Google's structured
// data policy requires this to match what a visitor actually sees on the
// page, and "Home" never appears in the rendered .product-breadcrumb.
function buildBreadcrumbJsonLd(product: Product, slug: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Products", item: `${SITE_URL}/#products` },
      { "@type": "ListItem", position: 2, name: product.category, item: `${SITE_URL}/#products` },
      { "@type": "ListItem", position: 3, name: product.name, item: `${SITE_URL}/products/${slug}` },
    ],
  };
}

// SEO-ROADMAP.md §2.4. Field-by-field mapping decisions are documented
// there — notably: no `sku` (variant.id is a Supabase UUID, not a real
// SKU), no `aggregateRating`/`review` (no reviews feature exists — don't
// fabricate one), and facts with no clean dedicated Product field
// (ingredients, storage, shelf life, vegetarian, nutrition) go under
// `additionalProperty` using the exact same labels ProductPanel.tsx
// already shows, so this never states a fact the visible page doesn't.
function buildProductJsonLd(product: Product, slug: string) {
  const url = `${SITE_URL}/products/${slug}`;
  // products.image_url is stored as either a full external URL or a
  // same-origin path into public/ (e.g. "/kefir.jpg", as seeded today) —
  // JSON-LD needs an absolute URL either way, unlike an <img src> which
  // the browser resolves against the page itself.
  const absoluteImage = product.image
    ? product.image.startsWith("http")
      ? product.image
      : `${SITE_URL}${product.image}`
    : undefined;
  const additionalProperty = [
    { "@type": "PropertyValue", name: "Vegetarian", value: product.vegetarian },
    { "@type": "PropertyValue", name: "Ingredients", value: product.ingredients },
    { "@type": "PropertyValue", name: "Net quantity", value: product.netQuantity },
    { "@type": "PropertyValue", name: "Storage", value: product.storage },
    { "@type": "PropertyValue", name: "Shelf life", value: product.shelfLife },
    ...(product.nutritionBasis
      ? [{ "@type": "PropertyValue", name: "Nutrition basis", value: product.nutritionBasis }]
      : []),
    ...product.nutritionRows.map(([label, value]) => ({
      "@type": "PropertyValue",
      name: label,
      value,
    })),
  ];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    category: product.category,
    ...(absoluteImage ? { image: absoluteImage } : {}),
    brand: { "@type": "Organization", name: "Poषण" },
    additionalProperty,
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      price: v.priceRupees,
      priceCurrency: "INR",
      availability: v.isInStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
    })),
  };
}

// Admin-edited products go live within this window; a brand-new
// admin-created slug not covered by generateStaticParams below renders
// on-demand on first request (Next's default dynamicParams = true), then
// is cached the same as any other slug.
export const revalidate = 60;

export async function generateStaticParams() {
  const supabase = createStaticClient();
  const products = await getAllProducts(supabase);
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const supabase = await createClient();
  const product = await getProductBySlug(supabase, slug);
  if (!product) return {};
  return {
    title: product.name,
    description: `${product.name} — ${product.description}`,
    alternates: { canonical: `/products/${slug}` },
    // og:image/twitter:image come from opengraph-image.tsx in this same
    // route segment automatically — no images field needed here.
    openGraph: {
      type: "website",
      title: product.name,
      description: `${product.name} — ${product.description}`,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: `${product.name} — ${product.description}`,
    },
  };
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const supabase = await createClient();
  const product = await getProductBySlug(supabase, slug);
  if (!product) notFound();

  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd(product, slug)} />
      <JsonLd data={buildProductJsonLd(product, slug)} />

      <div className="product-breadcrumb">
        <Link href="/#products">Products</Link> ·{" "}
        <Link href="/#products">{product.category}</Link> ·{" "}
        <span className="product-breadcrumb__current">{product.name}</span>
      </div>

      <ProductHero product={product} />
      <ProductPanel product={product} />
      <Footer compact />
    </>
  );
}
