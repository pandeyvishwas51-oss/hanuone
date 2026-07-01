/** Branded HTML email templates for HanuONE (teal #01586C + orange #FE7D15). */

const SHELL = (inner: string) => `
<div style="background:#f4f6f7;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e6eef0">
    <div style="background:#01586C;padding:20px 24px">
      <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:.3px">Hanu<span style="color:#FE7D15">ONE</span></span>
      <div style="color:#bfe0e8;font-size:12px;margin-top:2px">Trusted Healthcare, Right at Home.</div>
    </div>
    <div style="padding:28px 24px;color:#0E2A33">${inner}</div>
    <div style="padding:16px 24px;background:#f8fafb;color:#5C6B73;font-size:11px;border-top:1px solid #eef2f3">
      You're receiving this because you have a HanuONE account. Questions? Reply to this email.
    </div>
  </div>
</div>`;

export function otpEmail(code: string, purpose: "signup" | "reset" | "login"): { subject: string; html: string } {
  const title =
    purpose === "reset" ? "Reset your password" : purpose === "login" ? "Your login code" : "Verify your email";
  const line =
    purpose === "reset"
      ? "Use this code to reset your HanuONE password."
      : purpose === "login"
        ? "Use this code to log in to HanuONE."
        : "Welcome to HanuONE! Use this code to verify your email and finish signing up.";
  return {
    subject: `${code} is your HanuONE ${purpose === "reset" ? "password reset" : "verification"} code`,
    html: SHELL(`
      <h2 style="margin:0 0 8px;font-size:18px">${title}</h2>
      <p style="margin:0 0 20px;color:#5C6B73;font-size:14px">${line}</p>
      <div style="text-align:center;margin:8px 0 20px">
        <span style="display:inline-block;background:#FFF2E6;color:#01586C;font-size:30px;font-weight:800;letter-spacing:8px;padding:14px 22px;border-radius:12px">${code}</span>
      </div>
      <p style="margin:0;color:#8A9AA1;font-size:12px">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
    `)
  };
}

export function welcomeEmail(name: string | null): { subject: string; html: string } {
  const hi = name ? `Hi ${name},` : "Hi there,";
  return {
    subject: "Welcome to HanuONE — your family's healthcare, all in one place 🩺",
    html: SHELL(`
      <h2 style="margin:0 0 8px;font-size:18px">${hi}</h2>
      <p style="margin:0 0 16px;color:#374a52;font-size:14px">
        Your HanuONE account is ready. Now you and your family can do all of this in one app:
      </p>
      <ul style="margin:0 0 20px;padding-left:18px;color:#374a52;font-size:14px;line-height:1.9">
        <li>Consult verified doctors on video or in clinic</li>
        <li>Book lab tests with home sample collection</li>
        <li>Order medicines to your door</li>
        <li>Home nursing, physiotherapy and Vital Checkups</li>
        <li>Ask Dr. Hanu, our AI health assistant, anytime</li>
      </ul>
      <div style="text-align:center;margin:8px 0">
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://hanuone.com"}/account" style="display:inline-block;background:#FE7D15;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px">Complete your profile</a>
      </div>
      <p style="margin:16px 0 0;color:#8A9AA1;font-size:12px">Tip: add your address and an emergency contact so home visits and bookings are faster.</p>
    `)
  };
}
