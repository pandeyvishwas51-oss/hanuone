#!/usr/bin/env node
/**
 * Generate branded site imagery with OpenAI gpt-image-1.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-images.mjs           # generate missing
 *   OPENAI_API_KEY=sk-... node scripts/generate-images.mjs --force   # regenerate all
 *   OPENAI_API_KEY=sk-... node scripts/generate-images.mjs hero-home  # one image by id
 *
 * Output: public/generated/<id>.png  (referenced via lib/images.ts)
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "generated");

// Supports either standard OpenAI or Azure OpenAI (services.ai.azure.com/openai/v1).
const KEY = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY;
const AZURE_ENDPOINT = (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/$/, "");
const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT || "gpt-image-2";
const IS_AZURE = !!AZURE_ENDPOINT;
if (!KEY) {
  console.error("✗ Set OPENAI_API_KEY (or AZURE_OPENAI_KEY + AZURE_OPENAI_ENDPOINT) first.");
  process.exit(1);
}
const API_URL = IS_AZURE ? `${AZURE_ENDPOINT}/images/generations` : "https://api.openai.com/v1/images/generations";
const MODEL = IS_AZURE ? AZURE_DEPLOYMENT : "gpt-image-1";

const force = process.argv.includes("--force");
const onlyId = process.argv.find((a) => !a.startsWith("-") && !a.endsWith(".mjs") && !a.includes("node"));

const manifest = JSON.parse(readFileSync(join(__dirname, "image-manifest.json"), "utf8"));
const baseStyle = manifest.style;
let images = manifest.images;
if (onlyId) images = images.filter((i) => i.id === onlyId);

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

async function generate(img) {
  const dest = join(OUT_DIR, `${img.id}.png`);
  if (existsSync(dest) && !force) {
    console.log(`• skip ${img.id} (exists)`);
    return;
  }
  const prompt = `${img.prompt}\n\nStyle: ${baseStyle}`;
  process.stdout.write(`… generating ${img.id} (${img.size}) `);
  const headers = IS_AZURE
    ? { "api-key": KEY, "Content-Type": "application/json" }
    : { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
  const res = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: MODEL, prompt, size: img.size, n: 1 })
  });
  if (!res.ok) {
    console.log("✗");
    console.error(`  ${res.status}: ${await res.text()}`);
    return;
  }
  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) {
    console.log("✗ no image data");
    return;
  }
  writeFileSync(dest, Buffer.from(b64, "base64"));
  console.log("✓");
}

console.log(`Generating ${images.length} image(s) → public/generated/`);
for (const img of images) {
  try {
    await generate(img);
  } catch (e) {
    console.error(`✗ ${img.id}: ${e.message}`);
  }
}
console.log("Done. Commit the PNGs in public/generated/ to ship them.");
