import { sql, eq, and, gte, desc } from "drizzle-orm";
import { db, schema } from "./db";

const today = () => new Date().toISOString().split("T")[0];
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

export type Kpis = {
  doctorsTotal: number;
  doctorsVerified: number;
  professionalsTotal: number;
  professionalsPending: number;
  professionalsVerified: number;
  professionalsRejected: number;
  bookingsTotal: number;
  bookingsToday: number;
  bookingsCompleted: number;
  bookingsThisMonth: number;
  earningsNet: number;
  earningsThisMonth: number;
  waitlistTotal: number;
  signups7d: number;
  signups30d: number;
  bookings7d: number;
};

export async function getKpis(): Promise<Kpis> {
  const dbi = db();
  const t = today();
  const d7 = daysAgo(7);
  const d30 = daysAgo(30);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split("T")[0];

  const [
    doctorsTotal,
    doctorsVerified,
    profTotal,
    profPending,
    profVerified,
    profRejected,
    bookingsTotal,
    bookingsToday,
    bookingsCompleted,
    bookingsMonth,
    bookings7d,
    earningsAll,
    earningsMonth,
    waitlistTotal,
    signups7d,
    signups30d
  ] = await Promise.all([
    dbi.select({ c: sql<number>`count(*)::int` }).from(schema.doctors).where(eq(schema.doctors.isActive, true)),
    dbi.select({ c: sql<number>`count(*)::int` }).from(schema.doctors).where(and(eq(schema.doctors.isActive, true), eq(schema.doctors.verified, true))),
    dbi.select({ c: sql<number>`count(*)::int` }).from(schema.professionals),
    dbi.select({ c: sql<number>`count(*)::int` }).from(schema.professionals).where(eq(schema.professionals.status, "pending")),
    dbi.select({ c: sql<number>`count(*)::int` }).from(schema.professionals).where(eq(schema.professionals.status, "verified")),
    dbi.select({ c: sql<number>`count(*)::int` }).from(schema.professionals).where(eq(schema.professionals.status, "rejected")),
    dbi.select({ c: sql<number>`count(*)::int` }).from(schema.bookings),
    dbi.select({ c: sql<number>`count(*)::int` }).from(schema.bookings).where(eq(schema.bookings.bookingDate, t)),
    dbi.select({ c: sql<number>`count(*)::int` }).from(schema.bookings).where(eq(schema.bookings.status, "completed")),
    dbi.select({ c: sql<number>`count(*)::int` }).from(schema.bookings).where(gte(schema.bookings.bookingDate, monthStartStr)),
    dbi.select({ c: sql<number>`count(*)::int` }).from(schema.bookings).where(gte(schema.bookings.bookingDate, d7)),
    dbi.select({ amount: schema.earnings.amount, type: schema.earnings.type }).from(schema.earnings),
    dbi.select({ amount: schema.earnings.amount, type: schema.earnings.type }).from(schema.earnings).where(gte(schema.earnings.createdAt, new Date(monthStartStr))),
    dbi.select({ c: sql<number>`count(*)::int` }).from(schema.waitlist),
    dbi.select({ c: sql<number>`count(*)::int` }).from(schema.professionals).where(gte(schema.professionals.createdAt, new Date(d7))),
    dbi.select({ c: sql<number>`count(*)::int` }).from(schema.professionals).where(gte(schema.professionals.createdAt, new Date(d30)))
  ]);

  const sumEarnings = (rows: { amount: number; type: string | null }[]) =>
    rows.reduce((s, r) => s + (r.type === "credit" ? r.amount : -r.amount), 0);

  return {
    doctorsTotal: doctorsTotal[0]?.c ?? 0,
    doctorsVerified: doctorsVerified[0]?.c ?? 0,
    professionalsTotal: profTotal[0]?.c ?? 0,
    professionalsPending: profPending[0]?.c ?? 0,
    professionalsVerified: profVerified[0]?.c ?? 0,
    professionalsRejected: profRejected[0]?.c ?? 0,
    bookingsTotal: bookingsTotal[0]?.c ?? 0,
    bookingsToday: bookingsToday[0]?.c ?? 0,
    bookingsCompleted: bookingsCompleted[0]?.c ?? 0,
    bookingsThisMonth: bookingsMonth[0]?.c ?? 0,
    bookings7d: bookings7d[0]?.c ?? 0,
    earningsNet: sumEarnings(earningsAll),
    earningsThisMonth: sumEarnings(earningsMonth),
    waitlistTotal: waitlistTotal[0]?.c ?? 0,
    signups7d: signups7d[0]?.c ?? 0,
    signups30d: signups30d[0]?.c ?? 0
  };
}

// Daily signups over the last 30 days
export async function getSignupsTimeseries(): Promise<{ date: string; count: number }[]> {
  const dbi = db();
  const rows = await dbi.execute<{ d: string; c: number }>(sql`
    WITH days AS (
      SELECT generate_series(current_date - interval '29 days', current_date, '1 day')::date AS d
    )
    SELECT to_char(days.d, 'YYYY-MM-DD') AS d,
           COALESCE(COUNT(p.id), 0)::int AS c
    FROM days
    LEFT JOIN professionals p ON p.created_at::date = days.d
    GROUP BY days.d
    ORDER BY days.d
  `);
  return (rows.rows ?? rows as unknown as { d: string; c: number }[]).map((r) => ({ date: r.d, count: Number(r.c) }));
}

// Daily bookings over the last 30 days
export async function getBookingsTimeseries(): Promise<{ date: string; count: number }[]> {
  const dbi = db();
  const rows = await dbi.execute<{ d: string; c: number }>(sql`
    WITH days AS (
      SELECT generate_series(current_date - interval '29 days', current_date, '1 day')::date AS d
    )
    SELECT to_char(days.d, 'YYYY-MM-DD') AS d,
           COALESCE(COUNT(b.id), 0)::int AS c
    FROM days
    LEFT JOIN bookings b ON b.booking_date = days.d
    GROUP BY days.d
    ORDER BY days.d
  `);
  return (rows.rows ?? rows as unknown as { d: string; c: number }[]).map((r) => ({ date: r.d, count: Number(r.c) }));
}

// Doctor distribution by specialty
export async function getSpecialtyDistribution(): Promise<{ name: string; count: number }[]> {
  const dbi = db();
  const rows = await dbi
    .select({ name: schema.doctors.specialization, count: sql<number>`count(*)::int` })
    .from(schema.doctors)
    .where(eq(schema.doctors.isActive, true))
    .groupBy(schema.doctors.specialization)
    .orderBy(desc(sql`count(*)`))
    .limit(10);
  return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
}

// Doctor distribution by locality
export async function getLocalityDistribution(): Promise<{ name: string; count: number }[]> {
  const dbi = db();
  const rows = await dbi
    .select({ name: schema.doctors.locality, count: sql<number>`count(*)::int` })
    .from(schema.doctors)
    .where(eq(schema.doctors.isActive, true))
    .groupBy(schema.doctors.locality)
    .orderBy(desc(sql`count(*)`))
    .limit(10);
  return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
}

// Professional role split
export async function getRoleDistribution(): Promise<{ name: string; count: number }[]> {
  const dbi = db();
  const rows = await dbi
    .select({ name: schema.professionals.role, count: sql<number>`count(*)::int` })
    .from(schema.professionals)
    .groupBy(schema.professionals.role)
    .orderBy(desc(sql`count(*)`));
  return rows.map((r) => ({
    name: r.name.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    count: Number(r.count)
  }));
}

// Booking status split
export async function getBookingStatusDistribution(): Promise<{ name: string; count: number }[]> {
  const dbi = db();
  const rows = await dbi
    .select({ name: schema.bookings.status, count: sql<number>`count(*)::int` })
    .from(schema.bookings)
    .groupBy(schema.bookings.status)
    .orderBy(desc(sql`count(*)`));
  return rows.map((r) => ({
    name: (r.name ?? "unknown").replace("_", " "),
    count: Number(r.count)
  }));
}

// Recent activity feed
export type ActivityItem = {
  id: string;
  type: "professional_signup" | "booking_created" | "waitlist" | "booking_completed";
  title: string;
  detail: string;
  at: string;
};

export async function getRecentActivity(limit = 12): Promise<ActivityItem[]> {
  const dbi = db();
  const [profs, bookings, waitlist] = await Promise.all([
    dbi
      .select({
        id: schema.professionals.id,
        name: schema.professionals.fullName,
        role: schema.professionals.role,
        locality: schema.professionals.locality,
        createdAt: schema.professionals.createdAt
      })
      .from(schema.professionals)
      .orderBy(desc(schema.professionals.createdAt))
      .limit(limit),
    dbi
      .select({
        id: schema.bookings.id,
        patientName: schema.bookings.patientName,
        serviceType: schema.bookings.serviceType,
        status: schema.bookings.status,
        createdAt: schema.bookings.createdAt
      })
      .from(schema.bookings)
      .orderBy(desc(schema.bookings.createdAt))
      .limit(limit),
    dbi
      .select({
        id: schema.waitlist.id,
        email: schema.waitlist.email,
        whatsapp: schema.waitlist.whatsapp,
        interest: schema.waitlist.interest,
        createdAt: schema.waitlist.createdAt
      })
      .from(schema.waitlist)
      .orderBy(desc(schema.waitlist.createdAt))
      .limit(limit)
  ]);

  const items: ActivityItem[] = [];
  for (const p of profs) {
    items.push({
      id: `p-${p.id}`,
      type: "professional_signup",
      title: `${p.name} registered`,
      detail: `${p.role.replace("_", " ")}${p.locality ? ` in ${p.locality}` : ""}`,
      at: p.createdAt?.toISOString() ?? new Date(0).toISOString()
    });
  }
  for (const b of bookings) {
    items.push({
      id: `b-${b.id}`,
      type: b.status === "completed" ? "booking_completed" : "booking_created",
      title: b.status === "completed" ? `Booking completed for ${b.patientName}` : `${b.patientName} booked ${b.serviceType}`,
      detail: `Status: ${(b.status ?? "pending").replace("_", " ")}`,
      at: b.createdAt?.toISOString() ?? new Date(0).toISOString()
    });
  }
  for (const w of waitlist) {
    items.push({
      id: `w-${w.id}`,
      type: "waitlist",
      title: `Waitlist signup`,
      detail: `${w.email ?? w.whatsapp ?? "anonymous"} - ${w.interest ?? "no interest"}`,
      at: w.createdAt?.toISOString() ?? new Date(0).toISOString()
    });
  }
  items.sort((a, b) => b.at.localeCompare(a.at));
  return items.slice(0, limit);
}
