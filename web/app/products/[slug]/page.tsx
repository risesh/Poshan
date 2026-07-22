import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, getAllProducts } from "@/lib/products";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import ProductHero from "@/app/components/ProductHero";
import ProductPanel from "@/app/components/ProductPanel";
import Footer from "@/app/components/Footer";

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
    title: `${product.name} — Poषण`,
    description: `${product.name} — ${product.description}`,
  };
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const supabase = await createClient();
  const product = await getProductBySlug(supabase, slug);
  if (!product) notFound();

  return (
    <>
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
