"use client";
// Pre-loads images as base64 data URIs so html-to-image exports without
// non-deterministic image fetch races. Always use img(path) in render.

const MAX_CACHE_ENTRIES = 64;
const cache = new Map<string, string>();
const failed = new Set<string>();

function touchCache(path: string, dataUrl: string) {
  // Re-insert so Map iteration order acts as a simple LRU.
  if (cache.has(path)) cache.delete(path);
  cache.set(path, dataUrl);
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

async function fetchAsDataUrl(path: string): Promise<string | null> {
  try {
    const resp = await fetch(path);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function preloadImages(
  paths: string[],
  options: { retryFailed?: boolean } = {},
): Promise<void> {
  await Promise.all(
    paths
      .filter(Boolean)
      .filter((p) => !cache.has(p) && (options.retryFailed || !failed.has(p)))
      .map(async (p) => {
        const data = await fetchAsDataUrl(p);
        if (data) {
          touchCache(p, data);
          failed.delete(p);
        } else if (!cache.has(p)) {
          // A concurrent successful preload must win over a late failure.
          failed.add(p);
        }
      }),
  );
}

export function img(path: string | undefined): string {
  if (!path) return "";
  if (path.startsWith("data:")) return path;
  const cached = cache.get(path);
  if (cached) return cached;
  if (failed.has(path)) return "";
  return path;
}

export function setImage(path: string, dataUrl: string) {
  touchCache(path, dataUrl);
  failed.delete(path);
}

export function didFail(path: string | undefined): boolean {
  if (!path) return false;
  if (path.startsWith("data:")) return false;
  if (cache.has(path)) return false;
  return failed.has(path);
}
