import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "HanuonePro, Dashboard for Healthcare Professionals", template: "%s | HanuonePro" },
  description: "Register, get verified, manage availability and track your gig work on HanuonePro."
};

export const viewport: Viewport = {
  themeColor: "#023E8A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
