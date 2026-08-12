'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PRIVATE_PATH_PATTERN =
  /(^|\/)(?:\.env(?:rc|\..*)?|credentials\.json|secrets|private|service-account[^/]*\.json|google-services\.json|google(?:[-_]?service[-_]?info|[-_]?info[-_]?service)\.plist|\.p8|\.p12|\.pfx|\.p7b|\.snk|\.key|\.jks|\.keystore|\.mobileprovision|\.provisionprofile|\.pem)(?:\/|$)/i;
const PRIVATE_EXTENSION_PATTERN =
  /\.(?:p8|p12|pfx|p7b|snk|key|jks|keystore|mobileprovision|provisionprofile|pem)$/i;

function normalizedPackagePath(filePath) {
  return String(filePath || '').replaceAll('\\', '/').replace(/^\/+/, '/');
}

function isPrivatePackagePath(filePath) {
  const normalized = normalizedPackagePath(filePath);
  return (
    PRIVATE_PATH_PATTERN.test(normalized) ||
    PRIVATE_EXTENSION_PATTERN.test(normalized)
  );
}

function assertSafeTree(root) {
  let rootStat;
  try {
    rootStat = fs.lstatSync(root);
  } catch (error) {
    if (error && error.code === 'ENOENT') return;
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Packaging validation could not inspect ${root}: ${reason}`);
  }
  if (rootStat.isSymbolicLink()) {
    throw new Error(`Refusing to package symbolic link root: ${root}`);
  }
  if (!rootStat.isDirectory()) {
    throw new Error(`Packaging validation expected a directory: ${root}`);
  }

  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Packaging validation could not read ${current}: ${reason}`);
    }

    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(root, absolute);
      if (entry.isSymbolicLink()) {
        throw new Error(`Refusing to package symbolic link: ${relative}`);
      }
      if (isPrivatePackagePath(relative)) {
        throw new Error(`Refusing to package private path: ${relative}`);
      }
      if (entry.isDirectory()) pending.push(absolute);
    }
  }
}

module.exports = {
  assertSafeTree,
  isPrivatePackagePath,
  normalizedPackagePath,
};
