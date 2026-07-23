import type { MetadataRoute } from "next";

// This disallow list covers the same "account-specific, zero public
// search value" routes as lib/supabase/middleware.ts's PROTECTED_PREFIXES
// (+ /admin, which that file also gates) — keep both in sync when a new
// protected route is added; neither list is generated from the other.
const DISALLOW = ["/admin", "/admin/*", "/cart", "/checkout", "/orders", "/orders/*", "/signin", "/api/*"];

// SEO-ROADMAP.md §3.1 — explicitly welcomes the AI crawlers/answer-engine
// bots by name, on the same public paths as the generic "*" rule below.
// Deliberately redundant with "*" (every one of these already matches it)
// — the point is an explicit, visible "allowed" statement per bot, since
// some sites block these by default, which would work against ever being
// cited by an AI answer engine. Decided: maximize citation surface, accept
// that some of these also train on the content (SEO-ROADMAP.md's Context
// section) — no split between "training" vs "live-answer" bots.
const AI_CRAWLERS = [
  // OpenAI
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Google's AI-training/grounding crawler — distinct from the standard
  // Googlebot rule, which the generic "*" entry already covers
  "Google-Extended",
  // Common Crawl — feeds many third-party LLM pipelines indirectly
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
