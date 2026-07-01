import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// The legacy /pro dashboard is superseded by the dedicated Clinic and Care
// workspaces. Route providers to the smart entry point which sends them to the
// right portal (/clinic for doctors, /care for home-care) based on their role.
export default function ProRedirect() {
  redirect("/providers");
}
