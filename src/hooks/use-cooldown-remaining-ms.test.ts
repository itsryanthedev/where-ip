import { act, renderHook } from '@testing-library/react-native';

import { REFRESH_COOLDOWN_MS } from '@/constants/providers';
import {
  getCooldownRemainingMs,
  useCooldownRemainingMs,
} from '@/hooks/use-cooldown-remaining-ms';
import { formatCountdown } from '@/utils/ip';

describe('getCooldownRemainingMs', () => {
  test('returns the full cooldown for a just-fetched result', () => {
    const fetchedAt = '2026-07-25T12:00:00.000Z';
    const now = Date.parse(fetchedAt);

    expect(getCooldownRemainingMs(fetchedAt, now)).toBe(REFRESH_COOLDOWN_MS);
  });

  test('counts down and reaches zero at the cooldown boundary', () => {
    const fetchedAt = '2026-07-25T12:00:00.000Z';
    const fetchedAtMs = Date.parse(fetchedAt);

    expect(
      getCooldownRemainingMs(fetchedAt, fetchedAtMs + 3_000),
    ).toBe(57_000);
    expect(
      getCooldownRemainingMs(fetchedAt, fetchedAtMs + REFRESH_COOLDOWN_MS),
    ).toBe(0);
    expect(
      getCooldownRemainingMs(fetchedAt, fetchedAtMs + REFRESH_COOLDOWN_MS + 5_000),
    ).toBe(0);
  });

  test('never exceeds one minute when now is stale relative to fetchedAt', () => {
    // Reproduces the provider-switch edge case: the countdown interval stops at
    // Ready, `now` freezes, real time keeps moving, then a fresh lookup lands.
    const previousFetchedAtMs = Date.parse('2026-07-25T12:00:00.000Z');
    const staleNow = previousFetchedAtMs + REFRESH_COOLDOWN_MS;
    const idleAfterReadyMs = 59_000;
    const newFetchedAt = new Date(
      previousFetchedAtMs + REFRESH_COOLDOWN_MS + idleAfterReadyMs,
    ).toISOString();

    const remainingMs = getCooldownRemainingMs(newFetchedAt, staleNow);

    expect(remainingMs).toBeLessThanOrEqual(REFRESH_COOLDOWN_MS);
    expect(formatCountdown(remainingMs)).toBe('1:00');
    // Without the cap this would be 119_000 → "1:59".
    expect(formatCountdown(remainingMs)).not.toBe('1:59');
  });

  test('caps long-stale clocks that would otherwise show multi-minute countdowns', () => {
    const previousFetchedAtMs = Date.parse('2026-07-25T12:00:00.000Z');
    const staleNow = previousFetchedAtMs + REFRESH_COOLDOWN_MS;
    const newFetchedAt = new Date(
      previousFetchedAtMs + REFRESH_COOLDOWN_MS + 99_000,
    ).toISOString();

    const remainingMs = getCooldownRemainingMs(newFetchedAt, staleNow);

    expect(remainingMs).toBe(REFRESH_COOLDOWN_MS);
    expect(formatCountdown(remainingMs)).toBe('1:00');
    expect(formatCountdown(remainingMs)).not.toBe('2:39');
  });
});

describe('useCooldownRemainingMs', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('resets the clock when fetchedAt changes after Ready', async () => {
    const t0 = Date.parse('2026-07-25T12:00:00.000Z');
    jest.setSystemTime(t0);

    const { result, rerender } = await renderHook(
      ({ fetchedAt }: { fetchedAt: string | null }) =>
        useCooldownRemainingMs(fetchedAt),
      {
        initialProps: { fetchedAt: new Date(t0).toISOString() },
      },
    );

    expect(result.current).toBe(REFRESH_COOLDOWN_MS);

    await act(() => {
      jest.setSystemTime(t0 + REFRESH_COOLDOWN_MS);
      jest.advanceTimersByTime(REFRESH_COOLDOWN_MS);
    });
    expect(result.current).toBe(0);

    const idleAfterReadyMs = 59_000;
    const nextFetchedAtMs = t0 + REFRESH_COOLDOWN_MS + idleAfterReadyMs;
    await act(() => {
      jest.setSystemTime(nextFetchedAtMs);
    });

    await rerender({ fetchedAt: new Date(nextFetchedAtMs).toISOString() });

    expect(result.current).toBeLessThanOrEqual(REFRESH_COOLDOWN_MS);
    expect(formatCountdown(result.current)).toBe('1:00');
    expect(formatCountdown(result.current)).not.toBe('1:59');
  });
});
