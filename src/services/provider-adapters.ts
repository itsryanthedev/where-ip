import { getProvider } from '@/constants/providers';
import type { IpResult, ProviderId } from '@/types/ip';
import { inferIpVersion, isUsablePublicIp } from '@/utils/ip';

type UnknownRecord = Record<string, unknown>;

export class InvalidProviderResponseError extends Error {
  constructor(providerId: ProviderId, message: string) {
    super(`${getProvider(providerId).name} returned unusable data: ${message}`);
    this.name = 'InvalidProviderResponseError';
  }
}

export function parseProviderResponse(
  providerId: ProviderId,
  payload: unknown,
  fetchedAt = new Date().toISOString(),
): IpResult {
  switch (providerId) {
    case 'ipinfo':
      return parseIpinfo(payload, fetchedAt);
    case 'freeipapi':
      return parseFreeIpApi(payload, fetchedAt);
    case 'ipwhois':
      return parseIpWhois(payload, fetchedAt);
  }
}

export function parseIpinfo(payload: unknown, fetchedAt: string): IpResult {
  const data = asRecord(payload, 'ipinfo');
  const ip = requiredString(data.ip, 'ipinfo', 'IP address');
  const [latitude, longitude] = optionalString(data.loc)?.split(',').map(Number) ?? [];
  const org = optionalString(data.org);
  const orgParts = org?.match(/^(AS\d+)\s+(.+)$/);

  return validatedResult({
    ip,
    countryCode: requiredString(data.country, 'ipinfo', 'country code'),
    city: optionalString(data.city),
    region: optionalString(data.region),
    postalCode: optionalString(data.postal),
    timezone: optionalString(data.timezone),
    latitude: finiteNumber(latitude),
    longitude: finiteNumber(longitude),
    asn: orgParts?.[1],
    organization: orgParts?.[2] ?? org,
    providerId: 'ipinfo',
    fetchedAt,
  });
}

export function parseFreeIpApi(payload: unknown, fetchedAt: string): IpResult {
  const data = asRecord(payload, 'freeipapi');

  return validatedResult({
    ip: requiredString(data.ipAddress, 'freeipapi', 'IP address'),
    countryCode: requiredString(data.countryCode, 'freeipapi', 'country code'),
    countryName: optionalString(data.countryName),
    city: optionalString(data.cityName),
    region: optionalString(data.regionName),
    postalCode: optionalString(data.zipCode),
    timezone: optionalString(Array.isArray(data.timeZones) ? data.timeZones[0] : undefined),
    latitude: finiteNumber(data.latitude),
    longitude: finiteNumber(data.longitude),
    asn: optionalString(data.asn) ?? optionalNumberString(data.asn),
    organization: optionalString(data.asnOrganization),
    providerId: 'freeipapi',
    fetchedAt,
  });
}

export function parseIpWhois(payload: unknown, fetchedAt: string): IpResult {
  const data = asRecord(payload, 'ipwhois');
  if (data.success === false) {
    throw new InvalidProviderResponseError(
      'ipwhois',
      optionalString(data.message) ?? 'request was rejected',
    );
  }
  const connection = isRecord(data.connection) ? data.connection : {};

  return validatedResult({
    ip: requiredString(data.ip, 'ipwhois', 'IP address'),
    countryCode: requiredString(data.country_code, 'ipwhois', 'country code'),
    countryName: optionalString(data.country),
    city: optionalString(data.city),
    region: optionalString(data.region),
    postalCode: optionalString(data.postal),
    timezone: isRecord(data.timezone) ? optionalString(data.timezone.id) : undefined,
    latitude: finiteNumber(data.latitude),
    longitude: finiteNumber(data.longitude),
    asn:
      optionalString(connection.asn) ??
      (typeof connection.asn === 'number' ? `AS${connection.asn}` : undefined),
    organization: optionalString(connection.org),
    isp: optionalString(connection.isp),
    providerId: 'ipwhois',
    fetchedAt,
  });
}

function validatedResult(
  result: Omit<IpResult, 'ipVersion'> & { ipVersion?: IpResult['ipVersion'] },
): IpResult {
  if (!isUsablePublicIp(result.ip)) {
    throw new InvalidProviderResponseError(result.providerId, 'invalid public IP address');
  }

  const ipVersion = result.ipVersion ?? inferIpVersion(result.ip);
  if (!ipVersion) {
    throw new InvalidProviderResponseError(result.providerId, 'unknown IP version');
  }

  const countryCode = result.countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new InvalidProviderResponseError(result.providerId, 'invalid country code');
  }

  return {
    ...result,
    countryCode,
    ipVersion,
  };
}

function asRecord(value: unknown, providerId: ProviderId): UnknownRecord {
  if (!isRecord(value)) {
    throw new InvalidProviderResponseError(providerId, 'response was not an object');
  }
  return value;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, providerId: ProviderId, field: string): string {
  const parsed = optionalString(value);
  if (!parsed) {
    throw new InvalidProviderResponseError(providerId, `missing ${field}`);
  }
  return parsed;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function optionalNumberString(value: unknown): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

