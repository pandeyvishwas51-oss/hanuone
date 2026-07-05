import Link from "next/link";
import { redirect } from "next/navigation";
import { UserCircle, Building2, CalendarRange, CreditCard, Stethoscope, MapPin, Phone, BadgeCheck, Languages } from "lucide-react";
import { getCurrentProfessional, isHomeCareRole } from "@/lib/provider";
import { PageHeader, SectionCard, Pill } from "@/components/portal/ui";
import ComingSoon from "@/components/portal/ComingSoon";
import BankAccountForm from "@/components/provider/BankAccountForm";

export const dynamic = "force-dynamic";

const PLANS = [
  { name: "Trial", price: "Free", features: ["AI Scribe (20 notes)", "DocAssist", "1 doctor"], current: true },
  { name: "Solo", price: "₹1,499/mo", features: ["Unlimited AI Scribe", "DocAssist + EMR", "Billing & analytics"] },
  { name: "Clinic", price: "₹3,999/mo", features: ["Everything in Solo", "Up to 5 doctors", "Front-desk + ABHA/ABDM"] }
];

export default async function ClinicSettings() {
  const prof = await getCurrentProfessional();
  if (prof && isHomeCareRole(prof.role)) redirect("/care");
  if (!prof) return <ComingSoon title="Settings" blurb="Connect a verified doctor profile to manage settings." cta={{ label: "Set up doctor profile", href: "/providers/register?role=doctor" }} />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your personal profile, clinic and subscription — all in one place." />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Personal */}
        <SectionCard title="Personal profile">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#01586C] to-[#0a7d96] text-white"><Stethoscope size={20} /></span>
            <div><div className="flex items-center gap-2 font-bold text-slate-800">Dr. {prof.fullName} {prof.status === "verified" && <BadgeCheck size={15} className="text-emerald-500" />}</div><div className="text-xs text-slate-400 capitalize">{prof.specialization || prof.role}</div></div>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <Row icon={<Phone size={14} />} label="Phone" value={prof.phone} />
            <Row icon={<MapPin size={14} />} label="City" value={prof.city} />
            <Row icon={<Stethoscope size={14} />} label="Experience" value={prof.experienceYears ? `${prof.experienceYears} years` : null} />
            <Row icon={<Languages size={14} />} label="Languages" value={prof.languages?.join(", ") || null} />
          </dl>
        </SectionCard>

        {/* Clinic */}
        <SectionCard title="Clinic & practice">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Building2 size={20} /></span>
            <div><div className="font-bold text-slate-800">{prof.city || "Lucknow"} practice</div><div className="text-xs text-slate-400">{prof.pincode ? `Pincode ${prof.pincode}` : "Add your clinic address"}</div></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/clinic/appointments" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><CalendarRange size={15} className="text-[#01586C]" /> Availability</Link>
            <Link href="/clinic/billing" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><CreditCard size={15} className="text-emerald-600" /> Invoices</Link>
            <Link href="/clinic/patients" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><UserCircle size={15} className="text-[#0a7d96]" /> Patient records</Link>
            <Link href="/clinic/analytics" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Building2 size={15} className="text-orange-600" /> Practice insights</Link>
          </div>
          <p className="mt-3 text-xs text-slate-400">Edit clinic profile, prescription branding and staff roles — self-service editing rolls out with multi-doctor clinics.</p>
        </SectionCard>

        {/* Payout account */}
        <BankAccountForm />

        {/* Subscription */}
        <div className="lg:col-span-2">
          <SectionCard title="Subscription" action={<Pill tone="green">Trial active</Pill>}>
            <div className="grid gap-3 sm:grid-cols-3">
              {PLANS.map((p) => (
                <div key={p.name} className={`rounded-2xl border p-4 ${p.current ? "border-[#01586C] ring-1 ring-[#01586C]/20 bg-[#01586C]/[0.03]" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between"><span className="font-bold text-slate-800">{p.name}</span>{p.current && <Pill tone="green">current</Pill>}</div>
                  <div className="mt-1 text-xl font-bold text-[#01586C]">{p.price}</div>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">{p.features.map((f) => <li key={f}>• {f}</li>)}</ul>
                  {!p.current && <button disabled className="mt-3 w-full rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400">Upgrade (soon)</button>}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">Razorpay subscription billing is wired and activates at launch.</p>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
      <dt className="flex items-center gap-1.5 text-slate-400">{icon} {label}</dt>
      <dd className="font-medium text-slate-700">{value || "—"}</dd>
    </div>
  );
}
