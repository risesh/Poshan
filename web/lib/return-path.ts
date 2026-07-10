// Prevents an open-redirect via ?return=<url> — only same-origin relative
// paths are honored (single leading slash, not "//" which browsers treat
// as protocol-relative to another host). Replaces the old KNOWN_PAGES
// whitelist now that Next.js owns routing directly.
export function sanitizeReturnTo(raw: string | null | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}
