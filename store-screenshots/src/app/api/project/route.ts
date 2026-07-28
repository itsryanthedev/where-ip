import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { isLocalRequest } from "@/lib/local-request";

export const dynamic = "force-dynamic";

const PROJECT_FILE = "app-store-screenshots.json";
const MAX_BODY_CHARS = 5 * 1024 * 1024;

function filePath() {
  return path.join(process.cwd(), PROJECT_FILE);
}

export async function GET(req: Request) {
  if (!isLocalRequest(req)) {
    return NextResponse.json(
      { ok: false, error: "Project API is only available on localhost" },
      { status: 403 },
    );
  }
  try {
    const raw = await fs.readFile(filePath(), "utf8");
    const parsed = JSON.parse(raw);
    return NextResponse.json({ ok: true, state: parsed });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: true, state: null });
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  if (!isLocalRequest(req)) {
    return NextResponse.json(
      { ok: false, error: "Project API is only available on localhost" },
      { status: 403 },
    );
  }

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_CHARS) {
    return NextResponse.json({ ok: false, error: "Project payload too large" }, { status: 413 });
  }

  let rawText: string;
  try {
    rawText = await req.text();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  if (Buffer.byteLength(rawText, "utf8") > MAX_BODY_CHARS) {
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

  const target = filePath();
  const temp = `${target}.${process.pid}.tmp`;
  try {
    const pretty = JSON.stringify(body, null, 2) + "\n";
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
}
