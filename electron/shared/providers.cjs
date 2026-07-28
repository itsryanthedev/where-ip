'use strict';

/** @typedef {'ipinfo' | 'freeipapi' | 'ipwhois'} ProviderId */

/** @type {Readonly<Record<ProviderId, { name: string, endpoint: string }>>} */
const PROVIDERS = Object.freeze({
  ipinfo: {
    name: 'IPinfo',
    endpoint: 'https://ipinfo.io/json',
  },
  freeipapi: {
    name: 'FreeIPAPI',
    endpoint: 'https://free.freeipapi.com/api/json',
  },
  ipwhois: {
    name: 'ipwho.is',
    endpoint: 'https://ipwho.is/',
  },
});

// Keep aligned with src/constants/providers.ts
const PROVIDER_TIMEOUT_MS = 7_000;
const MAX_PROVIDER_RESPONSE_BYTES = 64 * 1024;
const MAX_PROVIDER_TEXT_LENGTH = 512;

/**
 * @param {unknown} value
 * @returns {value is ProviderId}
 */
function isProviderId(value) {
  return typeof value === 'string' && Object.hasOwn(PROVIDERS, value);
}

/**
 * @param {ProviderId} providerId
 */
function getProvider(providerId) {
  const provider = PROVIDERS[providerId];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  return provider;
}

module.exports = {
  PROVIDERS,
  PROVIDER_TIMEOUT_MS,
  MAX_PROVIDER_RESPONSE_BYTES,
  MAX_PROVIDER_TEXT_LENGTH,
  isProviderId,
  getProvider,
};
