import { Fragment } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Footer from "@/app/components/Footer";

// Account-specific order history, gated behind auth — same reasoning as
// orders/[id]/page.tsx.
export const metadata = {
  title: "Past orders",
  description: "Your Poषण order history.",
  robots: { index: false, follow: false },
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
// .cart-empty verbatim per the established pattern; populated view is a
// real table — order date/expected delivery/total rowspan across an
// order's product lines rather than repeating per line.
export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: orders } = user
    ? await supabase
        .from("orders")
        .select(
          "id, order_number, created_at, estimated_delivery, total_rupees, order_status, order_items(product_name_snapshot, quantity)"
        )
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
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Order date</th>
                  <th>Expected delivery</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const items = order.order_items as { product_name_snapshot: string; quantity: number }[];
                  return (
                    <Fragment key={order.id}>
                      <tr className="orders-table__group-header">
                        <td colSpan={4}>
                          <Link href={`/orders/${order.id}`} className="orders-table__order-link">
                            #{order.order_number} · {STATUS_LABEL[order.order_status] ?? order.order_status}
                          </Link>
                        </td>
                      </tr>
                      {items.map((item, idx) => (
                        <tr key={`${order.id}-${idx}`}>
                          <td className="orders-table__product">
                            {item.product_name_snapshot} × {item.quantity}
                          </td>
                          {idx === 0 && (
                            <>
                              <td className="orders-table__date" rowSpan={items.length}>
                                {DATE_FMT.format(new Date(order.created_at))}
                              </td>
                              <td className="orders-table__date" rowSpan={items.length}>
                                {order.estimated_delivery ? DATE_FMT.format(new Date(order.estimated_delivery)) : "—"}
                              </td>
                              <td className="orders-table__total" rowSpan={items.length}>
                                {formatRupees(order.total_rupees)}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Footer compact />
    </>
  );
}
