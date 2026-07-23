import Image from "next/image";
import Footer from "./components/Footer";
import ProductsSection from "./components/ProductsSection";
import { createClient } from "@/lib/supabase/server";
import { getAllProducts } from "@/lib/products";

// No title override — the root layout's default ("Poषण — foods that
// heal") is already the right title for the homepage itself; setting a
// string here would just have the title template append " — Poषण" a
// second time. The description is homepage-specific (mentions actual
// products) rather than the more general brand statement the root layout
// description falls back to for pages that don't set their own.
export const metadata = {
  description:
    "Shop Poषण's small-batch, Ayurvedic-rooted foods — probiotic kefir, lacto-fermented pickles, and traditional millet treats. Clean ingredients, traditional methods, no exaggerated health claims.",
  alternates: { canonical: "/" },
};

export default async function Home() {
  const supabase = await createClient();
  const products = await getAllProducts(supabase);

  return (
    <>
      <header className="hero">
        <div className="hero__brand">
          <Image
            src="/logo-icon.png"
            alt="Poषण"
            width={115}
            height={117}
            className="hero__logo"
          />
          <h1 className="hero__title">
            Po<span>षण</span>
          </h1>
          <h2 className="hero__subtitle">foods that heal</h2>
          <p className="hero__tag">Made for daily life</p>
        </div>
        <div className="hero__panel">
          <h2 className="hero__quote">We are what we consume</h2>
          <p className="hero__quote-body">
            Our diets have changed drastically over the last century, but our
            bodies haven&apos;t.
            <br />
            <span>Poषण</span> products are designed to be good for the human
            body, without any exaggerated health claims.
          </p>
        </div>
      </header>

      <div className="trust">
        <span className="trust__item">All Natural</span>
        <span className="trust__dot">·</span>
        <span className="trust__item">Small Batch</span>
        <span className="trust__dot">·</span>
        <span className="trust__item">No Exaggerated Claims</span>
        <span className="trust__dot">·</span>
        <span className="trust__item">No Ultra-processed Foods</span>
      </div>

      <ProductsSection products={products} />

      <Footer />
    </>
  );
}
