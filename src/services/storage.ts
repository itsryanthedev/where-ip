import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_PROVIDER_ID,
  isProviderId,
  MAX_PROVIDER_COOLDOWN_MS,
  MAX_PROVIDER_TEXT_LENGTH,
} from '@/constants/providers';
import type { IpResult, ProviderCooldowns, ProviderId } from '@/types/ip';
import { inferIpVersion, isUsablePublicIp } from '@/utils/ip';

const SETTINGS_KEY = '@where-ip/settings-v1';
const CACHE_KEY = '@where-ip/cache-v1';
const COOLDOWNS_KEY = '@where-ip/provider-cooldowns-v1';

export type PersistedSettings = {
  preferredProvider: ProviderId;
  acknowledgedAt: string | null;
};

export type PersistedState = {
  settings: PersistedSettings;
  cache: IpResult | null;
  providerCooldowns: ProviderCooldowns;
};

export async function loadPersistedState(): Promise<PersistedState> {
  try {
    const entries = await AsyncStorage.multiGet([
      SETTINGS_KEY,
      CACHE_KEY,
      COOLDOWNS_KEY,
    ]);
    const values = Object.fromEntries(entries);

    return {
      settings: parseSettings(values[SETTINGS_KEY]),
      cache: parseCache(values[CACHE_KEY]),
      providerCooldowns: parseCooldowns(values[COOLDOWNS_KEY]),
    };
  } catch {
    return defaultState();
  }
}

export async function saveSettings(settings: PersistedSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function saveCache(result: IpResult): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(result));
}

export async function saveProviderCooldowns(
  cooldowns: ProviderCooldowns,
): Promise<void> {
  await AsyncStorage.setItem(COOLDOWNS_KEY, JSON.stringify(cooldowns));
}

function defaultState(): PersistedState {
  return {
    settings: {
      preferredProvider: DEFAULT_PROVIDER_ID,
      acknowledgedAt: null,
    },
    cache: null,
    providerCooldowns: {},
  };
}

function parseSettings(raw?: string | null): PersistedSettings {
  if (!raw) {
    return defaultState().settings;
  }

  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) {
      return defaultState().settings;
    }

    return {
      preferredProvider: isProviderId(value.preferredProvider)
        ? value.preferredProvider
        : DEFAULT_PROVIDER_ID,
      acknowledgedAt:
        isCanonicalIsoDate(value.acknowledgedAt) ? value.acknowledgedAt : null,
    };
  } catch {
    return defaultState().settings;
  }
}

function parseCache(raw?: string | null): IpResult | null {
  if (!raw) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(raw);
    return isIpResult(value) ? value : null;
  } catch {
    return null;
  }
}

function parseCooldowns(raw?: string | null): ProviderCooldowns {
  if (!raw) {
    return {};
  }

  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) {
      return {};
    }

    const now = Date.now();
    return Object.fromEntries(
      Object.entries(value).filter(
        ([key, cooldown]) =>
          isProviderId(key) &&
          typeof cooldown === 'number' &&
          Number.isFinite(cooldown) &&
          cooldown > now &&
          cooldown <= now + MAX_PROVIDER_COOLDOWN_MS,
      ),
    ) as ProviderCooldowns;
  } catch {
    return {};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIpResult(value: unknown): value is IpResult {
  if (
    !isRecord(value) ||
    typeof value.ip !== 'string' ||
    !isUsablePublicIp(value.ip) ||
    (value.ipVersion !== 4 && value.ipVersion !== 6) ||
    inferIpVersion(value.ip) !== value.ipVersion ||
    typeof value.countryCode !== 'string' ||
    !/^[A-Z]{2}$/.test(value.countryCode) ||
    !isProviderId(value.providerId) ||
    !isCanonicalIsoDate(value.fetchedAt)
  ) {
    return false;
  }

  const stringFields = [
    'countryName',
    'city',
    'region',
    'postalCode',
    'timezone',
    'asn',
    'organization',
    'isp',
  ] as const;
  if (
    stringFields.some(
      (field) =>
        value[field] !== undefined &&
        (typeof value[field] !== 'string' ||
          value[field].length > MAX_PROVIDER_TEXT_LENGTH),
    )
  ) {
    return false;
  }

  return (
    isOptionalCoordinate(value.latitude, -90, 90) &&
    isOptionalCoordinate(value.longitude, -180, 180)
  );
}

function isOptionalCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
): boolean {
  return (
    value === undefined ||
    (typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= minimum &&
      value <= maximum)
  );
}

function isCanonicalIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString() === value
  );
}
