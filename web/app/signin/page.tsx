import { redirect } from "next/navigation";
import Image from "next/image";
import AuthPanel from "@/app/components/AuthPanel";
import { createClient } from "@/lib/supabase/server";
import { sanitizeReturnTo } from "@/lib/return-path";

// Also Disallow'd in web/app/robots.ts — zero public search value, same
// reasoning as cart/checkout/orders.
export const metadata = {
  title: "Sign in",
  description: "Sign in or create a Poषण account.",
  robots: { index: false, follow: false },
};

export default async function SignInPage(props: PageProps<"/signin">) {
  const params = await props.searchParams;
  const returnTo = sanitizeReturnTo(typeof params.return === "string" ? params.return : null);
  const initialView = params.view === "about" ? "about" : undefined;

  // A signed-in visitor has no reason to see the sign-in form — mirrors
  // checkout/page.tsx's redirect-if-*un*authenticated guard, inverted.
  // Skipped for the "about you" onboarding step (?view=about), which is
  // reached deliberately right after auth/callback/route.ts signs a new
  // user in — that step needs the user authenticated on this exact page.
  if (initialView !== "about") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect(returnTo);
  }

  return (
    <div className="auth-split">
      <div className="auth-hero">
        <div className="auth-hero__inner">
          <Image src="/logo-icon.png" alt="Poषण" width={115} height={117} className="hero__logo" />
          <h1 className="hero__title">
            Po<span>षण</span>
          </h1>
          <h2 className="hero__subtitle">foods that heal</h2>
          <p className="hero__tag">Made for daily life</p>
        </div>
      </div>

      <AuthPanel returnTo={returnTo} initialView={initialView} />
    </div>
  );
}
