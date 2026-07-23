import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import AdminNav from "./AdminNav";

// Admin routes have zero public search value and show account-specific
// data — excluded from the index here and in web/app/robots.ts's Disallow
// list (two independent mechanisms, same reasoning as /cart, /checkout).
//
// Owns its own title template (nearest-parent-template wins, so this
// takes over from the root layout's for everything under /admin) so each
// admin page can set a plain segment name ("Dashboard", "Orders") instead
// of manually spelling out "— Admin — Poषण" on every one of them.
export const metadata = {
  title: { default: "Admin", template: "%s — Admin — Poषण" },
  robots: { index: false, follow: false },
};

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
