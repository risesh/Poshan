import { Resend } from "resend";

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on Delivery",
  upi: "UPI",
  card: "Card",
  netbanking: "Netbanking",
};

type OrderConfirmationItem = {
  productName: string;
  variantLabel: string;
  qty: number;
  lineTotalRupees: number;
};

type OrderConfirmationAddress = {
  recipientName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
};

type OrderConfirmation = {
  to: string;
  customerName: string;
  orderNumber: number;
  items: OrderConfirmationItem[];
  subtotalRupees: number;
  shippingRupees: number;
  discountRupees: number;
  totalRupees: number;
  paymentMethod: string;
  estimatedDelivery: string;
  address: OrderConfirmationAddress;
};

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// Best-effort order confirmation for the customer — same never-throw,
// no-op-without-a-key contract as notify-admins.ts, since createOrder()
// awaits this inline too. The "from" address is a verified poshan.life
// sender (see RESEND_FROM_EMAIL), with replyTo pointed at the real,
// human-read admin inbox (lib/admin.ts's ORDER_NOTIFICATION_EMAILS) since
// a from-address like orders@poshan.life has no inbox behind it — Resend's
// domain verification only authorizes sending, not receiving.
export async function notifyCustomerOfNewOrder(order: OrderConfirmation): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const ordersUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/orders`;

    const itemRows = order.items
      .map(
        (item) => `
          <tr>
            <td style="padding: 6px 0;">${item.productName} (${item.variantLabel}) × ${item.qty}</td>
            <td style="padding: 6px 0; text-align: right;">${rupees(item.lineTotalRupees)}</td>
          </tr>`
      )
      .join("");

    await resend.emails.send({
      from,
      to: order.to,
      replyTo: "lifeposhan@gmail.com",
      subject: `Your Poषण order #${order.orderNumber} is confirmed`,
      html: `
        <p>Hi ${order.customerName},</p>
        <p>Thanks for your order — <strong>#${order.orderNumber}</strong> is confirmed.</p>
        <table style="width: 100%; border-collapse: collapse;">
          ${itemRows}
          <tr><td style="padding: 6px 0;">Subtotal</td><td style="padding: 6px 0; text-align: right;">${rupees(order.subtotalRupees)}</td></tr>
          <tr><td style="padding: 6px 0;">Shipping</td><td style="padding: 6px 0; text-align: right;">${rupees(order.shippingRupees)}</td></tr>
          ${order.discountRupees > 0 ? `<tr><td style="padding: 6px 0;">Discount</td><td style="padding: 6px 0; text-align: right;">-${rupees(order.discountRupees)}</td></tr>` : ""}
          <tr><td style="padding: 6px 0; font-weight: bold;">Total</td><td style="padding: 6px 0; text-align: right; font-weight: bold;">${rupees(order.totalRupees)}</td></tr>
        </table>
        <p>
          Payment: ${PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}<br />
          Estimated delivery: ${order.estimatedDelivery}
        </p>
        <p>
          Delivering to:<br />
          ${order.address.recipientName}<br />
          ${order.address.line1}${order.address.line2 ? `, ${order.address.line2}` : ""}<br />
          ${order.address.city}, ${order.address.state} ${order.address.postalCode}
        </p>
        <p><a href="${ordersUrl}">View your order →</a></p>
      `,
    });
  } catch (err) {
    console.error("notifyCustomerOfNewOrder failed:", err);
  }
}
