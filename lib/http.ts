import type { TextResponseOptions } from "@/types";

const PLAIN = "text/plain; charset=utf-8";

/** Plain-text Response for curl-friendly API endpoints. */
export function textResponse(
  body: string,
  { status = 200, cache = false }: TextResponseOptions = {},
): Response {
  const headers: Record<string, string> = {
    "content-type": PLAIN,
  };
  if (!cache) {
    headers["cache-control"] = "no-store";
  }
  return new Response(body.endsWith("\n") ? body : `${body}\n`, {
    status,
    headers,
  });
}

export function badRequest(message: string): Response {
  return textResponse(message, { status: 400 });
}

export function payloadTooLarge(message: string): Response {
  return textResponse(message, { status: 413 });
}
