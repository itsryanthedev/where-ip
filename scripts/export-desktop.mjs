/**
 * Cross-platform desktop web export.
 * Avoids Unix `VAR=value cmd` syntax that breaks on Windows cmd.exe.
 */

import { spawnSync } from 'node:child_process';

process.env.EXPO_WEB_BASE_URL ??= '/';

const result = spawnSync(
  'expo',
  ['export', '--platform', 'web', '--output-dir', 'dist-desktop'],
  {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  },
);

process.exit(result.status ?? 1);
