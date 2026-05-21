import { createClient } from "@/lib/supabase-server";
import { Calendar, ClipboardList, Wallet, TrendingUp } from "lucide-react";

export default async function DashboardOverview() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("professionals")
    .select("id, full_name, role, status")
    .eq("user_id", user!.id)
    .single();

  const profId = profile?.id;

  const { count: totalBookings } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("professional_id", profId ?? "");

  const { count: upcomingBookings } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("professional_id", profId ?? "")
    .in("status", ["pending", "confirmed"])
    .gte("booking_date", new Date().toISOString().split("T")[0]);

  const { data: earningsData } = await supabase
    .from("earnings")
    .select("amount")
    .eq("professional_id", profId ?? "")
    .eq("type", "credit");

  const totalEarnings = (earningsData ?? []).reduce((s, e) => s + e.amount, 0);

  const { count: slotsToday } = await supabase
    .from("availability")
    .select("*", { count: "exact", head: true })
    .eq("professional_id", profId ?? "")
    .eq("date", new Date().toISOString().split("T")[0])
    .eq("is_booked", false);

  const stats = [
    { label: "Total bookings", value: totalBookings ?? 0, icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
    { label: "Upcoming", value: upcomingBookings ?? 0, icon: Calendar, color: "text-amber-600 bg-amber-50" },
    { label: "Total earnings", value: `INR ${totalEarnings.toLocaleString("en-IN")}`, icon: Wallet, color: "text-emerald-600 bg-emerald-50" },
    { label: "Open slots today", value: slotsToday ?? 0, icon: TrendingUp, color: "text-primary bg-primary/10" }
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-ink sm:text-2xl">
        Welcome, {profile?.full_name?.split(" ")[0] || "Pro"}
      </h1>
      <p className="mt-1 text-sm text-muted">Here's your work summary.</p>

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
