#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = new Set(process.argv.slice(2));
const supportedArgs = new Set(['--history', '--staged']);
const unknownArgs = [...args].filter((argument) => !supportedArgs.has(argument));

if (unknownArgs.length > 0 || (args.has('--history') && args.has('--staged'))) {
  console.error(
    'Usage: node scripts/check-secrets.mjs [--history | --staged]',
  );
  process.exit(2);
}

const findings = new Set();

const sensitivePathRules = [
  {
    id: 'environment-file',
    matches: (filePath) =>
      /(^|\/)\.env(?:\.|$)/i.test(filePath) &&
      !/(^|\/)\.env(?:\.[^/]+)?\.example$/i.test(filePath) &&
      !/(^|\/)\.env\.example$/i.test(filePath),
  },
  {
    id: 'credential-manifest',
    matches: (filePath) =>
      /(^|\/)(credentials\.json|google-services\.json|GoogleService-Info\.plist)$/i.test(
        filePath,
      ) ||
      /(^|\/)service-account[^/]*\.json$/i.test(filePath),
  },
  {
    id: 'private-material-directory',
    matches: (filePath) => /(^|\/)(secrets?|private)\//i.test(filePath),
  },
  {
    id: 'signing-material',
    matches: (filePath) =>
      /\.(p8|p12|pfx|p7b|pem|key|jks|keystore|mobileprovision|provisionprofile|snk)$/i.test(
        filePath,
      ),
  },
  {
    id: 'release-binary',
    matches: (filePath) =>
      /\.(dmg|pkg|msix|msixupload|appx|appxupload|exe)$/i.test(filePath),
  },
];

const contentRules = [
  {
    id: 'private-key',
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/,
  },
  {
    id: 'aws-access-key',
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  },
  {
    id: 'github-token',
    pattern:
      /\b(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9_]{20,})\b/,
  },
  {
    id: 'google-api-key',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    id: 'npm-token',
    pattern: /\bnpm_[A-Za-z0-9]{30,}\b/,
  },
  {
    id: 'slack-token',
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  },
  {
    id: 'stripe-live-key',
    pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/,
  },
  {
    id: 'azure-storage-account-key',
    pattern: /\bAccountKey=[A-Za-z0-9+/]{40,}={0,2}\b/,
  },
  {
    id: 'embedded-credential',
    pattern:
      /\b(?:api[_-]?(?:key|token)|client[_-]?secret|access[_-]?token|refresh[_-]?token|password|passwd)\b\s*["']?\s*[:=]\s*["']([^"' \t\r\n]{12,})["']/i,
    capturedValue: 1,
  },
  {
    id: 'publisher-credential',
    pattern:
      /\b[A-Z][A-Z0-9]*(?:_(?:API_)?TOKEN|_SECRET|_PASSWORD|_PRIVATE_KEY|_CERTIFICATE|_P12|_PFX)\b\s*["']?\s*[:=]\s*["']([^"' \t\r\n]{12,})["']/,
    capturedValue: 1,
  },
];

function git(arguments_, options = {}) {
  const execOptions = {
    cwd: process.cwd(),
    input: options.input,
    maxBuffer: 128 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  };

  // Node returns a Buffer when encoding is omitted; the string 'buffer' is invalid.
  if (options.encoding !== 'buffer') {
    execOptions.encoding = options.encoding ?? 'utf8';
  }

  return execFileSync('git', arguments_, execOptions);
}

function splitNull(value) {
  return value.split('\0').filter(Boolean);
}

function isPlaceholder(value) {
  return /^(?:change-?me|replace-?me|example|dummy|placeholder|redacted|test|fake|none|null|<[^>]+>|\$\{(?:\{[^}]+}|[^}]+)})$/i.test(
    value,
  );
}

function checkPath(filePath, scope) {
  const normalizedPath = filePath.replaceAll('\\', '/').trim();
  if (!normalizedPath) {
    return;
  }

  for (const rule of sensitivePathRules) {
    if (rule.matches(normalizedPath)) {
      findings.add(`${scope}:${rule.id}:${normalizedPath}`);
    }
  }
}

function checkText(text, filePath, scope, addedLinesOnly = false) {
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    let line = lines[index];

    if (addedLinesOnly) {
      if (!line.startsWith('+') || line.startsWith('+++')) {
        continue;
      }
      line = line.slice(1);
    }

    for (const rule of contentRules) {
      const match = rule.pattern.exec(line);
      if (!match) {
        continue;
      }

      if (
        rule.capturedValue &&
        match[rule.capturedValue] &&
        isPlaceholder(match[rule.capturedValue])
      ) {
        continue;
      }

      findings.add(`${scope}:${rule.id}:${filePath}:${index + 1}`);
    }
  }
}

function isProbablyBinary(buffer) {
  const sampleLength = Math.min(buffer.length, 8_192);
  for (let index = 0; index < sampleLength; index += 1) {
    if (buffer[index] === 0) {
      return true;
    }
  }
  return false;
}

function decodeTextBuffer(buffer) {
  if (buffer.length === 0) {
    return '';
  }

  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le');
  }
  if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    return swapUtf16ByteOrder(buffer.subarray(2)).toString('utf16le');
  }
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString('utf8');
  }

  const sampleLength = Math.min(buffer.length, 8_192);
  let evenNulls = 0;
  let oddNulls = 0;
  for (let index = 0; index < sampleLength; index += 1) {
    if (buffer[index] === 0) {
      if (index % 2 === 0) {
        evenNulls += 1;
      } else {
        oddNulls += 1;
      }
    }
  }
  const pairs = Math.floor(sampleLength / 2);
  if (pairs >= 2 && oddNulls / pairs >= 0.3 && evenNulls / pairs <= 0.05) {
    return buffer.toString('utf16le');
  }
  if (pairs >= 2 && evenNulls / pairs >= 0.3 && oddNulls / pairs <= 0.05) {
    return swapUtf16ByteOrder(buffer).toString('utf16le');
  }

  return isProbablyBinary(buffer) ? null : buffer.toString('utf8');
}

function swapUtf16ByteOrder(buffer) {
  const swapped = Buffer.alloc(buffer.length - (buffer.length % 2));
  for (let index = 0; index < swapped.length; index += 2) {
    swapped[index] = buffer[index + 1];
    swapped[index + 1] = buffer[index];
  }
  return swapped;
}

function checkWorkingTree() {
  const files = splitNull(git(['ls-files', '-z']));

  for (const filePath of files) {
    checkPath(filePath, 'tracked');

    const text = decodeTextBuffer(readFileSync(filePath));
    if (text !== null) {
      checkText(text, filePath, 'tracked');
    }
  }
}

function checkStagedChanges() {
  const files = splitNull(
    git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']),
  );

  for (const filePath of files) {
    checkPath(filePath, 'staged');

    let buffer;
    try {
      buffer = git(['show', `:${filePath}`], { encoding: 'buffer' });
    } catch {
      continue;
    }

    const text = decodeTextBuffer(buffer);
    if (text !== null) {
      checkText(text, filePath, 'staged');
    }
  }
}

function scanHistoricalBlobsIndividually(blobIds, blobPaths) {
  for (const objectId of blobIds) {
    let blobBuffer;
    try {
      blobBuffer = git(['cat-file', 'blob', objectId], { encoding: 'buffer' });
    } catch {
      continue;
    }

    const text = decodeTextBuffer(blobBuffer);
    if (text !== null) {
      checkText(text, blobPaths.get(objectId), 'history');
    }
  }
}

function checkHistory() {
  const historicalNames = git([
    'log',
    '--all',
    '--name-only',
    '--format=',
  ]);

  for (const filePath of historicalNames.split(/\r?\n/)) {
    checkPath(filePath, 'history');
  }

  const historicalObjects = git(['rev-list', '--objects', '--all'])
    .split(/\r?\n/)
    .map((line) => {
      const separator = line.indexOf(' ');
      if (separator <= 0) {
        return null;
      }
      const filePath = line.slice(separator + 1);
      return filePath
        ? { objectId: line.slice(0, separator), filePath }
        : null;
    })
    .filter(Boolean);
  const blobPaths = new Map();
  for (const { objectId, filePath } of historicalObjects) {
    if (!blobPaths.has(objectId)) {
      blobPaths.set(objectId, filePath);
    }
  }
  const objectIds = [...blobPaths.keys()];
  if (objectIds.length === 0) {
    return;
  }

  let objectTypes;
  try {
    objectTypes = new Map(
      git(['cat-file', '--batch-check=%(objectname) %(objecttype)'], {
        input: `${objectIds.join('\n')}\n`,
      })
        .trim()
        .split(/\r?\n/)
        .map((line) => line.split(' ', 2)),
    );
  } catch {
    console.error(
      'check-secrets: cat-file --batch-check failed; falling back to per-blob history scan',
    );
    scanHistoricalBlobsIndividually(objectIds, blobPaths);
    return;
  }

  const blobIds = objectIds.filter((objectId) => objectTypes.get(objectId) === 'blob');
  if (blobIds.length === 0) {
    return;
  }

  let batchBuffer;
  try {
    batchBuffer = git(['cat-file', '--batch'], {
      encoding: 'buffer',
      input: `${blobIds.join('\n')}\n`,
    });
  } catch {
    console.error(
      'check-secrets: cat-file --batch failed; falling back to per-blob history scan',
    );
    scanHistoricalBlobsIndividually(blobIds, blobPaths);
    return;
  }

  let offset = 0;
  for (let index = 0; index < blobIds.length; index += 1) {
    const objectId = blobIds[index];
    const headerEnd = batchBuffer.indexOf(0x0a, offset);
    if (headerEnd === -1) {
      console.error(
        'check-secrets: truncated history batch output; finishing with per-blob scan',
      );
      scanHistoricalBlobsIndividually(blobIds.slice(index), blobPaths);
      break;
    }

    const header = batchBuffer.subarray(offset, headerEnd).toString('utf8');
    offset = headerEnd + 1;

    if (header.endsWith(' missing')) {
      continue;
    }

    const sizeToken = header.split(' ')[2];
    const size = Number(sizeToken);
    if (!Number.isFinite(size) || size < 0 || offset + size > batchBuffer.length) {
      console.error(
        `check-secrets: unexpected history batch frame for ${objectId}; finishing with per-blob scan`,
      );
      scanHistoricalBlobsIndividually(blobIds.slice(index), blobPaths);
      break;
    }

    const content = batchBuffer.subarray(offset, offset + size);
    offset += size;
    if (batchBuffer[offset] === 0x0a) {
      offset += 1;
    }

    const text = decodeTextBuffer(content);
    if (text !== null) {
      checkText(text, blobPaths.get(objectId), 'history');
    }
  }
}

try {
  if (args.has('--staged')) {
    checkStagedChanges();
  } else {
    checkWorkingTree();
  }

  if (args.has('--history')) {
    checkHistory();
  }
} catch (error) {
  console.error(
    `Secret hygiene check could not complete: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exit(2);
}

if (findings.size > 0) {
  console.error('Secret hygiene check failed. Potential exposures (values redacted):');
  for (const finding of [...findings].sort()) {
    console.error(`- ${finding}`);
  }
  console.error(
    'Remove the file/value from Git. If it was previously pushed, revoke or rotate it before rewriting history.',
  );
  process.exit(1);
}

console.log(
  args.has('--history')
    ? 'Secret hygiene check passed for tracked files and Git history.'
    : args.has('--staged')
      ? 'Secret hygiene check passed for staged changes.'
      : 'Secret hygiene check passed for tracked files.',
);
