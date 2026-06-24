// Static content for doctors, nursing services and cities.
// Replace these exports with API/database calls when the backend is ready —
// the types below define the contract the UI depends on.

export type Doctor = {
  slug: string;
  name: string;
  photo: string; // initials-based avatar; real photos come later
  specialty: string;
  specialtySlug: string;
  qualification: string;
  experienceYears: number;
  clinic: string;
  area: string;
  city: string;
  citySlug: string;
  fee: number;
  modes: ("online" | "in-clinic")[];
  availableNow: boolean;
  languages: string[];
  rating: number;
  reviews: number;
  verified: boolean;
  about: string;
  conditions: string[];
  faqs: { q: string; a: string }[];
};

export type NursingService = {
  id: string;
  name: string;
  tier: "Attendant" | "ANM / GNM" | "B.Sc Nursing";
  description: string;
  price: number;
  icon: string;
};

export const CITY = { name: "Indore", slug: "indore" };

// Cities served, in launch order.
export const CITIES = [
  { name: "Indore", slug: "indore", status: "live" as const, note: "Primary launch city" },
  { name: "Bhopal", slug: "bhopal", status: "coming" as const, note: "Launching soon" },
  { name: "Jabalpur", slug: "jabalpur", status: "coming" as const, note: "Launching soon" },
  { name: "Lucknow", slug: "lucknow", status: "coming" as const, note: "Launching soon" },
  { name: "Delhi", slug: "delhi", status: "coming" as const, note: "Launching soon" },
];

export const SPECIALTIES = [
  { name: "Cardiologist", slug: "cardiologist" },
  { name: "Physician", slug: "physician" },
  { name: "Dermatologist", slug: "dermatologist" },
  { name: "Pediatrician", slug: "pediatrician" },
  { name: "Orthopedic", slug: "orthopedic" },
  { name: "Gynecologist", slug: "gynecologist" },
];

export const DOCTORS: Doctor[] = [
  {
    slug: "dr-anil-mehta",
    name: "Dr. Anil Mehta",
    photo: "AM",
    specialty: "Cardiologist",
    specialtySlug: "cardiologist",
    qualification: "MBBS, MD, DM (Cardiology)",
    experienceYears: 18,
    clinic: "Heart Care Clinic, Vijay Nagar",
    area: "Vijay Nagar",
    city: "Indore",
    citySlug: "indore",
    fee: 700,
    modes: ["online", "in-clinic"],
    availableNow: true,
    languages: ["Hindi", "English"],
    rating: 4.8,
    reviews: 212,
    verified: true,
    about:
      "Senior interventional cardiologist with 18 years of experience treating heart conditions. Known for patient-friendly explanations and elderly care.",
    conditions: ["Hypertension", "Chest pain", "Heart failure", "Arrhythmia", "Cholesterol"],
    faqs: [
      { q: "Does Dr. Mehta offer online consultation?", a: "Yes, audio and video consultations are available, often within 5 minutes when marked Available Now." },
      { q: "Can nursing support assist during the consultation?", a: "Yes. You can add HanuOne nursing support for vitals, intake and helping elderly patients connect." },
    ],
  },
  {
    slug: "dr-priya-sharma",
    name: "Dr. Priya Sharma",
    photo: "PS",
    specialty: "Physician",
    specialtySlug: "physician",
    qualification: "MBBS, MD (General Medicine)",
    experienceYears: 12,
    clinic: "City Care Polyclinic, Palasia",
    area: "Palasia",
    city: "Indore",
    citySlug: "indore",
    fee: 500,
    modes: ["online", "in-clinic"],
    availableNow: true,
    languages: ["Hindi", "English"],
    rating: 4.7,
    reviews: 168,
    verified: true,
    about:
      "General physician focused on fever, diabetes, thyroid and routine adult care. Offers quick online consultations for working professionals.",
    conditions: ["Fever", "Diabetes", "Thyroid", "Weakness", "Infections"],
    faqs: [
      { q: "How soon can I consult online?", a: "When Dr. Sharma is Available Now, you can usually connect within 5 minutes." },
    ],
  },
  {
    slug: "dr-rakesh-verma",
    name: "Dr. Rakesh Verma",
    photo: "RV",
    specialty: "Orthopedic",
    specialtySlug: "orthopedic",
    qualification: "MBBS, MS (Orthopaedics)",
    experienceYears: 15,
    clinic: "Bone & Joint Centre, Sapna Sangeeta",
    area: "Sapna Sangeeta",
    city: "Indore",
    citySlug: "indore",
    fee: 600,
    modes: ["in-clinic"],
    availableNow: false,
    languages: ["Hindi", "English"],
    rating: 4.6,
    reviews: 95,
    verified: true,
    about:
      "Orthopedic surgeon specialising in knee, joint and post-surgery recovery. Works closely with home physiotherapy and nursing follow-up.",
    conditions: ["Knee pain", "Back pain", "Fractures", "Joint replacement", "Arthritis"],
    faqs: [
      { q: "Is home follow-up available?", a: "Yes, post-surgery nursing follow-up visits can be booked through HanuOne home nursing." },
    ],
  },
  {
    slug: "dr-sneha-jain",
    name: "Dr. Sneha Jain",
    photo: "SJ",
    specialty: "Dermatologist",
    specialtySlug: "dermatologist",
    qualification: "MBBS, MD (Dermatology)",
    experienceYears: 9,
    clinic: "Skin & Glow Clinic, Vijay Nagar",
    area: "Vijay Nagar",
    city: "Indore",
    citySlug: "indore",
    fee: 550,
    modes: ["online", "in-clinic"],
    availableNow: false,
    languages: ["Hindi", "English"],
    rating: 4.7,
    reviews: 134,
    verified: true,
    about:
      "Dermatologist treating skin allergies, acne, hair fall and skin infections for all age groups.",
    conditions: ["Skin allergy", "Acne", "Hair fall", "Eczema", "Pigmentation"],
    faqs: [
      { q: "Can I share photos before the consultation?", a: "Yes, you can upload images during booking and nursing support can help with uploads." },
    ],
  },
  {
    slug: "dr-imran-khan",
    name: "Dr. Imran Khan",
    photo: "IK",
    specialty: "Pediatrician",
    specialtySlug: "pediatrician",
    qualification: "MBBS, MD (Pediatrics)",
    experienceYears: 14,
    clinic: "Little Stars Children Clinic, Bhawarkua",
    area: "Bhawarkua",
    city: "Indore",
    citySlug: "indore",
    fee: 500,
    modes: ["online", "in-clinic"],
    availableNow: true,
    languages: ["Hindi", "English", "Urdu"],
    rating: 4.9,
    reviews: 240,
    verified: true,
    about:
      "Child specialist for newborn care, vaccinations, fever and growth concerns. Gentle, parent-friendly approach.",
    conditions: ["Child fever", "Vaccination", "Cough & cold", "Growth concerns", "Nutrition"],
    faqs: [
      { q: "Do you provide vaccination reminders?", a: "Yes, vaccination schedules and reminders are shared after the first consultation." },
    ],
  },
  {
    slug: "dr-kavita-rao",
    name: "Dr. Kavita Rao",
    photo: "KR",
    specialty: "Gynecologist",
    specialtySlug: "gynecologist",
    qualification: "MBBS, MS (Obstetrics & Gynaecology)",
    experienceYears: 16,
    clinic: "Matrika Women's Clinic, Old Palasia",
    area: "Old Palasia",
    city: "Indore",
    citySlug: "indore",
    fee: 650,
    modes: ["online", "in-clinic"],
    availableNow: false,
    languages: ["Hindi", "English"],
    rating: 4.8,
    reviews: 187,
    verified: true,
    about:
      "Gynaecologist offering pregnancy care, women's health and menstrual health consultations with strong continuity of care.",
    conditions: ["Pregnancy care", "PCOD", "Menstrual issues", "Menopause", "Infections"],
    faqs: [
      { q: "Is home nursing available during pregnancy?", a: "Yes, home vitals monitoring and nursing visits can be scheduled alongside consultations." },
    ],
  },
];

export const NURSING_SERVICES: NursingService[] = [
  {
    id: "vitals",
    name: "Vitals Check (BP, Pulse, Temp, SpO2)",
    tier: "Attendant",
    description: "Trained attendant checks and records basic vitals at home and shares the summary.",
    price: 299,
    icon: "🩺",
  },
  {
    id: "blood-sugar",
    name: "Blood Sugar Check",
    tier: "Attendant",
    description: "Home blood sugar monitoring for diabetic patients (device-assisted).",
    price: 249,
    icon: "💉",
  },
  {
    id: "dressing",
    name: "Wound Dressing",
    tier: "ANM / GNM",
    description: "Sterile wound dressing and basic clinical monitoring by a qualified nurse.",
    price: 449,
    icon: "🩹",
  },
  {
    id: "injection",
    name: "Injection / Medication Support",
    tier: "ANM / GNM",
    description: "Doctor-prescribed injections and medication administration at home.",
    price: 399,
    icon: "💊",
  },
  {
    id: "elderly",
    name: "Elderly Care Support",
    tier: "Attendant",
    description: "Assistance for elderly patients including vitals, mobility help and consultation support.",
    price: 599,
    icon: "🧓",
  },
  {
    id: "post-surgery",
    name: "Post-Surgery Monitoring",
    tier: "B.Sc Nursing",
    description: "Advanced post-operative monitoring and clinical care by a senior nurse.",
    price: 899,
    icon: "🏥",
  },
  {
    id: "consult-support",
    name: "Nursing-Assisted Consultation",
    tier: "ANM / GNM",
    description: "A nurse visits to take intake, vitals, upload reports and help connect to the online doctor — ideal for elderly patients.",
    price: 499,
    icon: "👩‍⚕️",
  },
];

export const NURSE_TIERS = [
  { tier: "Attendant", scope: "Basic vitals, elderly assistance, daily monitoring" },
  { tier: "ANM / GNM", scope: "Dressing, injections, clinical monitoring, consultation support" },
  { tier: "B.Sc Nursing", scope: "Advanced care, post-surgery monitoring" },
];

export function getDoctor(slug: string) {
  return DOCTORS.find((d) => d.slug === slug);
}

export function searchDoctors(opts: {
  q?: string;
  specialty?: string;
  availableNow?: boolean;
  mode?: "online" | "in-clinic";
}) {
  return DOCTORS.filter((d) => {
    if (opts.specialty && d.specialtySlug !== opts.specialty) return false;
    if (opts.availableNow && !d.availableNow) return false;
    if (opts.mode && !d.modes.includes(opts.mode)) return false;
    if (opts.q) {
      const hay = `${d.name} ${d.specialty} ${d.conditions.join(" ")} ${d.area}`.toLowerCase();
      if (!hay.includes(opts.q.toLowerCase())) return false;
    }
    return true;
  });
}
