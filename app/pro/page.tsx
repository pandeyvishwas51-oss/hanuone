import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SlotPublisher from "@/components/SlotPublisher";

export const dynamic = "force-dynamic";
export const metadata = { title: "Provider dashboard", robots: { index: false } };

export default async function ProDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/pro");
  if (user.role !== "provider" && user.role !== "admin" && !user.isAdmin) redirect("/account");

  return (
    <div className="container-page py-8">
      <h1 className="h2">Provider dashboard</h1>
      <p className="mt-1 text-sm text-muted">Publish your consultation slots so patients can book and pay.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SlotPublisher />
        <div className="card p-6">
          <h2 className="h3">Getting started</h2>
          <ol className="mt-3 space-y-2 text-sm text-muted">
            <li>1. Find your profile slug on your <a className="text-primary" href="/doctors">doctor page</a> (the part after /doctors/).</li>
            <li>2. Publish slots for the days you're available.</li>
            <li>3. Patients book + pay; you'll see them in your consultations.</li>
            <li>4. Join the video room and issue the e-prescription from there.</li>
          </ol>
          <p className="mt-4 text-xs text-muted">Full earnings + bookings management is being migrated here from the provider portal.</p>
        </div>
      </div>
    </div>
  );
}
