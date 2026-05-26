import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MobileBottomNav from "@/components/MobileBottomNav";
import { SITE, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Tracker from "@/components/Tracker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name}, ${SITE.tagline}`,
    template: `%s | ${SITE.name}`
  },
  description: SITE.description,
  keywords: [
    "doctors in Lucknow",
    "Lucknow doctors",
    "best cardiologist Lucknow",
    "doctors near me Lucknow",
    "Lucknow doctor by pincode",
    "Hanuone",
    "Gomtinagar doctor",
    "Hazratganj doctor",
    "Indira Nagar doctor",
    "Aliganj doctor",
    "Mahanagar doctor",
    "Lucknow gynecologist",
    "Lucknow paediatrician",
    "Lucknow orthopedic"
  ],
  applicationName: SITE.name,
  authors: [{ name: "Hanuone" }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "health",
  appleWebApp: {
    capable: true,
    title: SITE.name,
    statusBarStyle: "default"
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_IN",
    url: SITE.url,
    title: `${SITE.name}, ${SITE.tagline}`,
    description: SITE.description,
    images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: SITE.name }]
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name}, ${SITE.tagline}`,
    description: SITE.description,
    site: "@Hanuone_0",
    creator: "@Hanuone_0",
    images: [SITE.ogImage]
  },
  alternates: {
    canonical: SITE.url,
    languages: {
      "en-IN": SITE.url,
      "x-default": SITE.url
    }
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1
    }
  },
  manifest: "/manifest.webmanifest",
  verification: {
    // Drop Search Console / Bing tags here when you add the property
    // google: "your-verification-token"
  }
};

export const viewport: Viewport = {
  themeColor: "#0F4C5C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link rel="dns-prefetch" href="https://images1-fabric.practo.com" />
        <link rel="preconnect" href="https://images1-fabric.practo.com" crossOrigin="" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-bg">
        <SiteHeader />
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <SiteFooter />
        <MobileBottomNav />
        <Analytics />
        <SpeedInsights />
        <Tracker site="hanuone" />
      </body>
    </html>
  );
}
