import { extractPasteBody } from "@/lib/extract-paste";
import { badRequest, payloadTooLarge, textResponse } from "@/lib/http";
import { originFromRequest } from "@/lib/origin";
import { encodePasteServer } from "@/lib/paste/server";
import { serverConfig, siteConfig } from "@/lib/site-config";

export const runtime = "nodejs";

/**
 * POST /api — encode body into a self-contained paste URL.
 * No storage. Response body is the URL (ix.io style), trailing newline.
 *
 *   cat file | curl -sF 'paste=<-' https://…/api
 *   cat file | curl -sF 'paste=<-' https://…/     (via middleware rewrite)
 */
export async function POST(req: Request): Promise<Response> {
  let text: string;
  try {
    text = await extractPasteBody(req);
  } catch {
    return badRequest("bad request: could not read body");
  }

  if (!text) {
    return badRequest("empty paste");
  }

  const maxBytes = serverConfig.maxPasteBytes;
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    return payloadTooLarge(`paste too large (max ${maxBytes} bytes)`);
  }

  const fragment = encodePasteServer(text);
  const origin = originFromRequest(req);
  return textResponse(`${origin}/#${fragment}`);
}

/** GET /api — short usage for curl discoverability */
export async function GET(): Promise<Response> {
  const { name } = siteConfig;
  const body = `${name} api
  POST  form field "paste" (or raw body) → plain-text URL with #v1/… fragment
  nothing is stored; the URL is the paste

  cat file | curl -sF 'paste=<-' $HOST/api
`;
  return textResponse(body, { cache: true });
}
