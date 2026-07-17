/**
 * Paste codec — URL fragment format:
 *   #v1/r/<base64url>  raw UTF-8
 *   #v1/z/<base64url>  deflate-raw compressed UTF-8
 *
 * No server storage. The URL is the paste.
 */

export const VERSION = "v1";
export const MODE_RAW = "r";
export const MODE_ZIP = "z";

export type PasteMode = typeof MODE_RAW | typeof MODE_ZIP;

export function isPasteFragment(fragment: string): boolean {
  const h = fragment.replace(/^#/, "");
  return h.startsWith(`${VERSION}/`);
}

export function buildFragment(mode: PasteMode, base64url: string): string {
  return `${VERSION}/${mode}/${base64url}`;
}

export function parseFragment(fragment: string): { mode: PasteMode; payload: string } {
  const h = fragment.replace(/^#/, "");
  const parts = h.split("/");
  if (parts.length < 3 || parts[0] !== VERSION) {
    throw new Error("Unrecognized paste format");
  }
  const mode = parts[1];
  if (mode !== MODE_RAW && mode !== MODE_ZIP) {
    throw new Error(`Unknown encoding mode: ${mode}`);
  }
  const payload = parts.slice(2).join("/");
  if (!payload) throw new Error("Empty paste payload");
  return { mode, payload };
}

/** base64url encode bytes (no padding) */
export function bytesToBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(
      null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bytes.subarray(i, i + chunk) as any,
    );
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToBytes(s: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(s, "base64url"));
  }
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
