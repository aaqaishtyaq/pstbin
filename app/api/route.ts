import { extractPasteBody } from "@/lib/extract-paste";
import { encodePasteServer } from "@/lib/paste-server";
import { serverConfig, siteConfig } from "@/lib/site-config";

export const runtime = "nodejs";

/**
 * POST /api — encode body into a self-contained paste URL.
 * No storage. Response body is the URL (ix.io style), trailing newline.
 *
 *   cat file | curl -sF 'paste=<-' https://…/api
 *   cat file | curl -sF 'paste=<-' https://…/     (via middleware rewrite)
 */
export async function POST(req: Request) {
  let text: string;
  try {
    text = await extractPasteBody(req);
  } catch {
    return new Response("bad request: could not read body\n", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (!text) {
    return new Response("empty paste\n", {
      status: 400,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const maxBytes = serverConfig.maxPasteBytes;
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    return new Response(`paste too large (max ${maxBytes} bytes)\n`, {
      status: 413,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const fragment = encodePasteServer(text);
  const origin = originFrom(req);
  const url = `${origin}/#${fragment}\n`;

  return new Response(url, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/** GET /api — short usage for curl discoverability */
export async function GET() {
  const name = siteConfig.name;
  const body = `${name} api
  POST  form field "paste" (or raw body) → plain-text URL with #v1/… fragment
  nothing is stored; the URL is the paste

  cat file | curl -sF 'paste=<-' $HOST/api
`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function originFrom(req: Request): string {
  if (serverConfig.publicUrl) return serverConfig.publicUrl;

  // Prefer public URL headers from Vercel / proxies
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host") ||
    new URL(req.url).host;

  // Local dev: use the actual request host (e.g. localhost:6002)
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    const localProto =
      req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
    return `${localProto}://${host}`;
  }

  return `${proto}://${host}`;
}
