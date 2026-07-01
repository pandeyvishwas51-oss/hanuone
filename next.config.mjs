import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  reactStrictMode: false,
  experimental: { instrumentationHook: true },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.practo.com" },
      { protocol: "https", hostname: "**.practostatic.com" },
      { protocol: "https", hostname: "s3-ap-southeast-1.amazonaws.com" },
      { protocol: "https", hostname: "images.practo.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "maps.googleapis.com" }
    ]
  },
  async redirects() {
    return [
      { source: "/join", destination: "/providers/join", permanent: true }
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" },
      // Conservative CSP: blocks clickjacking, <base> injection and plugin/object
      // embedding without constraining the app's many script/style/image sources.
      { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" }
    ];
    return [{ source: "/:path*", headers: securityHeaders }];
  }
};

// Wrap with Sentry. Source-map upload is skipped unless SENTRY_AUTH_TOKEN is
// set, so the build never fails locally; runtime error capture still works.
export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: false,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT
});
