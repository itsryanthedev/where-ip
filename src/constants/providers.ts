import type { ProviderDefinition, ProviderId } from '@/types/ip';

export const PROVIDERS: readonly ProviderDefinition[] = [
  {
    id: 'ipwhois',
    name: 'ipwho.is',
    shortDescription: 'Default · detailed IP and connection fields',
    endpoint: 'https://ipwho.is/',
    documentationUrl: 'https://ipwhois.io/documentation',
    privacyUrl: 'https://ipwhois.io/privacy',
    termsUrl: 'https://ipwhois.io/terms',
  },
  {
    id: 'freeipapi',
    name: 'FreeIPAPI',
    shortDescription: 'Alternative · broad location and ASN fields',
    endpoint: 'https://free.freeipapi.com/api/json',
    documentationUrl: 'https://freeipapi.com/docs/api-reference/api-introduction',
    privacyUrl: 'https://freeipapi.com/privacy',
    termsUrl: 'https://freeipapi.com/terms',
  },
  {
    id: 'ipinfo',
    name: 'IPinfo',
    shortDescription: 'Alternative · concise public network information',
    endpoint: 'https://ipinfo.io/json',
    documentationUrl:
      'https://support.ipinfo.io/hc/en-us/articles/30792479436562-What-Is-the-Difference-Between-Using-the-Authenticated-Free-Plan-and-the-Public-API-With-No-Account',
    privacyUrl: 'https://ipinfo.io/privacy-policy',
    termsUrl: 'https://ipinfo.io/terms-of-service',
  },
] as const;

export const DEFAULT_PROVIDER_ID: ProviderId = 'ipwhois';

export const REFRESH_COOLDOWN_MS = 60_000;
export const CACHE_FRESHNESS_MS = 15 * 60_000;
export const PROVIDER_TIMEOUT_MS = 7_000;
export const FAILURE_RETRY_DELAY_MS = 15_000;
export const MAX_PROVIDER_COOLDOWN_MS = 60 * 60_000;
export const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024;
export const MAX_PROVIDER_TEXT_LENGTH = 512;

export function getProvider(providerId: ProviderId): ProviderDefinition {
  const provider = PROVIDERS.find(({ id }) => id === providerId);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return provider;
}

export function getProviderOrder(preferred: ProviderId): ProviderDefinition[] {
  const first = getProvider(preferred);
  return [first, ...PROVIDERS.filter(({ id }) => id !== preferred)];
}

export function isProviderId(value: unknown): value is ProviderId {
  return PROVIDERS.some(({ id }) => id === value);
}
