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
    const [a, b] = ip.split('.').map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }

  if (version === 6) {
    const normalized = ip.toLowerCase();
    const firstSection = Number.parseInt(normalized.split(':')[0] || '0', 16);
    return !(
      normalized === '::' ||
      normalized === '::1' ||
      (firstSection & 0xfe00) === 0xfc00 ||
      (firstSection & 0xffc0) === 0xfe80 ||
      (firstSection & 0xff00) === 0xff00
    );
  }

  return false;
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
