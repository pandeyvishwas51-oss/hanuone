/**
 * Cities Hanuone serves. Adding a new city = add a row here + scrape doctors.
 *
 * The hero headline still uses an Indian-Hinglish framing per city.
 */
export type CityCopy = {
  city: string;
  slug: string;
  state: string;
  /** Used in the hero, e.g. "Lucknow ke" */
  possessive: string;
  lat: number;
  lng: number;
};

export const CITIES: CityCopy[] = [
  { city: "Lucknow", slug: "lucknow", state: "Uttar Pradesh", possessive: "Lucknow ke", lat: 26.8467, lng: 80.9462 },
  { city: "Delhi", slug: "delhi", state: "Delhi", possessive: "Delhi ke", lat: 28.6139, lng: 77.2090 }
];

const KNOWN: Record<string, CityCopy> = Object.fromEntries(
  CITIES.map((c) => [c.city.toLowerCase(), c])
);

const ALIASES: Record<string, string> = {
  // viewer-detected city names we map to our supported cities
  "new delhi": "delhi",
  noida: "delhi",
  gurgaon: "delhi",
  gurugram: "delhi",
  ghaziabad: "delhi",
  faridabad: "delhi"
};

const DEFAULT: CityCopy = CITIES[0];

export function resolveCityCopy(rawCity: string | null | undefined): CityCopy {
  if (!rawCity) return DEFAULT;
  const key = rawCity.trim().toLowerCase().replace(/_/g, " ").replace(/-/g, " ");
  if (KNOWN[key]) return KNOWN[key];
  const alias = ALIASES[key];
  if (alias && KNOWN[alias]) return KNOWN[alias];
  return DEFAULT;
}

export function getCityBySlug(slug: string | null | undefined): CityCopy | null {
  if (!slug) return null;
  const found = CITIES.find((c) => c.slug === slug.toLowerCase());
  return found ?? null;
}

export function nearestCity(lat: number, lng: number): CityCopy {
  function haversine(la1: number, lo1: number, la2: number, lo2: number) {
    const R = 6371;
    const dLat = ((la2 - la1) * Math.PI) / 180;
    const dLon = ((lo2 - lo1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((la1 * Math.PI) / 180) *
        Math.cos((la2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  return [...CITIES].sort(
    (a, b) => haversine(lat, lng, a.lat, a.lng) - haversine(lat, lng, b.lat, b.lng)
  )[0];
}
