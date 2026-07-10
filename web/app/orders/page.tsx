import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Footer from "@/app/components/Footer";

export const metadata = {
  title: "Past orders — Poषण",
  description: "Your Poषण order history.",
};

const formatRupees = (n: number) => "₹" + n.toLocaleString("en-IN");
const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Authored — no design source for an order-history list (5a is a single
// order's confirmation receipt, not a history view). Empty state reuses
// .cart-empty verbatim per the established pattern; populated rows reuse
// .cart-item's compact variant rather than inventing new visual language.
export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: orders } = user
    ? await supabase
        .from("orders")
        .select("id, order_number, created_at, total_rupees, order_status, order_items(product_name_snapshot, quantity)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <>
      <section className="cart-header">
        <div className="cart-header__inner">
          <h1 className="cart-header__title">Past orders</h1>
        </div>
      </section>

      <section className="cart-body">
        {!orders || orders.length === 0 ? (
          <div className="cart-empty">
            <h2 className="cart-empty__title">You haven&apos;t placed any orders yet</h2>
            <Link href="/#products" className="cart-empty__link">
              Browse products
            </Link>
          </div>
        ) : (
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <div className="cart-items">
              {orders.map((order) => {
                const items = order.order_items as { product_name_snapshot: string; quantity: number }[];
                const summary = items.map((i) => `${i.product_name_snapshot} × ${i.quantity}`).join(", ");
                return (
                  <Link
                    href={`/orders/${order.id}`}
                    key={order.id}
                    className="cart-item"
                    style={{ gridTemplateColumns: "1fr auto", textDecoration: "none", color: "inherit" }}
                  >
                    <div>
                      <div className="cart-item__badge">
                        #{order.order_number} · {DATE_FMT.format(new Date(order.created_at))} ·{" "}
                        {STATUS_LABEL[order.order_status] ?? order.order_status}
                      </div>
                      <div className="cart-item__name">{summary}</div>
                    </div>
                    <span className="cart-item__price">{formatRupees(order.total_rupees)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <Footer compact />
    </>
  );
}
