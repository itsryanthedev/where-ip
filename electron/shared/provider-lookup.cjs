'use strict';

const {
  getProvider,
  isProviderId,
  MAX_PROVIDER_RESPONSE_BYTES,
  MAX_PROVIDER_TEXT_LENGTH,
  PROVIDER_TIMEOUT_MS,
} = require('../shared/providers.cjs');

/**
 * Keep the shell-side validator behaviorally aligned with src/utils/ip.ts.
 * Provider responses are untrusted input even though their endpoints are
 * allowlisted.
 *
 * @param {string} ip
 * @returns {4 | 6 | null}
 */
function inferIpVersion(ip) {
  if (typeof ip !== 'string') {
    return null;
  }

  if (isValidIpv4(ip)) {
    return 4;
  }
  if (isValidIpv6(ip)) {
    return 6;
  }
  return null;
}

/**
 * @param {string} ip
 */
function isUsablePublicIp(ip) {
  const version = inferIpVersion(ip);
  if (version === 4) {
    const address = ipv4ToNumber(ip);
    if (
      PUBLIC_IPV4_CARVE_OUTS.some(([network, prefixLength]) =>
        isIpv4InCidr(address, network, prefixLength),
      )
    ) {
      return true;
    }
    return !NON_PUBLIC_IPV4_RANGES.some(([network, prefixLength]) =>
      isIpv4InCidr(address, network, prefixLength),
    );
  }

  if (version === 6) {
    const address = ipv6ToBigInt(ip);
    if (!isIpv6InCidr(address, ipv6ToBigInt('2000::'), 3)) {
      return false;
    }

    if (
      PUBLIC_IPV6_CARVE_OUTS.some(([network, prefixLength]) =>
        isIpv6InCidr(address, ipv6ToBigInt(network), prefixLength),
      )
    ) {
      return true;
    }

    return !NON_PUBLIC_IPV6_RANGES.some(([network, prefixLength]) =>
      isIpv6InCidr(address, ipv6ToBigInt(network), prefixLength),
    );
  }

  return false;
}

const NON_PUBLIC_IPV4_RANGES = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 3],
];

// 192.0.0.0/24 is special-use; keep IANA globally reachable AS112 exceptions.
const PUBLIC_IPV4_CARVE_OUTS = [
  ['192.0.0.9', 32],
  ['192.0.0.10', 32],
];

const PUBLIC_IPV6_CARVE_OUTS = [
  ['2001:1::1', 128],
  ['2001:1::2', 128],
  ['2001:1::3', 128],
  ['2001:3::', 32],
  ['2001:4:112::', 48],
];

const NON_PUBLIC_IPV6_RANGES = [
  ['2001::', 23],
  ['2001:db8::', 32],
  ['3fff::', 20],
];

function isValidIpv4(ip) {
  const parts = ip.split('.');
  return (
    parts.length === 4 &&
    parts.every((part) => {
      if (!/^\d{1,3}$/.test(part)) return false;
      const value = Number(part);
      return value >= 0 && value <= 255 && String(value) === part;
    })
  );
}

function isValidIpv6(ip) {
  if (!ip.includes(':') || ip.includes('.') || !/^[0-9a-fA-F:]+$/.test(ip)) {
    return false;
  }

  const doubleColonCount = (ip.match(/::/g) || []).length;
  if (doubleColonCount > 1) return false;

  const validSection = (section) => /^[0-9a-fA-F]{1,4}$/.test(section);
  if (doubleColonCount === 0) {
    const sections = ip.split(':');
    return sections.length === 8 && sections.every(validSection);
  }

  const [left = '', right = ''] = ip.split('::');
  const leftSections = left ? left.split(':') : [];
  const rightSections = right ? right.split(':') : [];
  return (
    leftSections.every(validSection) &&
    rightSections.every(validSection) &&
    leftSections.length + rightSections.length < 8
  );
}

function ipv4ToNumber(ip) {
  return ip.split('.').map(Number).reduce((value, octet) => value * 256 + octet, 0);
}

function isIpv4InCidr(address, network, prefixLength) {
  const blockSize = 2 ** (32 - prefixLength);
  return Math.floor(address / blockSize) === Math.floor(ipv4ToNumber(network) / blockSize);
}

function ipv6ToBigInt(ip) {
  const [left = '', right = ''] = ip.split('::');
  const leftSections = left ? left.split(':') : [];
  const rightSections = right ? right.split(':') : [];
  const missingSections = 8 - leftSections.length - rightSections.length;
  const sections = [
    ...leftSections,
    ...Array.from({ length: missingSections }, () => '0'),
    ...rightSections,
  ];
  return sections.reduce(
    (value, section) => (value << 16n) | BigInt(Number.parseInt(section, 16)),
    0n,
  );
}

function isIpv6InCidr(address, network, prefixLength) {
  const shift = BigInt(128 - prefixLength);
  return address >> shift === network >> shift;
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

    const text = await readBoundedResponseText(response, provider.name);

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

async function readBoundedResponseText(response, providerName) {
  if (!response.body || typeof response.body.getReader !== 'function') {
    throw new Error(`${providerName} response body could not be bounded`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_PROVIDER_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error(`${providerName} returned an oversized response`);
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

module.exports = {
  lookupPublicIp,
  parseProviderResponse,
  isUsablePublicIp,
  inferIpVersion,
  readBoundedResponseText,
};
