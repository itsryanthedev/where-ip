const { spawnSync } = require('node:child_process');
const {
  mkdtempSync,
  rmSync,
  writeFileSync,
} = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const scannerPath = join(process.cwd(), 'scripts/check-secrets.mjs');
const credentialKey = ['client', 'secret'].join('_');
const fakeMarker = ['FAKE', 'CREDENTIAL', 'FOR', 'SCANNER', 'TEST'].join('_');

function run(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
  });
}

function runGit(cwd, ...args) {
  const result = run('git', args, cwd);
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
}

function runScanner(cwd, ...args) {
  return run(process.execPath, [scannerPath, ...args], cwd);
}

describe('secret hygiene scanner', () => {
  let fixtureDirectory;

  beforeEach(() => {
    fixtureDirectory = mkdtempSync(join(tmpdir(), 'whereip-secret-scan-'));
    runGit(fixtureDirectory, 'init', '--quiet');
    runGit(fixtureDirectory, 'config', 'user.email', 'test@example.invalid');
    runGit(fixtureDirectory, 'config', 'user.name', 'WhereIP Test');
    writeFileSync(join(fixtureDirectory, 'README.md'), 'scanner fixture\n');
    runGit(fixtureDirectory, 'add', 'README.md');
    runGit(fixtureDirectory, 'commit', '--quiet', '-m', 'fixture');
  });

  afterEach(() => {
    rmSync(fixtureDirectory, { recursive: true, force: true });
  });

  test('detects a generic credential under a quoted JSON key', () => {
    writeFileSync(
      join(fixtureDirectory, 'fixture.json'),
      JSON.stringify({ [credentialKey]: fakeMarker }),
    );
    runGit(fixtureDirectory, 'add', 'fixture.json');

    const result = runScanner(fixtureDirectory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('embedded-credential:fixture.json');
    expect(result.stderr).not.toContain(fakeMarker);
  });

  test('detects UTF-16 text instead of treating it as an opaque binary', () => {
    const json = JSON.stringify({ [credentialKey]: fakeMarker });
    writeFileSync(
      join(fixtureDirectory, 'fixture.txt'),
      Buffer.from(`\uFEFF${json}`, 'utf16le'),
    );
    runGit(fixtureDirectory, 'add', 'fixture.txt');

    const result = runScanner(fixtureDirectory);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('embedded-credential:fixture.txt');
    expect(result.stderr).not.toContain(fakeMarker);
  });

  test('scans UTF-16 blobs that exist only in Git history', () => {
    const fixturePath = join(fixtureDirectory, 'fixture.txt');
    writeFileSync(
      fixturePath,
      Buffer.from(
        `\uFEFF${JSON.stringify({ [credentialKey]: fakeMarker })}`,
        'utf16le',
      ),
    );
    runGit(fixtureDirectory, 'add', 'fixture.txt');
    runGit(fixtureDirectory, 'commit', '--quiet', '-m', 'add encoded fixture');
    writeFileSync(
      fixturePath,
      JSON.stringify({ [credentialKey]: '<CLIENT_SECRET>' }),
    );
    runGit(fixtureDirectory, 'add', 'fixture.txt');
    runGit(fixtureDirectory, 'commit', '--quiet', '-m', 'replace fixture');

    const result = runScanner(fixtureDirectory, '--history');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('history:embedded-credential:fixture.txt');
    expect(result.stderr).not.toContain(fakeMarker);
  });

  test('accepts an explicit placeholder', () => {
    writeFileSync(
      join(fixtureDirectory, 'fixture.json'),
      JSON.stringify({ [credentialKey]: '<CLIENT_SECRET>' }),
    );
    runGit(fixtureDirectory, 'add', 'fixture.json');

    expect(runScanner(fixtureDirectory).status).toBe(0);
  });
});
