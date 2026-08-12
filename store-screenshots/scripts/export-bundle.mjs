#!/usr/bin/env node
/**
 * Headless export for the store-screenshots editor (marketing frames only).
 * Usage: node scripts/export-bundle.mjs [--output-dir /private/tmp/where-ip-export] ipad [android-7]
 */
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import {
  copyFile,
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import JSZip from "jszip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.STORE_SCREENSHOTS_PORT ?? 3011);
const BASE = `http://127.0.0.1:${PORT}`;
const MAX_ZIP_BYTES = 64 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 500;
const MAX_ENTRY_BYTES = 16 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 256 * 1024 * 1024;

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
  const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  // Inherit stdout/stderr so the child cannot block on unread pipe buffers.
  return spawn(packageManager, ["dev", "-H", "127.0.0.1", "-p", String(PORT)], {
    cwd: ROOT,
    stdio: ["ignore", "inherit", "inherit"],
    detached: process.platform !== "win32",
    env: { ...process.env, PORT: String(PORT) },
  });
}

async function extractZipEntry(file, destination, remainingBytes) {
  let bytes = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.byteLength;
      if (bytes > MAX_ENTRY_BYTES || bytes > remainingBytes) {
        callback(new Error("Export archive expands beyond the configured limits"));
        return;
      }
      callback(null, chunk);
    },
  });
  const temp = `${destination}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await pipeline(
      file.nodeStream("nodebuffer"),
      limiter,
      createWriteStream(temp, { flags: "wx" }),
    );
    await rename(temp, destination);
    return bytes;
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

function stopDevServer(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
    });
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

async function exportDevice(page, device, tmpRoot) {
  const platform = device === "iphone" || device === "ipad" ? "ios" : "android";
  await page.getByRole("tab", { name: platform === "ios" ? "iOS" : "Android" }).click();
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: DEVICE_LABEL[device] }).click();

  const downloadPromise = page.waitForEvent("download", { timeout: 180_000 });
  await page.getByRole("button", { name: /Export bundle/i }).click();
  const download = await downloadPromise;
  const zipPath = path.join(tmpRoot, `${device}.zip`);
  await mkdir(path.dirname(zipPath), { recursive: true });
  await download.saveAs(zipPath);
  return zipPath;
}

function parseArguments(args) {
  const devices = [];
  let outputDir;
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--output-dir") {
      outputDir = args[index + 1];
      if (!outputDir) throw new Error("--output-dir requires a directory");
      index += 1;
    } else {
      devices.push(value);
    }
  }
  return { devices, outputDir };
}

async function assertExternalOutputDirectory(outputRoot) {
  const repositoryRoot = await realpath(ROOT);
  let candidate = outputRoot;
  while (true) {
    try {
      const resolved = await realpath(candidate);
      if (
        resolved === repositoryRoot ||
        resolved.startsWith(`${repositoryRoot}${path.sep}`)
      ) {
        throw new Error("--output-dir must resolve outside the repository");
      }
      return;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const parent = path.dirname(candidate);
      if (parent === candidate) {
        throw new Error("--output-dir has no usable parent directory");
      }
      candidate = parent;
    }
  }
}

async function unzipToDir(zipPath, outDir) {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const zipStat = await stat(zipPath);
  if (zipStat.size > MAX_ZIP_BYTES) {
    throw new Error("Export archive exceeds the maximum size");
  }
  const zipBytes = await readFile(zipPath);
  if (zipBytes.byteLength > MAX_ZIP_BYTES) {
    throw new Error("Export archive exceeds the maximum size");
  }
  const zip = await JSZip.loadAsync(zipBytes);
  const entries = Object.entries(zip.files);
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new Error("Export archive contains too many entries");
  }
  const resolvedRoot = path.resolve(outDir);
  let extractedBytes = 0;
  for (const [name, file] of entries) {
    if (file.dir) continue;
    const normalizedName = name.replaceAll("\\", "/");
    const segments = normalizedName.split("/");
    if (
      !normalizedName ||
      normalizedName.includes("\u0000") ||
      normalizedName.startsWith("/") ||
      /^[A-Za-z]:/.test(normalizedName) ||
      segments.some((segment) => !segment || segment === "." || segment === "..")
    ) {
      throw new Error("Export archive contains an unsafe entry name");
    }
    const dest = path.resolve(outDir, ...normalizedName.split("/"));
    if (dest !== resolvedRoot && !dest.startsWith(`${resolvedRoot}${path.sep}`)) {
      throw new Error("Export archive entry escapes extraction directory");
    }
    await mkdir(path.dirname(dest), { recursive: true });
    const bytes = await extractZipEntry(file, dest, MAX_EXTRACTED_BYTES - extractedBytes);
    extractedBytes += bytes;
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
    picked.push({
      size,
      files: files.map((f) => path.relative(extractedRoot, path.join(localeDir, f))),
    });
  }
  return picked;
}

async function main() {
  const { devices, outputDir: requestedOutputDir } = parseArguments(process.argv.slice(2));
  if (!devices.length) {
    console.error("Usage: node scripts/export-bundle.mjs [--output-dir /private/tmp/where-ip-export] <device> [...]");
    process.exit(1);
  }
  const unknownDevices = devices.filter((device) => !Object.hasOwn(DEVICE_LABEL, device));
  if (unknownDevices.length) {
    throw new Error(`Unknown device(s): ${unknownDevices.join(", ")}`);
  }

  const outputRoot = requestedOutputDir ? path.resolve(requestedOutputDir) : null;
  if (outputRoot && (outputRoot === ROOT || outputRoot.startsWith(`${ROOT}${path.sep}`))) {
    throw new Error("--output-dir must be outside the repository");
  }
  if (outputRoot) await assertExternalOutputDirectory(outputRoot);

  const child = startDevServer();
  let tmpRoot;
  let browser;
  try {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "where-ip-screenshots-"));
    await waitForServer();
    browser = await chromium.launch({
      executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
    });
    const page = await browser.newPage();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    if (outputRoot) await mkdir(outputRoot, { recursive: true });

    for (const device of devices) {
      console.log(`==> Exporting ${device}`);
      const zipPath = await exportDevice(page, device, tmpRoot);
      const durableZipPath = outputRoot ? path.join(outputRoot, `${device}.zip`) : zipPath;
      if (outputRoot) await copyFile(zipPath, durableZipPath);
      const extracted = path.join(outputRoot || tmpRoot, device);
      await unzipToDir(durableZipPath, extracted);
      const manifest = await listExports(extracted, device);
      const manifestPath = path.join(outputRoot || tmpRoot, `${device}-manifest.json`);
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`    ${manifest.length} size bucket(s) → ${path.basename(manifestPath)}`);
    }

  } finally {
    try {
      await browser?.close();
    } finally {
      stopDevServer(child);
      if (tmpRoot) await rm(tmpRoot, { recursive: true, force: true });
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
