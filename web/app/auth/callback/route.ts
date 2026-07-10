import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeReturnTo } from "@/lib/return-path";

// Google OAuth lands here with a ?code= after the consent screen.
// Exchanging it for a session is what actually signs the user in —
// everything before this point was just the redirect dance.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeReturnTo(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // No explicit "is this a first login" flag from Supabase — created_at
      // and last_sign_in_at landing within a few seconds of each other is
      // the signal that this OAuth round-trip *was* the account creation,
      // so route through the same "a little about you" step signup gets.
      const isNewUser =
        user &&
        Math.abs(
          new Date(user.created_at).getTime() -
            new Date(user.last_sign_in_at ?? user.created_at).getTime()
        ) < 10000;

      if (isNewUser) {
        return NextResponse.redirect(
          `${origin}/signin?view=about&return=${encodeURIComponent(next)}`
        );
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth`);
}
