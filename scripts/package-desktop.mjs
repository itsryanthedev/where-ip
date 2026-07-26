/**
 * Unsigned desktop packaging for Phase 4 smoke tests.
 *
 * Downloads the Electron zip via `@electron/get` (same helper Electron's
 * install.js uses), then extracts with system `unzip` / PowerShell into `out/`.
 * Prefer `pnpm run electron:package:forge` when Forge packaging is needed;
 * that works because pnpm overrides `@electron/node-gyp` to its npm package
 * (see pnpm-workspace.yaml). Channel makers and signing are later.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function electronPackageRoot() {
  return path.dirname(require.resolve('electron/package.json'));
}

function loadElectronGet() {
  return require(
    require.resolve('@electron/get', { paths: [electronPackageRoot()] }),
  );
}

async function downloadElectronZip(version, platform, arch) {
  const { downloadArtifact } = loadElectronGet();
  const checksumsPath = path.join(electronPackageRoot(), 'checksums.json');
  const checksums = JSON.parse(fs.readFileSync(checksumsPath, 'utf8'));
  const env = { ...process.env };
  delete env.ELECTRON_SKIP_BINARY_DOWNLOAD;

  return downloadArtifact({
    version,
    artifactName: 'electron',
    platform,
    arch,
    checksums,
    force: process.env.force_no_cache === 'true',
    cacheRoot: process.env.electron_config_cache,
  });
}

function unzipTo(zipPath, destination) {
  fs.mkdirSync(destination, { recursive: true });
  const unzip = spawnSync('unzip', ['-q', zipPath, '-d', destination], {
    encoding: 'utf8',
  });
  if (unzip.status === 0) {
    return;
  }

  if (process.platform === 'win32') {
    const ps = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force`,
      ],
      { encoding: 'utf8' },
    );
    if (ps.status === 0) {
      return;
    }
    throw new Error(
      unzip.stderr || ps.stderr || 'Failed to unzip Electron runtime',
    );
  }

  throw new Error(unzip.stderr || 'Failed to unzip Electron runtime');
}

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function writePackagedPackageJson(targetPath, version) {
  const packageJson = {
    name: 'where-ip',
    version,
    main: 'electron/main/index.cjs',
    private: true,
  };
  fs.writeFileSync(
    path.join(targetPath, 'package.json'),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
}

async function packageDarwin({
  projectRoot,
  distDesktop,
  version,
  arch,
  outRoot,
  electronVersion,
}) {
  const zipPath = await downloadElectronZip(electronVersion, 'darwin', arch);
  const outputDir = path.join(outRoot, `WhereIP-darwin-${arch}`);
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  unzipTo(zipPath, outputDir);

  const appPath = path.join(outputDir, 'Electron.app');
  const renamedApp = path.join(outputDir, 'WhereIP.app');
  if (!fs.existsSync(appPath)) {
    throw new Error(`Expected Electron.app after unzipping ${zipPath}`);
  }
  fs.renameSync(appPath, renamedApp);

  const resourcesPath = path.join(renamedApp, 'Contents', 'Resources');
  const appDir = path.join(resourcesPath, 'app');
  fs.mkdirSync(appDir, { recursive: true });

  copyDirectory(path.join(projectRoot, 'electron'), path.join(appDir, 'electron'));
  writePackagedPackageJson(appDir, version);
  copyDirectory(distDesktop, path.join(resourcesPath, 'dist-desktop'));

  return outputDir;
}

async function packageWindows({
  projectRoot,
  distDesktop,
  version,
  arch,
  outRoot,
  electronVersion,
}) {
  const zipPath = await downloadElectronZip(electronVersion, 'win32', arch);
  const outputDir = path.join(outRoot, `WhereIP-win32-${arch}`);
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  unzipTo(zipPath, outputDir);

  const appDir = path.join(outputDir, 'resources', 'app');
  fs.mkdirSync(appDir, { recursive: true });
  copyDirectory(path.join(projectRoot, 'electron'), path.join(appDir, 'electron'));
  writePackagedPackageJson(appDir, version);
  copyDirectory(distDesktop, path.join(outputDir, 'resources', 'dist-desktop'));

  const electronExe = path.join(outputDir, 'electron.exe');
  const renamedExe = path.join(outputDir, 'WhereIP.exe');
  if (fs.existsSync(electronExe)) {
    fs.renameSync(electronExe, renamedExe);
  }

  return outputDir;
}

async function packageLinux({
  projectRoot,
  distDesktop,
  version,
  arch,
  outRoot,
  electronVersion,
}) {
  const zipPath = await downloadElectronZip(electronVersion, 'linux', arch);
  const outputDir = path.join(outRoot, `WhereIP-linux-${arch}`);
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  unzipTo(zipPath, outputDir);

  const appDir = path.join(outputDir, 'resources', 'app');
  fs.mkdirSync(appDir, { recursive: true });
  copyDirectory(path.join(projectRoot, 'electron'), path.join(appDir, 'electron'));
  writePackagedPackageJson(appDir, version);
  copyDirectory(distDesktop, path.join(outputDir, 'resources', 'dist-desktop'));

  const electronBin = path.join(outputDir, 'electron');
  const renamedBin = path.join(outputDir, 'WhereIP');
  if (fs.existsSync(electronBin)) {
    fs.renameSync(electronBin, renamedBin);
  }

  return outputDir;
}

async function main() {
  const projectRoot = path.join(__dirname, '..');
  const distDesktop = path.join(projectRoot, 'dist-desktop');
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
  );
  const electronVersion = require('electron/package.json').version;
  const outRoot = path.join(projectRoot, 'out');
  const arch = process.arch;

  if (!fs.existsSync(distDesktop)) {
    throw new Error(
      'Missing dist-desktop/. Run `pnpm run export:desktop` first.',
    );
  }

  fs.mkdirSync(outRoot, { recursive: true });

  const args = {
    projectRoot,
    distDesktop,
    version: packageJson.version,
    arch,
    outRoot,
    electronVersion,
  };

  let outputDir;
  switch (process.platform) {
    case 'darwin':
      outputDir = await packageDarwin(args);
      break;
    case 'win32':
      outputDir = await packageWindows(args);
      break;
    case 'linux':
      outputDir = await packageLinux(args);
      break;
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }

  console.log(`Packaged unsigned desktop app at ${outputDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
