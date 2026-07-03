import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { HAS_DB, db, schema } from "@/lib/db";
import LogoutButton from "@/components/LogoutButton";
import DataRights from "@/components/DataRights";
import ProfileForm from "@/components/ProfileForm";
import RateDoctor from "@/components/RateDoctor";

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
  let labs: typeof schema.labOrders.$inferSelect[] = [];
  let meds: typeof schema.medicineOrders.$inferSelect[] = [];
  let visits: typeof schema.serviceVisits.$inferSelect[] = [];

  if (HAS_DB) {
    [consults, rxs, vitals, labs, meds, visits] = await Promise.all([
      db().select().from(schema.consultations).where(eq(schema.consultations.patientUserId, user.id)).orderBy(desc(schema.consultations.createdAt)).limit(20),
      db().select().from(schema.prescriptions).where(eq(schema.prescriptions.patientUserId, user.id)).orderBy(desc(schema.prescriptions.createdAt)).limit(20),
      db().select().from(schema.vitalVisits).where(eq(schema.vitalVisits.patientUserId, user.id)).orderBy(desc(schema.vitalVisits.visitedAt)).limit(20),
      db().select().from(schema.labOrders).where(eq(schema.labOrders.patientUserId, user.id)).orderBy(desc(schema.labOrders.createdAt)).limit(20),
      db().select().from(schema.medicineOrders).where(eq(schema.medicineOrders.patientUserId, user.id)).orderBy(desc(schema.medicineOrders.createdAt)).limit(20),
      db().select().from(schema.serviceVisits).where(eq(schema.serviceVisits.patientUserId, user.id)).orderBy(desc(schema.serviceVisits.createdAt)).limit(20)
    ]);
  }

  // Live delivery tracking: who is bringing each medicine order + their status.
  // Keyed by medicineOrderId so the card can show the rider once assigned.
  const delivery = new Map<string, typeof schema.deliveryAssignments.$inferSelect>();
  if (HAS_DB && meds.length) {
    const rows = await db().select().from(schema.deliveryAssignments)
      .where(inArray(schema.deliveryAssignments.medicineOrderId, meds.map((m) => m.id)));
    for (const r of rows) if (r.medicineOrderId) delivery.set(r.medicineOrderId, r);
  }

  const upcoming = consults.filter((c) => c.status === "booked" || c.status === "in_progress").length;

  return (
    <div className="container-page py-8">
      {/* Welcome hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#01586C] via-[#0a7d96] to-[#0e8fa8] p-6 text-white shadow-lg sm:p-7">
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
              <div key={c.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
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
                {c.status === "completed" && c.doctorId && (
                  <div className="mt-2 border-t border-line pt-2">
                    <RateDoctor doctorId={c.doctorId} consultationId={c.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {rxs.length > 0 && (
        <section className="mt-8">
          <h2 className="h3">Prescriptions</h2>
          <div className="mt-3 grid gap-3">
            {rxs.map((r) => {
              let meds: { name?: string; dosage?: string; frequency?: string; duration?: string }[] = [];
              try { meds = JSON.parse(r.medications || "[]"); } catch { /* keep [] */ }
              return (
                <div key={r.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-ink">{r.diagnosis || "Prescription"}</div>
                      <div className="text-xs text-muted">By {r.doctorName} · valid until {r.validUntil}</div>
                    </div>
                    {r.pdfUrl ? <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-outline px-3 py-1.5 text-sm">View PDF</a> : null}
                  </div>
                  {meds.length > 0 && (
                    <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                      {meds.map((m, i) => (
                        <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                          <span className="font-semibold text-ink">💊 {m.name}</span>
                          {m.dosage && <span className="text-muted">{m.dosage}</span>}
                          {m.frequency && <span className="text-muted">· {m.frequency}</span>}
                          {m.duration && <span className="text-muted">· {m.duration}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {r.instructions && <p className="mt-2 text-xs italic text-muted">{r.instructions}</p>}
                </div>
              );
            })}
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

      {labs.length > 0 && (
        <section className="mt-8">
          <h2 className="h3">Lab tests</h2>
          <div className="mt-3 grid gap-3">
            {labs.map((l) => (
              <div key={l.id} className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <div className="font-medium text-ink">{l.testName}</div>
                  <div className="text-xs text-muted">
                    {[l.collectionType === "walkin" ? "Walk-in" : "Home collection", l.slotDate, l.slotTime].filter(Boolean).join(" · ")} · <span className="capitalize">{l.status.replace(/_/g, " ")}</span>
                  </div>
                </div>
                {l.reportUrl ? <a href={l.reportUrl} target="_blank" rel="noopener noreferrer" className="btn-outline px-3 py-1.5 text-sm">Report</a> : null}
              </div>
            ))}
          </div>
        </section>
      )}

      {meds.length > 0 && (
        <section className="mt-8">
          <h2 className="h3">Medicine orders</h2>
          <div className="mt-3 grid gap-3">
            {meds.map((m) => {
              let items: { name?: string; qty?: number }[] = [];
              try { items = JSON.parse(m.items || "[]"); } catch { /* keep [] */ }
              const names = items.map((it) => it.name).filter(Boolean) as string[];
              const summary = names.length ? names.slice(0, 3).join(", ") + (names.length > 3 ? ` +${names.length - 3} more` : "") : "Prescription order";
              const d = delivery.get(m.id);
              const outForDelivery = d?.status === "out_for_delivery";
              return (
                <div key={m.id} className="card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-ink">{summary}</div>
                      <div className="text-xs text-muted"><span className="capitalize">{m.status}</span>{m.amountInr ? ` · ₹${m.amountInr}` : ""}</div>
                    </div>
                    {d?.status && (
                      <span className={`flex-none rounded-full px-2.5 py-1 text-xs font-medium capitalize ${outForDelivery ? "bg-sky-50 text-sky-700" : d.status === "delivered" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {d.status.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  {d?.deliveryPersonName && d.status !== "delivered" && d.status !== "cancelled" && (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-primary/5 px-3 py-2 ring-1 ring-primary/10">
                      <div className="min-w-0 text-xs">
                        <div className="font-medium text-ink">{outForDelivery ? "Out for delivery" : "Delivery partner"}: {d.deliveryPersonName}</div>
                        {d.deliveryPersonPhone && <div className="text-muted">{d.deliveryPersonPhone}</div>}
                      </div>
                      {d.deliveryPersonPhone && (
                        <a href={`tel:${d.deliveryPersonPhone}`} className="flex-none rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Call</a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {visits.length > 0 && (
        <section className="mt-8">
          <h2 className="h3">Home visits</h2>
          <div className="mt-3 grid gap-3">
            {visits.map((v) => {
              const active = ["assigned", "on_the_way", "arrived", "in_progress"].includes(v.status);
              const label = v.serviceName || v.serviceType?.replace(/_/g, " ") || "Home visit";
              return (
                <div key={v.id} className="card flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="truncate font-medium capitalize text-ink">{label}</div>
                    <div className="text-xs text-muted">
                      <span className="capitalize">{v.status.replace(/_/g, " ")}</span>
                      {v.scheduledAt ? ` · ${new Date(v.scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}` : ""}
                      {v.feeInr ? ` · ₹${v.feeInr}` : ""}
                    </div>
                  </div>
                  {active && (
                    <a href={`/track/${v.id}`} className="btn-primary flex-none px-3 py-1.5 text-sm">Track live</a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <DataRights />
    </div>
  );
}
