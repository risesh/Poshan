import { createClient } from "@/lib/supabase/server";
import { getOrderList } from "@/lib/admin-data";
import OrdersFilterBar from "./OrdersFilterBar";
import OrderStatusSelect from "./OrderStatusSelect";

export const metadata = { title: "Orders" };

const formatRupees = (n: number) => "₹" + n.toLocaleString("en-IN");
const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  const params = await props.searchParams;

  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 29);

  const fromStr = typeof params.from === "string" ? params.from : isoDate(defaultFrom);
  const toStr = typeof params.to === "string" ? params.to : isoDate(today);

  const supabase = await createClient();
  const orders = await getOrderList(supabase, new Date(`${fromStr}T00:00:00`), new Date(`${toStr}T00:00:00`));

  // Excludes cancelled orders — matches how "revenue" is defined on the
  // dashboard (lib/admin-data.ts), so the two views never disagree on what
  // counts. Cancelled orders still show up in the list itself, just not
  // in this sum.
  const revenueRupees = orders
    .filter((o) => o.order_status !== "cancelled")
    .reduce((sum, o) => sum + o.total_rupees, 0);

  return (
    <div className="admin-page">
      <h1 className="admin-page__title">Orders</h1>

      <OrdersFilterBar from={fromStr} to={toStr} />

      <div className="admin-card admin-orders-summary">
        <div>
          <div className="admin-stat-card__label">Orders in range</div>
          <div className="admin-stat-card__value">{orders.length}</div>
        </div>
        <div>
          <div className="admin-stat-card__label">Revenue (excl. cancelled)</div>
          <div className="admin-stat-card__value">{formatRupees(revenueRupees)}</div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="admin-chart-empty">No orders in this date range.</div>
      ) : (
        <div className="admin-orders-list">
          {orders.map((order) => (
            <div className="admin-card admin-order-card" key={order.id}>
              <div className="admin-order-card__header">
                <div className="admin-order-card__header-left">
                  <span className="admin-order-card__number">#{order.order_number}</span>
                  <OrderStatusSelect orderId={order.id} status={order.order_status} />
                </div>
                <span className="admin-order-card__date">{DATE_FMT.format(new Date(order.created_at))}</span>
              </div>
              <div className="admin-order-card__body">
                <div className="admin-order-card__col">
                  <div className="admin-order-card__label">Customer</div>
                  <div>{order.customer_name || "—"}</div>
                  <div className="admin-order-card__muted">{order.customer_email}</div>
                </div>
                <div className="admin-order-card__col">
                  <div className="admin-order-card__label">Products</div>
                  {order.items.map((item, i) => (
                    <div key={i}>
                      {item.product_name_snapshot} ({item.variant_label_snapshot}) × {item.quantity}
                    </div>
                  ))}
                </div>
                <div className="admin-order-card__col">
                  <div className="admin-order-card__label">Delivery address</div>
                  {order.address ? (
                    <div className="admin-order-card__muted">
                      {order.address.recipient_name}, {order.address.line1}
                      {order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city},{" "}
                      {order.address.state} {order.address.postal_code}
                    </div>
                  ) : (
                    <div className="admin-order-card__muted">—</div>
                  )}
                </div>
                <div className="admin-order-card__col admin-order-card__col--total">
                  <div className="admin-order-card__label">Total</div>
                  <div className="admin-order-card__total">{formatRupees(order.total_rupees)}</div>
                  <div className="admin-order-card__muted">
                    {order.payment_method.toUpperCase()} · {order.payment_status}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
