import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug, products } from "@/lib/products";
import ProductHero from "@/app/components/ProductHero";
import ProductPanel from "@/app/components/ProductPanel";
import Footer from "@/app/components/Footer";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name} — Poषण`,
    description: `${product.name} — ${product.descriptionLines[0]}`,
  };
}

export default async function ProductPage(props: PageProps<"/products/[slug]">) {
  const { slug } = await props.params;
  const product = getProductBySlug(slug);
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
