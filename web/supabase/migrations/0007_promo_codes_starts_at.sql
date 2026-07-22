-- e.g. '2026-08-01 00:00:00+05:30'; null = active immediately, mirroring
-- expires_at's existing "null = never expires" convention — together the
-- pair lets a promo be indefinite, start-dated with no end, or bounded to
-- a specific window, per the admin Controls tab's "create promo code" form.
alter table promo_codes add column starts_at timestamptz;
