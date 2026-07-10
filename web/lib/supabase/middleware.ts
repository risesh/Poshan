import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require a signed-in session. Redirects server-side (no flash
// of protected content before redirecting, unlike the old client-side
// data-requires-auth check).
const PROTECTED_PREFIXES = ["/orders", "/checkout"];

// Refreshes the auth session cookie on every request so it doesn't expire
// mid-browse. Called from the root proxy.ts.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Required: this call refreshes the token and must not be removed even
  // though its return value looks unused.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (needsAuth && !user) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("return", path);
    return NextResponse.redirect(signInUrl);
  }

  return supabaseResponse;
}
