import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import OnboardingLeads from "@/components/OnboardingLeads";

export const dynamic = "force-dynamic";
export const metadata = { title: "Onboarding leads — Admin", robots: { index: false } };

export default async function AdminLeadsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/leads");
  if (!user.isAdmin && user.role !== "admin") redirect("/account");

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h2">Provider onboarding</h1>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin" className="rounded-lg border border-primary/20 px-3 py-1.5 text-primary hover:bg-primary/5">Overview</Link>
          <Link href="/admin/leads" className="rounded-lg bg-primary px-3 py-1.5 font-medium text-white">Leads</Link>
          <Link href="/admin/seo" className="rounded-lg border border-primary/20 px-3 py-1.5 text-primary hover:bg-primary/5">SEO/AEO/GEO</Link>
        </nav>
      </div>
      <p className="mt-1 text-sm text-muted">
        Scraped doctors and nurses land here as leads. Ops calls each one, takes consent, collects documents,
        verifies against the official registry, then marks them onboarded. Nothing here is shown to patients until verified.
      </p>
      <div className="mt-6">
        <OnboardingLeads />
      </div>
    </div>
  );
}
