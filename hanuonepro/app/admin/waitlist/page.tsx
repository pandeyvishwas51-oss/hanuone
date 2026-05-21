export const dynamic = "force-dynamic";

import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export default async function AdminWaitlistPage() {
  const rows = await db()
    .select()
    .from(schema.waitlist)
    .orderBy(desc(schema.waitlist.createdAt))
    .limit(500);
  return (
    <div>
      <h1 className="text-xl font-bold text-ink sm:text-2xl">Waitlist signups</h1>
      <p className="mt-1 text-sm text-muted">{rows.length} registrations from the patient site.</p>
      <div className="mt-6 card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-bg/50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Interest</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3"><a href={`mailto:${r.email ?? ""}`} className="text-primary hover:underline">{r.email || "-"}</a></td>
                <td className="px-4 py-3"><a href={`https://wa.me/${(r.whatsapp ?? "").replace(/\D/g, "")}`} target="_blank" rel="noopener" className="text-primary hover:underline">{r.whatsapp || "-"}</a></td>
                <td className="px-4 py-3">{r.cityOfResidence || "-"}</td>
                <td className="px-4 py-3 text-xs">{r.interest || "-"}</td>
                <td className="px-4 py-3 text-xs text-muted">{r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN") : "-"}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">No signups yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
