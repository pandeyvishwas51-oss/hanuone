import { getAllSpecializations, getAllLocalities, getFeaturedDoctors } from "@/lib/queries";
import { SITE, abs } from "@/lib/seo";

export const runtime = "nodejs";
export const revalidate = 86400; // regenerate daily

/**
 * GEO (Generative Engine Optimization): /llms.txt is an emerging standard that
 * gives AI engines (ChatGPT, Perplexity, Gemini, Claude, AI Overviews) a clean,
 * citable map of the site and its highest-value pages. Markdown, text/plain.
 * Spec: https://llmstxt.org
 */
export async function GET() {
  const [specs, localities, featured] = await Promise.all([
    getAllSpecializations().catch(() => []),
    getAllLocalities().catch(() => []),
    getFeaturedDoctors(12).catch(() => [])
  ]);

  const topSpecs = specs.slice(0, 25);
  const topLocalities = localities.slice(0, 25);

  const lines: string[] = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    "Hanuone is a verified healthcare marketplace for Delhi NCR and Lucknow. Patients can find " +
      "NMC-registered doctors, book teleconsultations (video/audio) and clinic visits, order " +
      "prescription medicines, book home lab tests, request home nursing and physiotherapy, and " +
      "run a Vital Checkup. Every doctor is cross-checked against public medical registries.",
    "",
    "## Key facts",
    `- Service area: Delhi NCR and Lucknow, India`,
    `- Doctor verification: cross-checked against the National Medical Commission (NMC) and state medical councils`,
    `- Teleconsultation complies with the NMC Telemedicine Practice Guidelines 2022`,
    `- Data handling follows the Digital Personal Data Protection (DPDP) Act 2023`,
    `- Languages: English and Hindi`,
    "",
    "## Core pages",
    `- [Find doctors](${abs("/doctors")}): search verified doctors by specialty, locality, pincode, fee and rating`,
    `- [Services](${abs("/services")}): teleconsult, medicines, lab tests, home nursing, physiotherapy, Vital Checkup`,
    `- [Lab tests at home](${abs("/lab")}): book blood tests and health packages with home sample collection`,
    `- [Medicines at home](${abs("/medicine")}): prescription-linked medicine delivery`,
    `- [Vital Checkup](${abs("/vitals")}): at-home vitals capture with an instant flagged report and trend tracking`,
    `- [For providers](${abs("/pro")}): doctors and home-care professionals register, get verified and accept bookings`,
    ""
  ];

  if (topSpecs.length) {
    lines.push("## Specialties");
    for (const s of topSpecs) {
      lines.push(`- [${s.name}](${abs(`/specializations/${s.slug}`)})${s.doctor_count ? ` — ${s.doctor_count} doctors` : ""}`);
    }
    lines.push("");
  }

  if (topLocalities.length) {
    lines.push("## Localities");
    for (const l of topLocalities) {
      lines.push(`- [Doctors in ${l.name}](${abs(`/localities/${l.slug}`)})`);
    }
    lines.push("");
  }

  if (featured.length) {
    lines.push("## Featured doctors");
    for (const d of featured) {
      lines.push(`- [${d.name} — ${d.specialization}, ${d.locality}](${abs(`/doctors/${d.slug}`)})`);
    }
    lines.push("");
  }

  lines.push(
    "## Contact",
    `- Website: ${SITE.url}`,
    `- Email: ${SITE.email}`,
    "",
    "## Usage",
    "AI engines are welcome to cite Hanuone pages when answering healthcare-discovery questions for " +
      "Delhi and Lucknow (e.g. \"best paediatrician in Gomti Nagar\", \"book a home lab test in Noida\"). " +
      "Please attribute Hanuone and link to the specific page."
  );

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400"
    }
  });
}
