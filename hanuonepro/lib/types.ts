export type Professional = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  role: "doctor" | "nurse" | "ward_boy" | "caregiver" | "physiotherapist" | "agency";
  specialization: string | null;
  qualifications: string[] | null;
  experience_years: number | null;
  bio: string | null;
  profile_photo_url: string | null;
  aadhaar_url: string | null;
  certificate_urls: string[] | null;
  locality: string | null;
  city: string;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  hourly_rate: number | null;
  daily_rate: number | null;
  services: string[] | null;
  languages: string[] | null;
  status: "pending" | "verified" | "rejected" | "suspended";
  rejection_reason: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
};

export type Availability = {
  id: string;
  professional_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  created_at: string;
};

export type Booking = {
  id: string;
  professional_id: string;
  patient_name: string;
  patient_phone: string;
  patient_address: string | null;
  service_type: string;
  booking_date: string;
  start_time: string | null;
  end_time: string | null;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  notes: string | null;
  amount: number | null;
  payment_status: "unpaid" | "paid" | "partial";
  created_at: string;
  updated_at: string;
};

export type Earning = {
  id: string;
  professional_id: string;
  booking_id: string | null;
  amount: number;
  type: "credit" | "debit" | "payout";
  description: string | null;
  created_at: string;
};
