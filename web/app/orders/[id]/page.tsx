import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchVariantsByIds } from "@/lib/products";
import { IST_TIME_ZONE } from "@/lib/order-math";

// Account-specific order data, gated behind auth (see proxy.ts's
// PROTECTED_PREFIXES) — zero public search value, same reasoning as
// /admin, /cart, /checkout.
export const metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false },
};

const formatRupees = (n: number) => "₹" + n.toLocaleString("en-IN");

// Explicit timeZone on both — see app/orders/page.tsx's DATE_FMT for why
// this matters (defaults to server-local otherwise, which can render a
// calendar day off from what was actually computed/perceived in India).
const ORDER_DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: IST_TIME_ZONE,
});
const DELIVERY_DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: IST_TIME_ZONE,
});

const PAYMENT_LABEL: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  netbanking: "Netbanking",
};

export default async function OrderConfirmationPage(props: PageProps<"/orders/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: order }, { data: profile }] = await Promise.all([
    supabase.from("orders").select("*, order_items(*), addresses(*)").eq("id", id).single(),
    supabase.from("profiles").select("name").eq("id", user.id).single(),
  ]);

  if (!order) notFound();

  const address = order.addresses;
  const firstName = (profile?.name || "").split(" ")[0];

  // Thumbnail image/gradient only — the line items themselves render
  // entirely from the order's own snapshot columns below, never from
  // live product data (a later product edit/removal must never change
  // what a past order shows).
  const variantIds = (
    order.order_items as { product_variant_id: string | null }[]
  )
    .map((item) => item.product_variant_id)
    .filter((id): id is string => !!id);
  const variantLookup = await fetchVariantsByIds(supabase, variantIds);

  return (
    <>
      <section className="confirm-hero">
        <div className="confirm-hero__check">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#F5F0E6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5"></path>
          </svg>
        </div>
        <div className="confirm-hero__eyebrow">Order confirmed</div>
        <h1 className="confirm-hero__title">Thank you{firstName ? `, ${firstName}` : ""}</h1>
        <p className="confirm-hero__desc">
          Your order is in good hands. We&apos;re packing it fresh in small batches and will
          text you the moment it&apos;s on the way.
        </p>
      </section>

      <div className="confirm-meta">
        <div>
          <div className="confirm-meta__label">Order number</div>
          <div className="confirm-meta__value">#{order.order_number}</div>
        </div>
        <div>
          <div className="confirm-meta__label">Order date</div>
          <div className="confirm-meta__value">{ORDER_DATE_FMT.format(new Date(order.created_at))}</div>
        </div>
        <div className="confirm-meta__delivery">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7A9B76" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="6" width="15" height="11" rx="1.5"></rect>
            <path d="M16 9h4l3 3v5h-7z"></path>
            <circle cx="6" cy="18" r="2"></circle>
            <circle cx="18" cy="18" r="2"></circle>
          </svg>
          <div>
            <div className="confirm-meta__delivery-label">Estimated delivery</div>
            <div className="confirm-meta__value">
              {order.estimated_delivery ? DELIVERY_DATE_FMT.format(new Date(order.estimated_delivery)) : "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="confirm-body">
        <div className="confirm-body__left">
          <div className="checkout-section-label">Order details</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 22, maxWidth: 620 }}>
            {order.order_items.map((item: {
              id: string;
              product_variant_id: string | null;
              product_name_snapshot: string;
              variant_label_snapshot: string;
              quantity: number;
              line_total_rupees: number;
            }) => {
              const hit = item.product_variant_id ? variantLookup.get(item.product_variant_id) : undefined;
              const product = hit?.product;
              const imageStyle = product?.image
                ? { backgroundImage: `url('${product.image}')`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: product?.thumbGradient ?? "var(--color-mist)" };
              return (
                <div className="cart-item cart-item--compact-lg" key={item.id}>
                  <div className="cart-item__thumb" style={imageStyle}></div>
                  <div>
                    <div className="cart-item__name">{item.product_name_snapshot}</div>
                    <div className="cart-item__size">
                      {item.variant_label_snapshot} · Qty {item.quantity}
                    </div>
                  </div>
                  <span className="cart-item__price">{formatRupees(item.line_total_rupees)}</span>
                </div>
              );
            })}
          </div>

          <div style={{ maxWidth: 620 }}>
            <div className="cart-summary__rows" style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
              <div className="cart-summary__row">
                <span>Subtotal</span>
                <span>{formatRupees(order.subtotal_rupees)}</span>
              </div>
              <div className="cart-summary__row">
                <span>Shipping</span>
                <span>{order.shipping_rupees === 0 ? "Free" : formatRupees(order.shipping_rupees)}</span>
              </div>
              {order.discount_rupees > 0 && (
                <div className="cart-summary__row cart-summary__row--discount">
                  <span>Discount</span>
                  <span>−{formatRupees(order.discount_rupees)}</span>
                </div>
              )}
            </div>
            <div className="confirm-total-row">
              <span>Total paid</span>
              <span>{formatRupees(order.total_rupees)}</span>
            </div>
            <div className="confirm-paid-via">
              {order.payment_method === "cod"
                ? "Cash on Delivery — pay at your door"
                : `Paid via ${PAYMENT_LABEL[order.payment_method] ?? order.payment_method}`}
            </div>
          </div>
        </div>

        <div className="confirm-body__right">
          <div className="checkout-section-label">Delivery to</div>

          <div className="confirm-deliver-field">
            <div className="confirm-deliver-field__label">Name</div>
            <div className="confirm-deliver-field__value">{address?.recipient_name}</div>
          </div>
          <div className="confirm-deliver-field">
            <div className="confirm-deliver-field__label">Phone number</div>
            <div className="confirm-deliver-field__phone">{address?.recipient_phone}</div>
          </div>
          <div className="confirm-deliver-field">
            <div className="confirm-deliver-field__label">Address</div>
            <div className="confirm-deliver-field__address">
              {address?.line1}
              {address?.line2 ? `, ${address.line2}` : ""},<br />
              {address?.city}, {address?.state} {address?.postal_code}
              <br />
              {address?.country}
            </div>
          </div>

          <Link href="/#products" className="confirm-continue-btn">
            Continue shopping
          </Link>
          <div className="confirm-receipt-note">A receipt has been sent to your email.</div>
        </div>
      </div>
    </>
  );
}
