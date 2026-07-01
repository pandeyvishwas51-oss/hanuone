import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { HAS_DB, db, schema } from "@/lib/db";
import VideoRoom from "@/components/VideoRoom";
import PrescriptionPanel from "@/components/PrescriptionPanel";
import ConsultTranscript from "@/components/ConsultTranscript";
import ResumePayment from "@/components/ResumePayment";
import ConsultStatusActions from "@/components/ConsultStatusActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your consultation", robots: { index: false } };

export default async function ConsultPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/consult/${params.id}`);
  if (!HAS_DB) notFound();

  const [consult] = await db().select().from(schema.consultations).where(eq(schema.consultations.id, params.id)).limit(1);
  if (!consult) notFound();

  // Only the patient, the consulting provider, or an admin may join.
  const isOwner = consult.patientUserId === user.id;
  if (!isOwner && user.role !== "provider" && user.role !== "admin" && !user.isAdmin) {
    redirect("/account");
  }

  const [doctor] = consult.doctorId
    ? await db().select({ name: schema.doctors.name }).from(schema.doctors).where(eq(schema.doctors.id, consult.doctorId)).limit(1)
    : [{ name: "your doctor" }];

  const when = consult.scheduledAt ? new Date(consult.scheduledAt) : null;
  const room = consult.videoRoom || `ho-${consult.id.slice(0, 10)}`;
  const paid = consult.status !== "pending_payment";
  // Completed/cancelled consults are terminal — never show a joinable video room.
  const terminal = consult.status === "completed" || consult.status === "cancelled";
  const isProvider = user.role === "provider" || user.role === "admin" || user.isAdmin;

  return (
    <div className="container-page py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="h3">Consultation with {doctor?.name ?? "your doctor"}</h1>
          <p className="text-sm text-muted">
            {when ? when.toLocaleString("en-IN") : "Scheduled time"} · Status: {consult.status.replace(/_/g, " ")}
          </p>
        </div>
        <a href="/account" className="btn-outline">Back to my consults</a>
      </div>

      <div className="mt-5">
        {!paid ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-muted">This consultation is awaiting payment. Complete payment to unlock the video room.</p>
            {isOwner && (
              <ResumePayment consultationId={consult.id} feeInr={consult.feeInr ?? 400} name={user.name || consult.patientName} contact={consult.patientPhone} />
            )}
          </div>
        ) : terminal ? (
          <div className="card p-8 text-center">
            <p className="text-sm font-medium text-ink">
              {consult.status === "completed" ? "This consultation has ended." : "This consultation was cancelled."}
            </p>
            <p className="mt-1 text-sm text-muted">
              {consult.status === "completed"
                ? "Your prescription and summary are in your account."
                : "If this was a mistake, you can book a new consultation."}
            </p>
            <a href="/account" className="btn-primary mt-4 inline-block">Back to my consults</a>
          </div>
        ) : (
          <VideoRoom
            room={room}
            displayName={user.name || consult.patientName}
            scheduledAtISO={when ? when.toISOString() : null}
          />
        )}
      </div>

      {consult.context ? (
        <div className="card mt-4 p-5">
          <div className="label">Reason for consult</div>
          <p className="text-sm text-ink">{consult.context}</p>
        </div>
      ) : null}

      {isProvider && paid ? (
        <div className="mt-4 space-y-4">
          <PrescriptionPanel consultationId={consult.id} />
          <div className="card p-5">
            <div className="label">Consultation status</div>
            <p className="mb-3 text-xs text-muted">Mark complete once you&apos;ve finished — this sends the patient their wrap-up and unlocks follow-up.</p>
            <ConsultStatusActions consultationId={consult.id} status={consult.status} />
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <ConsultTranscript consultId={consult.id} />
      </div>
    </div>
  );
}
