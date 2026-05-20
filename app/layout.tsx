import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const notoHindi = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-hindi",
  display: "swap"
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hanuone.in";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Hanuone — Lucknow ke Trusted Doctors, Ek Jagah",
    template: "%s | Hanuone"
  },
  description:
    "Find verified doctors in Lucknow by specialty and locality. Free directory of cardiologists, gynecologists, pediatricians, orthopedics and more. Contact via WhatsApp directly.",
  keywords: [
    "doctors in Lucknow",
    "Lucknow doctors",
    "best cardiologist Lucknow",
    "doctors near me Lucknow",
    "Hanuone",
    "Gomtinagar doctor",
    "Hazratganj doctor"
  ],
  openGraph: {
    type: "website",
    siteName: "Hanuone",
    url: siteUrl,
    title: "Hanuone — Lucknow ke Trusted Doctors, Ek Jagah",
    description:
      "Verified doctors in Lucknow by specialty and locality. Free, simple, trusted.",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "Hanuone" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Hanuone — Lucknow ke Trusted Doctors, Ek Jagah",
    description: "Verified doctors in Lucknow by specialty and locality."
  },
  alternates: { canonical: siteUrl },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  themeColor: "#023E8A",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${notoHindi.variable}`}>
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
