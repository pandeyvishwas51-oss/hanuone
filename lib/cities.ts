/**
 * Lightweight name + Hinglish suffix table for Indian metros.
 * Keys are lowercase; values are the proper-cased city + Hinglish slot used in
 * the hero ("Lucknow ke Trusted Doctors, Ek Jagah").
 *
 * Falls back to "Lucknow ke" for any unknown city so the brand promise stays
 * consistent for our launch market.
 */
export type CityCopy = {
  city: string;
  /** Hinglish phrase like "Lucknow ke" or "Bengaluru ke" */
  possessive: string;
};

const KNOWN: Record<string, CityCopy> = {
  lucknow: { city: "Lucknow", possessive: "Lucknow ke" },
  delhi: { city: "Delhi", possessive: "Delhi ke" },
  "new delhi": { city: "New Delhi", possessive: "Dilli ke" },
  noida: { city: "Noida", possessive: "Noida ke" },
  ghaziabad: { city: "Ghaziabad", possessive: "Ghaziabad ke" },
  gurgaon: { city: "Gurgaon", possessive: "Gurgaon ke" },
  gurugram: { city: "Gurugram", possessive: "Gurgaon ke" },
  faridabad: { city: "Faridabad", possessive: "Faridabad ke" },
  mumbai: { city: "Mumbai", possessive: "Mumbai ke" },
  bombay: { city: "Mumbai", possessive: "Mumbai ke" },
  pune: { city: "Pune", possessive: "Pune ke" },
  navi_mumbai: { city: "Navi Mumbai", possessive: "Navi Mumbai ke" },
  thane: { city: "Thane", possessive: "Thane ke" },
  bengaluru: { city: "Bengaluru", possessive: "Bengaluru ke" },
  bangalore: { city: "Bengaluru", possessive: "Bengaluru ke" },
  mysore: { city: "Mysuru", possessive: "Mysuru ke" },
  hyderabad: { city: "Hyderabad", possessive: "Hyderabad ke" },
  secunderabad: { city: "Hyderabad", possessive: "Hyderabad ke" },
  chennai: { city: "Chennai", possessive: "Chennai ke" },
  madras: { city: "Chennai", possessive: "Chennai ke" },
  kolkata: { city: "Kolkata", possessive: "Kolkata ke" },
  calcutta: { city: "Kolkata", possessive: "Kolkata ke" },
  ahmedabad: { city: "Ahmedabad", possessive: "Ahmedabad ke" },
  surat: { city: "Surat", possessive: "Surat ke" },
  jaipur: { city: "Jaipur", possessive: "Jaipur ke" },
  kanpur: { city: "Kanpur", possessive: "Kanpur ke" },
  varanasi: { city: "Varanasi", possessive: "Banaras ke" },
  banaras: { city: "Varanasi", possessive: "Banaras ke" },
  prayagraj: { city: "Prayagraj", possessive: "Prayagraj ke" },
  allahabad: { city: "Prayagraj", possessive: "Prayagraj ke" },
  agra: { city: "Agra", possessive: "Agra ke" },
  meerut: { city: "Meerut", possessive: "Meerut ke" },
  bareilly: { city: "Bareilly", possessive: "Bareilly ke" },
  gorakhpur: { city: "Gorakhpur", possessive: "Gorakhpur ke" },
  patna: { city: "Patna", possessive: "Patna ke" },
  bhopal: { city: "Bhopal", possessive: "Bhopal ke" },
  indore: { city: "Indore", possessive: "Indore ke" },
  chandigarh: { city: "Chandigarh", possessive: "Chandigarh ke" },
  coimbatore: { city: "Coimbatore", possessive: "Coimbatore ke" },
  kochi: { city: "Kochi", possessive: "Kochi ke" },
  thiruvananthapuram: { city: "Thiruvananthapuram", possessive: "Thiruvananthapuram ke" },
  guwahati: { city: "Guwahati", possessive: "Guwahati ke" },
  nagpur: { city: "Nagpur", possessive: "Nagpur ke" },
  ranchi: { city: "Ranchi", possessive: "Ranchi ke" },
  raipur: { city: "Raipur", possessive: "Raipur ke" },
  vijayawada: { city: "Vijayawada", possessive: "Vijayawada ke" },
  visakhapatnam: { city: "Visakhapatnam", possessive: "Vizag ke" },
  vizag: { city: "Visakhapatnam", possessive: "Vizag ke" }
};

const DEFAULT: CityCopy = { city: "Lucknow", possessive: "Lucknow ke" };

export function resolveCityCopy(rawCity: string | null | undefined): CityCopy {
  if (!rawCity) return DEFAULT;
  const key = rawCity.trim().toLowerCase().replace(/-/g, " ").replace(/_/g, " ");
  return KNOWN[key] ?? DEFAULT;
}
