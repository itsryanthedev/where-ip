import { useEffect, useState } from 'react';

import { REFRESH_COOLDOWN_MS } from '@/constants/providers';

export function getCooldownRemainingMs(
  fetchedAt: string | null | undefined,
  now = Date.now(),
): number {
  if (!fetchedAt) {
    return 0;
  }

  const elapsedMs = now - Date.parse(fetchedAt);
  if (!Number.isFinite(elapsedMs)) {
    return 0;
  }

  // Cap at the configured cooldown. A stale `now` (countdown interval stopped
  // at Ready while wall time kept moving) would otherwise report remaining >
  // REFRESH_COOLDOWN_MS — e.g. "1:59" or "2:39" after a provider-switch refresh.
  return Math.min(
    REFRESH_COOLDOWN_MS,
    Math.max(0, REFRESH_COOLDOWN_MS - elapsedMs),
  );
}

/**
 * Local 1s tick for countdown UI. Keep this off shared context so the rest of
 * the tree does not rerender every second.
 */
export function useCooldownRemainingMs(
  fetchedAt: string | null | undefined,
): number {
  const [now, setNow] = useState(() => Date.now());
  const [seenFetchedAt, setSeenFetchedAt] = useState(fetchedAt);

  // Adjust during render when fetchedAt changes (React-supported). Use the
  // prop's timestamp — not Date.now() — so render stays pure/idempotent.
  if (fetchedAt !== seenFetchedAt) {
    setSeenFetchedAt(fetchedAt);
    if (fetchedAt) {
      const fetchedAtMs = Date.parse(fetchedAt);
      if (Number.isFinite(fetchedAtMs)) {
        setNow(fetchedAtMs);
      }
    }
  }

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
