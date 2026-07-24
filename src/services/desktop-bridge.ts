import * as Linking from 'expo-linking';

import type { DesktopLinkId } from '@/constants/links';
import type { IpResult, ProviderId } from '@/types/ip';

export type DesktopBridge = {
  lookupPublicIp: (providerId: ProviderId) => Promise<IpResult>;
  openExternalLink: (linkId: DesktopLinkId) => Promise<void>;
  getAppVersion: () => string;
};

type WhereIpDesktopGlobal = {
  whereipDesktop?: DesktopBridge;
};

/**
 * Returns the Electron preload bridge when running inside the desktop shell.
 * Never imports electron — presence of the injected API is the only signal.
 */
export function getDesktopBridge(): DesktopBridge | null {
  const candidate = (globalThis as WhereIpDesktopGlobal).whereipDesktop;
  if (
    candidate &&
    typeof candidate.lookupPublicIp === 'function' &&
    typeof candidate.openExternalLink === 'function' &&
    typeof candidate.getAppVersion === 'function'
  ) {
    return candidate;
  }
  return null;
}

export function getAppVersion(fallback: string): string {
  const bridge = getDesktopBridge();
  if (bridge) {
    try {
      const version = bridge.getAppVersion();
      if (typeof version === 'string' && version.length > 0) {
        return version;
      }
    } catch {
      // Fall through to the Expo / package fallback.
    }
  }
  return fallback;
}

export async function openExternalHref(
  href: string,
  linkId?: DesktopLinkId,
): Promise<void> {
  const bridge = getDesktopBridge();
  if (bridge && linkId) {
    await bridge.openExternalLink(linkId);
    return;
  }

  await Linking.openURL(href);
}
