import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentProfessional, isDoctorRole, isHomeCareRole } from "@/lib/provider";

export const dynamic = "force-dynamic";
export const metadata = { title: "Provider dashboard", robots: { index: false } };

export default async function ProvidersHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/providers");

  const prof = await getCurrentProfessional();

  // No application yet -> invite them to apply.
  if (!prof) {
    return (
      <div className="container-page py-12">
        <div className="card mx-auto max-w-lg p-8 text-center">
          <h1 className="h2">Join HanuONE as a provider</h1>
          <p className="mt-2 text-sm text-muted">You don&apos;t have a provider profile yet. Apply as a doctor, nurse, physiotherapist or caregiver and start receiving patients near you.</p>
          <Link href="/providers/register" className="btn-primary mt-5 inline-block">Apply to join</Link>
        </div>
      </div>
    );
  }

  // Application not yet approved.
  if (prof.status !== "verified") {
    const pending = prof.status === "pending";
    return (
      <div className="container-page py-12">
        <div className="card mx-auto max-w-lg p-8 text-center">
          <div className={`mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full ${pending ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
            <span className="text-xl">{pending ? "⏳" : "⚠️"}</span>
          </div>
          <h1 className="h3">{pending ? "Application under review" : prof.status === "rejected" ? "Application not approved" : "Account suspended"}</h1>
          <p className="mt-2 text-sm text-muted">
            {pending
              ? "Our team is verifying your details and credentials. You'll get an email the moment you're approved, and your dashboard will unlock here."
              : prof.rejectionReason || "Please contact support for details."}
          </p>
          <p className="mt-4 text-xs text-muted">Hi {prof.fullName} · {prof.role} · {prof.city}</p>
        </div>
      </div>
    );
  }

  // Verified -> route to the right standalone portal.
  if (isDoctorRole(prof.role)) redirect("/clinic");
  if (isHomeCareRole(prof.role)) redirect("/care");

  // Agency or other -> minimal view.
  return (
    <div className="container-page py-12">
      <div className="card mx-auto max-w-lg p-8 text-center">
        <h1 className="h3">Welcome, {prof.fullName}</h1>
        <p className="mt-2 text-sm text-muted">Your {prof.role} account is verified. A dedicated dashboard for your role is coming soon.</p>
      </div>
    </div>
  );
}
