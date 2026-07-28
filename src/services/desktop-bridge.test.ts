import { getAppVersion, getDesktopBridge } from '@/services/desktop-bridge';
import type { DesktopBridge } from '@/services/desktop-bridge';
import { lookupPublicIp, LookupChainError } from '@/services/ip-lookup';
import type { IpResult } from '@/types/ip';

describe('desktop bridge adapter', () => {
  const original = (globalThis as { whereipDesktop?: DesktopBridge })
    .whereipDesktop;

  afterEach(() => {
    if (original) {
      (globalThis as { whereipDesktop?: DesktopBridge }).whereipDesktop =
        original;
    } else {
      delete (globalThis as { whereipDesktop?: DesktopBridge }).whereipDesktop;
    }
  });

  test('returns null when the bridge is absent', () => {
    delete (globalThis as { whereipDesktop?: DesktopBridge }).whereipDesktop;
    expect(getDesktopBridge()).toBeNull();
    expect(getAppVersion('1.0.1')).toBe('1.0.1');
  });

  test('reads version from an injected bridge', () => {
    (globalThis as { whereipDesktop?: DesktopBridge }).whereipDesktop = {
      lookupPublicIp: async () => {
        throw new Error('unused');
      },
      openExternalLink: async () => undefined,
      getAppVersion: () => '9.9.9-desktop',
    };

    expect(getDesktopBridge()).not.toBeNull();
    expect(getAppVersion('1.0.1')).toBe('9.9.9-desktop');
  });

  test('lookupPublicIp uses providerLookup when provided', async () => {
    const result: IpResult = {
      ip: '203.0.113.50',
      ipVersion: 4,
      countryCode: 'US',
      providerId: 'ipinfo',
      fetchedAt: '2026-07-24T00:00:00.000Z',
    };

    const outcome = await lookupPublicIp({
      preferredProvider: 'ipinfo',
      providerLookup: async (providerId) => {
        expect(providerId).toBe('ipinfo');
        return result;
      },
      now: Date.parse('2026-07-24T00:00:00.000Z'),
    });

    expect(outcome.result).toEqual(result);
    expect(outcome.attemptedProviders).toEqual(['ipinfo']);
  });

  test('lookupPublicIp falls through the chain when providerLookup fails', async () => {
    await expect(
      lookupPublicIp({
        preferredProvider: 'ipinfo',
        providerLookup: async () => {
          throw new Error('offline');
        },
        now: Date.parse('2026-07-24T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(LookupChainError);
  });
});
