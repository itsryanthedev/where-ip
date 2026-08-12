const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const forgeConfig = require('../electron-forge.config.cjs');
const { assertSafeTree } = require('./package-security.cjs');

describe('desktop package credential exclusions', () => {
  const ignore = forgeConfig.packagerConfig.ignore;

  it('ignores credential and signing material everywhere in the package tree', () => {
    for (const filePath of [
      '/credentials.json',
      '/.env',
      '/.env.production',
      '/.envrc',
      '/dist-desktop/release.p8',
      '/electron/private/notes.pem',
      '/secrets/service-account-prod.json',
      '/GoogleService-Info.plist',
    ]) {
      assert.equal(ignore(filePath), true, filePath);
    }
  });

  it('does not ignore ordinary application code', () => {
    assert.equal(ignore('/electron/main/index.cjs'), false);
    assert.equal(ignore('/package.json'), false);
  });

  it('packageAfterCopy rejects a private path in the staged tree', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'whereip-package-test-'));
    try {
      fs.mkdirSync(path.join(root, 'private'), { recursive: true });
      fs.writeFileSync(path.join(root, 'private', 'notes.txt'), 'placeholder');

      await assert.rejects(
        forgeConfig.hooks.packageAfterCopy({}, root),
        /private path/,
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('packageAfterCopy rejects signing material by extension', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'whereip-package-test-'));
    try {
      fs.mkdirSync(path.join(root, 'build'), { recursive: true });
      fs.writeFileSync(path.join(root, 'build', 'signing.p12'), 'placeholder');

      await assert.rejects(
        forgeConfig.hooks.packageAfterCopy({}, root),
        /private path/,
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('packageAfterCopy rewrites the packaged package metadata', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'whereip-package-test-'));
    try {
      fs.writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify({ main: 'old.cjs', scripts: { test: 'unsafe' } }),
      );

      await forgeConfig.hooks.packageAfterCopy({}, root);

      const packaged = JSON.parse(
        fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
      );
      assert.equal(packaged.main, 'electron/main/index.cjs');
      assert.equal(Object.hasOwn(packaged, 'scripts'), false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects symbolic links and tolerates unsupported symlinks', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'whereip-package-test-'));
    try {
      fs.writeFileSync(path.join(root, 'target.txt'), 'placeholder');
      try {
        fs.symlinkSync('target.txt', path.join(root, 'link.txt'));
      } catch (error) {
        if (error && (error.code === 'EPERM' || error.code === 'EACCES')) return;
        throw error;
      }

      assert.throws(() => assertSafeTree(root), /symbolic link/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects a symbolic link supplied as the package root', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'whereip-package-test-'));
    const target = path.join(root, 'target');
    const link = path.join(root, 'link');
    try {
      fs.mkdirSync(target);
      try {
        fs.symlinkSync(target, link, 'dir');
      } catch (error) {
        if (error && (error.code === 'EPERM' || error.code === 'EACCES')) return;
        throw error;
      }

      assert.throws(() => assertSafeTree(link), /symbolic link root/);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
