"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { isAdminEmail } from "@/lib/admin";

type ToastOrder = { orderNumber: number; totalRupees: number };

const formatRupees = (n: number) => "₹" + n.toLocaleString("en-IN");

// Live "new order" toast for a signed-in admin, mounted sitewide (root
// layout) rather than just under /admin — an admin browsing the storefront
// itself should still get pinged, not only while inside the portal. See
// lib/notify-admins.ts for the out-of-portal email leg of this same
// feature. Requires supabase/migrations/0011_orders_realtime.sql to be
// applied (adds `orders` to the supabase_realtime publication).
//
// isAdminEmail here is a UX gate only (don't open a Realtime channel for
// every ordinary visitor) — not the security boundary. Even if a non-admin
// somehow subscribed, the existing "Admins can view all orders" RLS policy
// means they'd receive zero events, same as a normal select would return
// zero rows (same pattern as admin/layout.tsx's own auth check).
export default function NewOrderListener() {
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);
  const [toast, setToast] = useState<ToastOrder | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const supabase = createClient();
    const channel = supabase
      .channel("admin-new-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new as { order_number: number; total_rupees: number };
          setToast({ orderNumber: row.order_number, totalRupees: row.total_rupees });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  // Re-arms on every new toast rather than a single mount-time timer, so
  // each order gets its own full ~6s window instead of inheriting
  // whatever was left on a previous one.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="admin-toast" role="status">
      <div>
        <div className="admin-toast__title">New order #{toast.orderNumber}</div>
        <div className="admin-toast__amount">{formatRupees(toast.totalRupees)}</div>
      </div>
      <button
        type="button"
        className="admin-toast__close"
        onClick={() => setToast(null)}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
