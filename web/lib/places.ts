// Server-only helpers for Google's Places API (New) — Autocomplete and
// Place Details. The API key never reaches the browser; the client only
// ever talks to our own /api/places/* routes, which proxy these calls and
// thread a shared session token through both so Google bills the whole
// search (every keystroke + the final details fetch) as one session
// instead of per-request.

const PLACES_API_BASE = "https://places.googleapis.com/v1";

export type AutocompleteSuggestion = {
  placeId: string;
  mainText: string;
  secondaryText: string;
};

export async function autocompletePlaces(
  input: string,
  sessionToken: string
): Promise<AutocompleteSuggestion[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("Address search isn't configured yet.");

  const res = await fetch(`${PLACES_API_BASE}/places:autocomplete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ["in"],
      languageCode: "en",
      // Deliberately no includedPrimaryTypes filter — leaving it unset is
      // what makes Google return a mix of addresses *and* points of
      // interest (shops, landmarks, etc.) instead of addresses only.
    }),
  });

  if (!res.ok) {
    throw new Error(`Autocomplete request failed (${res.status})`);
  }

  const data = await res.json();
  const suggestions = (data.suggestions ?? []) as Array<{
    placePrediction?: {
      placeId: string;
      structuredFormat?: {
        mainText?: { text: string };
        secondaryText?: { text: string };
      };
      text?: { text: string };
    };
  }>;

  return suggestions
    .filter((s): s is Required<typeof s> => !!s.placePrediction)
    .map((s) => ({
      placeId: s.placePrediction.placeId,
      mainText: s.placePrediction.structuredFormat?.mainText?.text ?? s.placePrediction.text?.text ?? "",
      secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text ?? "",
    }));
}

export type PlaceDetails = {
  placeId: string;
  formattedAddress: string;
  // UI-friendly, grouped fields — populate the checkout form's 3 editable
  // fields (Flat/Plot/House no., Street name, Area/Locality).
  flatNo: string;
  streetName: string;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  lat: number | null;
  lng: number | null;
  // Google's own typed components, kept separately for analytics — stored
  // independent of whatever the user edits in the grouped fields above.
  // See supabase/migrations/0002_address_google_components.sql.
  googleComponents: {
    streetNumber: string | null;
    route: string | null;
    subpremise: string | null;
    premise: string | null;
    sublocality: string | null;
    raw: AddressComponent[];
  };
};

type AddressComponent = { longText: string; shortText?: string; types?: string[] };

// Google occasionally attaches an untyped component (a raw address string
// with no `types` array at all) to a place, alongside the normal typed
// ones — observed on a real business listing during testing, not just a
// theoretical case. `types` must be treated as optional.
function componentText(components: AddressComponent[], type: string): string | undefined {
  return components.find((c) => (c.types ?? []).includes(type))?.longText;
}

export async function getPlaceDetails(placeId: string, sessionToken: string): Promise<PlaceDetails> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("Address search isn't configured yet.");

  const url = new URL(`${PLACES_API_BASE}/places/${placeId}`);
  url.searchParams.set("sessionToken", sessionToken);

  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      // Places API (New) requires an explicit field mask on every
      // request — requesting only what we actually use keeps this on the
      // cheaper Essentials/Pro SKU tier rather than pulling in
      // Enterprise-tier fields (reviews, opening hours, etc.) we don't need.
      "X-Goog-FieldMask": "id,formattedAddress,addressComponents,location,displayName",
    },
  });

  if (!res.ok) {
    throw new Error(`Place details request failed (${res.status})`);
  }

  const data = await res.json();
  const components: AddressComponent[] = data.addressComponents ?? [];

  const streetNumber = componentText(components, "street_number");
  const route = componentText(components, "route");
  const subpremise = componentText(components, "subpremise");
  const premise = componentText(components, "premise");
  const sublocality =
    componentText(components, "sublocality_level_1") ?? componentText(components, "sublocality");

  // Some places (typically smaller local businesses, not well-mapped
  // residential addresses) never get a properly typed street_number/route
  // from Google at all — the only place the real street detail shows up is
  // an untyped component (no `types` array). Falling back to that rather
  // than silently dropping the one piece of street info Google actually
  // gave us; it's messier (it also contains locality/city text Google
  // couldn't cleanly separate out), but the field stays user-editable, so a
  // messy-but-real fallback beats an empty field forcing a full retype.
  // Deliberately NOT falling back further to premise/displayName (e.g. an
  // apartment complex's name, "Lotus Nest") for either flatNo or
  // streetName — that's a building name, not a flat number or a street,
  // and stuffing it into both fields produced exactly that wrong pairing.
  // formattedAddress (shown read-only above the form) already surfaces it;
  // an empty field here is a truthful "Google didn't give us this," left
  // for the user to fill in rather than a guess presented as data.
  const untypedFallback = components.find((c) => !c.types || c.types.length === 0)?.longText;
  const streetName = [streetNumber, route].filter(Boolean).join(" ") || untypedFallback || "";

  return {
    placeId: data.id as string,
    formattedAddress: (data.formattedAddress as string) ?? "",
    flatNo: subpremise ?? "",
    streetName,
    area: sublocality ?? "",
    city:
      componentText(components, "locality") ??
      componentText(components, "administrative_area_level_2") ??
      sublocality ??
      "",
    state: componentText(components, "administrative_area_level_1") ?? "",
    postalCode: componentText(components, "postal_code") ?? "",
    country: componentText(components, "country") ?? "India",
    lat: data.location?.latitude ?? null,
    lng: data.location?.longitude ?? null,
    googleComponents: {
      streetNumber: streetNumber ?? null,
      route: route ?? null,
      subpremise: subpremise ?? null,
      premise: premise ?? null,
      sublocality: sublocality ?? null,
      raw: components,
    },
  };
}
