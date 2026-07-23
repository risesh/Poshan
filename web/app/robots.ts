import type { MetadataRoute } from "next";

// Baseline crawl rules only (SEO-ROADMAP.md §1.4) — a second pass adding
// named AI-crawler rules (GPTBot, ClaudeBot, PerplexityBot, etc.) comes
// later as §3.1, once basic crawlability/indexing is in place.
//
// This disallow list covers the same "account-specific, zero public
// search value" routes as lib/supabase/middleware.ts's PROTECTED_PREFIXES
// (+ /admin, which that file also gates) — keep both in sync when a new
// protected route is added; neither list is generated from the other.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/*", "/cart", "/checkout", "/orders", "/orders/*", "/signin", "/api/*"],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
