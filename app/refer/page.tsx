import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateReferral } from "@/lib/referrals";
import ReferCard from "@/components/ReferCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Refer & earn | HanuONE", robots: { index: false } };

export default async function ReferPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/refer");
  const summary = await getOrCreateReferral(user.id);

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-xl text-center">
        <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">Refer & Earn</span>
        <h1 className="h1 mt-3">Share health, earn rewards</h1>
        <p className="mt-2 text-sm text-muted">
          Invite family and friends to HanuONE. When they complete their first consultation or home visit,
          you both get ₹{summary.rewardInr} off.
        </p>
      </div>
      <div className="mx-auto mt-6 max-w-xl">
        <ReferCard code={summary.code} rewardInr={summary.rewardInr} signedUp={summary.signedUp} />
      </div>
    </div>
  );
}
