import { permanentRedirect } from "next/navigation";

export const dynamic = "force-static";

/**
 * /join was the old waitlist page. Registration now happens on HanuonePro.
 * Permanently redirect anyone landing here.
 */
export default function JoinPage() {
  permanentRedirect("https://hanuonepro.vercel.app/register");
}
