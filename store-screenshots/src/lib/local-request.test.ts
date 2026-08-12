import {
  getEditorRequestToken,
  hasEditorRequestToken,
  InvalidContentLengthError,
  isAllowedLocalOrigin,
  isEditorRequest,
  readBoundedRequestText,
  RequestBodyTooLargeError,
} from "./local-request";
import { EDITOR_REQUEST_TOKEN_HEADER } from "./request-token";

function localRequest(init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("host", "127.0.0.1:3011");
  return new Request("http://127.0.0.1:3011/api/project", {
    ...init,
    headers,
  });
}

describe("local editor request boundary", () => {
  test("requires the ephemeral token for state-changing requests", () => {
    const token = getEditorRequestToken();
    const request = localRequest({
      method: "POST",
      headers: {
        origin: "http://127.0.0.1:3011",
        [EDITOR_REQUEST_TOKEN_HEADER]: token,
      },
      body: "{}",
    });

    expect(hasEditorRequestToken(request)).toBe(true);
    expect(isEditorRequest(request)).toBe(true);
    expect(isEditorRequest(localRequest({ method: "POST", body: "{}" }))).toBe(false);
  });

  test("rejects cross-site origins", () => {
    const request = localRequest({
      method: "POST",
      headers: { origin: "http://attacker.example" },
      body: "{}",
    });
    expect(isAllowedLocalOrigin(request)).toBe(false);
  });

  test("allows requests without an origin header", () => {
    expect(isAllowedLocalOrigin(localRequest({ method: "POST", body: "{}" }))).toBe(true);
  });

  test("rejects credentialed loopback origins", () => {
    const request = localRequest({
      method: "POST",
      headers: { origin: "http://user:pass@127.0.0.1:3011" },
      body: "{}",
    });
    expect(isAllowedLocalOrigin(request)).toBe(false);
  });

  test("rejects same-length tokens with different UTF-8 byte lengths", () => {
    const forged = "é".repeat(getEditorRequestToken().length);
    const request = localRequest({
      method: "POST",
      headers: { [EDITOR_REQUEST_TOKEN_HEADER]: forged },
      body: "{}",
    });

    expect(hasEditorRequestToken(request)).toBe(false);
  });

  test("bounds chunked request bodies", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode("x".repeat(64)));
        controller.enqueue(encoder.encode("x".repeat(64)));
        controller.close();
      },
    });
    await expect(
      readBoundedRequestText(
        localRequest({ method: "POST", body, duplex: "half" } as RequestInit),
        64,
      ),
    ).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  test("decodes multi-byte characters split across chunks", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        // "é" is C3 A9 in UTF-8; split mid-codepoint across chunks.
        controller.enqueue(new Uint8Array([0x41, 0xc3]));
        controller.enqueue(new Uint8Array([0xa9, 0x42]));
        controller.close();
      },
    });
    await expect(
      readBoundedRequestText(
        localRequest({ method: "POST", body, duplex: "half" } as RequestInit),
        16,
      ),
    ).resolves.toBe("AéB");
  });

  test("rejects oversized and invalid content-length headers", async () => {
    await expect(
      readBoundedRequestText(
        localRequest({
          method: "POST",
          headers: { "content-length": "999" },
          body: "tiny",
        }),
        8,
      ),
    ).rejects.toBeInstanceOf(RequestBodyTooLargeError);

    await expect(
      readBoundedRequestText(
        localRequest({
          method: "POST",
          headers: { "content-length": "not-a-number" },
          body: "tiny",
        }),
        8,
      ),
    ).rejects.toBeInstanceOf(InvalidContentLengthError);
  });
});
