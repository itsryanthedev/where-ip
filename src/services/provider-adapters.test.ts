import {
  InvalidProviderResponseError,
  parseFreeIpApi,
  parseIpinfo,
  parseIpWhois,
} from '@/services/provider-adapters';

const fetchedAt = '2026-07-24T10:00:00.000Z';

describe('provider response adapters', () => {
  test('normalizes an IPinfo response', () => {
    const result = parseIpinfo(
      {
        ip: '8.8.8.8',
        city: 'Mountain View',
        region: 'California',
        country: 'US',
        loc: '37.3860,-122.0838',
        org: 'AS15169 Google LLC',
        postal: '94035',
        timezone: 'America/Los_Angeles',
      },
      fetchedAt,
    );

    expect(result).toMatchObject({
      ip: '8.8.8.8',
      ipVersion: 4,
      countryCode: 'US',
      asn: 'AS15169',
      organization: 'Google LLC',
      latitude: 37.386,
      longitude: -122.0838,
      providerId: 'ipinfo',
    });
  });

  test('normalizes a FreeIPAPI response', () => {
    const result = parseFreeIpApi(
      {
        ipVersion: 4,
        ipAddress: '1.1.1.1',
        latitude: -33.494,
        longitude: 143.2104,
        countryName: 'Australia',
        countryCode: 'AU',
        cityName: 'Sydney',
        regionName: 'New South Wales',
        timeZones: ['Australia/Sydney'],
        asn: '13335',
        asnOrganization: 'Cloudflare, Inc.',
      },
      fetchedAt,
    );

    expect(result).toMatchObject({
      countryName: 'Australia',
      timezone: 'Australia/Sydney',
      asn: '13335',
      providerId: 'freeipapi',
    });
  });

  test('normalizes an ipwho.is response', () => {
    const result = parseIpWhois(
      {
        success: true,
        ip: '9.9.9.9',
        country: 'United States',
        country_code: 'US',
        city: 'Berkeley',
        region: 'California',
        latitude: 37.8715,
        longitude: -122.273,
        timezone: { id: 'America/Los_Angeles' },
        connection: {
          asn: 19281,
          org: 'Quad9',
          isp: 'Quad9',
        },
      },
      fetchedAt,
    );

    expect(result).toMatchObject({
      asn: 'AS19281',
      organization: 'Quad9',
      providerId: 'ipwhois',
    });
  });

  test('rejects missing or private IP values', () => {
    expect(() =>
      parseIpinfo({ ip: '192.168.1.1', country: 'US' }, fetchedAt),
    ).toThrow(InvalidProviderResponseError);
    expect(() => parseFreeIpApi({ countryCode: 'US' }, fetchedAt)).toThrow(
      InvalidProviderResponseError,
    );
  });

  test('rejects non-global IP ranges from every provider', () => {
    expect(() =>
      parseIpinfo({ ip: '100.64.0.1', country: 'US' }, fetchedAt),
    ).toThrow(InvalidProviderResponseError);
    expect(() =>
      parseFreeIpApi(
        { ipAddress: '192.0.2.1', countryCode: 'US' },
        fetchedAt,
      ),
    ).toThrow(InvalidProviderResponseError);
    expect(() =>
      parseIpWhois(
        { success: true, ip: '2001:db8::1', country_code: 'US' },
        fetchedAt,
      ),
    ).toThrow(InvalidProviderResponseError);
  });

  test('rejects invalid coordinates and drops oversized optional text', () => {
    expect(() =>
      parseIpWhois(
        {
          success: true,
          ip: '9.9.9.9',
          country_code: 'US',
          latitude: 91,
        },
        fetchedAt,
      ),
    ).toThrow(InvalidProviderResponseError);

    expect(
      parseIpinfo(
        {
          ip: '8.8.8.8',
          country: 'US',
          city: 'x'.repeat(513),
        },
        fetchedAt,
      ).city,
    ).toBeUndefined();
  });
});
