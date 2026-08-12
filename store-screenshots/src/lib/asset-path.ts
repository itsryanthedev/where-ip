const ALLOWED_LOCAL_ASSET_PREFIXES = ["/assets/", "/screenshots/"];

export function isSafeLocalAssetPath(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const withLocale = value.replaceAll("{locale}", "en");
  if (
    !withLocale.startsWith("/") ||
    withLocale.startsWith("//") ||
    withLocale.includes("\\") ||
    /[\u0000-\u001f<>\"']/.test(withLocale)
  ) {
    return false;
  }

  // Reject raw traversal and any percent-encoding (local assets never need it).
  // Encoding would otherwise let forms like %2e%2e bypass a literal ".." check.
  if (withLocale.includes("..") || withLocale.includes("%")) {
    return false;
  }

  let pathname: string;
  try {
    pathname = new URL(withLocale, "http://local.invalid").pathname;
  } catch {
    return false;
  }
  if (pathname !== withLocale || pathname.includes("..")) {
    return false;
  }

  return (
    pathname === "/mockup.png" ||
    pathname === "/app-icon.png" ||
    ALLOWED_LOCAL_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}
