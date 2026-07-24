import type { IpVersion } from '@/types/ip';

export function countryCodeToFlag(countryCode?: string): string {
  const normalized = countryCode?.trim().toUpperCase();
  if (!normalized || !/^[A-Z]{2}$/.test(normalized)) {
    return '🌐';
  }

  return String.fromCodePoint(
    ...[...normalized].map((character) => character.charCodeAt(0) + 127397),
  );
}

export function inferIpVersion(ip: string): IpVersion | null {
  if (isValidIpv4(ip)) {
    return 4;
  }

  if (isValidIpv6(ip)) {
    return 6;
  }

  return null;
}

export function isUsablePublicIp(ip: string): boolean {
  const version = inferIpVersion(ip);
  if (version === 4) {
    const address = ipv4ToNumber(ip);
    return !NON_PUBLIC_IPV4_RANGES.some(([network, prefixLength]) =>
      isIpv4InCidr(address, network, prefixLength),
    );
  }

  if (version === 6) {
    const address = ipv6ToBigInt(ip);
    return (
      isIpv6InCidr(address, ipv6ToBigInt('2000::'), 3) &&
      !NON_PUBLIC_IPV6_RANGES.some(([network, prefixLength]) =>
        isIpv6InCidr(address, ipv6ToBigInt(network), prefixLength),
      )
    );
  }

  return false;
}

const NON_PUBLIC_IPV4_RANGES: readonly (readonly [string, number])[] = [
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

const NON_PUBLIC_IPV6_RANGES: readonly (readonly [string, number])[] = [
  ['2001:2::', 48],
  ['2001:10::', 28],
  ['2001:20::', 28],
  ['2001:db8::', 32],
  ['3fff::', 20],
];

function ipv4ToNumber(ip: string): number {
  return ip
    .split('.')
    .map(Number)
    .reduce((value, octet) => value * 256 + octet, 0);
}

function isIpv4InCidr(
  address: number,
  network: string,
  prefixLength: number,
): boolean {
  const blockSize = 2 ** (32 - prefixLength);
  return Math.floor(address / blockSize) === Math.floor(ipv4ToNumber(network) / blockSize);
}

function ipv6ToBigInt(ip: string): bigint {
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

function isIpv6InCidr(
  address: bigint,
  network: bigint,
  prefixLength: number,
): boolean {
  const shift = BigInt(128 - prefixLength);
  return address >> shift === network >> shift;
}

export function formatLocation(
  city?: string,
  region?: string,
  countryName?: string,
): string {
  const values = [city, region, countryName].filter(
    (value, index, all): value is string =>
      Boolean(value) && all.findIndex((candidate) => candidate === value) === index,
  );
  return values.length > 0 ? values.join(', ') : 'Unavailable';
}

export function formatLookupTime(isoDate?: string): string {
  if (!isoDate) {
    return 'Not checked yet';
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function isValidIpv4(ip: string): boolean {
  const parts = ip.split('.');
  return (
    parts.length === 4 &&
    parts.every((part) => {
      if (!/^\d{1,3}$/.test(part)) {
        return false;
      }
      const value = Number(part);
      return value >= 0 && value <= 255 && String(value) === part.replace(/^0+(?=\d)/, '');
    })
  );
}

function isValidIpv6(ip: string): boolean {
  if (!ip.includes(':') || ip.includes('.') || !/^[0-9a-fA-F:]+$/.test(ip)) {
    return false;
  }

  const doubleColonCount = (ip.match(/::/g) ?? []).length;
  if (doubleColonCount > 1) {
    return false;
  }

  const validSection = (section: string) => /^[0-9a-fA-F]{1,4}$/.test(section);

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
