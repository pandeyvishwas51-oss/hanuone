import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentProfessional, getProviderNote } from "@/lib/provider";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Patient note", robots: { index: false } };

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="border-t border-slate-100 py-3 first:border-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{value}</div>
    </div>
  );
}

export default async function NoteDetail({ params }: { params: { id: string } }) {
  const prof = await getCurrentProfessional();
  if (!prof) redirect(`/login?next=/clinic/patients/${params.id}`);
  const data = await getProviderNote(prof.id, params.id);
  if (!data) notFound();
  const { note, rx } = data;

  return (
    <div className="py-6">
      <Link href="/clinic/patients" className="text-sm text-[#01586C] print:hidden">← All records</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{note.patientName}</h1>
          <p className="text-sm text-slate-500">{note.patientAge ? `${note.patientAge}y` : ""}{note.patientSex ? ` · ${note.patientSex}` : ""}{note.patientPhone ? ` · ${note.patientPhone}` : ""} · {note.createdAt ? new Date(note.createdAt).toLocaleString("en-IN") : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          {note.signed && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Signed</span>}
          <PrintButton />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-800">Clinical note</h2>
          <div className="mt-2">
            <Row label="Chief complaint" value={note.chiefComplaint} />
            <Row label="History" value={note.hpi} />
            <Row label="Examination" value={note.examination} />
            <Row label="Assessment" value={note.assessment} />
            <Row label="Diagnosis" value={note.diagnosis} />
            <Row label="Investigations" value={note.investigations} />
            <Row label="Advice" value={note.advice} />
            <Row label="Follow-up" value={note.followUp} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-800">Prescription</h2>
            {rx.length === 0 ? <p className="mt-2 text-sm text-slate-400">No medicines prescribed.</p> : (
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                {rx.map((m) => <li key={m.id}><b>{m.drugName}</b> {m.dose} {m.frequency && `· ${m.frequency}`} {m.duration && `· ${m.duration}`} {m.instructions && <span className="text-slate-500">({m.instructions})</span>}</li>)}
              </ol>
            )}
          </div>
          {note.redFlags && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-rose-600">Red flags</div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-rose-700">{note.redFlags}</p>
            </div>
          )}
          {note.patientSummary && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patient summary</div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{note.patientSummary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
