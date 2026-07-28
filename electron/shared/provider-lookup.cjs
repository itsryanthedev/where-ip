'use strict';

const {
  getProvider,
  isProviderId,
  MAX_PROVIDER_RESPONSE_BYTES,
  MAX_PROVIDER_TEXT_LENGTH,
  PROVIDER_TIMEOUT_MS,
} = require('../shared/providers.cjs');

/**
 * Minimal public-IP validation mirrored from src/utils/ip.ts (IPv4 focus for
 * allowlisted provider payloads). Full parity is enforced via the shared
 * parser rules below.
 *
 * @param {string} ip
 * @returns {4 | 6 | null}
 */
function inferIpVersion(ip) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    return 4;
  }
  if (ip.includes(':')) {
    return 6;
  }
  return null;
}

/**
 * @param {string} ip
 */
function isUsablePublicIp(ip) {
  const version = inferIpVersion(ip);
  if (version === null) {
    return false;
  }
  if (version === 6) {
    const normalized = ip.toLowerCase();
    return (
      !normalized.startsWith('::1') &&
      !normalized.startsWith('fc') &&
      !normalized.startsWith('fd') &&
      !normalized.startsWith('fe80')
    );
  }

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) {
    return false;
  }
  if (a === 169 && b === 254) {
    return false;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return false;
  }
  if (a === 192 && b === 168) {
    return false;
  }
  if (a >= 224) {
    return false;
  }
  return true;
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function asRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @param {number} [maxLength]
 * @returns {string | undefined}
 */
function optionalString(value, maxLength = MAX_PROVIDER_TEXT_LENGTH) {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) {
    return undefined;
  }
  return trimmed;
}

/**
 * @param {unknown} value
 * @param {string} field
 * @returns {string}
 */
function requiredString(value, field) {
  const normalized = optionalString(value);
  if (!normalized) {
    throw new Error(`Missing ${field}`);
  }
  return normalized;
}

/**
 * @param {Record<string, unknown>} partial
 */
function validatedResult(partial) {
  if (!isUsablePublicIp(partial.ip)) {
    throw new Error('IP address is not a usable public address');
  }
  const ipVersion = inferIpVersion(partial.ip);
  if (ipVersion === null) {
    throw new Error('IP address version is invalid');
  }
  return {
    ...partial,
    ipVersion,
  };
}

/**
 * @param {unknown} payload
 * @param {string} fetchedAt
 * @param {'ipinfo'} providerId
 */
function parseIpinfo(payload, fetchedAt, providerId) {
  if (!asRecord(payload)) {
    throw new Error('Response was not an object');
  }
  const ip = requiredString(payload.ip, 'IP address');
  const loc = optionalString(payload.loc);
  const [latitude, longitude] =
    loc?.split(',').map((part) => Number(part)) ?? [];
  const org = optionalString(payload.org);
  const orgParts = org?.match(/^(AS\d+)\s+(.+)$/);

  return validatedResult({
    ip,
    countryCode: requiredString(payload.country, 'country code').toUpperCase(),
    city: optionalString(payload.city),
    region: optionalString(payload.region),
    postalCode: optionalString(payload.postal),
    timezone: optionalString(payload.timezone),
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    asn: orgParts?.[1],
    organization: orgParts?.[2] ?? org,
    providerId,
    fetchedAt,
  });
}

/**
 * @param {unknown} payload
 * @param {string} fetchedAt
 * @param {'freeipapi'} providerId
 */
function parseFreeIpApi(payload, fetchedAt, providerId) {
  if (!asRecord(payload)) {
    throw new Error('Response was not an object');
  }
  const ip = requiredString(
    payload.ipAddress ?? payload.ip,
    'IP address',
  );

  return validatedResult({
    ip,
    countryCode: requiredString(
      payload.countryCode,
      'country code',
    ).toUpperCase(),
    countryName: optionalString(payload.countryName),
    city: optionalString(payload.cityName ?? payload.city),
    region: optionalString(payload.regionName ?? payload.region),
    postalCode: optionalString(payload.zipCode ?? payload.postalCode),
    timezone: optionalString(payload.timeZone ?? payload.timezone),
    latitude:
      typeof payload.latitude === 'number' ? payload.latitude : undefined,
    longitude:
      typeof payload.longitude === 'number' ? payload.longitude : undefined,
    asn:
      typeof payload.asn === 'number'
        ? `AS${payload.asn}`
        : optionalString(payload.asn),
    organization: optionalString(
      payload.organization ?? payload.orgName ?? payload.org,
    ),
    isp: optionalString(payload.isp),
    providerId,
    fetchedAt,
  });
}

/**
 * @param {unknown} payload
 * @param {string} fetchedAt
 * @param {'ipwhois'} providerId
 */
function parseIpWhois(payload, fetchedAt, providerId) {
  if (!asRecord(payload)) {
    throw new Error('Response was not an object');
  }
  if (payload.success === false) {
    throw new Error('Provider reported failure');
  }
  const ip = requiredString(payload.ip, 'IP address');
  const connection = asRecord(payload.connection) ? payload.connection : {};

  return validatedResult({
    ip,
    countryCode: requiredString(
      payload.country_code ?? payload.countryCode,
      'country code',
    ).toUpperCase(),
    countryName: optionalString(payload.country),
    city: optionalString(payload.city),
    region: optionalString(payload.region),
    postalCode: optionalString(payload.postal),
    timezone: optionalString(
      asRecord(payload.timezone) ? payload.timezone.id : payload.timezone,
    ),
    latitude:
      typeof payload.latitude === 'number' ? payload.latitude : undefined,
    longitude:
      typeof payload.longitude === 'number' ? payload.longitude : undefined,
    asn:
      typeof connection.asn === 'number'
        ? `AS${connection.asn}`
        : optionalString(connection.asn),
    organization: optionalString(connection.org ?? connection.organization),
    isp: optionalString(connection.isp),
    providerId,
    fetchedAt,
  });
}

/**
 * @param {import('../shared/providers.cjs').ProviderId | string} providerId
 * @param {unknown} payload
 * @param {string} [fetchedAt]
 */
function parseProviderResponse(
  providerId,
  payload,
  fetchedAt = new Date().toISOString(),
) {
  if (!isProviderId(providerId)) {
    throw new Error('Unknown provider');
  }

  switch (providerId) {
    case 'ipinfo':
      return parseIpinfo(payload, fetchedAt, providerId);
    case 'freeipapi':
      return parseFreeIpApi(payload, fetchedAt, providerId);
    case 'ipwhois':
      return parseIpWhois(payload, fetchedAt, providerId);
    default: {
      const _exhaustive = providerId;
      throw new Error(`Unhandled provider: ${_exhaustive}`);
    }
  }
}

/**
 * Fetch and parse a single allowlisted provider in the main process.
 *
 * @param {unknown} providerId
 */
async function lookupPublicIp(providerId) {
  if (!isProviderId(providerId)) {
    throw new Error('Unknown provider');
  }

  const provider = getProvider(providerId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(provider.endpoint, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      redirect: 'error',
    });

    if (!response.ok) {
      throw new Error(`${provider.name} returned HTTP ${response.status}`);
    }

    const contentLength = Number(response.headers.get('content-length'));
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_PROVIDER_RESPONSE_BYTES
    ) {
      throw new Error(`${provider.name} returned an oversized response`);
    }

    const text = await response.text();
    if (text.length > MAX_PROVIDER_RESPONSE_BYTES) {
      throw new Error(`${provider.name} returned an oversized response`);
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`${provider.name} returned invalid JSON`);
    }

    return parseProviderResponse(providerId, payload);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  lookupPublicIp,
  parseProviderResponse,
  isUsablePublicIp,
  inferIpVersion,
};
