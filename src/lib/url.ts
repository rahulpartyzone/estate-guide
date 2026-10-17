const DEFAULT_ORIGIN = "http://localhost:8080";

export function getApiOrigin(rawApiBase?: string): string {
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : DEFAULT_ORIGIN;
  try {
    return new URL(rawApiBase || "", browserOrigin).origin;
  } catch {
    return browserOrigin;
  }
}

export function absolutizeApiUrl(input?: string, rawApiBase?: string): string {
  if (!input) return "";

  let normalized = input.trim();
  const apiOrigin = getApiOrigin(rawApiBase);

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      const isLocalHost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      const isApiPort = parsed.port === "8080" || parsed.port === "8081";
      if (isLocalHost && isApiPort && parsed.pathname.startsWith("/api/")) {
        return `${apiOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return normalized;
    }
    return normalized;
  }

  if (normalized.startsWith("api/")) normalized = `/${normalized}`;
  if (normalized.startsWith("/api/")) return `${apiOrigin}${normalized}`;

  return normalized;
}
