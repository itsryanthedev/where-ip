"use client";
// Pre-loads images as base64 data URIs so html-to-image exports without
// non-deterministic image fetch races. Always use img(path) in render.
import { isSafeLocalAssetPath } from "./asset-path";

const MAX_CACHE_ENTRIES = 64;
const MAX_ASSET_BYTES = 8 * 1024 * 1024;
const ASSET_FETCH_TIMEOUT_MS = 10_000;
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
  if (!isSafeLocalAssetPath(path)) return null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), ASSET_FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(path, { signal: controller.signal, redirect: "error" });
    if (!resp.ok) return null;
    const contentType = (resp.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "image/png" && contentType !== "image/jpeg") return null;
    const declaredLength = Number(resp.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_ASSET_BYTES) return null;
    if (!resp.body) return null;
    const reader = resp.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > MAX_ASSET_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const blobParts = chunks.map((chunk) => {
      const copy = new Uint8Array(chunk.byteLength);
      copy.set(chunk);
      return copy.buffer;
    });
    const blob = new Blob(blobParts, { type: contentType });
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
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
  if (!isSafeLocalAssetPath(path)) return "";
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
