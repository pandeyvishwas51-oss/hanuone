import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MobileBottomNav from "@/components/MobileBottomNav";
import { SITE, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import Tracker from "@/components/Tracker";
import ChatWidget from "@/components/ChatWidget";
import FloatingVoiceAgent from "@/components/FloatingVoiceAgent";
import PatientChrome from "@/components/PatientChrome";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Premium display face for headings — modern, warm, healthcare-friendly.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["500", "600", "700", "800"] });

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
    site: "@hanu_one",
    creator: "@hanu_one",
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
    <html lang="en-IN" className={`${inter.variable} ${jakarta.variable}`}>
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
        <PatientChrome
          header={<SiteHeader />}
          footer={<><SiteFooter /><MobileBottomNav /><ChatWidget /><FloatingVoiceAgent /></>}
        >
          {children}
        </PatientChrome>
        <Tracker site="hanuone" />
      </body>
    </html>
  );
}
