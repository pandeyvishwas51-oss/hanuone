export const dynamic = "force-dynamic";
import { eq, and, gte, sql, inArray } from "drizzle-orm";
import { Calendar, ClipboardList, Wallet, TrendingUp } from "lucide-react";
import { auth } from "@/auth";
import { db, schema } from "@/lib/db";

export default async function DashboardOverview() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [profile] = await db()
    .select({ id: schema.professionals.id, fullName: schema.professionals.fullName })
    .from(schema.professionals)
    .where(eq(schema.professionals.userId, session.user.id))
    .limit(1);

  if (!profile) return null;
  const today = new Date().toISOString().split("T")[0];

  const [[totalRow], [upcomingRow], earningsRows, [openSlotsRow]] = await Promise.all([
    db()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.bookings)
      .where(eq(schema.bookings.professionalId, profile.id)),
    db()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.professionalId, profile.id),
          inArray(schema.bookings.status, ["pending", "confirmed"]),
          gte(schema.bookings.bookingDate, today)
        )
      ),
    db()
      .select({ amount: schema.earnings.amount, type: schema.earnings.type })
      .from(schema.earnings)
      .where(eq(schema.earnings.professionalId, profile.id)),
    db()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.availability)
      .where(
        and(
          eq(schema.availability.professionalId, profile.id),
          eq(schema.availability.date, today),
          eq(schema.availability.isBooked, false)
        )
      )
  ]);

  const totalEarnings = earningsRows.reduce(
    (sum, r) => sum + (r.type === "credit" ? r.amount : -r.amount),
    0
  );

  const stats = [
    { label: "Total bookings", value: totalRow?.count ?? 0, icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
    { label: "Upcoming", value: upcomingRow?.count ?? 0, icon: Calendar, color: "text-amber-600 bg-amber-50" },
    {
      label: "Net earnings",
      value: `INR ${totalEarnings.toLocaleString("en-IN")}`,
      icon: Wallet,
      color: "text-emerald-600 bg-emerald-50"
    },
    { label: "Open slots today", value: openSlotsRow?.count ?? 0, icon: TrendingUp, color: "text-primary bg-primary/10" }
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-ink sm:text-2xl">
        Welcome, {profile.fullName?.split(" ")[0] || "Pro"}
      </h1>
      <p className="mt-1 text-sm text-muted">Here is your work summary.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-4 p-5">
            <div className={`grid h-11 w-11 place-items-center rounded-xl ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-ink">{s.value}</div>
              <div className="text-xs text-muted">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 card p-6">
        <h2 className="text-base font-semibold text-ink">Quick actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <a href="/dashboard/availability" className="btn-outline">Mark availability</a>
          <a href="/dashboard/bookings" className="btn-outline">View bookings</a>
          <a href="/dashboard/profile" className="btn-outline">Update profile</a>
        </div>
      </div>
    </div>
  );
}
