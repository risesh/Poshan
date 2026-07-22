import { createClient } from "@/lib/supabase/server";
import { getAdminPromoCodeList } from "@/lib/admin-data";
import { getAllProducts } from "@/lib/products";
import PromoCodeRow from "./PromoCodeRow";
import NewPromoCodeForm from "./NewPromoCodeForm";

export const metadata = { title: "Promo codes — Controls — Admin — Poषण" };

export default async function AdminControlsPromoCodesPage() {
  const supabase = await createClient();
  const [promoCodes, products] = await Promise.all([
    getAdminPromoCodeList(supabase),
    getAllProducts(supabase),
  ]);
  const productOptions = products.map((p) => ({ id: p.id, name: p.name }));

  return (
    <>
      <div className="admin-card admin-controls-card">
        <div className="admin-card__header">
          <span className="admin-card__title">Promo codes ({promoCodes.length})</span>
        </div>
        {promoCodes.length === 0 ? (
          <div className="admin-chart-empty">No promo codes yet.</div>
        ) : (
          <div className="admin-controls-table">
            <div className="admin-controls-table__head admin-controls-table__head--promo">
              <span>Code</span>
              <span>Discount</span>
              <span>Scope</span>
              <span>Window</span>
              <span>Active</span>
            </div>
            {promoCodes.map((promo) => (
              <PromoCodeRow key={promo.id} promo={promo} products={productOptions} />
            ))}
          </div>
        )}
      </div>

      <div className="admin-card admin-controls-card">
        <div className="admin-card__header">
          <span className="admin-card__title">Add a promo code</span>
        </div>
        <NewPromoCodeForm products={productOptions} />
      </div>
    </>
  );
}
