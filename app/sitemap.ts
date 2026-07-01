import type { MetadataRoute } from "next";
import {
  getAllDoctorSlugsWithUpdated,
  getAllLocalities,
  getAllSpecializations,
  getCombinationsForStaticParams
} from "@/lib/queries";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://hanuone.com";

// Stable content date for pages whose freshness we don't track per-entity.
// Bump this when site-wide content/structure meaningfully changes — that's a
// real signal, unlike stamping `new Date()` on every crawl (which Google learns
// to ignore as noise).
const CONTENT_DATE = new Date("2026-06-26");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [doctors, specs, localities, combos] = await Promise.all([
    getAllDoctorSlugsWithUpdated(),
    getAllSpecializations(),
    getAllLocalities(),
    getCombinationsForStaticParams()
  ]);

  const now = CONTENT_DATE;

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/doctors`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/services`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/lab`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/medicine`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/vitals`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/ai-doctor`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/home-nursing`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/providers/join`, lastModified: now, changeFrequency: "monthly", priority: 0.6 }
  ];

  const doctorUrls: MetadataRoute.Sitemap = doctors.map((d) => ({
    url: `${BASE}/doctors/${d.slug}`,
    lastModified: d.updatedAt ?? now,
    changeFrequency: "weekly",
    priority: 0.8
  }));

  const specUrls: MetadataRoute.Sitemap = specs.map((s) => ({
    url: `${BASE}/specializations/${s.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7
  }));

  const localityUrls: MetadataRoute.Sitemap = localities.map((l) => ({
    url: `${BASE}/localities/${l.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7
  }));

  const comboUrls: MetadataRoute.Sitemap = combos.map((c) => ({
    url: `${BASE}/${c.locality}/${c.specialty}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.85
  }));

  return [...staticUrls, ...specUrls, ...localityUrls, ...comboUrls, ...doctorUrls];
}
