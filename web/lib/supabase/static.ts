import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Used only from build-time contexts like generateStaticParams, which run
// without an HTTP request and therefore can't call next/headers' cookies()
// (that's what lib/supabase/server.ts's client needs). No session is ever
// available or required here — every call site only needs publicly
// readable data (e.g. product slugs), which RLS already permits for the
// anon key.
export function createStaticClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
