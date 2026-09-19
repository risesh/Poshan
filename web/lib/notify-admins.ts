import { Resend } from "resend";
import { ORDER_NOTIFICATION_EMAILS } from "./admin";

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  upi: "UPI",
  card: "Card",
  netbanking: "Netbanking",
};

type NewOrderItem = {
  productName: string;
  variantLabel: string;
  qty: number;
};

type NewOrderAddress = {
  recipientName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
};

type NewOrderNotification = {
  orderNumber: number;
  totalRupees: number;
  paymentMethod: string;
  customerName: string;
  items: NewOrderItem[];
  estimatedDelivery: string;
  // null when create-order.ts's profile/address lookup itself failed —
  // still send the rest of the notification rather than dropping it
  // entirely just because the shipping block can't be filled in.
  address: NewOrderAddress | null;
};

// Best-effort admin email for a new order — never allowed to break
// checkout. No-ops immediately if RESEND_API_KEY isn't set (e.g. local
// dev without a key configured), and any send failure is caught and
// logged rather than thrown, since createOrder() awaits this inline.
export async function notifyAdminsOfNewOrder(order: NewOrderNotification): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const total = `₹${order.totalRupees.toLocaleString("en-IN")}`;
    const ordersUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/orders`;

    const itemsBlock = order.items
      .map((item) => `${item.productName} (${item.variantLabel}) × ${item.qty}`)
      .join("<br />");

    const addressBlock = order.address
      ? `${order.address.recipientName}<br />${order.address.line1}${order.address.line2 ? `, ${order.address.line2}` : ""}<br />${order.address.city}, ${order.address.state} ${order.address.postalCode}`
      : "—";

    await resend.emails.send({
      from,
      to: ORDER_NOTIFICATION_EMAILS,
      subject: `New order #${order.orderNumber} — ${total}`,
      html: `
        <p>New order <strong>#${order.orderNumber}</strong> just came in.</p>
        <p>
          Customer: ${order.customerName}<br />
          Total: ${total}<br />
          Payment: ${PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}<br />
          Estimated delivery: ${order.estimatedDelivery}
        </p>
        <p>
          Items:<br />
          ${itemsBlock}
        </p>
        <p>
          Delivering to:<br />
          ${addressBlock}
        </p>
        <p><a href="${ordersUrl}">View in admin →</a></p>
      `,
    });
  } catch (err) {
    console.error("notifyAdminsOfNewOrder failed:", err);
  }
}
