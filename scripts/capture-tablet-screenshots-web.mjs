#!/usr/bin/env node
/**
 * Capture raw store screenshots via Expo Web at tablet viewports.
 * Uses TEST-NET IP 203.0.113.10 — no real personal data in captures.
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WEB_PORT = Number(process.env.SCREENSHOT_WEB_PORT ?? 19007);
const BASE_URL = `http://127.0.0.1:${WEB_PORT}`;

const SETTINGS_KEY = '@where-ip/settings-v1';
const CACHE_KEY = '@where-ip/cache-v1';
const COOLDOWNS_KEY = '@where-ip/provider-cooldowns-v1';

const MOCK_CACHE = {
  ip: '203.0.113.10',
  ipVersion: 4,
  countryCode: 'US',
  countryName: 'United States',
  city: 'Example City',
  region: 'California',
  timezone: 'America/Los_Angeles',
  organization: 'Example Networks',
  providerId: 'ipwhois',
  fetchedAt: new Date('2026-01-15T12:00:00.000Z').toISOString(),
};

const TARGETS = {
  'ios-ipad': {
    dest: 'store-screenshots/public/screenshots/apple/ipad/en',
    raw: 'store-screenshots/raw/ios-ipad',
    viewport: { width: 1032, height: 1376 },
    deviceScaleFactor: 2,
    platform: 'ios',
  },
  'android-tablet-7': {
    dest: 'store-screenshots/public/screenshots/android/tablet-7/en',
    raw: 'store-screenshots/raw/android-tablet-7',
    viewport: { width: 600, height: 960 },
    deviceScaleFactor: 2,
    platform: 'android',
  },
  'android-tablet-10': {
    dest: 'store-screenshots/public/screenshots/android/tablet-10/en',
    raw: 'store-screenshots/raw/android-tablet-10',
    viewport: { width: 800, height: 1280 },
    deviceScaleFactor: 2,
    platform: 'android',
  },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startWebServer() {
  const child = spawn(
    'pnpm',
    ['exec', 'expo', 'start', '--web', '--port', String(WEB_PORT), '--non-interactive'],
    {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1' },
    },
  );

  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Expo web server timeout')), 120000);
    const onData = (chunk) => {
      const text = chunk.toString();
      if (text.includes('Waiting on') || text.includes('http://')) {
        clearTimeout(timeout);
        child.stdout?.off('data', onData);
        child.stderr?.off('data', onData);
        resolve();
      }
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('exit', (code) => {
      if (code && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Expo web exited with ${code}`));
      }
    });
  });

  await ready;
  await sleep(3000);
  return child;
}

async function seedStorage(page, { acknowledged }) {
  await page.evaluate(
    ({ settingsKey, cacheKey, cooldownsKey, acknowledged, cache }) => {
      localStorage.clear();
      if (acknowledged) {
        localStorage.setItem(
          settingsKey,
          JSON.stringify({
            preferredProvider: 'ipwhois',
            acknowledgedAt: new Date('2026-01-15T12:00:00.000Z').toISOString(),
          }),
        );
        localStorage.setItem(cacheKey, JSON.stringify(cache));
        localStorage.setItem(cooldownsKey, JSON.stringify({}));
      }
    },
    {
      settingsKey: SETTINGS_KEY,
      cacheKey: CACHE_KEY,
      cooldownsKey: COOLDOWNS_KEY,
      acknowledged,
      cache: MOCK_CACHE,
    },
  );
}

async function captureTarget(browser, targetKey, config) {
  const destDir = path.join(ROOT, config.dest);
  const rawDir = path.join(ROOT, config.raw);
  await mkdir(destDir, { recursive: true });
  await mkdir(rawDir, { recursive: true });

  const context = await browser.newContext({
    viewport: config.viewport,
    deviceScaleFactor: config.deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  // 02 — disclosure (fresh install)
  await seedStorage(page, { acknowledged: false });
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByText('Privacy, in plain language').waitFor({ timeout: 30000 });
  await page.screenshot({ path: path.join(destDir, '02.png') });
  await page.screenshot({ path: path.join(rawDir, '02.png') });

  // 01, 03, 04 — acknowledged session with cached result
  await seedStorage(page, { acknowledged: true });
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByText('203.0.113.10').waitFor({ timeout: 30000 });
  await sleep(500);
  await page.screenshot({ path: path.join(destDir, '01.png') });
  await page.screenshot({ path: path.join(rawDir, '01.png') });

  await page.getByLabel(/^Provider,/).click();
  await page.getByText('Preferred IP information provider').waitFor({ timeout: 10000 });
  await sleep(400);
  await page.screenshot({ path: path.join(destDir, '03.png') });
  await page.screenshot({ path: path.join(rawDir, '03.png') });

  // Close provider menu if open
  const dismiss = page.getByLabel('Dismiss provider menu');
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
  }

  await page.getByLabel('About WhereIP and privacy').click();
  await page.getByText('Simple by design.').waitFor({ timeout: 15000 });
  await sleep(400);
  await page.screenshot({ path: path.join(destDir, '04.png') });
  await page.screenshot({ path: path.join(rawDir, '04.png') });

  await context.close();
  console.log(`Captured ${targetKey} -> ${config.dest}`);
}

async function main() {
  const only = process.argv.slice(2);
  const keys = only.length > 0 ? only : Object.keys(TARGETS);

  let webChild;
  try {
    console.log('Starting Expo web…');
    webChild = await startWebServer();

    const browser = await chromium.launch({ headless: true });
    for (const key of keys) {
      const config = TARGETS[key];
      if (!config) {
        throw new Error(`Unknown target: ${key}`);
      }
      await captureTarget(browser, key, config);
    }
    await browser.close();
  } finally {
    if (webChild && !webChild.killed) {
      webChild.kill('SIGTERM');
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
