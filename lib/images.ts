// Central image resolver.
//
// Today: uses the photos shipped in /public (demo imagery) so the site looks
// good immediately. After you run `OPENAI_API_KEY=... node scripts/generate-images.mjs`
// (writes branded PNGs to /public/generated/), flip USE_GENERATED to true to
// switch the whole site to the AI-generated set — no other code changes.

const USE_GENERATED = false;

type Key =
  | "heroHome"
  | "consult"
  | "medicine"
  | "lab"
  | "nursing"
  | "physio"
  | "vitals"
  | "providersHero";

const GENERATED: Record<Key, string> = {
  heroHome: "/generated/hero-home.png",
  consult: "/generated/service-consult.png",
  medicine: "/generated/service-medicine.png",
  lab: "/generated/service-lab.png",
  nursing: "/generated/service-nursing.png",
  physio: "/generated/service-physio.png",
  vitals: "/generated/service-vitals.png",
  providersHero: "/generated/providers-hero.png"
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
  providersHero: "/providers/01.jpg"
};

export const IMG: Record<Key, string> = USE_GENERATED ? GENERATED : FALLBACK;

export function img(key: Key): string {
  return IMG[key];
}
