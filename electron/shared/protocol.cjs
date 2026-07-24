'use strict';

const path = require('node:path');

const PROTOCOL_SCHEME = 'whereip';
const PROTOCOL_HOST = 'app';

/**
 * Resolve a whereip://app/... request to a file under distRoot.
 * Rejects path traversal and absolute escapes.
 *
 * @param {string} distRoot Absolute path to the desktop web export
 * @param {string} requestUrl Full whereip:// URL
 * @returns {{ filePath: string } | { error: string }}
 */
function resolveProtocolPath(distRoot, requestUrl) {
  let parsed;
  try {
    parsed = new URL(requestUrl);
  } catch {
    return { error: 'Invalid protocol URL' };
  }

  if (parsed.protocol !== `${PROTOCOL_SCHEME}:`) {
    return { error: 'Unexpected protocol' };
  }
  if (parsed.hostname !== PROTOCOL_HOST) {
    return { error: 'Unexpected protocol host' };
  }
  if (parsed.username || parsed.password) {
    return { error: 'Credentials are not allowed' };
  }

  const decodedPath = decodeURIComponent(parsed.pathname || '/');
  const relativePath =
    decodedPath === '/' || decodedPath === ''
      ? 'index.html'
      : decodedPath.replace(/^\/+/, '');

  if (
    relativePath.includes('\0') ||
    path.isAbsolute(relativePath) ||
    relativePath.split(/[/\\]/).includes('..')
  ) {
    return { error: 'Path traversal is not allowed' };
  }

  const resolvedRoot = path.resolve(distRoot);
  const candidate = path.resolve(resolvedRoot, relativePath);
  const relativeToRoot = path.relative(resolvedRoot, candidate);

  if (
    relativeToRoot.startsWith('..') ||
    path.isAbsolute(relativeToRoot)
  ) {
    return { error: 'Resolved path escapes the dist root' };
  }

  return { filePath: candidate };
}

module.exports = {
  PROTOCOL_SCHEME,
  PROTOCOL_HOST,
  resolveProtocolPath,
};
