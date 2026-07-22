import { createClient } from "@/lib/supabase/server";
import { getAdminProductList } from "@/lib/admin-data";
import ProductRow from "./ProductRow";
import NewProductForm from "./NewProductForm";

export const metadata = { title: "Products — Controls — Admin — Poषण" };

export default async function AdminControlsProductsPage() {
  const supabase = await createClient();
  const products = await getAdminProductList(supabase);

  return (
    <>
      <div className="admin-card admin-controls-card">
        <div className="admin-card__header">
          <span className="admin-card__title">Products ({products.length})</span>
        </div>
        {products.length === 0 ? (
          <div className="admin-chart-empty">No products yet.</div>
        ) : (
          <div className="admin-controls-table">
            <div className="admin-controls-table__head">
              <span>Product</span>
              <span>Category</span>
              <span>Enabled</span>
              <span></span>
            </div>
            {products.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      <div className="admin-card admin-controls-card">
        <div className="admin-card__header">
          <span className="admin-card__title">Add a product</span>
        </div>
        <NewProductForm />
      </div>
    </>
  );
}
