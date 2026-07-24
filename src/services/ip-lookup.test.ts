import {
  lookupPublicIp,
  LookupChainError,
} from '@/services/ip-lookup';

function response(
  status: number,
  payload: unknown,
  headers: Record<string, string> = {},
): Pick<Response, 'ok' | 'status' | 'headers' | 'json'> {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => payload,
  };
}

describe('provider fallback chain', () => {
  test('uses IPinfo first by default', async () => {
    const fetchImplementation = jest.fn(async () =>
      response(200, {
        ip: '8.8.4.4',
        city: 'Mountain View',
        region: 'California',
        country: 'US',
        org: 'AS15169 Google LLC',
      }),
    );

    const outcome = await lookupPublicIp({
      preferredProvider: 'ipinfo',
      fetchImplementation,
      now: Date.parse('2026-07-24T10:00:00.000Z'),
    });

    expect(outcome.result.providerId).toBe('ipinfo');
    expect(outcome.attemptedProviders).toEqual(['ipinfo']);
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://ipinfo.io/json',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  test('falls back once when the preferred provider fails', async () => {
    const fetchImplementation = jest
      .fn()
      .mockResolvedValueOnce(response(429, {}, { 'retry-after': '120' }))
      .mockResolvedValueOnce(
        response(200, {
          ipAddress: '1.1.1.1',
          countryCode: 'AU',
          countryName: 'Australia',
          asn: '13335',
          asnOrganization: 'Cloudflare, Inc.',
        }),
      );
    const now = Date.parse('2026-07-24T10:00:00.000Z');

    const outcome = await lookupPublicIp({
      preferredProvider: 'ipinfo',
      fetchImplementation,
      now,
    });

    expect(outcome.result.providerId).toBe('freeipapi');
    expect(outcome.attemptedProviders).toEqual(['ipinfo', 'freeipapi']);
    expect(outcome.providerCooldowns.ipinfo).toBe(now + 120_000);
  });

  test('moves a user-selected provider to the front', async () => {
    const fetchImplementation = jest.fn(async () =>
      response(200, {
        success: true,
        ip: '9.9.9.9',
        country_code: 'US',
        country: 'United States',
        connection: { asn: 19281, org: 'Quad9' },
      }),
    );

    const outcome = await lookupPublicIp({
      preferredProvider: 'ipwhois',
      fetchImplementation,
    });

    expect(outcome.attemptedProviders).toEqual(['ipwhois']);
    expect(fetchImplementation).toHaveBeenCalledWith(
      'https://ipwho.is/',
      expect.any(Object),
    );
  });

  test('reports bounded failure after every provider fails', async () => {
    const fetchImplementation = jest.fn(async () => response(503, {}));

    await expect(
      lookupPublicIp({
        preferredProvider: 'ipinfo',
        fetchImplementation,
      }),
    ).rejects.toMatchObject<Partial<LookupChainError>>({
      attemptedProviders: ['ipinfo', 'freeipapi', 'ipwhois'],
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(3);
  });

  test('does not contact providers while every provider is cooling down', async () => {
    const fetchImplementation = jest.fn();
    const now = Date.parse('2026-07-24T10:00:00.000Z');

    await expect(
      lookupPublicIp({
        preferredProvider: 'ipinfo',
        providerCooldowns: {
          ipinfo: now + 10_000,
          freeipapi: now + 20_000,
          ipwhois: now + 30_000,
        },
        fetchImplementation,
        now,
      }),
    ).rejects.toMatchObject<Partial<LookupChainError>>({
      attemptedProviders: [],
    });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});
