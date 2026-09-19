import { Resend } from "resend";
import { ADMIN_EMAILS } from "./admin";

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  upi: "UPI",
  card: "Card",
  netbanking: "Netbanking",
};

type NewOrderNotification = {
  orderNumber: number;
  totalRupees: number;
  paymentMethod: string;
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

    await resend.emails.send({
      from,
      to: ADMIN_EMAILS,
      subject: `New order #${order.orderNumber} — ${total}`,
      html: `
        <p>New order <strong>#${order.orderNumber}</strong> just came in.</p>
        <p>
          Total: ${total}<br />
          Payment: ${PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}
        </p>
        <p><a href="${ordersUrl}">View in admin →</a></p>
      `,
    });
  } catch (err) {
    console.error("notifyAdminsOfNewOrder failed:", err);
  }
}
