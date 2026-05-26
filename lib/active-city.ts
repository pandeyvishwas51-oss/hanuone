import { cookies, headers } from "next/headers";
import { findCityByName, nearestCity, defaultCity, type ServiceCity } from "./cities-list";

const COOKIE = "hanuone_city";

/**
 * Reads the active city for the current request.
 * Resolution order:
 *   1. URL search param ?city=delhi (used by /city/[slug] pages)
 *   2. Cookie set by the CitySelector
 *   3. Vercel geo header (auto-pick nearest service city)
 *   4. Lucknow default
 */
export function getActiveCity(searchParamCity?: string | null): ServiceCity {
  // 1. Explicit URL param wins
  const fromParam = findCityByName(searchParamCity ?? null);
  if (fromParam) return fromParam;

  // 2. Cookie
  try {
    const c = cookies().get(COOKIE)?.value;
    const fromCookie = findCityByName(c ?? null);
    if (fromCookie) return fromCookie;
  } catch {
    /* outside request scope */
  }

  // 3. Vercel geo
  try {
    const h = headers();
    const cityHeader = h.get("x-vercel-ip-city");
    if (cityHeader) {
      const detected = decodeURIComponent(cityHeader);
      const direct = findCityByName(detected);
      if (direct) return direct;
    }
    const lat = h.get("x-vercel-ip-latitude");
    const lng = h.get("x-vercel-ip-longitude");
    if (lat && lng) {
      const nearest = nearestCity(parseFloat(lat), parseFloat(lng));
      if (nearest) return nearest;
    }
  } catch {
    /* not in request scope */
  }

  return defaultCity();
}

export const CITY_COOKIE_NAME = COOKIE;
