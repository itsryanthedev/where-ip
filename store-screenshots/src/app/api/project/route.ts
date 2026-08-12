import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  getEditorRequestToken,
  InvalidContentLengthError,
  isAllowedLocalOrigin,
  isEditorRequest,
  isLocalRequest,
  readBoundedRequestText,
  RequestBodyTooLargeError,
} from "@/lib/local-request";
import {
  MAX_PROJECT_BODY_BYTES,
  sanitizeProjectState,
} from "@/lib/project-sanitizer";

export const dynamic = "force-dynamic";

const PROJECT_FILE = "app-store-screenshots.json";
function filePath() {
  return path.join(process.cwd(), PROJECT_FILE);
}

let projectWriteLock = Promise.resolve();

async function withProjectWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = projectWriteLock;
  let release!: () => void;
  projectWriteLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

export async function GET(req: Request) {
  if (!isLocalRequest(req) || !isAllowedLocalOrigin(req)) {
    return NextResponse.json(
      { ok: false, error: "Project API is only available on localhost" },
      { status: 403 },
    );
  }
  try {
    const metadata = await fs.stat(filePath());
    if (metadata.size > MAX_PROJECT_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Project file is too large" },
        { status: 413 },
      );
    }
    const raw = await fs.readFile(filePath(), "utf8");
    if (Buffer.byteLength(raw, "utf8") > MAX_PROJECT_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Project file is too large" },
        { status: 413 },
      );
    }
    const parsed = JSON.parse(raw);
    return NextResponse.json(
      { ok: true, state: sanitizeProjectState(parsed), csrfToken: getEditorRequestToken() },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json(
        { ok: true, state: null, csrfToken: getEditorRequestToken() },
        { headers: { "cache-control": "no-store" } },
      );
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  if (!isEditorRequest(req)) {
    return NextResponse.json(
      { ok: false, error: "Project API is only available on localhost" },
      { status: 403 },
    );
  }

  let rawText: string;
  try {
    rawText = await readBoundedRequestText(req, MAX_PROJECT_BODY_BYTES);
  } catch (e) {
    if (e instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ ok: false, error: "Project payload too large" }, { status: 413 });
    }
    if (e instanceof InvalidContentLengthError) {
      return NextResponse.json({ ok: false, error: "Invalid content length" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  if (Buffer.byteLength(rawText, "utf8") > MAX_PROJECT_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "Project payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: "Project must be a JSON object" }, { status: 400 });
  }

  return withProjectWriteLock(async () => {
    const target = filePath();
    const temp = `${target}.${process.pid}.${randomUUID()}.tmp`;
    try {
      const pretty = JSON.stringify(sanitizeProjectState(body), null, 2) + "\n";
      await fs.writeFile(temp, pretty, "utf8");
      await fs.rename(temp, target);
      return NextResponse.json({ ok: true });
    } catch (e) {
      try {
        await fs.unlink(temp);
      } catch {
        /* ignore */
      }
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : String(e) },
        { status: 500 },
      );
    }
  });
}
