import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import PayoutsBoard from "@/components/PayoutsBoard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payouts — Admin", robots: { index: false } };

export default async function AdminPayoutsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/payouts");
  if (!user.isAdmin && user.role !== "admin") redirect("/account");

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="h2">Payouts</h1>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin" className="rounded-lg border border-primary/20 px-3 py-1.5 text-primary hover:bg-primary/5">Overview</Link>
          <Link href="/admin/leads" className="rounded-lg border border-primary/20 px-3 py-1.5 text-primary hover:bg-primary/5">Leads</Link>
          <Link href="/admin/payouts" className="rounded-lg bg-primary px-3 py-1.5 font-medium text-white">Payouts</Link>
        </nav>
      </div>
      <p className="mt-1 text-sm text-muted">
        Commission split is computed automatically. Release transfers here. With Razorpay Route/X keys connected, releases settle to provider bank accounts automatically.
      </p>
      <div className="mt-6">
        <PayoutsBoard />
      </div>
    </div>
  );
}
