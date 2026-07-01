import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema, HAS_DB } from "@/lib/db";
import { getCurrentProfessional } from "@/lib/provider";
import VisitWorkspace from "@/components/provider/VisitWorkspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home visit", robots: { index: false } };

export default async function CareVisitPage({ params }: { params: { id: string } }) {
  const prof = await getCurrentProfessional();
  if (!prof) redirect(`/login?next=/care/visits/${params.id}`);
  if (!HAS_DB) notFound();

  const [visit] = await db().select().from(schema.serviceVisits).where(eq(schema.serviceVisits.id, params.id)).limit(1);
  if (!visit) notFound();
  if (visit.assignedProfessionalId !== prof.id) redirect("/care");

  return <VisitWorkspace visit={JSON.parse(JSON.stringify(visit))} />;
}
