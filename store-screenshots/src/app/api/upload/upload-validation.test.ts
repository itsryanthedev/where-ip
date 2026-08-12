import { Buffer } from "node:buffer";
import {
  matchesMagic,
  parseDataUrl,
} from "./upload-validation";

describe("upload image validation", () => {
  test("accepts a minimal structurally valid PNG", () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
      0xae, 0x42, 0x60, 0x82,
    ]);

    expect(matchesMagic("image/png", png)).toBe(true);
    expect(parseDataUrl(`data:image/png;base64,${png.toString("base64")}`)).toEqual({
      mime: "image/png",
      bytes: png,
    });
  });

  test("rejects a PNG whose terminal chunk is not IEND", () => {
    const bytes = Buffer.alloc(45);
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    bytes.writeUInt32BE(13, 8);
    bytes.write("IHDR", 12, "ascii");
    bytes.writeUInt32BE(1, 16);
    bytes.writeUInt32BE(1, 20);
    bytes.write("NOPE", 37, "ascii");

    expect(matchesMagic("image/png", bytes)).toBe(false);
  });

  test("accepts a minimal structurally valid JPEG", () => {
    // SOI + SOF0 (1x1) + EOI
    const jpeg = Buffer.from([
      0xff, 0xd8,
      0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
      0xff, 0xd9,
    ]);

    expect(matchesMagic("image/jpeg", jpeg)).toBe(true);
    expect(matchesMagic("image/jpg", jpeg)).toBe(true);
    expect(parseDataUrl(`data:image/jpeg;base64,${jpeg.toString("base64")}`)).toEqual({
      mime: "image/jpeg",
      bytes: jpeg,
    });
  });

  test("rejects a JPEG missing SOF dimensions or EOI", () => {
    const noSof = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const noEoi = Buffer.from([
      0xff, 0xd8,
      0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
    ]);
    const pngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
      0xae, 0x42, 0x60, 0x82,
    ]);

    expect(matchesMagic("image/jpeg", noSof)).toBe(false);
    expect(matchesMagic("image/jpeg", noEoi)).toBe(false);
    expect(matchesMagic("image/jpeg", pngBytes)).toBe(false);
  });

  test("rejects malformed and unsupported data URLs", () => {
    expect(parseDataUrl("https://example.com/a.png")).toBeFalsy();
    expect(parseDataUrl("data:image/png,notbase64")).toBeFalsy();
    expect(parseDataUrl("data:text/html;base64,PHNjcmlwdD4=")).toBeFalsy();
    expect(parseDataUrl("data:image/png;base64,!!!!")).toBeFalsy();
    expect(parseDataUrl("data:image/webp;base64,UklGRg==")).toBeFalsy();
  });
});
