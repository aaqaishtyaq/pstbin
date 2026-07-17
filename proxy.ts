import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Allow ix.io-style POST to the site root:
 *   cat file | curl -sF 'paste=<-' https://paste.aaqa.dev/
 * Browser GETs still hit the man-page UI.
 */
export function proxy(req: NextRequest): NextResponse {
  if (req.method === "POST" && req.nextUrl.pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/api";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
