import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Used inside Server Components / Server Actions / Route Handlers.
// Cookie writes are wrapped in try/catch because Server Components can't
// set cookies during render — middleware refreshes the session instead,
// so a write attempted from a Server Component is safe to ignore.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — middleware handles refresh.
          }
        },
      },
    }
  );
}
