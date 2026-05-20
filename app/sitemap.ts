import type { MetadataRoute } from "next";
import {
  getAllDoctorSlugs,
  getAllLocalities,
  getAllSpecializations,
  getCombinationsForStaticParams
} from "@/lib/queries";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://hanuone.in";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [doctorSlugs, specs, localities, combos] = await Promise.all([
    getAllDoctorSlugs(),
    getAllSpecializations(),
    getAllLocalities(),
    getCombinationsForStaticParams()
  ]);

  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/doctors`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/join`, lastModified: now, changeFrequency: "weekly", priority: 0.5 }
  ];

  const doctorUrls: MetadataRoute.Sitemap = doctorSlugs.map((slug) => ({
    url: `${BASE}/doctors/${slug}`,
    lastModified: now,
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
