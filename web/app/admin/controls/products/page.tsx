import { createClient } from "@/lib/supabase/server";
import { getAdminProductList } from "@/lib/admin-data";
import ProductsManager from "./ProductsManager";

export const metadata = { title: "Products — Controls" };

export default async function AdminControlsProductsPage() {
  const supabase = await createClient();
  const products = await getAdminProductList(supabase);

  return <ProductsManager products={products} />;
}
