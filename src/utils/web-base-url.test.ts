import { withWebBaseUrl } from '@/utils/web-base-url';

describe('withWebBaseUrl', () => {
  const original = process.env.EXPO_BASE_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.EXPO_BASE_URL;
    } else {
      process.env.EXPO_BASE_URL = original;
    }
  });

  test('keeps root-relative paths when base is empty', () => {
    delete process.env.EXPO_BASE_URL;
    expect(withWebBaseUrl('/favicon.svg')).toBe('/favicon.svg');
  });

  test('prefixes the Expo base URL', () => {
    process.env.EXPO_BASE_URL = '/where-ip';
    expect(withWebBaseUrl('/og-image.png')).toBe('/where-ip/og-image.png');
  });

  test('strips a trailing slash from the base', () => {
    process.env.EXPO_BASE_URL = '/where-ip/';
    expect(withWebBaseUrl('/site.webmanifest')).toBe(
      '/where-ip/site.webmanifest',
    );
  });
});
