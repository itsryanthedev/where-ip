const { readdirSync, readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join } = require('node:path');

const rootRequire = createRequire(join(process.cwd(), 'package.json'));

/**
 * Collect concrete `name@version` entries from the pnpm lockfile `packages:`
 * section. Skip override range keys such as `tar@<7.5.21`.
 */
function lockfilePackageVersions(packageName) {
  const lockfile = readFileSync(join(process.cwd(), 'pnpm-lock.yaml'), 'utf8');
  const packagesSection = lockfile.split(/\npackages:\n/)[1] ?? '';
  const versions = new Set();
  const pattern = new RegExp(
    `^ {2}${packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}@(\\d[^:\\s(]*)`,
    'gm',
  );

  for (const match of packagesSection.matchAll(pattern)) {
    versions.add(match[1]);
  }

  return [...versions].sort();
}

function compareSemver(left, right) {
  const toParts = (value) =>
    value
      .replace(/^v/, '')
      .split('-')[0]
      .split('.')
      .map((part) => Number.parseInt(part, 10) || 0);

  const a = toParts(left);
  const b = toParts(right);
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) {
      return delta;
    }
  }

  return 0;
}

describe('dependency security floor', () => {
  test('pins Electron to a release that clears the current advisory set', () => {
    const { version } = rootRequire('electron/package.json');
    expect(compareSemver(version, '39.8.5')).toBeGreaterThanOrEqual(0);
    expect(version).toBe(
      JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
        .devDependencies.electron,
    );
  });

  test('overrides keep tar at a patched 7.5.x line in the lockfile', () => {
    const versions = lockfilePackageVersions('tar');
    expect(versions.length).toBeGreaterThan(0);
    for (const version of versions) {
      expect(compareSemver(version, '7.5.21')).toBeGreaterThanOrEqual(0);
    }
  });

  test('overrides keep brace-expansion at the patched 5.0.8+ line', () => {
    const versions = lockfilePackageVersions('brace-expansion');
    expect(versions.length).toBeGreaterThan(0);
    for (const version of versions) {
      expect(compareSemver(version, '5.0.8')).toBeGreaterThanOrEqual(0);
    }
  });

  test('patched minimatch still expands braces after brace-expansion@5', () => {
    const patchedDirectory = readdirSync(
      join(process.cwd(), 'node_modules', '.pnpm'),
    ).find((entry) => entry.startsWith('minimatch@3.1.5_patch_hash='));

    expect(patchedDirectory).toEqual(expect.any(String));

    const minimatch = rootRequire(
      join(
        process.cwd(),
        'node_modules',
        '.pnpm',
        patchedDirectory,
        'node_modules',
        'minimatch',
      ),
    );

    expect(minimatch('abd', 'a{b,c}d')).toBe(true);
    expect(minimatch('acd', 'a{b,c}d')).toBe(true);
    expect(minimatch('axd', 'a{b,c}d')).toBe(false);
  });

  test('documents patched security overrides and minimatch shims', () => {
    const workspace = readFileSync(
      join(process.cwd(), 'pnpm-workspace.yaml'),
      'utf8',
    );

    expect(workspace).toMatch(/tar@<7\.5\.21:\s*7\.5\.22/);
    expect(workspace).toMatch(/brace-expansion@<=5\.0\.7:\s*5\.0\.8/);
    expect(workspace).toMatch(/minimatch@3\.1\.5:\s*patches\/minimatch@3\.1\.5\.patch/);
    expect(workspace).toMatch(/minimatch@5\.1\.9:\s*patches\/minimatch@5\.1\.9\.patch/);
    expect(workspace).toMatch(/minimatch@9\.0\.9:\s*patches\/minimatch@9\.0\.9\.patch/);
  });
});
