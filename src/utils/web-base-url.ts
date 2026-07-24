/**
 * Build a path that respects Expo's experiments.baseUrl (EXPO_BASE_URL).
 * Root deployments use an empty base; GitHub Pages uses `/where-ip`.
 */
export function withWebBaseUrl(path: string): string {
  const base = (process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
