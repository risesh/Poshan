import { createClient } from "@/lib/supabase/server";
import { getAdminPromoCodeList } from "@/lib/admin-data";
import { getAllProducts } from "@/lib/products";
import PromoCodesManager from "./PromoCodesManager";

export const metadata = { title: "Promo codes — Controls" };

export default async function AdminControlsPromoCodesPage() {
  const supabase = await createClient();
  const [promoCodes, products] = await Promise.all([
    getAdminPromoCodeList(supabase),
    getAllProducts(supabase),
  ]);
  const productOptions = products.map((p) => ({ id: p.id, name: p.name }));

  return <PromoCodesManager promoCodes={promoCodes} products={productOptions} />;
}
