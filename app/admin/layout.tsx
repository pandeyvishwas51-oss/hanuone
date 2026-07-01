import type { ReactNode } from "react";

/**
 * The legacy /admin pages don't use PortalShell, and PatientChrome omits its
 * <main> for /admin routes — so without this they render no main landmark.
 * Wrapping here gives screen readers / skip-links a single <main> on every
 * admin page (overview, leads, payouts, seo).
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <main>{children}</main>;
}
