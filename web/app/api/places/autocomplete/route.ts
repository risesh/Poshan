import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { autocompletePlaces } from "@/lib/places";

// Auth-gated like the order-creation routes — otherwise this endpoint is a
// free-standing proxy to a billed Google API that anyone could hit.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { input, sessionToken } = (await request.json()) as {
    input?: string;
    sessionToken?: string;
  };
  if (!input || !sessionToken) {
    return NextResponse.json({ error: "Missing input or sessionToken" }, { status: 400 });
  }
  if (input.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await autocompletePlaces(input, sessionToken);
    return NextResponse.json({ suggestions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Autocomplete failed" },
      { status: 502 }
    );
  }
}
