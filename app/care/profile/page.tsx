import { getCurrentProfessional } from "@/lib/provider";
import ComingSoon from "@/components/portal/ComingSoon";
import BankAccountForm from "@/components/provider/BankAccountForm";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  verified: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-rose-100 text-rose-700",
  suspended: "bg-slate-200 text-slate-600"
};

export default async function CareProfile() {
  const prof = await getCurrentProfessional();
  if (!prof) return <ComingSoon title="My profile" blurb="Apply as a provider to see your profile here." cta={{ label: "Apply as a provider", href: "/providers/register" }} />;

  return (
    <div className="py-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{prof.fullName}</h1>
            <p className="text-sm capitalize text-slate-500">{prof.role}{prof.specialization ? ` · ${prof.specialization}` : ""}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[prof.status || "pending"]}`}>{prof.status}</span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Item label="Phone" value={prof.phone} />
          <Item label="City" value={prof.city} />
          <Item label="Pincode" value={prof.pincode} />
          <Item label="Experience" value={prof.experienceYears ? `${prof.experienceYears} yrs` : null} />
          <Item label="Gender" value={prof.gender} />
          <Item label="Day rate" value={prof.dailyRate ? `₹${prof.dailyRate}` : null} />
        </dl>
        {prof.services && prof.services.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Services</div>
            <div className="mt-1 flex flex-wrap gap-1.5">{prof.services.map((s) => <span key={s} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{s}</span>)}</div>
          </div>
        )}
        {prof.languages && prof.languages.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">Languages: {prof.languages.join(", ")}</p>
        )}
      </div>
      <div className="mt-4"><BankAccountForm /></div>

      {prof.status === "verified" && (
        <p className="mt-4 text-center text-xs text-slate-400">You are verified and visible for assignments. To update your details, contact HanuONE support.</p>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-700">{value || "—"}</dd>
    </div>
  );
}
