'use strict';

/**
 * Returns true when the IPC event came from the trusted main BrowserWindow.
 *
 * @param {{ sender?: unknown }} event
 * @param {{ isDestroyed?: () => boolean } | null | undefined} trustedWebContents
 * @returns {boolean}
 */
function isTrustedIpcSender(event, trustedWebContents) {
  if (!trustedWebContents) {
    return false;
  }

  if (
    typeof trustedWebContents.isDestroyed === 'function' &&
    trustedWebContents.isDestroyed()
  ) {
    return false;
  }

  return event?.sender === trustedWebContents;
}

/**
 * @param {{ sender?: unknown }} event
 * @param {{ isDestroyed?: () => boolean } | null | undefined} trustedWebContents
 */
function assertTrustedIpcSender(event, trustedWebContents) {
  if (!isTrustedIpcSender(event, trustedWebContents)) {
    throw new Error('Untrusted IPC sender');
  }
}

module.exports = {
  assertTrustedIpcSender,
  isTrustedIpcSender,
};
