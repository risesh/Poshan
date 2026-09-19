// Kept in sync with supabase/migrations/0003_admin_access.sql's hardcoded
// allowlist — that migration is the actual security boundary (RLS policies
// on the admin-readable tables); this constant only gates page/nav
// visibility, so a mismatch here fails safe (hides the page) rather than
// unsafe (a wrong email here can't grant DB access it doesn't have via RLS).
// test-admin@poshan.test is a standing test account for agent/local admin
// testing (credentials in .env.local) — kept in sync with
// 0012_test_admin_account.sql's matching RLS grant. Not a real admin.
// lifeposhan@gmail.com was added in 0020_admin_lifeposhan_account.sql,
// same widen-every-policy pattern 0012 used for the test account.
export const ADMIN_EMAILS = [
  "riseshbhutani@gmail.com",
  "bharathandu142@gmail.com",
  "lifeposhan@gmail.com",
  "test-admin@poshan.test",
];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}

// New-order notification emails go only here, not to every ADMIN_EMAILS
// address — lifeposhan@gmail.com is the operational inbox that should act
// on incoming orders; the personal admin addresses don't want the traffic.
export const ORDER_NOTIFICATION_EMAILS = ["lifeposhan@gmail.com"];
