import type { User } from "@supabase/supabase-js";

// Works for both email sign-up (full_name set explicitly at signUp()) and
// Google OAuth (Supabase maps Google's profile into user_metadata.full_name/
// name automatically) — same field the handle_new_user() trigger reads to
// populate profiles.name, so this stays consistent with what's shown at
// checkout/order-confirmation.
export function firstNameOf(user: User | null): string | null {
  const full = (user?.user_metadata?.full_name ?? user?.user_metadata?.name) as
    | string
    | undefined;
  return full?.trim() ? full.trim().split(/\s+/)[0] : null;
}

// "Riya Sharma" -> "RS"; a single-word name -> just that initial; no name
// at all (shouldn't normally happen — full name is required at sign-up) ->
// first letter of the email.
export function initialsOf(user: User | null): string {
  const full = (user?.user_metadata?.full_name ?? user?.user_metadata?.name) as
    | string
    | undefined;
  if (full?.trim()) {
    const parts = full.trim().split(/\s+/);
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }
  return user?.email ? user.email[0].toUpperCase() : "?";
}
