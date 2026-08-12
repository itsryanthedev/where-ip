import { Buffer } from "node:buffer";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_DATA_URL_CHARS } from "../../../lib/upload-constants";

export { MAX_UPLOAD_BYTES, MAX_UPLOAD_DATA_URL_CHARS } from "../../../lib/upload-constants";

export const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
};

export function parseDataUrl(dataUrl: string): { mime: string; bytes: Buffer } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  if (match[2].length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(match[2])) {
    return null;
  }
  const mime = match[1].toLowerCase();
  if (!MIME_EXT[mime]) return null;
  return { mime, bytes: Buffer.from(match[2], "base64") };
}

export function matchesMagic(mime: string, bytes: Buffer): boolean {
  if (bytes.length < 3) return false;
  if (mime === "image/png") {
    if (
      bytes.length < 33 ||
      !bytes
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
      bytes.readUInt32BE(8) !== 13 ||
      bytes.toString("ascii", 12, 16) !== "IHDR"
    ) {
      return false;
    }
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    return (
      width > 0 &&
      width <= 8192 &&
      height > 0 &&
      height <= 8192 &&
      bytes.subarray(bytes.length - 8, bytes.length - 4).toString("ascii") === "IEND"
    );
  }
  if (mime === "image/jpeg" || mime === "image/jpg") {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
    let offset = 2;
    let foundDimensions = false;
    while (offset + 3 < bytes.length) {
      if (bytes[offset] !== 0xff) return false;
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker >= 0xd0 && marker <= 0xd7) continue;
      if (offset + 2 > bytes.length) return false;
      const segmentLength = bytes.readUInt16BE(offset);
      if (segmentLength < 2 || offset + segmentLength > bytes.length) return false;
      const isStartOfFrame =
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf);
      if (isStartOfFrame && segmentLength >= 7) {
        const height = bytes.readUInt16BE(offset + 3);
        const width = bytes.readUInt16BE(offset + 5);
        if (width === 0 || width > 8192 || height === 0 || height > 8192) return false;
        foundDimensions = true;
      }
      offset += segmentLength;
    }
    return (
      foundDimensions &&
      bytes[bytes.length - 2] === 0xff &&
      bytes[bytes.length - 1] === 0xd9
    );
  }
  return false;
}
