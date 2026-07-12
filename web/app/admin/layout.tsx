import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import AdminNav from "./AdminNav";

export const metadata = { title: "Admin — Poषण" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts (via lib/supabase/middleware.ts) already redirects non-admins
  // before this point — this is the type-narrowing / defense-in-depth
  // backstop, same pattern as app/checkout/page.tsx. The RLS policies in
  // supabase/migrations/0003_admin_access.sql are the actual boundary that
  // matters if both of these are ever bypassed.
  if (!user || !isAdminEmail(user.email)) redirect("/");

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <div className="admin-topbar__inner">
          <span className="admin-topbar__title">Poषण Admin</span>
          <AdminNav />
          <Link href="/" className="admin-topbar__back">
            ← Back to site
          </Link>
        </div>
      </div>
      <div className="admin-content">{children}</div>
    </div>
  );
}
