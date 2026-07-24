import { useEffect, useState } from 'react';

import { REFRESH_COOLDOWN_MS } from '@/constants/providers';

export function getCooldownRemainingMs(
  fetchedAt: string | null | undefined,
  now = Date.now(),
): number {
  if (!fetchedAt) {
    return 0;
  }

  return Math.max(0, REFRESH_COOLDOWN_MS - (now - Date.parse(fetchedAt)));
}

/**
 * Local 1s tick for countdown UI. Keep this off shared context so the rest of
 * the tree does not rerender every second.
 */
export function useCooldownRemainingMs(
  fetchedAt: string | null | undefined,
): number {
  const [now, setNow] = useState(() => Date.now());
  const remainingMs = getCooldownRemainingMs(fetchedAt, now);
  const isCoolingDown = remainingMs > 0;

  useEffect(() => {
    if (!fetchedAt || !isCoolingDown) {
      return;
    }

    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [fetchedAt, isCoolingDown]);

  return remainingMs;
}
