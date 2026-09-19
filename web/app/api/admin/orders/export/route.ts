import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getOrderList, type AdminOrderDetail } from "@/lib/admin-data";
import { istDateString, istDateDaysAgo, istDayStart, istDayEnd } from "@/lib/order-math";

// CSV field quoting per RFC 4180: wrap in quotes and double up any quote
// characters whenever the value contains a comma, quote, or newline.
function csvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function orderToRow(o: AdminOrderDetail): string[] {
  const products = o.items.map((i) => `${i.product_name_snapshot} (${i.variant_label_snapshot}) x${i.quantity}`).join("; ");
  const address = o.address
    ? [o.address.line1, o.address.line2, o.address.city, o.address.state, o.address.postal_code, o.address.country]
        .filter(Boolean)
        .join(", ")
    : "";
  return [
    String(o.order_number),
    o.created_at,
    o.order_status,
    o.payment_method,
    o.payment_status,
    o.customer_name ?? "",
    o.customer_email,
    o.address?.recipient_phone ?? "",
    products,
    address,
    String(o.subtotal_rupees),
    String(o.shipping_rupees),
    String(o.discount_rupees),
    String(o.total_rupees),
  ];
}

const HEADER = [
  "Order number",
  "Created at",
  "Status",
  "Payment method",
  "Payment status",
  "Customer name",
  "Customer email",
  "Customer phone",
  "Products",
  "Delivery address",
  "Subtotal (INR)",
  "Shipping (INR)",
  "Discount (INR)",
  "Total (INR)",
];

// Mirrors app/admin/orders/page.tsx's own from/to/q reading exactly, so the
// downloaded CSV always matches whatever the admin currently has filtered
// on screen — same date-range default (last 30 days) if unset.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth alongside proxy.ts's /admin gate — this is an API
  // route, not a page, so it isn't covered by that path-prefix redirect.
  // getOrderList's underlying queries are the actual boundary (RLS
  // policies in supabase/migrations/0003_admin_access.sql).
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const url = new URL(request.url);
  // IST calendar dates — see the matching comment in
  // app/admin/orders/page.tsx, whose from/to this route mirrors.
  const defaultFromStr = istDateDaysAgo(29);

  const fromStr = url.searchParams.get("from") || defaultFromStr;
  const toStr = url.searchParams.get("to") || istDateString();
  const search = url.searchParams.get("q") || undefined;

  const orders = await getOrderList(supabase, istDayStart(fromStr), istDayEnd(toStr), search);

  const lines = [HEADER, ...orders.map(orderToRow)].map((row) => row.map(csvField).join(","));
  // Leading BOM so Excel (still the most common opener for a downloaded
  // CSV) detects UTF-8 instead of misreading the ₹-adjacent text as Latin-1.
  const csv = "﻿" + lines.join("\r\n") + "\r\n";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${fromStr}-to-${toStr}.csv"`,
    },
  });
}
