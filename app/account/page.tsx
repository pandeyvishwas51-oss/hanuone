import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { HAS_DB, db, schema } from "@/lib/db";
import LogoutButton from "@/components/LogoutButton";
import DataRights from "@/components/DataRights";
import ProfileForm from "@/components/ProfileForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account", robots: { index: false } };

const STATUS_COLOR: Record<string, string> = {
  booked: "bg-emerald-50 text-emerald-700",
  in_progress: "bg-sky-50 text-sky-700",
  completed: "bg-slate-100 text-slate-600",
  pending_payment: "bg-amber-50 text-amber-700",
  cancelled: "bg-rose-50 text-rose-600",
  refunded: "bg-rose-50 text-rose-600"
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  let consults: typeof schema.consultations.$inferSelect[] = [];
  let rxs: typeof schema.prescriptions.$inferSelect[] = [];
  let vitals: typeof schema.vitalVisits.$inferSelect[] = [];

  if (HAS_DB) {
    [consults, rxs, vitals] = await Promise.all([
      db().select().from(schema.consultations).where(eq(schema.consultations.patientUserId, user.id)).orderBy(desc(schema.consultations.createdAt)).limit(20),
      db().select().from(schema.prescriptions).where(eq(schema.prescriptions.patientUserId, user.id)).orderBy(desc(schema.prescriptions.createdAt)).limit(20),
      db().select().from(schema.vitalVisits).where(eq(schema.vitalVisits.patientUserId, user.id)).orderBy(desc(schema.vitalVisits.visitedAt)).limit(20)
    ]);
  }

  const upcoming = consults.filter((c) => c.status === "booked" || c.status === "in_progress").length;

  return (
    <div className="container-page py-8">
      {/* Welcome hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-600 p-6 text-white shadow-lg sm:p-7">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/70">Welcome back,</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{user.name || "there"} 👋</h1>
            <p className="mt-0.5 text-sm text-white/70">{user.phone}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/doctors" className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary shadow-sm hover:shadow-md">Book a consult</a>
            <a href="/vitals" className="rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/25">Vital Checkup</a>
            <LogoutButton />
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm"><div className="text-[11px] font-medium text-white/70">Upcoming</div><div className="mt-0.5 text-xl font-bold">{upcoming}</div></div>
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm"><div className="text-[11px] font-medium text-white/70">Prescriptions</div><div className="mt-0.5 text-xl font-bold">{rxs.length}</div></div>
          <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm"><div className="text-[11px] font-medium text-white/70">Vital checkups</div><div className="mt-0.5 text-xl font-bold">{vitals.length}</div></div>
        </div>
      </div>

      {(user.role === "provider" || user.isAdmin) && (
        <a href={user.isAdmin ? "/console" : "/providers"} className="mt-4 flex items-center justify-between rounded-2xl border border-accent/30 bg-accent/5 px-5 py-3 hover:border-accent">
          <span className="text-sm font-semibold text-accent">{user.isAdmin ? "Open the ops console →" : "Open your provider workspace →"}</span>
          <span className="text-xs text-muted">{user.isAdmin ? "Command center, providers, finance" : "Appointments, visits & earnings"}</span>
        </a>
      )}

      <section className="mt-8">
        <ProfileForm />
      </section>

      <section className="mt-8">
        <h2 className="h3">My consultations</h2>
        {consults.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No consultations yet. Find a doctor to get started.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {consults.map((c) => (
              <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium text-ink">{c.context || "Consultation"}</div>
                  <div className="text-xs text-muted">
                    {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString("en-IN") : "—"} · {c.mode}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[c.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {c.status.replace(/_/g, " ")}
                  </span>
                  {(c.status === "booked" || c.status === "in_progress") && (
                    <a href={`/consult/${c.id}`} className="btn-primary px-3 py-1.5 text-sm">Join</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {rxs.length > 0 && (
        <section className="mt-8">
          <h2 className="h3">Prescriptions</h2>
          <div className="mt-3 grid gap-3">
            {rxs.map((r) => (
              <div key={r.id} className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium text-ink">{r.diagnosis || "Prescription"}</div>
                  <div className="text-xs text-muted">By {r.doctorName} · valid until {r.validUntil}</div>
                </div>
                {r.pdfUrl ? <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-outline px-3 py-1.5 text-sm">View PDF</a> : null}
              </div>
            ))}
          </div>
        </section>
      )}

      {vitals.length > 0 && (
        <section className="mt-8">
          <h2 className="h3">Vital Checkups</h2>
          <div className="mt-3 grid gap-3">
            {vitals.map((v) => (
              <div key={v.id} className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium text-ink">
                    {v.visitedAt ? new Date(v.visitedAt).toLocaleDateString("en-IN") : "Visit"}
                    {v.escalated ? <span className="ml-2 rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-600">Needs attention</span> : null}
                  </div>
                  <div className="text-xs text-muted">
                    {[v.bpSystolic && `BP ${v.bpSystolic}/${v.bpDiastolic}`, v.spo2 && `SpO₂ ${v.spo2}%`, v.heartRate && `HR ${v.heartRate}`].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {v.reportPdfUrl ? <a href={v.reportPdfUrl} target="_blank" rel="noopener noreferrer" className="btn-outline px-3 py-1.5 text-sm">Report</a> : null}
              </div>
            ))}
          </div>
          <a href="/vitals" className="mt-3 inline-block text-sm font-medium text-primary">View trends →</a>
        </section>
      )}

      <DataRights />
    </div>
  );
}
