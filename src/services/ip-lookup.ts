import { fetch as expoFetch } from 'expo/fetch';

import {
  FAILURE_RETRY_DELAY_MS,
  getProviderOrder,
  MAX_PROVIDER_COOLDOWN_MS,
  MAX_PROVIDER_RESPONSE_BYTES,
  PROVIDER_TIMEOUT_MS,
} from '@/constants/providers';
import { parseProviderResponse } from '@/services/provider-adapters';
import type {
  LookupOutcome,
  ProviderCooldowns,
  ProviderId,
} from '@/types/ip';

type FetchImplementation = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, 'ok' | 'status' | 'headers' | 'json'>>;

type LookupOptions = {
  preferredProvider: ProviderId;
  providerCooldowns?: ProviderCooldowns;
  fetchImplementation?: FetchImplementation;
  now?: number;
  timeoutMs?: number;
};

export class LookupChainError extends Error {
  readonly attemptedProviders: ProviderId[];
  readonly providerCooldowns: ProviderCooldowns;

  constructor(
    message: string,
    attemptedProviders: ProviderId[],
    providerCooldowns: ProviderCooldowns,
  ) {
    super(message);
    this.name = 'LookupChainError';
    this.attemptedProviders = attemptedProviders;
    this.providerCooldowns = providerCooldowns;
  }
}

export async function lookupPublicIp({
  preferredProvider,
  providerCooldowns = {},
  fetchImplementation = expoFetch as FetchImplementation,
  now = Date.now(),
  timeoutMs = PROVIDER_TIMEOUT_MS,
}: LookupOptions): Promise<LookupOutcome> {
  const cooldowns = { ...providerCooldowns };
  const attemptedProviders: ProviderId[] = [];
  const failures: string[] = [];
  const orderedProviders = getProviderOrder(preferredProvider);
  const availableProviders = orderedProviders.filter(
    ({ id }) => !cooldowns[id] || cooldowns[id]! <= now,
  );
  if (availableProviders.length === 0) {
    throw new LookupChainError(
      'All IP information providers are cooling down. Please try again shortly.',
      [],
      cooldowns,
    );
  }

  for (const provider of availableProviders) {
    attemptedProviders.push(provider.id);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImplementation(provider.endpoint, {
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const retryAfter = parseRetryAfter(response.headers.get('retry-after'), now);
        cooldowns[provider.id] = retryAfter ?? now + FAILURE_RETRY_DELAY_MS;
        failures.push(`${provider.name} returned HTTP ${response.status}`);
        continue;
      }

      if (declaredResponseIsTooLarge(response.headers)) {
        cooldowns[provider.id] = now + FAILURE_RETRY_DELAY_MS;
        failures.push(`${provider.name} returned an oversized response`);
        continue;
      }

      const payload = await response.json();
      const result = parseProviderResponse(
        provider.id,
        payload,
        new Date(now).toISOString(),
      );
      delete cooldowns[provider.id];

      return {
        result,
        attemptedProviders,
        providerCooldowns: cooldowns,
      };
    } catch (error) {
      cooldowns[provider.id] = now + FAILURE_RETRY_DELAY_MS;
      failures.push(
        error instanceof Error && error.name === 'AbortError'
          ? `${provider.name} timed out`
          : `${provider.name} could not be reached`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new LookupChainError(
    failures.length > 0
      ? `No provider returned a usable result. ${failures.join('. ')}.`
      : 'No IP information provider is currently available.',
    attemptedProviders,
    cooldowns,
  );
}

function parseRetryAfter(value: string | null, now: number): number | undefined {
  if (!value) {
    return undefined;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(now + seconds * 1000, now + MAX_PROVIDER_COOLDOWN_MS);
  }

  const date = Date.parse(value);
  return Number.isFinite(date) && date > now
    ? Math.min(date, now + MAX_PROVIDER_COOLDOWN_MS)
    : undefined;
}

function declaredResponseIsTooLarge(headers: Headers): boolean {
  const contentLength = Number(headers.get('content-length'));
  return (
    Number.isFinite(contentLength) &&
    contentLength > MAX_PROVIDER_RESPONSE_BYTES
  );
}
