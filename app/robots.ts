import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://hanuone.vercel.app";

// GEO: explicitly welcome AI-search crawlers so Hanuone is eligible to be cited
// in ChatGPT, Perplexity, Gemini, Claude, Google AI Overviews and Bing Copilot.
// Private surfaces (admin, api, account, consult, provider dashboard) stay blocked.
const AI_BOTS = [
  "GPTBot",            // OpenAI training
  "OAI-SearchBot",     // ChatGPT search
  "ChatGPT-User",      // ChatGPT browsing
  "ClaudeBot",         // Anthropic
  "Claude-Web",
  "PerplexityBot",     // Perplexity
  "Perplexity-User",
  "Google-Extended",   // Gemini / AI Overviews
  "Applebot-Extended", // Apple Intelligence
  "CCBot",             // Common Crawl (feeds many LLMs)
  "Amazonbot",
  "cohere-ai",
  "Bytespider"
];

const PRIVATE = ["/admin", "/api", "/account", "/consult", "/pro", "/my-bookings"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      // Each AI bot: allow public content, block private + user-data endpoints.
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE }))
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE
  };
}
