import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckoutBody from "@/app/components/CheckoutBody";
import Footer from "@/app/components/Footer";

// Account-gated purchase flow — zero public search value, same reasoning
// as cart/orders.
export const metadata = {
  title: "Checkout",
  description: "Checkout — delivery address and payment.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // proxy.ts already redirects unauthenticated requests before this point;
  // this is just the type-narrowing / defense-in-depth backstop.
  if (!user) redirect("/signin?return=/checkout");

  const [{ data: addresses }, { data: profile }] = await Promise.all([
    supabase
      .from("addresses")
      .select("*")
      // Explicit even though RLS's owner-scoped policy already covers a
      // normal user — an admin account is also covered by the separate
      // "Admins can view all addresses" policy (0003_admin_access.sql,
      // needed for the admin orders dashboard to join every customer's
      // address to their order), which would otherwise leak every
      // customer's saved address into the admin's own checkout page since
      // Postgres OR's permissive RLS policies together. Same reasoning as
      // /orders' own .eq("user_id", ...) (app/orders/page.tsx).
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("phone, name").eq("id", user.id).single(),
  ]);

  // Postgres `numeric` columns (lat/lng) come back from supabase-js as
  // strings, not numbers — coerced here, once, at the server/client
  // boundary, so CheckoutBody's Address type can honestly say `number | null`.
  const normalizedAddresses = (addresses ?? []).map((a) => ({
    ...a,
    lat: a.lat == null ? null : Number(a.lat),
    lng: a.lng == null ? null : Number(a.lng),
  }));

  return (
    <>
      <CheckoutBody
        addresses={normalizedAddresses}
        defaultPhone={profile?.phone ?? ""}
        defaultName={profile?.name ?? ""}
      />
      <Footer compact />
    </>
  );
}
