'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Electron Forge configuration.
 *
 * Channel-specific makers (direct-mac, mas, direct-windows, windows-store) and
 * signing belong to later publishing phases. Phase 4 only packages an unsigned
 * directory for local and CI smoke tests.
 */
module.exports = {
  packagerConfig: {
    name: 'WhereIP',
    executableName: 'WhereIP',
    appBundleId: 'com.itsryanthedev.whereip',
    asar: true,
    // Ignore source and tooling that are not required to host the static export.
    ignore: (filePath) => {
      if (!filePath) {
        return false;
      }
      if (filePath === '/electron-forge.config.cjs') {
        return true;
      }
      if (
        filePath.startsWith('/src') ||
        filePath.startsWith('/assets') ||
        filePath.startsWith('/docs') ||
        filePath.startsWith('/scripts') ||
        filePath.startsWith('/.github') ||
        filePath.startsWith('/.git') ||
        filePath.startsWith('/.expo') ||
        filePath.startsWith('/dist-pages') ||
        filePath.startsWith('/dist/') ||
        filePath.startsWith('/out') ||
        filePath.startsWith('/public')
      ) {
        return true;
      }
      // Keep electron shell + desktop export + package metadata.
      return false;
    },
    extraResource: ['./dist-desktop'],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32'],
    },
  ],
  hooks: {
    packageAfterCopy: async (_config, buildPath) => {
      const packageJsonPath = path.join(buildPath, 'package.json');
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, 'utf8'),
      );
      packageJson.main = 'electron/main/index.cjs';
      fs.writeFileSync(
        packageJsonPath,
        `${JSON.stringify(packageJson, null, 2)}\n`,
      );
    },
  },
};
