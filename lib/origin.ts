import { serverConfig } from "@/lib/site-config";

function firstHeaderValue(header: string | null): string | undefined {
  return header?.split(",")[0]?.trim() || undefined;
}

/**
 * Public origin for curl API URL responses.
 * Prefer PSTBIN_PUBLIC_URL, then forwarded headers, then request URL.
 */
export function originFromRequest(req: Request): string {
  if (serverConfig.publicUrl) {
    return serverConfig.publicUrl;
  }

  const host =
    firstHeaderValue(req.headers.get("x-forwarded-host")) ??
    req.headers.get("host") ??
    new URL(req.url).host;

  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto =
    firstHeaderValue(req.headers.get("x-forwarded-proto")) ??
    (isLocal ? "http" : "https");

  return `${proto}://${host}`;
}
