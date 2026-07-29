#!/usr/bin/env node
/**
 * Headless export for the store-screenshots editor (marketing frames only).
 * Usage: node scripts/export-bundle.mjs ipad [android-7] [android-10]
 */
import { spawn } from "node:child_process";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import JSZip from "jszip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.STORE_SCREENSHOTS_PORT ?? 3011);
const BASE = `http://127.0.0.1:${PORT}`;

const DEVICE_LABEL = {
  iphone: "iPhone",
  ipad: "iPad",
  android: "Android phone",
  "android-7": 'Android 7"',
  "android-10": 'Android 10"',
};

async function waitForServer(timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Editor did not start on ${BASE}`);
}

function startDevServer() {
  return spawn("pnpm", ["dev", "-p", String(PORT)], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(PORT) },
  });
}

async function exportDevice(page, device) {
  const platform = device === "iphone" || device === "ipad" ? "ios" : "android";
  await page.getByRole("tab", { name: platform === "ios" ? "iOS" : "Android" }).click();
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: DEVICE_LABEL[device] }).click();

  const downloadPromise = page.waitForEvent("download", { timeout: 180_000 });
  await page.getByRole("button", { name: /Export bundle/i }).click();
  const download = await downloadPromise;
  const zipPath = path.join(ROOT, ".export-tmp", `${device}.zip`);
  await mkdir(path.dirname(zipPath), { recursive: true });
  await download.saveAs(zipPath);
  return zipPath;
}

async function unzipToDir(zipPath, outDir) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const zip = await JSZip.loadAsync(await readFile(zipPath));
  for (const [name, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    const dest = path.join(outDir, name);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, await file.async("nodebuffer"));
  }
}

async function listExports(extractedRoot, device) {
  const platform = device === "iphone" || device === "ipad" ? "ios" : "android";
  const base = path.join(extractedRoot, platform, device);
  const sizes = await readdir(base).catch(() => []);
  const picked = [];
  for (const size of sizes) {
    const localeDir = path.join(base, size, "en");
    const files = (await readdir(localeDir).catch(() => [])).filter((f) => f.endsWith(".png"));
    files.sort();
    picked.push({ size, files: files.map((f) => path.join(localeDir, f)) });
  }
  return picked;
}

async function main() {
  const devices = process.argv.slice(2);
  if (!devices.length) {
    console.error("Usage: node scripts/export-bundle.mjs <device> [...]");
    process.exit(1);
  }

  const child = startDevServer();
  try {
    await waitForServer();
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    const tmpRoot = path.join(ROOT, ".export-tmp");
    await mkdir(tmpRoot, { recursive: true });

    for (const device of devices) {
      console.log(`==> Exporting ${device}`);
      const zipPath = await exportDevice(page, device);
      const extracted = path.join(tmpRoot, device);
      await unzipToDir(zipPath, extracted);
      const manifest = await listExports(extracted, device);
      const manifestPath = path.join(tmpRoot, `${device}-manifest.json`);
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`    ${manifest.length} size bucket(s) → ${manifestPath}`);
    }

    await browser.close();
  } finally {
    child.kill("SIGTERM");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
