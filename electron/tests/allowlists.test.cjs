'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { resolveAllowedLink, isDesktopLinkId } = require('../shared/links.cjs');
const { isProviderId, PROVIDERS } = require('../shared/providers.cjs');
const { resolveProtocolPath } = require('../shared/protocol.cjs');
const { parseProviderResponse } = require('../shared/provider-lookup.cjs');
const {
  assertTrustedIpcSender,
  isTrustedIpcSender,
} = require('../shared/ipc-trust.cjs');

describe('desktop allowlists', () => {
  it('accepts known provider IDs and rejects unknown ones', () => {
    assert.equal(isProviderId('ipinfo'), true);
    assert.equal(isProviderId('freeipapi'), true);
    assert.equal(isProviderId('ipwhois'), true);
    assert.equal(isProviderId('evil'), false);
    assert.equal(isProviderId(null), false);
    assert.ok(PROVIDERS.ipinfo.endpoint.startsWith('https://'));
  });

  it('resolves only allowlisted external links', () => {
    assert.equal(isDesktopLinkId('app.repository'), true);
    assert.equal(
      resolveAllowedLink('app.repository'),
      'https://github.com/itsryanthedev/where-ip',
    );
    assert.throws(() => resolveAllowedLink('app.unknown'), /allowlisted/);
    assert.throws(() => resolveAllowedLink('https://evil.example'), /allowlisted/);
  });
});

describe('custom protocol path resolution', () => {
  // path.resolve so Windows expectations match resolveProtocolPath (drive letter).
  const distRoot = path.resolve(os.tmpdir(), 'whereip-dist-desktop');

  it('maps the app root to index.html', () => {
    const resolved = resolveProtocolPath(distRoot, 'whereip://app/');
    assert.equal(resolved.filePath, path.join(distRoot, 'index.html'));
  });

  it('rejects path traversal markers in the request URL', () => {
    const resolved = resolveProtocolPath(
      distRoot,
      'whereip://app/foo/../../etc/passwd',
    );
    assert.ok('error' in resolved);
  });

  it('rejects encoded path traversal markers', () => {
    const resolved = resolveProtocolPath(
      distRoot,
      'whereip://app/%2e%2e/%2e%2e/etc/passwd',
    );
    assert.ok('error' in resolved);
  });

  it('keeps host-normalized paths under the dist root', () => {
    const resolved = resolveProtocolPath(
      distRoot,
      'whereip://app/assets/icon.png',
    );
    assert.equal(
      resolved.filePath,
      path.join(distRoot, 'assets', 'icon.png'),
    );
  });

  it('rejects unexpected hosts', () => {
    const resolved = resolveProtocolPath(distRoot, 'whereip://other/index.html');
    assert.ok('error' in resolved);
  });

  it('rejects file URLs', () => {
    const resolved = resolveProtocolPath(
      distRoot,
      pathToFileURL(path.join(distRoot, 'index.html')).href,
    );
    assert.ok('error' in resolved);
  });
});

describe('provider response parsing in the shell', () => {
  it('parses a minimal ipinfo payload', () => {
    const result = parseProviderResponse('ipinfo', {
      ip: '203.0.113.10',
      country: 'US',
      city: 'Example',
      org: 'AS64500 Example Org',
    }, '2026-07-24T00:00:00.000Z');

    assert.equal(result.ip, '203.0.113.10');
    assert.equal(result.providerId, 'ipinfo');
    assert.equal(result.countryCode, 'US');
    assert.equal(result.asn, 'AS64500');
  });

  it('rejects unknown providers', () => {
    assert.throws(
      () => parseProviderResponse('not-a-provider', { ip: '1.1.1.1' }),
      /Unknown provider/,
    );
  });
});

describe('IPC sender trust', () => {
  it('accepts the trusted main-window webContents', () => {
    const trusted = { isDestroyed: () => false };
    assert.equal(isTrustedIpcSender({ sender: trusted }, trusted), true);
  });

  it('rejects foreign or missing senders', () => {
    const trusted = { isDestroyed: () => false };
    assert.equal(isTrustedIpcSender({ sender: {} }, trusted), false);
    assert.equal(isTrustedIpcSender({ sender: trusted }, null), false);
    assert.equal(
      isTrustedIpcSender({ sender: trusted }, { isDestroyed: () => true }),
      false,
    );
    assert.throws(
      () => assertTrustedIpcSender({ sender: {} }, trusted),
      /Untrusted IPC sender/,
    );
  });
});
