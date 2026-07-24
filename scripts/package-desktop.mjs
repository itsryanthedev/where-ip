/**
 * Unsigned desktop packaging for Phase 4 smoke tests.
 *
 * Uses the locally cached Electron zip + system `unzip` instead of
 * `@electron/packager`'s extract-zip path (unreliable on Node 26+). Electron
 * Forge remains deferred while it pulls exotic git subdeps blocked by pnpm
 * `blockExoticSubdeps`. Channel makers and signing belong to later phases.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function electronCacheRoot() {
  if (process.env.electron_config_cache) {
    return process.env.electron_config_cache;
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Caches', 'electron');
  }
  if (process.platform === 'win32') {
    return path.join(
      process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
      'electron',
      'Cache',
    );
  }
  return path.join(os.homedir(), '.cache', 'electron');
}

function findCachedElectronZip(version, platform, arch) {
  const fileName = `electron-v${version}-${platform}-${arch}.zip`;
  const cacheRoot = electronCacheRoot();
  if (!fs.existsSync(cacheRoot)) {
    throw new Error(
      `Electron cache not found at ${cacheRoot}. Run pnpm install so Electron can download once.`,
    );
  }

  const direct = path.join(cacheRoot, fileName);
  if (fs.existsSync(direct)) {
    return direct;
  }

  for (const entry of fs.readdirSync(cacheRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const candidate = path.join(cacheRoot, entry.name, fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Cached ${fileName} not found under ${cacheRoot}. Run pnpm install without ELECTRON_SKIP_BINARY_DOWNLOAD.`,
  );
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

function packageDarwin({ projectRoot, distDesktop, version, arch, outRoot }) {
  const electronVersion = require('electron/package.json').version;
  const zipPath = findCachedElectronZip(electronVersion, 'darwin', arch);
  const outputDir = path.join(outRoot, `WhereIP-darwin-${arch}`);
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const unzip = spawnSync('unzip', ['-q', zipPath, '-d', outputDir], {
    encoding: 'utf8',
  });
  if (unzip.status !== 0) {
    throw new Error(unzip.stderr || 'Failed to unzip Electron runtime');
  }

  const appPath = path.join(outputDir, 'Electron.app');
  const renamedApp = path.join(outputDir, 'WhereIP.app');
  fs.renameSync(appPath, renamedApp);

  const resourcesPath = path.join(renamedApp, 'Contents', 'Resources');
  const appDir = path.join(resourcesPath, 'app');
  fs.mkdirSync(appDir, { recursive: true });

  copyDirectory(path.join(projectRoot, 'electron'), path.join(appDir, 'electron'));
  writePackagedPackageJson(appDir, version);
  copyDirectory(distDesktop, path.join(resourcesPath, 'dist-desktop'));

  // Point the executable helper name is left as Electron for unsigned smoke;
  // signing/renaming belongs to a later phase.
  return outputDir;
}

function packageWindows({ projectRoot, distDesktop, version, arch, outRoot }) {
  const electronVersion = require('electron/package.json').version;
  const zipPath = findCachedElectronZip(electronVersion, 'win32', arch);
  const outputDir = path.join(outRoot, `WhereIP-win32-${arch}`);
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const unzip = spawnSync('unzip', ['-q', zipPath, '-d', outputDir], {
    encoding: 'utf8',
  });
  if (unzip.status !== 0) {
    // Windows runners may lack unzip; fall back to PowerShell Expand-Archive.
    const ps = spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${outputDir.replace(/'/g, "''")}' -Force`,
      ],
      { encoding: 'utf8' },
    );
    if (ps.status !== 0) {
      throw new Error(
        unzip.stderr || ps.stderr || 'Failed to unzip Electron runtime',
      );
    }
  }

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

function packageLinux({ projectRoot, distDesktop, version, arch, outRoot }) {
  const electronVersion = require('electron/package.json').version;
  const zipPath = findCachedElectronZip(electronVersion, 'linux', arch);
  const outputDir = path.join(outRoot, `WhereIP-linux-${arch}`);
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const unzip = spawnSync('unzip', ['-q', zipPath, '-d', outputDir], {
    encoding: 'utf8',
  });
  if (unzip.status !== 0) {
    throw new Error(unzip.stderr || 'Failed to unzip Electron runtime');
  }

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

function main() {
  const projectRoot = path.join(__dirname, '..');
  const distDesktop = path.join(projectRoot, 'dist-desktop');
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
  );
  const outRoot = path.join(projectRoot, 'out');
  const arch = process.arch;

  if (!fs.existsSync(distDesktop)) {
    throw new Error(
      'Missing dist-desktop/. Run `pnpm run export:desktop` first.',
    );
  }

  fs.mkdirSync(outRoot, { recursive: true });

  let outputDir;
  switch (process.platform) {
    case 'darwin':
      outputDir = packageDarwin({
        projectRoot,
        distDesktop,
        version: packageJson.version,
        arch,
        outRoot,
      });
      break;
    case 'win32':
      outputDir = packageWindows({
        projectRoot,
        distDesktop,
        version: packageJson.version,
        arch,
        outRoot,
      });
      break;
    case 'linux':
      outputDir = packageLinux({
        projectRoot,
        distDesktop,
        version: packageJson.version,
        arch,
        outRoot,
      });
      break;
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }

  console.log(`Packaged unsigned desktop app at ${outputDir}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
