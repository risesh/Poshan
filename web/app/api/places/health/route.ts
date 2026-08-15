import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { autocompletePlaces } from "@/lib/places";

// Doesn't abort the underlying request — that'd need threading an
// AbortSignal through lib/places.ts's fetch call for a check this
// infrequent to be worth it. It just stops the *client* from waiting on a
// slow/hanging Google response; the real request resolves in the
// background and is discarded either way.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// Checked once when the new-address form opens (see CheckoutBody's
// placesAvailable state) — not the key's mere presence, an actual call, so
// a revoked key or a real Google outage both correctly disable the search
// box and fall back to manual entry, not just a missing env var.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    await withTimeout(autocompletePlaces("a", crypto.randomUUID()), 4000);
    return NextResponse.json({ available: true });
  } catch {
    return NextResponse.json({ available: false });
  }
}
