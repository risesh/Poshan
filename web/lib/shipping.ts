import type { SupabaseClient } from "@supabase/supabase-js";

export const FULFILLMENT_CENTER = { lat: 12.910604677300793, lng: 77.64196000992659 };
const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceFromFulfillmentCenterKm(lat: number, lng: number): number {
  return haversineDistanceKm(FULFILLMENT_CENTER.lat, FULFILLMENT_CENTER.lng, lat, lng);
}

// Free above ₹1000 subtotal regardless of distance; below that, free under
// 5km, then ₹10 per additional km — any partial km counts as a full one.
export function computeShippingRupees(subtotalRupees: number, distanceKm: number): number {
  if (subtotalRupees > 1000) return 0;
  if (distanceKm < 5) return 0;
  return Math.ceil(distanceKm - 5) * 10;
}

// Server-authoritative coordinate lookup — Postgres `numeric` columns come
// back from supabase-js as strings, hence the Number() coercion. Returns
// null if the address has no location yet (lat/lng are nullable — an
// address saved without ever using the location search, or a legacy row).
export async function getAddressCoordinates(
  supabase: SupabaseClient,
  addressId: string
): Promise<{ lat: number; lng: number } | null> {
  const { data } = await supabase.from("addresses").select("lat, lng").eq("id", addressId).single();
  if (!data || data.lat == null || data.lng == null) return null;
  return { lat: Number(data.lat), lng: Number(data.lng) };
}
