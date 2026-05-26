/**
 * Active service cities. Edit this list to launch a new market.
 * Coordinates are city centers, used by auto-detect to find the closest city.
 */
export type ServiceCity = {
  name: string;
  slug: string;
  state: string;
  lat: number;
  lng: number;
  /** Hinglish phrase for the dynamic hero */
  possessive: string;
  description: string;
};

export const SERVICE_CITIES: ServiceCity[] = [
  {
    name: "Lucknow",
    slug: "lucknow",
    state: "Uttar Pradesh",
    lat: 26.8467,
    lng: 80.9462,
    possessive: "Lucknow ke",
    description: "Hanuone's home city. 720+ verified doctors across Gomtinagar, Hazratganj, Aliganj, Indira Nagar and more."
  },
  {
    name: "Delhi",
    slug: "delhi",
    state: "Delhi",
    lat: 28.6139,
    lng: 77.2090,
    possessive: "Dilli ke",
    description: "1,800+ verified doctors across South Delhi, Greater Kailash, Dwarka, Rohini, Pitampura and more."
  }
];

const DEFAULT = SERVICE_CITIES[0];

export function findCityBySlug(slug: string | null | undefined): ServiceCity | null {
  if (!slug) return null;
  return SERVICE_CITIES.find((c) => c.slug === slug.toLowerCase()) ?? null;
}

export function findCityByName(name: string | null | undefined): ServiceCity | null {
  if (!name) return null;
  const normalised = name.trim().toLowerCase();
  return SERVICE_CITIES.find((c) => c.name.toLowerCase() === normalised) ?? null;
}

function haversine(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Returns the closest service city to a given lat/lng. Returns null if the
 * caller is more than `maxKm` away from any service city.
 */
export function nearestCity(lat: number, lng: number, maxKm = 250): ServiceCity | null {
  let best: { c: ServiceCity; d: number } | null = null;
  for (const c of SERVICE_CITIES) {
    const d = haversine(lat, lng, c.lat, c.lng);
    if (!best || d < best.d) best = { c, d };
  }
  if (!best || best.d > maxKm) return null;
  return best.c;
}

export function defaultCity(): ServiceCity {
  return DEFAULT;
}
