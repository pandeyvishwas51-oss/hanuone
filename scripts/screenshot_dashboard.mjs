// Login as the demo doctor and screenshot every dashboard route, both desktop
// and mobile, so we can preview the experience without manually logging in.
//
// Usage:  node scripts/screenshot_dashboard.mjs
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const BASE = "https://hanuonepro.vercel.app";
const EMAIL = "demo-doctor@hanuone.in";
const PASSWORD = "DemoDoctor!2026";
const OUT_DIR = join(process.cwd(), "screenshots");

mkdirSync(OUT_DIR, { recursive: true });

const ROUTES = [
  { path: "/dashboard",                file: "01-overview" },
  { path: "/dashboard/bookings",       file: "02-bookings" },
  { path: "/dashboard/availability",   file: "03-availability" },
  { path: "/dashboard/earnings",       file: "04-earnings" },
  { path: "/dashboard/profile",        file: "05-profile" }
];

async function shoot(viewport, suffix) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await context.newPage();

  // Login
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL(`${BASE}/dashboard`, { timeout: 20000 }).catch(() => {}),
    page.click('button:has-text("Login")')
  ]);

  for (const r of ROUTES) {
    await page.goto(`${BASE}${r.path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    const file = join(OUT_DIR, `${r.file}-${suffix}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`  ${suffix}  ${r.path}  ->  ${file}`);
  }

  await browser.close();
}

console.log("Desktop screenshots (1440 x 900)");
await shoot({ width: 1440, height: 900 }, "desktop");
console.log("Mobile screenshots (390 x 844, iPhone 14)");
await shoot({ width: 390, height: 844 }, "mobile");
console.log("Done. Folder:", OUT_DIR);
