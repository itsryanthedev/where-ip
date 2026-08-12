'use strict';

/* global __dirname */

const fs = require('node:fs');
const path = require('node:path');
const { assertSafeTree, isPrivatePackagePath } = require('./scripts/package-security.cjs');

/**
 * Electron Forge config for unsigned Phase 4 packaging.
 *
 * Channel-specific makers (DMG, NSIS, MAS, MSIX) and signing belong to later
 * publishing phases. `@electron/rebuild` still declares a git URL for
 * `@electron/node-gyp`; pnpm-workspace.yaml overrides that to the published
 * npm package so `blockExoticSubdeps` stays enabled.
 */
module.exports = {
  packagerConfig: {
    name: 'WhereIP',
    executableName: 'WhereIP',
    appBundleId: 'com.elmowjastudio.whereip',
    asar: true,
    ignore: (filePath) => {
      if (!filePath) {
        return false;
      }
      if (isPrivatePackagePath(filePath)) {
        return true;
      }
      // @electron/packager passes app-root-relative paths with a leading `/`
      // (see copy-filter.js). Keep dist-desktop out of the ASAR; it ships only
      // via extraResource.
      if (
        filePath.startsWith('/src') ||
        filePath.startsWith('/assets') ||
        filePath.startsWith('/docs') ||
        filePath.startsWith('/scripts') ||
        filePath.startsWith('/.github') ||
        filePath.startsWith('/.git') ||
        filePath.startsWith('/.expo') ||
        filePath.startsWith('/dist-pages') ||
        filePath.startsWith('/dist-desktop') ||
        filePath.startsWith('/dist/') ||
        filePath.startsWith('/out') ||
        filePath.startsWith('/public') ||
        filePath.startsWith('/electron/tests')
      ) {
        return true;
      }
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
    packageBeforeCopy: async () => {
      assertSafeTree(path.resolve(__dirname, 'dist-desktop'));
    },
    packageAfterCopy: async (_config, buildPath) => {
      assertSafeTree(buildPath);
      const packageJsonPath = path.join(buildPath, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageJson.main = 'electron/main/index.cjs';
      delete packageJson.scripts;
      fs.writeFileSync(
        packageJsonPath,
        `${JSON.stringify(packageJson, null, 2)}\n`,
      );
    },
  },
};
