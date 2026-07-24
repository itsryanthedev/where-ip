import NetInfo from '@react-native-community/netinfo';
import {
  createContext,
  type PropsWithChildren,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  CACHE_FRESHNESS_MS,
  DEFAULT_PROVIDER_ID,
  REFRESH_COOLDOWN_MS,
} from '@/constants/providers';
import { getCooldownRemainingMs } from '@/hooks/use-cooldown-remaining-ms';
import {
  lookupPublicIp,
  LookupChainError,
} from '@/services/ip-lookup';
import {
  loadPersistedState,
  saveCache,
  saveProviderCooldowns,
  saveSettings,
} from '@/services/storage';
import type {
  IpResult,
  ProviderCooldowns,
  ProviderId,
} from '@/types/ip';

export type LookupStatus =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'success'
  | 'stale'
  | 'error';

type WhereIpContextValue = {
  isReady: boolean;
  acknowledgementRequired: boolean;
  acceptDisclosure: () => Promise<void>;
  result: IpResult | null;
  status: LookupStatus;
  errorMessage: string | null;
  fallbackFrom: ProviderId | null;
  preferredProvider: ProviderId;
  setPreferredProvider: (providerId: ProviderId) => Promise<void>;
  providerSwitchTarget: ProviderId | null;
  providerSwitchRefreshing: boolean;
  refresh: () => Promise<void>;
};

const WhereIpContext = createContext<WhereIpContextValue | null>(null);

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function WhereIpProvider({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = useState(false);
  const [acknowledgedAt, setAcknowledgedAt] = useState<string | null>(null);
  const [preferredProvider, setPreferredProviderState] =
    useState<ProviderId>(DEFAULT_PROVIDER_ID);
  const [providerCooldowns, setProviderCooldowns] =
    useState<ProviderCooldowns>({});
  const [result, setResult] = useState<IpResult | null>(null);
  const [status, setStatus] = useState<LookupStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackFrom, setFallbackFrom] = useState<ProviderId | null>(null);
  const [pendingProviderRefresh, setPendingProviderRefresh] =
    useState<ProviderId | null>(null);
  const [refreshingProvider, setRefreshingProvider] =
    useState<ProviderId | null>(null);

  const requestInFlight = useRef(false);
  const mountedRef = useRef(true);
  const providerSwitchTokenRef = useRef(0);
  const resultRef = useRef<IpResult | null>(null);
  const providerCooldownsRef = useRef<ProviderCooldowns>({});
  const preferredProviderRef = useRef<ProviderId>(DEFAULT_PROVIDER_ID);
  const acknowledgedAtRef = useRef<string | null>(null);

  resultRef.current = result;
  providerCooldownsRef.current = providerCooldowns;
  preferredProviderRef.current = preferredProvider;
  acknowledgedAtRef.current = acknowledgedAt;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      providerSwitchTokenRef.current += 1;
    };
  }, []);

  const performLookup = useCallback(async (
    manualRefresh = false,
    providerOverride?: ProviderId,
    options?: { skipAgeCheck?: boolean },
  ): Promise<boolean> => {
    if (requestInFlight.current) {
      return false;
    }

    const currentResult = resultRef.current;
    const currentCooldowns = providerCooldownsRef.current;
    if (!options?.skipAgeCheck) {
      const resultAge = currentResult
        ? Date.now() - Date.parse(currentResult.fetchedAt)
        : Infinity;
      const minimumAge = manualRefresh
        ? REFRESH_COOLDOWN_MS
        : CACHE_FRESHNESS_MS;
      if (resultAge < minimumAge) {
        return false;
      }
    }

    requestInFlight.current = true;
    setStatus(currentResult ? 'refreshing' : 'loading');
    setErrorMessage(null);

    try {
      const requestedProvider = providerOverride ?? preferredProviderRef.current;
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected === false) {
        throw new Error('You appear to be offline. Your last result is still available.');
      }

      const outcome = await lookupPublicIp({
        preferredProvider: requestedProvider,
        providerCooldowns: currentCooldowns,
      });

      setResult(outcome.result);
      setProviderCooldowns(outcome.providerCooldowns);
      setFallbackFrom(
        outcome.result.providerId === requestedProvider ? null : requestedProvider,
      );
      setStatus('success');

      await Promise.all([
        saveCache(outcome.result),
        saveProviderCooldowns(outcome.providerCooldowns),
      ]);
      return true;
    } catch (error) {
      const nextCooldowns =
        error instanceof LookupChainError
          ? error.providerCooldowns
          : providerCooldownsRef.current;
      setProviderCooldowns(nextCooldowns);
      setStatus(resultRef.current ? 'stale' : 'error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Your network information could not be loaded.',
      );
      await saveProviderCooldowns(nextCooldowns).catch(() => undefined);
      return true;
    } finally {
      requestInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    let active = true;

    loadPersistedState().then((persisted) => {
      if (!active) {
        return;
      }

      setPreferredProviderState(persisted.settings.preferredProvider);
      setAcknowledgedAt(persisted.settings.acknowledgedAt);
      setProviderCooldowns(persisted.providerCooldowns);
      setResult(persisted.cache);

      preferredProviderRef.current = persisted.settings.preferredProvider;
      acknowledgedAtRef.current = persisted.settings.acknowledgedAt;
      providerCooldownsRef.current = persisted.providerCooldowns;
      resultRef.current = persisted.cache;

      if (persisted.cache) {
        const age = Date.now() - Date.parse(persisted.cache.fetchedAt);
        setStatus(age <= CACHE_FRESHNESS_MS ? 'success' : 'stale');
      }

      setIsReady(true);

      if (persisted.settings.acknowledgedAt) {
        void performLookup(false);
      }
    });

    return () => {
      active = false;
    };
  }, [performLookup]);

  const acceptDisclosure = useCallback(async () => {
    const acceptedAt = new Date().toISOString();
    setAcknowledgedAt(acceptedAt);
    acknowledgedAtRef.current = acceptedAt;
    await saveSettings({
      acknowledgedAt: acceptedAt,
      preferredProvider: preferredProviderRef.current,
    }).catch(() => undefined);
    await performLookup(false);
  }, [performLookup]);

  const setPreferredProvider = useCallback(
    async (providerId: ProviderId) => {
      if (providerId === preferredProviderRef.current) {
        return;
      }

      const token = ++providerSwitchTokenRef.current;

      setPreferredProviderState(providerId);
      preferredProviderRef.current = providerId;
      setFallbackFrom(null);
      setPendingProviderRefresh(providerId);
      setRefreshingProvider(null);

      await saveSettings({
        acknowledgedAt: acknowledgedAtRef.current,
        preferredProvider: providerId,
      }).catch(() => undefined);

      let waitMs = getCooldownRemainingMs(resultRef.current?.fetchedAt);
      while (waitMs > 0) {
        await delay(waitMs);
        if (
          providerSwitchTokenRef.current !== token ||
          !mountedRef.current
        ) {
          return;
        }
        waitMs = getCooldownRemainingMs(resultRef.current?.fetchedAt);
      }

      if (
        providerSwitchTokenRef.current !== token ||
        !mountedRef.current
      ) {
        return;
      }

      setRefreshingProvider(providerId);

      try {
        await performLookup(true, providerId, { skipAgeCheck: true });
      } finally {
        if (providerSwitchTokenRef.current === token && mountedRef.current) {
          setPendingProviderRefresh((current) =>
            current === providerId ? null : current,
          );
          setRefreshingProvider((current) =>
            current === providerId ? null : current,
          );
        }
      }
    },
    [performLookup],
  );

  const refresh = useCallback(
    () => performLookup(true),
    [performLookup],
  );

  const value = useMemo<WhereIpContextValue>(
    () => ({
      isReady,
      acknowledgementRequired: isReady && !acknowledgedAt,
      acceptDisclosure,
      result,
      status,
      errorMessage,
      fallbackFrom,
      preferredProvider,
      setPreferredProvider,
      providerSwitchTarget: pendingProviderRefresh,
      providerSwitchRefreshing:
        refreshingProvider !== null &&
        refreshingProvider === pendingProviderRefresh,
      refresh,
    }),
    [
      acknowledgedAt,
      acceptDisclosure,
      errorMessage,
      fallbackFrom,
      isReady,
      pendingProviderRefresh,
      preferredProvider,
      refresh,
      refreshingProvider,
      result,
      setPreferredProvider,
      status,
    ],
  );

  return <WhereIpContext value={value}>{children}</WhereIpContext>;
}

export function useWhereIp(): WhereIpContextValue {
  const context = use(WhereIpContext);
  if (!context) {
    throw new Error('useWhereIp must be used inside WhereIpProvider');
  }
  return context;
}
