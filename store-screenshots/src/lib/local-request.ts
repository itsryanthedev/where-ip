import { randomBytes, timingSafeEqual } from "node:crypto";
import { EDITOR_REQUEST_TOKEN_HEADER } from "./request-token";
const EDITOR_REQUEST_TOKEN = randomBytes(32).toString("hex");

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body is too large");
    this.name = "RequestBodyTooLargeError";
  }
}

export class InvalidContentLengthError extends Error {
  constructor() {
    super("Invalid content length");
    this.name = "InvalidContentLengthError";
  }
}

export function getEditorRequestToken(): string {
  return EDITOR_REQUEST_TOKEN;
}

/** True when the request Host is a loopback address (IPv4 or IPv6). */
export function isLocalRequest(req: Request): boolean {
  const raw = (req.headers.get("host") || "").trim().toLowerCase();
  if (!raw) return false;

  let hostname = raw;
  if (raw.startsWith("[")) {
    const end = raw.indexOf("]");
    if (end === -1) return false;
    hostname = raw.slice(1, end);
  } else {
    // Strip :port for IPv4 / hostname forms only (never split IPv6).
    const colon = raw.lastIndexOf(":");
    if (colon !== -1 && raw.indexOf(":") === colon) {
      hostname = raw.slice(0, colon);
    }
  }

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0:0:0:0:0:0:0:1"
  );
}

/** Reject browser cross-site requests while allowing direct local tooling. */
export function isAllowedLocalOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  try {
    const parsed = new URL(origin);
    return (
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "[::1]" ||
        parsed.hostname === "::1") &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

export function hasEditorRequestToken(req: Request): boolean {
  const candidate = req.headers.get(EDITOR_REQUEST_TOKEN_HEADER);
  if (!candidate || candidate.length !== EDITOR_REQUEST_TOKEN.length) return false;
  const candidateBytes = Buffer.from(candidate, "utf8");
  const expectedBytes = Buffer.from(EDITOR_REQUEST_TOKEN, "utf8");
  if (candidateBytes.byteLength !== expectedBytes.byteLength) return false;
  return timingSafeEqual(
    candidateBytes,
    expectedBytes,
  );
}

export function isEditorRequest(req: Request): boolean {
  return isLocalRequest(req) && isAllowedLocalOrigin(req) && hasEditorRequestToken(req);
}

export async function readBoundedRequestText(req: Request, maxBytes: number): Promise<string> {
  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      throw new InvalidContentLengthError();
    }
    if (contentLength > maxBytes) {
      throw new RequestBodyTooLargeError();
    }
  }

  if (!req.body || typeof req.body.getReader !== "function") {
    const text = await req.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) {
      throw new RequestBodyTooLargeError();
    }
    return text;
  }

  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
