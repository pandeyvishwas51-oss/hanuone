// Central image resolver.
//
// Today: uses the photos shipped in /public (demo imagery) so the site looks
// good immediately. After you run `OPENAI_API_KEY=... node scripts/generate-images.mjs`
// (writes branded PNGs to /public/generated/), flip USE_GENERATED to true to
// switch the whole site to the AI-generated set — no other code changes.

const USE_GENERATED = true;

type Key =
  | "heroHome"
  | "consult"
  | "medicine"
  | "lab"
  | "nursing"
  | "physio"
  | "vitals"
  | "ai"
  | "nutrition"
  | "providersHero";

// WebP sources (re-compressed from the original PNGs: ~17MB -> ~1MB total).
// next/image still serves responsive AVIF/WebP variants from these.
const GENERATED: Record<Key, string> = {
  heroHome: "/generated/hero-home.webp",
  consult: "/generated/service-consult.webp",
  medicine: "/generated/service-medicine.webp",
  lab: "/generated/service-lab.webp",
  nursing: "/generated/service-nursing.webp",
  physio: "/generated/service-physio.webp",
  vitals: "/generated/service-vitals.webp",
  ai: "/generated/service-ai.webp",
  nutrition: "/generated/service-nutrition.webp",
  providersHero: "/generated/providers-hero.webp"
};

// Best available existing photos (demo set) as the current default.
const FALLBACK: Record<Key, string> = {
  heroHome: "/img/consult-doctor.jpg",
  consult: "/hero/consult.jpg",
  medicine: "/hero/lab.jpg",
  lab: "/hero/lab.jpg",
  nursing: "/img/home-nursing.jpg",
  physio: "/hero/injection.jpg",
  vitals: "/hero/vitals.jpg",
  ai: "/hero/consult.jpg",
  nutrition: "/hero/vitals.jpg",
  providersHero: "/providers/01.jpg"
};

export const IMG: Record<Key, string> = USE_GENERATED ? GENERATED : FALLBACK;

export function img(key: Key): string {
  return IMG[key];
}
