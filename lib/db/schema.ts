import {
  boolean,
  date,
  decimal,
  integer,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

// =====================================================================
// Hanuone (patient-facing directory) tables
// =====================================================================
export const doctors = pgTable("doctors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  nameHindi: text("name_hindi"),
  slug: text("slug").notNull().unique(),
  specialization: text("specialization").notNull(),
  specializationHindi: text("specialization_hindi"),
  subSpecializations: text("sub_specializations").array(),
  qualifications: text("qualifications").array(),
  experienceYears: integer("experience_years"),
  clinicName: text("clinic_name"),
  clinicAddress: text("clinic_address").notNull(),
  locality: text("locality").notNull(),
  city: text("city").default("Lucknow"),
  pincode: text("pincode"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  consultationFeeMin: integer("consultation_fee_min"),
  consultationFeeMax: integer("consultation_fee_max"),
  timing: text("timing"),
  languages: text("languages").array().default(["Hindi", "English"]),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  reviewCount: integer("review_count").default(0),
  profileImageUrl: text("profile_image_url"),
  verified: boolean("verified").default(false),
  source: text("source"),
  sourceUrl: text("source_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const specializations = pgTable("specializations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  nameHindi: text("name_hindi"),
  icon: text("icon"),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  doctorCount: integer("doctor_count").default(0)
});

export const localities = pgTable("localities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  nameHindi: text("name_hindi"),
  slug: text("slug").notNull().unique(),
  doctorCount: integer("doctor_count").default(0),
  lat: decimal("lat", { precision: 10, scale: 8 }),
  lng: decimal("lng", { precision: 11, scale: 8 })
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "cascade" }),
  reviewerName: text("reviewer_name"),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email"),
  whatsapp: text("whatsapp"),
  cityOfResidence: text("city_of_residence"),
  parentsCity: text("parents_city").default("Lucknow"),
  interest: text("interest"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// Patient-side booking (consultation request)
export const doctorBookings = pgTable("doctor_bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
  doctorSlug: text("doctor_slug").notNull(),
  doctorName: text("doctor_name").notNull(),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone").notNull(),
  patientEmail: text("patient_email"),
  preferredDate: date("preferred_date").notNull(),
  preferredTime: text("preferred_time").notNull(),
  reason: text("reason"),
  city: text("city"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  service: text("service").notNull(),
  name: text("name"),
  phone: text("phone").notNull(),
  email: text("email"),
  city: text("city"),
  pincode: text("pincode"),
  notes: text("notes"),
  status: text("status").default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  email: text("email"),
  city: text("city"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// =====================================================================
// HanuonePro (gig professional dashboard) tables
// =====================================================================
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const professionals = pgTable("professionals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  role: text("role").notNull(), // 'doctor' | 'nurse' | 'ward_boy' | 'caregiver' | 'physiotherapist' | 'agency'
  specialization: text("specialization"),
  qualifications: text("qualifications").array(),
  experienceYears: integer("experience_years"),
  bio: text("bio"),
  profilePhotoUrl: text("profile_photo_url"),
  aadhaarUrl: text("aadhaar_url"),
  certificateUrls: text("certificate_urls").array(),
  locality: text("locality"),
  city: text("city").default("Lucknow"),
  pincode: text("pincode"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  hourlyRate: integer("hourly_rate"),
  dailyRate: integer("daily_rate"),
  services: text("services").array(),
  languages: text("languages").array().default(["Hindi", "English"]),
  status: text("status").default("pending"), // 'pending' | 'verified' | 'rejected' | 'suspended'
  rejectionReason: text("rejection_reason"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const availability = pgTable("availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  professionalId: uuid("professional_id").references(() => professionals.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isBooked: boolean("is_booked").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  professionalId: uuid("professional_id").references(() => professionals.id, { onDelete: "set null" }),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone").notNull(),
  patientAddress: text("patient_address"),
  serviceType: text("service_type").notNull(),
  bookingDate: date("booking_date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  status: text("status").default("pending"),
  notes: text("notes"),
  amount: integer("amount"),
  paymentStatus: text("payment_status").default("unpaid"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const earnings = pgTable("earnings", {
  id: uuid("id").primaryKey().defaultRandom(),
  professionalId: uuid("professional_id").references(() => professionals.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(),
  type: text("type").default("credit"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
