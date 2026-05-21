export const dynamic = "force-dynamic";

import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export default async function AdminDoctorsPage() {
  const rows = await db()
    .select({
      id: schema.doctors.id,
      name: schema.doctors.name,
      slug: schema.doctors.slug,
      specialization: schema.doctors.specialization,
      locality: schema.doctors.locality,
      city: schema.doctors.city,
      rating: schema.doctors.rating,
      reviewCount: schema.doctors.reviewCount,
      verified: schema.doctors.verified,
      isActive: schema.doctors.isActive
    })
    .from(schema.doctors)
    .where(eq(schema.doctors.isActive, true))
    .orderBy(desc(schema.doctors.rating))
    .limit(500);
  return (
    <div>
      <h1 className="text-xl font-bold text-ink sm:text-2xl">Doctors directory</h1>
      <p className="mt-1 text-sm text-muted">Top {rows.length} doctors on the patient site.</p>
      <div className="mt-6 card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-bg/50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Specialty</th>
              <th className="px-4 py-3">Locality</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Reviews</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Profile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium text-ink">{r.name}</td>
                <td className="px-4 py-3">{r.specialization}</td>
                <td className="px-4 py-3">{r.locality}, {r.city}</td>
                <td className="px-4 py-3">{r.rating ? Number(r.rating).toFixed(1) : "-"}</td>
                <td className="px-4 py-3">{r.reviewCount}</td>
                <td className="px-4 py-3">{r.verified ? "Yes" : "No"}</td>
                <td className="px-4 py-3"><a href={`https://hanuone.vercel.app/doctors/${r.slug}`} target="_blank" rel="noopener" className="text-primary hover:underline">Open</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
