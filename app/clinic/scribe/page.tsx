import { redirect } from "next/navigation";
import { getCurrentProfessional, isHomeCareRole } from "@/lib/provider";
import { SCRIBE_LIVE } from "@/lib/scribe";
import ScribeWorkspace from "@/components/clinic/ScribeWorkspace";
import ComingSoon from "@/components/portal/ComingSoon";

export const dynamic = "force-dynamic";

export default async function ClinicScribe() {
  const prof = await getCurrentProfessional();
  if (prof && isHomeCareRole(prof.role)) redirect("/care");
  if (!SCRIBE_LIVE) {
    return <ComingSoon title="Ambient AI Scribe" phase="Configure AI key" blurb="The scribe needs the HanuONE AI key to be set. Once configured, just talk and it writes the note." />;
  }
  return <ScribeWorkspace />;
}
