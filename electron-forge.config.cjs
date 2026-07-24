'use strict';

/**
 * Electron Forge is the planned packaging toolchain (see docs/publishing-plan.md).
 *
 * Phase 4 uses `scripts/package-desktop.mjs` (`@electron/packager`) instead
 * because `@electron-forge/cli` currently pulls an exotic git subdependency
 * blocked by pnpm `blockExoticSubdeps`. Revisit Forge when that rebuild path
 * is published without exotic subdeps. Channel makers and signing remain later.
 */
module.exports = {
  packagerConfig: {},
  makers: [],
  hooks: {
    generateAssets: async () => {
      throw new Error(
        'Electron Forge is deferred. Use `pnpm run electron:package` (scripts/package-desktop.mjs).',
      );
    },
  },
};
