import {
  hasTheme,
  LAYOUT_LABEL,
  PROJECT_SCHEMA_VERSION,
  supportsLandscape,
} from "./constants";
import { DEFAULT_PROJECT } from "./defaults";
import { coerceLocalized } from "./locale";
import { isSafeLocalAssetPath } from "./asset-path";
import type {
  BuiltInElementId,
  Device,
  ElementTransform,
  LocalizedText,
  ProjectState,
  Slide,
  SlideLayout,
  TextElement,
} from "./types";

export const MAX_PROJECT_BODY_BYTES = 5 * 1024 * 1024;
export const MAX_PROJECT_SLIDES_PER_DEVICE = 100;
export const MAX_PROJECT_TOTAL_SLIDES = 300;
export const MAX_PROJECT_LOCALES = 20;
export const MAX_PROJECT_STRING_LENGTH = 2_048;
export const MAX_PROJECT_TEXT_ELEMENTS = 100;
// Base64 expands by roughly 4/3, so keep inline assets inside the 5 MB
// project-request budget after serialization overhead.
export const MAX_PROJECT_ASSET_BYTES = 3 * 1024 * 1024;
export const MAX_PROJECT_ASSET_REFERENCE_LENGTH = Math.ceil(MAX_PROJECT_ASSET_BYTES * (4 / 3)) + 128;

const DEVICES = Object.keys(DEFAULT_PROJECT.slidesByDevice) as Device[];
const LAYOUTS = new Set(Object.keys(LAYOUT_LABEL) as SlideLayout[]);
const BUILT_IN_ELEMENT_ID_SET: Record<BuiltInElementId, true> = {
  caption: true,
  device: true,
  deviceSecondary: true,
};
const BUILT_IN_ELEMENT_IDS = Object.keys(
  BUILT_IN_ELEMENT_ID_SET,
) as BuiltInElementId[];

export function isSafeAssetReference(value: unknown): value is string {
  if (typeof value !== "string" || value.length > MAX_PROJECT_ASSET_REFERENCE_LENGTH) {
    return false;
  }
  if (value === "") return true;

  const dataUrl = /^data:image\/(?:png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (dataUrl) {
    const [, encoded = ""] = dataUrl;
    return (
      encoded.length > 0 &&
      encoded.length % 4 === 0 &&
      encoded.length <= Math.ceil(MAX_PROJECT_ASSET_BYTES * (4 / 3)) &&
      /^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
    );
  }
  if (value.startsWith("data:")) return false;
  return isSafeLocalAssetPath(value);
}

export function sanitizeProjectState(value: unknown): ProjectState {
  const parsed = isRecord(value) ? value : {};
  const locales = sanitizeLocales(parsed.locales);
  const device = isDevice(parsed.device) ? parsed.device : DEFAULT_PROJECT.device;
  const rawSlidesByDevice = isRecord(parsed.slidesByDevice)
    ? parsed.slidesByDevice
    : {};
  let remainingSlides = MAX_PROJECT_TOTAL_SLIDES;
  const slidesByDevice = {} as Record<Device, Slide[]>;

  for (const currentDevice of DEVICES) {
    const rawSlides = rawSlidesByDevice[currentDevice];
    const source = Array.isArray(rawSlides)
      ? rawSlides.slice(0, Math.min(MAX_PROJECT_SLIDES_PER_DEVICE, remainingSlides))
      : DEFAULT_PROJECT.slidesByDevice[currentDevice];
    const sanitizedSlides = sanitizeSlides(source, locales);
    slidesByDevice[currentDevice] = sanitizedSlides;
    remainingSlides = Math.max(0, remainingSlides - sanitizedSlides.length);
  }

  const requestedOrientation = parsed.orientation === "landscape" ? "landscape" : "portrait";
  const orientation =
    requestedOrientation === "landscape" && supportsLandscape(device)
      ? "landscape"
      : "portrait";
  const requestedLocale = cleanLocale(parsed.locale);

  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    appName: cleanText(parsed.appName, 200) || DEFAULT_PROJECT.appName,
    themeId:
      typeof parsed.themeId === "string" && hasTheme(parsed.themeId)
        ? parsed.themeId
        : DEFAULT_PROJECT.themeId,
    connectedCanvas:
      typeof parsed.connectedCanvas === "boolean"
        ? parsed.connectedCanvas
        : DEFAULT_PROJECT.connectedCanvas,
    locales,
    locale: requestedLocale && locales.includes(requestedLocale) ? requestedLocale : locales[0],
    device,
    orientation,
    slidesByDevice,
    appIcon: sanitizeAssetReference(parsed.appIcon),
  };
}

function sanitizeSlides(value: unknown, locales: string[]): Slide[] {
  if (!Array.isArray(value)) return [];
  const seenIds = new Set<string>();
  const slides: Slide[] = [];

  for (const candidate of value) {
    const slide = sanitizeSlide(candidate, locales);
    if (!slide || seenIds.has(slide.id)) continue;
    seenIds.add(slide.id);
    slides.push(slide);
  }
  return slides;
}

function sanitizeSlide(value: unknown, locales: string[]): Slide | null {
  if (!isRecord(value)) return null;
  const id = cleanIdentifier(value.id);
  if (!id) return null;

  const layout = LAYOUTS.has(value.layout as SlideLayout)
    ? (value.layout as SlideLayout)
    : "hero";
  const transforms = sanitizeTransforms(value.transforms);
  const textElements = sanitizeTextElements(value.textElements, locales);
  const screenshot = sanitizeAssetReference(value.screenshot);
  const screenshotSecondary = sanitizeAssetReference(value.screenshotSecondary);

  return {
    id,
    layout,
    label: sanitizeLocalized(value.label, locales),
    headline: sanitizeLocalized(value.headline, locales),
    screenshot,
    ...(screenshotSecondary ? { screenshotSecondary } : {}),
    ...(typeof value.inverted === "boolean" ? { inverted: value.inverted } : {}),
    ...(Object.keys(transforms).length > 0 ? { transforms } : {}),
    ...(textElements.length > 0 ? { textElements } : {}),
  };
}

function sanitizeTransforms(value: unknown): Partial<Record<BuiltInElementId, ElementTransform>> {
  if (!isRecord(value)) return {};
  const result: Partial<Record<BuiltInElementId, ElementTransform>> = {};
  for (const id of BUILT_IN_ELEMENT_IDS) {
    const transform = cleanTransform(value[id]);
    if (transform) result[id] = transform;
  }
  return result;
}

function sanitizeTextElements(value: unknown, locales: string[]): TextElement[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_PROJECT_TEXT_ELEMENTS)
    .map((candidate) => sanitizeTextElement(candidate, locales))
    .filter((element): element is TextElement => element !== null);
}

function sanitizeTextElement(value: unknown, locales: string[]): TextElement | null {
  if (!isRecord(value)) return null;
  const id = cleanIdentifier(value.id);
  const transform = cleanTransform(value.transform);
  if (!id || !transform) return null;

  return {
    id,
    text: sanitizeLocalized(value.text, locales),
    transform,
    ...(boundedNumber(value.fontSize, 1, 512) ? { fontSize: value.fontSize as number } : {}),
    ...(boundedNumber(value.fontWeight, 100, 900)
      ? { fontWeight: value.fontWeight as number }
      : {}),
    ...(typeof value.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value.color)
      ? { color: value.color }
      : {}),
    ...(value.align === "left" || value.align === "center" || value.align === "right"
      ? { align: value.align }
      : {}),
  };
}

function cleanTransform(value: unknown): ElementTransform | undefined {
  if (!isRecord(value)) return undefined;
  const required = [value.x, value.y, value.width, value.height];
  if (!required.every((number) => boundedNumber(number, -100_000, 100_000))) {
    return undefined;
  }
  return {
    x: value.x as number,
    y: value.y as number,
    width: Math.max(1, Math.min(100_000, value.width as number)),
    height: Math.max(1, Math.min(100_000, value.height as number)),
    ...(boundedNumber(value.rotation, -360, 360)
      ? { rotation: value.rotation as number }
      : {}),
    ...(boundedNumber(value.zIndex, -100_000, 100_000)
      ? { zIndex: value.zIndex as number }
      : {}),
  };
}

function sanitizeLocalized(value: unknown, locales: string[]): LocalizedText {
  const localized = coerceLocalized(value);
  const result: LocalizedText = {};
  for (const locale of locales) {
    const text = localized[locale];
    if (typeof text === "string" && text.length <= MAX_PROJECT_STRING_LENGTH) {
      result[locale] = text;
    }
  }
  return result;
}

function sanitizeLocales(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_PROJECT.locales];
  const locales = Array.from(
    new Set(value.map(cleanLocale).filter((locale): locale is string => locale !== null)),
  ).slice(0, MAX_PROJECT_LOCALES);
  return locales.length > 0 ? locales : [...DEFAULT_PROJECT.locales];
}

function cleanLocale(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const locale = value.trim();
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,15}$/.test(locale) ? locale : null;
}

function sanitizeAssetReference(value: unknown): string {
  return isSafeAssetReference(value) ? value : "";
}

function cleanIdentifier(value: unknown): string | null {
  if (typeof value !== "string" || !/^[A-Za-z0-9:_-]{1,128}$/.test(value)) return null;
  return value;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string" || value.length > maxLength) return null;
  return value;
}

function boundedNumber(value: unknown, minimum: number, maximum: number): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function isDevice(value: unknown): value is Device {
  return typeof value === "string" && DEVICES.includes(value as Device);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
