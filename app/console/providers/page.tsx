import ProfessionalApprovals from "@/components/ProfessionalApprovals";
import { PageHeader } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default function ConsoleProviders() {
  return (
    <div>
      <PageHeader title="Provider approvals" subtitle="Verify a provider to unlock their Clinic or Care workspace. Suspend or reject to revoke access." />
      <ProfessionalApprovals />
    </div>
  );
}
