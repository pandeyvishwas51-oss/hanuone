export type Doctor = {
  id: string;
  name: string;
  name_hindi: string | null;
  slug: string;
  specialization: string;
  specialization_hindi: string | null;
  sub_specializations: string[] | null;
  qualifications: string[] | null;
  experience_years: number | null;
  clinic_name: string | null;
  clinic_address: string;
  locality: string;
  city: string;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  whatsapp: string | null;
  consultation_fee_min: number | null;
  consultation_fee_max: number | null;
  timing: string | null;
  languages: string[] | null;
  rating: number | null;
  review_count: number;
  profile_image_url: string | null;
  verified: boolean;
  source: string | null;
  source_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Specialization = {
  id: string;
  name: string;
  name_hindi: string | null;
  icon: string | null;
  slug: string;
  description: string | null;
  doctor_count: number;
};

export type Locality = {
  id: string;
  name: string;
  name_hindi: string | null;
  slug: string;
  doctor_count: number;
  lat: number | null;
  lng: number | null;
};

export type Review = {
  id: string;
  doctor_id: string;
  reviewer_name: string | null;
  rating: number;
  review_text: string | null;
  is_verified: boolean;
  created_at: string;
};

export type DoctorSearchParams = {
  q?: string;
  specialty?: string | string[];
  locality?: string | string[];
  city?: string;
  feeMin?: number;
  feeMax?: number;
  minRating?: number;
  sort?: "relevance" | "rating" | "fee_low" | "fee_high" | "experience";
  page?: number;
  pageSize?: number;
};
