import { DEFAULT_PROJECT } from "./defaults";
import { isSafeLocalAssetPath } from "./asset-path";
import {
  isSafeAssetReference,
  MAX_PROJECT_ASSET_REFERENCE_LENGTH,
  sanitizeProjectState,
} from "./project-sanitizer";

describe("project sanitizer", () => {
  test("keeps only bounded, renderable project data", () => {
    const state = sanitizeProjectState({
      ...DEFAULT_PROJECT,
      appName: "x".repeat(10_000),
      locales: ["en", "../../escape", "de"],
      appIcon: "https://attacker.example/icon.png",
      slidesByDevice: {
        iphone: [
          {
            id: "safe-slide",
            layout: "hero",
            label: { en: "ok", attacker: "should be removed" },
            headline: { en: "x".repeat(10_000) },
            screenshot: "https://attacker.example/payload.png",
            textElements: Array.from({ length: 150 }, (_, index) => ({
              id: `text:${index}`,
              text: { en: "ok" },
              transform: { x: 0, y: 0, width: 10, height: 10 },
            })),
          },
        ],
        attacker: Array.from({ length: 1_000 }, () => ({ id: "x" })),
      },
    });

    expect(state.appName).toBe(DEFAULT_PROJECT.appName);
    expect(state.locales).toEqual(["en", "de"]);
    expect(state.appIcon).toBe("");
    expect(state.slidesByDevice.iphone).toHaveLength(1);
    expect(state.slidesByDevice.iphone[0].screenshot).toBe("");
    expect(state.slidesByDevice.iphone[0].headline).toEqual({});
    expect(state.slidesByDevice.iphone[0].textElements).toHaveLength(100);
    expect(Object.hasOwn(state.slidesByDevice, "attacker")).toBe(false);
  });

  test("accepts only safe local and image data-URL asset references", () => {
    expect(isSafeAssetReference("")).toBe(true);
    expect(isSafeAssetReference("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isSafeAssetReference("/screenshots/uploaded/a.png")).toBe(true);
    expect(isSafeLocalAssetPath("/assets/foo.png")).toBe(true);

    expect(isSafeAssetReference("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(isSafeAssetReference("data:image/png;base64,!!!!")).toBe(false);
    expect(isSafeAssetReference("https://attacker.example/x.png")).toBe(false);
    expect(isSafeAssetReference(`data:image/png;base64,${"A".repeat(MAX_PROJECT_ASSET_REFERENCE_LENGTH)}`)).toBe(
      false,
    );
    expect(isSafeLocalAssetPath("/assets/%2e%2e/secret.png")).toBe(false);
    expect(isSafeLocalAssetPath("/assets/../secret.png")).toBe(false);
    expect(isSafeLocalAssetPath("/screenshots/%2e%2e/%2e%2e/etc/passwd")).toBe(false);
  });
});
