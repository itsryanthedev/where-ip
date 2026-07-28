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
