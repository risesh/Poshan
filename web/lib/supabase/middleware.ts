import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin";

// Routes that require a signed-in session. Redirects server-side (no flash
// of protected content before redirecting, unlike the old client-side
// data-requires-auth check).
const PROTECTED_PREFIXES = ["/orders", "/checkout"];

// /admin needs a signed-in session *and* an allowlisted email — checked
// here as a UX-level redirect (so a non-admin never sees the page render
// at all), but the actual security boundary is the RLS policies in
// supabase/migrations/0003_admin_access.sql; even a bug here can't grant
// data access those policies don't already allow.
const ADMIN_PREFIX = "/admin";

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

  if (path.startsWith(ADMIN_PREFIX)) {
    if (!user) {
      const signInUrl = new URL("/signin", request.url);
      signInUrl.searchParams.set("return", path);
      return NextResponse.redirect(signInUrl);
    }
    if (!isAdminEmail(user.email)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return supabaseResponse;
}
