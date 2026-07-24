import { copyFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import process from 'node:process';

import sharp from 'sharp';

const root = process.cwd();
const brand = join(root, 'assets', 'brand');
const images = join(root, 'assets', 'images');
const publicDirectory = join(root, 'public');
const storeIos = join(root, 'store-assets', 'ios');
const storeAndroid = join(root, 'store-assets', 'android');
const storeWeb = join(root, 'store-assets', 'web');

await Promise.all(
  [images, publicDirectory, storeIos, storeAndroid, storeWeb].map((directory) =>
    mkdir(directory, { recursive: true }),
  ),
);

const mark = join(brand, 'where-ip-mark.svg');
const foreground = join(brand, 'adaptive-foreground.svg');
const monochrome = join(brand, 'adaptive-monochrome.svg');
const splash = join(brand, 'splash-mark.svg');

await Promise.all([
  renderOpaque(mark, join(images, 'app-icon.png'), 1024, 1024),
  render(foreground, join(images, 'android-icon-foreground.png'), 1024, 1024),
  render(monochrome, join(images, 'android-icon-monochrome.png'), 1024, 1024),
  render(splash, join(images, 'splash-icon.png'), 512, 512),
  renderOpaque(mark, join(publicDirectory, 'favicon-96x96.png'), 96, 96),
  renderOpaque(mark, join(publicDirectory, 'apple-touch-icon.png'), 180, 180),
  renderOpaque(mark, join(publicDirectory, 'web-app-manifest-192x192.png'), 192, 192),
  renderOpaque(mark, join(publicDirectory, 'web-app-manifest-512x512.png'), 512, 512),
  renderOpaque(mark, join(storeIos, 'app-store-icon-1024.png'), 1024, 1024),
  renderOpaque(mark, join(storeAndroid, 'play-store-icon-512.png'), 512, 512),
]);

await createFeatureGraphic();
await createSocialCard();
await copyFile(join(brand, 'favicon.svg'), join(publicDirectory, 'favicon.svg'));
await createIco();

console.log('Generated WhereIP application, store, and favicon assets.');

async function render(input, output, width, height) {
  await sharp(input, { density: 384 })
    .resize(width, height, { fit: 'contain' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);
}

async function renderOpaque(input, output, width, height) {
  await sharp(input, { density: 384 })
    .resize(width, height, { fit: 'contain' })
    .flatten({ background: '#0B84F3' })
    .removeAlpha()
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);
}

async function createFeatureGraphic() {
  const markBuffer = await sharp(mark, { density: 320 })
    .resize(360, 360)
    .png()
    .toBuffer();
  const wordmark = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1024" y2="500">
          <stop offset="0" stop-color="#071B2C"/>
          <stop offset="1" stop-color="#0B4B78"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="500" fill="url(#bg)"/>
      <circle cx="940" cy="40" r="230" fill="#0B84F3" opacity=".18"/>
      <text x="466" y="222" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="90" font-weight="700">WhereIP</text>
      <text x="470" y="288" fill="#B9D9F1" font-family="Arial, sans-serif" font-size="34">Know what the internet sees.</text>
      <text x="470" y="348" fill="#52D5BC" font-family="Arial, sans-serif" font-size="24" font-weight="700">FREE · OPEN SOURCE · PRIVACY FIRST</text>
    </svg>
  `);

  await sharp(wordmark)
    .composite([{ input: markBuffer, left: 72, top: 70 }])
    .png({ compressionLevel: 9 })
    .toFile(join(storeAndroid, 'feature-graphic-1024x500.png'));
}

async function createSocialCard() {
  const markBuffer = await sharp(mark, { density: 320 })
    .resize(410, 410)
    .png()
    .toBuffer();
  const background = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630">
          <stop offset="0" stop-color="#F4F8FC"/>
          <stop offset="1" stop-color="#DCEEFF"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)"/>
      <circle cx="1120" cy="80" r="280" fill="#49A8FF" opacity=".16"/>
      <text x="570" y="286" fill="#102A43" font-family="Arial, sans-serif" font-size="108" font-weight="700">WhereIP</text>
      <text x="574" y="365" fill="#5D7083" font-family="Arial, sans-serif" font-size="40">Your public connection, clearly.</text>
      <text x="574" y="430" fill="#0C9F83" font-family="Arial, sans-serif" font-size="27" font-weight="700">FREE · OPEN SOURCE · PRIVACY FIRST</text>
    </svg>
  `);

  await sharp(background)
    .composite([{ input: markBuffer, left: 96, top: 110 }])
    .png({ compressionLevel: 9 })
    .toFile(join(storeWeb, 'social-card-1200x630.png'));
  await copyFile(
    join(storeWeb, 'social-card-1200x630.png'),
    join(publicDirectory, 'og-image.png'),
  );
}

async function createIco() {
  const temporaryFiles = [];
  for (const size of [16, 32, 48]) {
    const output = join(publicDirectory, `.favicon-${size}.png`);
    temporaryFiles.push(output);
    await renderOpaque(mark, output, size, size);
  }

  try {
    execFileSync('magick', [
      ...temporaryFiles,
      join(publicDirectory, 'favicon.ico'),
    ]);
  } finally {
    await Promise.all(
      temporaryFiles.map((file) =>
        import('node:fs/promises').then(({ unlink }) => unlink(file)),
      ),
    );
  }
}
