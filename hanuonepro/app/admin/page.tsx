export const dynamic = "force-dynamic";

import {
  Users,
  ClipboardList,
  Mail,
  Stethoscope,
  IndianRupee,
  CheckCircle2,
  Clock,
  Activity,
  TrendingUp,
  CalendarCheck,
  UserPlus,
  ArrowRight
} from "lucide-react";
import StatCard from "@/components/admin/StatCard";
import { TimeseriesArea, HorizontalBar, DonutChart } from "@/components/admin/Charts";
import {
  getKpis,
  getSignupsTimeseries,
  getBookingsTimeseries,
  getSpecialtyDistribution,
  getLocalityDistribution,
  getRoleDistribution,
  getBookingStatusDistribution,
  getRecentActivity
} from "@/lib/analytics";

const ACTIVITY_ICON: Record<string, { Icon: typeof UserPlus; tint: string }> = {
  professional_signup: { Icon: UserPlus, tint: "bg-cyan-50 text-cyan-600" },
  booking_created: { Icon: ClipboardList, tint: "bg-amber-50 text-amber-600" },
  booking_completed: { Icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-600" },
  waitlist: { Icon: Mail, tint: "bg-rose-50 text-rose-600" }
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default async function AdminOverview() {
  const [k, signups, bookings, specs, localities, roles, statuses, activity] = await Promise.all([
    getKpis(),
    getSignupsTimeseries(),
    getBookingsTimeseries(),
    getSpecialtyDistribution(),
    getLocalityDistribution(),
    getRoleDistribution(),
    getBookingStatusDistribution(),
    getRecentActivity(15)
  ]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Founder cockpit</h1>
          <p className="mt-1 text-sm text-muted">Live KPIs across Hanuone (patient site) and HanuonePro.</p>
        </div>
        <a
          href="https://vercel.com/pandeyvishwas51-oss-projects/hanuone/analytics"
          target="_blank"
          rel="noopener"
          className="btn-outline text-sm"
        >
          Live traffic <ArrowRight size={14} />
        </a>
      </header>

      {/* Top KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Doctors in directory"
          value={k.doctorsTotal.toLocaleString("en-IN")}
          icon={Stethoscope}
          tint="bg-blue-50 text-blue-600"
          hint={`${k.doctorsVerified} verified`}
        />
        <StatCard
          label="Pro signups"
          value={k.professionalsTotal}
          icon={Users}
          tint="bg-primary/10 text-primary"
          delta={k.signups7d > 0 ? { value: `+${k.signups7d} / 7d`, positive: true } : undefined}
          hint={`${k.professionalsPending} pending`}
        />
        <StatCard
          label="Bookings (this month)"
          value={k.bookingsThisMonth}
          icon={CalendarCheck}
          tint="bg-violet-50 text-violet-600"
          hint={`${k.bookingsToday} today, ${k.bookings7d} in 7d`}
        />
        <StatCard
          label="Net earnings (INR)"
          value={k.earningsNet.toLocaleString("en-IN")}
          icon={IndianRupee}
          tint="bg-emerald-50 text-emerald-600"
          hint={`This month: INR ${k.earningsThisMonth.toLocaleString("en-IN")}`}
        />
      </section>

      {/* Secondary KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending verifications" value={k.professionalsPending} icon={Clock} tint="bg-amber-50 text-amber-600" />
        <StatCard label="Verified pros" value={k.professionalsVerified} icon={CheckCircle2} tint="bg-emerald-50 text-emerald-600" />
        <StatCard label="Bookings completed" value={k.bookingsCompleted} icon={ClipboardList} tint="bg-blue-50 text-blue-600" />
        <StatCard label="Waitlist signups" value={k.waitlistTotal} icon={Mail} tint="bg-rose-50 text-rose-600" />
      </section>

      {/* Trends */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Pro signups, last 30 days</h2>
              <p className="text-xs text-muted">Daily new HanuonePro registrations.</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600">{k.signups30d} total</span>
          </div>
          <div className="mt-3">
            <TimeseriesArea data={signups} label="signups" color="#0F4C5C" />
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Bookings, last 30 days</h2>
              <p className="text-xs text-muted">Daily home-care bookings.</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600">{k.bookings7d} in 7d</span>
          </div>
          <div className="mt-3">
            <TimeseriesArea data={bookings} label="bookings" color="#FF6B35" />
          </div>
        </div>
      </section>

      {/* Distributions */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="text-base font-semibold text-ink">Top specialties</h2>
          <p className="text-xs text-muted">Doctor count by specialty, top 10.</p>
          <div className="mt-3"><HorizontalBar data={specs} color="#0F4C5C" /></div>
        </div>
        <div className="card p-5">
          <h2 className="text-base font-semibold text-ink">Top localities</h2>
          <p className="text-xs text-muted">Doctor count by Lucknow locality, top 10.</p>
          <div className="mt-3"><HorizontalBar data={localities} color="#FF6B35" /></div>
        </div>
        <div className="card p-5">
          <h2 className="text-base font-semibold text-ink">Pros by role</h2>
          <p className="text-xs text-muted">Doctors, nurses, ward boys, caregivers, agencies.</p>
          <div className="mt-3"><DonutChart data={roles.length ? roles : [{ name: "No signups yet", count: 1 }]} /></div>
        </div>
      </section>

      {/* Bookings status + activity */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="text-base font-semibold text-ink">Booking status</h2>
          <p className="text-xs text-muted">Pending, confirmed, in-progress, completed, cancelled.</p>
          <div className="mt-3"><DonutChart data={statuses.length ? statuses : [{ name: "No bookings yet", count: 1 }]} /></div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Recent activity</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
            </span>
          </div>
          {activity.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No activity yet. Once registrations and bookings start flowing in, they will show here.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {activity.map((a) => {
                const cfg = ACTIVITY_ICON[a.type] || ACTIVITY_ICON.professional_signup;
                return (
                  <li key={a.id} className="flex items-start gap-3">
                    <span className={`mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-full ${cfg.tint}`}>
                      <cfg.Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-ink">{a.title}</div>
                      <div className="text-xs text-muted">{a.detail}</div>
                    </div>
                    <span className="text-xs text-muted">{timeAgo(a.at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Quick links */}
      <section className="card p-6">
        <h2 className="text-base font-semibold text-ink">Quick links</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <a href="/admin/professionals" className="btn-outline">Review professionals</a>
          <a href="/admin/bookings" className="btn-outline">Manage bookings</a>
          <a href="/admin/waitlist" className="btn-outline">Waitlist signups</a>
          <a href="/admin/doctors" className="btn-outline">Doctors directory</a>
          <a href="/admin/traffic" className="btn-outline">Live traffic</a>
          <a href="/" className="btn-outline">Visit HanuonePro</a>
        </div>
      </section>
    </div>
  );
}
