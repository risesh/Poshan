import { createClient } from "@/lib/supabase/server";
import { getOrderList } from "@/lib/admin-data";
import { IST_TIME_ZONE, istDateString, istDateDaysAgo, istDayStart, istDayEnd } from "@/lib/order-math";
import OrdersFilterBar from "./OrdersFilterBar";
import OrderStatusSelect from "./OrderStatusSelect";

export const metadata = { title: "Orders" };

const formatRupees = (n: number) => "₹" + n.toLocaleString("en-IN");
// Explicit timeZone — see lib/order-math.ts's estimatedDeliveryDate/
// IST_TIME_ZONE note on why formatting a date without this can render a
// calendar day off from what actually happened in India.
const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: IST_TIME_ZONE });

export default async function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  const params = await props.searchParams;

  // IST calendar dates throughout — see istDateString/istDayStart/istDayEnd
  // in lib/order-math.ts for why "today"/"the last 30 days" has to be
  // resolved against India's calendar day, not whatever timezone this
  // server process happens to be running in.
  const todayStr = istDateString();
  const defaultFromStr = istDateDaysAgo(29);

  const fromStr = typeof params.from === "string" ? params.from : defaultFromStr;
  const toStr = typeof params.to === "string" ? params.to : todayStr;
  const searchStr = typeof params.q === "string" ? params.q : "";

  const supabase = await createClient();
  const orders = await getOrderList(supabase, istDayStart(fromStr), istDayEnd(toStr), searchStr);

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

      <OrdersFilterBar from={fromStr} to={toStr} search={searchStr} />

      <div className="admin-card admin-orders-summary">
        <div>
          <div className="admin-stat-card__label">Orders in range</div>
          <div className="admin-stat-card__value">{orders.length}</div>
        </div>
        <div>
          <div className="admin-stat-card__label">Revenue (excl. cancelled)</div>
          <div className="admin-stat-card__value">{formatRupees(revenueRupees)}</div>
        </div>
        {/* Plain link, not a client-side blob download — the export route
            (app/api/admin/orders/export/route.ts) streams the CSV straight
            from the same from/to/q this page is currently showing, so
            what's downloaded always matches what's on screen. */}
        <a
          className="admin-filter-bar__apply admin-orders-export-btn"
          href={`/api/admin/orders/export?from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}${searchStr ? `&q=${encodeURIComponent(searchStr)}` : ""}`}
        >
          Download CSV
        </a>
      </div>

      {orders.length === 0 ? (
        <div className="admin-chart-empty">
          {searchStr ? "No orders match your search in this date range." : "No orders in this date range."}
        </div>
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
                  {/* The account's own profiles.phone is never actually
                      saved anywhere in the app — this is the delivery
                      contact number from the order's address instead (see
                      getOrderList's comment in lib/admin-data.ts). */}
                  {order.address?.recipient_phone && (
                    <div className="admin-order-card__muted">{order.address.recipient_phone}</div>
                  )}
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
