import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { HAS_DB, db, schema } from "@/lib/db";
import VitalsForm from "@/components/VitalsForm";
import VitalsTrends, { type VitalPoint } from "@/components/VitalsTrends";
import VitalCheckupBooking from "@/components/VitalCheckupBooking";
import AnswerBlock from "@/components/AnswerBlock";
import ServiceHero from "@/components/ServiceHero";
import HowItWorks from "@/components/HowItWorks";
import { CalendarCheck, Stethoscope, FileText, LineChart } from "lucide-react";

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
      <ServiceHero
        emoji="❤️"
        title="Vital Checkup"
        subtitle="Capture your vitals at home, get an instant flagged report, and track your trends over time."
        badges={["Instant flagged report", "Verified nurse at home", "Trend tracking"]}
      />

      <div className="mt-8">
        <HowItWorks
          steps={[
            { Icon: CalendarCheck, title: "Book a slot" },
            { Icon: Stethoscope, title: "Vitals at home" },
            { Icon: FileText, title: "Instant report" },
            { Icon: LineChart, title: "Track trends" }
          ]}
        />
      </div>

      <div className="mt-8">
        <VitalCheckupBooking defaultName={user.name ?? ""} defaultPhone={user.phone?.replace(/^91/, "") ?? ""} city="Lucknow" />
      </div>

      <section className="mt-8">
        <h2 className="h3">Your trends</h2>
        <p className="mt-1 text-sm text-muted">Vitals your nurse records on each visit appear here over time.</p>
        <div className="mt-3">
          <VitalsTrends data={points} />
        </div>
      </section>

      <details className="mt-8">
        <summary className="cursor-pointer text-sm font-medium text-primary">Prefer to log a reading yourself? Open the self-entry form</summary>
        <div className="mt-3 max-w-md">
          <VitalsForm defaultName={user.name ?? ""} defaultPhone={user.phone?.replace(/^91/, "") ?? ""} />
        </div>
      </details>

      <details className="mt-10 text-sm">
        <summary className="cursor-pointer font-medium text-primary">More about Vital Checkup</summary>
        <div className="mt-3">
          <AnswerBlock
            question="What is a Hanuone Vital Checkup?"
            answer="A Hanuone Vital Checkup captures key vitals — blood pressure, heart rate, SpO₂, temperature, blood sugar, respiratory rate and weight — at home, instantly flags any out-of-range values, generates a downloadable PDF report, and tracks your trends over time. Abnormal results suggest an immediate teleconsult."
          />
        </div>
      </details>
    </div>
  );
}
