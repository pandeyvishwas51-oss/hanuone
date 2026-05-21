export const dynamic = "force-dynamic";

import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import ProfessionalsTable from "./ProfessionalsTable";

export default async function AdminProfessionalsPage() {
  const rows = await db()
    .select()
    .from(schema.professionals)
    .orderBy(desc(schema.professionals.createdAt))
    .limit(200);
  return (
    <div>
      <h1 className="text-xl font-bold text-ink sm:text-2xl">Professionals</h1>
      <p className="mt-1 text-sm text-muted">{rows.length} registered. Verify or reject below.</p>
      <ProfessionalsTable rows={rows.map((r) => ({
        id: r.id,
        name: r.fullName,
        email: r.email,
        phone: r.phone,
        role: r.role,
        specialization: r.specialization,
        locality: r.locality,
        status: r.status,
        aadhaarUrl: r.aadhaarUrl,
        certificateUrls: r.certificateUrls ?? [],
        createdAt: r.createdAt?.toISOString() ?? null
      }))} />
    </div>
  );
}
