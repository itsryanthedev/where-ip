import {
  countryCodeToFlag,
  formatCountdown,
  formatLocation,
  inferIpVersion,
  isUsablePublicIp,
} from '@/utils/ip';

describe('IP utilities', () => {
  test('identifies IPv4 and IPv6 addresses', () => {
    expect(inferIpVersion('8.8.8.8')).toBe(4);
    expect(inferIpVersion('2606:4700:4700::1111')).toBe(6);
    expect(inferIpVersion('not-an-ip')).toBeNull();
  });

  test('rejects private and loopback addresses', () => {
    expect(isUsablePublicIp('192.168.1.2')).toBe(false);
    expect(isUsablePublicIp('127.0.0.1')).toBe(false);
    expect(isUsablePublicIp('::1')).toBe(false);
    expect(isUsablePublicIp('fd00::1')).toBe(false);
    expect(isUsablePublicIp('fe80::1')).toBe(false);
    expect(isUsablePublicIp('ff02::1')).toBe(false);
    expect(isUsablePublicIp('1.1.1.1')).toBe(true);
  });

  test('rejects special-purpose addresses that are not globally reachable', () => {
    expect(isUsablePublicIp('100.64.0.1')).toBe(false);
    expect(isUsablePublicIp('192.0.2.1')).toBe(false);
    expect(isUsablePublicIp('198.18.0.1')).toBe(false);
    expect(isUsablePublicIp('198.51.100.1')).toBe(false);
    expect(isUsablePublicIp('203.0.113.1')).toBe(false);
    expect(isUsablePublicIp('2001:2::1')).toBe(false);
    expect(isUsablePublicIp('2001:db8::1')).toBe(false);
    expect(isUsablePublicIp('3fff::1')).toBe(false);
    expect(isUsablePublicIp('2606:4700:4700::1111')).toBe(true);
  });

  test('rejects malformed IPv6 addresses', () => {
    expect(inferIpVersion('1:2:3:4:5:6:7:')).toBeNull();
    expect(inferIpVersion('1:2:3:4:5:6:7:8:9')).toBeNull();
    expect(inferIpVersion('1:2:3::4::5')).toBeNull();
  });

  test('turns ISO country codes into flags', () => {
    expect(countryCodeToFlag('my')).toBe('🇲🇾');
    expect(countryCodeToFlag(undefined)).toBe('🌐');
  });

  test('formats location without duplicate values', () => {
    expect(formatLocation('Singapore', 'Singapore', 'Singapore')).toBe('Singapore');
    expect(formatLocation(undefined, undefined, undefined)).toBe('Unavailable');
  });

  test('formats a stable minute countdown', () => {
    expect(formatCountdown(60_000)).toBe('1:00');
    expect(formatCountdown(9_100)).toBe('0:10');
    expect(formatCountdown(-100)).toBe('0:00');
  });
});
