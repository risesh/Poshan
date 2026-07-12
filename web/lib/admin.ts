// Kept in sync with supabase/migrations/0003_admin_access.sql's hardcoded
// allowlist — that migration is the actual security boundary (RLS policies
// on the admin-readable tables); this constant only gates page/nav
// visibility, so a mismatch here fails safe (hides the page) rather than
// unsafe (a wrong email here can't grant DB access it doesn't have via RLS).
export const ADMIN_EMAILS = ["riseshbhutani@gmail.com", "bharathandu142@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}
