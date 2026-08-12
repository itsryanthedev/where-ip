import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  InvalidContentLengthError,
  isEditorRequest,
  readBoundedRequestText,
  RequestBodyTooLargeError,
} from "@/lib/local-request";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_DATA_URL_CHARS } from "@/lib/upload-constants";
import {
  matchesMagic,
  MIME_EXT,
  parseDataUrl,
} from "./upload-validation";

export const dynamic = "force-dynamic";

const UPLOAD_DIR_REL = path.join("public", "screenshots", "uploaded");
const PUBLIC_PREFIX = "/screenshots/uploaded";
const MAX_UPLOAD_FILES = 256;
const MAX_UPLOAD_DIRECTORY_BYTES = 256 * 1024 * 1024;
const UPLOAD_SIZE_ERROR = `Image too large (>${Math.ceil(MAX_UPLOAD_BYTES / (1024 * 1024))}MB)`;

let uploadLock = Promise.resolve();

async function withUploadLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = uploadLock;
  let release!: () => void;
  uploadLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

export async function POST(req: Request) {
  if (!isEditorRequest(req)) {
    return NextResponse.json(
      { ok: false, error: "Uploads are only allowed from localhost" },
      { status: 403 },
    );
  }

  let body: { dataUrl?: string };
  try {
    const raw = await readBoundedRequestText(req, MAX_UPLOAD_DATA_URL_CHARS + 256);
    body = JSON.parse(raw) as { dataUrl?: string };
  } catch (e) {
    if (e instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ ok: false, error: UPLOAD_SIZE_ERROR }, { status: 413 });
    }
    if (e instanceof InvalidContentLengthError) {
      return NextResponse.json({ ok: false, error: "Invalid content length" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.dataUrl || typeof body.dataUrl !== "string") {
    return NextResponse.json({ ok: false, error: "Missing dataUrl" }, { status: 400 });
  }
  if (body.dataUrl.length > MAX_UPLOAD_DATA_URL_CHARS) {
    return NextResponse.json({ ok: false, error: UPLOAD_SIZE_ERROR }, { status: 413 });
  }
  const parsed = parseDataUrl(body.dataUrl);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "Unsupported data URL" }, { status: 400 });
  }
  const ext = MIME_EXT[parsed.mime];
  if (!ext) {
    return NextResponse.json(
      { ok: false, error: `Unsupported mime: ${parsed.mime}` },
      { status: 400 },
    );
  }
  if (parsed.bytes.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ ok: false, error: UPLOAD_SIZE_ERROR }, { status: 413 });
  }
  if (!matchesMagic(parsed.mime, parsed.bytes)) {
    return NextResponse.json(
      { ok: false, error: "File content does not match declared image type" },
      { status: 400 },
    );
  }

  const hash = createHash("sha1").update(parsed.bytes).digest("hex").slice(0, 16);
  const filename = `${hash}.${ext}`;
  const absDir = path.join(process.cwd(), UPLOAD_DIR_REL);
  const absFile = path.join(absDir, filename);
  const absTemp = `${absFile}.${process.pid}.tmp`;

  return withUploadLock(async () => {
    try {
      await fs.mkdir(absDir, { recursive: true });
      const entries = await fs.readdir(absDir, { withFileTypes: true });
      let fileCount = 0;
      let directoryBytes = 0;
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        fileCount += 1;
        directoryBytes += (await fs.stat(path.join(absDir, entry.name))).size;
      }
      const alreadyExists = await fs.access(absFile).then(() => true).catch(() => false);
      if (!alreadyExists && fileCount >= MAX_UPLOAD_FILES) {
        return NextResponse.json({ ok: false, error: "Upload directory file limit reached" }, { status: 413 });
      }
      if (!alreadyExists && directoryBytes + parsed.bytes.byteLength > MAX_UPLOAD_DIRECTORY_BYTES) {
        return NextResponse.json({ ok: false, error: "Upload directory size limit reached" }, { status: 413 });
      }
      if (!alreadyExists) {
        await fs.writeFile(absTemp, parsed.bytes);
        await fs.rename(absTemp, absFile);
      }
      return NextResponse.json({ ok: true, path: `${PUBLIC_PREFIX}/${filename}` });
    } catch (e) {
      try {
        await fs.unlink(absTemp);
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
