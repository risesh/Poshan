import type { NextConfig } from "next";

// Empty for now (SEO-ROADMAP.md §1.10) — expected future additions:
// - images.remotePatterns, once product photos move off same-origin
//   public/ paths (e.g. Supabase Storage) — see §1.8's next/image migration
// - redirects(), if the production domain or any route path ever changes,
//   so old inbound/AI-cached links 404 instead of dead-ending
const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
