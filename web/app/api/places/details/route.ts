import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlaceDetails } from "@/lib/places";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { placeId, sessionToken } = (await request.json()) as {
    placeId?: string;
    sessionToken?: string;
  };
  if (!placeId || !sessionToken) {
    return NextResponse.json({ error: "Missing placeId or sessionToken" }, { status: 400 });
  }

  try {
    const details = await getPlaceDetails(placeId, sessionToken);
    return NextResponse.json(details);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not fetch place details" },
      { status: 502 }
    );
  }
}
