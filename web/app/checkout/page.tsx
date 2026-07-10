import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckoutBody from "@/app/components/CheckoutBody";

export const metadata = {
  title: "Checkout — Poषण",
  description: "Checkout — delivery address and payment.",
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
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("phone, name").eq("id", user.id).single(),
  ]);

  return (
    <CheckoutBody
      addresses={addresses ?? []}
      defaultPhone={profile?.phone ?? ""}
      defaultName={profile?.name ?? ""}
    />
  );
}
