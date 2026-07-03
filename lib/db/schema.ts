import {
  boolean,
  date,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

// =====================================================================
// Hanuone (patient-facing directory) tables
// =====================================================================
export const doctors = pgTable("doctors", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Links a real onboarded doctor (provider user) to this catalog entry so their
  // consults/prescriptions can be bound to them. Null for scraped catalog rows
  // (NULLS DISTINCT lets many such rows coexist); unique for onboarded doctors so
  // the consult→doctor→professional payout chain resolves to exactly one row.
  userId: uuid("user_id").unique(),
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
}, (t) => ({
  slugIdx: index("doctors_slug_idx").on(t.slug),
  activeIdx: index("doctors_active_idx").on(t.isActive),
}));

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
  // Links the review to the patient who wrote it (one per patient per doctor) and
  // the consult it's for — so we can verify the patient actually saw the doctor.
  patientUserId: uuid("patient_user_id"),
  consultationId: uuid("consultation_id"),
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
  // Links the booking to a logged-in patient so it reliably appears in their
  // "My bookings" even if the phone entered differs. Null for anonymous bookings.
  patientUserId: uuid("patient_user_id"),
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
// Unified auth user (patient | provider | admin). Phone is the primary login
// identifier via MSG91 OTP; email/password retained for legacy/admin logins.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").unique(),
  phoneVerified: timestamp("phone_verified", { withTimezone: true }),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("patient"), // 'patient' | 'provider' | 'admin'
  isAdmin: boolean("is_admin").default(false),
  // Profile (filled in My Profile tab)
  address: text("address"),
  altPhone: text("alt_phone"),
  city: text("city"),
  pincode: text("pincode"),
  gender: text("gender"),
  dob: date("dob"),
  bloodGroup: text("blood_group"),
  emergencyName: text("emergency_name"),
  emergencyPhone: text("emergency_phone"),
  marketingOptIn: boolean("marketing_opt_in").default(true),
  authProvider: text("auth_provider").default("email"), // 'email' | 'google' | 'phone'
  referredByCode: text("referred_by_code"), // ref code captured at signup, applied on verify
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// Email OTPs for signup verification + password reset (sent via Resend).
export const emailOtps = pgTable("email_otps", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  purpose: text("purpose").notNull().default("signup"), // 'signup' | 'reset' | 'login'
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").default(0),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  emailPurposeIdx: index("email_otps_email_purpose_idx").on(t.email, t.purpose),
}));

export const professionals = pgTable("professionals", {
  id: uuid("id").primaryKey().defaultRandom(),
  // One provider account per user — makes payout-recipient resolution provably
  // unambiguous. Nullable, so NULLS DISTINCT still allows rows without a user.
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  gender: text("gender"), // 'female' | 'male' | 'other' — used for safe same-gender assignment
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
  // Payout bank details (provider self-service; admin pays out against these).
  bankAccountName: text("bank_account_name"),
  bankAccountNumber: text("bank_account_number"),
  bankIfsc: text("bank_ifsc"),
  upiId: text("upi_id"),
  payoutVerified: boolean("payout_verified").default(false),
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
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
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
// Transacting MVP: consult lifecycle, payments, prescriptions, consent
// =====================================================================

// Real bookable slots published by a doctor (replaces free-text preferred time).
export const providerSlots = pgTable("provider_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  startTime: text("start_time").notNull(), // 'HH:MM'
  endTime: text("end_time").notNull(),
  mode: text("mode").notNull().default("video"), // 'video' | 'audio' | 'clinic'
  feeInr: integer("fee_inr"),
  isBooked: boolean("is_booked").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// NMC telemedicine + DPDP consent records (immutable, timestamped).
export const consents = pgTable("consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  consultationId: uuid("consultation_id"),
  type: text("type").notNull(), // 'telemedicine' | 'data_processing' | 'marketing'
  granted: boolean("granted").notNull().default(true),
  consentText: text("consent_text").notNull(),
  signatureUrl: text("signature_url"), // captured digital signature image
  patientIdentity: text("patient_identity"),
  rmpIdentity: text("rmp_identity"),
  mode: text("mode"), // communication mode acknowledged
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// A consultation = the 7 NMC record elements + lifecycle status.
export const consultations = pgTable("consultations", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
  patientUserId: uuid("patient_user_id").references(() => users.id, { onDelete: "set null" }),
  slotId: uuid("slot_id").references(() => providerSlots.id, { onDelete: "set null" }),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone").notNull(),
  mode: text("mode").notNull().default("video"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  // lifecycle: 'pending_payment' | 'booked' | 'doctor_accepted' | 'in_progress' | 'completed' | 'cancelled' | 'reassigned' | 'refunded'
  status: text("status").notNull().default("pending_payment"),
  context: text("context"), // reason / symptoms
  evaluationNotes: text("evaluation_notes"),
  managementPlan: text("management_plan"),
  videoRoom: text("video_room"), // Jitsi room name
  transcriptText: text("transcript_text"), // full consult transcription
  transcriptSummary: text("transcript_summary"), // AI summary of the consult
  feeInr: integer("fee_inr"),
  consentId: uuid("consent_id"),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  patientIdx: index("consultations_patient_idx").on(t.patientUserId),
  doctorIdx: index("consultations_doctor_idx").on(t.doctorId),
  scheduledIdx: index("consultations_scheduled_idx").on(t.scheduledAt),
}));

// Server-generated e-prescription (PDF stored in Supabase storage).
export const prescriptions = pgTable("prescriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultationId: uuid("consultation_id").references(() => consultations.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
  patientUserId: uuid("patient_user_id").references(() => users.id, { onDelete: "set null" }),
  doctorName: text("doctor_name").notNull(),
  nmcRegNo: text("nmc_reg_no"),
  qualification: text("qualification"),
  diagnosis: text("diagnosis"),
  medications: text("medications"), // JSON string: [{name, dosage, frequency, duration}]
  instructions: text("instructions"),
  pdfUrl: text("pdf_url"),
  isFollowUp: boolean("is_follow_up").default(false),
  validUntil: date("valid_until"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// Razorpay payment + refund state, linked to any order type.
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  orderType: text("order_type").notNull(), // 'consultation' | 'medicine' | 'lab' | 'nursing' | 'vitals'
  orderId: uuid("order_id"),
  razorpayOrderId: text("razorpay_order_id").notNull().unique(),
  razorpayPaymentId: text("razorpay_payment_id"),
  razorpaySignature: text("razorpay_signature"),
  amountInr: integer("amount_inr").notNull(),
  currency: text("currency").default("INR"),
  status: text("status").notNull().default("created"), // 'created' | 'paid' | 'failed' | 'refunded'
  refundId: text("refund_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  rzpOrderIdx: index("payments_rzp_order_idx").on(t.razorpayOrderId),
  userIdx: index("payments_user_idx").on(t.userId),
  orderIdx: index("payments_order_idx").on(t.orderType, t.orderId),
}));

// =====================================================================
// Vital Checkup (USP): per-visit vitals + auto report + trends
// =====================================================================
export const vitalVisits = pgTable("vital_visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientUserId: uuid("patient_user_id").references(() => users.id, { onDelete: "cascade" }),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone").notNull(),
  // pre-visit intake
  reason: text("reason"),
  allergies: text("allergies"),
  currentMeds: text("current_meds"),
  history: text("history"),
  // vitals
  bpSystolic: integer("bp_systolic"),
  bpDiastolic: integer("bp_diastolic"),
  heartRate: integer("heart_rate"),
  spo2: integer("spo2"),
  temperatureC: decimal("temperature_c", { precision: 4, scale: 1 }),
  randomBloodSugar: integer("random_blood_sugar"),
  weightKg: decimal("weight_kg", { precision: 5, scale: 1 }),
  heightCm: decimal("height_cm", { precision: 5, scale: 1 }),
  respiratoryRate: integer("respiratory_rate"),
  painScale: integer("pain_scale"),
  flags: text("flags"), // JSON string: which vitals are abnormal
  providerNotes: text("provider_notes"),
  reportPdfUrl: text("report_pdf_url"),
  escalated: boolean("escalated").default(false),
  visitedAt: timestamp("visited_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  patientIdx: index("vital_visits_patient_idx").on(t.patientUserId),
}));

// =====================================================================
// Medicine delivery
// =====================================================================
export const medicineOrders = pgTable("medicine_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientUserId: uuid("patient_user_id").references(() => users.id, { onDelete: "set null" }),
  prescriptionId: uuid("prescription_id").references(() => prescriptions.id, { onDelete: "set null" }),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone").notNull(),
  address: text("address").notNull(),
  pincode: text("pincode"),
  city: text("city"),
  prescriptionUrl: text("prescription_url"), // uploaded Rx image/pdf
  items: text("items"), // JSON: [{name, qty}]
  notes: text("notes"),
  // 'placed' | 'confirmed' | 'dispatched' | 'delivered' | 'cancelled'
  status: text("status").notNull().default("placed"),
  amountInr: integer("amount_inr"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  patientIdx: index("medicine_orders_patient_idx").on(t.patientUserId),
}));

// =====================================================================
// Lab tests (catalog + home-collection orders)
// =====================================================================
export const labTests = pgTable("lab_tests", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category"),
  description: text("description"),
  sampleType: text("sample_type"),
  tatHours: integer("tat_hours"),
  priceInr: integer("price_inr"),
  homeCollection: boolean("home_collection").default(true),
  isActive: boolean("is_active").default(true)
});

export const labOrders = pgTable("lab_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientUserId: uuid("patient_user_id").references(() => users.id, { onDelete: "set null" }),
  testId: uuid("test_id").references(() => labTests.id, { onDelete: "set null" }),
  testName: text("test_name").notNull(),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone").notNull(),
  address: text("address"),
  pincode: text("pincode"),
  city: text("city"),
  collectionType: text("collection_type").default("home"), // 'home' | 'walkin'
  slotDate: date("slot_date"),
  slotTime: text("slot_time"),
  // 'booked' | 'collected' | 'processing' | 'report_ready' | 'cancelled'
  status: text("status").notNull().default("booked"),
  reportUrl: text("report_url"),
  amountInr: integer("amount_inr"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  patientIdx: index("lab_orders_patient_idx").on(t.patientUserId),
}));

// =====================================================================
// Compliance: append-only audit log for writes to health/payment tables
// =====================================================================
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id"),
  actorRole: text("actor_role"),
  action: text("action").notNull(), // 'create' | 'update' | 'read' | 'delete' | 'consent' | 'payment'
  entity: text("entity").notNull(), // table name
  entityId: text("entity_id"),
  meta: text("meta"), // JSON string
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// =====================================================================
// AI Health Assistant ("Dr. Hanu") — symptom triage sessions + messages
// Stored only with patient consent; subject to DPDP export/erasure.
// =====================================================================
export const aiChatSessions = pgTable("ai_chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"), // nullable — anonymous sessions allowed
  channel: text("channel").default("web"), // 'web' | 'widget' | 'whatsapp'
  suggestedSpecialty: text("suggested_specialty"),
  emergencyFlagged: boolean("emergency_flagged").default(false),
  liveModel: boolean("live_model").default(false), // true if answered by Claude
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const aiChatMessages = pgTable("ai_chat_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// Nutrition / diet plans + physiotherapy programs (service modules)
export const nutritionPlans = pgTable("nutrition_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientUserId: uuid("patient_user_id").notNull(),
  goal: text("goal"), // 'weight_loss' | 'diabetes' | 'general' | ...
  notes: text("notes"),
  planJson: text("plan_json"), // structured plan
  dietitianId: uuid("dietitian_id"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// =====================================================================
// OPERATIONS PLATFORM (serviceability, onboarding, dashboards, tracking,
// verification, analytics, marketing). All additive; degrade without DB.
// =====================================================================

// Which services are live in which pincode. Drives "available in your area".
export const serviceableAreas = pgTable("serviceable_areas", {
  id: uuid("id").primaryKey().defaultRandom(),
  city: text("city").notNull(),
  pincode: text("pincode").notNull(),
  locality: text("locality"),
  // service: 'teleconsult'|'clinic'|'medicine'|'lab'|'nursing'|'physio'|'vitals'
  service: text("service").notNull(),
  status: text("status").notNull().default("live"), // 'live' | 'coming_soon'
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// Captured demand from non-serviceable pincodes -> expansion signal.
export const serviceRequestsByPincode = pgTable("service_demand", {
  id: uuid("id").primaryKey().defaultRandom(),
  pincode: text("pincode").notNull(),
  city: text("city"),
  service: text("service").notNull(),
  userId: uuid("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// Scraped / imported providers awaiting ops onboarding. NEVER public until
// converted to a verified professional. Holds phone + email for ops calling.
export const onboardingLeads = pgTable("onboarding_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: text("kind").notNull().default("doctor"), // 'doctor'|'nurse'|'physio'|'pharmacy'|'lab'
  fullName: text("full_name").notNull(),
  specialization: text("specialization"),
  qualifications: text("qualifications"),
  city: text("city"),
  locality: text("locality"),
  pincode: text("pincode"),
  clinicName: text("clinic_name"),
  address: text("address"),
  phone: text("phone"),
  altPhone: text("alt_phone"),
  email: text("email"),
  website: text("website"),
  registrationNo: text("registration_no"),
  council: text("council"), // NMC / state council / UP Nurses Council
  source: text("source"), // practo | justdial | google_places | nmr | up_nurses | manual
  sourceUrl: text("source_url"),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  experienceYears: integer("experience_years"),
  rawJson: text("raw_json"),
  // ops pipeline: 'new'|'contacted'|'interested'|'docs_pending'|'onboarded'|'rejected'|'duplicate'
  status: text("status").notNull().default("new"),
  assignedToUserId: uuid("assigned_to_user_id"),
  callNotes: text("call_notes"),
  dedupeKey: text("dedupe_key"), // name|city|phone for uniqueness
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// Provider document + license verification (doctors, nurses, pharmacies).
export const providerVerifications = pgTable("provider_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  professionalId: uuid("professional_id"),
  leadId: uuid("lead_id"),
  docType: text("doc_type").notNull(), // 'medical_registration'|'degree'|'gov_id'|'nursing_registration'|'drug_license'
  fileUrl: text("file_url"),
  // OCR (Claude vision) extracted fields
  ocrName: text("ocr_name"),
  ocrRegistrationNo: text("ocr_registration_no"),
  ocrCouncil: text("ocr_council"),
  ocrRawText: text("ocr_raw_text"),
  // registry cross-check (NMR / state council / UP Nurses Council)
  registryStatus: text("registry_status").default("unchecked"), // 'unchecked'|'match'|'mismatch'|'not_found'|'error'
  registryUrl: text("registry_url"),
  registryNotes: text("registry_notes"),
  // ops final call
  verdict: text("verdict").default("pending"), // 'pending'|'approved'|'rejected'
  verifiedByUserId: uuid("verified_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// Home service visits (nursing, physio, lab collection) with live tracking.
export const serviceVisits = pgTable("service_visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientUserId: uuid("patient_user_id"),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone").notNull(),
  serviceType: text("service_type").notNull(), // 'nursing'|'physio'|'lab'|'vitals'|'caregiver'|'medicine'
  serviceName: text("service_name"),
  address: text("address").notNull(),
  pincode: text("pincode"),
  lat: decimal("lat", { precision: 9, scale: 6 }),
  lng: decimal("lng", { precision: 9, scale: 6 }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  assignedProfessionalId: uuid("assigned_professional_id"),
  // 'requested'|'assigned'|'on_the_way'|'arrived'|'in_progress'|'completed'|'cancelled'
  status: text("status").notNull().default("requested"),
  customerGender: text("customer_gender"), // for safe same-gender assignment
  assignmentReason: text("assignment_reason"), // why this provider was matched
  consentSignatureUrl: text("consent_signature_url"), // captured signature image
  consentAcceptedAt: timestamp("consent_accepted_at", { withTimezone: true }),
  // Nurse-uploaded patient photo on arrival (eyes blurred for privacy).
  patientPhotoUrl: text("patient_photo_url"),
  patientPhotoAt: timestamp("patient_photo_at", { withTimezone: true }),
  // live location of the staff while en route (only during active visit)
  staffLat: decimal("staff_lat", { precision: 9, scale: 6 }),
  staffLng: decimal("staff_lng", { precision: 9, scale: 6 }),
  etaMinutes: integer("eta_minutes"),
  trackingUpdatedAt: timestamp("tracking_updated_at", { withTimezone: true }),
  // Bearer token for the public /track link (patient tracks without logging in).
  trackingToken: text("tracking_token"),
  visitSummary: text("visit_summary"),
  feeInr: integer("fee_inr"),
  paymentId: uuid("payment_id"),
  rating: integer("rating"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  assignedIdx: index("service_visits_assigned_idx").on(t.assignedProfessionalId),
  patientIdx: index("service_visits_patient_idx").on(t.patientUserId),
}));

// Delivery assignment for medicine orders (who is the delivery person).
export const deliveryAssignments = pgTable("delivery_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  medicineOrderId: uuid("medicine_order_id"),
  pharmacyProfessionalId: uuid("pharmacy_professional_id"),
  deliveryPersonName: text("delivery_person_name"),
  deliveryPersonPhone: text("delivery_person_phone"),
  // 'pending'|'accepted'|'packed'|'out_for_delivery'|'delivered'|'cancelled'
  status: text("status").notNull().default("pending"),
  lat: decimal("lat", { precision: 9, scale: 6 }),
  lng: decimal("lng", { precision: 9, scale: 6 }),
  trackingUpdatedAt: timestamp("tracking_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// Provider payouts (Razorpay Route split / RazorpayX).
export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  professionalId: uuid("professional_id"),
  paymentId: uuid("payment_id"),
  // Idempotency key for auto-created payouts: the revenue event that produced
  // this payout. A unique (source_type, source_id) prevents a re-fired webhook
  // or a double "complete" from ever creating two payouts for the same consult/visit.
  sourceType: text("source_type"), // 'consultation' | 'visit'
  sourceId: uuid("source_id"),
  grossInr: integer("gross_inr").notNull(),
  commissionInr: integer("commission_inr").notNull().default(0),
  netInr: integer("net_inr").notNull(),
  status: text("status").notNull().default("pending"), // 'pending'|'processing'|'paid'|'failed'
  providerRef: text("provider_ref"), // Razorpay transfer/payout id
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  sourceIdx: uniqueIndex("payouts_source_idx").on(t.sourceType, t.sourceId)
}));

// Product analytics events (funnel, conversion, provider scorecards).
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(), // 'view_doctor'|'start_booking'|'book_success'|'ai_chat'|...
  userId: uuid("user_id"),
  anonId: text("anon_id"),
  city: text("city"),
  pincode: text("pincode"),
  path: text("path"),
  props: text("props"), // JSON string
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  createdIdx: index("analytics_events_created_idx").on(t.createdAt),
  nameIdx: index("analytics_events_name_idx").on(t.name),
}));

// FCM push tokens for notifications + geofenced marketing.
export const pushTokens = pgTable("push_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  token: text("token").notNull().unique(),
  platform: text("platform").default("web"), // 'web'|'android'|'ios'
  lastLat: decimal("last_lat", { precision: 9, scale: 6 }),
  lastLng: decimal("last_lng", { precision: 9, scale: 6 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  userIdx: index("push_tokens_user_idx").on(t.userId),
}));

// Referral program (growth).
export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  referrerUserId: uuid("referrer_user_id").notNull(),
  code: text("code").notNull(),
  referredUserId: uuid("referred_user_id"),
  status: text("status").default("pending"), // 'pending'|'signed_up'|'first_booking'|'rewarded'
  rewardInr: integer("reward_inr").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});

// =====================================================================
// Clinic EMR — Ambient AI Scribe output: a structured SOAP note + Rx.
// =====================================================================
export const emrNotes = pgTable("emr_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  professionalId: uuid("professional_id").references(() => professionals.id, { onDelete: "set null" }),
  patientUserId: uuid("patient_user_id").references(() => users.id, { onDelete: "set null" }),
  bookingId: uuid("booking_id"),
  patientName: text("patient_name").notNull(),
  patientPhone: text("patient_phone"),
  patientAge: integer("patient_age"),
  patientSex: text("patient_sex"),
  // SOAP + clinical fields
  chiefComplaint: text("chief_complaint"),
  hpi: text("hpi"), // history of present illness (Subjective)
  examination: text("examination"), // Objective
  assessment: text("assessment"), // clinical impression / differential
  diagnosis: text("diagnosis"),
  investigations: text("investigations"), // advised tests
  advice: text("advice"),
  followUp: text("follow_up"),
  redFlags: text("red_flags"),
  patientSummary: text("patient_summary"), // plain-language summary for the patient
  transcript: text("transcript"), // raw ambient transcript
  language: text("language").default("en"),
  signed: boolean("signed").default(false),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const rxItems = pgTable("rx_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  noteId: uuid("note_id").references(() => emrNotes.id, { onDelete: "cascade" }),
  drugName: text("drug_name").notNull(),
  dose: text("dose"),
  frequency: text("frequency"),
  duration: text("duration"),
  instructions: text("instructions"),
  position: integer("position").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
