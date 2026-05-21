import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Tracker from "@/components/Tracker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hanuonepro.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "HanuonePro, Healthcare Gig Dashboard for Doctors, Nurses & Caregivers in Lucknow",
    template: "%s | HanuonePro"
  },
  description:
    "Register as a doctor, nurse, ward boy, caregiver or physiotherapist in Lucknow. Manage availability, accept home-care bookings and track earnings on HanuonePro.",
  keywords: [
    "healthcare jobs Lucknow",
    "nursing jobs Lucknow",
    "home care jobs Lucknow",
    "doctor home visits Lucknow",
    "caregiver registration India",
    "ward boy jobs Lucknow",
    "physiotherapist gig Lucknow",
    "Hanuone home care network",
    "HanuonePro"
  ],
  applicationName: "HanuonePro",
  category: "health",
  appleWebApp: {
    capable: true,
    title: "HanuonePro",
    statusBarStyle: "default"
  },
  openGraph: {
    type: "website",
    siteName: "HanuonePro",
    locale: "en_IN",
    url: SITE_URL,
    title: "HanuonePro, Healthcare Gig Dashboard for Doctors, Nurses & Caregivers in Lucknow",
    description:
      "Register, get verified, mark your availability and track home-care gigs across Lucknow. Free for verified professionals.",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "HanuonePro" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "HanuonePro, Healthcare Gig Dashboard",
    description:
      "Register and grow your home-care practice in Lucknow with HanuonePro.",
    site: "@Hanuone_0",
    creator: "@Hanuone_0"
  },
  alternates: {
    canonical: SITE_URL,
    languages: { "en-IN": SITE_URL, "x-default": SITE_URL }
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
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#023E8A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover"
};

const ORG_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "HanuonePro",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
  parentOrganization: { "@type": "Organization", name: "Hanuone", url: "https://hanuone.vercel.app" },
  sameAs: [
    "https://instagram.com/Hanuone_0",
    "https://www.facebook.com/share/1CZnNMGXk5/",
    "https://x.com/Hanuone_0"
  ],
  address: { "@type": "PostalAddress", addressLocality: "Lucknow", addressRegion: "Uttar Pradesh", addressCountry: "IN" }
};

const WEBSITE_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "HanuonePro",
  url: SITE_URL,
  inLanguage: ["en-IN", "hi-IN"]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_LD) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_LD) }} />
      </head>
      <body className="min-h-screen">
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
        <Analytics />
        <SpeedInsights />
        <Tracker site="hanuonepro" />
      </body>
    </html>
  );
}
