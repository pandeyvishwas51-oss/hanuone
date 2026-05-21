import {
  boolean,
  date,
  decimal,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

// Auth.js tables (must match Drizzle adapter expectations)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  passwordHash: text("password_hash"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state")
});

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull()
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull()
  },
  (vt) => ({
    pk: primaryKey({ columns: [vt.identifier, vt.token] })
  })
);

export const professionals = pgTable("professionals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  role: text("role").notNull(),
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
  status: text("status").default("pending"),
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

// =====================================================================
// Read-only references to patient-side tables (Hanuone main directory)
// =====================================================================
export const doctors = pgTable("doctors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  specialization: text("specialization").notNull(),
  locality: text("locality").notNull(),
  city: text("city").default("Lucknow"),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  reviewCount: integer("review_count").default(0),
  verified: boolean("verified").default(false),
  isActive: boolean("is_active").default(true),
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
