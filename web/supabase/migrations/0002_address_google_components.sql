-- ============================================================
-- Adds Google Places-native address components to `addresses`,
-- alongside the existing user-editable line1/line2/city/state/
-- postal_code/country. These are populated directly from Google's
-- addressComponents response when a checkout address comes from
-- Places Autocomplete (lib/places.ts), independent of whatever the
-- user later edits in the checkout form's 3 display fields (Flat/
-- Plot/House no., Street name, Area/Locality) — so they stay a
-- stable analytics ground truth even if the display text drifts.
-- Null for addresses entered without using autocomplete.
-- ============================================================

alter table addresses
  add column street_number text,          -- e.g. '57' — Google's `street_number` component
  add column route text,                  -- e.g. '27th Main Road' — Google's `route` component
  add column subpremise text,             -- e.g. 'Flat 4B' — Google's `subpremise` component (unit/flat)
  add column premise text,                -- e.g. 'Silver Oak Apartments' — Google's `premise` component (building name)
  add column sublocality text,            -- e.g. 'Somasundarapalya' — Google's most specific `sublocality*` component
  add column raw_place_components jsonb;  -- full addressComponents array Google returned, verbatim — e.g.
                                           -- [{"longText":"Bengaluru","types":["locality","political"],...}, ...]
                                           -- kept so nothing Google sends is lost even for component types not
                                           -- broken into their own column above (administrative_area_level_2/3, etc.)
