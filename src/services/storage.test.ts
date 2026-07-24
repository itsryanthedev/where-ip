import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadPersistedState } from '@/services/storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  multiGet: jest.fn(),
  setItem: jest.fn(),
}));

const mockMultiGet = AsyncStorage.multiGet as jest.MockedFunction<
  typeof AsyncStorage.multiGet
>;

function persistedEntries({
  settings,
  cache,
  cooldowns,
}: {
  settings?: unknown;
  cache?: unknown;
  cooldowns?: unknown;
}) {
  return [
    ['@where-ip/settings-v1', settings === undefined ? null : JSON.stringify(settings)],
    ['@where-ip/cache-v1', cache === undefined ? null : JSON.stringify(cache)],
    [
      '@where-ip/provider-cooldowns-v1',
      cooldowns === undefined ? null : JSON.stringify(cooldowns),
    ],
  ] as [string, string | null][];
}

describe('persisted state validation', () => {
  const now = Date.parse('2026-07-24T10:00:00.000Z');

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('loads a complete valid state', async () => {
    mockMultiGet.mockResolvedValue(
      persistedEntries({
        settings: {
          preferredProvider: 'freeipapi',
          acknowledgedAt: '2026-07-24T09:00:00.000Z',
        },
        cache: {
          ip: '1.1.1.1',
          ipVersion: 4,
          countryCode: 'AU',
          countryName: 'Australia',
          latitude: -33.494,
          longitude: 143.2104,
          providerId: 'freeipapi',
          fetchedAt: '2026-07-24T09:59:00.000Z',
        },
        cooldowns: {
          ipinfo: now + 30_000,
        },
      }),
    );

    await expect(loadPersistedState()).resolves.toMatchObject({
      settings: {
        preferredProvider: 'freeipapi',
        acknowledgedAt: '2026-07-24T09:00:00.000Z',
      },
      cache: {
        ip: '1.1.1.1',
        ipVersion: 4,
      },
      providerCooldowns: {
        ipinfo: now + 30_000,
      },
    });
  });

  test('fails closed for malformed consent, cache fields, and cooldowns', async () => {
    mockMultiGet.mockResolvedValue(
      persistedEntries({
        settings: {
          preferredProvider: 'ipinfo',
          acknowledgedAt: 'not-a-date',
        },
        cache: {
          ip: '192.0.2.1',
          ipVersion: 4,
          countryCode: 'US',
          latitude: '37.5',
          providerId: 'ipinfo',
          fetchedAt: 'not-a-date',
        },
        cooldowns: {
          ipinfo: 1e300,
          freeipapi: Number.NaN,
          ipwhois: now - 1,
        },
      }),
    );

    await expect(loadPersistedState()).resolves.toEqual({
      settings: {
        preferredProvider: 'ipinfo',
        acknowledgedAt: null,
      },
      cache: null,
      providerCooldowns: {},
    });
  });

  test('rejects cache values with oversized optional fields', async () => {
    mockMultiGet.mockResolvedValue(
      persistedEntries({
        cache: {
          ip: '8.8.8.8',
          ipVersion: 4,
          countryCode: 'US',
          city: 'x'.repeat(513),
          providerId: 'ipinfo',
          fetchedAt: '2026-07-24T09:59:00.000Z',
        },
      }),
    );

    expect((await loadPersistedState()).cache).toBeNull();
  });
});
