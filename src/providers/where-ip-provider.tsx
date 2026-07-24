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
  providerSwitchRemainingMs: number;
  cooldownRemainingMs: number;
  refresh: () => Promise<void>;
};

const WhereIpContext = createContext<WhereIpContextValue | null>(null);

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
  const [clock, setClock] = useState(() => Date.now());
  const requestInFlight = useRef(false);
  const autoLookupStarted = useRef(false);
  const providerSwitchRequestStarted = useRef<ProviderId | null>(null);

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

      if (persisted.cache) {
        const age = Date.now() - Date.parse(persisted.cache.fetchedAt);
        setStatus(age <= CACHE_FRESHNESS_MS ? 'success' : 'stale');
      }

      setIsReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const cooldownRemainingMs = result
    ? Math.max(0, REFRESH_COOLDOWN_MS - (clock - Date.parse(result.fetchedAt)))
    : 0;

  const performLookup = useCallback(async (
    manualRefresh = false,
    providerOverride?: ProviderId,
  ) => {
    if (requestInFlight.current) {
      return;
    }

    const resultAge = result ? Date.now() - Date.parse(result.fetchedAt) : Infinity;
    const minimumAge = manualRefresh
      ? REFRESH_COOLDOWN_MS
      : CACHE_FRESHNESS_MS;
    if (resultAge < minimumAge) {
      return;
    }

    requestInFlight.current = true;
    setStatus(result ? 'refreshing' : 'loading');
    setErrorMessage(null);

    try {
      const requestedProvider = providerOverride ?? preferredProvider;
      const networkState = await NetInfo.fetch();
      if (networkState.isConnected === false) {
        throw new Error('You appear to be offline. Your last result is still available.');
      }

      const outcome = await lookupPublicIp({
        preferredProvider: requestedProvider,
        providerCooldowns,
      });

      setResult(outcome.result);
      setProviderCooldowns(outcome.providerCooldowns);
      setFallbackFrom(
        outcome.result.providerId === requestedProvider ? null : requestedProvider,
      );
      setStatus('success');
      setClock(Date.now());

      await Promise.all([
        saveCache(outcome.result),
        saveProviderCooldowns(outcome.providerCooldowns),
      ]);
    } catch (error) {
      const nextCooldowns =
        error instanceof LookupChainError
          ? error.providerCooldowns
          : providerCooldowns;
      setProviderCooldowns(nextCooldowns);
      setStatus(result ? 'stale' : 'error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Your network information could not be loaded.',
      );
      await saveProviderCooldowns(nextCooldowns).catch(() => undefined);
    } finally {
      requestInFlight.current = false;
    }
  }, [preferredProvider, providerCooldowns, result]);

  useEffect(() => {
    if (!isReady || !acknowledgedAt || autoLookupStarted.current) {
      return;
    }

    autoLookupStarted.current = true;
    void performLookup(false);
  }, [acknowledgedAt, isReady, performLookup]);

  const acceptDisclosure = useCallback(async () => {
    const acceptedAt = new Date().toISOString();
    setAcknowledgedAt(acceptedAt);
    await saveSettings({
      acknowledgedAt: acceptedAt,
      preferredProvider,
    }).catch(() => undefined);
  }, [preferredProvider]);

  const setPreferredProvider = useCallback(
    async (providerId: ProviderId) => {
      if (providerId === preferredProvider) {
        return;
      }

      setPreferredProviderState(providerId);
      setFallbackFrom(null);
      setPendingProviderRefresh(providerId);
      await saveSettings({
        acknowledgedAt,
        preferredProvider: providerId,
      }).catch(() => undefined);
    },
    [acknowledgedAt, preferredProvider],
  );

  useEffect(() => {
    if (
      !pendingProviderRefresh ||
      cooldownRemainingMs > 0 ||
      requestInFlight.current ||
      providerSwitchRequestStarted.current === pendingProviderRefresh
    ) {
      return;
    }

    const providerId = pendingProviderRefresh;
    providerSwitchRequestStarted.current = providerId;
    setRefreshingProvider(providerId);

    void performLookup(true, providerId).finally(() => {
      setPendingProviderRefresh((current) =>
        current === providerId ? null : current,
      );
      setRefreshingProvider((current) =>
        current === providerId ? null : current,
      );
      if (providerSwitchRequestStarted.current === providerId) {
        providerSwitchRequestStarted.current = null;
      }
    });
  }, [
    cooldownRemainingMs,
    pendingProviderRefresh,
    performLookup,
  ]);

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
      providerSwitchRemainingMs: pendingProviderRefresh
        ? cooldownRemainingMs
        : 0,
      cooldownRemainingMs,
      refresh,
    }),
    [
      acknowledgedAt,
      acceptDisclosure,
      cooldownRemainingMs,
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
