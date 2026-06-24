import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { HAS_DB, db, schema } from "@/lib/db";
import VitalsForm from "@/components/VitalsForm";
import VitalsTrends, { type VitalPoint } from "@/components/VitalsTrends";
import AnswerBlock from "@/components/AnswerBlock";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Vital Checkup — at-home vitals with instant report | Hanuone",
  description: "Capture BP, heart rate, SpO₂, blood sugar and more at home. Get an instant flagged report and track trends over time with Hanuone Vital Checkup."
};

export default async function VitalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/vitals");

  let visits: typeof schema.vitalVisits.$inferSelect[] = [];
  if (HAS_DB) {
    visits = await db().select().from(schema.vitalVisits).where(eq(schema.vitalVisits.patientUserId, user.id)).orderBy(desc(schema.vitalVisits.visitedAt)).limit(30);
  }

  const points: VitalPoint[] = [...visits]
    .reverse()
    .map((v) => ({
      date: v.visitedAt ? new Date(v.visitedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "",
      bp: v.bpSystolic,
      heartRate: v.heartRate,
      spo2: v.spo2,
      sugar: v.randomBloodSugar
    }));

  return (
    <div className="container-page py-8">
      <h1 className="h2">Vital Checkup</h1>
      <p className="mt-1 text-sm text-muted">Your USP wellness layer — capture vitals, get an instant flagged report, track trends.</p>

      <div className="mt-4">
        <AnswerBlock
          question="What is a Hanuone Vital Checkup?"
          answer="A Hanuone Vital Checkup captures key vitals — blood pressure, heart rate, SpO₂, temperature, blood sugar, respiratory rate and weight — at home, instantly flags any out-of-range values, generates a downloadable PDF report, and tracks your trends over time. Abnormal results suggest an immediate teleconsult."
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[400px,1fr]">
        <VitalsForm defaultName={user.name ?? ""} defaultPhone={user.phone?.replace(/^91/, "") ?? ""} />
        <div>
          <h2 className="h3">Your trends</h2>
          <div className="mt-3">
            <VitalsTrends data={points} />
          </div>
        </div>
      </div>
    </div>
  );
}
